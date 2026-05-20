# Architecture & Context — SpliteasyBoss

## Bài toán
Nhóm 6–15 người chơi pickleball định kỳ cần chia tiền sân, tiền khách, theo dõi ai nợ ai — hiện giải quyết bằng Excel/Zalo, dễ mất dữ liệu.

## Người dùng

| Vai trò | Quyền |
|---------|-------|
| Thủ quỹ (Treasurer) | Thêm/sửa/xóa/duyệt tất cả |
| Thành viên (Member) | Xem + đề xuất chi tiêu + RSVP |
| Người xem (Viewer) | Chỉ xem |

## Stack kỹ thuật

```
Frontend: React + Vite (đã migrate từ CDN Babel)
Styles:   src/tokens.js (design tokens — màu, typography)
State:    Supabase (đã migrate từ localStorage)
Backend:  Supabase — PostgreSQL + RLS + Realtime
```

## File quan trọng

```
src/app-v2.jsx         ← Shell chính, điều hướng, handle() router
src/store.jsx          ← State store (Supabase-backed)
src/primitives.jsx     ← UI components dùng chung
src/tokens.js          ← Design tokens (màu sắc, typography)
src/screens/*.jsx      ← Các màn hình (14+ screens)
src/lib/supabase.js    ← Supabase client factory
src/lib/auth.js        ← Token auth helpers
supabase/migrations/   ← SQL migrations (đã chạy hết)
```

## Tài liệu dự án

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

## Lộ trình phát triển

```
Phase 0: Phân tích & Thiết kế    ✅ XONG
Phase 1: UI/UX Design            ✅ XONG
Phase 3: Thực thi Database       ✅ XONG
Phase 4: Frontend Migration      ✅ XONG
Phase 5: Tính năng mới           🔄 UI hoàn chỉnh, đang QA thực tế
  B1 — Realtime sync + Toast
  A1 — Tab Hồ sơ (color picker, logout)
  A2 — Tab Nhóm nâng cao (filter)
  A3 — Vé lẻ Pickleball
  A4 — Personal Dashboard
  B3 — Export báo cáo (CSV)
  B2 — Push notifications
```
