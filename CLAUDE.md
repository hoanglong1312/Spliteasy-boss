# CLAUDE.md — Hướng dẫn làm việc với Claude Code

> Phần 1–5 là **quy tắc chuẩn** áp dụng cho mọi dự án.
> Phần 6–7 là **context riêng** của dự án này.

---

## Phần 1 — Công cụ bắt buộc (Required Tools)

### RTK — Rust Token Killer (Công cụ tiết kiệm token)
- **GitHub:** https://github.com/obra/rtk
- **Mục đích:** Tự động lọc output thừa của các lệnh shell, tiết kiệm 40–90% token
- **Cài đặt:** `brew install obra/tap/rtk` (macOS) hoặc xem README trên GitHub
- **Kiểm tra:** `rtk --version` và `rtk gain`

RTK đã được kích hoạt tự động qua hook Bash trong `~/.claude/settings.json`. Claude PHẢI:
- Ưu tiên dùng Bash cho lệnh hệ thống (git, ls, grep...) — RTK tự lọc output
- Không dùng `cat` cho file lớn — dùng tool `Read` hoặc `head`/`grep` qua Bash
- Chạy `rtk gain` để báo cáo hiệu quả khi được hỏi

### Superpowers — Bộ quy trình làm việc (Workflow Skills)
- **GitHub/Marketplace:** Cài qua Claude Code plugin marketplace — tìm `superpowers`
- **Mục đích:** Mỗi skill là một quy trình (workflow) bắt buộc cho từng loại công việc — giúp Claude làm đúng quy trình thay vì tự ý quyết định

Claude PHẢI tự động gọi đúng skill trước khi làm việc:

| Tình huống | Skill bắt buộc |
|-----------|---------------|
| Bắt đầu tính năng (feature) mới | `brainstorming` — khám phá yêu cầu trước |
| Có spec rồi, cần lập kế hoạch | `writing-plans` — chia nhỏ thành tasks |
| Thực thi kế hoạch đã có | `executing-plans` hoặc `subagent-driven-development` |
| Gặp lỗi (bug) bất kỳ | `systematic-debugging` — điều tra trước khi sửa |
| Trước khi báo "đã xong" | `verification-before-completion` — chạy kiểm tra thực tế |
| Nhận feedback về code | `receiving-code-review` — đánh giá kỹ trước khi sửa |
| Hoàn thành branch, chuẩn bị merge | `finishing-a-development-branch` |

---

## Phần 2 — Kiến trúc Multi-Agent (Multi-Agent Architecture)

```
Bạn (Product Owner)
        │
        ▼
  Claude Code  ◄── Orchestrator (Điều phối viên)
  ┌──────────────────────────────────────┐
  │  • Đọc spec/plan hiện có            │
  │  • Phân tích yêu cầu                │
  │  • Gọi Codex hoặc Sub-agents        │
  │  • Review chéo output               │
  │  • Tổng hợp → báo cáo cho bạn      │
  └──────────┬──────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
Claude Sub-agents  Codex MCP
(Agent tool)       (mcp__codex__codex)
• Tìm kiếm code   • Viết code mới
• Phân tích       • Sửa bugs
• Cross-check     • Tạo migrations
                  • Implement features
```

### Phân công mặc định
| Việc | Agent |
|------|-------|
| Đọc file, tìm kiếm, phân tích | Claude Sub-agent hoặc Codex (read-only) |
| Viết code, tạo file mới | Codex (`workspace-write`) |
| Fix bug phức tạp | Codex → Claude review |
| Review, tổng hợp, commit | Claude |

### Codex MCP — Cách gọi
```
Tool: mcp__codex__codex
sandbox: "read-only"       → chỉ đọc, không thay đổi gì
sandbox: "workspace-write" → được phép viết file
approval-policy: "never"   → chạy tự động không hỏi
```

---

## Phần 3 — Quy tắc Review Chéo (Cross-Review Rules)

