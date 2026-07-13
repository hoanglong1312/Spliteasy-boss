# Pending Payment Item Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị và khóa trạng thái chờ nhận theo từng payable item, đồng thời ngăn duyệt snapshot đã lệch dữ liệu.

**Architecture:** Dẫn xuất trạng thái trực tiếp từ `pendingCheckpointsForTreasurer[].coveredItems` khi dựng dashboard rows. So khớp bằng `payableItemKey`, giữ snapshot bất biến, và để handler ném lỗi khi bất kỳ group nào tạo checkpoint thất bại để sheet không đóng.

**Tech Stack:** React, Vite, Node test runner, Supabase-backed store

---

### Task 1: Khóa và hiển thị pending theo item

**Files:**
- Modify: `src/screens/Home.jsx`
- Test: `src/screens/HomePaymentSheet.test.mjs`

- [x] **Step 1: Write failing source-contract tests**

Thêm assertions xác nhận `buildTreasurerMemberRows` nhận pending checkpoints, gắn `pending`/`checkpointStale`, tính `pendingAmount` và `unsettledAmount`; row chỉ chọn item chưa pending; UI có `Đang chờ nhận` và `Chưa chốt`; checkpoint stale khóa nút duyệt.

- [x] **Step 2: Run test to verify failure**

Run: `node --test src/screens/HomePaymentSheet.test.mjs`

Expected: FAIL vì dashboard vẫn khóa toàn member bằng `paymentLocked`.

- [x] **Step 3: Add minimum item-level derivation**

So khớp mỗi unpaid item với `coveredItems` bằng `payableItemKey`. Gắn `pendingCheckpointId`, `pending`, `checkpointStale`; amount hoặc identity lệch làm stale. Tính tổng pending/chưa chốt trên member row.

- [x] **Step 4: Update interactions and labels**

Loại pending item khỏi chọn một dòng, chọn tất cả, QR amount, `TT tổng`, và nút `TT`. Hiển thị chip `Đang chờ nhận` hoặc `Chưa chốt`. Với checkpoint stale, hiển thị cảnh báo và disable `Duyệt`, vẫn cho `Từ chối`.

- [x] **Step 5: Run focused test**

Run: `node --test src/screens/HomePaymentSheet.test.mjs`

Expected: PASS.

### Task 2: Giữ sheet mở khi tạo checkpoint nhiều group lỗi một phần

**Files:**
- Modify: `src/app-v2.jsx`
- Test: `src/app-v2.test.mjs`

- [x] **Step 1: Write failing handler contract test**

Thêm assertion yêu cầu handler ném lỗi khi `failureCount > 0`, kể cả có group thành công.

- [x] **Step 2: Run test to verify failure**

Run: `node --test src/app-v2.test.mjs`

Expected: FAIL vì handler hiện chỉ throw khi mọi group đều thất bại.

- [x] **Step 3: Throw after partial failure**

Sau refresh/toast cho group thành công, ném lỗi mang số group thất bại. `TreasurerConfirmPaymentSheet` chỉ gọi `onClose` sau `await`, nên sheet tự giữ mở.

- [x] **Step 4: Run focused test**

Run: `node --test src/app-v2.test.mjs`

Expected: PASS.

### Task 3: Verify, inspect scope, commit, push

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-pending-payment-item-status.md`

- [x] **Step 1: Run quality gate**

Run:

```bash
node --test src/screens/HomePaymentSheet.test.mjs
node --test src/app-v2.test.mjs
npm run qa:codex
npm run build
```

Expected: focused tests and build pass; any known unrelated QA failure is reported exactly.

- [x] **Step 2: Browser smoke test**

Mở dashboard thủ quỹ ở mobile viewport. Xác nhận member có phần `Đang chờ` và `Chưa chốt`, pending item không chọn được, item mới vẫn chọn được, stale checkpoint không duyệt được.

Runtime data không có checkpoint pending; smoke test xác nhận app tải ở mobile và nhãn `Chưa chốt` hiển thị đúng. Các trạng thái pending/stale được khóa bằng focused tests.

- [x] **Step 3: Check GitNexus scope**

Run: `npx gitnexus detect-changes --repo Spliteasy-boss --scope unstaged`

Expected: chỉ payment dashboard và settlement checkpoint request flow bị ảnh hưởng.

- [x] **Step 4: Commit explicit files**

```bash
git add docs/superpowers/plans/2026-07-13-pending-payment-item-status.md src/screens/Home.jsx src/screens/HomePaymentSheet.test.mjs src/app-v2.jsx src/app-v2.test.mjs
git commit -m "fix: track pending payments per item"
git push origin main
```
