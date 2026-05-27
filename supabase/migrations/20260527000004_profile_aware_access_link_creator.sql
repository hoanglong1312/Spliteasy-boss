CREATE OR REPLACE FUNCTION public.is_access_link_creator(p_group_id uuid, p_actor_member_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = p_actor_member_id
      AND is_active IS DISTINCT FROM false
    LIMIT 1
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.members creator
    JOIN current_actor actor ON (
      creator.id = actor.id
      OR (actor.profile_id IS NOT NULL AND creator.profile_id = actor.profile_id)
      OR lower(creator.name) = lower(actor.name)
    )
    JOIN public.groups g ON g.id = p_group_id
    WHERE creator.group_id = p_group_id
      AND creator.expense_active IS DISTINCT FROM false
      AND creator.is_active IS DISTINCT FROM false
      AND (creator.role = 'treasurer' OR g.created_by = creator.id OR g.created_by = creator.profile_id)
  );
$$;
