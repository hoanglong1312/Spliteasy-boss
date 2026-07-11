# Decisions — SpliteasyBoss

## 2026-07-10 — Payment coverage theo phần tiền từng member

### Decision: Không gắn trạng thái thanh toán vào expense

- Một expense có thể chia cho nhiều member; thanh toán của một người không được làm expense hoặc phần tiền của người khác thành đã trả.
- Đơn vị coverage chuẩn là `payableItem`, tức phần tiền của một member/profile trong một khoản.
- `payableItemKey` dùng `itemId` hoặc `expenseId`, `memberId`, `profileId` và tháng. Amount dùng để trừ một phần/toàn bộ item, không dùng làm identity chính.

### Compatibility

- Payment mới lưu cả `coveredItems` và `coveredSources`.
- `coveredItems` là source of truth cho coverage mới.
- `coveredSources` chỉ dùng cho tổng hợp, RPC/checkpoint cũ và fallback record legacy.
- Record legacy đã có công cụ chuyển sang `coveredItems`; fallback vẫn giữ để tránh mất lịch sử nếu còn record chưa map được chính xác.
- Không tạo bảng `payment_allocations` trong v1. Metadata hiện tại đủ cho scope; chỉ thêm bảng khi cần audit server-side hoặc query allocation độc lập.

### Checkpoint semantics

- `member_month_settlements` không đại diện cho toàn bộ giao dịch tháng đã trả.
- Checkpoint không được che khoản mới phát sinh sau thời điểm chốt.
- Coverage chính xác dựa trên `payableItemKey`; source/month checkpoint chỉ phục vụ lịch sử và compatibility.

### Implementation

- `ecb3d2f` — track payment coverage by payable item.
- `58a1a2b` — migrate legacy payment coverage to payable items.
- `380bb7a` — keep post-checkpoint debts visible.

---

## 2026-06-07 — Water + Home Banner + BatchEntry Feature

### ASSUMPTION: Test File Creation Skipped
- **Assumption:** Allowed-file constraint prevented creating test files for waterAmount calculations
- **Decision:** Used plan's manual parser check + `npm run build` gates instead of unit tests
- **Applies to:** Tasks 1–7

### ASSUMPTION: Partial `updateTicket` Payload Support
- **Assumption:** Inline water edit in TicketDayPanel sends only `{ ticketId, waterAmount }` to `onAction('updateTicket', ...)`
- **Decision:** Modified `updateTicket` handler in `app-v2.jsx` to support partial payload; maintains existing validation for full ticket updates
- **Applies to:** Task 4 (PickleballCalendar) + Task 5 (handlers)
- **Code:** `updateTicket` now checks if payload is partial (only waterAmount) or full, applies updates conditionally

### ASSUMPTION: `water_amount` Inheritance in RLS
- **Assumption:** New `water_amount` column on `pickleball_tickets` automatically inherits existing RLS policies
- **Decision:** Did not add explicit RLS policy changes — test with production access patterns
- **Applies to:** Task 1 (DB migration)
- **Verification:** Run Supabase `check_rls` if needed to confirm treasurer/member read access

### ASSUMPTION: `AddTicketSheet` Payload Shape
- **Assumption:** Existing handler expects `{ session_date, total_amount, member_ids, advancer_id, payment_mode }` (database style)
- **Decision:** In `AddTicketSheet` submit, pass `waterAmount` as new field to match handler expectations; handler converts to `water_amount` for DB
- **Applies to:** Task 4 (PickleballCalendar) + Task 5 (handlers)

### ASSUMPTION: No Tickets Created from BatchEntry
- **Assumption:** Spec prohibits creating new tickets from BatchEntry (missing participants, payment mode)
- **Decision:** Removed create path from `saveBatchCosts`; only updates existing tickets; warning UI if no ticket found
- **Applies to:** Task 7 (BatchEntry) + Task 5 (handlers)
- **Code:** `saveBatchCosts` filters `ticketRows` by `existingTicketId`; no INSERT, only UPDATE

### ASSUMPTION: `waterAmount` / `water_amount` Case
- **Assumption:** JS uses camelCase; DB uses snake_case
- **Decision:** Enforce this throughout:
  - `waterAmount` in React state, component props, handlers
  - `water_amount` in SQL, Supabase inserts/updates
  - Converters in handlers normalize payload
- **Applies to:** Tasks 1–7

### ASSUMPTION: `pendingTickets` Data Shape
- **Assumption:** Home builder computes pending count & total from `pickleballState.pickleballTickets` filtering by `status === 'pending_review'`
- **Decision:** Add `pendingTickets: { count, totalAmount }` to `buildHomeData` return; render in Home via PendingTicketsBanner
- **Applies to:** Task 3 (data) + Task 6 (Home)

### ASSUMPTION: Treasurer Check via Route Param
- **Assumption:** `app-v2.jsx` already exposes `isPickleballTreasurer` (computed from current member role in group)
- **Decision:** Pass it down to Home as prop; use to conditionally render banner
- **Applies to:** Task 5 (app-v2) + Task 6 (Home)

---

## Migration Status

- **Task 1:** DB migration file created at `supabase/migrations/20260607000001_ticket_water_amount.sql`
- **Applied:** Yes (via `supabase migration repair --status applied 20260607000001` after `supabase db pull`)
- **Verified:** Repair confirmed applied; local schema synced to remote
- **Column:** `water_amount integer NOT NULL DEFAULT 0`

---

## QA Before Deployment

- [ ] Test water input in PickleballCalendar AddTicketSheet
- [ ] Test inline water edit in TicketDayPanel (treasurer only)
- [ ] Verify `ticketAmountPerPerson = (totalAmount + waterAmount) / memberCount`
- [ ] Test PendingTicketsBanner visibility (treasurer role, count > 0)
- [ ] Test BatchEntry OCR import: ticket status chips, amount mismatch toggle
- [ ] Verify no new tickets created from BatchEntry when none exist
- [ ] Check RLS policies allow treasurer to read/update water_amount on tickets
