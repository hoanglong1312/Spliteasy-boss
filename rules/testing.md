# Testing Rules — SpliteasyBoss

Nội dung lệnh cụ thể mà `.claude/commands/verify.md` (`/verify`) và `/ship` chạy cho project này (xem `CLAUDE.md` → Quality Gate).

## Lệnh Chạy Test

### Unit Tests (Vitest) — Codex chạy được
```bash
npm test
```
- Vitest `v4.1.8`, 265ms, không cần browser
- Test file: `src/hooks/useScreenData.test.js` — 9 tests cho `attendanceByMemberId`, `effectiveSessionMemberIds`, `memberWaterShare`
- Codex tự loop: fix → `npm test` → fix → `npm test`
- Khi sửa 3 functions trên → thêm test tương ứng

### E2E Tests (Playwright) — chỉ Claude main chạy được
```bash
npx playwright test --reporter=line
```
⚠️ Codex sandbox EPERM khi bind port.

**Pass condition:** `npm run build` ✅ + `npm test` ✅ + Playwright ✅

## UI Verification — Dùng localhost trước khi deploy

Với thay đổi UI, verify trên localhost trước để tránh deploy vòng.

**Tool duy nhất: `cmux browser` qua Bash** (WKWebView tích hợp cmux). Hỗ trợ: click, fill, screenshot, snapshot DOM, console logs (`console list`), JS eval. **Không hỗ trợ** `network requests` trên WKWebView (đã test thực tế, báo `not_supported`) — cần bắt network thì dùng Playwright (`page.on('request')`).

Chrome DevTools MCP đã bị xóa khỏi `.mcp.json`. Không dùng lại trừ khi cần heap snapshot hoặc Lighthouse.

### Workflow cmux browser

```bash
# 1. Chạy dev server (nếu chưa chạy)
npm run dev &

# 2. Mở browser surface — trả về surface handle
cmux browser open http://localhost:5173
# → OK surface=surface:N pane=pane:M placement=reuse

# 3. Snapshot xem UI (dùng handle từ bước 2)
cmux browser surface:N snapshot --compact

# 4. Navigate đến page cụ thể
cmux browser surface:N goto http://localhost:5173/path

# 5. Interact: click, fill, type
cmux browser surface:N click [ref=eX]
cmux browser surface:N fill [ref=eX] "text"

# 6. Screenshot để xem visual
cmux browser surface:N screenshot

# 7. Wait sau action
cmux browser surface:N wait --text "Done" --timeout-ms 5000
```

**Lưu ý:**
- `cmux browser open` reuse surface nếu URL cùng origin — không mở tab mới mỗi lần
- Surface handle (`surface:N`) chỉ valid trong session cmux hiện tại
- Dùng `--compact` cho snapshot ngắn, bỏ `--compact` khi cần full a11y tree
- Localhost không bị PIN gate như production → Claude có thể tự verify

**Chỉ deploy khi localhost đã pass.**
