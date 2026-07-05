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

Đây là nội dung cụ thể mà `/ship` (`.claude/commands/ship.md`, xem Definition of Done ở `code-project.md`) chạy cho project này — không phải bước tùy chọn thêm.

**Bước 1: Static Audit (Codex tự làm)**
Gọi Codex rà soát toàn bộ screens: prop match, `onAction` handler tồn tại, import hợp lệ, form controlled. Codex báo cáo → Claude đọc adversarial → nếu có issue → gọi Codex fix → lặp lại.

**Bước 2: Test suite** — lệnh cụ thể + pass condition → `rules/testing.md` (single source, không restate ở đây).

**Checklist bắt buộc:** khi task đụng `.jsx`/`.sql`/migration, `TaskCreate` ngay checklist gồm các bước Quality Gate liên quan (vd: apply migration, verify data, static audit, unit test, Playwright). Không báo "xong"/tạo commit khi `TaskList` còn task pending thuộc checklist này.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Spliteasy-boss** (2869 symbols, 7468 relationships, 227 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Spliteasy-boss/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Spliteasy-boss/clusters` | All functional areas |
| `gitnexus://repo/Spliteasy-boss/processes` | All execution flows |
| `gitnexus://repo/Spliteasy-boss/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