Bất kỳ việc gì liên quan đến **code, database schema, kiến trúc (architecture)**:

1. **Codex làm/viết trước**
2. **Claude review lại** — tìm lỗi logic, bảo mật, hiệu năng
3. **Nếu có vấn đề** → sửa → review lại
4. **Chỉ khi đồng thuận** mới tổng hợp gửi cho người dùng

> Người dùng **chỉ nhận bản tóm tắt cuối** — không đọc output thô của từng agent.

---

## Phần 4 — Quy tắc giao tiếp (Communication Rules)

- **Luôn dùng tiếng Việt** khi giải thích với người dùng
- **Từ chuyên ngành kỹ thuật** — viết tiếng Việt trước, kèm tiếng Anh trong ngoặc:
  - ✅ "Kho lưu trữ trạng thái (state store)"
  - ✅ "Thành phần giao diện (component)"
  - ✅ "Hàm xử lý sự kiện (event handler)"
- **Tên file, hàm, biến** — giữ nguyên tiếng Anh (đó là tên trong code)
- **Người dùng mới tiếp quản dự án** — giải thích đủ ngữ cảnh, không giả định đã biết

---

## Phần 5 — Tài liệu dự án (Project Docs — luôn đọc trước khi làm)

```
docs/
├── data-shapes.md                          ← Cấu trúc 7 thực thể dữ liệu
├── superpowers/
│   ├── specs/
│   │   └── 2026-05-17-database-migration-design.md  ← Thiết kế database đã duyệt
│   └── plans/
│       ├── 2026-05-16-data-layer-analysis.md        ← Kế hoạch phân tích tầng data
│       └── 2026-05-17-plan1-supabase-setup.md       ← Kế hoạch setup Supabase (hiện tại)
```

---

## Phần 6 — Context Dự Án: SpliteasyBoss (Project Context)

### Bài toán đang giải quyết

**SpliteasyBoss** là ứng dụng web (web app) quản lý tài chính nhóm — chuyên dùng cho nhóm bạn bè chơi pickleball ở Việt Nam.

**Vấn đề thực tế:** Khi một nhóm 6–15 người chơi thể thao định kỳ, luôn phát sinh các bài toán tài chính:
- Ai đã trả tiền sân? Bao nhiêu? Chia như thế nào?
- Tháng này mỗi người phải đóng bao nhiêu?
- Khách vãng lai tính tiền ra sao?
- Cuối tháng ai còn nợ ai bao nhiêu?

Hiện tại các nhóm giải quyết bằng Excel, nhắn tin Zalo — dễ mất dữ liệu, khó minh bạch, thủ quỹ mất nhiều công ghi chép.

### Giải pháp

Web app chạy trên điện thoại (giao diện mobile-first), không cần cài đặt, vào bằng link hoặc mã nhóm. Hệ thống tự động tính toán, minh bạch cho tất cả thành viên.

### Người dùng (Users)

| Vai trò | Mô tả | Quyền |
|---------|-------|-------|
| **Thủ quỹ (Treasurer)** | 1–2 người, người ghi chép chính | Thêm/sửa/xóa/duyệt tất cả |
| **Thành viên (Member)** | Người chơi thường xuyên | Xem + đề xuất chi tiêu + RSVP |
| **Người xem (Viewer)** | Thành viên ít hoạt động | Chỉ xem |

### 3 Giao diện chính (Views)

```
1. Bảng nhóm chung (Group Dashboard)
   → Tất cả thành viên cùng xem
   → Tổng chi tiêu tháng, ai nợ ai, lịch buổi chơi

2. Dashboard cá nhân (Personal Dashboard)
   → Mỗi người có link riêng (personal token)
   → Số dư cá nhân, chi phí pickleball của mình, tổng kết tháng

3. Giao diện thủ quỹ (Treasurer View)
   → Duyệt chi tiêu chờ xử lý
   → Quản lý thành viên, cấu hình nhóm
```

### Stack kỹ thuật hiện tại

