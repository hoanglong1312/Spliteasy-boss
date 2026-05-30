-- Fix pickle_sessions policies: replace is_treasurer() with cross-group-aware check

DROP POLICY IF EXISTS "pickle_sessions_insert" ON public.pickle_sessions;
DROP POLICY IF EXISTS "pickle_sessions_update" ON public.pickle_sessions;
DROP POLICY IF EXISTS "pickle_sessions_delete" ON public.pickle_sessions;

CREATE POLICY "pickle_sessions_insert" ON public.pickle_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.group_id = pickle_sessions.group_id
        AND m.role = 'treasurer'
    )
  );

CREATE POLICY "pickle_sessions_update" ON public.pickle_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.group_id = pickle_sessions.group_id
        AND m.role = 'treasurer'
    )
  );

CREATE POLICY "pickle_sessions_delete" ON public.pickle_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.group_id = pickle_sessions.group_id
        AND m.role = 'treasurer'
    )
  );
