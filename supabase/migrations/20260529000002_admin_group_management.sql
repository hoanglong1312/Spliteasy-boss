CREATE OR REPLACE FUNCTION public.is_expense_group_admin(p_group_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    JOIN public.members m ON m.group_id = g.id
    WHERE g.id = p_group_id
      AND m.id = p_member_id
      AND m.is_active IS NOT FALSE
      AND m.expense_active IS DISTINCT FROM false
      AND (
        m.role IN ('treasurer', 'admin', 'owner')
        OR g.created_by = p_member_id
        OR g.created_by = m.profile_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
  WITH current_actor AS (
    SELECT id, group_id, profile_id, name, role
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  ), regular_groups AS (
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
    WHERE m.is_active IS NOT FALSE
  ), admin_groups AS (
    SELECT g.id AS group_id
    FROM public.groups g
    CROSS JOIN current_actor actor
    WHERE actor.role IN ('admin', 'owner')
      AND g.deleted_at IS NULL
  )
  SELECT group_id FROM regular_groups
  UNION
  SELECT group_id FROM admin_groups;
$$;

GRANT EXECUTE ON FUNCTION public.is_expense_group_admin(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_group_ids() TO anon;
