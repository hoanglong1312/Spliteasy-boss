# Supabase MCP Rules — SpliteasyBoss

Supabase MCP (`mcp__supabase__*`) đã được cấu hình. Claude **tự làm** mà không cần hỏi user.

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
