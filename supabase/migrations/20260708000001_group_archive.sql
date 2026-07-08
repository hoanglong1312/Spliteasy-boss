ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_expense_group_archived(
  p_group_id uuid,
  p_archived_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
BEGIN
  WITH current_actor AS (
    SELECT id, profile_id, name
    FROM public.members
    WHERE id = public.get_current_member_id()
      AND is_active IS NOT FALSE
    LIMIT 1
  )
  SELECT m.id
  INTO v_actor_member_id
  FROM public.members m
  JOIN current_actor actor ON (
    m.id = actor.id
    OR (actor.profile_id IS NOT NULL AND m.profile_id = actor.profile_id)
    OR lower(m.name) = lower(actor.name)
  )
  JOIN public.groups g ON g.id = m.group_id
  WHERE m.group_id = p_group_id
    AND m.is_active IS NOT FALSE
    AND m.expense_active IS DISTINCT FROM false
    AND (
      g.linked_pickleball_group_id IS NOT NULL
      OR (
        lower(coalesce(g.name, '')) NOT LIKE '%pickle%'
        AND coalesce(g.emoji, '') NOT IN ('🏓', '🏸')
      )
    )
  ORDER BY (m.id = actor.id) DESC, m.created_at DESC
  LIMIT 1;

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'expense_group_actor_not_found');
  END IF;

  IF NOT public.is_expense_group_admin(p_group_id, v_actor_member_id) THEN
    RETURN jsonb_build_object('error', 'expense_group_archive_permission_denied');
  END IF;

  UPDATE public.groups
  SET archived_at = p_archived_at
  WHERE id = p_group_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('id', p_group_id, 'archived_at', p_archived_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_expense_group(p_group_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT public.set_expense_group_archived(p_group_id, now());
$$;

CREATE OR REPLACE FUNCTION public.restore_expense_group(p_group_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT public.set_expense_group_archived(p_group_id, NULL::timestamptz);
$$;

GRANT EXECUTE ON FUNCTION public.set_expense_group_archived(uuid, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.archive_expense_group(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.restore_expense_group(uuid) TO anon;
