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
State:    Supabase (server state, PIN theo profile) + localStorage (token, recent member session metadata)
Backend:  Supabase — PostgreSQL + RLS + Realtime
Identity: docs/architecture/identity-model.md là source of truth cho profile/member IDs
```

## Runtime source of truth

App runtime hiện tại đi theo luồng:

```
src/main.jsx → src/app-v2.jsx → src/screens/*.jsx
```

App v1 đã bị xóa khỏi `src/`: root app cũ, shared components cũ, tweak panel cũ, stylesheet token cũ, và các root-level screen modules cũ.
Nếu tài liệu cũ trong `docs/superpowers/` còn nhắc cấu trúc v1 này, xem đó là lịch sử implementation, không phải hướng dẫn cho code hiện tại.

## File quan trọng

```
src/main.jsx                ← Entry point React, mount AppProvider + AppV2
src/app-v2.jsx              ← Shell chính, điều hướng, handle() router, PIN gate
src/store.jsx               ← State store (Supabase-backed)
src/hooks/useScreenData.js  ← Data builders cho tất cả screens (buildXxxData)
src/primitives.jsx          ← UI components dùng chung
src/tokens.js               ← Design tokens (màu sắc, typography)
src/screens/*.jsx           ← 21 màn hình
src/data.jsx                ← Helper tính toán/format legacy vẫn được useScreenData dùng
src/lib/supabase.js         ← Supabase client factory
src/lib/auth.js             ← Token auth helpers
supabase/migrations/        ← SQL migrations (đã chạy hết)
```

## Payment coverage model

Đơn vị thanh toán chuẩn là `payableItem`: phần tiền của một member/profile trong một expense, ticket hoặc nguồn tiền. Không gắn cờ `paid` trực tiếp vào expense vì một expense có thể chia cho nhiều người.

`payableItemKey` định danh khoản theo `itemId` hoặc `expenseId`, cộng với `memberId`, `profileId` và tháng. Số tiền không phải định danh; một payment có thể cover một phần hoặc toàn bộ item.

Luồng hiện tại:

```
expense/ticket/source
  → payableItem theo từng member
  → chọn khoản thanh toán
  → metadata.coveredItems
  → trừ đúng payableItemKey
```

- Payment mới vẫn lưu `coveredSources` để hiển thị tổng hợp và tương thích RPC cũ.
- Khi tính số còn nợ, `src/hooks/useScreenData.js` ưu tiên `coveredItems`; chỉ fallback sang `coveredSources` cho record legacy chưa có item key.
- `member_month_settlements` là marker/checkpoint lịch sử theo source và tháng, không phải cờ xóa toàn bộ khoản phát sinh trong tháng.
- Khoản mới phát sinh sau checkpoint tạo `payableItemKey` mới và vẫn hiện chưa thanh toán.
- Code chính: `src/hooks/useScreenData.js`, `src/screens/Home.jsx`, `src/store.jsx`.
- Implementation: `ecb3d2f` (per-item coverage), `58a1a2b` (legacy migration), `380bb7a` (giữ nợ phát sinh sau checkpoint).

## Claude/Codex handoff

- `CLAUDE.md` là entrypoint cho Claude Code.
- `AGENTS.md` là luật chung cho mọi AI agent.
- Claude giao task nên ghi rõ: goal, files allowed, files forbidden, acceptance tests, commit message.
- Codex không sửa file ngoài phạm vi task và chạy `npm run qa:codex` trước khi bàn giao nếu task có code change.
- Playwright vẫn do Claude main chạy bằng `npm run qa:claude`.

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
