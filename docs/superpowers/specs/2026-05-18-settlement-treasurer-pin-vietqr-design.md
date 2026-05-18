# Settlement Period + Member PIN + VietQR — Design Spec

**Ngày:** 2026-05-18
**Trạng thái:** Đã duyệt
**Phạm vi:** 3 tính năng độc lập nhưng liên kết

---

## 1. Member PIN (bảo vệ tài khoản cá nhân)

### Vấn đề
Ai có link mời nhóm đều có thể click vào tên bất kỳ thành viên và xem toàn bộ dữ liệu của người đó (số nợ, lịch sử, quyền duyệt nếu là thủ quỹ).

### Giải pháp
PIN là **của từng người**, tự nguyện đặt. Nếu đặt PIN thì khi ai click vào tên mình trong JoinGroup phải nhập đúng PIN mới vào được. Nếu không đặt → vào bình thường như cũ.

### DB changes
```sql
ALTER TABLE members ADD COLUMN pin_hash text; -- SHA-256 of PIN, nullable
```

### Flow đặt PIN
1. Vào tab Hồ sơ → section "Bảo mật" → nút "Đặt mã PIN"
2. Nhập 4–6 chữ số → nhập lại để confirm → lưu hash vào DB
3. Ghi chú hiển thị bên dưới: *"Mã PIN bảo vệ tài khoản của bạn. Nếu quên PIN, nhờ thủ quỹ reset trong tab Quản lý thành viên."*

### Flow đổi / xóa PIN
- Hồ sơ → "Đổi PIN" → nhập PIN cũ → nhập PIN mới → confirm
- Hồ sơ → "Xóa PIN" → nhập PIN hiện tại → xác nhận → `pin_hash = null`

### Flow reset PIN (thủ quỹ)
- Thủ quỹ → tab Quản lý thành viên → chọn thành viên → "Reset PIN" → xóa `pin_hash` của người đó

### Flow JoinGroup
- Danh sách thành viên hiện tất cả (không ẩn ai)
- Click tên người **có PIN** → dialog nhập PIN → đúng thì vào, sai thì báo lỗi
- Click tên người **không có PIN** → vào thẳng như cũ

### Supabase RPC
- `verify_member_pin(p_invite_code, p_member_name, p_pin)` → `{ member_id, token }` — anon callable
- `set_member_pin(p_pin)` — authenticated, cập nhật pin_hash của member hiện tại
- `reset_member_pin(p_member_id)` — chỉ treasurer được gọi

---

## 2. Chốt tháng (Settlement Period)

### Mô hình luồng tiền
Mọi giao dịch được **gộp qua thủ quỹ** — mỗi thành viên chỉ có tối đa 1 giao dịch:
- Net âm (nợ tổng) → chuyển tiền **vào thủ quỹ**
- Net dương (được nợ tổng) → nhận tiền **từ thủ quỹ**

Dữ liệu chi tiết (ai nợ ai theo expense) vẫn lưu đầy đủ để tra cứu. Chỉ luồng **chuyển tiền thực tế** mới gộp lại.

Ví dụ:
```
Tính toán gốc:        Long nợ An 100k, Long nợ Bình 80k, Chi nợ An 30k
Net mỗi người:        Long -180k | An +70k | Bình +80k | Chi -30k
Luồng chuyển tiền:    Long → thủ quỹ 180k
                      Chi  → thủ quỹ 30k
                      thủ quỹ → An 70k
                      thủ quỹ → Bình 80k
```

### DB changes
```sql
CREATE TABLE settlement_periods (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              uuid NOT NULL REFERENCES groups(id),
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  status                text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'closed')),
  created_by_member_id  uuid REFERENCES members(id),
  created_at            timestamptz DEFAULT now()
);

-- Mỗi dòng = 1 giao dịch cần thực hiện (đã gộp qua thủ quỹ)
CREATE TABLE period_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id        uuid NOT NULL REFERENCES settlement_periods(id),
  from_member_id   uuid NOT NULL REFERENCES members(id),  -- người chuyển
  to_member_id     uuid NOT NULL REFERENCES members(id),  -- người nhận (thường là thủ quỹ)
  amount           numeric NOT NULL CHECK (amount > 0),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'transferred', 'confirmed')),
  transferred_at   timestamptz,
  confirmed_at     timestamptz
);

-- Bank info để tạo QR
ALTER TABLE members ADD COLUMN bank_name         text;
ALTER TABLE members ADD COLUMN bank_account      text;
ALTER TABLE members ADD COLUMN bank_account_name text;
```

### UI flow chi tiết

