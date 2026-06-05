-- Fix 1: join_group — add extensions to search_path for gen_random_bytes
CREATE OR REPLACE FUNCTION public.join_group(p_invite_code text, p_member_name text, p_existing_token text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Fix 2: request_join_by_invite_link — add extensions to search_path
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

  SELECT *
  INTO v_link
  FROM public.member_access_links mal
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose = 'group_invite'
    AND mal.expires_at > now();

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

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
      RETURN jsonb_build_object('status', 'requires_pin', 'memberId', v_member.id);
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

-- Fix 3: approve_join_request — search via profiles, create profile+member
CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_request record;
  v_member_id uuid;
  v_profile_id uuid;
  v_name text;
  v_words text[];
  v_short text;
  v_initials text;
BEGIN
  v_actor := public.get_current_member_id();

  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_request');
  END IF;

  IF NOT public.is_access_link_creator(v_request.group_id, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_name := trim(v_request.name);

  SELECT m.id INTO v_member_id
  FROM public.members m
  JOIN public.profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_request.group_id
    AND lower(pr.name) = lower(v_name)
  ORDER BY m.is_active DESC NULLS LAST, m.created_at DESC
  LIMIT 1;

  IF v_member_id IS NULL THEN
    v_words := regexp_split_to_array(v_name, '\s+');
    v_short := coalesce(v_words[array_length(v_words, 1)], v_name);
    v_initials := upper(left(array_to_string(ARRAY(
      SELECT left(word, 1) FROM unnest(v_words) AS word WHERE word <> ''
    ), ''), 2));

    INSERT INTO public.profiles (name, short, initials, color)
    VALUES (v_name, v_short, nullif(v_initials, ''), '#574EFA')
    RETURNING id INTO v_profile_id;

    INSERT INTO public.members (group_id, profile_id, role, member_type, expense_active, is_active)
    VALUES (v_request.group_id, v_profile_id, 'member', 'fixed', true, true)
    RETURNING id INTO v_member_id;
  ELSE
    UPDATE public.members
    SET is_active = true, expense_active = true, left_at = NULL
    WHERE id = v_member_id;
  END IF;

  UPDATE public.join_requests
  SET status = 'approved', reviewed_by = v_actor, reviewed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('requestId', p_request_id, 'status', 'approved', 'memberId', v_member_id);
END;
$$;

-- Fix 4: create_group — create profiles for member names
CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_invite_code text, p_member_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_name text;
  v_member_id uuid;
  v_creator_id uuid;
  v_actor_profile_id uuid;
  v_profile_id uuid;
  v_words text[];
  v_short text;
  v_initials text;
BEGIN
  IF trim(coalesce(p_name, '')) = '' THEN
    RETURN json_build_object('error', 'name_required');
  END IF;

  IF trim(coalesce(p_invite_code, '')) = '' THEN
    RETURN json_build_object('error', 'invite_code_required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.groups WHERE invite_code = p_invite_code) THEN
    RETURN json_build_object('error', 'invite_code_taken');
  END IF;

  INSERT INTO public.groups (name, invite_code)
  VALUES (trim(p_name), p_invite_code)
  RETURNING id INTO v_group_id;

  SELECT profile_id INTO v_actor_profile_id
  FROM public.members
  WHERE id = public.get_current_member_id() AND is_active IS NOT FALSE
  LIMIT 1;

  FOREACH v_name IN ARRAY coalesce(p_member_names, ARRAY[]::text[]) LOOP
    IF trim(coalesce(v_name, '')) <> '' THEN
      v_profile_id := NULL;

      IF v_creator_id IS NULL AND v_actor_profile_id IS NOT NULL THEN
        v_profile_id := v_actor_profile_id;
      ELSE
        SELECT id INTO v_profile_id FROM public.profiles
        WHERE lower(name) = lower(trim(v_name)) LIMIT 1;

        IF v_profile_id IS NULL THEN
          v_words := regexp_split_to_array(trim(v_name), '\s+');
          v_short := coalesce(v_words[array_length(v_words, 1)], trim(v_name));
          v_initials := upper(left(array_to_string(ARRAY(
            SELECT left(word, 1) FROM unnest(v_words) AS word WHERE word <> ''
          ), ''), 2));
          INSERT INTO public.profiles (name, short, initials, color)
          VALUES (trim(v_name), v_short, nullif(v_initials, ''), '#574EFA')
          RETURNING id INTO v_profile_id;
        END IF;
      END IF;

      INSERT INTO public.members (group_id, profile_id, role)
      VALUES (v_group_id, v_profile_id,
        CASE WHEN v_creator_id IS NULL THEN 'treasurer' ELSE 'member' END)
      RETURNING id INTO v_member_id;

      IF v_creator_id IS NULL THEN
        v_creator_id := v_member_id;
        UPDATE public.groups SET created_by = v_creator_id WHERE id = v_group_id;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'group_id', v_group_id,
    'invite_code', p_invite_code,
    'creator_member_id', v_creator_id
  );
END;
$$;

-- Fix 5: request_to_join — search via profiles.name
CREATE OR REPLACE FUNCTION public.request_to_join(p_invite_code text, p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id  uuid;
  v_member_id uuid;
  v_req_id    uuid;
BEGIN
  SELECT id INTO v_group_id FROM groups WHERE invite_code = p_invite_code;
  IF v_group_id IS NULL THEN
    RETURN json_build_object('error', 'group_not_found');
  END IF;

  SELECT m.id INTO v_member_id
  FROM members m
  JOIN profiles pr ON pr.id = m.profile_id
  WHERE m.group_id = v_group_id
    AND lower(pr.name) = lower(trim(p_name))
    AND m.is_active = true;

  IF v_member_id IS NOT NULL THEN
    RETURN json_build_object('error', 'name_exists');
  END IF;

  SELECT id INTO v_req_id
  FROM join_requests
  WHERE group_id = v_group_id AND name = trim(p_name) AND status = 'pending';
  IF v_req_id IS NOT NULL THEN
    RETURN json_build_object('status', 'pending', 'request_id', v_req_id);
  END IF;

  INSERT INTO join_requests (group_id, name)
  VALUES (v_group_id, trim(p_name))
  RETURNING id INTO v_req_id;

  RETURN json_build_object('status', 'pending', 'request_id', v_req_id);
END;
$$;

-- Fix 6: submit_payment_notification (both overloads) — remove members.name ORDER BY
CREATE OR REPLACE FUNCTION public.submit_payment_notification(
  p_target_member_id uuid,
  p_group_id uuid,
  p_amount numeric,
  p_member_name text,
  p_covered_members jsonb DEFAULT '[]'::jsonb,
  p_transfer_description text DEFAULT ''::text,
  p_payment_target jsonb DEFAULT '{}'::jsonb,
  p_month_label text DEFAULT ''::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.get_current_member_id();
  v_actor_group uuid;
  v_target uuid;
  v_amount numeric := COALESCE(p_amount, 0);
  v_member_name text := COALESCE(NULLIF(TRIM(p_member_name), ''), 'Thành viên');
  v_metadata jsonb;
  v_notification_id uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT group_id INTO v_actor_group FROM public.members WHERE id = v_actor AND is_active = true;
  IF v_actor_group IS NULL THEN RAISE EXCEPTION 'inactive_member'; END IF;

  IF p_target_member_id IS NOT NULL THEN
    SELECT id INTO v_target FROM public.members
    WHERE id = p_target_member_id AND group_id = v_actor_group AND is_active = true LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    SELECT m.id INTO v_target
    FROM public.members m
    WHERE m.group_id = v_actor_group AND m.is_active = true AND m.role IN ('treasurer', 'admin', 'owner')
    ORDER BY m.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_target IS NULL THEN RAISE EXCEPTION 'payment_target_not_found'; END IF;

  v_metadata := jsonb_build_object(
    'status', 'pending', 'amount', v_amount, 'memberName', v_member_name,
    'coveredMembers', COALESCE(p_covered_members, '[]'::jsonb),
    'transferDescription', COALESCE(p_transfer_description, ''),
    'paymentTarget', COALESCE(p_payment_target, '{}'::jsonb),
    'monthLabel', COALESCE(p_month_label, '')
  );

  INSERT INTO public.notifications (member_id, group_id, actor_member_id, type, ref_type, message, metadata)
  VALUES (v_target, COALESCE(p_group_id, v_actor_group), v_actor, 'payment_submitted', 'settlement',
    v_member_name || ' báo đã thanh toán ' || trim(to_char(v_amount, 'FM999G999G999G999')) || ' đ', v_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_payment_notification(
  p_target_member_id uuid,
  p_group_id uuid,
  p_amount numeric,
  p_member_name text,
  p_covered_members jsonb DEFAULT '[]'::jsonb,
  p_transfer_description text DEFAULT ''::text,
  p_payment_target jsonb DEFAULT '{}'::jsonb,
  p_month_label text DEFAULT ''::text,
  p_covered_sources jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.get_current_member_id();
  v_actor_group uuid;
  v_target uuid;
  v_amount numeric := COALESCE(p_amount, 0);
  v_member_name text := COALESCE(NULLIF(TRIM(p_member_name), ''), 'Thành viên');
  v_metadata jsonb;
  v_notification_id uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT group_id INTO v_actor_group FROM public.members WHERE id = v_actor AND is_active = true;
  IF v_actor_group IS NULL THEN RAISE EXCEPTION 'inactive_member'; END IF;

  IF p_target_member_id IS NOT NULL THEN
    SELECT id INTO v_target FROM public.members
    WHERE id = p_target_member_id AND group_id = v_actor_group AND is_active = true LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    SELECT m.id INTO v_target
    FROM public.members m
    WHERE m.group_id = v_actor_group AND m.is_active = true AND m.role IN ('treasurer', 'admin', 'owner')
    ORDER BY m.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_target IS NULL THEN RAISE EXCEPTION 'payment_target_not_found'; END IF;

  v_metadata := jsonb_build_object(
    'status', 'pending', 'amount', v_amount, 'memberName', v_member_name,
    'coveredMembers', COALESCE(p_covered_members, '[]'::jsonb),
    'coveredSources', COALESCE(p_covered_sources, '[]'::jsonb),
    'transferDescription', COALESCE(p_transfer_description, ''),
    'paymentTarget', COALESCE(p_payment_target, '{}'::jsonb),
    'monthLabel', COALESCE(p_month_label, '')
  );

  INSERT INTO public.notifications (member_id, group_id, actor_member_id, type, ref_type, message, metadata)
  VALUES (v_target, COALESCE(p_group_id, v_actor_group), v_actor, 'payment_submitted', 'settlement',
    v_member_name || ' báo đã thanh toán ' || trim(to_char(v_amount, 'FM999G999G999G999')) || ' đ', v_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;
