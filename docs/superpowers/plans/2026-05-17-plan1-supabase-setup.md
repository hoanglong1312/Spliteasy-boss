# Supabase Setup & Database Schema — Implementation Plan (Sub-plan 1/5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo toàn bộ cấu trúc database trên Supabase — bảng, indexes, RLS policies — sẵn sàng để frontend kết nối vào.

**Architecture:** Supabase project mới với PostgreSQL. Toàn bộ schema được viết dưới dạng SQL migration files trong `supabase/migrations/`. RLS (Row Level Security - Bảo mật cấp dòng) bật trên tất cả bảng, dùng helper function `get_member_id_from_token()` để xác định quyền. Không có backend riêng — frontend sẽ gọi thẳng Supabase.

**Tech Stack:** Supabase CLI, PostgreSQL 15, SQL migrations, Supabase Dashboard để kiểm tra

---

## Cấu trúc file sẽ tạo mới

```
supabase/
├── config.toml                          ← cấu hình Supabase CLI
└── migrations/
    ├── 20260517000001_core_tables.sql   ← bảng groups, members, member_tokens
    ├── 20260517000002_expense_tables.sql ← bảng expenses, expense_participants, expense_disputes
    ├── 20260517000003_settlement_tables.sql ← bảng settlements, notifications, audit_logs
    ├── 20260517000004_pickle_tables.sql ← bảng pickle_configs, pickle_sessions, pickle_attendees
    ├── 20260517000005_indexes.sql       ← tất cả indexes
    └── 20260517000006_rls_policies.sql  ← tất cả RLS policies
```

---

## Task 1: Cài đặt Supabase CLI và tạo project

**Files:**
- Create: `supabase/config.toml` (tự động tạo bởi CLI)

- [ ] **Bước 1.1: Cài Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase --version
```
Kết quả mong đợi: `supabase version X.X.X`

- [ ] **Bước 1.2: Tạo tài khoản Supabase**

Mở trình duyệt, vào https://supabase.com → Sign up (đăng ký) bằng GitHub → tạo project mới:
- Project name: `spliteasy-boss`
- Database password: lưu lại cẩn thận
- Region: Southeast Asia (Singapore)

- [ ] **Bước 1.3: Lấy thông tin kết nối**

Vào Supabase Dashboard → Settings → API:
- Copy `Project URL` (dạng `https://xxxx.supabase.co`)
- Copy `anon public key`
- Copy `service_role key` (giữ bí mật tuyệt đối)

- [ ] **Bước 1.4: Khởi tạo Supabase CLI trong project**

```bash
cd /Users/giinlow./Spliteasy-boss
supabase init
```
Kết quả: tạo thư mục `supabase/` với file `config.toml`

- [ ] **Bước 1.5: Tạo file .env**

```bash
cat > .env << 'EOF'
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
EOF
```

```bash
echo ".env" >> .gitignore
```

- [ ] **Bước 1.6: Commit khung project**

```bash
git add supabase/ .gitignore
git commit -m "chore: init supabase project structure"
```

---

## Task 2: Tạo bảng cốt lõi — Groups, Members, Tokens

**Files:**
- Create: `supabase/migrations/20260517000001_core_tables.sql`

- [ ] **Bước 2.1: Viết migration cho core tables**

Tạo file `supabase/migrations/20260517000001_core_tables.sql`:

```sql
-- ─── GROUPS (Nhóm chi tiêu) ───────────────────────────────────────────────────
CREATE TABLE groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  emoji           text,
  color           text DEFAULT '#574EFA',
  invite_code     text UNIQUE NOT NULL,
  invite_code_revoked_at timestamptz,
  created_by      uuid,          -- sẽ add FK sau khi tạo bảng members
  deleted_at      timestamptz,   -- soft delete
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── MEMBERS (Thành viên) ─────────────────────────────────────────────────────
CREATE TABLE members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name            text NOT NULL,
  short           text,          -- tên ngắn hiển thị
  initials        text,          -- chữ viết tắt tối đa 2 ký tự
  color           text DEFAULT '#574EFA',
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('treasurer','member','viewer')),
  is_active       boolean DEFAULT true,  -- false = đã rời nhóm (soft delete)
  display_order   int DEFAULT 0,
  joined_at       timestamptz DEFAULT now(),
  left_at         timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Thêm FK từ groups.created_by về members
ALTER TABLE groups
  ADD CONSTRAINT fk_groups_created_by
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- ─── MEMBER_TOKENS (Token cá nhân — lưu hash, không lưu plaintext) ───────────
CREATE TABLE member_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash    text UNIQUE NOT NULL,  -- SHA-256 của token gốc
  created_at    timestamptz DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz            -- thu hồi token
);

-- ─── Trigger tự động cập nhật updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Bước 2.2: Chạy migration lên Supabase**

Vào Supabase Dashboard → SQL Editor → paste toàn bộ nội dung file trên → Run.

Kiểm tra kết quả:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Kết quả mong đợi: thấy `groups`, `members`, `member_tokens`

- [ ] **Bước 2.3: Commit**

```bash
git add supabase/migrations/20260517000001_core_tables.sql
git commit -m "feat(db): add core tables - groups, members, member_tokens"
```

---

## Task 3: Tạo bảng chi tiêu — Expenses, Participants, Disputes

**Files:**
- Create: `supabase/migrations/20260517000002_expense_tables.sql`

- [ ] **Bước 3.1: Viết migration**

Tạo file `supabase/migrations/20260517000002_expense_tables.sql`:

```sql
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
```

- [ ] **Bước 3.2: Chạy migration**

Supabase Dashboard → SQL Editor → paste → Run.

Kiểm tra:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'expense%'
ORDER BY table_name;
```
Kết quả mong đợi: `expense_disputes`, `expense_participants`, `expenses`

