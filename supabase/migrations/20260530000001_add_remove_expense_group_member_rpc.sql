CREATE OR REPLACE FUNCTION public.remove_expense_group_member(
  p_group_id uuid,
  p_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_member_id uuid;
  v_current_profile_id uuid;
  v_current_name text;
  v_is_treasurer boolean := false;
  v_target_exists boolean;
BEGIN
  SELECT id, profile_id, name
  INTO v_current_member_id, v_current_profile_id, v_current_name
  FROM public.members
  WHERE id = public.get_current_member_id()
    AND is_active IS NOT FALSE
  LIMIT 1;

  IF v_current_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.members m
    JOIN public.groups g ON g.id = m.group_id
    WHERE m.group_id = p_group_id
      AND m.is_active IS NOT FALSE
      AND m.role = 'treasurer'
      AND (
        m.id = v_current_member_id
        OR (v_current_profile_id IS NOT NULL AND m.profile_id = v_current_profile_id)
        OR (lower(m.name) = lower(v_current_name))
      )
  ) INTO v_is_treasurer;

  IF NOT v_is_treasurer THEN
    RETURN jsonb_build_object('error', 'not_treasurer');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_member_id AND group_id = p_group_id
  ) INTO v_target_exists;

  IF NOT v_target_exists THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  UPDATE public.members
  SET expense_active = false
  WHERE id = p_member_id AND group_id = p_group_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_expense_group_member(uuid, uuid) TO authenticated;
