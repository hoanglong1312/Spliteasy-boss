-- get_member_by_token(p_token) -> { member_id, group_id, member_name }
-- SECURITY DEFINER: callable with anon key to verify a member token
-- Used by Personal Dashboard to identify member from shared link

CREATE OR REPLACE FUNCTION get_member_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash  text;
  v_member_id   uuid;
  v_group_id    uuid;
  v_name        text;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN json_build_object('error', 'token_required');
  END IF;

  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  SELECT m.id, m.group_id, m.name
  INTO v_member_id, v_group_id, v_name
  FROM member_tokens mt
  JOIN members m ON m.id = mt.member_id
  WHERE mt.token_hash = v_token_hash
    AND mt.revoked_at IS NULL;

  IF v_member_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  RETURN json_build_object(
    'member_id',   v_member_id,
    'group_id',    v_group_id,
    'member_name', v_name
  );
END;
$$;
