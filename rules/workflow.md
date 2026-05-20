# Workflow Overrides — SpliteasyBoss

*Project-specific overrides. Quy trình chung xem `~/.claude/templates/code-project.md`.*

---

## Superpowers Skills — Cái Nào Dùng Trong Project Này

| Skill | Áp dụng |
|-------|---------|
| `brainstorming` | ✅ Claude main dùng trước mọi feature mới |
| `writing-plans` | ✅ Claude main dùng sau brainstorm |
| `systematic-debugging` | ✅ Claude main dùng để phân tích bug |
| `verification-before-completion` | ✅ Claude main dùng trước khi báo xong |
| `test-driven-development` | ❌ Codex tự handle — không invoke trong main session |
| `subagent-driven-development` | ❌ Codex thay thế — không invoke trong main session |
| `requesting-code-review` | ❌ Thay bằng Quality Gate trong `rules/testing.md` |

---

## Constraints Đặc Thù

### Sandbox EPERM
Codex `workspace-write` sandbox không bind được network port.  
→ **Không** yêu cầu Codex chạy `npx playwright test` hay khởi động dev server.  
→ Codex chỉ chạy `npm run build`. Claude main chạy Playwright trực tiếp.

### Git Lock Khi Chạy Codex Song Song
Hai Codex session đồng thời có thể tranh `.git/index.lock` → một session không commit được.  
→ Claude main commit thủ công khi Codex báo lỗi lock:
```bash
git add [files Codex báo]
git commit -m "[message Codex đề xuất]"
```

### Emergency Fallback
Nếu Codex lỗi/không khả dụng: Claude main dùng Edit/Write trực tiếp, ghi chú lý do trong commit message.
