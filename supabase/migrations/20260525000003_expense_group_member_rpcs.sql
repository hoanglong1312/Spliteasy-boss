CREATE OR REPLACE FUNCTION public.is_member_of_expense_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.groups g ON g.id = m.group_id
    WHERE m.id = public.get_current_member_id()
      AND m.group_id = p_group_id
      AND m.is_active IS NOT FALSE
      AND (
        g.linked_pickleball_group_id IS NOT NULL
        OR (
          lower(coalesce(g.name, '')) NOT LIKE '%pickle%'
          AND coalesce(g.emoji, '') NOT IN ('🏓', '🏸')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.edit_expense_group(
  p_group_id uuid,
  p_name text,
  p_emoji text DEFAULT '👥',
  p_description text DEFAULT '',
  p_color text DEFAULT '#574EFA'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_member_of_expense_group(p_group_id) THEN
    RAISE EXCEPTION 'expense_group_permission_denied';
  END IF;

  UPDATE public.groups
  SET
    name = trim(p_name),
    emoji = nullif(trim(coalesce(p_emoji, '👥')), ''),
    description = coalesce(p_description, ''),
    color = coalesce(nullif(trim(coalesce(p_color, '')), ''), '#574EFA')
  WHERE id = p_group_id;

  RETURN p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_expense_group_member(
  p_group_id uuid,
  p_member_id uuid DEFAULT NULL,
  p_name text DEFAULT '',
  p_profile_id uuid DEFAULT NULL,
  p_bank_name text DEFAULT NULL,
  p_bank_account text DEFAULT NULL,
  p_bank_account_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name text := trim(coalesce(p_name, ''));
  v_profile_id uuid := p_profile_id;
  v_member_id uuid;
  v_short text;
  v_initials text;
  v_words text[];
BEGIN
  IF v_name = '' THEN
    RAISE EXCEPTION 'member_name_required';
  END IF;

  IF NOT public.is_member_of_expense_group(p_group_id) THEN
    RAISE EXCEPTION 'expense_group_permission_denied';
  END IF;

  IF p_member_id IS NOT NULL THEN
    SELECT id, profile_id, name
    INTO v_member_id, v_profile_id, v_name
    FROM public.members
    WHERE id = p_member_id
      AND group_id = p_group_id;

    IF v_member_id IS NOT NULL THEN
      UPDATE public.members
      SET expense_active = true
      WHERE id = v_member_id
        AND group_id = p_group_id;
      RETURN v_member_id;
    END IF;
  END IF;

  IF v_profile_id IS NOT NULL THEN
    SELECT id INTO v_member_id
    FROM public.members
    WHERE group_id = p_group_id
      AND profile_id = v_profile_id
    ORDER BY expense_active DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_member_id IS NOT NULL THEN
      UPDATE public.members
      SET expense_active = true
      WHERE id = v_member_id
        AND group_id = p_group_id;
      RETURN v_member_id;
    END IF;
  END IF;

  SELECT id, profile_id
  INTO v_member_id, v_profile_id
  FROM public.members
  WHERE group_id = p_group_id
    AND lower(name) = lower(v_name)
  ORDER BY expense_active DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    UPDATE public.members
    SET expense_active = true
    WHERE id = v_member_id
      AND group_id = p_group_id;
    RETURN v_member_id;
  END IF;

  v_words := regexp_split_to_array(v_name, '\s+');
  v_short := coalesce(v_words[array_length(v_words, 1)], v_name);
  v_initials := upper(left(array_to_string(ARRAY(
    SELECT left(word, 1)
    FROM unnest(v_words) AS word
    WHERE word <> ''
  ), ''), 2));

  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (name, short, initials, color, bank_name, bank_account, bank_account_name)
    VALUES (
      v_name,
      v_short,
      nullif(v_initials, ''),
      '#574EFA',
      p_bank_name,
      p_bank_account,
      coalesce(p_bank_account_name, v_name)
    )
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO public.members (
    group_id,
    profile_id,
    name,
    short,
    initials,
    color,
    role,
    member_type,
    expense_active
  )
  VALUES (
    p_group_id,
    v_profile_id,
    v_name,
    v_short,
    nullif(v_initials, ''),
    '#574EFA',
    'member',
    'fixed',
    true
  )
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;
