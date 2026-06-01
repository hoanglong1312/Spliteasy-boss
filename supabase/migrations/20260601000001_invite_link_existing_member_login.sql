-- Migration: Support existing member auto-login via invite link
-- When existing member opens invite link, auto-issue token (if no PIN) or show PIN input
-- New members still get pending request as before

CREATE OR REPLACE FUNCTION public.request_join_by_invite_link(p_token text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link record;
  v_member record;
  v_request_id uuid;
  v_token text;
  v_token_hash text;
  v_has_pin boolean;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('error', 'name_required');
  END IF;

  -- Validate invite token (hash + purpose + expiry)
  SELECT *
  INTO v_link
  FROM public.member_access_links mal
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose = 'group_invite'
    AND mal.expires_at > now();

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- Check if member already exists in this group (case-insensitive)
  SELECT * INTO v_member
  FROM public.members
  WHERE group_id = v_link.group_id
    AND lower(name) = lower(trim(p_name))
    AND is_active IS DISTINCT FROM false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_member.id IS NOT NULL THEN
    -- Existing member found — check if they have a PIN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = v_member.profile_id AND pr.pin_hash IS NOT NULL
    ) INTO v_has_pin;

    IF v_has_pin THEN
      -- Member has PIN — return requires_pin status so UI can show PIN input
      RETURN jsonb_build_object(
        'status', 'requires_pin',
        'memberId', v_member.id
      );
    ELSE
      -- No PIN — issue token directly and return status: existing_member
      v_token := encode(gen_random_bytes(32), 'hex');
      v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
      
      -- Revoke old tokens first
      UPDATE public.member_tokens SET revoked_at = now()
        WHERE member_id = v_member.id AND revoked_at IS NULL;
      
      -- Issue new token
      INSERT INTO public.member_tokens (member_id, token_hash)
        VALUES (v_member.id, v_token_hash);
      
      RETURN jsonb_build_object(
        'status', 'existing_member',
        'token', v_token,
        'memberId', v_member.id,
        'groupId', v_link.group_id,
        'memberName', v_member.name
      );
    END IF;
  END IF;

  -- New member — insert pending join request (keep existing behavior)
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
