-- ─── EXPENSES (Chi tiêu — gộp general + pickleball + external) ───────────────
CREATE TABLE expenses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  module                  text NOT NULL DEFAULT 'general'
                          CHECK (module IN ('general','pickleball','external')),
  pickle_session_id       uuid,  -- FK sẽ thêm sau khi tạo bảng pickle_sessions

  title                   text NOT NULL,
  amount                  numeric NOT NULL CHECK (amount > 0),
  expense_date            date NOT NULL DEFAULT CURRENT_DATE,
  category                text DEFAULT 'other',
  split_method            text NOT NULL DEFAULT 'equal'
                          CHECK (split_method IN ('equal','custom')),
  notes                   text,

  paid_by_member_id       uuid NOT NULL REFERENCES members(id),
  submitted_by_member_id  uuid NOT NULL REFERENCES members(id),

  -- Luồng duyệt (Approval Workflow)
  status                  text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','declined')),
  reviewed_by_member_id   uuid REFERENCES members(id),
  reviewed_at             timestamptz,
  decline_reason          text,

  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),

  -- Ràng buộc: khi approved/declined phải có reviewed_by
  CONSTRAINT chk_review_fields CHECK (
    (status = 'pending' AND reviewed_by_member_id IS NULL)
    OR
    (status IN ('approved','declined') AND reviewed_by_member_id IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  -- Ràng buộc: khi declined phải có lý do
  CONSTRAINT chk_decline_reason CHECK (
    status != 'declined' OR decline_reason IS NOT NULL
  )
);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── EXPENSE_PARTICIPANTS (Ai tham gia chi tiêu) ──────────────────────────────
CREATE TABLE expense_participants (
  expense_id    uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES members(id),
  share_amount  numeric NOT NULL CHECK (share_amount >= 0),
  share_type    text NOT NULL DEFAULT 'fixed'
                CHECK (share_type IN ('fixed','percent')),
  PRIMARY KEY (expense_id, member_id)
);

-- ─── EXPENSE_DISPUTES (Báo sai sót chi tiêu) ─────────────────────────────────
CREATE TABLE expense_disputes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  raised_by       uuid NOT NULL REFERENCES members(id),
  note            text NOT NULL,
  status          text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','resolved','dismissed')),
  resolved_by     uuid REFERENCES members(id),
  resolved_note   text,
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now(),

  CONSTRAINT chk_dispute_resolved CHECK (
    status = 'open'
    OR (status IN ('resolved','dismissed') AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  )
);
