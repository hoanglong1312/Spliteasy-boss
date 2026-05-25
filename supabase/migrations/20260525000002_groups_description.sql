ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS description text DEFAULT '';
