-- ─── Bật pgcrypto extension (cần cho hàm digest/SHA-256) ─────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Helper Functions ─────────────────────────────────────────────────────────

-- Lấy member_id từ token trong request header
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS uuid AS $$
DECLARE
  raw_token text;
  hashed    text;
  mid       uuid;
BEGIN
  -- Token được gửi qua header: x-member-token: <token>
  raw_token := current_setting('request.headers', true)::json->>'x-member-token';
  IF raw_token IS NULL THEN RETURN NULL; END IF;

  -- Hash token bằng SHA-256 để so sánh với token_hash trong DB
  hashed := encode(digest(raw_token, 'sha256'), 'hex');

  SELECT mt.member_id INTO mid
  FROM member_tokens mt
  WHERE mt.token_hash = hashed AND mt.revoked_at IS NULL;

  -- Cập nhật last_used_at
  IF mid IS NOT NULL THEN
    UPDATE member_tokens SET last_used_at = now()
    WHERE token_hash = hashed;
  END IF;

  RETURN mid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lấy role của member hiện tại trong một group
CREATE OR REPLACE FUNCTION get_member_role(p_group_id uuid)
RETURNS text AS $$
  SELECT role FROM members
  WHERE id = get_current_member_id()
    AND group_id = p_group_id
    AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Kiểm tra có phải thủ quỹ không
CREATE OR REPLACE FUNCTION is_treasurer(p_group_id uuid)
RETURNS boolean AS $$
  SELECT get_member_role(p_group_id) = 'treasurer';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Bật RLS trên tất cả bảng ────────────────────────────────────────────────
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickle_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickle_attendees ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies: GROUPS ────────────────────────────────────────────────────
CREATE POLICY groups_select ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

CREATE POLICY groups_update ON groups FOR UPDATE
  USING (is_treasurer(id));

-- ─── RLS Policies: MEMBERS ───────────────────────────────────────────────────
CREATE POLICY members_select ON members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

CREATE POLICY members_update ON members FOR UPDATE
  USING (is_treasurer(group_id));

CREATE POLICY members_insert ON members FOR INSERT
  WITH CHECK (is_treasurer(group_id));

-- ─── RLS Policies: MEMBER_TOKENS ─────────────────────────────────────────────
CREATE POLICY tokens_select ON member_tokens FOR SELECT
  USING (member_id = get_current_member_id());

-- ─── RLS Policies: EXPENSES ──────────────────────────────────────────────────
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (
    get_member_role(group_id) IN ('treasurer','member')
    AND submitted_by_member_id = get_current_member_id()
  );

CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (
    is_treasurer(group_id)
    OR (
      submitted_by_member_id = get_current_member_id()
      AND status = 'pending'
    )
  );

-- ─── RLS Policies: EXPENSE_PARTICIPANTS ──────────────────────────────────────
CREATE POLICY exp_participants_select ON expense_participants FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE group_id IN (
        SELECT group_id FROM members
        WHERE id = get_current_member_id() AND is_active = true
      )
    )
  );

CREATE POLICY exp_participants_insert ON expense_participants FOR INSERT
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses
      WHERE submitted_by_member_id = get_current_member_id()
         OR is_treasurer(group_id)
    )
  );

-- ─── RLS Policies: EXPENSE_DISPUTES ──────────────────────────────────────────
CREATE POLICY disputes_select ON expense_disputes FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (
        SELECT group_id FROM members
        WHERE id = get_current_member_id() AND is_active = true
      )
    )
  );

CREATE POLICY disputes_insert ON expense_disputes FOR INSERT
  WITH CHECK (
    raised_by = get_current_member_id()
    AND get_member_role(
      (SELECT group_id FROM expenses WHERE id = expense_id)
    ) IN ('treasurer','member')
  );

CREATE POLICY disputes_update ON expense_disputes FOR UPDATE
  USING (
    is_treasurer(
      (SELECT group_id FROM expenses WHERE id = expense_id)
    )
  );

-- ─── RLS Policies: SETTLEMENTS ───────────────────────────────────────────────
CREATE POLICY settlements_select ON settlements FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

CREATE POLICY settlements_insert ON settlements FOR INSERT
  WITH CHECK (is_treasurer(group_id));

-- ─── RLS Policies: NOTIFICATIONS ─────────────────────────────────────────────
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (member_id = get_current_member_id());

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (member_id = get_current_member_id());

-- ─── RLS Policies: PICKLEBALL ────────────────────────────────────────────────
CREATE POLICY pickle_configs_select ON pickle_configs FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

CREATE POLICY pickle_configs_update ON pickle_configs FOR UPDATE
  USING (is_treasurer(group_id));

CREATE POLICY pickle_sessions_select ON pickle_sessions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

CREATE POLICY pickle_sessions_insert ON pickle_sessions FOR INSERT
  WITH CHECK (is_treasurer(group_id));

CREATE POLICY pickle_sessions_update ON pickle_sessions FOR UPDATE
  USING (is_treasurer(group_id));

CREATE POLICY pickle_attendees_select ON pickle_attendees FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM pickle_sessions WHERE group_id IN (
        SELECT group_id FROM members
        WHERE id = get_current_member_id() AND is_active = true
      )
    )
  );

CREATE POLICY pickle_attendees_insert ON pickle_attendees FOR INSERT
  WITH CHECK (
    member_id = get_current_member_id()
    OR is_treasurer(
      (SELECT group_id FROM pickle_sessions WHERE id = session_id)
    )
  );

CREATE POLICY pickle_attendees_update ON pickle_attendees FOR UPDATE
  USING (
    member_id = get_current_member_id()
    OR is_treasurer(
      (SELECT group_id FROM pickle_sessions WHERE id = session_id)
    )
  );
