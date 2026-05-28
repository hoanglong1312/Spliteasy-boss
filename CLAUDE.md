# CLAUDE.md — SpliteasyBoss

**Ngôn ngữ:** Thuật ngữ kỹ thuật ưu tiên tiếng Việt + ngoặc tiếng Anh. Ví dụ: kho trạng thái (store), di chuyển cơ sở dữ liệu (migration), chính sách bảo mật hàng (RLS).

@~/.claude/templates/code-project.md
@rules/supabase.md
@rules/testing.md
@context/architecture.md
@docs/architecture/identity-model.md

## Project-Specific Rules

### Constraints Đặc Thù

**Identity Source of Truth:** Bắt buộc đọc `docs/architecture/identity-model.md` trước mọi task liên quan member/profile/auth/PIN/avatar/bank/role/expense participant/attendance/share link. Mặc định: dữ liệu cá nhân dùng `profile_id`; dữ liệu trong một nhóm dùng `member.id + group_id`; `state.currentUserId` là `member.id`, không phải `profile.id`.

**Git Lock song song:** Hai Codex session đồng thời có thể tranh `.git/index.lock` → Claude main commit thủ công khi Codex báo lỗi lock:
```bash
git add [files Codex báo]
git commit -m "[message Codex đề xuất]"
```

**Browser Debugging:** Ưu tiên Browser/Playwright cho reproduce/verify UI. Dùng Chrome DevTools MCP khi cần console, network request/response, Supabase payload, storage hoặc performance. Nếu Playwright không chạy được trong Claude Code, Chrome DevTools MCP là fallback để kiểm tra localhost bằng Chrome profile tách biệt. MCP này chạy qua Node bundle của Codex runtime vì package yêu cầu Node `20.19.0+`.

### Quality Gate — Bắt Buộc Trước Khi Bàn Giao User

**Bước 1: Static Audit (Codex tự làm)**
Gọi Codex rà soát toàn bộ screens: prop match, `onAction` handler tồn tại, import hợp lệ, form controlled. Codex báo cáo → Claude đọc adversarial → nếu có issue → gọi Codex fix → lặp lại.

**Bước 2: E2E Tests**
Claude main chạy trực tiếp (Codex không chạy được — EPERM):
```bash
npx playwright test --reporter=line
```

**Pass condition:** `npm run build` ✅ + static audit ✅ + Playwright ✅
