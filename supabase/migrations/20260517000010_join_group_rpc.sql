-- join_group(p_invite_code, p_name) → { token, member_id, group_id, member_name }
-- SECURITY DEFINER: gọi được bằng anon key, không cần x-member-token
-- Flow: tìm nhóm → tìm hoặc tạo member → tạo token → trả token plaintext

CREATE OR REPLACE FUNCTION join_group(p_invite_code text, p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id    uuid;
  v_member_id   uuid;
  v_token       text;
  v_token_hash  text;
  v_short       text;
  v_initials    text;
  v_space_pos   int;
BEGIN
  -- Validate input
  IF p_invite_code IS NULL OR trim(p_invite_code) = '' THEN
    RETURN json_build_object('error', 'invite_code_required');
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('error', 'name_required');
  END IF;

  p_name        := trim(p_name);
  p_invite_code := upper(trim(p_invite_code));

  -- Tìm nhóm theo invite code
  SELECT id INTO v_group_id FROM groups WHERE invite_code = p_invite_code;
  IF v_group_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_invite_code');
  END IF;

  -- Tính short name và initials
  v_space_pos := position(' ' IN p_name);
  IF v_space_pos > 0 THEN
    v_short    := reverse(split_part(reverse(p_name), ' ', 1));
    v_initials := upper(substring(p_name, 1, 1))
               || upper(substring(p_name, v_space_pos + 1, 1));
  ELSE
    v_short    := p_name;
    v_initials := upper(substring(p_name, 1, 2));
  END IF;

  -- Tìm member theo tên trong nhóm (case-insensitive)
  SELECT id INTO v_member_id
  FROM members
  WHERE group_id = v_group_id
    AND lower(name) = lower(p_name)
    AND is_active = true;

  -- Tạo member mới nếu chưa có
  IF v_member_id IS NULL THEN
    INSERT INTO members (group_id, name, short, initials, color, role)
    VALUES (v_group_id, p_name, v_short, v_initials, '#574EFA', 'member')
    RETURNING id INTO v_member_id;
  END IF;

  -- Tạo token mới (revoke token cũ trước)
  v_token      := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE member_tokens SET revoked_at = now()
  WHERE member_id = v_member_id AND revoked_at IS NULL;

  INSERT INTO member_tokens (member_id, token_hash)
  VALUES (v_member_id, v_token_hash);

  RETURN json_build_object(
    'token',       v_token,
    'member_id',   v_member_id,
    'group_id',    v_group_id,
    'member_name', p_name
  );
END;
$$;
