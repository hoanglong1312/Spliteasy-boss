-- Restrict profiles_update: remove treasurer clause
-- Treasurer should NOT be able to overwrite pin_hash or bank fields of other members
-- PIN and bank updates go through dedicated SECURITY DEFINER RPCs that enforce ownership

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  USING (
    id IN (
      SELECT members.profile_id
      FROM public.members
      WHERE members.id = public.get_current_member_id()
    )
  )
  WITH CHECK (
    id IN (
      SELECT members.profile_id
      FROM public.members
      WHERE members.id = public.get_current_member_id()
    )
  );
