# Split Court & Water Settlement Implementation Plan

> **Status:** In progress (implementation started 2026-09-05).  
> **Spec:** `docs/superpowers/specs/2026-09-05-split-court-water-settlement-design.md`

**Goal:** Tách dòng công nợ trong tháng của Pickleball thành các dòng độc lập theo nhóm chi phí (`Tiền sân / Vé tháng`, `Tiền nước`, `Vé buổi / Phụ phí`) để có thể thu tiền sân đầu tháng và gom tiền nước cuối tháng mà không bị chốt lẫn.

**Tech Stack:** React + Vite, `src/hooks/useScreenData.js`, `src/screens/Home.jsx`, Vitest.

---

## File map

| File | Trách nhiệm |
|---|---|
| `src/hooks/useScreenData.js` | Helper phân tách `sourcePayableItems` của Pickleball theo danh mục chi phí (`court`, `water`, `session`/`other`), tạo `paymentItems` riêng biệt kèm nhãn (`Tiền sân`, `Tiền nước`, `Vé buổi`). |
| `src/screens/Home.jsx` | Cập nhật `sourcePaymentItems` để hiển thị tương ứng ở Member Payment Sheet; hỗ trợ filter/group danh mục ở `TreasurerMemberPaymentRow`. |
| `src/hooks/useScreenData.test.js` | Unit tests xác nhận các item trong cùng một tháng được phân nhóm chính xác và số tiền khớp nhau. |
| `src/screens/HomePaymentSheet.test.mjs` | Test xác nhận UI hiển thị đúng các dòng tách biệt và thao tác chốt đơn lẻ từng mục. |

---

## Tasks

### Task 1: Phân tách payable items theo nhóm chi phí trong `useScreenData.js`
- [x] Phân loại `sourcePayableItems` của pickleball thành các nhóm category:
  - `court`: Item có prefix `pickleball-court:` hoặc `pickleball-monthly-ticket:`
  - `water`: Item có prefix `pickleball-session:*:water` hoặc `pickleball-ticket:*:water`
  - `session`: Item vé buổi `*:fee`, `*:team-fund`
  - `other`: Các khoản điều chỉnh, extras, p2p
- [x] Trong `buildTreasurerPaymentItems`, nếu source là `pickleball`, nhóm theo `[month, category]` thay vì chỉ nhóm theo `month`.
- [x] Gán nhãn phù hợp:
  - `court`: `${monthLabel} · Tiền sân` (hoặc `${monthLabel} · Vé tháng`)
  - `water`: `${monthLabel} · Tiền nước${asOfSuffix}`
  - `session`: `${monthLabel} · Vé buổi${asOfSuffix}`
- [x] Đảm bảo `amount` và `coveredItems` của từng nhóm con cộng lại bằng đúng tổng của tháng.
- [x] Viết test trong `useScreenData.test.js`.

### Task 2: Đồng bộ hiển thị phía Member View trong `Home.jsx`
- [x] Cập nhật `sourcePaymentItems` trong `src/screens/Home.jsx` để tôn trọng các danh mục chi phí con từ `payableItems`.
- [x] Member khi mở Payment Sheet sẽ thấy tách biệt:
  - `Tháng 9 · Tiền sân`
  - `Tháng 9 · Tiền nước · đến 05/09`
- [x] Member có thể tick chọn thanh toán chỉ Tiền sân trước (đầu tháng) hoặc thanh toán cả hai.

### Task 3: Kiểm thử & Hoàn thiện luồng chốt
- [ ] Kiểm tra luồng `TT` dòng Tiền sân:
  - Chỉ tạo checkpoint cho `pickleball-court:...`
  - Dòng `Tiền nước` vẫn còn ở danh sách Chưa chốt với số tiền còn lại.
- [x] Chạy `npm test` và kiểm thử trực tiếp trên giao diện dev server (http://127.0.0.1:5174).
