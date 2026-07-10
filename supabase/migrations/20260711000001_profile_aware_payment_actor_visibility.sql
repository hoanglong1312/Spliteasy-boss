-- A profile can have one member row per group. Payment visibility must follow
-- the profile that submitted it, not only the exact member row used at submit time.

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
    OR (
      notification.type = 'payment_submitted'
      AND public.is_same_profile_member(notification.actor_member_id)
    )
  ORDER BY notification.created_at DESC;
$$;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select
  ON public.notifications FOR SELECT
  USING (
    public.is_same_profile_member(member_id)
    OR public.is_payment_notification_reviewer(type)
    OR (
      type = 'payment_submitted'
      AND public.is_same_profile_member(actor_member_id)
    )
  );

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE is_read = false
    AND (
      public.is_same_profile_member(member_id)
      OR public.is_payment_notification_reviewer(type)
      OR (
        type = 'payment_submitted'
        AND public.is_same_profile_member(actor_member_id)
      )
    );
$$;
