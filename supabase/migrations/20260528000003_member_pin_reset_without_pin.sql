CREATE OR REPLACE FUNCTION public.reset_member_pin(p_member_id uuid DEFAULT NULL, p_pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_member_id uuid;
  v_target_member_id uuid;
BEGIN
  v_current_member_id := public.get_current_member_id();
  v_target_member_id := COALESCE(p_member_id, v_current_member_id);

  IF v_current_member_id IS NULL OR v_target_member_id IS NULL OR v_current_member_id <> v_target_member_id THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  IF p_pin IS NOT NULL AND NOT public.verify_member_pin(v_target_member_id, p_pin) THEN
    RETURN jsonb_build_object('error', 'invalid_pin');
  END IF;

  UPDATE public.members
  SET pin_hash = NULL
  WHERE id = v_target_member_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_member_pin(uuid, text) TO anon;
