ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS linked_pickleball_group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS groups_linked_pickleball_group_id_idx
  ON public.groups(linked_pickleball_group_id);
