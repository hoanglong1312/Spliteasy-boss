# Codex Workflow Rules

## Nguyên tắc cốt lõi

**Codex làm tất cả code. Claude = Project Manager (spec + review + debate).**

---

## Phân công vai trò

| Việc | Ai làm |
|------|--------|
| Viết / sửa code (.jsx, .js, .sql, config) | **Codex MCP trực tiếp** |
| Đọc file source để hiểu context | **Codex** (trong workspace của nó) |
| Chạy git add / commit | **Codex** |
| Viết plan, spec, rules (.md) | Claude main (Edit/Write trực tiếp) |
| Quyết định kiến trúc / approach | Claude main (trước khi giao Codex) |
| Review output + chỉ ra lỗi | Claude main (adversarial review) |
| Fix sau review | **Codex** (nhận feedback từ Claude) |

> Claude subagent **không còn cần thiết** — Codex tự đọc file và reason trong workspace của nó.

---

## Luồng làm việc

```
1. Claude main viết goal + context hints (file paths, constraints)
2. Gọi Codex → Codex tự đọc file, implement, commit
3. Claude main review output (adversarial — chỉ ra vấn đề)
4. Nếu có vấn đề: gọi Codex lại với feedback cụ thể
5. Lặp đến khi Claude main approve
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
