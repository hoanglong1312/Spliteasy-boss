CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.member_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('member_login', 'member_bill', 'group_invite')),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'declined')),
  created_by_link_id uuid REFERENCES public.member_access_links(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

ALTER TABLE public.member_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.member_access_links FROM anon;
REVOKE ALL ON public.join_requests FROM anon;
GRANT SELECT ON public.join_requests TO anon;

CREATE INDEX IF NOT EXISTS idx_member_access_links_hash
  ON public.member_access_links (token_hash);

CREATE INDEX IF NOT EXISTS idx_member_access_links_scope
  ON public.member_access_links (group_id, member_id, purpose, expires_at);

CREATE INDEX IF NOT EXISTS idx_join_requests_group_status
  ON public.join_requests (group_id, status, created_at);

DROP POLICY IF EXISTS join_requests_select ON public.join_requests;
CREATE POLICY join_requests_select
  ON public.join_requests FOR SELECT
  USING (public.is_access_link_creator(group_id, public.get_current_member_id()));

CREATE OR REPLACE FUNCTION public.is_access_link_creator(p_group_id uuid, p_actor_member_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members actor
    JOIN public.groups g ON g.id = p_group_id
    WHERE actor.id = p_actor_member_id
      AND actor.group_id = p_group_id
      AND actor.expense_active IS DISTINCT FROM false
      AND actor.is_active IS DISTINCT FROM false
      AND (actor.role = 'treasurer' OR g.created_by = actor.id OR g.created_by = actor.profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.create_member_access_link(
  p_group_id uuid,
  p_member_id uuid,
  p_purpose text DEFAULT 'member_login',
  p_expires_in interval DEFAULT interval '14 days'
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

  IF NOT public.is_access_link_creator(p_group_id, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_member_id
      AND group_id = p_group_id
      AND is_active IS DISTINCT FROM false
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_member');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + COALESCE(p_expires_in, interval '14 days');

  INSERT INTO public.member_access_links (token_hash, purpose, group_id, member_id, expires_at, created_by)
  VALUES (v_token_hash, p_purpose, p_group_id, p_member_id, v_expires_at, v_actor);

  RETURN jsonb_build_object('urlToken', v_token, 'purpose', p_purpose, 'expiresAt', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_member_access_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link record;
  v_auth_token text;
  v_auth_hash text;
BEGIN
  SELECT mal.*, m.name AS member_name
  INTO v_link
  FROM public.member_access_links mal
  JOIN public.members m ON m.id = mal.member_id
  JOIN public.groups g ON g.id = mal.group_id
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose IN ('member_login', 'member_bill')
    AND mal.member_id IS NOT NULL
    AND mal.expires_at > now()
    AND g.deleted_at IS NULL
    AND m.is_active IS DISTINCT FROM false;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  v_auth_token := encode(gen_random_bytes(32), 'hex');
  v_auth_hash := encode(digest(v_auth_token, 'sha256'), 'hex');

  UPDATE public.member_tokens
  SET revoked_at = now()
  WHERE member_id = v_link.member_id
    AND revoked_at IS NULL;

  INSERT INTO public.member_tokens (member_id, token_hash)
  VALUES (v_link.member_id, v_auth_hash);

  UPDATE public.member_access_links
  SET consumed_at = now()
  WHERE id = v_link.id;

  RETURN jsonb_build_object('authToken', v_auth_token, 'memberId', v_link.member_id, 'groupId', v_link.group_id, 'memberName', v_link.member_name, 'purpose', v_link.purpose);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_invite_link(
  p_group_id uuid,
  p_expires_in interval DEFAULT interval '14 days'
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

  IF NOT public.is_access_link_creator(p_group_id, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + COALESCE(p_expires_in, interval '14 days');

  INSERT INTO public.member_access_links (token_hash, purpose, group_id, expires_at, created_by)
  VALUES (v_token_hash, 'group_invite', p_group_id, v_expires_at, v_actor);

  RETURN jsonb_build_object('urlToken', v_token, 'purpose', 'group_invite', 'expiresAt', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_group_invite_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT mal.*, g.name AS group_name, g.emoji, treasurer.name AS treasurer_name
  INTO v_link
  FROM public.member_access_links mal
  JOIN public.groups g ON g.id = mal.group_id
  LEFT JOIN public.members treasurer ON treasurer.id = g.created_by
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

CREATE OR REPLACE FUNCTION public.request_join_by_invite_link(p_token text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link record;
  v_request_id uuid;
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

  INSERT INTO public.join_requests (group_id, name, status, created_by_link_id)
  VALUES (v_link.group_id, trim(p_name), 'pending', v_link.id)
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('requestId', v_request_id, 'status', 'pending', 'groupId', v_link.group_id, 'name', trim(p_name));
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid;
  v_request record;
  v_member_id uuid;
  v_name text;
  v_words text[];
  v_short text;
  v_initials text;
BEGIN
  v_actor := public.get_current_member_id();

  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT *
  INTO v_request
  FROM public.join_requests
  WHERE id = p_request_id
    AND status = 'pending';

  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_request');
  END IF;

  IF NOT public.is_access_link_creator(v_request.group_id, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_name := trim(v_request.name);

  SELECT id
  INTO v_member_id
  FROM public.members
  WHERE group_id = v_request.group_id
    AND lower(name) = lower(v_name)
  ORDER BY is_active DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_member_id IS NULL THEN
    v_words := regexp_split_to_array(v_name, '\s+');
    v_short := coalesce(v_words[array_length(v_words, 1)], v_name);
    v_initials := upper(left(array_to_string(ARRAY(
      SELECT left(word, 1)
      FROM unnest(v_words) AS word
      WHERE word <> ''
    ), ''), 2));

    INSERT INTO public.members (group_id, name, short, initials, color, role, member_type, expense_active, is_active)
    VALUES (v_request.group_id, v_name, v_short, nullif(v_initials, ''), '#574EFA', 'member', 'fixed', true, true)
    RETURNING id INTO v_member_id;
  ELSE
    UPDATE public.members
    SET is_active = true,
        expense_active = true,
        left_at = NULL
    WHERE id = v_member_id;
  END IF;

  UPDATE public.join_requests
  SET status = 'approved',
      reviewed_by = v_actor,
      reviewed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('requestId', p_request_id, 'status', 'approved', 'memberId', v_member_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_join_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid;
  v_request record;
BEGIN
  v_actor := public.get_current_member_id();

  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT *
  INTO v_request
  FROM public.join_requests
  WHERE id = p_request_id
    AND status = 'pending';

  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_request');
  END IF;

  IF NOT public.is_access_link_creator(v_request.group_id, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.join_requests
  SET status = 'rejected',
      reviewed_by = v_actor,
      reviewed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('requestId', p_request_id, 'status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_member_access_link(uuid, uuid, text, interval) TO anon;
GRANT EXECUTE ON FUNCTION public.consume_member_access_link(text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_group_invite_link(uuid, interval) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_group_invite_link(text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_join_by_invite_link(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid) TO anon;
