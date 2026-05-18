# CLAUDE.md — SpliteasyBoss

> Quy tắc làm việc: xem [`rules/codex-workflow.md`](rules/codex-workflow.md)

---

## Tài liệu dự án (luôn đọc trước khi làm)

```
docs/
├── data-shapes.md
├── superpowers/
│   ├── specs/
│   │   └── 2026-05-17-database-migration-design.md
│   └── plans/
│       ├── 2026-05-16-data-layer-analysis.md
│       └── 2026-05-17-plan1-supabase-setup.md
```

---

## Context Dự Án: SpliteasyBoss

**SpliteasyBoss** là web app quản lý tài chính nhóm cho CLB pickleball Việt Nam.

**Bài toán:** Nhóm 6–15 người chơi pickleball định kỳ cần chia tiền sân, tiền khách, theo dõi ai nợ ai — hiện giải quyết bằng Excel/Zalo, dễ mất dữ liệu.

### Người dùng

| Vai trò | Quyền |
|---------|-------|
| Thủ quỹ (Treasurer) | Thêm/sửa/xóa/duyệt tất cả |
| Thành viên (Member) | Xem + đề xuất chi tiêu + RSVP |
| Người xem (Viewer) | Chỉ xem |

### Stack kỹ thuật

```
Frontend: React + Vite (đã migrate từ CDN Babel)
Styles:   vb-tokens.css
State:    Supabase (đã migrate từ localStorage)
Backend:  Supabase — PostgreSQL + RLS + Realtime
```

### File quan trọng

```
src/app.jsx            ← Shell chính, điều hướng
src/store.jsx          ← State store (Supabase-backed)
src/data.jsx           ← Hàm tính tiền
src/components.jsx     ← UI components dùng chung
src/screen-*.jsx       ← Các màn hình
src/lib/supabase.js    ← Supabase client factory
src/lib/auth.js        ← Token auth helpers
supabase/migrations/   ← SQL migrations (đã chạy hết)
```

---

## Lộ trình phát triển (UI/UX Plans)

```
Phase 0: Phân tích & Thiết kế    ✅ XONG
Phase 1: UI/UX Design            ✅ XONG
  Plan 1 — Approval Workflow     ✅ (StatusBadge, SwipeCard, ApprovalQueue)
  Plan 2 — SmartHome + Payment   ✅ (SmartHomeSummary, ScreenPaymentFlow)
  Plan 3 — Pickleball + JoinGroup ✅ (SessionCalendar, ScreenJoin)
Phase 3: Thực thi Database       ✅ XONG (migrations đã chạy)
Phase 4: Frontend Migration      ✅ XONG (Vite + Supabase)
Phase 5: Tính năng mới
  B1 — Realtime sync + Toast       ✅ XONG (cần bật Realtime trên Supabase dashboard)
  A1 — Tab Hồ sơ                   ⏳ TIẾP THEO
  A2 — Tab Nhóm nâng cao           ⏳
  A3 — Vé lẻ Pickleball            ⏳
  A4 — Personal Dashboard          ⏳
  B3 — Export báo cáo              ⏳
  B2 — Push notifications          ⏳
```
