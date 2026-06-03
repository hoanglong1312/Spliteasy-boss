CREATE OR REPLACE FUNCTION public.verify_profile_pin(p_profile_id uuid, p_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_pin_hash text;
BEGIN
  IF p_profile_id IS NULL OR p_pin IS NULL OR p_pin !~ '^\d{6}$' THEN RETURN false; END IF;
  SELECT pin_hash INTO v_pin_hash FROM public.profiles WHERE id = p_profile_id;
  IF v_pin_hash IS NOT NULL AND v_pin_hash <> '' THEN
    RETURN v_pin_hash = encode(digest(p_pin || ':' || p_profile_id::text, 'sha256'), 'hex');
  END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.profile_pin_required(p_profile_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF p_profile_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id AND pin_hash IS NOT NULL AND pin_hash <> '');
END; $$;
