# Thiết kế Chuyển đổi Database (Database Migration Design)
# SpliteasyBoss Ver 2.0

**Ngày:** 2026-05-17
**Trạng thái (Status):** Đã duyệt
**Người duyệt:** Chủ dự án (Product Owner)

---

## 1. Bối cảnh & Mục tiêu (Context & Goals)

### Vấn đề hiện tại
App đang lưu toàn bộ dữ liệu vào `localStorage` (bộ nhớ trình duyệt) — dữ liệu chỉ tồn tại trên một thiết bị, mất khi xóa cache, không chia sẻ được giữa nhiều người.

### Mục tiêu
Chuyển sang **Supabase** (PostgreSQL + Auth + Realtime) để:
- Nhiều người dùng cùng xem và tương tác
- Dữ liệu lưu trữ an toàn, không mất khi xóa cache
- Phân quyền rõ ràng giữa thủ quỹ và thành viên
- Luồng duyệt chi tiêu (approval workflow)

---

## 2. Mô hình người dùng (User Model)

### Vai trò (Roles)
| Vai trò | Quyền |
|---------|-------|
| `treasurer` (thủ quỹ) | Thêm/sửa/xóa chi tiêu, duyệt/từ chối đề xuất, quản lý thành viên, tạo thanh toán bù trừ |
| `member` (thành viên) | Xem dữ liệu nhóm, đề xuất chi tiêu mới, xác nhận tham gia buổi chơi |
| `viewer` (người xem) | Chỉ xem dữ liệu đã duyệt, không thêm/sửa gì |

### Cách vào app — không cần đăng ký tài khoản
- **Bước 1:** Thủ quỹ tạo nhóm → nhận `invite_code` (mã mời, ví dụ: `PICKLE-X7K2`)
- **Bước 2:** Chia sẻ mã cho thành viên → họ nhập mã → được thêm vào nhóm với role `member`
- **Bước 3:** Mỗi thành viên nhận một `personal_token` (token cá nhân) riêng → dùng để vào link dashboard cá nhân

### 3 loại giao diện (Views)
```
1. Group Dashboard (Bảng nhóm chung)
   → Tất cả thành viên cùng xem
   → Chi tiêu nhóm, ai nợ ai, lịch pickleball

2. Personal Dashboard (Dashboard cá nhân)
   → Mỗi người có link riêng
   → Số dư cá nhân, chi phí pickleball của mình

3. Treasurer View (Giao diện thủ quỹ)
   → Duyệt chi tiêu chờ xử lý
   → Quản lý thành viên, cấu hình nhóm
```

---

## 3. Kiến trúc kỹ thuật (Technical Architecture)

```
Browser (React Web App)
        │
        │ HTTPS / Supabase JS SDK
        ▼
Supabase
├── PostgreSQL Database  ← lưu toàn bộ dữ liệu
├── Row Level Security   ← phân quyền từng dòng dữ liệu
├── Realtime             ← đồng bộ tức thì khi có thay đổi
└── Edge Functions       ← xác thực token, logic nhạy cảm

Không có backend riêng — React gọi thẳng Supabase.
```

**Bảo mật token (Token Security):**
- `personal_token` không bao giờ lưu dạng text thường
- Chỉ lưu bản mã hóa `token_hash` (SHA-256)
- Xác thực token qua Edge Function, không query thẳng từ client
- `invite_code` đủ dài, random — không dễ đoán

---

## 4. Cấu trúc Database (Database Schema)

### 10 bảng chính

---

#### `groups` — Nhóm chi tiêu
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
name            text NOT NULL
emoji           text
color           text
invite_code     text UNIQUE NOT NULL     -- mã mời nhóm
invite_code_revoked_at  timestamptz      -- thu hồi mã cũ
created_by      uuid                     -- member_id thủ quỹ đầu tiên
created_at      timestamptz default now()
updated_at      timestamptz default now()
deleted_at      timestamptz              -- soft delete, không xóa thật
```

---

#### `members` — Thành viên
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
group_id        uuid NOT NULL REFERENCES groups(id)
name            text NOT NULL
short           text                     -- tên ngắn hiển thị
initials        text                     -- chữ viết tắt (tối đa 2 ký tự)
color           text                     -- màu avatar
role            text NOT NULL CHECK (role IN ('treasurer','member','viewer'))
is_active       boolean default true
display_order   int
joined_at       timestamptz default now()
left_at         timestamptz
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

---

#### `member_tokens` — Token cá nhân (tách riêng để bảo mật)
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
member_id       uuid NOT NULL REFERENCES members(id)
token_hash      text UNIQUE NOT NULL     -- SHA-256 của token gốc, không lưu token thường
created_at      timestamptz default now()
last_used_at    timestamptz
revoked_at      timestamptz              -- thu hồi token khi cần
```
> Token gốc chỉ hiển thị 1 lần duy nhất khi tạo, sau đó không thể xem lại.

---