**Thủ quỹ tạo kỳ chốt:**
1. Group detail → nút "Chốt sổ"
2. Date picker chọn ngày kết thúc (period_start tự động = ngày sau kỳ trước, hoặc ngày có expense đầu tiên nếu chưa có kỳ nào)
3. Preview bảng gộp:
   ```
   Kỳ: 01/05 – 18/05/2026
   ─────────────────────────────
   Long  → thủ quỹ  180,000đ
   Chi   → thủ quỹ   30,000đ
   thủ quỹ → An      70,000đ
   thủ quỹ → Bình    80,000đ
   ```
4. Xác nhận → tạo `settlement_period` + các `period_payments`

**Thành viên thấy banner:**
Khi có kỳ `open` → banner vàng trên Home và Groups: *"Đã chốt sổ 01/05–18/05 · Bạn cần chuyển 180,000đ"* (hoặc "Bạn sẽ nhận 70,000đ") → tap vào màn hình kỳ chốt.

**Màn hình kỳ chốt (`screen-settlement-period.jsx`):**
- Danh sách `period_payments` của kỳ đó
- Mỗi dòng: `[Tên] → [Tên]: [Số tiền]` + badge trạng thái
- **Người chuyển thấy:** Nút "Chuyển khoản" → bottom sheet QR + nút "Đã chuyển" → status `transferred`
- **Người nhận thấy:** Khi đối phương bấm "Đã chuyển" → nút "Xác nhận đã nhận" hiện → bấm → `confirmed`
- Khi tất cả `confirmed` → period tự chuyển `closed` → banner biến mất
- **Thủ quỹ** thấy toàn bộ danh sách, có thể confirm thay cho thành viên nếu cần

**Disputes sau khi chốt:** Vẫn báo sai được. Thủ quỹ resolve → nếu số tiền thay đổi đáng kể thì xóa kỳ và tạo lại.

**Lịch sử:** Tab "Lịch sử chốt sổ" trong group detail → list các kỳ đã `closed`.

---

## 3. VietQR + Mở app ngân hàng

### QR generation
Dùng VietQR public image API (không cần API key):
```
https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png
  ?amount={AMOUNT}
  &addInfo={DESCRIPTION}
  &accountName={ACCOUNT_NAME}
```
`DESCRIPTION` = `"SpliteasyBoss T5/2026 - {tên người chuyển}"`

### Mở app ngân hàng (deeplink)
```js
window.open(`https://dl.vietqr.io/pay?app=UNIVERSAL&amount=${amount}&description=${desc}&account=${account}&bank=${bank}`)
```
Trang VietQR liệt kê các app ngân hàng hỗ trợ, user chọn app để mở thẳng với thông tin điền sẵn.

### Bottom sheet QR
```
┌──────────────────────────────┐
│  Chuyển cho Nguyễn An        │
│  ┌──────────────────────┐    │
│  │      [QR image]      │    │
│  └──────────────────────┘    │
│  MB Bank · 0123456789        │
│  Nguyễn Văn An               │
│  Nội dung: SpliteasyBoss T5  │
│  Số tiền: 180,000đ           │
│                              │
│  [Mở app ngân hàng]          │
│  [✓ Đã chuyển khoản]        │
└──────────────────────────────┘
```

### Setup bank info
- Mọi thành viên nhập bank info trong tab Hồ sơ: chọn ngân hàng (dropdown có search, 40+ NH VN) → số tài khoản → tên chủ tài khoản
- Nếu người nhận chưa có bank info: debtor thấy *"Nguyễn An chưa cập nhật tài khoản ngân hàng. Liên hệ trực tiếp."* + nút "Đã chuyển" vẫn hiện để tự báo

---

## 4. Không làm (YAGNI)

- Không tích hợp trực tiếp với banking API (chỉ deeplink)
- Không auto-detect thanh toán thành công
- Không push notification cho period payments
- Không multi-currency
- Không export PDF kỳ chốt

---

## 5. File map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260518000003_settlement_period.sql` | Create | Tạo bảng settlement_periods, period_payments + alter members (bank info + pin_hash) + RLS |
| `supabase/migrations/20260518000004_member_pin_rpc.sql` | Create | verify_member_pin, set_member_pin, reset_member_pin RPCs |
| `src/lib/vietqr.js` | Create | generateQRUrl(), openBankingApp(), BANK_LIST |
| `src/screen-join.jsx` | Modify | Thêm PIN dialog khi click member có pin_hash |
| `src/screen-profile.jsx` | Modify | Thêm bank info form + set/change/remove PIN section |
| `src/screen-settlement-period.jsx` | Create | Màn hình kỳ chốt sổ + QR bottom sheet |
| `src/screen-groups.jsx` | Modify | Nút "Chốt sổ" + banner kỳ open + tab lịch sử |
| `src/store.jsx` | Modify | Actions: CREATE_PERIOD, MARK_TRANSFERRED, CONFIRM_RECEIVED, UPDATE_BANK_INFO, SET_MEMBER_PIN, RESET_MEMBER_PIN |
| `src/app.jsx` | Modify | Route 'settlement-period' |
