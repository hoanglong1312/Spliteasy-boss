-- Fix pickle_attendees INSERT and UPDATE policies to support cross-group auth
-- (user logged in via expense group token managing pickleball attendance)

DROP POLICY IF EXISTS "pickle_attendees_insert" ON public.pickle_attendees;
DROP POLICY IF EXISTS "pickle_attendees_update" ON public.pickle_attendees;

CREATE POLICY "pickle_attendees_insert" ON public.pickle_attendees
  FOR INSERT
  WITH CHECK (
    member_id IN (SELECT public.get_my_member_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.pickle_sessions ps ON ps.id = pickle_attendees.session_id
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.group_id = ps.group_id
        AND m.role = 'treasurer'
    )
  );

CREATE POLICY "pickle_attendees_update" ON public.pickle_attendees
  FOR UPDATE
  USING (
    member_id IN (SELECT public.get_my_member_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.pickle_sessions ps ON ps.id = pickle_attendees.session_id
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.group_id = ps.group_id
        AND m.role = 'treasurer'
    )
  );
