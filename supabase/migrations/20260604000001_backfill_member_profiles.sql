DO $$
DECLARE
  r RECORD;
  v_profile_id uuid;
BEGIN
  FOR r IN
    SELECT id, name, short, initials, color, bank_name, bank_account, bank_account_name
    FROM public.members
    WHERE profile_id IS NULL AND name IS NOT NULL AND name <> ''
  LOOP
    INSERT INTO public.profiles (name, short, initials, color, bank_name, bank_account, bank_account_name)
    VALUES (r.name, r.short, r.initials, COALESCE(r.color, '#574EFA'), r.bank_name, r.bank_account, r.bank_account_name)
    RETURNING id INTO v_profile_id;
    UPDATE public.members SET profile_id = v_profile_id WHERE id = r.id;
  END LOOP;
END;
$$;
