-- preview_group(p_invite_code) → { group_id, group_name, members[] }
-- SECURITY DEFINER: callable with anon key, no auth token needed
-- Used by JoinGroup screen to show group info before the user picks their identity

CREATE OR REPLACE FUNCTION preview_group(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
      'id',       id,
      'name',     name,
      'short',    short,
      'initials', initials,
      'color',    COALESCE(color, '#574EFA')
    ) ORDER BY name
  )
  INTO v_members
  FROM members
  WHERE group_id = v_group_id
    AND is_active = true;

  RETURN json_build_object(
    'group_id',   v_group_id,
    'group_name', v_group_name,
    'members',    COALESCE(v_members, '[]'::json)
  );
END;
$$;
