# B1 Realtime Sync + Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When another member adds, edits, or deletes an expense, open clients refresh data and show a bottom toast without manual reload.

**Architecture:** `AppProvider` owns toast state and the Supabase Realtime subscription. It subscribes after an authenticated member is available, listens to `postgres_changes` on `public.expenses`, ignores rows authored by the current user, schedules the existing normalized refresh path, and dispatches `SHOW_TOAST`. `AppV2` reads `state.toast` and renders a fixed bottom overlay with inline styles.

**Tech Stack:** React 18 hooks, Vite, Supabase JS v2 Realtime `postgres_changes`, Node `node:test` source-level tests, Playwright final smoke test run only by Claude main.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/store-realtime.test.mjs` | Create | Source-level TDD coverage for store-owned toast state and expenses realtime subscription. |
| `src/store.jsx` | Modify | Add toast state/actions, realtime helper functions, lifecycle cleanup, and replace the existing broadcast listener with `postgres_changes` on `expenses`. |
| `src/app-v2.test.mjs` | Modify | Keep existing PIN test and add coverage for the `state.toast` overlay and removal of the legacy toast bridge. |
| `src/app-v2.jsx` | Modify | Render a fixed bottom toast overlay using inline styles only. |
| `src/main.jsx` | Modify | Remove legacy `ToastProvider` bridge and render `AppProvider` directly. |
| `src/lib/toast.jsx` | Delete | Remove the old provider-based toast implementation so toast state lives in the store as required. |

## Execution Notes

- Executor runs Node source tests and `npm run build`.
- Executor does not run Playwright.
- Claude main runs final QA with:

```bash
npx playwright test --reporter=line
```

---

### Task 1: Store Toast State And Actions

**Files:**
- Create: `src/store-realtime.test.mjs`
- Modify: `src/store.jsx`

- [ ] **Step 1: Write the failing store toast test**

Create `src/store-realtime.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')

test('store owns toast state and hide lifecycle', () => {
  assert.match(storeSource, /const TOAST_HIDE_DELAY_MS = 3000/)
  assert.match(storeSource, /toast:\s*\{\s*visible:\s*false,\s*message:\s*''\s*\}/)
  assert.match(storeSource, /const toastTimerRef = useRef\(null\)/)
  assert.match(storeSource, /case 'SHOW_TOAST':\s*\{/)
  assert.match(storeSource, /case 'HIDE_TOAST':\s*\{/)
  assert.match(storeSource, /setTimeout\(\(\) => \{\s*toastTimerRef\.current = null\s*dispatch\(\{ type: 'HIDE_TOAST' \}\)\s*\}, TOAST_HIDE_DELAY_MS\)/)
  assert.match(storeSource, /if \(toastTimerRef\.current\) clearTimeout\(toastTimerRef\.current\)/)
})
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test src/store-realtime.test.mjs
```

Expected: FAIL because `TOAST_HIDE_DELAY_MS`, `toast`, `toastTimerRef`, `SHOW_TOAST`, and `HIDE_TOAST` do not exist yet.

- [ ] **Step 3: Add the toast constant**

In `src/store.jsx`, after `const AppContext = createContext(null)`, add:

```js
const TOAST_HIDE_DELAY_MS = 3000
```

- [ ] **Step 4: Add toast to the empty state**

In `buildEmptyState()`, add `toast` before `_loading`:

```js
    toast: { visible: false, message: '' },
```

The end of `buildEmptyState()` should include:

```js
    homeMonthError: null,
    _allPickle: null,
    toast: { visible: false, message: '' },
    _loading: false,
    _error: null,
  }
}
```

- [ ] **Step 5: Preserve toast through normalized refreshes**

In `normalize()`, add `toast` to `baseState` before `_loading`:

```js
    toast: { visible: false, message: '' },
```

In `refresh`, replace:

```js
        setState(next)
```

with:

```js
        const nextState = {
          ...next,
          toast: stateRef.current.toast || buildEmptyState().toast,
        }
        stateRef.current = nextState
        setState(nextState)
```

- [ ] **Step 6: Add the toast timer ref**

In `AppProvider`, after `const debounceRef = useRef(null)`, add:

```js
  const toastTimerRef = useRef(null)
```

The refs should read:

```js
  const tokenRef = useRef(storedToken)
  const channelRef  = useRef(null)
  const debounceRef = useRef(null)
  const toastTimerRef = useRef(null)
  const stateRef    = useRef(state)
