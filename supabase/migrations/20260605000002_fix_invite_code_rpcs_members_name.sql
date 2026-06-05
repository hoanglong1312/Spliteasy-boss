-- Fix lookup_group_by_code: members.name -> profiles.name
CREATE OR REPLACE FUNCTION public.lookup_group_by_code(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group  groups%ROWTYPE;
  v_names  text[];
  v_treasurer_name text;
BEGIN
  SELECT * INTO v_group
  FROM groups
  WHERE invite_code = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_group.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Mã mời không tồn tại.');
  END IF;

  SELECT array_agg(pr.name ORDER BY m.created_at)
  INTO v_names
  FROM members m
  JOIN profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_group.id AND m.is_active = true;

  SELECT pr.name INTO v_treasurer_name
  FROM members m
  JOIN profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_group.id AND m.role = 'treasurer'
  LIMIT 1;

  RETURN jsonb_build_object(
    'id',            v_group.id,
    'name',          v_group.name,
    'emoji',         coalesce(v_group.emoji, '👥'),
    'invite_code',   v_group.invite_code,
    'created_at',    v_group.created_at,
    'treasurer',     coalesce(v_treasurer_name, ''),
    'member_names',  coalesce(v_names, '{}')
  );
END;
$$;

-- Fix join_group: members.name -> profiles.name
CREATE OR REPLACE FUNCTION public.join_group(p_invite_code text, p_member_name text, p_existing_token text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id   uuid;
  v_member_id  uuid;
  v_token      text;
  v_token_hash text;
BEGIN
  SELECT id INTO v_group_id FROM groups WHERE invite_code = p_invite_code;
  IF v_group_id IS NULL THEN
    RETURN json_build_object('error', 'group_not_found');
  END IF;

  SELECT m.id INTO v_member_id
  FROM members m
  JOIN profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_group_id
    AND lower(pr.name) = lower(p_member_name)
    AND m.is_active = true;

  IF v_member_id IS NULL THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;

  IF p_existing_token IS NOT NULL AND trim(p_existing_token) <> '' THEN
    v_token := p_existing_token;
  ELSE
    v_token := encode(gen_random_bytes(32), 'hex');
  END IF;

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE member_tokens SET revoked_at = now()
  WHERE member_id = v_member_id AND revoked_at IS NULL;

  INSERT INTO member_tokens (member_id, token_hash)
  VALUES (v_member_id, v_token_hash);

  RETURN json_build_object(
    'token',       v_token,
    'member_id',   v_member_id,
    'group_id',    v_group_id,
    'member_name', p_member_name
  );
END;
$$;

-- Fix preview_group: members.name/short/initials/color -> profiles join
CREATE OR REPLACE FUNCTION public.preview_group(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id   uuid;
  v_group_name text;
  v_members    json;
BEGIN
  p_invite_code := upper(trim(p_invite_code));

  SELECT id, name
  INTO v_group_id, v_group_name
  FROM groups
  WHERE invite_code = p_invite_code;

  IF v_group_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_invite_code');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id',       m.id,
      'name',     pr.name,
      'short',    pr.short,
      'initials', pr.initials,
      'color',    COALESCE(pr.color, '#574EFA'),
      'role',     m.role,
      'has_pin',  (pr.pin_hash IS NOT NULL)
    ) ORDER BY m.display_order, pr.name
  )
  INTO v_members
  FROM members m
  JOIN profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_group_id AND m.is_active = true;

  RETURN json_build_object(
    'group_id',   v_group_id,
    'group_name', v_group_name,
    'members',    COALESCE(v_members, '[]'::json)
  );
END;
$$;
