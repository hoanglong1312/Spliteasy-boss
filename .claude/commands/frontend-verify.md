---
description: UI verify trên localhost — Vite build, cmux browser snapshot, Playwright interaction. Dùng khi có UI change (project FE).
---

# /frontend-verify — UI verify localhost

Verify UI trên localhost TRƯỚC khi deploy.

## Flow

1. Dev server: `npm run dev` (background, mặc định :5173).
2. `cmux browser goto http://localhost:5173` → `snapshot` / `screenshot` → confirm visual (layout, render).
3. Task có interaction (form, click, nav, auth) → invoke `playwright-testing` → viết test → chạy → confirm pass.
4. Chỉ deploy khi localhost pass.

## Tool selection

| Test | Tool | Subagent? |
|---|---|---|
| Tìm lỗi (DOM/network/console) | `cmux browser snapshot/eval` | ✅ output nặng |
| Confirm fix pass | Playwright | ❌ main context |
| Playwright fail, xem browser | Playwright `--headed` | ✅ có screenshot |

**Không mở Chrome mới.** Dùng cmux in-app browser (`⌘⇧L` split pane; CLI `cmux browser <snapshot|click|eval|goto|...>`).

## Vite (standard)

Project FE mới: `npm create vite@latest <tên> -- --template react-ts`. Không CRA, không Webpack trừ project cũ. Dev :5173, build → `dist/`.

## Deploy fallback (Vercel webhook broken)

`git push` không trigger deploy sau 2 phút:
```bash
curl -s <prod-url> | grep -o 'assets/index-[^"]*\.js'   # hash cũ → CLI
vercel --prod
```

## Playwright launch fail

"browser not found" / timeout 30s → fallback: chạy unit test thay; không có → manual checklist trong commit ("tested manually [date]").
