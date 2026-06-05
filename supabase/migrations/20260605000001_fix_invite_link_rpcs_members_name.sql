-- Fix lookup_group_invite_link: treasurer.name -> profiles.name via join
CREATE OR REPLACE FUNCTION public.lookup_group_invite_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT mal.*, g.name AS group_name, g.emoji, tp.name AS treasurer_name
  INTO v_link
  FROM public.member_access_links mal
  JOIN public.groups g ON g.id = mal.group_id
  LEFT JOIN public.members treasurer ON treasurer.id = g.created_by
  LEFT JOIN public.profiles tp ON tp.id = treasurer.profile_id
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose = 'group_invite'
    AND mal.expires_at > now()
    AND g.deleted_at IS NULL;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  RETURN jsonb_build_object(
    'id', v_link.group_id,
    'name', v_link.group_name,
    'emoji', v_link.emoji,
    'treasurer', v_link.treasurer_name,
    'activeCount', (SELECT count(*) FROM public.members m WHERE m.group_id = v_link.group_id AND m.is_active IS DISTINCT FROM false),
    'memberCount', (SELECT count(*) FROM public.members m WHERE m.group_id = v_link.group_id AND m.is_active IS DISTINCT FROM false)
  );
END;
$$;

-- Fix request_join_by_invite_link: members.name -> profiles.name
CREATE OR REPLACE FUNCTION public.request_join_by_invite_link(p_token text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
  v_member record;
  v_profile_name text;
  v_request_id uuid;
  v_token text;
  v_token_hash text;
  v_has_pin boolean;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('error', 'name_required');
  END IF;

  SELECT *
  INTO v_link
  FROM public.member_access_links mal
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose = 'group_invite'
    AND mal.expires_at > now();

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- Search member by profile name (members.name was dropped)
  SELECT m.*, pr.name AS profile_name INTO v_member
  FROM public.members m
  JOIN public.profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_link.group_id
    AND lower(pr.name) = lower(trim(p_name))
    AND m.is_active IS DISTINCT FROM false
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_member.id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = v_member.profile_id AND pr.pin_hash IS NOT NULL
    ) INTO v_has_pin;

    IF v_has_pin THEN
      RETURN jsonb_build_object(
        'status', 'requires_pin',
        'memberId', v_member.id
      );
    ELSE
      v_token := encode(gen_random_bytes(32), 'hex');
      v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
      UPDATE public.member_tokens SET revoked_at = now()
        WHERE member_id = v_member.id AND revoked_at IS NULL;
      INSERT INTO public.member_tokens (member_id, token_hash)
        VALUES (v_member.id, v_token_hash);
      RETURN jsonb_build_object(
        'status', 'existing_member',
        'token', v_token,
        'memberId', v_member.id,
        'groupId', v_link.group_id,
        'memberName', v_member.profile_name
      );
    END IF;
  END IF;

  INSERT INTO public.join_requests (group_id, name, status, created_by_link_id)
  VALUES (v_link.group_id, trim(p_name), 'pending', v_link.id)
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'status', 'pending',
    'requestId', v_request_id,
    'groupId', v_link.group_id,
    'name', trim(p_name)
  );
END;
$$;
