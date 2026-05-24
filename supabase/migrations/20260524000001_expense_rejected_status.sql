DO $$
DECLARE
  row record;
BEGIN
  FOR row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'expenses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE expenses DROP CONSTRAINT %I', row.conname);
  END LOOP;
END $$;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('pending', 'approved', 'declined', 'rejected'));

ALTER TABLE expenses
  ADD CONSTRAINT expenses_review_state_check
  CHECK (
    (status = 'pending' AND reviewed_by_member_id IS NULL)
    OR (
      status IN ('approved', 'declined', 'rejected')
      AND reviewed_by_member_id IS NOT NULL
      AND reviewed_at IS NOT NULL
    )
  );