- [ ] **Bước 3.3: Kiểm tra constraints hoạt động đúng**

```sql
-- Test: thêm expense approved nhưng thiếu reviewed_by → phải báo lỗi
INSERT INTO groups (id, name, invite_code) VALUES ('00000000-0000-0000-0000-000000000001', 'Test', 'TEST-0001');
INSERT INTO members (id, group_id, name, role) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'An', 'treasurer');

INSERT INTO expenses (group_id, title, amount, paid_by_member_id, submitted_by_member_id, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test', 100000,
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000002',
        'approved');
-- Kết quả mong đợi: ERROR - vi phạm chk_review_fields

-- Dọn dẹp test data
DELETE FROM groups WHERE id = '00000000-0000-0000-0000-000000000001';
```

- [ ] **Bước 3.4: Commit**

```bash
git add supabase/migrations/20260517000002_expense_tables.sql
git commit -m "feat(db): add expense tables with approval workflow constraints"
```

---

## Task 4: Tạo bảng thanh toán, thông báo, nhật ký

**Files:**
- Create: `supabase/migrations/20260517000003_settlement_tables.sql`

- [ ] **Bước 4.1: Viết migration**

Tạo file `supabase/migrations/20260517000003_settlement_tables.sql`:

```sql
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
```

- [ ] **Bước 4.2: Chạy migration và kiểm tra**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Kết quả mong đợi: thấy đủ `audit_logs`, `notifications`, `settlements`

- [ ] **Bước 4.3: Commit**

```bash
git add supabase/migrations/20260517000003_settlement_tables.sql
git commit -m "feat(db): add settlements, notifications, audit_logs tables"
```

---

## Task 5: Tạo bảng Pickleball

**Files:**
- Create: `supabase/migrations/20260517000004_pickle_tables.sql`

- [ ] **Bước 5.1: Viết migration**

Tạo file `supabase/migrations/20260517000004_pickle_tables.sql`:

```sql
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
```

- [ ] **Bước 5.2: Chạy migration và kiểm tra**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'pickle%'
ORDER BY table_name;
```
Kết quả mong đợi: `pickle_attendees`, `pickle_configs`, `pickle_sessions`

- [ ] **Bước 5.3: Commit**

```bash
git add supabase/migrations/20260517000004_pickle_tables.sql
git commit -m "feat(db): add pickleball tables"
```

---

## Task 6: Tạo Indexes

**Files:**
- Create: `supabase/migrations/20260517000005_indexes.sql`

- [ ] **Bước 6.1: Viết migration indexes**

Tạo file `supabase/migrations/20260517000005_indexes.sql`:

```sql
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
```

- [ ] **Bước 6.2: Chạy migration**

```sql
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```
Kết quả mong đợi: thấy tất cả indexes đã tạo

- [ ] **Bước 6.3: Commit**

```bash
git add supabase/migrations/20260517000005_indexes.sql
git commit -m "feat(db): add performance indexes"
```

---

## Task 7: Tạo RLS Policies (Phân quyền cấp dòng dữ liệu)

**Files:**
- Create: `supabase/migrations/20260517000006_rls_policies.sql`

- [ ] **Bước 7.1: Viết helper function xác định quyền**

Tạo file `supabase/migrations/20260517000006_rls_policies.sql`:

```sql
-- ─── Helper Functions ─────────────────────────────────────────────────────────

-- Lấy member_id từ token trong request header
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS uuid AS $$
DECLARE
  raw_token text;
  hashed    text;
  mid       uuid;
BEGIN
  -- Token được gửi qua header: Authorization: Bearer <token>
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
-- Thành viên chỉ xem được nhóm mình thuộc về
CREATE POLICY groups_select ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

-- Chỉ thủ quỹ mới sửa được nhóm
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
-- Chỉ được xem token của chính mình
CREATE POLICY tokens_select ON member_tokens FOR SELECT
  USING (member_id = get_current_member_id());

-- ─── RLS Policies: EXPENSES ──────────────────────────────────────────────────
-- Tất cả thành viên active xem được expense approved
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE id = get_current_member_id() AND is_active = true
    )
  );

