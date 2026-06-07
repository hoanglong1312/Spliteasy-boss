# Spec: Ticket Water + Home Banner + BatchEntry OCR Nâng Cấp

**Date:** 2026-06-07  
**Status:** approved

---

## Tổng quan

Ba feature liên quan đến vé lẻ (guest ticket):

1. **F1 — Home pending banner**: Banner amber trên Home khi có vé lẻ chờ duyệt, chỉ hiện với thủ quỹ.
2. **F2 — Water cho vé lẻ**: Thêm tiền nước vào ticket form + panel, tách khỏi `totalAmount`, chia đều cho participants.
3. **F3 — BatchEntry OCR nâng cấp**: Import từ 1 text OCR lẫn nước buổi thường, nước xé vé, và tiền xé vé.

---

## F1 — Home Pending Ticket Banner

### Mục tiêu
Thủ quỹ thấy ngay vé lẻ chờ duyệt khi mở Home, không phải vào Calendar bấm từng ngày.

### Data
`buildHomeData` trong `useScreenData.js` thêm field:
```js
pendingTickets: {
  count: Number,       // số ticket status === 'pending_review'
  totalAmount: Number  // tổng total_amount của các ticket đó
}
```
Source: `pickleballState.pickleballTickets` (đã có trong state).

### UI
- Component `PendingTicketsBanner` trong `Home.jsx`
- Render khi: `isTreasurer === true && data.pendingTickets?.count > 0`
- Vị trí: ngay dưới MonthNav / balance area, trên danh sách expense
- Style: `bg rgba(251,191,36,0.08)`, `border rgba(251,191,36,0.38)`, borderRadius 12
- Text: `"X vé lẻ chờ duyệt · Ytổng"` + chevron `›`
- Click: `onAction?.('push', 'pickleball-calendar')`

---

## F2 — Tiền Nước cho Vé Lẻ

### DB Migration
```sql
ALTER TABLE pickleball_tickets
  ADD COLUMN water_amount integer NOT NULL DEFAULT 0;
```

### Ticket Form (`PickleballCalendar.jsx`)
- Thêm state `waterInput` / `setWaterInput`
- Init: `editingTicket?.water_amount || 0` khi edit, `''` khi tạo mới
- Field "Tiền nước" optional, sau preview tổng tiền vé
- Submit payload: thêm `waterAmount: parseAmount(waterInput) || 0`

### TicketDayPanel (`PickleballCalendar.jsx`)
- Hiển thị water nếu `ticket.waterAmount > 0`: `"💧 Nước: Xk (+Yk/người)"`
- Treasurer: expandable inline edit field cho water, save qua `onAction?.('updateTicket', { ticketId, waterAmount })`
- `amountPerPerson` hiển thị = `Math.round((totalAmount + waterAmount) / memberCount)`

### Handlers (`app-v2.jsx`)
- `addTicket`: include `water_amount: payload.waterAmount || 0` trong INSERT
- `updateTicket`: include `water_amount` trong UPDATE nếu `payload.waterAmount !== undefined`

### `useScreenData.js`
- `buildTicketCalendarData` và các builder liên quan: map `water_amount` → `waterAmount` trên ticket object
- `amountPerPerson` trong ticket display = `Math.round((total_amount + water_amount) / member_count)`

---

## F3 — BatchEntry OCR Nâng Cấp

### Parser (`waterOcrImport.js`)
Thêm `ticketAmount` vào block return:
```js
return {
  date, displayDate, quantities,
  detectedWaterTotal, calculatedWaterTotal,
  ticketAmount,   // ← đã extract, chỉ thêm vào output
  extraNotes, status, warnings
}
```

### BatchEntry UI (`BatchEntry.jsx`)

**Logic cho row có `ticketAmount > 0`:**
```
existingTicket = d.tickets.find(t => t.date === row.date)
```

| Trạng thái | Hiển thị | Toggle |
|---|---|---|
| Có ticket, `totalAmount` khớp OCR | `✓ Vé Xk — đúng` (green) | Toggle thêm nước |
| Có ticket, `totalAmount` **khác** OCR | `⚠ App Xk · OCR Yk` (amber) | Toggle cập nhật amount + toggle thêm nước |
| Không có ticket | `⚠ Chưa có vé ngày DD/MM — tạo trước trong Calendar` (red) | Disabled |

State mới: `updateTicketAmount: {}` (map index → bool) — khi toggle "cập nhật amount".

**`saveAll()` payload:**
```js
ticketRows: [{
  sessionDate: row.date,
  waterAmount: Number,
  newTotal: Number | null,      // null nếu không toggle cập nhật
  existingTicketId: String,
}]
```
Chỉ include rows có `existingTicketId` (không tạo mới từ BatchEntry).

### Handler `saveBatchCosts` (`app-v2.jsx`)
```
for each ticketRow:
  if waterAmount > 0: UPDATE pickleball_tickets SET water_amount = waterAmount WHERE id = existingTicketId
  if newTotal != null: UPDATE pickleball_tickets SET total_amount = newTotal WHERE id = existingTicketId
```
Hai update có thể gộp thành một nếu cả hai có giá trị.

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/XXXXXX_ticket_water.sql` | ADD COLUMN water_amount |
| `src/lib/waterOcrImport.js` | Expose ticketAmount trong return |
| `src/screens/BatchEntry.jsx` | Ticket row UI: status, toggles, updateTicketAmount state |
| `src/screens/PickleballCalendar.jsx` | Form water input + TicketDayPanel water display/edit |
| `src/hooks/useScreenData.js` | pendingTickets trong buildHomeData + waterAmount mapping + amountPerPerson |
| `src/screens/Home.jsx` | PendingTicketsBanner component |
| `src/app-v2.jsx` | addTicket/updateTicket water, saveBatchCosts ticket update |

---

## Không làm

- Tạo ticket mới từ BatchEntry (thiếu participants/paymentMode)
- Thay đổi RLS (water_amount inherit policy hiện tại)
- Thay đổi settlement/balance calculation (water là chi phí riêng của ticket, không ảnh hưởng member balance cũ)
