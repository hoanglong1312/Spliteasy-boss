-- Drop old broken 7-param overload (references members.name which was dropped)
DROP FUNCTION IF EXISTS public.add_expense_group_member(
  uuid, uuid, text, uuid, text, text, text
);

-- sync_member_names_for_profile: update profiles.name, not members.name (dropped)
CREATE OR REPLACE FUNCTION public.sync_member_names_for_profile(
  p_profile_id uuid,
  p_name       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET name = p_name WHERE id = p_profile_id;
END;
$$;

-- resume_recent_member_session: remove COALESCE(p.name, m.name) -> p.name only
CREATE OR REPLACE FUNCTION public.resume_recent_member_session(
  p_member_id   uuid,
  p_member_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member record;
  v_auth_token text;
  v_auth_hash  text;
BEGIN
  SELECT m.id, m.group_id, p.name AS name
  INTO v_member
  FROM public.members m
  JOIN public.groups g ON g.id = m.group_id
  LEFT JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.id = p_member_id
    AND (p_member_name IS NULL OR trim(p_member_name) = ''
         OR lower(coalesce(p.name, '')) = lower(trim(p_member_name)))
    AND m.is_active IS DISTINCT FROM false
    AND g.deleted_at IS NULL
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_recent_session');
  END IF;

  v_auth_token := encode(gen_random_bytes(32), 'hex');
  v_auth_hash  := encode(digest(v_auth_token, 'sha256'), 'hex');

  UPDATE public.member_tokens
  SET revoked_at = now()
  WHERE member_id = v_member.id AND revoked_at IS NULL;

  INSERT INTO public.member_tokens (member_id, token_hash)
  VALUES (v_member.id, v_auth_hash);

  RETURN jsonb_build_object(
    'authToken',  v_auth_token,
    'memberId',   v_member.id,
    'groupId',    v_member.group_id,
    'memberName', v_member.name
  );
END;
$$;

-- get_member_by_token: remove COALESCE(p.name, m.name) -> p.name only
CREATE OR REPLACE FUNCTION public.get_member_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash text;
  v_member_id  uuid;
  v_group_id   uuid;
  v_name       text;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN json_build_object('error', 'token_required');
  END IF;

  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  SELECT m.id, m.group_id, p.name
  INTO v_member_id, v_group_id, v_name
  FROM member_tokens mt
  JOIN members m ON m.id = mt.member_id
  LEFT JOIN profiles p ON p.id = m.profile_id
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

-- is_member_access_link_allowed: remove name-based matching
CREATE OR REPLACE FUNCTION public.is_member_access_link_allowed(
  p_group_id        uuid,
  p_member_id       uuid,
  p_purpose         text,
  p_actor_member_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH current_actor AS (
    SELECT id, profile_id, expense_active
    FROM public.members actor
    WHERE actor.id = p_actor_member_id
      AND actor.is_active IS DISTINCT FROM false
      AND actor.expense_active IS DISTINCT FROM false
    LIMIT 1
  ),
  target_member AS (
    SELECT id, profile_id, expense_active
    FROM public.members target
    WHERE target.id = p_member_id
      AND target.group_id = p_group_id
      AND target.is_active IS DISTINCT FROM false
      AND target.expense_active IS DISTINCT FROM false
    LIMIT 1
  )
  SELECT
    public.is_access_link_creator(p_group_id, p_actor_member_id)
    OR (
      p_purpose = 'member_bill'
      AND EXISTS (
        SELECT 1
        FROM current_actor actor
        JOIN target_member target ON (
          target.id = actor.id
          OR (actor.profile_id IS NOT NULL AND target.profile_id = actor.profile_id)
        )
      )
    );
$$;

-- create_member_bill_share_token: remove members.name SELECT and name-based join
CREATE OR REPLACE FUNCTION public.create_member_bill_share_token(
  p_group_id   uuid,
  p_member_id  uuid,
  p_expires_in interval DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_member  uuid;
  v_actor_member_id uuid;
  v_token           text;
BEGIN
  v_current_member := public.get_current_member_id();

  IF v_current_member IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  WITH current_actor AS (
    SELECT id, profile_id
    FROM public.members
    WHERE id = v_current_member
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT creator.id
  INTO v_actor_member_id
  FROM public.members creator
  JOIN current_actor actor ON (
    creator.id = actor.id
    OR (actor.profile_id IS NOT NULL AND creator.profile_id = actor.profile_id)
  )
  JOIN public.groups g ON g.id = p_group_id
  WHERE creator.group_id = p_group_id
    AND creator.is_active IS NOT FALSE
    AND creator.expense_active IS DISTINCT FROM false
    AND (creator.role = 'treasurer' OR g.created_by = creator.id OR g.created_by = creator.profile_id)
  ORDER BY (creator.id = actor.id) DESC, creator.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = p_member_id AND m.group_id = p_group_id
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_member');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.member_bill_share_tokens (token, group_id, member_id, expires_at, created_by)
  VALUES (v_token, p_group_id, p_member_id, now() + COALESCE(p_expires_in, interval '14 days'), v_actor_member_id);

  RETURN jsonb_build_object('token', v_token, 'expiresAt', now() + COALESCE(p_expires_in, interval '14 days'));
END;
$$;

-- ensure_member_profile trigger: simplified no-op (all inserts now include profile_id)
CREATE OR REPLACE FUNCTION public.ensure_member_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END;
$$;