```

- [ ] **Step 7: Add timer cleanup on unmount**

After the existing `useEffect(() => { stateRef.current = state })`, add:

```js
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])
```

- [ ] **Step 8: Add SHOW_TOAST and HIDE_TOAST actions**

At the top of the `switch (action.type)` block in `dispatch`, before `case 'FETCH_HOME_MONTH_SUCCESS':`, add:

```js
      case 'SHOW_TOAST': {
        const message = String(action.message || '').trim()
        if (!message) return null
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        const next = {
          ...stateRef.current,
          toast: { visible: true, message },
        }
        stateRef.current = next
        setState(next)
        toastTimerRef.current = setTimeout(() => {
          toastTimerRef.current = null
          dispatch({ type: 'HIDE_TOAST' })
        }, TOAST_HIDE_DELAY_MS)
        return next.toast
      }

      case 'HIDE_TOAST': {
        const next = {
          ...stateRef.current,
          toast: {
            visible: false,
            message: stateRef.current.toast?.message || '',
          },
        }
        stateRef.current = next
        setState(next)
        return next.toast
      }
```

- [ ] **Step 9: Clear toast timer on logout**

In `case 'LOGOUT':`, before `clearAuth()`, add:

```js
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current)
          toastTimerRef.current = null
        }
```

The case should begin:

```js
      case 'LOGOUT': {
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current)
          toastTimerRef.current = null
        }
        clearAuth()
        tokenRef.current = null
        setState(buildEmptyState())
        break
      }
```

- [ ] **Step 10: Run the store toast test**

Run:

```bash
node --test src/store-realtime.test.mjs
```

Expected: PASS.

- [ ] **Step 11: Build check**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 12: Commit**

Run:

```bash
git add src/store-realtime.test.mjs src/store.jsx
git commit -m "feat: add store-managed toast state"
```

---

### Task 2: Expenses Realtime Subscription

**Files:**
- Modify: `src/store-realtime.test.mjs`
- Modify: `src/store.jsx`

- [ ] **Step 1: Extend the failing realtime test**

Replace `src/store-realtime.test.mjs` with:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')

test('store owns toast state and hide lifecycle', () => {
  assert.match(storeSource, /const TOAST_HIDE_DELAY_MS = 3000/)
  assert.match(storeSource, /toast:\s*\{\s*visible:\s*false,\s*message:\s*''\s*\}/)
  assert.match(storeSource, /const toastTimerRef = useRef\(null\)/)
  assert.match(storeSource, /case 'SHOW_TOAST':\s*\{/)
  assert.match(storeSource, /case 'HIDE_TOAST':\s*\{/)
  assert.match(storeSource, /setTimeout\(\(\) => \{\s*toastTimerRef\.current = null\s*dispatch\(\{ type: 'HIDE_TOAST' \}\)\s*\}, TOAST_HIDE_DELAY_MS\)/)
  assert.match(storeSource, /if \(toastTimerRef\.current\) clearTimeout\(toastTimerRef\.current\)/)
})

test('store subscribes to expenses postgres changes and ignores current user events', () => {
  assert.match(storeSource, /export function getExpenseRealtimeAuthorId\(row = \{\}\) \{/)
  assert.match(storeSource, /return row\.created_by \?\? row\.submitted_by_member_id \?\? null/)
  assert.match(storeSource, /export function isExpenseRealtimeFromCurrentUser\(payload, currentUserId\) \{/)
  assert.match(storeSource, /\[payload\?\.new, payload\?\.old\]\.some\(row => String\(getExpenseRealtimeAuthorId\(row\)\) === String\(currentUserId\)\)/)
  assert.match(storeSource, /export function expenseRealtimeToastMessage\(payload, members = \[\]\) \{/)
  assert.match(storeSource, /case 'INSERT':[\s\S]*vừa thêm chi tiêu mới/)
  assert.match(storeSource, /case 'UPDATE':[\s\S]*Chi tiêu vừa được cập nhật/)
  assert.match(storeSource, /case 'DELETE':[\s\S]*Một chi tiêu đã bị xóa/)
  assert.match(storeSource, /channel\('expenses-realtime'\)/)
  assert.match(storeSource, /\.on\('postgres_changes', \{\s*event: '\*',\s*schema: 'public',\s*table: 'expenses',\s*\}/)
  assert.match(storeSource, /if \(isExpenseRealtimeFromCurrentUser\(payload, stateRef\.current\.currentUserId\)\) return/)
  assert.match(storeSource, /scheduleRefresh\(\)/)
  assert.match(storeSource, /dispatch\(\{ type: 'SHOW_TOAST', message \}\)/)
  assert.doesNotMatch(storeSource, /\.on\('broadcast', \{ event: 'data_changed' \}/)
})
```

- [ ] **Step 2: Run the failing realtime test**

Run:

```bash
node --test src/store-realtime.test.mjs
```

Expected: FAIL because the helper functions and `postgres_changes` subscription do not exist yet, and the old broadcast listener still exists.

- [ ] **Step 3: Add realtime helper functions**

