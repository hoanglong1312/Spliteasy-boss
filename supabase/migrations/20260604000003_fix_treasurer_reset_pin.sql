CREATE OR REPLACE FUNCTION public.reset_member_pin(p_member_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id   uuid;
  v_caller_role text;
  v_profile_id  uuid;
BEGIN
  v_caller_id := get_current_member_id();

  SELECT role INTO v_caller_role
  FROM members
  WHERE id = v_caller_id AND is_active = true;

  IF v_caller_role != 'treasurer' THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  SELECT profile_id INTO v_profile_id
  FROM members
  WHERE id = p_member_id
    AND group_id = (SELECT group_id FROM members WHERE id = v_caller_id);

  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles SET pin_hash = null WHERE id = v_profile_id;
  END IF;

  UPDATE members SET pin_hash = null WHERE id = p_member_id;

  RETURN json_build_object('success', true);
END;
$$;
