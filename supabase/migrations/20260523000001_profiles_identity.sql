-- ─── PROFILES (Danh bạ chung toàn app) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_member_id  uuid,
  name              text NOT NULL,
  short             text,
  initials          text,
  color             text DEFAULT '#574EFA',
  bank_name         text,
  bank_account      text,
  bank_account_name text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS pin_hash text;

ALTER TABLE public.members
  ADD CONSTRAINT members_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

INSERT INTO public.profiles (legacy_member_id, name, short, initials, color, bank_name, bank_account, bank_account_name, created_at, updated_at)
SELECT
  m.id,
  m.name,
  m.short,
  m.initials,
  COALESCE(m.color, '#574EFA'),
  m.bank_name,
  m.bank_account,
  m.bank_account_name,
  COALESCE(m.created_at, now()),
  COALESCE(m.updated_at, now())
FROM public.members m
WHERE m.profile_id IS NULL;

UPDATE public.members m
SET profile_id = p.id
FROM public.profiles p
WHERE m.profile_id IS NULL
  AND p.legacy_member_id = m.id;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS legacy_member_id;

CREATE OR REPLACE FUNCTION public.ensure_member_profile()
RETURNS trigger AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (name, short, initials, color, bank_name, bank_account, bank_account_name)
  VALUES (
    NEW.name,
    NEW.short,
    NEW.initials,
    COALESCE(NEW.color, '#574EFA'),
    NEW.bank_name,
    NEW.bank_account,
    NEW.bank_account_name
  )
  RETURNING id INTO v_profile_id;

  NEW.profile_id = v_profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS members_ensure_profile ON public.members;
CREATE TRIGGER members_ensure_profile
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.ensure_member_profile();

ALTER TABLE public.members
  ALTER COLUMN profile_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS members_profile_id_idx ON public.members(profile_id);
CREATE INDEX IF NOT EXISTS profiles_bank_account_idx ON public.profiles(bank_account);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT profile_id
      FROM public.members
      WHERE group_id IN (SELECT get_my_group_ids())
        AND is_active = true
    )
  );

CREATE POLICY profiles_insert
  ON public.profiles FOR INSERT
  WITH CHECK (get_current_member_id() IS NOT NULL);

CREATE POLICY profiles_update
  ON public.profiles FOR UPDATE
  USING (
    id IN (
      SELECT profile_id
      FROM public.members
      WHERE id = get_current_member_id()
         OR is_treasurer(group_id)
    )
  )
  WITH CHECK (
    id IN (
      SELECT profile_id
      FROM public.members
      WHERE id = get_current_member_id()
         OR is_treasurer(group_id)
    )
  );