In `src/store.jsx`, after `disambiguateMembers()` and before `randomInviteCode()`, add:

```js
export function getExpenseRealtimeAuthorId(row = {}) {
  return row.created_by ?? row.submitted_by_member_id ?? null
}

export function isExpenseRealtimeFromCurrentUser(payload, currentUserId) {
  if (!currentUserId) return false
  return [payload?.new, payload?.old].some(row => String(getExpenseRealtimeAuthorId(row)) === String(currentUserId))
}

export function expenseRealtimeToastMessage(payload, members = []) {
  const eventType = payload?.eventType || payload?.event_type
  switch (eventType) {
    case 'INSERT': {
      const authorId = getExpenseRealtimeAuthorId(payload?.new || {})
      const member = safeArray(members).find(m => String(m.id) === String(authorId))
      const name = member?.displayName || member?.name || 'Ai đó'
      return `${name} vừa thêm chi tiêu mới`
    }
    case 'UPDATE':
      return 'Chi tiêu vừa được cập nhật'
    case 'DELETE':
      return 'Một chi tiêu đã bị xóa'
    default:
      return ''
  }
}
```

- [ ] **Step 4: Remove the legacy toast callback prop from the store**

Change the `AppProvider` signature from:

```js
export function AppProvider({ children, onToast }) {
```

to:

```js
export function AppProvider({ children }) {
```

- [ ] **Step 5: Remove the existing broadcast subscription effect**

Delete the `useEffect` block that begins with:

```js
  useEffect(() => {
    const groupId = stateRef.current.currentGroupId
    const token   = tokenRef.current
    if (!groupId || !token) return
```

and ends with:

```js
  }, [state.currentGroupId, scheduleRefresh, onToast])
```

This removes the old `.on('broadcast', { event: 'data_changed' }, ...)` listener and its `onToast(...)` calls.

- [ ] **Step 6: Add the expenses realtime subscription effect**

Insert this `useEffect` after the `dispatch` `useCallback` block and before the final provider `return`:

```js
  useEffect(() => {
    const token = tokenRef.current
    if (!state.currentUserId || !token) return

    const sb = createSupabase(token)
    const channel = sb
      .channel('expenses-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
      }, (payload) => {
        if (isExpenseRealtimeFromCurrentUser(payload, stateRef.current.currentUserId)) return

        scheduleRefresh()
        const message = expenseRealtimeToastMessage(payload, stateRef.current.members)
        if (message) dispatch({ type: 'SHOW_TOAST', message })
      })
      .subscribe((status, err) => {
        if (err) {
          console.error('[expenses-realtime]', status, err)
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [state.currentUserId, scheduleRefresh, dispatch])
```

- [ ] **Step 7: Run the realtime test**

Run:

```bash
node --test src/store-realtime.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Build check**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/store-realtime.test.mjs src/store.jsx
git commit -m "feat: subscribe to expenses realtime changes"
```

---

### Task 3: App Toast Overlay And Legacy Cleanup

**Files:**
- Modify: `src/app-v2.test.mjs`
- Modify: `src/app-v2.jsx`
- Modify: `src/main.jsx`
- Delete: `src/lib/toast.jsx`

- [ ] **Step 1: Write the failing overlay and bridge cleanup tests**

Replace `src/app-v2.test.mjs` with:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8')

test('PinEntryScreen uses a controlled numeric password input instead of a numpad', () => {
  assert.match(appSource, /<input[\s\S]*type="password"[\s\S]*inputMode="numeric"[\s\S]*maxLength=\{6\}/)
  assert.match(appSource, /value=\{value\}/)
  assert.match(appSource, /onChange=\{e => onChange\(e\.target\.value\.replace\(\/\\D\/g, ''\)\.slice\(0, 6\)\)\}/)
  assert.match(appSource, /onKeyDown=\{e => e\.key === 'Enter' && onSubmit\(\)\}/)
  assert.doesNotMatch(appSource, /\[1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7,\s*8,\s*9,\s*'',\s*0,\s*'⌫'\]/)
  assert.doesNotMatch(appSource, /isBackspace/)
})

