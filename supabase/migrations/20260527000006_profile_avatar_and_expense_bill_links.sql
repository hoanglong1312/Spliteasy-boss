ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE OR REPLACE FUNCTION public.is_member_access_link_allowed(
  p_group_id uuid,
  p_member_id uuid,
  p_purpose text,
  p_actor_member_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_actor AS (
    SELECT id, profile_id, name, expense_active
    FROM public.members actor
    WHERE actor.id = p_actor_member_id
      AND actor.is_active IS DISTINCT FROM false
      AND actor.expense_active IS DISTINCT FROM false
    LIMIT 1
  ),
  target_member AS (
    SELECT id, profile_id, name, expense_active
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
          OR lower(target.name) = lower(actor.name)
        )
      )
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

  IF NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = p_member_id
      AND m.group_id = p_group_id
      AND m.is_active IS DISTINCT FROM false
      AND m.expense_active IS DISTINCT FROM false
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_member');
  END IF;

  IF NOT public.is_member_access_link_allowed(p_group_id, p_member_id, p_purpose, v_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + COALESCE(p_expires_in, interval '14 days');

  INSERT INTO public.member_access_links (token_hash, purpose, group_id, member_id, expires_at, created_by)
  VALUES (v_token_hash, p_purpose, p_group_id, p_member_id, v_expires_at, v_actor);

  RETURN jsonb_build_object('urlToken', v_token, 'purpose', p_purpose, 'expiresAt', v_expires_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_member_access_link_allowed(uuid, uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_member_access_link(uuid, uuid, text, interval) TO anon;
