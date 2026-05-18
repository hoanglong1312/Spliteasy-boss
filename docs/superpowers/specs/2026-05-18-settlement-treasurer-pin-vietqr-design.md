# Settlement Period + Treasurer PIN + VietQR — Design Spec

**Ngày:** 2026-05-18
**Trạng thái:** Đã duyệt
**Phạm vi:** 3 tính năng độc lập nhưng liên kết

---

## 1. Treasurer PIN (A1)

### Vấn đề
JoinGroup hiện show tất cả thành viên kể cả thủ quỹ — ai cũng có thể claim quyền thủ quỹ.

### Giải pháp
- Ẩn thủ quỹ khỏi danh sách member trong JoinGroup
- Thêm nút nhỏ "Đăng nhập thủ quỹ" ở cuối trang
- Bấm → dialog nhập PIN → đúng PIN → vào app với role treasurer
- PIN do thủ quỹ tự đặt lần đầu qua tab Hồ sơ → có thể đổi sau

### DB changes
```sql
ALTER TABLE groups ADD COLUMN treasurer_pin_hash text; -- SHA-256 of PIN
```

### Flow
1. **Set PIN (lần đầu):** Thủ quỹ vào Hồ sơ → "Đặt PIN bảo vệ" → nhập PIN → confirm → lưu hash
2. **Join as treasurer:** `/#/join/CODE` → danh sách chỉ show member (không có treasurer) → nút "🔐 Đăng nhập thủ quỹ" → dialog nhập PIN → hash so sánh với DB → đúng thì join
3. **Đổi PIN:** Hồ sơ → "Đổi PIN" → nhập PIN cũ + PIN mới

### Supabase RPC cần thêm
- `set_treasurer_pin(p_group_id, p_pin)` — SECURITY DEFINER, chỉ gọi được khi token thuộc treasurer
- `verify_treasurer_pin(p_invite_code, p_pin)` → `{ member_id, token }` — anon callable, trả token của treasurer nếu PIN đúng

---

## 2. Chốt tháng (Settlement Period)

### Mô hình
- Thủ quỹ bấm "Chốt sổ" → chọn ngày kết thúc kỳ → app tính toán ai nợ ai dựa trên expenses approved trong kỳ
- Kết quả được snapshot vào DB (không live-recalculate) → các thành viên thấy số tiền cần chuyển
- Thành viên bấm "Đã chuyển" → creditor bấm "Đã nhận" → khoản đó closed
- Kỳ đóng hoàn toàn khi tất cả period_payments đều confirmed
- Thành viên vẫn được báo sai sót (dispute) sau khi chốt

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

CREATE TABLE period_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id        uuid NOT NULL REFERENCES settlement_periods(id),
  from_member_id   uuid NOT NULL REFERENCES members(id),
  to_member_id     uuid NOT NULL REFERENCES members(id),
  amount           numeric NOT NULL CHECK (amount > 0),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'transferred', 'confirmed')),
  transferred_at   timestamptz,
  confirmed_at     timestamptz
);

-- Bank info per member (for QR generation)
ALTER TABLE members ADD COLUMN bank_name    text;
ALTER TABLE members ADD COLUMN bank_account text;
ALTER TABLE members ADD COLUMN bank_account_name text;
```

### Tính toán ai nợ ai
Dùng logic `totalBalances` hiện có (chỉ count expenses `status = 'approved'` trong khoảng ngày), tối giản hóa debt (A nợ B 100k + B nợ C 50k → A nợ C 50k, A nợ B 50k).

### UI flow
1. **Thủ quỹ:** Tab Nhóm → "Chốt sổ" → date picker (period_start tự động = ngày sau kỳ trước hoặc đầu tháng, period_end = chọn) → Preview bảng ai nợ ai → Xác nhận tạo
2. **Màn hình kỳ chốt** (`screen-settlement-period.jsx`): Danh sách `period_payments`, mỗi dòng: `[Tên nợ] → [Tên nhận]: [Số tiền]` + trạng thái badge
3. **Người nợ thấy:** Nút "Chuyển khoản" → mở QR sheet (VietQR) + nút "Đã chuyển" → status → `transferred`
4. **Người nhận thấy:** Sau khi đối phương transferred → nút "Xác nhận đã nhận" → status → `confirmed`
5. Khi tất cả `confirmed` → period tự động `closed`

### Navigation
- Thủ quỹ: nút "Chốt sổ" trong group detail
- Tất cả thành viên: banner alert khi có kỳ `open` chưa hoàn thành
- History: tab "Lịch sử chốt sổ" trong group detail (list các kỳ đã closed)

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

`BANK_ID` = mã ngân hàng VietQR (VCB, TCB, MB, ACB...) — thủ quỹ chọn từ dropdown.

### Mở app ngân hàng
```js
window.open(`https://dl.vietqr.io/pay?app=UNIVERSAL&amount=${amount}&description=${desc}&account=${account}&bank=${bank}`)
```
URL này mở trang VietQR cho phép user chọn app ngân hàng để mở.

### Setup bank info
- Thủ quỹ + thành viên đều có thể nhập bank info trong tab Hồ sơ
- Nếu creditor chưa có bank info: trong màn hình period payment, creditor thấy prompt "Nhập tài khoản để nhận tiền" → form inline → lưu → QR hiện ra cho debtor

### Danh sách bank_id hỗ trợ
VietQR hỗ trợ 40+ ngân hàng VN. App chỉ cần lưu mã BIN (3-6 ký tự) và tên hiển thị.
Dropdown có search để chọn ngân hàng.

---

## 4. Không làm (YAGNI)

- Không tích hợp trực tiếp với banking API (chỉ deeplink)
- Không auto-detect thanh toán thành công (user tự bấm "Đã chuyển")
- Không nhắc nhở tự động (push notification) cho period payments
- Không multi-currency
- Không export PDF kỳ chốt (có CSV rồi)

---

## 5. File map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260518000003_settlement_period.sql` | Create | Tạo bảng + alter members + RLS |
| `supabase/migrations/20260518000004_treasurer_pin_rpc.sql` | Create | set_treasurer_pin + verify_treasurer_pin RPCs |
| `src/lib/vietqr.js` | Create | generateQRUrl(), openBankingApp(), BANK_LIST |
| `src/screen-join.jsx` | Modify | Ẩn treasurer, thêm PIN flow |
| `src/screen-profile.jsx` | Modify | Thêm bank info form + set/change PIN |
| `src/screen-settlement-period.jsx` | Create | Màn hình kỳ chốt sổ |
| `src/screen-groups.jsx` | Modify | Thêm nút "Chốt sổ" + alert banner kỳ open |
| `src/store.jsx` | Modify | Actions: CREATE_PERIOD, MARK_TRANSFERRED, CONFIRM_RECEIVED, UPDATE_BANK_INFO, SET_TREASURER_PIN |
| `src/app.jsx` | Modify | Route 'settlement-period' |
