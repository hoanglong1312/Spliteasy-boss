CREATE OR REPLACE FUNCTION public.sync_linked_expense_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NULL OR NEW.is_active IS FALSE THEN
    RETURN NEW;
  END IF;

  UPDATE public.members target
  SET
    is_active = true,
    expense_active = true,
    left_at = NULL
  FROM public.groups g
  WHERE g.linked_pickleball_group_id = NEW.group_id
    AND g.deleted_at IS NULL
    AND g.archived_at IS NULL
    AND target.group_id = g.id
    AND target.profile_id = NEW.profile_id;

  INSERT INTO public.members (
    group_id,
    profile_id,
    role,
    member_type,
    expense_active,
    is_active
  )
  SELECT
    g.id,
    NEW.profile_id,
    'member',
    'fixed',
    true,
    true
  FROM public.groups g
  WHERE g.linked_pickleball_group_id = NEW.group_id
    AND g.deleted_at IS NULL
    AND g.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.members existing
      WHERE existing.group_id = g.id
        AND existing.profile_id = NEW.profile_id
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_sync_linked_expense_membership ON public.members;
CREATE TRIGGER members_sync_linked_expense_membership
  AFTER INSERT OR UPDATE OF profile_id, is_active ON public.members
  FOR EACH ROW
  WHEN (NEW.profile_id IS NOT NULL AND NEW.is_active IS DISTINCT FROM false)
  EXECUTE FUNCTION public.sync_linked_expense_membership();

UPDATE public.members target
SET
  is_active = true,
  expense_active = true,
  left_at = NULL
FROM public.groups g
JOIN public.members source
  ON source.group_id = g.linked_pickleball_group_id
  AND source.is_active IS DISTINCT FROM false
WHERE g.deleted_at IS NULL
  AND g.archived_at IS NULL
  AND target.group_id = g.id
  AND target.profile_id = source.profile_id;

INSERT INTO public.members (
  group_id,
  profile_id,
  role,
  member_type,
  expense_active,
  is_active
)
SELECT DISTINCT
  g.id,
  source.profile_id,
  'member',
  'fixed',
  true,
  true
FROM public.groups g
JOIN public.members source
  ON source.group_id = g.linked_pickleball_group_id
  AND source.is_active IS DISTINCT FROM false
WHERE g.deleted_at IS NULL
  AND g.archived_at IS NULL
  AND source.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.members existing
    WHERE existing.group_id = g.id
      AND existing.profile_id = source.profile_id
  );