```
Frontend:  React (JSX), không có build step — CDN + Babel Standalone
           → CẦN MIGRATE sang Vite
Styles:    vb-tokens.css (Design tokens)
State:     localStorage → CẦN MIGRATE sang Supabase
Backend:   Không có → Supabase (PostgreSQL + RLS + Realtime)
```

### Tệp quan trọng

```
index.html             ← Điểm vào app
src/app.jsx            ← Shell chính, điều hướng màn hình
src/store.jsx          ← Kho trạng thái (state store) — sẽ thay bằng Supabase
src/data.jsx           ← Hàm tính tiền — sẽ chuyển thành Supabase queries
src/components.jsx     ← Thành phần giao diện (UI components) dùng chung
src/screen-home.jsx    ← Màn hình chính
src/screen-groups.jsx  ← Màn hình nhóm chi tiêu
src/screen-pickleball.jsx ← Màn hình CLB pickleball
src/screen-profile.jsx ← Màn hình hồ sơ cá nhân
src/vb-tokens.css      ← Design tokens (màu sắc, font, spacing)
```

---

## Phần 7 — Lộ trình phát triển (Development Roadmap)

### Giai đoạn hiện tại: Phase 1 — Nền tảng dữ liệu

```
Phase 0: Phân tích & Thiết kế         ✅ XONG
├── Bóc tách cấu trúc dữ liệu cũ
├── Brainstorm kiến trúc mới
└── Thiết kế database schema (đã duyệt)

Phase 1: Setup Database Supabase       🔄 ĐANG LÀM
├── Sub-plan 1: Tạo bảng + RLS        📋 Plan đã viết
├── Sub-plan 2: Auth & Access layer   ⏳ Chưa viết
└── Sub-plan 3: Frontend core         ⏳ Chưa viết

Phase 2: UI/UX Design                  ⏳ CHƯA BẮT ĐẦU
├── Thiết kế wireframe (khung giao diện) từng màn hình
├── Vẽ user flow (luồng người dùng): thủ quỹ / thành viên / viewer
├── Thiết kế component mới: approval badge, dispute flag, personal dashboard
└── Review với chủ dự án trước khi code

Phase 3: Frontend Migration            ⏳ SAU PHASE 2
├── Thay store.jsx → Supabase client
├── Thay data.jsx → Supabase queries
├── Migrate Vite build (bỏ CDN Babel)
└── Kết nối toàn bộ màn hình với database

Phase 4: Tính năng mới                 ⏳ SAU PHASE 3
├── Approval workflow (luồng duyệt chi tiêu)
├── Dispute system (báo sai sót)
├── Personal dashboard với token riêng
└── Tổng kết cuối tháng

Phase 5: Pickleball nâng cấp           ⏳ SAU PHASE 4
├── Migrate module pickleball sang Supabase
├── RSVP buổi chơi
└── Tính toán chi phí tháng tự động
```

### Về Phase 2 — UI/UX Design

Trước khi viết một dòng code frontend (giao diện) nào, cần thiết kế trước:

1. **Wireframe (Khung giao diện)** — vẽ sơ bộ từng màn hình trông như thế nào
2. **User Flow (Luồng người dùng)** — mô tả hành trình của từng loại người dùng:
   - Thủ quỹ: mở app → thấy gì → làm gì → kết thúc ở đâu
   - Thành viên: nhận link → vào app → thấy gì → đề xuất chi tiêu như thế nào
   - Người mới: nhập mã nhóm → join → trải nghiệm đầu tiên
3. **Component mới cần thiết kế:**
   - Badge "X chi tiêu chờ duyệt" của thủ quỹ
   - Nút "Báo sai" trên từng chi tiêu
   - Trang tổng kết cuối tháng của cá nhân
   - Màn hình onboarding khi nhập mã nhóm lần đầu

> Phase 2 dùng skill `brainstorming` kết hợp visual companion để thiết kế giao diện trước khi code.
