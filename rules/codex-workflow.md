# Codex Workflow Rules

## Nguyên tắc cốt lõi

**Superpowers = Planning phase. Codex = Execution phase. Claude main = Orchestrator + Quality Gate.**

Ba công cụ, ba vai trò rõ ràng — không overlap.

---

## Phân công vai trò

| Phase | Công cụ | Việc làm |
|-------|---------|----------|
| **Planning** | Superpowers (Claude plugin) | brainstorming → spec → writing-plans |
| **Execution** | Codex MCP | Viết/sửa code, commit, chạy lệnh |
| **Orchestration** | Claude main | Gọi đúng tool, review output, quality gate |

**Chi tiết:**

| Việc cụ thể | Ai làm |
|-------------|--------|
| Brainstorm feature, thiết kế approach | Superpowers `brainstorming` skill |
| Viết implementation plan | Superpowers `writing-plans` skill |
| Viết / sửa code (.jsx, .js, .sql, config) | **Codex MCP trực tiếp** |
| Đọc file source để hiểu context | **Codex** (trong workspace của nó) |
| Chạy git add / commit | **Codex** |
| Viết plan, spec, rules (.md) | Claude main (Edit/Write trực tiếp) |
| Quyết định kiến trúc / approach | Claude main (trước khi giao Codex) |
| Review output + chỉ ra lỗi | Claude main (adversarial review) |
| Fix sau review | **Codex** (nhận feedback từ Claude) |
| Static audit + Playwright | Claude main (quality gate) |

> **Superpowers `subagent-driven-development` KHÔNG dùng** trong dự án này — Codex thay thế hoàn toàn vai trò implementer subagent. Các skill superpowers khác (brainstorming, writing-plans) vẫn dùng bình thường.

> **Superpowers chỉ chạy trên Claude Code** — không cài được trên Codex. Mọi guidance cho Codex được nhúng vào prompt hoặc qua `~/.codex/AGENTS.md`.

---

## Luồng làm việc đầy đủ

```
[Feature mới]
1. Superpowers brainstorming → spec doc
2. Superpowers writing-plans → plan doc
3. Gọi Codex từng task → Codex tự đọc file, implement, commit
4. Claude main review (adversarial)
5. Nếu có vấn đề: gọi Codex lại với feedback cụ thể
6. Quality Gate: static audit + npx playwright test
7. Chỉ khi pass hết → bàn giao user test

[Bug fix / small change]
1. Claude main phân tích nguyên nhân (git log, git diff)
2. Gọi Codex fix trực tiếp
3. Quality Gate rút gọn: npm run build + playwright test
```

---

## Cách gọi Codex

```
Tool: mcp__codex__codex
sandbox: "workspace-write"
approval-policy: "never"
```

Prompt Codex phải có:
- **Goal** rõ ràng (làm gì, tại sao)
- **Danh sách file** cần đọc / sửa
- **Constraints** (không được break X, phải tương thích với Y)
- **Lệnh git commit** cuối

Codex tự đọc file để lấy context — không cần paste code vào prompt.

---

## Khi nào Claude main quyết định trước khi giao Codex

Với **quyết định kiến trúc** (không phải implementation), Claude main quyết định rồi mới giao:

```
Ví dụ:
- "Nên dùng pattern gì cho X?" → Claude quyết định → Codex implement
- "Chia file thế nào cho feature mới?" → Claude quyết định → Codex implement
- "Bug này nguyên nhân từ đâu?" → Claude phân tích git log → Codex fix
```

Với **implementation task** dù đơn giản hay phức tạp:

```
Ví dụ:
- Thêm field / route / case
- Sửa logic trong component
- Refactor nhiều file
- Viết component mới phức tạp
- Debug + fix sau khi đã biết nguyên nhân
```

→ Gọi Codex trực tiếp, cung cấp đủ context trong prompt.

---

## Supabase MCP — Claude chủ động dùng, không hỏi user

Supabase MCP (`mcp__supabase__*`) đã được cấu hình. Claude **tự làm** mà không cần hỏi:

| Việc | Tool |
|------|------|
| Apply migration (.sql) | `mcp__supabase__apply_migration` |
| Query / debug data | `mcp__supabase__execute_sql` |
| Kiểm tra schema | `mcp__supabase__list_tables` |
| Check logs | `mcp__supabase__get_logs` |
| Test RLS, simulate data | `mcp__supabase__execute_sql` |

**Quy tắc:**
- Không bao giờ bảo user "vào dashboard chạy SQL này" — tự làm luôn
- Apply migration xong → báo kết quả ngắn gọn
- Dùng MCP để simulate/test trước khi đưa cho user

---

## Quality Gate — Bắt buộc trước khi bàn giao user test

**Mỗi lần Codex xong feature / fix, Claude main phải chạy đủ 2 bước này trước khi báo user:**

### Bước 1: Static Audit (Codex tự làm)

Gọi Codex với goal: rà soát toàn bộ screens — kiểm tra:
- Mọi prop screen nhận có match với data hook trả về không
- Mọi `onAction(type)` call có handler tương ứng trong `app-v2.jsx` không
- Mọi import có tồn tại không
- Form inputs có controlled (useState + onChange) không

Codex báo cáo: danh sách issue (nếu có) → Claude main đánh giá → Codex fix → lặp

### Bước 2: E2E Tests (Playwright)

Chạy: `npx playwright test --reporter=line`

Nếu test fail → Codex fix → chạy lại → lặp đến khi pass

**Chỉ khi:** `vite build` ✅ + static audit ✅ + Playwright ✅ → mới bàn giao user test

> User chỉ cần test những gì **không thể tự động**: visual/UX judgment, Supabase auth thật, edge case cảm tính

---

## Token discipline — Main session KHÔNG làm

- ❌ Đọc file source code để lấy context
- ❌ Paste toàn bộ nội dung file vào prompt Codex
- ❌ Dùng Edit/Write cho file .jsx/.js/.sql
- ❌ Dispatch Claude subagent làm middleman
- ❌ Bảo user tự chạy SQL / apply migration khi đã có Supabase MCP

## Main session CHỈ làm

- ✅ Đọc git log / git SHA / git diff
- ✅ Viết / sửa file .md (plan, spec, rules)
- ✅ Gọi Codex với prompt rõ goal + file paths + constraints
- ✅ Review output của Codex (adversarial)
- ✅ Gửi feedback cụ thể lại cho Codex nếu có vấn đề
- ✅ Quyết định kiến trúc / approach trước khi giao Codex
- ✅ Dùng Supabase MCP cho mọi thao tác database
