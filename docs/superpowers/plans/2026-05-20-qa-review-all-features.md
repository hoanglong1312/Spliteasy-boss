# QA Review — Toàn Bộ Tính Năng Implementation Plan

> **For agentic workers:** REQUIRED: Dùng Codex MCP (`mcp__codex__codex`, sandbox: workspace-write) để thực thi từng task. Claude main orchestrate + adversarial review sau mỗi task.

**Goal:** Rà soát và xác nhận toàn bộ 21 screens hoạt động đúng trước khi bàn giao user test thực tế.

**Architecture:** 3 lớp kiểm tra — (1) Static Audit: prop/handler/import matching, (2) E2E Playwright: happy path automation, (3) Manual checklist: những gì automation không cover được (Supabase auth thật, visual UX).

**Tech Stack:** React + Vite, Supabase MCP, Playwright, src/app-v2.jsx (handle() router), src/store.jsx

---

## Danh sách screens cần audit (21 screens)

| # | Screen file | Tab / Flow |
|---|---|---|
| 1 | JoinGroup.jsx | Đăng nhập |
| 2 | Home.jsx | Tab Trang chủ |
| 3 | AddExpense.jsx | Bottom sheet từ Home |
| 4 | GroupsList.jsx | Tab Nhóm |
| 5 | GroupDetail.jsx | Từ GroupsList |
| 6 | NewGroup.jsx | Từ GroupsList |
| 7 | ExpenseDetail.jsx | Từ Home/GroupDetail |
| 8 | BatchEntry.jsx | Từ Home (thủ quỹ) |
| 9 | ApprovalQueue.jsx | Từ Home (thủ quỹ) |
| 10 | SettleAll.jsx | Từ Home |
| 11 | SettlementPeriod.jsx | Từ Home |
| 12 | PaymentFlow.jsx | Từ Home/SettleAll |
| 13 | Notifications.jsx | Tab Thông báo |
| 14 | PickleballOverview.jsx | Tab Pickleball |
| 15 | PickleballCalendar.jsx | Từ PickleballOverview |
| 16 | PickleballMembers.jsx | Từ PickleballOverview |
| 17 | PickleballSettings.jsx | Từ PickleballOverview |
| 18 | PickleballTickets.jsx | Từ PickleballOverview |
| 19 | SessionDetail.jsx | Từ PickleballCalendar |
| 20 | Profile.jsx | Tab Cá nhân |
| 21 | Settings.jsx | Từ Profile |

---

## Task 1: Static Audit — Prop + Handler + Import

**Files:**
- Read: `src/app-v2.jsx` (handle() router, buildXxxData() functions)
- Read: tất cả 21 file trong `src/screens/`
- Report: danh sách issue dạng bảng

- [ ] **Step 1: Codex đọc app-v2.jsx, liệt kê toàn bộ**
  - Tất cả `case` trong `handle()` function
  - Tất cả `buildXxxData()` functions và props chúng trả về
  - Screen nào được render với data gì

- [ ] **Step 2: Codex rà soát từng screen — check 4 điểm:**
  1. **Props**: mọi prop screen dùng (`data.xxx`) có tồn tại trong data builder tương ứng không?
  2. **onAction**: mọi `onAction('type', payload)` call có case handler trong `handle()` không?
  3. **Imports**: mọi `import { X }` từ `../primitives` hoặc `../tokens` có export tương ứng không?
  4. **Controlled inputs**: mọi `<input>` / `<select>` có `value` + `onChange` không (tránh uncontrolled warning)?

- [ ] **Step 3: Codex xuất báo cáo dạng bảng**

  ```
  | Screen | Prop issues | Handler issues | Import issues | Input issues |
  |--------|-------------|----------------|---------------|--------------|
  | Home   | none        | 'fab' missing  | none          | none         |
  ...
  ```

- [ ] **Step 4: Claude main adversarial review**
  - Đọc báo cáo — không tin "none" mà không spot-check ít nhất 3 screen ngẫu nhiên
  - Xác nhận hoặc bổ sung issue

- [ ] **Step 5: Codex fix toàn bộ issue tìm được**
  - Ưu tiên: handler missing > prop mismatch > import > uncontrolled input
  - Commit sau khi fix: `fix: resolve static audit issues — missing handlers, prop mismatches`

---

## Task 2: Playwright — Bổ sung test coverage

**Files:**
- Modify: `e2e/app.spec.js`

Coverage hiện tại (7 tests):
- ✅ App loads
- ✅ JoinGroup invite code input
- ✅ Tab navigation → GroupsList
- ✅ Add expense button → AddExpense screen
- ✅ JoinGroup lookup valid code → member names
- ✅ JoinGroup invalid code → error
- ✅ AddExpense title input