#### `expenses` — Chi tiêu (gộp tất cả loại)
```sql
id                    uuid PRIMARY KEY default gen_random_uuid()
group_id              uuid NOT NULL REFERENCES groups(id)
module                text NOT NULL CHECK (module IN ('general','pickleball','external'))
                      -- general: chi tiêu nhóm thường
                      -- pickleball: chi phí trong buổi chơi
                      -- external: vé lẻ bên ngoài lịch cố định
pickle_session_id     uuid REFERENCES pickle_sessions(id)  -- chỉ dùng khi module='pickleball'

title                 text NOT NULL
amount                numeric NOT NULL CHECK (amount > 0)
expense_date          date NOT NULL
category              text                 -- food, transport, court, ball...
split_method          text default 'equal' -- equal: chia đều | custom: tùy chỉnh
notes                 text

paid_by_member_id     uuid NOT NULL REFERENCES members(id)
submitted_by_member_id uuid NOT NULL REFERENCES members(id)

-- Luồng duyệt (Approval Workflow)
status                text NOT NULL default 'pending'
                      CHECK (status IN ('pending','approved','declined'))
reviewed_by_member_id uuid REFERENCES members(id)
reviewed_at           timestamptz
decline_reason        text                 -- bắt buộc khi status='declined'

created_at            timestamptz default now()
updated_at            timestamptz default now()
```

**Ràng buộc nghiệp vụ (Business Constraints):**
- Khi `status = 'pending'`: `reviewed_by_member_id` phải là NULL
- Khi `status IN ('approved','declined')`: `reviewed_by_member_id` và `reviewed_at` bắt buộc có
- Thủ quỹ không được tự duyệt chi tiêu của chính mình (`reviewed_by ≠ submitted_by`) — tùy chọn theo quyết định nhóm

---

#### `expense_participants` — Ai tham gia chi tiêu
```sql
expense_id      uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE
member_id       uuid NOT NULL REFERENCES members(id)
share_amount    numeric NOT NULL CHECK (share_amount >= 0)
share_type      text default 'fixed'     -- fixed: số tiền cố định | percent: phần trăm
PRIMARY KEY (expense_id, member_id)
```
> Tổng `share_amount` phải bằng `expenses.amount` — kiểm tra qua trigger hoặc RPC khi approve.

---

#### `settlements` — Thanh toán bù trừ
```sql
id                    uuid PRIMARY KEY default gen_random_uuid()
group_id              uuid NOT NULL REFERENCES groups(id)
from_member_id        uuid NOT NULL REFERENCES members(id)  -- người trả
to_member_id          uuid NOT NULL REFERENCES members(id)  -- người nhận
amount                numeric NOT NULL CHECK (amount > 0)
method                text     -- cash, bank_transfer, momo, ...
notes                 text

status                text NOT NULL default 'pending'
                      CHECK (status IN ('pending','confirmed','cancelled'))
confirmed_by_member_id uuid REFERENCES members(id)
confirmed_at          timestamptz
created_by_member_id  uuid REFERENCES members(id)
settlement_date       date NOT NULL

created_at            timestamptz default now()
updated_at            timestamptz default now()

CHECK (from_member_id <> to_member_id)
```

---

#### `notifications` — Thông báo trong app
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
member_id       uuid NOT NULL REFERENCES members(id)   -- gửi cho ai
group_id        uuid REFERENCES groups(id)
actor_member_id uuid REFERENCES members(id)            -- ai gây ra thông báo
type            text NOT NULL
                -- expense_submitted | expense_approved | expense_declined
                -- settlement_created | settlement_confirmed
ref_type        text    -- 'expense' | 'settlement'
ref_id          uuid    -- id của expense/settlement liên quan
message         text NOT NULL
is_read         boolean default false
read_at         timestamptz
metadata        jsonb   -- dữ liệu bổ sung tùy type
created_at      timestamptz default now()
```

---

#### `audit_logs` — Nhật ký thay đổi (Audit Trail)
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
group_id        uuid REFERENCES groups(id)
actor_member_id uuid REFERENCES members(id)   -- ai thực hiện
action          text NOT NULL                  -- create | update | delete | approve | decline
entity_type     text NOT NULL                  -- expense | settlement | member | group
entity_id       uuid NOT NULL
old_data        jsonb    -- dữ liệu trước khi thay đổi
new_data        jsonb    -- dữ liệu sau khi thay đổi
created_at      timestamptz default now()
```

---

#### `pickle_configs` — Cấu hình CLB Pickleball
```sql
id                    uuid PRIMARY KEY default gen_random_uuid()
group_id              uuid UNIQUE NOT NULL REFERENCES groups(id)
monthly_court_fee     numeric default 0    -- phí sân tháng (VND)
guest_fee_per_session numeric default 0    -- phí khách mỗi buổi (VND)
billing_day           int default 1        -- ngày chốt sổ hàng tháng
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

---

#### `pickle_sessions` — Buổi chơi (gộp sắp tới + đã chơi)
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
group_id        uuid NOT NULL REFERENCES groups(id)
status          text NOT NULL CHECK (status IN ('scheduled','completed','cancelled'))
                -- scheduled: sắp tới | completed: đã diễn ra | cancelled: đã hủy
session_date    date NOT NULL
start_time      time
court           text
notes           text
created_by_member_id uuid REFERENCES members(id)
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

---

#### `pickle_attendees` — Ai đến / đăng ký buổi chơi
```sql
id              uuid PRIMARY KEY default gen_random_uuid()
session_id      uuid NOT NULL REFERENCES pickle_sessions(id) ON DELETE CASCADE
member_id       uuid REFERENCES members(id)    -- NULL nếu là khách ngoài
guest_name      text                           -- tên khách nếu không phải member
attendee_type   text NOT NULL CHECK (attendee_type IN ('member','guest'))
rsvp_status     text CHECK (rsvp_status IN ('going','not_going','maybe','pending'))
                -- dùng khi session status='scheduled'
