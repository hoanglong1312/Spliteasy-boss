-- Payment approvals belong to the treasurer's profile, not only one group membership.

CREATE OR REPLACE FUNCTION public.is_same_profile_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members target
    JOIN public.members current_member ON current_member.id = public.get_current_member_id()
    WHERE target.id = p_member_id
      AND target.profile_id IS NOT NULL
      AND current_member.profile_id IS NOT NULL
      AND target.profile_id = current_member.profile_id
  ) OR p_member_id = public.get_current_member_id();
$$;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select
  ON public.notifications FOR SELECT
  USING (public.is_same_profile_member(member_id));

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update
  ON public.notifications FOR UPDATE
  USING (public.is_same_profile_member(member_id));

DROP POLICY IF EXISTS notifications_insert_payment_submitted ON public.notifications;
CREATE POLICY notifications_insert_payment_submitted
  ON public.notifications FOR INSERT
  WITH CHECK (
    type = 'payment_submitted'
    AND actor_member_id = public.get_current_member_id()
  );