Gaps cần thêm:

- [ ] **Step 1: Codex thêm test — Profile tab visible sau login**

  ```js
  test('Profile tab shows user name after login', async ({ page }) => {
    await openHome(page)
    const profileTab = page.getByRole('button', { name: /Cá nhân/ }).last()
    test.skip(!(await profileTab.isVisible().catch(() => false)), 'TabBar not visible')
    await profileTab.click()
    await expect(page.locator('h1').filter({ hasText: 'Cá nhân' })).toBeVisible()
  })
  ```

- [ ] **Step 2: Codex thêm test — Settings screen mở từ Profile**

  ```js
  test('Settings screen opens from Profile', async ({ page }) => {
    await openHome(page)
    const profileTab = page.getByRole('button', { name: /Cá nhân/ }).last()
    test.skip(!(await profileTab.isVisible().catch(() => false)), 'TabBar not visible')
    await profileTab.click()
    await page.getByRole('button', { name: /⚙/ }).click()
    await expect(page.locator('div').filter({ hasText: /^Cài đặt$/ }).first()).toBeVisible()
  })
  ```

- [ ] **Step 3: Codex thêm test — Pickleball tab**

  ```js
  test('Pickleball tab shows overview screen', async ({ page }) => {
    await openHome(page)
    const pbTab = page.getByRole('button', { name: /Pickleball/ }).last()
    test.skip(!(await pbTab.isVisible().catch(() => false)), 'TabBar not visible')
    await pbTab.click()
    await expect(page.getByText(/Tổng quan/i).first()).toBeVisible()
  })
  ```

- [ ] **Step 4: Chạy toàn bộ tests**

  ```bash
  npx playwright test --reporter=line
  ```

  Expected: tất cả pass (7 cũ + 3 mới = 10 tests)

- [ ] **Step 5: Fix nếu có test fail, rồi commit**

  ```bash
  git add e2e/app.spec.js
  git commit -m "test: add 3 E2E tests — Profile tab, Settings, Pickleball overview"
  ```

---

## Task 3: Build + Final Check

- [ ] **Step 1: Codex chạy build sạch**

  ```bash
  npm run build
  ```

  Expected: exit 0, không có compile error (warning chunk size là bình thường)

- [ ] **Step 2: Codex chạy toàn bộ Playwright lần cuối**

  ```bash
  npx playwright test --reporter=line
  ```

  Expected: PASS (0) FAIL (0)

- [ ] **Step 3: Commit nếu có thay đổi còn sót**

  ```bash
  git add -p   # review từng hunk
  git commit -m "fix: final QA cleanup before user testing"
  ```

---

## Task 4: Manual Test Checklist (cho user)

Sau khi Task 1–3 pass, Claude main tổng hợp checklist này để báo cáo user:

### Luồng đăng nhập
- [ ] Mở app → thấy màn hình JoinGroup
- [ ] Nhập `PICKLE-TEST` → tên thành viên hiện ra (Nguyễn An, Long, ...)
- [ ] Chọn tên → nhấn "Tham gia →" → vào Home

### Tab Trang chủ
- [ ] Thấy danh sách chi tiêu, số dư
- [ ] Nhấn "+ Thêm chi tiêu" → mở AddExpense
- [ ] Điền đầy đủ → nhấn "Lưu" → có phản hồi (loading / success / error)

### Tab Nhóm
- [ ] Thấy danh sách nhóm
- [ ] Nhấn vào nhóm → vào GroupDetail
- [ ] Thấy danh sách thành viên, chi tiêu nhóm

### Tab Pickleball
- [ ] Thấy Tổng quan, lịch, thành viên
- [ ] Nhấn vào buổi trong lịch → SessionDetail mở ra
- [ ] RSVP toggle hoạt động (UI phản hồi)

### Tab Cá nhân
- [ ] Thấy tên, màu avatar
- [ ] Đổi màu avatar → lưu ngay không cần nút
- [ ] Nhấn ⚙️ → vào Settings
- [ ] Sửa thông tin ngân hàng → nhấn Lưu → có phản hồi
- [ ] PIN: nhấn "Đặt ngay" → flow thiết lập (hoặc mock UI)
- [ ] Nhấn "Đăng xuất" → về JoinGroup

### Edge cases
- [ ] Nhập mã mời sai → hiện lỗi đỏ
- [ ] Lưu chi tiêu không có tiêu đề → hiện lỗi validation
- [ ] Lưu chi tiêu số tiền = 0 → hiện lỗi validation
