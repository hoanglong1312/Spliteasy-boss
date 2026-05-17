-- Fix: infinite recursion trong members_select policy
-- Vấn đề: policy trên bảng members lại query chính bảng members → vòng lặp vô hạn
-- Giải pháp: tạo helper function SECURITY DEFINER để bypass RLS khi lấy group_ids

-- Helper: lấy danh sách group_id mà member hiện tại thuộc về (bypass RLS)
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF uuid AS $$
  SELECT group_id FROM members
  WHERE id = get_current_member_id() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Xóa policy cũ bị lỗi recursion
DROP POLICY IF EXISTS members_select ON members;
DROP POLICY IF EXISTS groups_select ON groups;
DROP POLICY IF EXISTS expenses_select ON expenses;
DROP POLICY IF EXISTS exp_participants_select ON expense_participants;
DROP POLICY IF EXISTS disputes_select ON expense_disputes;
DROP POLICY IF EXISTS settlements_select ON settlements;
DROP POLICY IF EXISTS pickle_configs_select ON pickle_configs;
DROP POLICY IF EXISTS pickle_sessions_select ON pickle_sessions;
DROP POLICY IF EXISTS pickle_attendees_select ON pickle_attendees;

-- Tạo lại tất cả SELECT policies dùng helper function thay vì subquery trực tiếp
CREATE POLICY members_select ON members FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY groups_select ON groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY exp_participants_select ON expense_participants FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (SELECT get_my_group_ids())
    )
  );

CREATE POLICY disputes_select ON expense_disputes FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE group_id IN (SELECT get_my_group_ids())
    )
  );

CREATE POLICY settlements_select ON settlements FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY pickle_configs_select ON pickle_configs FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY pickle_sessions_select ON pickle_sessions FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY pickle_attendees_select ON pickle_attendees FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM pickle_sessions WHERE group_id IN (SELECT get_my_group_ids())
    )
  );
