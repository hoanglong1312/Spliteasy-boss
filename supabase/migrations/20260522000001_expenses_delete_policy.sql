-- Allow treasurers to remove approved pickleball water expenses when a session cost is reset to 0.
DROP POLICY IF EXISTS expenses_delete ON expenses;

CREATE POLICY expenses_delete
  ON expenses FOR DELETE
  USING (is_treasurer(group_id));
