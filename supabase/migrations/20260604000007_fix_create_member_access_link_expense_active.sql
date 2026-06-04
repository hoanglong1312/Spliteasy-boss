-- Fix: create_member_access_link blocked expense_inactive members (e.g. pickleball-only members)
-- Removed expense_active check — member may still owe pickleball fees even if not in expense group

DROP FUNCTION IF EXISTS public.create_member_access_link(uuid, uuid, text, interval);

CREATE FUNCTION public.create_member_access_link(
  p_group_id uuid,
  p_member_id uuid,
  p_purpose text,
  p_expires_in interval DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
BEGIN
  v_actor := public.get_current_member_id();

  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  IF p_purpose NOT IN ('member_login', 'member_bill') THEN
    RETURN jsonb_build_object('error', 'invalid_purpose');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = p_member_id
      AND m.group_id = p_group_id
      AND m.is_active IS DISTINCT FROM false
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_member');
  END IF;

  IF NOT public.is_member_access_link_allowed(p_group_id, p_member_id, p_purpose, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + COALESCE(p_expires_in, interval '14 days');

  INSERT INTO public.member_access_links (token_hash, purpose, group_id, member_id, expires_at, created_by)
  VALUES (v_token_hash, p_purpose, p_group_id, p_member_id, v_expires_at, v_actor);

  RETURN jsonb_build_object('urlToken', v_token, 'purpose', p_purpose, 'expiresAt', v_expires_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_member_access_link(uuid, uuid, text, interval) TO anon, authenticated, service_role;
