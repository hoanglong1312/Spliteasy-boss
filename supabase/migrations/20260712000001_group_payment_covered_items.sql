CREATE OR REPLACE FUNCTION public.list_confirmed_payment_covered_items()
RETURNS TABLE(payable_item_key text, amount numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(covered_item->>'payableItemKey', covered_item->>'payable_item_key'),
    COALESCE((covered_item->>'amount')::numeric, 0)
  FROM public.notifications notification
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(notification.metadata->'coveredItems', notification.metadata->'covered_items', '[]'::jsonb)
  ) AS covered_item
  WHERE lower(COALESCE(notification.metadata->>'status', '')) = 'confirmed'
    AND notification.type ILIKE '%payment%'
    AND EXISTS (
      SELECT 1
      FROM public.members current_member
      JOIN public.members group_member
        ON group_member.group_id = notification.group_id
       AND group_member.is_active = true
       AND (
         group_member.id = current_member.id
         OR (
           current_member.profile_id IS NOT NULL
           AND group_member.profile_id = current_member.profile_id
         )
       )
      WHERE current_member.id = public.get_current_member_id()
        AND current_member.is_active = true
    );
$$;
