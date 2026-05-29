-- pickle_sessions was missing DELETE policy → RLS silently blocked session regeneration
-- INSERT policy had no restriction → any public user could insert sessions
CREATE POLICY "pickle_sessions_delete"
ON public.pickle_sessions
FOR DELETE
TO public
USING (is_treasurer(group_id));

DROP POLICY IF EXISTS "pickle_sessions_insert" ON public.pickle_sessions;
CREATE POLICY "pickle_sessions_insert"
ON public.pickle_sessions
FOR INSERT
TO public
WITH CHECK (is_treasurer(group_id));
