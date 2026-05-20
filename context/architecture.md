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
State:    Supabase (server state) + localStorage (PIN, token, member)
Backend:  Supabase — PostgreSQL + RLS + Realtime
```

## File quan trọng

```
src/app-v2.jsx              ← Shell chính, điều hướng, handle() router, PIN gate
src/store.jsx               ← State store (Supabase-backed)
src/hooks/useScreenData.js  ← Data builders cho tất cả screens (buildXxxData)
src/primitives.jsx          ← UI components dùng chung
src/tokens.js               ← Design tokens (màu sắc, typography)
src/screens/*.jsx           ← 21 màn hình
src/lib/supabase.js         ← Supabase client factory
src/lib/auth.js             ← Token auth helpers
supabase/migrations/        ← SQL migrations (đã chạy hết)
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
│       ├── 2026-05-17-plan1-supabase-setup.md
│       └── 2026-05-20-qa-review-all-features.md
```

## Lộ trình phát triển

```
Phase 0: Phân tích & Thiết kế    ✅ XONG
Phase 1: UI/UX Design            ✅ XONG
Phase 3: Thực thi Database       ✅ XONG
Phase 4: Frontend Migration      ✅ XONG
Phase 5: Tính năng mới           🔄 đang user test thực tế
  ✅ PIN gate — đặt/đổi/xóa, text input dialog
  ✅ AddExpense — default payer, edit mode, filter đa tiêu chí
  ✅ PickleballSettings — monthly participation save, add/delete member
  ✅ Home — click-to-detail, permission-based edit/delete
  ✅ Supabase saves — expense, member, pickleball config
  🔄 B1 — Realtime sync + Toast
  🔄 A4 — Personal Dashboard
  ❌ B2 — Push notifications
  ❌ B3 — Export CSV (đã bỏ theo yêu cầu)
```
