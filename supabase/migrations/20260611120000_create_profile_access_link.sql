-- Add profile_id column to member_access_links for profile-level access
ALTER TABLE public.member_access_links
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Extend purpose CHECK constraint to include 'profile_login'
ALTER TABLE public.member_access_links
  DROP CONSTRAINT IF EXISTS member_access_links_purpose_check;

ALTER TABLE public.member_access_links
  ADD CONSTRAINT member_access_links_purpose_check
  CHECK (purpose IN ('member_login', 'member_bill', 'group_invite', 'profile_login'));

-- RPC: treasurer creates a profile-level access link
-- Validates caller is treasurer of a group containing the target profile
CREATE OR REPLACE FUNCTION public.create_profile_access_link(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_group_id uuid;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
BEGIN
  v_actor_member_id := public.get_current_member_id();

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Caller must be treasurer of a group that has the target profile as active member
  SELECT m_caller.group_id INTO v_group_id
  FROM public.members m_caller
  WHERE m_caller.id = v_actor_member_id
    AND m_caller.role = 'treasurer'
    AND m_caller.is_active IS DISTINCT FROM false
    AND EXISTS (
      SELECT 1 FROM public.members m_target
      WHERE m_target.profile_id = p_profile_id
        AND m_target.group_id = m_caller.group_id
        AND m_target.is_active IS DISTINCT FROM false
    )
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '14 days';

  INSERT INTO public.member_access_links (
    token_hash, purpose, group_id, profile_id, expires_at, created_by
  ) VALUES (
    v_token_hash, 'profile_login', v_group_id, p_profile_id, v_expires_at, v_actor_member_id
  );

  RETURN jsonb_build_object('urlToken', v_token, 'purpose', 'profile_login', 'expiresAt', v_expires_at);
END;
$$;

-- RPC: consume a profile-level access link → auth token for first active member of this profile
CREATE OR REPLACE FUNCTION public.consume_profile_access_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link record;
  v_member record;
  v_auth_token text;
  v_auth_hash text;
BEGIN
  SELECT mal.*
  INTO v_link
  FROM public.member_access_links mal
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose = 'profile_login'
    AND mal.profile_id IS NOT NULL
    AND mal.expires_at > now()
    AND mal.consumed_at IS NULL;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- Find first active member for this profile (prefer the group the link was created for)
  SELECT m.id, m.group_id, m.name
  INTO v_member
  FROM public.members m
  WHERE m.profile_id = v_link.profile_id
    AND m.is_active IS DISTINCT FROM false
  ORDER BY (m.group_id = v_link.group_id) DESC, m.created_at ASC
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_member');
  END IF;

  -- Issue auth token
  v_auth_token := encode(gen_random_bytes(32), 'hex');
  v_auth_hash := encode(digest(v_auth_token, 'sha256'), 'hex');

  UPDATE public.member_tokens
  SET revoked_at = now()
  WHERE member_id = v_member.id AND revoked_at IS NULL;

  INSERT INTO public.member_tokens (member_id, token_hash)
  VALUES (v_member.id, v_auth_hash);

  UPDATE public.member_access_links
  SET consumed_at = now()
  WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'authToken', v_auth_token,
    'memberId', v_member.id,
    'groupId', v_member.group_id,
    'memberName', v_member.name,
    'purpose', 'profile_login',
    'profileId', v_link.profile_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_access_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_profile_access_link(text) TO anon;
