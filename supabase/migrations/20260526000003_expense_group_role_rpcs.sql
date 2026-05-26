ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS receipt_images jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.is_expense_group_admin(p_group_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    JOIN public.members m ON m.group_id = g.id
    WHERE g.id = p_group_id
      AND m.id = p_member_id
      AND m.is_active IS NOT FALSE
      AND m.expense_active IS DISTINCT FROM false
      AND (
        m.role = 'treasurer'
        OR g.created_by = p_member_id
        OR g.created_by = m.profile_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_invite_code text, p_member_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_group_id uuid;
  v_name text;
  v_member_id uuid;
  v_creator_id uuid;
  v_actor_profile_id uuid;
BEGIN
  IF trim(coalesce(p_name, '')) = '' THEN
    RETURN json_build_object('error', 'name_required');
  END IF;

  IF trim(coalesce(p_invite_code, '')) = '' THEN
    RETURN json_build_object('error', 'invite_code_required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.groups WHERE invite_code = p_invite_code) THEN
    RETURN json_build_object('error', 'invite_code_taken');
  END IF;

  INSERT INTO public.groups (name, invite_code)
  VALUES (trim(p_name), p_invite_code)
  RETURNING id INTO v_group_id;

  SELECT profile_id
  INTO v_actor_profile_id
  FROM public.members
  WHERE id = public.get_current_member_id()
    AND is_active IS NOT FALSE
  LIMIT 1;

  FOREACH v_name IN ARRAY coalesce(p_member_names, ARRAY[]::text[]) LOOP
    IF trim(coalesce(v_name, '')) <> '' THEN
      INSERT INTO public.members (group_id, name, role, profile_id)
      VALUES (
        v_group_id,
        trim(v_name),
        CASE WHEN v_creator_id IS NULL THEN 'treasurer' ELSE 'member' END,
        CASE WHEN v_creator_id IS NULL THEN v_actor_profile_id ELSE NULL END
      )
      RETURNING id INTO v_member_id;

      IF v_creator_id IS NULL THEN
        v_creator_id := v_member_id;
        UPDATE public.groups
        SET created_by = v_creator_id
        WHERE id = v_group_id;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'group_id', v_group_id,
    'invite_code', p_invite_code,
    'creator_member_id', v_creator_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_expense_group(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_is_admin boolean;
BEGIN
  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  JOIN public.groups g ON g.id = m.group_id
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
    AND (
      g.linked_pickleball_group_id IS NOT NULL
      OR (
        lower(coalesce(g.name, '')) NOT LIKE '%pickle%'
        AND coalesce(g.emoji, '') NOT IN ('🏓', '🏸')
      )
    )
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  v_is_admin := public.is_expense_group_admin(p_group_id, v_actor_member_id);

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'expense_group_delete_permission_denied');
  END IF;

  UPDATE public.groups
  SET deleted_at = now()
  WHERE id = p_group_id;

  RETURN jsonb_build_object('id', p_group_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expense_group_member_role(
  p_group_id uuid,
  p_member_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_is_admin boolean;
BEGIN
  IF p_role NOT IN ('member', 'treasurer') THEN
    RETURN jsonb_build_object('error', 'invalid_member_role');
  END IF;

  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  JOIN public.groups g ON g.id = m.group_id
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
    AND (
      g.linked_pickleball_group_id IS NOT NULL
      OR (
        lower(coalesce(g.name, '')) NOT LIKE '%pickle%'
        AND coalesce(g.emoji, '') NOT IN ('🏓', '🏸')
      )
    )
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  v_is_admin := public.is_expense_group_admin(p_group_id, v_actor_member_id);

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'expense_group_role_permission_denied');
  END IF;

  UPDATE public.members
  SET role = p_role
  WHERE id = p_member_id
    AND group_id = p_group_id
    AND is_active IS NOT FALSE
    AND expense_active IS DISTINCT FROM false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'expense_group_member_not_found');
  END IF;

  RETURN jsonb_build_object('id', p_member_id, 'role', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_expense_group_expense(
  p_group_id uuid,
  p_title text,
  p_amount numeric,
  p_paid_by_member_id uuid,
  p_category text DEFAULT 'general',
  p_notes text DEFAULT NULL,
  p_expense_date date DEFAULT CURRENT_DATE,
  p_participant_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_receipt_images jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_is_admin boolean;
  v_expense_id uuid;
  v_participant_ids uuid[];
  v_participant_count int;
  v_per_share numeric;
BEGIN
  IF trim(coalesce(p_title, '')) = '' THEN
    RETURN jsonb_build_object('error', 'expense_title_required');
  END IF;

  IF coalesce(p_amount, 0) <= 0 THEN
    RETURN jsonb_build_object('error', 'expense_amount_required');
  END IF;

  IF NOT public.is_member_of_expense_group(p_group_id) THEN
    RETURN jsonb_build_object('error', 'expense_group_permission_denied');
  END IF;

  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  v_is_admin := public.is_expense_group_admin(p_group_id, v_actor_member_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.members paid_by
    WHERE paid_by.id = p_paid_by_member_id
      AND paid_by.group_id = p_group_id
      AND paid_by.is_active IS NOT FALSE
      AND paid_by.expense_active IS DISTINCT FROM false
  ) THEN
    RETURN jsonb_build_object('error', 'expense_paid_by_invalid');
  END IF;

  SELECT array_agg(member_id)
  INTO v_participant_ids
  FROM (
    SELECT DISTINCT member_id
    FROM unnest(coalesce(p_participant_ids, ARRAY[]::uuid[])) AS member_id
    JOIN public.members participant ON participant.id = member_id
    WHERE participant.group_id = p_group_id
      AND participant.is_active IS NOT FALSE
      AND participant.expense_active IS DISTINCT FROM false
  ) valid_participants;

  v_participant_ids := coalesce(v_participant_ids, ARRAY[]::uuid[]);
  v_participant_count := coalesce(array_length(v_participant_ids, 1), 0);

  IF v_participant_count <= 0 THEN
    RETURN jsonb_build_object('error', 'expense_participants_required');
  END IF;

  INSERT INTO public.expenses (
    group_id,
    title,
    amount,
    category,
    notes,
    expense_date,
    receipt_images,
    paid_by_member_id,
    submitted_by_member_id,
    status,
    reviewed_by_member_id,
    reviewed_at
  )
  VALUES (
    p_group_id,
    trim(p_title),
    p_amount,
    nullif(trim(coalesce(p_category, 'general')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_expense_date, CURRENT_DATE),
    coalesce(p_receipt_images, '[]'::jsonb),
    p_paid_by_member_id,
    v_actor_member_id,
    CASE WHEN v_is_admin THEN 'approved' ELSE 'pending' END,
    CASE WHEN v_is_admin THEN v_actor_member_id ELSE NULL END,
    CASE WHEN v_is_admin THEN now() ELSE NULL END
  )
  RETURNING id INTO v_expense_id;

  v_per_share := round(p_amount / v_participant_count);

  INSERT INTO public.expense_participants (expense_id, member_id, share_amount)
  SELECT
    v_expense_id,
    member_id,
    CASE
      WHEN row_number() OVER (ORDER BY member_id) = v_participant_count
      THEN p_amount - (v_per_share * (v_participant_count - 1))
      ELSE v_per_share
    END
  FROM unnest(v_participant_ids) AS member_id;

  RETURN jsonb_build_object('id', v_expense_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expense_group_expense(
  p_expense_id uuid,
  p_group_id uuid,
  p_title text,
  p_amount numeric,
  p_paid_by_member_id uuid,
  p_category text DEFAULT 'general',
  p_notes text DEFAULT NULL,
  p_expense_date date DEFAULT CURRENT_DATE,
  p_participant_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_receipt_images jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_existing record;
  v_is_admin boolean;
  v_participant_ids uuid[];
  v_participant_count int;
  v_per_share numeric;
BEGIN
  IF trim(coalesce(p_title, '')) = '' THEN
    RETURN jsonb_build_object('error', 'expense_title_required');
  END IF;

  IF coalesce(p_amount, 0) <= 0 THEN
    RETURN jsonb_build_object('error', 'expense_amount_required');
  END IF;

  IF NOT public.is_member_of_expense_group(p_group_id) THEN
    RETURN jsonb_build_object('error', 'expense_group_permission_denied');
  END IF;

  SELECT *
  INTO v_existing
  FROM public.expenses
  WHERE id = p_expense_id
    AND group_id = p_group_id;

  IF v_existing.id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_not_found');
  END IF;

  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  v_is_admin := public.is_expense_group_admin(p_group_id, v_actor_member_id);

  IF NOT v_is_admin AND NOT (
    v_existing.submitted_by_member_id = v_actor_member_id
    AND v_existing.status = 'pending'
  ) THEN
    RETURN jsonb_build_object('error', 'expense_update_permission_denied');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.members paid_by
    WHERE paid_by.id = p_paid_by_member_id
      AND paid_by.group_id = p_group_id
      AND paid_by.is_active IS NOT FALSE
      AND paid_by.expense_active IS DISTINCT FROM false
  ) THEN
    RETURN jsonb_build_object('error', 'expense_paid_by_invalid');
  END IF;

  SELECT array_agg(member_id)
  INTO v_participant_ids
  FROM (
    SELECT DISTINCT member_id
    FROM unnest(coalesce(p_participant_ids, ARRAY[]::uuid[])) AS member_id
    JOIN public.members participant ON participant.id = member_id
    WHERE participant.group_id = p_group_id
      AND participant.is_active IS NOT FALSE
      AND participant.expense_active IS DISTINCT FROM false
  ) valid_participants;

  v_participant_ids := coalesce(v_participant_ids, ARRAY[]::uuid[]);
  v_participant_count := coalesce(array_length(v_participant_ids, 1), 0);

  IF v_participant_count <= 0 THEN
    RETURN jsonb_build_object('error', 'expense_participants_required');
  END IF;

  UPDATE public.expenses
  SET
    title = trim(p_title),
    amount = p_amount,
    category = nullif(trim(coalesce(p_category, 'general')), ''),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    expense_date = coalesce(p_expense_date, CURRENT_DATE),
    receipt_images = coalesce(p_receipt_images, '[]'::jsonb),
    paid_by_member_id = p_paid_by_member_id,
    status = CASE WHEN v_is_admin THEN 'approved' ELSE status END,
    reviewed_by_member_id = CASE WHEN v_is_admin THEN v_actor_member_id ELSE reviewed_by_member_id END,
    reviewed_at = CASE WHEN v_is_admin THEN now() ELSE reviewed_at END
  WHERE id = p_expense_id;

  DELETE FROM public.expense_participants
  WHERE expense_id = p_expense_id;

  v_per_share := round(p_amount / v_participant_count);

  INSERT INTO public.expense_participants (expense_id, member_id, share_amount)
  SELECT
    p_expense_id,
    member_id,
    CASE
      WHEN row_number() OVER (ORDER BY member_id) = v_participant_count
      THEN p_amount - (v_per_share * (v_participant_count - 1))
      ELSE v_per_share
    END
  FROM unnest(v_participant_ids) AS member_id;

  RETURN jsonb_build_object('id', p_expense_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_expense_group_expense(
  p_expense_id uuid,
  p_group_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_existing record;
BEGIN
  IF p_status NOT IN ('approved', 'rejected', 'declined') THEN
    RETURN jsonb_build_object('error', 'expense_review_status_invalid');
  END IF;

  SELECT *
  INTO v_existing
  FROM public.expenses
  WHERE id = p_expense_id
    AND group_id = p_group_id;

  IF v_existing.id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_not_found');
  END IF;

  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  IF NOT public.is_expense_group_admin(p_group_id, v_actor_member_id) THEN
    RETURN jsonb_build_object('error', 'expense_review_permission_denied');
  END IF;

  UPDATE public.expenses
  SET
    status = p_status,
    reviewed_by_member_id = v_actor_member_id,
    reviewed_at = now()
  WHERE id = p_expense_id
    AND group_id = p_group_id;

  RETURN jsonb_build_object('id', p_expense_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_expense_group_expense(
  p_expense_id uuid,
  p_group_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_existing record;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.expenses
  WHERE id = p_expense_id
    AND group_id = p_group_id;

  IF v_existing.id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_not_found');
  END IF;

  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  IF NOT public.is_expense_group_admin(p_group_id, v_actor_member_id) THEN
    RETURN jsonb_build_object('error', 'expense_delete_permission_denied');
  END IF;

  DELETE FROM public.expense_participants
  WHERE expense_id = p_expense_id;

  DELETE FROM public.expenses
  WHERE id = p_expense_id
    AND group_id = p_group_id;

  RETURN jsonb_build_object('id', p_expense_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_expense_group_admin(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_group(text, text, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_expense_group(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.set_expense_group_member_role(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_expense_group_expense(uuid, text, numeric, uuid, text, text, date, uuid[], jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_expense_group_expense(uuid, uuid, text, numeric, uuid, text, text, date, uuid[], jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.review_expense_group_expense(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_expense_group_expense(uuid, uuid) TO anon;
