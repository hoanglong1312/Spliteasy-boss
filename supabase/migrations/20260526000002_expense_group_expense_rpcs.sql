CREATE OR REPLACE FUNCTION public.create_expense_group_expense(
  p_group_id uuid,
  p_title text,
  p_amount numeric,
  p_paid_by_member_id uuid,
  p_category text DEFAULT 'general',
  p_notes text DEFAULT NULL,
  p_expense_date date DEFAULT CURRENT_DATE,
  p_participant_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_actor_role text;
  v_actor_profile_id uuid;
  v_group_created_by uuid;
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
  SELECT m.id, m.role, m.profile_id
  INTO v_actor_member_id, v_actor_role, v_actor_profile_id
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

  SELECT created_by INTO v_group_created_by
  FROM public.groups
  WHERE id = p_group_id;

  INSERT INTO public.expenses (
    group_id,
    title,
    amount,
    category,
    notes,
    expense_date,
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
    p_paid_by_member_id,
    v_actor_member_id,
    CASE
      WHEN v_actor_role = 'treasurer'
        OR v_group_created_by = v_actor_member_id
        OR v_group_created_by = v_actor_profile_id
      THEN 'approved'
      ELSE 'pending'
    END,
    CASE
      WHEN v_actor_role = 'treasurer'
        OR v_group_created_by = v_actor_member_id
        OR v_group_created_by = v_actor_profile_id
      THEN v_actor_member_id
      ELSE NULL
    END,
    CASE
      WHEN v_actor_role = 'treasurer'
        OR v_group_created_by = v_actor_member_id
        OR v_group_created_by = v_actor_profile_id
      THEN now()
      ELSE NULL
    END
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

GRANT EXECUTE ON FUNCTION public.create_expense_group_expense(uuid, text, numeric, uuid, text, text, date, uuid[]) TO anon;