-- Thành viên tạo expense mới (status=pending tự động)
CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (
    get_member_role(group_id) IN ('treasurer','member')
    AND submitted_by_member_id = get_current_member_id()
  );

-- Thủ quỹ sửa tất cả expense; member chỉ sửa expense pending của mình
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

-- Member và treasurer đều có thể mở dispute
CREATE POLICY disputes_insert ON expense_disputes FOR INSERT
  WITH CHECK (
    raised_by = get_current_member_id()
    AND get_member_role(
      (SELECT group_id FROM expenses WHERE id = expense_id)
    ) IN ('treasurer','member')
  );

-- Chỉ thủ quỹ mới resolve/dismiss
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

-- Chỉ thủ quỹ tạo settlement
CREATE POLICY settlements_insert ON settlements FOR INSERT
  WITH CHECK (is_treasurer(group_id));

-- ─── RLS Policies: NOTIFICATIONS ─────────────────────────────────────────────
-- Chỉ xem thông báo của chính mình
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

-- Member và treasurer đều có thể RSVP
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
```

- [ ] **Bước 7.2: Chạy migration**

Supabase Dashboard → SQL Editor → paste → Run.

- [ ] **Bước 7.3: Kiểm tra RLS hoạt động**

```sql
-- Test helper function với token giả → phải trả về NULL
SELECT get_current_member_id();
-- Kết quả mong đợi: NULL (vì chưa có token trong header)

-- Kiểm tra RLS đã bật
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
-- Kết quả mong đợi: rowsecurity = true cho tất cả bảng
```

- [ ] **Bước 7.4: Commit**

```bash
git add supabase/migrations/20260517000006_rls_policies.sql
git commit -m "feat(db): add RLS policies and helper functions for token-based auth"
```

---

## Task 8: Seed data mẫu để test

**Files:**
- Create: `supabase/migrations/20260517000007_seed_test_data.sql`

- [ ] **Bước 8.1: Tạo dữ liệu mẫu**

Tạo file `supabase/migrations/20260517000007_seed_test_data.sql`:

```sql
-- ⚠️ CHỈ CHẠY TRÊN MÔI TRƯỜNG TEST — không chạy trên production

-- Tạo nhóm mẫu
INSERT INTO groups (id, name, emoji, color, invite_code)
VALUES ('11111111-1111-1111-1111-111111111111', 'Nhóm Pickleball Quận 7', '🏸', '#574EFA', 'PICKLE-TEST');

-- Tạo thành viên: 1 thủ quỹ + 2 thành viên thường
INSERT INTO members (id, group_id, name, short, initials, color, role) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Nguyễn An', 'An', 'NA', '#574EFA', 'treasurer'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Trần Bình', 'Bình', 'TB', '#10B981', 'member'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Lê Chi', 'Chi', 'LC', '#F59E0B', 'member');

-- Token mẫu cho An (treasurer)
-- Token gốc: "test-token-an-treasurer"
-- SHA-256 hash của token trên:
INSERT INTO member_tokens (member_id, token_hash)
VALUES ('22222222-2222-2222-2222-222222222222',
        encode(digest('test-token-an-treasurer', 'sha256'), 'hex'));

-- Cập nhật created_by của nhóm
UPDATE groups SET created_by = '22222222-2222-2222-2222-222222222222'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Tạo cấu hình pickleball
INSERT INTO pickle_configs (group_id, monthly_court_fee, guest_fee_per_session)
VALUES ('11111111-1111-1111-1111-111111111111', 2000000, 50000);
```

- [ ] **Bước 8.2: Chạy seed và xác nhận**

```sql
SELECT g.name, m.name, m.role
FROM groups g JOIN members m ON m.group_id = g.id
WHERE g.id = '11111111-1111-1111-1111-111111111111';
```
Kết quả mong đợi:
```
Nhóm Pickleball Quận 7 | Nguyễn An  | treasurer
Nhóm Pickleball Quận 7 | Trần Bình  | member
Nhóm Pickleball Quận 7 | Lê Chi     | member
```

- [ ] **Bước 8.3: Commit**

```bash
git add supabase/migrations/20260517000007_seed_test_data.sql
git commit -m "chore(db): add seed data for testing"
```

---

## Kiểm tra tổng thể (Final Verification)

- [ ] **Chạy lệnh kiểm tra cuối**

```sql
-- Đếm số bảng
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Kết quả mong đợi: 12

-- Đếm số indexes
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- Kết quả mong đợi: ≥ 25

-- Kiểm tra tất cả bảng có RLS
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Kết quả mong đợi: 0 rows (tất cả đều có RLS)
```

- [ ] **Commit tổng kết**

```bash
git tag v0.1-db-schema
git push origin main --tags
```

---

## Bước tiếp theo — Sub-plan 2

Sau khi hoàn thành plan này, chuyển sang:
**`2026-05-17-plan2-auth-access.md`** — Xây dựng luồng invite code, sinh/xác thực personal token qua Edge Function, kết nối frontend.
