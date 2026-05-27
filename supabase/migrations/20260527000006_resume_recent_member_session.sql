CREATE OR REPLACE FUNCTION public.resume_recent_member_session(
  p_member_id uuid,
  p_member_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_member record;
  v_auth_token text;
  v_auth_hash text;
BEGIN
  SELECT m.id, m.group_id, m.name
  INTO v_member
  FROM public.members m
  JOIN public.groups g ON g.id = m.group_id
  WHERE m.id = p_member_id
    AND (p_member_name IS NULL OR trim(p_member_name) = '' OR lower(m.name) = lower(trim(p_member_name)))
    AND m.is_active IS DISTINCT FROM false
    AND g.deleted_at IS NULL
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_recent_session');
  END IF;

  v_auth_token := encode(gen_random_bytes(32), 'hex');
  v_auth_hash := encode(digest(v_auth_token, 'sha256'), 'hex');

  UPDATE public.member_tokens
  SET revoked_at = now()
  WHERE member_id = v_member.id
    AND revoked_at IS NULL;

  INSERT INTO public.member_tokens (member_id, token_hash)
  VALUES (v_member.id, v_auth_hash);

  RETURN jsonb_build_object(
    'authToken', v_auth_token,
    'memberId', v_member.id,
    'groupId', v_member.group_id,
    'memberName', v_member.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resume_recent_member_session(uuid, text) TO anon;
