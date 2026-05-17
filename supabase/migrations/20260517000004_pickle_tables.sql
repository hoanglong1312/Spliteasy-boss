-- ─── PICKLE_CONFIGS (Cấu hình CLB Pickleball) ────────────────────────────────
CREATE TABLE pickle_configs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              uuid UNIQUE NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  monthly_court_fee     numeric NOT NULL DEFAULT 0 CHECK (monthly_court_fee >= 0),
  guest_fee_per_session numeric NOT NULL DEFAULT 0 CHECK (guest_fee_per_session >= 0),
  billing_day           int NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TRIGGER pickle_configs_updated_at
  BEFORE UPDATE ON pickle_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PICKLE_SESSIONS (Buổi chơi — gộp sắp tới + đã chơi) ────────────────────
CREATE TABLE pickle_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','completed','cancelled')),
  session_date          date NOT NULL,
  start_time            time,
  court                 text,
  notes                 text,
  created_by_member_id  uuid REFERENCES members(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TRIGGER pickle_sessions_updated_at
  BEFORE UPDATE ON pickle_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Thêm FK từ expenses.pickle_session_id
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_pickle_session
  FOREIGN KEY (pickle_session_id) REFERENCES pickle_sessions(id) ON DELETE SET NULL;

-- ─── PICKLE_ATTENDEES (Ai đến / đăng ký RSVP buổi chơi) ──────────────────────
CREATE TABLE pickle_attendees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES pickle_sessions(id) ON DELETE CASCADE,
  member_id     uuid REFERENCES members(id),   -- NULL nếu là khách ngoài
  guest_name    text,                           -- tên khách nếu không phải member
  attendee_type text NOT NULL CHECK (attendee_type IN ('member','guest')),
  rsvp_status   text CHECK (rsvp_status IN ('going','not_going','maybe','pending'))
                DEFAULT 'pending',
  attended      boolean,                        -- thực tế có đến không

  UNIQUE (session_id, member_id),

  -- member_id bắt buộc khi type=member; guest_name bắt buộc khi type=guest
  CONSTRAINT chk_attendee_identity CHECK (
    (attendee_type = 'member' AND member_id IS NOT NULL)
    OR
    (attendee_type = 'guest' AND guest_name IS NOT NULL)
  )
);
