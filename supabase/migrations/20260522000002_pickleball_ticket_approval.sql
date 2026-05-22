-- Ticket requests from members are stored as pending until the treasurer approves them.
ALTER TABLE pickleball_tickets
  DROP CONSTRAINT IF EXISTS pickleball_tickets_status_check;

UPDATE pickleball_tickets
SET status = 'unpaid'
WHERE status = 'paid';

ALTER TABLE pickleball_tickets
  ADD CONSTRAINT pickleball_tickets_status_check
  CHECK (status = ANY (ARRAY['unpaid', 'team_fund', 'pending_review']));

DROP POLICY IF EXISTS "group members can request tickets" ON pickleball_tickets;

CREATE POLICY "group members can request tickets"
  ON pickleball_tickets FOR INSERT
  WITH CHECK (
    group_id IN (SELECT get_my_group_ids())
    AND created_by IN (SELECT get_my_member_ids())
    AND status = 'pending_review'
  );
