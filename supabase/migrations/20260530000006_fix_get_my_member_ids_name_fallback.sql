-- Remove name-match fallback in get_my_member_ids() when profile_id exists
-- Prevents name collision attack: two people with same name should not share member access

CREATE OR REPLACE FUNCTION public.get_my_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT DISTINCT m.id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR (actor.profile_id IS NULL AND lower(m.name) = lower(actor.name))
  )
  WHERE m.is_active IS NOT FALSE;
$function$;
