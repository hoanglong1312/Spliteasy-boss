-- Tra cứu nhóm và thành viên (Group & Member Lookups)
CREATE INDEX idx_groups_invite_code ON groups (invite_code);
CREATE INDEX idx_members_group_id ON members (group_id);
CREATE INDEX idx_members_group_role ON members (group_id, role);
CREATE INDEX idx_members_group_active ON members (group_id, is_active);
CREATE INDEX idx_member_tokens_hash ON member_tokens (token_hash);
CREATE UNIQUE INDEX idx_member_tokens_active ON member_tokens (member_id)
  WHERE revoked_at IS NULL;  -- chỉ 1 token active mỗi member

-- Chi tiêu (Expense Lookups)
CREATE INDEX idx_expenses_group_date ON expenses (group_id, expense_date DESC);
CREATE INDEX idx_expenses_group_status ON expenses (group_id, status, expense_date DESC);
CREATE INDEX idx_expenses_submitted_by ON expenses (group_id, submitted_by_member_id);
CREATE INDEX idx_expenses_paid_by ON expenses (group_id, paid_by_member_id);
CREATE INDEX idx_expenses_pickle_session ON expenses (pickle_session_id)
  WHERE pickle_session_id IS NOT NULL;
CREATE INDEX idx_expenses_pending ON expenses (group_id, created_at DESC)
  WHERE status = 'pending';  -- partial index: chỉ index expense đang chờ duyệt

-- Participants & Disputes
CREATE INDEX idx_expense_participants_member ON expense_participants (member_id);
CREATE INDEX idx_expense_disputes_expense ON expense_disputes (expense_id);
CREATE INDEX idx_expense_disputes_open ON expense_disputes (expense_id)
  WHERE status = 'open';

-- Thanh toán (Settlements)
CREATE INDEX idx_settlements_group_date ON settlements (group_id, settlement_date DESC);
CREATE INDEX idx_settlements_from ON settlements (from_member_id);
CREATE INDEX idx_settlements_to ON settlements (to_member_id);

-- Thông báo (Notifications)
CREATE INDEX idx_notifications_member_unread ON notifications (member_id, created_at DESC)
  WHERE is_read = false;
CREATE INDEX idx_notifications_member ON notifications (member_id, created_at DESC);

-- Pickleball
CREATE INDEX idx_pickle_sessions_group_date ON pickle_sessions (group_id, session_date DESC);
CREATE INDEX idx_pickle_sessions_status ON pickle_sessions (group_id, status, session_date);
CREATE INDEX idx_pickle_attendees_session ON pickle_attendees (session_id);
CREATE INDEX idx_pickle_attendees_member ON pickle_attendees (member_id)
  WHERE member_id IS NOT NULL;

-- Audit logs
CREATE INDEX idx_audit_logs_group ON audit_logs (group_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
