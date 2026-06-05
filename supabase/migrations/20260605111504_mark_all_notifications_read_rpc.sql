-- Add RPC: mark_all_notifications_read
-- Marks all visible notifications as read using the same visibility conditions as list_visible_notifications.
-- Needed because some notifications are visible via reviewer/actor role (member_id ≠ currentUserId),
-- so direct UPDATE with .eq('member_id', currentUserId) in client misses them.

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
      OR (type = 'payment_submitted' AND actor_member_id = public.get_current_member_id())
    );
$$;
