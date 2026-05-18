# Plan 3: SessionCalendar + JoinGroup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session progress bar + upcoming sessions to Pickleball overview, and build JoinGroup onboarding so new members can join via invite link without a pre-existing account.

**Architecture:** Two independent features. Task 1 adds display-only logic to the existing `PickleOverview` component using already-loaded `state.pickle.sessions`. Tasks 2–3 add a new `ScreenJoin` component backed by two Supabase SECURITY DEFINER RPCs (one already exists: `join_group`; one new: `preview_group`) so the join flow works with the anon key before the user has a token.

**Tech Stack:** React hooks, Supabase RPC (anon key), existing `dispatch({ type: 'LOGIN' })` pattern, CSS vars from vb-tokens.css.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/screen-pickleball.jsx` | Modify | Add session progress bar + upcoming sessions to `PickleOverview` |
| `supabase/migrations/20260518000001_preview_group_rpc.sql` | Create | `preview_group(invite_code)` RPC — returns group name + member list (anon-safe) |
| `src/screen-join.jsx` | Create | JoinGroup onboarding screen |
| `src/app.jsx` | Modify | Wire `ScreenJoin` to `'join'` route |

---

## Task 1: Session progress bar + upcoming sessions in Pickleball Tổng quan

**Files:**
- Modify: `src/screen-pickleball.jsx` — `PickleOverview` component

**Context:**
- `state.pickle.sessions` is an array of `{ id, date, status, notes, attendees, guests, expenses }` where `date` is an ISO string like `"2026-05-17"`.
- `PickleOverview` already uses `useApp()` to access `state`. Find the existing `PickleOverview` function component and add the progress bar block.
- No new store queries needed.

---

- [ ] **Step 1: Read `src/screen-pickleball.jsx`** to find the `PickleOverview` component structure — specifically: (a) where `state.pickle.sessions` is destructured, (b) where the monthly stats section ends (likely after the cost/member summary cards), so you know exactly where to insert the new block.

- [ ] **Step 2: Add session progress derivation inside `PickleOverview`**

Add these computed values just before the component's `return` statement (or near where other derived data is calculated):

```js
const now = new Date()
const thisMonth = now.getMonth()
const thisYear  = now.getFullYear()

const monthSessions = sessions.filter(s => {
  const d = new Date(s.date)
  return d.getMonth() === thisMonth && d.getFullYear() === thisYear
})
const doneSessions    = monthSessions.filter(s => new Date(s.date) <= now)
const upcomingSessions = monthSessions
  .filter(s => new Date(s.date) > now)
  .sort((a, b) => new Date(a.date) - new Date(b.date))
  .slice(0, 3)
const sessionTotal = monthSessions.length
const sessionPct   = sessionTotal > 0
  ? Math.round((doneSessions.length / sessionTotal) * 100)
  : 0
