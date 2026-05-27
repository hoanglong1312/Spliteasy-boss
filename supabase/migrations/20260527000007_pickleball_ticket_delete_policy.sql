-- Allow pickleball treasurers to delete individual ticket rows.
ALTER TABLE public.pickleball_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treasurers can delete tickets" ON public.pickleball_tickets;

CREATE POLICY "treasurers can delete tickets"
  ON public.pickleball_tickets FOR DELETE
  USING (
    group_id IN (
      SELECT m.group_id
      FROM public.members m
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.role = 'treasurer'
        AND m.is_active IS DISTINCT FROM false
    )
  );
