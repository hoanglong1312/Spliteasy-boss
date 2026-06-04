-- Fix: notifications scope leak — regular members saw all payment_submitted notifications
-- Change: condition 3 from is_active_member_session() to actor_member_id = get_current_member_id()
-- Result: members only see their own submitted payments; treasurers see all (via is_payment_notification_reviewer)

CREATE OR REPLACE FUNCTION public.list_visible_notifications()
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT notification.*
  FROM public.notifications notification
  WHERE public.is_same_profile_member(notification.member_id)
    OR public.is_payment_notification_reviewer(notification.type)
    OR (notification.type = 'payment_submitted' AND notification.actor_member_id = public.get_current_member_id())
  ORDER BY notification.created_at DESC;
$$;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select
  ON public.notifications FOR SELECT
  USING (
    public.is_same_profile_member(member_id)
    OR public.is_payment_notification_reviewer(type)
    OR (type = 'payment_submitted' AND actor_member_id = public.get_current_member_id())
  );
