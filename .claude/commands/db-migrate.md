---
description: DB migration + RLS — ai viết SQL (Codex), ai apply (Claude MCP-write), verify. Dùng khi có schema change hoặc RLS policy.
---

# /db-migrate — DB / RLS

## Phân công cứng

| Việc | Ai |
|---|---|
| Viết SQL migration file | **Codex** |
| Apply migration | **Claude** (`mcp__supabase__apply_migration`) — MCP-write |
| Verify kết quả | **Claude** (`mcp__supabase__execute_sql` SELECT) |
| Tra schema khi viết SQL | Codex (read-only MCP nếu có) |

## Codex read-only Supabase (recommended)

`.codex/config.toml`:
```toml
[mcp_servers.supabase-readonly]
command = "npx"
args = ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "${SUPABASE_ACCESS_TOKEN}", "--read-only"]
```
Codex tự `list_tables` / SELECT → ít ASSUMPTION. Write vẫn Claude.

## Migration test (schema change)

1. Forward migration chạy (old → new).
2. Data preserved (COUNT before/after).
3. Rollback works.
4. Backwards compat (old code đọc new schema).

Claude verify cả 4 pass, no data loss.

## Security (bảng mới)

- RLS policy có chưa? Cover đủ anon/authenticated/service_role?
- Query theo ID có `WHERE user_id = auth.uid()`? (IDOR)
- Raw query nối chuỗi user input? → parameterized.
