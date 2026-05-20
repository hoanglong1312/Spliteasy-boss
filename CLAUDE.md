# CLAUDE.md — SpliteasyBoss

**Ngôn ngữ:** Thuật ngữ kỹ thuật ưu tiên tiếng Việt + ngoặc tiếng Anh. Ví dụ: kho trạng thái (store), di chuyển cơ sở dữ liệu (migration), chính sách bảo mật hàng (RLS).

@~/.claude/templates/code-project.md
@rules/supabase.md
@rules/testing.md
@context/architecture.md

## Project-Specific Rules

### Constraints Đặc Thù

**Sandbox EPERM:** Codex `workspace-write` không bind được network port → không yêu cầu Codex chạy `npx playwright test` hay khởi động dev server. Codex chỉ chạy `npm run build`. Claude main chạy Playwright trực tiếp.

**Git Lock song song:** Hai Codex session đồng thời có thể tranh `.git/index.lock` → Claude main commit thủ công khi Codex báo lỗi lock:
```bash
git add [files Codex báo]
git commit -m "[message Codex đề xuất]"
```

**Emergency Fallback:** Nếu Codex lỗi/không khả dụng → Claude main dùng Edit/Write trực tiếp, ghi chú lý do trong commit message.

### Quality Gate — Bắt Buộc Trước Khi Bàn Giao User

**Bước 1: Static Audit (Codex tự làm)**
Gọi Codex rà soát toàn bộ screens: prop match, `onAction` handler tồn tại, import hợp lệ, form controlled. Codex báo cáo → Claude đọc adversarial → nếu có issue → gọi Codex fix → lặp lại.

**Bước 2: E2E Tests**
Claude main chạy trực tiếp (Codex không chạy được — EPERM):
```bash
npx playwright test --reporter=line
```

**Pass condition:** `npm run build` ✅ + static audit ✅ + Playwright ✅
