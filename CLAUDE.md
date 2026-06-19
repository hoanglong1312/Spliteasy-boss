# CLAUDE.md — SpliteasyBoss

**Ngôn ngữ:** Thuật ngữ kỹ thuật ưu tiên tiếng Việt + ngoặc tiếng Anh. Ví dụ: kho trạng thái (store), di chuyển cơ sở dữ liệu (migration), chính sách bảo mật hàng (RLS).

@~/.claude/templates/code-project.md
@rules/supabase.md
@rules/testing.md
@rules/deploy.md
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

**Browser Debugging:** Dùng `cmux browser` qua Bash — WKWebView tích hợp, hỗ trợ click/fill/screenshot/snapshot/console/network. Xem workflow đầy đủ trong `rules/testing.md`. Chrome DevTools MCP đã bị xóa. Playwright là E2E test framework, không phải browser verify tool.

### Token Discipline Cho Bug Nhỏ

Bug nhỏ (1-2 file, triệu chứng rõ, không cần DB/RLS/MCP) dùng fast path:
1. Locate bằng `grep -n` / search targeted trước; không `Read` nguyên file source/test lớn.
2. Chỉ `Read` với `offset` + `limit` quanh match, hoặc đọc file nhỏ dưới ~200 dòng.
3. Nếu fix cần sửa `.jsx/.js/.sql`, ưu tiên giao Codex: root cause ngắn + file nghi ngờ + expected behavior + verification.
4. Claude main chỉ tự sửa khi patch hẹp, file nhỏ, hoặc Codex fail 2+ lần cùng symptom.
5. Test targeted trước; chỉ chạy full build/E2E sau khi fix xanh hoặc trước bàn giao.
6. Không dùng codegraph/context rộng cho bug nhỏ trừ khi user hỏi kiến trúc/trace hoặc cần cross-file flow.

### Quality Gate — Bắt Buộc Trước Khi Bàn Giao User

**Bước 1: Static Audit (Codex tự làm)**
Gọi Codex rà soát toàn bộ screens: prop match, `onAction` handler tồn tại, import hợp lệ, form controlled. Codex báo cáo → Claude đọc adversarial → nếu có issue → gọi Codex fix → lặp lại.

**Bước 2: E2E Tests**
Claude main chạy trực tiếp (Codex không chạy được — EPERM):
```bash
npx playwright test --reporter=line
```

**Pass condition:** `npm run build` ✅ + static audit ✅ + Playwright ✅
