# QR Payment Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chốt khoản nợ tại lúc thủ quỹ tải QR để giao dịch thêm sau đó không bị tính vào lần xác nhận cũ.

**Architecture:** Dùng `settlement_checkpoints` hiện có làm snapshot theo thời gian. Nút tải QR gửi `groupId`, `memberId`, `amount` để tạo checkpoint trước khi tải ảnh; xác nhận dùng checkpoint đang chờ thay vì dựng lại số dư hiện tại.

**Tech Stack:** React, Vite, Supabase RPC, Node test runner

---

### Task 1: Khóa QR bằng checkpoint

**Files:**
- Modify: `src/screens/Home.jsx`
- Test: `src/screens/HomePaymentSheet.test.mjs`

- [x] **Step 1: Viết test đỏ**

Kiểm tra QR sheet gọi action tạo checkpoint với số tiền/member/group tại lúc tải. Handler `requestSettlementCheckpoint` hiện có được tái sử dụng.

- [x] **Step 2: Chạy test để xác nhận fail đúng**

Run: `node --test src/screens/HomePaymentSheet.test.mjs src/app-v2.test.mjs`

Expected: FAIL vì QR flow chưa gửi `requestSettlementCheckpoint`.

- [x] **Step 3: Sửa tối thiểu**

Truyền payment row đầy đủ vào QR sheet. Trước khi tải ảnh, gọi `requestSettlementCheckpoint`; chỉ tải khi checkpoint tạo thành công. Đóng QR sau khi tải để người dùng thấy hàng checkpoint chờ duyệt.

- [x] **Step 4: Verify**

Run:

```bash
node --test src/screens/HomePaymentSheet.test.mjs src/app-v2.test.mjs
npx vitest run src/hooks/useScreenData.test.js
npm run build
```

Expected: PASS.

- [x] **Step 5: Scope audit và commit**

Run:

```bash
npx gitnexus detect-changes --repo Spliteasy-boss
git diff --check
git add src/screens/Home.jsx src/screens/HomePaymentSheet.test.mjs docs/superpowers/plans/2026-07-13-qr-payment-snapshot.md docs/plan-overview.md
git commit -m "fix: snapshot member debt when sharing qr"
git push origin main
```
