CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
  WITH current_actor AS (
    SELECT id, group_id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT DISTINCT m.group_id
  FROM public.members m
  LEFT JOIN public.groups g ON g.id = m.group_id
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR (
      lower(m.name) = lower(actor.name)
      AND g.linked_pickleball_group_id = actor.group_id
    )
  )
  WHERE m.is_active IS NOT FALSE;
$$;