test('AppV2 renders the store toast as a fixed bottom overlay', () => {
  assert.match(appSource, /<ToastOverlay toast=\{state\.toast\} \/>/)
  assert.match(appSource, /function ToastOverlay\(\{ toast \}\) \{/)
  assert.match(appSource, /bottom: 80/)
  assert.match(appSource, /left: '50%'/)
  assert.match(appSource, /transform: 'translateX\(-50%\)'/)
  assert.match(appSource, /background: '#1e293b'/)
  assert.match(appSource, /color: '#f8fafc'/)
  assert.match(appSource, /padding: '12px 20px'/)
  assert.match(appSource, /borderRadius: 8/)
  assert.match(appSource, /transition: 'opacity 200ms ease'/)
  assert.match(appSource, /opacity: visible \? 1 : 0/)
})

test('main renders AppProvider directly without the legacy toast bridge', () => {
  assert.doesNotMatch(mainSource, /ToastProvider/)
  assert.doesNotMatch(mainSource, /useToast/)
  assert.doesNotMatch(mainSource, /onToast=\{addToast\}/)
  assert.match(mainSource, /<AppProvider>\s*<AppV2 \/>\s*<\/AppProvider>/)
})
```

- [ ] **Step 2: Run the failing app tests**

Run:

```bash
node --test src/app-v2.test.mjs
```

Expected: FAIL because `ToastOverlay` is not rendered from `state.toast`, and `main.jsx` still imports the legacy toast bridge.

- [ ] **Step 3: Render ToastOverlay in AppV2**

In the authenticated final return of `AppV2`, replace:

```jsx
  return (
    <div style={{ minHeight: '100vh', background: '#07080f' }}>
      {renderCurrent()}
    </div>
  )
}
```

with:

```jsx
  return (
    <div style={{ minHeight: '100vh', background: '#07080f' }}>
      {renderCurrent()}
      <ToastOverlay toast={state.toast} />
    </div>
  )
}
```

- [ ] **Step 4: Add the ToastOverlay component**

In `src/app-v2.jsx`, add this function after `exportStateCsv(state)` and before `PinEntryScreen`:

```jsx
function ToastOverlay({ toast }) {
  const visible = toast?.visible === true
  const message = toast?.message || ''
  if (!visible && !message) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#1e293b',
      color: '#f8fafc',
      padding: '12px 20px',
      borderRadius: 8,
      opacity: visible ? 1 : 0,
      transition: 'opacity 200ms ease',
      pointerEvents: 'none',
      fontSize: 14,
      fontWeight: 600,
      maxWidth: 'calc(100vw - 32px)',
      textAlign: 'center',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
    }}>
      {message}
    </div>
  )
}
```

- [ ] **Step 5: Remove the legacy toast bridge from main**

Replace `src/main.jsx` with:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store.jsx'
import AppV2 from './app-v2'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <AppV2 />
  </AppProvider>
)
```

- [ ] **Step 6: Delete the old provider-based toast module**

Run:

```bash
git rm src/lib/toast.jsx
```

Expected: `src/lib/toast.jsx` is staged for deletion after Step 10 uses explicit `git add` for modified files.

- [ ] **Step 7: Run the app tests**

Run:

```bash
node --test src/app-v2.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Run all source-level tests touched by this plan**

Run:

```bash
node --test src/store-realtime.test.mjs src/app-v2.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Build check**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
git add src/app-v2.test.mjs src/app-v2.jsx src/main.jsx
git add -u src/lib/toast.jsx
git commit -m "feat: render realtime toast overlay"
```

---

### Task 4: Final Quality Gate And Handoff

**Files:**
- Verify only.

- [ ] **Step 1: Run all Node source-level tests**

Run:

```bash
node --test src/*.test.mjs src/screens/*.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Confirm Playwright handoff command for Claude main**

Report this exact command to Claude main:

```bash
npx playwright test --reporter=line
```

Expected: Claude main runs it outside the Codex sandbox.

- [ ] **Step 4: Report commits and residual risk**

Report:

```text
Implemented B1 Realtime Sync + Toast.
Commits:
- feat: add store-managed toast state
- feat: subscribe to expenses realtime changes
- feat: render realtime toast overlay

Verification:
- node --test src/*.test.mjs src/screens/*.test.mjs
- npm run build

Playwright:
- Not run by Codex. Claude main should run npx playwright test --reporter=line.

Residual risk:
- Supabase Realtime must be enabled for public.expenses in the Supabase project; app code cannot verify that at build time.
```

---

## Self-Review

- **Spec coverage:** The plan subscribes to `expenses`, ignores current-user events using `created_by` with `submitted_by_member_id` compatibility for the current schema, refreshes via the existing normalized refresh path, shows the three required event messages, stores toast state in `store.jsx`, renders the bottom overlay in `app-v2.jsx`, unsubscribes during effect cleanup when logout clears `currentUserId`, and keeps scope limited to expenses.
- **Placeholder scan:** No deferred-work markers or empty implementation steps remain. Every code-changing step includes concrete code, commands, and expected outcomes.
- **Type consistency:** The plan uses `state.toast.visible`, `state.toast.message`, `SHOW_TOAST`, `HIDE_TOAST`, `getExpenseRealtimeAuthorId`, `isExpenseRealtimeFromCurrentUser`, and `expenseRealtimeToastMessage` consistently across tests and implementation snippets.
