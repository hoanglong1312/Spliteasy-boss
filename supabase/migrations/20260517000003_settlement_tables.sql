-- ─── SETTLEMENTS (Thanh toán bù trừ) ─────────────────────────────────────────
CREATE TABLE settlements (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member_id        uuid NOT NULL REFERENCES members(id),
  to_member_id          uuid NOT NULL REFERENCES members(id),
  amount                numeric NOT NULL CHECK (amount > 0),
  method                text,   -- cash, bank_transfer, momo, ...
  notes                 text,
  created_by_member_id  uuid REFERENCES members(id),
  settlement_date       date NOT NULL DEFAULT CURRENT_DATE,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),

  CHECK (from_member_id <> to_member_id)
);

CREATE TRIGGER settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── NOTIFICATIONS (Thông báo trong app) ─────────────────────────────────────
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_id        uuid REFERENCES groups(id),
  actor_member_id uuid REFERENCES members(id),
  type            text NOT NULL CHECK (type IN (
                    'expense_submitted',
                    'expense_approved',
                    'expense_declined',
                    'settlement_created',
                    'dispute_opened',
                    'dispute_resolved',
                    'dispute_dismissed'
                  )),
  ref_type        text CHECK (ref_type IN ('expense','settlement','dispute')),
  ref_id          uuid,
  message         text NOT NULL,
  is_read         boolean DEFAULT false,
  read_at         timestamptz,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

-- ─── AUDIT_LOGS (Nhật ký thay đổi — ai sửa gì lúc nào) ──────────────────────
CREATE TABLE audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id),
  actor_member_id uuid REFERENCES members(id),
  action          text NOT NULL CHECK (action IN (
                    'create','update','delete',
                    'approve','decline',
                    'resolve','dismiss',
                    'settle','join','leave'
                  )),
  entity_type     text NOT NULL CHECK (entity_type IN (
                    'expense','settlement','dispute',
                    'member','group','pickle_session'
                  )),
  entity_id       uuid NOT NULL,
  old_data        jsonb,
  new_data        jsonb,
  created_at      timestamptz DEFAULT now()
);
