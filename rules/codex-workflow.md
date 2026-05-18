# Codex Workflow Rules

## Nguyên tắc cốt lõi

**Codex làm code. Claude orchestrate + review.**

---

## Phân công vai trò

| Việc | Ai làm |
|------|--------|
| Viết / sửa code (.jsx, .js, .sql, config) | **Codex MCP trực tiếp** |
| Đọc file source để hiểu context | Codex (trong prompt), không phải Claude main |
| Chạy git add / commit | Codex |
| Viết plan, spec, rules (.md) | Claude main (Edit/Write trực tiếp) |
| Review kết quả sau khi Codex làm | Claude main hoặc Claude subagent |
| Task phức tạp, nhiều file, cần reasoning | Claude subagent → gọi Codex |

---

## Khi nào dùng Codex trực tiếp (không qua subagent)

Task **cơ học** — clear spec, 1–3 file, không cần phán đoán kiến trúc:

```
Ví dụ:
- "Thêm field X vào function Y trong file Z"
- "Sửa import ở đầu file A"
- "Thêm case X vào switch trong store.jsx"
- "Thêm route mới vào app.jsx"
```

→ Gọi `mcp__codex__codex` trực tiếp từ main session, không dispatch subagent.

## Khi nào dùng Claude subagent → Codex

Task cần reasoning hoặc đọc nhiều file trước khi viết:

```
Ví dụ:
- Debug bug không rõ nguyên nhân
- Refactor cần hiểu dependency giữa nhiều file
- Viết component mới phức tạp (>100 lines logic)
- Task có thể có nhiều cách implement
```

→ Dispatch Claude subagent với prompt rõ goal, để subagent đọc file + gọi Codex.

---

## Cách gọi Codex

```
Tool: mcp__codex__codex
sandbox: "workspace-write"
approval-policy: "never"
```

Prompt Codex phải có:
- Đường dẫn file chính xác
- Đoạn code cần tìm (để Codex biết chính xác chỗ sửa)
- Đoạn code thay thế
- Lệnh git commit cuối

---

## Token discipline — Main session KHÔNG làm

- ❌ Đọc file source code để lấy context
- ❌ Paste toàn bộ nội dung file vào prompt subagent
- ❌ Dùng Edit/Write cho file .jsx/.js/.sql
- ❌ Dispatch subagent cho task cơ học (thêm 1 field, 1 route)

## Main session CHỈ làm

- ✅ Đọc git log / git SHA
- ✅ Viết / sửa file .md (plan, spec, rules)
- ✅ Dispatch Codex hoặc subagent với prompt ngắn gọn
- ✅ Review report từ Codex/subagent
- ✅ Orchestrate thứ tự task