```

- [ ] **Step 3: Add `SessionProgressBlock` component** (define above `PickleOverview` in the same file)

```jsx
function SessionProgressBlock({ done, total, pct, upcoming }) {
  const M = useApp  // not needed — receives props only, no hook
  const monthLabel = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '0 16px 8px' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        Buổi {monthLabel}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: 'var(--color-surface-raised)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'var(--color-primary)',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
          {done}/{total} buổi
        </span>
      </div>

      {/* Upcoming sessions */}
      {upcoming.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Sắp tới:
          </div>
          {upcoming.map(s => (
            <div key={s.id} style={{
              fontSize: 13, color: 'var(--color-text-primary)',
              padding: '3px 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'var(--color-primary)' }}>•</span>
              {new Date(s.date).toLocaleDateString('vi-VN', {
                weekday: 'short', day: '2-digit', month: '2-digit',
              })}
              {s.notes ? <span style={{ color: 'var(--color-text-secondary)' }}> — {s.notes}</span> : null}
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Chưa có buổi nào tháng này
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Insert `<SessionProgressBlock>` into `PickleOverview` render**

Find the JSX section in `PickleOverview` where the header/stats block ends (right before or after the team cost cards). Insert:

```jsx
<SessionProgressBlock
  done={doneSessions.length}
  total={sessionTotal}
  pct={sessionPct}
  upcoming={upcomingSessions}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: add session progress bar + upcoming sessions to Pickleball overview"
```

---

## Task 2: preview_group RPC migration

**Files:**
- Create: `supabase/migrations/20260518000001_preview_group_rpc.sql`

**Context:** The JoinGroup screen needs to display the group name and existing member list before the user has a token. A SECURITY DEFINER RPC is the safe way to expose this data to the anon key without opening up RLS.

---

- [ ] **Step 1: Create the migration file**

```sql
-- preview_group(p_invite_code) → { group_id, group_name, members[] }
-- SECURITY DEFINER: callable with anon key, no auth token needed
-- Used by JoinGroup screen to show group info before the user picks their identity

CREATE OR REPLACE FUNCTION preview_group(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id   uuid;
  v_group_name text;
  v_members    json;
BEGIN
  p_invite_code := upper(trim(p_invite_code));

  SELECT id, name
  INTO v_group_id, v_group_name
  FROM groups
  WHERE invite_code = p_invite_code;

  IF v_group_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_invite_code');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id',       id,
      'name',     name,
      'short',    short,
      'initials', initials,
      'color',    COALESCE(color, '#574EFA')
    ) ORDER BY name
  )
  INTO v_members
  FROM members
  WHERE group_id = v_group_id
    AND is_active = true;

  RETURN json_build_object(
    'group_id',   v_group_id,
    'group_name', v_group_name,
    'members',    COALESCE(v_members, '[]'::json)
  );
END;
$$;
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
npx supabase db push
```

Expected output: migration applied, no errors.

If `supabase db push` fails (e.g., not linked), apply manually via Supabase dashboard SQL editor by running the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260518000001_preview_group_rpc.sql
git commit -m "feat: add preview_group RPC for anon group preview in JoinGroup flow"
```

---

## Task 3: ScreenJoin component + app routing

**Files:**
- Create: `src/screen-join.jsx`
- Modify: `src/app.jsx`

**Context:**
- Read `src/lib/supabase.js` to understand how `createSupabase(token)` works. For the join screen we call it **without a token** to get an anon client for the two public RPCs (`preview_group`, `join_group`).
- Read `src/app.jsx` to find: (a) the routing `switch` or `renderScreen` function, (b) how existing screens are imported and registered, (c) how `push` is passed to screens.
- `dispatch({ type: 'LOGIN', token, memberId, groupId, memberName })` is defined in `src/store.jsx` — this is the only action needed after join.
- After LOGIN dispatch, `push('home')` or navigate to the default tab.

---

- [ ] **Step 1: Read `src/lib/supabase.js`** to confirm: does `createSupabase()` (no args) return a valid anon client, or do you need to call `createClient` directly? Note the function signature and how to create an unauthenticated client.

- [ ] **Step 2: Read `src/app.jsx`** to find the routing pattern — how screens are rendered, how `push`/`pop` work, and where to add the `'join'` route.

- [ ] **Step 3: Create `src/screen-join.jsx`**

```jsx
import React, { useState, useEffect } from 'react'
import { createSupabase } from './lib/supabase.js'
import { useApp } from './store.jsx'

export function ScreenJoin({ push }) {
  const { dispatch } = useApp()

  // invite code — may come from URL hash or be typed manually
  const [code, setCode]       = useState('')
  const [preview, setPreview] = useState(null)   // { group_id, group_name, members[] }
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError]     = useState(null)

  // Parse invite code from URL hash on mount
  // Supports: /#/join/PICKLE-X7K2  or  /#join/PICKLE-X7K2
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/join[/]([A-Z0-9-]+)/i)
    if (match) {
      const c = match[1].toUpperCase()
      setCode(c)
      doPreview(c)
    }
  }, [])

  async function doPreview(inviteCode) {
    const c = (inviteCode || code).toUpperCase().trim()
    if (!c) return
    setPreviewing(true)
    setError(null)
    setPreview(null)
    try {
      const sb = createSupabase()   // anon — no token argument
      const { data, error: rpcErr } = await sb.rpc('preview_group', { p_invite_code: c })
      if (rpcErr || data?.error) {
        setError('Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.')
      } else {
        setPreview(data)
      }
    } catch (e) {
      setError('Không kết nối được. Kiểm tra mạng và thử lại.')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSelectMember(memberName) {
    setJoining(true)
    setError(null)
    try {
      const sb = createSupabase()   // anon — join_group is SECURITY DEFINER
      const { data, error: rpcErr } = await sb.rpc('join_group', {
        p_invite_code: code.toUpperCase().trim(),
        p_name: memberName,
      })
      if (rpcErr || data?.error) {
        setError('Không thể tham gia nhóm. Thử lại hoặc liên hệ thủ quỹ.')
        return
      }
      await dispatch({
        type:       'LOGIN',
        token:      data.token,
        memberId:   data.member_id,
        groupId:    data.group_id,
        memberName: data.member_name,
      })
      push('home')
    } catch (e) {
      setError('Có lỗi xảy ra. Thử lại.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏸</div>
      <h2 style={{ color: 'var(--color-text-primary)', margin: '0 0 4px', textAlign: 'center' }}>
        Tham gia nhóm
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>
        Nhập mã từ thủ quỹ hoặc mở link nhóm
      </p>

      {/* Code input */}
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Mã nhóm (vd: PICKLE-X7K2)"
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: 15, letterSpacing: 1,
            }}
            onKeyDown={e => e.key === 'Enter' && doPreview()}
          />
          <button
            onClick={() => doPreview()}
            disabled={previewing || !code.trim()}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', fontWeight: 600, cursor: 'pointer',
              opacity: (previewing || !code.trim()) ? 0.5 : 1,
            }}
          >
            {previewing ? '...' : 'Tìm'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          color: '#EF4444', fontSize: 13,
          marginBottom: 12, textAlign: 'center',
          maxWidth: 320,
        }}>
          {error}
        </div>
      )}

      {/* Group preview + member picker */}
      {preview && (
        <div style={{
          width: '100%', maxWidth: 340,
          background: 'var(--color-surface)',
          borderRadius: 16, padding: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {preview.group_name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Bạn là ai trong nhóm này?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(preview.members || []).map(m => (
              <button
                key={m.id}
                onClick={() => !joining && handleSelectMember(m.name)}
                disabled={joining}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--color-surface-raised)',
                  border: '1.5px solid transparent',
                  cursor: joining ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%',
                  opacity: joining ? 0.6 : 1,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { if (!joining) e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}
              >
                {/* Avatar circle */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: m.color || 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {m.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                    {m.name}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {joining && (
            <div style={{
              marginTop: 16, textAlign: 'center',
              fontSize: 13, color: 'var(--color-text-secondary)',
            }}>
              Đang tham gia...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add `ScreenJoin` import and route in `src/app.jsx`**

Find the import block that imports other screen components, and add:

```js
import { ScreenJoin } from './screen-join.jsx'
```

Find the `renderScreen` function (or `switch` statement / route map). Add the join case alongside the other screen cases:

```js
case 'join':
  return <ScreenJoin push={push} />
```

Also check if there is a "not logged in" guard that redirects to a login screen. If the app redirects unauthenticated users away from the main tabs, make sure the `'join'` route is exempt from that guard (it should render even without a stored token).

- [ ] **Step 5: Handle initial deep link on app load**

In `src/app.jsx`, find where the initial screen/route is determined on app load (likely near where `getStoredAuth()` is called). Add logic so that if the URL hash contains `/join/`, the initial screen is `'join'` instead of the default:

```js
// At top of the routing logic, before defaulting to 'home' or login:
const hash = window.location.hash
if (hash.includes('/join/')) {
  initialScreen = 'join'   // or however the app sets initial screen
}
```

Adjust variable names to match the existing pattern in app.jsx.

- [ ] **Step 6: Verify flow in browser**

1. Run dev server: `npm run dev`
2. Open `http://localhost:5173/#/join/` with a valid invite code from the database seed (check `supabase/migrations/20260517000007_seed_test_data.sql` for the invite code used in test data)
3. Verify: invite code is auto-filled, group name + member list appears
4. Click a member → app should log in and navigate to the home tab

- [ ] **Step 7: Commit**

```bash
git add src/screen-join.jsx src/app.jsx
git commit -m "feat: add JoinGroup onboarding screen with invite code + member picker"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Progress bar (X/N buổi tháng này) | Task 1 |
| Upcoming sessions list | Task 1 |
| Nhận link → auto-fill invite code | Task 3 (URL hash parse) |
| Show group name + member avatar list | Task 3 (preview_group RPC) |
| Pick member identity → save to localStorage | Task 3 (dispatch LOGIN → storeAuth) |
| Lần sau mở lại → vào thẳng | Existing behavior: `getStoredAuth()` already handles this |
| Nút "Nhập mã thủ công" | Task 3 (code input field always visible) |

**Placeholder scan:** None found.

**Type consistency:**
- `preview_group` returns `{ group_id, group_name, members[] }` — `ScreenJoin` reads `preview.group_name` and `preview.members` ✅
- `join_group` returns `{ token, member_id, group_id, member_name }` — `handleSelectMember` maps these to `dispatch LOGIN` fields ✅
- `dispatch LOGIN` fields `{ token, memberId, groupId, memberName }` match `store.jsx` case 'LOGIN' ✅