attended        boolean                        -- thực tế có đến không (khi completed)
UNIQUE (session_id, member_id)                 -- mỗi member chỉ 1 dòng/buổi
```

---

## 5. Indexes cần thiết (Required Indexes)

```sql
-- Tra cứu nhanh (Fast Lookups)
CREATE INDEX ON groups (invite_code);
CREATE INDEX ON members (group_id);
CREATE INDEX ON members (group_id, role);
CREATE INDEX ON member_tokens (token_hash);

-- Chi tiêu (Expenses)
CREATE INDEX ON expenses (group_id, expense_date DESC);
CREATE INDEX ON expenses (group_id, status, expense_date DESC);
CREATE INDEX ON expenses (group_id, submitted_by_member_id);
CREATE INDEX ON expenses (pickle_session_id) WHERE pickle_session_id IS NOT NULL;

-- Thông báo (Notifications)
CREATE INDEX ON notifications (member_id, is_read, created_at DESC);
CREATE INDEX ON notifications (member_id, created_at DESC) WHERE is_read = false;

-- Pickleball
CREATE INDEX ON pickle_sessions (group_id, session_date DESC);
CREATE INDEX ON pickle_attendees (session_id);
CREATE INDEX ON pickle_attendees (member_id);
```

---

## 6. Luồng duyệt chi tiêu (Approval Workflow)

```
Thành viên đề xuất chi tiêu
        │
        ▼
expenses.status = 'pending'
        │
        ├── Thủ quỹ thấy badge "X đang chờ duyệt"
        │
        ├─► APPROVE (Duyệt)
        │     status = 'approved'
        │     reviewed_by, reviewed_at được ghi
        │     → Tính vào số dư (balance)
        │     → Thông báo cho người đề xuất
        │
        └─► DECLINE (Từ chối)
              status = 'declined'
              decline_reason bắt buộc điền
              → Thông báo + lý do cho người đề xuất
```

---

## 7. Phân quyền RLS (Row Level Security)

| Hành động | Treasurer | Member | Viewer |
|-----------|:---------:|:------:|:------:|
| Xem chi tiêu đã duyệt | ✅ | ✅ | ✅ |
| Đề xuất chi tiêu | ✅ | ✅ | ❌ |
| Duyệt/từ chối chi tiêu | ✅ | ❌ | ❌ |
| Sửa/xóa chi tiêu | ✅ | Của mình (pending) | ❌ |
| Tạo thanh toán bù trừ | ✅ | ❌ | ❌ |
| Xác nhận nhận tiền | ✅ | ✅ | ❌ |
| Quản lý thành viên | ✅ | ❌ | ❌ |
| RSVP buổi chơi | ✅ | ✅ | ❌ |
| Xem dashboard cá nhân | Của mình | Của mình | Của mình |

---

## 8. Những vấn đề cũ đã được giải quyết

| Rủi ro cũ (localStorage) | Giải pháp mới (Supabase) |
|--------------------------|--------------------------|
| Mất dữ liệu khi xóa cache | Lưu trên server, không phụ thuộc thiết bị |
| Không đồng bộ nhiều thiết bị | Realtime sync tự động |
| Field alias lộn xộn (`attendees`/`attended`) | Một tên chuẩn duy nhất mỗi bảng |
| Ngày tháng format không nhất quán | Kiểu `date`/`timestamptz` chuẩn PostgreSQL |
| Không có approval workflow | Cột `status` + `reviewed_by` + `decline_reason` |
| Xóa nhóm mất hết | Soft delete (`deleted_at`) |
| Chi phí pickleball tách rời | Gộp vào `expenses` với cột `module` |
| Token lưu plaintext | Chỉ lưu `token_hash` |
| Không có audit trail | Bảng `audit_logs` |
| Chia tiền lồng trong group | Bảng riêng `expense_participants` |

---

## 9. Các quyết định chưa xác định (Open Decisions)

- [ ] Thủ quỹ có được tự duyệt chi tiêu của chính mình không?
- [ ] Settlement có cần người nhận xác nhận không, hay thủ quỹ ghi nhận là xong?
- [ ] Khi thành viên rời nhóm, chi tiêu cũ của họ xử lý thế nào?

---

## 10. Bước tiếp theo (Next Steps)

1. **Phase 2** — Tạo implementation plan cho migration
2. **Phase 3** — Setup Supabase project, tạo tables + RLS policies
3. **Phase 4** — Viết lại frontend React kết nối Supabase thay localStorage
4. **Phase 5** — Test đa người dùng, kiểm tra phân quyền
