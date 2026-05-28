CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash text;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS pin_hash text;

DROP FUNCTION IF EXISTS public.set_member_pin(text);
DROP FUNCTION IF EXISTS public.verify_member_pin(uuid, text);
DROP FUNCTION IF EXISTS public.reset_member_pin(uuid, text);
DROP FUNCTION IF EXISTS public.member_pin_required(uuid);

CREATE OR REPLACE FUNCTION public.set_member_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_member_id uuid;
  v_profile_id uuid;
BEGIN
  v_member_id := public.get_current_member_id();
  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^\d{6}$' THEN
    RETURN jsonb_build_object('error', 'invalid_pin');
  END IF;

  SELECT profile_id
  INTO v_profile_id
  FROM public.members
  WHERE id = v_member_id;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'missing_profile');
  END IF;

  UPDATE public.profiles
  SET pin_hash = encode(digest(p_pin || ':' || v_profile_id::text, 'sha256'), 'hex')
  WHERE id = v_profile_id;

  UPDATE public.members
  SET pin_hash = NULL
  WHERE profile_id = v_profile_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_member_pin(p_member_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile_id uuid;
  v_profile_hash text;
  v_member_hash text;
BEGIN
  IF p_member_id IS NULL OR p_pin IS NULL OR p_pin !~ '^\d{6}$' THEN
    RETURN false;
  END IF;

  SELECT m.profile_id, p.pin_hash, m.pin_hash
  INTO v_profile_id, v_profile_hash, v_member_hash
  FROM public.members m
  LEFT JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.id = p_member_id
    AND m.is_active IS DISTINCT FROM false;

  IF v_profile_id IS NOT NULL AND v_profile_hash IS NOT NULL AND v_profile_hash <> '' THEN
    RETURN v_profile_hash = encode(digest(p_pin || ':' || v_profile_id::text, 'sha256'), 'hex');
  END IF;

  IF v_member_hash IS NOT NULL AND v_member_hash <> '' THEN
    RETURN v_member_hash = encode(digest(p_pin || ':' || p_member_id::text, 'sha256'), 'hex');
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_member_pin(p_member_id uuid DEFAULT NULL, p_pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_member_id uuid;
  v_current_profile_id uuid;
  v_target_member_id uuid;
  v_target_profile_id uuid;
BEGIN
  v_current_member_id := public.get_current_member_id();
  v_target_member_id := COALESCE(p_member_id, v_current_member_id);

  SELECT profile_id
  INTO v_current_profile_id
  FROM public.members
  WHERE id = v_current_member_id;

  SELECT profile_id
  INTO v_target_profile_id
  FROM public.members
  WHERE id = v_target_member_id;

  IF v_current_member_id IS NULL OR v_target_member_id IS NULL OR v_current_profile_id IS NULL OR v_target_profile_id IS NULL OR v_current_profile_id <> v_target_profile_id THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  IF p_pin IS NOT NULL AND NOT public.verify_member_pin(v_target_member_id, p_pin) THEN
    RETURN jsonb_build_object('error', 'invalid_pin');
  END IF;

  UPDATE public.profiles
  SET pin_hash = NULL
  WHERE id = v_target_profile_id;

  UPDATE public.members
  SET pin_hash = NULL
  WHERE profile_id = v_target_profile_id
     OR id = v_target_member_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.member_pin_required(p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile_hash text;
  v_member_hash text;
BEGIN
  IF p_member_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.pin_hash, m.pin_hash
  INTO v_profile_hash, v_member_hash
  FROM public.members m
  LEFT JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.id = p_member_id
    AND m.is_active IS DISTINCT FROM false;

  RETURN COALESCE(v_profile_hash, v_member_hash, '') <> '';
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_pin(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_member_pin(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_member_pin(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.member_pin_required(uuid) TO anon;
