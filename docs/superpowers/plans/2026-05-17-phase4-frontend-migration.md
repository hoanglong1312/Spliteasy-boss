# Phase 4 — Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate frontend từ CDN Babel + localStorage sang Vite build + Supabase, giữ nguyên toàn bộ UI/UX hiện có.

**Architecture:** Vite thay thế CDN Babel Standalone làm build tool — toàn bộ JSX files được convert sang ES modules với explicit imports/exports. `store.jsx` được viết lại để fetch data từ Supabase và normalize về shape cũ (giúp các screens không cần thay đổi lớn). `src/lib/` chứa Supabase client + auth helper. Auth flow mới: nhập invite code + tên → gọi Supabase RPC `join_group()` → nhận token → lưu localStorage.

**Tech Stack:** Vite 6, React 18, @supabase/supabase-js 2, Supabase REST API, PostgreSQL RPC

---

## Cấu trúc file

```
# Tạo mới
package.json
vite.config.js
.env.local                          ← VITE_ prefix credentials
src/main.jsx                        ← Entry point mới (thay thế inline script trong index.html)
src/lib/
├── supabase.js                     ← Supabase client factory
└── auth.js                         ← joinGroup(), getStoredAuth(), storeAuth(), clearAuth()
supabase/migrations/
└── 20260517000010_join_group_rpc.sql ← RPC function cho auth

# Sửa đổi
index.html                          ← Bỏ CDN scripts, thêm <script type="module" src="/src/main.jsx">
src/data.jsx                        ← Bỏ Object.assign(window,...), thêm export {}
src/tweaks-panel.jsx                ← Thêm React import, thêm exports
src/ios-frame.jsx                   ← Thêm React import, thêm exports
src/components.jsx                  ← Thêm React import, thêm exports
src/store.jsx                       ← Viết lại hoàn toàn: Supabase-backed state
src/app.jsx                         ← Thêm imports, đổi ScreenEnterName → ScreenJoinGroup, bỏ ReactDOM.createRoot
src/screen-home.jsx                 ← Thêm imports, bỏ Object.assign(window,...)
src/screen-groups.jsx               ← Thêm imports, bỏ Object.assign(window,...)
src/screen-pickleball.jsx           ← Thêm imports, bỏ Object.assign(window,...)
src/screen-profile.jsx              ← Thêm imports, bỏ Object.assign(window,...)
```

---

## Task 1: Vite setup — package.json, config, entry point

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.env.local`
- Create: `src/main.jsx`
- Modify: `index.html`

- [ ] **Bước 1.1: Tạo package.json**

```json
{
  "name": "spliteasy-boss",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.3.5"
  }
}
```

- [ ] **Bước 1.2: Tạo vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Bước 1.3: Tạo .env.local với VITE_ prefix**

```
VITE_SUPABASE_URL=https://zdjcbenrtdotaqbprpky.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkamNiZW5ydGRvdGFxYnBycGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTY4ODksImV4cCI6MjA5NDU5Mjg4OX0.ISb6fvIKVvI7l4EcnVesX0dQkEp9N9JCv-bT0hLwV1E
```

- [ ] **Bước 1.4: Tạo src/main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store.jsx'
import App from './app.jsx'
import './vb-tokens.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider />
)
```

> Lưu ý: `<AppProvider />` sẽ render `<App />` bên trong — xem Task 6.

- [ ] **Bước 1.5: Cập nhật index.html — bỏ CDN, thêm module entry**

Xóa toàn bộ khối `<!-- React + Babel -->` và tất cả `<script type="text/babel">`. Thêm duy nhất:

```html
<script type="module" src="/src/main.jsx"></script>
```

File index.html sau khi sửa:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Spliteasy — Tính tiền nhóm</title>
<style>
  html, body, #root {
    margin: 0; padding: 0;
    width: 100%; height: 100vh;
    overflow: hidden;
    background: #ECEEF3;
  }
  body {
    display: flex; align-items: center; justify-content: center;
    background:
      radial-gradient(1200px 600px at 30% -10%, #DCDFEC 0%, transparent 60%),
      radial-gradient(900px 500px at 80% 110%, #E4D9FA 0%, transparent 60%),
      #ECEEF3;
  }
  #root {
    display: flex; align-items: center; justify-content: center;
  }
  .screen-scroll::-webkit-scrollbar { width: 0; height: 0; }
  .screen-scroll { scrollbar-width: none; }
  .screen-scroll *::-webkit-scrollbar { width: 0; height: 0; }
  .screen-scroll * { scrollbar-width: none; }
  @keyframes st-fwd {
    from { transform: translateX(12%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }
  @keyframes st-back {
    from { transform: translateX(-12%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }
  @keyframes st-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .screen-anim-fwd { animation: st-fwd .32s cubic-bezier(.2,.7,.2,1) both; }
  .screen-anim-back { animation: st-back .32s cubic-bezier(.2,.7,.2,1) both; }
  .screen-anim-fade { animation: st-fade .24s ease-out both; }
  * { box-sizing: border-box; }
</style>
</head>
<body style="font-family: Inter">
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Bước 1.6: Cài dependencies**

```bash
cd /Users/giinlow./Spliteasy-boss
npm install
```

Kết quả mong đợi: `node_modules/` được tạo, không có lỗi.

- [ ] **Bước 1.7: Commit**

```bash
git add package.json vite.config.js .env.local index.html
git commit -m "feat: add Vite build setup and update index.html entry point"
```

---

## Task 2: join_group SQL RPC — auth không cần Supabase Auth

**Files:**
- Create: `supabase/migrations/20260517000010_join_group_rpc.sql`

**Mục đích:** Cho phép user nhập invite code + tên để vào nhóm. Function tạo member mới nếu chưa có, tạo token và trả về token plaintext. Dùng SECURITY DEFINER nên không cần auth để gọi.

- [ ] **Bước 2.1: Tạo migration file**

```sql
-- join_group(p_invite_code, p_name) → { token, member_id, group_id, member_name }
-- SECURITY DEFINER: có thể gọi mà không cần token (dùng anon key là đủ)
-- Gọi qua: supabase.rpc('join_group', { p_invite_code: '...', p_name: '...' })

CREATE OR REPLACE FUNCTION join_group(p_invite_code text, p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id    uuid;
  v_member_id   uuid;
  v_token       text;
  v_token_hash  text;
  v_short       text;
  v_initials    text;
  v_space_pos   int;
BEGIN
  -- Validate
  IF p_invite_code IS NULL OR trim(p_invite_code) = '' THEN
    RETURN json_build_object('error', 'invite_code_required');
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('error', 'name_required');
  END IF;

  p_name        := trim(p_name);
  p_invite_code := upper(trim(p_invite_code));

  -- Tìm nhóm theo invite code
  SELECT id INTO v_group_id FROM groups WHERE invite_code = p_invite_code;
  IF v_group_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_invite_code');
  END IF;

  -- Tính short name và initials
  v_space_pos := position(' ' IN p_name);
  IF v_space_pos > 0 THEN
    -- Short = từ cuối cùng
    v_short    := reverse(split_part(reverse(p_name), ' ', 1));
    -- Initials = chữ đầu từ đầu + chữ đầu từ cuối
    v_initials := upper(substring(p_name, 1, 1))
               || upper(substring(p_name, v_space_pos + 1, 1));
  ELSE
    v_short    := p_name;
    v_initials := upper(substring(p_name, 1, 2));
  END IF;

  -- Tìm member theo tên trong nhóm (case-insensitive)
  SELECT id INTO v_member_id
  FROM members
  WHERE group_id = v_group_id
    AND lower(name) = lower(p_name)
    AND is_active = true;

  -- Tạo member mới nếu chưa có
  IF v_member_id IS NULL THEN
    INSERT INTO members (group_id, name, short, initials, color, role)
    VALUES (v_group_id, p_name, v_short, v_initials, '#574EFA', 'member')
    RETURNING id INTO v_member_id;
  END IF;

  -- Tạo token mới (revoke token cũ trước)
  v_token      := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE member_tokens SET revoked_at = now()
  WHERE member_id = v_member_id AND revoked_at IS NULL;

  INSERT INTO member_tokens (member_id, token_hash)
  VALUES (v_member_id, v_token_hash);

  RETURN json_build_object(
    'token',       v_token,
    'member_id',   v_member_id,
    'group_id',    v_group_id,
    'member_name', p_name
  );
END;
$$;
```

- [ ] **Bước 2.2: Chạy migration trên Supabase**

Vào Supabase Dashboard → SQL Editor → paste toàn bộ nội dung file trên → Run.

Kết quả mong đợi: `Success. No rows returned`

- [ ] **Bước 2.3: Test thủ công**

Trong SQL Editor chạy:

```sql
SELECT join_group('PICKLE-TEST', 'Nguyễn Văn Test');
```

Kết quả mong đợi: JSON có `token`, `member_id`, `group_id`, `member_name`.

- [ ] **Bước 2.4: Commit**

```bash
git add supabase/migrations/20260517000010_join_group_rpc.sql
git commit -m "feat(db): add join_group() SECURITY DEFINER RPC for token-based auth"
```

---

## Task 3: Supabase client + auth library

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/lib/auth.js`

- [ ] **Bước 3.1: Tạo thư mục src/lib/**

```bash
mkdir -p /Users/giinlow./Spliteasy-boss/src/lib
```

- [ ] **Bước 3.2: Tạo src/lib/supabase.js**

```js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function createSupabase(token = null) {
  const headers = {}
  if (token) headers['x-member-token'] = token
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers },
    auth: { persistSession: false },
  })
}
```

- [ ] **Bước 3.3: Tạo src/lib/auth.js**

```js
import { createSupabase } from './supabase.js'

const TOKEN_KEY  = 'spliteasy_token'
const MEMBER_KEY = 'spliteasy_member'

export function getStoredAuth() {
  try {
    return {
      token:  localStorage.getItem(TOKEN_KEY),
      member: JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null'),
    }
  } catch {
    return { token: null, member: null }
  }
}

export function storeAuth(token, member) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(MEMBER_KEY, JSON.stringify(member))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(MEMBER_KEY)
}

// Gọi Supabase RPC join_group() — không cần token
export async function joinGroup(inviteCode, name) {
  const sb = createSupabase()
  const { data, error } = await sb.rpc('join_group', {
    p_invite_code: inviteCode,
    p_name: name,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data  // { token, member_id, group_id, member_name }
}
```

- [ ] **Bước 3.4: Commit**

```bash
git add src/lib/
git commit -m "feat: add Supabase client factory and auth helper (joinGroup, storeAuth)"
```

---

## Task 4: Convert data.jsx sang ES module

**Files:**
- Modify: `src/data.jsx`

Chỉ thay đổi phần cuối — bỏ `Object.assign(window, {...})`, thêm `export {}`.
Giữ nguyên toàn bộ functions (`fmtVND`, `groupBalance`, v.v.) — chúng là pure functions không đổi.

- [ ] **Bước 4.1: Sửa cuối file data.jsx**

Tìm dòng cuối:
```js
Object.assign(window, {
  MEMBERS, M, ME, getMemberMap,
  fmtVND, fmtVNDFull, fmtDate,
  splitEqual, groupBalance, groupNet, totalBalances, recentActivity, pickleSummary,
});
```

Thay bằng:
```js
export {
  MEMBERS, M, ME, getMemberMap,
  fmtVND, fmtVNDFull, fmtDate,
  splitEqual, groupBalance, groupNet, totalBalances, recentActivity, pickleSummary,
}
```

Thêm dòng đầu file (trước dòng đầu tiên):
```js
import React from 'react'
```

> Lưu ý: `React` import cần thiết vì Vite's JSX transform cần nó. File data.jsx không có JSX nhưng thêm vào để đồng nhất — thực ra không cần nếu không có JSX trong file. Bỏ qua React import nếu gây lỗi.

- [ ] **Bước 4.2: Commit**

```bash
git add src/data.jsx
git commit -m "refactor: convert data.jsx to ES module with named exports"
```

---

## Task 5: Convert tweaks-panel.jsx và ios-frame.jsx sang ES module

**Files:**
- Modify: `src/tweaks-panel.jsx`
- Modify: `src/ios-frame.jsx`

- [ ] **Bước 5.1: Sửa tweaks-panel.jsx**

Thêm dòng đầu file:
```js
import React, { useState, useEffect, useRef, useCallback } from 'react'
```

Tìm dòng cuối file. Thêm sau dòng cuối:
```js
export { useTweaks, TweaksPanel, TweakSection, TweakRow, TweakRadio, TweakToggle, TweakSelect, TweakColor }
```

- [ ] **Bước 5.2: Sửa ios-frame.jsx**

Thêm dòng đầu file:
```js
import React, { useState, useEffect, useRef } from 'react'
```

Tìm dòng cuối file. Thêm sau dòng cuối:
```js
export { IOSDevice, IOSStatusBar, IOSGlassPill, IOSNavBar, IOSList, IOSListRow, IOSKeyboard }
```

- [ ] **Bước 5.3: Commit**

```bash
git add src/tweaks-panel.jsx src/ios-frame.jsx
git commit -m "refactor: convert tweaks-panel and ios-frame to ES modules"
```

---

## Task 6: Convert components.jsx sang ES module

**Files:**
- Modify: `src/components.jsx`

- [ ] **Bước 6.1: Thêm React import đầu file**

Thay dòng đầu:
```js
const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;
```

Thành:
```js
import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react'
```

- [ ] **Bước 6.2: Thêm exports cuối file**

Tìm dòng cuối file. Thêm:
```js
export { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, ScreenTransition, ListRow }
```

> Kiểm tra file có component/function nào khác được dùng ở screens và thêm vào export list nếu thiếu. Grep để kiểm tra: `grep -h "^function \|^const " src/components.jsx | head -30`

- [ ] **Bước 6.3: Commit**

```bash
git add src/components.jsx
git commit -m "refactor: convert components.jsx to ES module"
```

---

## Task 7: Viết lại store.jsx — Supabase-backed state

**Files:**
- Modify: `src/store.jsx` (viết lại hoàn toàn)

**Thiết kế:**
- Giữ nguyên interface `useApp()` → `{ state, dispatch, genId }` để screens không đổi
- `state` có cùng shape như cũ: `{ currentUserId, currentUserName, members, groups, pickle, ... }`
- `dispatch` là async, gọi Supabase rồi refresh state
- `refresh()` fetch tất cả data từ Supabase rồi normalize về shape cũ

- [ ] **Bước 7.1: Viết lại src/store.jsx**

```jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth, storeAuth, clearAuth } from './lib/auth.js'

const AppContext = createContext(null)

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function buildEmptyState() {
  return {
    currentUserId: null,
    currentUserName: null,
    currentGroupId: null,
    members: [],
    groups: [],
    pickle: {
      sessions: [],
      upcoming: [],
      fixedMembers: [],
      externalTickets: [],
      monthlyCourtFee: 0,
      guestFeePerSession: 0,
    },
    notifications: [],
    _loading: false,
    _error: null,
  }
}

async function fetchGroupData(token) {
  const sb = createSupabase(token)
  const [mR, gR, eR, pR, sR, pcR, psR, paR] = await Promise.all([
    sb.from('members').select('*'),
    sb.from('groups').select('*'),
    sb.from('expenses').select('*').order('expense_date', { ascending: false }),
    sb.from('expense_participants').select('*'),
    sb.from('settlements').select('*').order('settlement_date', { ascending: false }),
    sb.from('pickle_configs').select('*').limit(1).maybeSingle(),
    sb.from('pickle_sessions').select('*').order('session_date', { ascending: false }),
    sb.from('pickle_attendees').select('*'),
  ])
  if (mR.error) throw mR.error
  if (gR.error) throw gR.error
  return {
    members: mR.data || [],
    groups: gR.data || [],
    expenses: eR.data || [],
    participants: pR.data || [],
    settlements: sR.data || [],
    pickleConfig: pcR.data,
    pickleSessions: psR.data || [],
    pickleAttendees: paR.data || [],
  }
}

function normalize(raw, currentMemberId) {
  const { members, groups, expenses, participants, settlements, pickleConfig, pickleSessions, pickleAttendees } = raw
  const group = groups[0]
  if (!group) return buildEmptyState()

  const me = members.find(m => m.id === currentMemberId)

  const normalExpenses = expenses.map(e => ({
    id: e.id,
    title: e.description,
    amount: Number(e.amount),
    paidBy: e.paid_by_member_id,
    participants: participants.filter(p => p.expense_id === e.id).map(p => p.member_id),
    splits: participants.filter(p => p.expense_id === e.id).map(p => ({
      memberId: p.member_id,
      amount: Number(p.share_amount),
    })),
    date: e.expense_date,
    status: e.status,
    submittedBy: e.submitted_by_member_id,
    pickleSessionId: e.pickle_session_id,
  }))

  const normalSettlements = settlements.map(s => ({
    id: s.id,
    fromId: s.from_member_id,
    toId: s.to_member_id,
    amount: Number(s.amount),
    date: s.settlement_date,
  }))

  const normalSessions = pickleSessions.map(s => ({
    id: s.id,
    date: s.session_date,
    status: s.status,
    notes: s.notes,
    attendees: pickleAttendees
      .filter(a => a.session_id === s.id && !a.is_guest)
      .map(a => a.member_id),
    guests: pickleAttendees
      .filter(a => a.session_id === s.id && a.is_guest),
    expenses: normalExpenses.filter(e => e.pickleSessionId === s.id),
  }))

  return {
    currentUserId: currentMemberId,
    currentUserName: me?.name || '',
    currentGroupId: group.id,
    members: members.map(m => ({
      id: m.id,
      name: m.name,
      short: m.short || m.name.split(' ').pop(),
      initials: m.initials || m.name.slice(0, 2).toUpperCase(),
      color: m.color || '#574EFA',
      role: m.role,
      isMe: m.id === currentMemberId,
    })),
    groups: [{
      id: group.id,
      name: group.name,
      emoji: group.emoji || '👥',
      color: group.color || '#574EFA',
      inviteCode: group.invite_code,
      members: members.map(m => m.id),
      expenses: normalExpenses,
      settlements: normalSettlements,
    }],
    pickle: {
      sessions: normalSessions,
      upcoming: [],
      fixedMembers: members.filter(m => m.is_active).map(m => m.id),
      externalTickets: [],
      monthlyCourtFee: Number(pickleConfig?.monthly_court_fee || 0),
      guestFeePerSession: Number(pickleConfig?.guest_fee_per_session || 0),
    },
    notifications: [],
    _loading: false,
    _error: null,
  }
}

export function AppProvider({ children }) {
  const { token: storedToken, member: storedMember } = getStoredAuth()

  const [state, setState] = useState(() => {
    if (storedToken && storedMember) {
      return {
        ...buildEmptyState(),
        currentUserId: storedMember.id,
        currentUserName: storedMember.name,
        currentGroupId: storedMember.groupId,
        _loading: true,
      }
    }
    return buildEmptyState()
  })

  const tokenRef = useRef(storedToken)

  const refresh = useCallback(async (tok) => {
    const t = tok ?? tokenRef.current
    if (!t) return
    setState(s => ({ ...s, _loading: true }))
    try {
      const { member } = getStoredAuth()
      const raw = await fetchGroupData(t)
      setState(normalize(raw, member?.id))
    } catch (err) {
      console.error('[store] refresh error:', err)
      setState(s => ({ ...s, _loading: false, _error: err.message }))
    }
  }, [])

  useEffect(() => {
    if (storedToken) refresh(storedToken)
  }, [])

  const dispatch = useCallback(async (action) => {
    const token = tokenRef.current
    const sb = token ? createSupabase(token) : null

    switch (action.type) {

      case 'LOGIN': {
        const { token: newToken, memberId, groupId, memberName } = action
        storeAuth(newToken, { id: memberId, groupId, name: memberName })
        tokenRef.current = newToken
        await refresh(newToken)
        break
      }

      case 'LOGOUT': {
        clearAuth()
        tokenRef.current = null
        setState(buildEmptyState())
        break
      }

      case 'ADD_EXPENSE': {
        if (!sb) return
        const { groupId, expense } = action
        const { data: newExp, error } = await sb
          .from('expenses')
          .insert({
            group_id: groupId,
            description: expense.title,
            amount: expense.amount,
            paid_by_member_id: expense.paidBy,
            submitted_by_member_id: state.currentUserId,
            expense_date: expense.date || new Date().toISOString().slice(0, 10),
            status: 'pending',
            pickle_session_id: expense.pickleSessionId || null,
          })
          .select()
          .single()
        if (error) { console.error('[store] ADD_EXPENSE:', error); return }
        if (expense.participants?.length > 0) {
          const per = Math.round(expense.amount / expense.participants.length)
          await sb.from('expense_participants').insert(
            expense.participants.map((memberId, i) => ({
              expense_id: newExp.id,
              member_id: memberId,
              share_amount: i === expense.participants.length - 1
                ? expense.amount - per * (expense.participants.length - 1)
                : per,
            }))
          )
        }
        await refresh()
        break
      }

      case 'EDIT_EXPENSE': {
        if (!sb) return
        const { expense } = action
        await sb.from('expenses').update({
          description: expense.title,
          amount: expense.amount,
          paid_by_member_id: expense.paidBy,
          expense_date: expense.date,
        }).eq('id', expense.id)
        // Xóa và tạo lại participants
        await sb.from('expense_participants').delete().eq('expense_id', expense.id)
        if (expense.participants?.length > 0) {
          const per = Math.round(expense.amount / expense.participants.length)
          await sb.from('expense_participants').insert(
            expense.participants.map((memberId, i) => ({
              expense_id: expense.id,
              member_id: memberId,
              share_amount: i === expense.participants.length - 1
                ? expense.amount - per * (expense.participants.length - 1)
                : per,
            }))
          )
        }
        await refresh()
        break
      }

      case 'DELETE_EXPENSE': {
        if (!sb) return
        await sb.from('expense_participants').delete().eq('expense_id', action.expenseId)
        await sb.from('expenses').delete().eq('id', action.expenseId)
        await refresh()
        break
      }

      case 'SETTLE_DEBT': {
        if (!sb) return
        const { groupId, settlement } = action
        await sb.from('settlements').insert({
          group_id: groupId,
          from_member_id: settlement.fromId,
          to_member_id: settlement.toId,
          amount: settlement.amount,
          settlement_date: settlement.date || new Date().toISOString().slice(0, 10),
          settled_by_member_id: state.currentUserId,
        })
        await refresh()
        break
      }

      case 'ADD_GROUP': {
        // Phase 4: tạo nhóm mới (đơn giản — chỉ insert, không tự động add member)
        console.warn('[store] ADD_GROUP: chưa implement đầy đủ trong Phase 4')
        break
      }

      case 'EDIT_GROUP': {
        if (!sb) return
        await sb.from('groups').update({
          name: action.group.name,
          emoji: action.group.emoji,
          color: action.group.color,
        }).eq('id', action.group.id)
        await refresh()
        break
      }

      case 'DELETE_GROUP': {
        console.warn('[store] DELETE_GROUP: chưa implement trong Phase 4')
        break
      }

      case 'ADD_MEMBER': {
        if (!sb) return
        const { member } = action
        await sb.from('members').insert({
          id: member.id,
          group_id: state.currentGroupId,
          name: member.name,
          short: member.short,
          initials: member.initials,
          color: member.color || '#574EFA',
          role: member.role || 'member',
        })
        await refresh()
        break
      }

      case 'CONFIRM_ATTENDANCE': {
        if (!sb) return
        const { sessionId, memberId, attending } = action
        if (attending) {
          await sb.from('pickle_attendees').upsert(
            { session_id: sessionId, member_id: memberId, is_guest: false },
            { onConflict: 'session_id,member_id' }
          )
        } else {
          await sb.from('pickle_attendees').delete()
            .eq('session_id', sessionId).eq('member_id', memberId)
        }
        await refresh()
        break
      }

      case 'ADD_PICKLE_EXPENSE': {
        // Pickle expenses = regular expenses with pickle_session_id set
        dispatch({
          type: 'ADD_EXPENSE',
          groupId: state.currentGroupId,
          expense: { ...action.expense, pickleSessionId: action.sessionId },
        })
        break
      }

      case 'ADD_EXTERNAL_TICKET':
      case 'TOGGLE_UPCOMING':
      case 'ADD_PICKLE_MEMBER':
        console.warn(`[store] ${action.type}: chưa implement trong Phase 4`)
        break

      case 'SET_CURRENT_USER':
        // Cũ — không dùng nữa
        break

      default:
        console.warn('[store] Unknown action:', action.type)
    }
  }, [state.currentUserId, state.currentGroupId, refresh])

  return (
    <AppContext.Provider value={{ state, dispatch, genId }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
```

- [ ] **Bước 7.2: Commit**

```bash
git add src/store.jsx
git commit -m "feat: rewrite store.jsx with Supabase-backed state (keep useApp() interface)"
```

---

## Task 8: Cập nhật app.jsx — imports + auth screen mới

**Files:**
- Modify: `src/app.jsx`

**Thay đổi:**
1. Thêm imports cho tất cả dependencies
2. Thay `ScreenEnterName` bằng `ScreenJoinGroup` (dùng invite code + tên)
3. Bỏ `ReactDOM.createRoot` ở cuối (đã chuyển sang main.jsx)
4. Export `App` component

- [ ] **Bước 8.1: Thêm imports đầu app.jsx**

Thêm vào đầu file (trước mọi code khác):

```js
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { AppProvider, useApp, genId } from './store.jsx'
import { IOSDevice } from './ios-frame.jsx'
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakToggle } from './tweaks-panel.jsx'
import { Icon, ScreenTransition } from './components.jsx'
import ScreenHome from './screen-home.jsx'
import ScreenGroups from './screen-groups.jsx'
import ScreenPickleball from './screen-pickleball.jsx'
import ScreenProfile from './screen-profile.jsx'
import { joinGroup } from './lib/auth.js'
```

> Lưu ý: screen files sẽ export default ở Task 9. Import named screens nếu cần.

- [ ] **Bước 8.2: Thay ScreenEnterName bằng ScreenJoinGroup**

Xóa toàn bộ function `ScreenEnterName` và thay bằng:

```jsx
function ScreenJoinGroup() {
  const { dispatch } = useApp()
  const [code, setCode]   = useState('')
  const [name, setName]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    const trimCode = code.trim().toUpperCase()
    const trimName = name.trim()
    if (!trimCode || !trimName) return
    setLoading(true)
    setError('')
    try {
      const result = await joinGroup(trimCode, trimName)
      await dispatch({
        type: 'LOGIN',
        token: result.token,
        memberId: result.member_id,
        groupId: result.group_id,
        memberName: result.member_name,
      })
    } catch (err) {
      const msg = err.message === 'invalid_invite_code'
        ? 'Mã nhóm không đúng. Kiểm tra lại nhé!'
        : err.message === 'invite_code_required'
        ? 'Nhập mã nhóm để tiếp tục.'
        : err.message === 'name_required'
        ? 'Nhập tên của bạn.'
        : 'Lỗi kết nối. Thử lại sau.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const canJoin = code.trim() && name.trim() && !loading

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', background: 'var(--surface-2)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 24, marginBottom: 20,
        background: 'var(--brand-soft)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="split" size={36} color="var(--brand-1)"/>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
        SpliteasyBoss
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 36, textAlign: 'center' }}>
        Nhập mã nhóm để vào nhóm của bạn
      </div>

      {/* Mã nhóm */}
      <div style={{ width: '100%', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
          Mã nhóm
        </div>
        <input
          type="text"
          placeholder="VD: PICKLE-TEST"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && canJoin && handleJoin()}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid var(--border-1)',
            fontSize: 15, fontWeight: 600, letterSpacing: '0.04em',
            background: 'var(--surface-1)', color: 'var(--text-1)',
            outline: 'none', fontFamily: 'var(--vb-font-body)',
            textTransform: 'uppercase',
          }}
        />
      </div>

      {/* Tên */}
      <div style={{ width: '100%', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
          Tên của bạn
        </div>
        <input
          type="text"
          placeholder="VD: Nguyễn Văn A"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canJoin && handleJoin()}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid var(--border-1)',
            fontSize: 15, fontWeight: 500,
            background: 'var(--surface-1)', color: 'var(--text-1)',
            outline: 'none', fontFamily: 'var(--vb-font-body)',
          }}
        />
      </div>

      {error && (
        <div style={{ width: '100%', marginBottom: 12, padding: '10px 14px',
          borderRadius: 10, background: 'var(--vb-danger-50)',
          color: 'var(--vb-danger-700)', fontSize: 13, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={!canJoin}
        style={{
          width: '100%', height: 48, borderRadius: 14, border: 0,
          background: canJoin ? 'var(--brand-1)' : 'var(--border-1)',
          color: canJoin ? '#fff' : 'var(--text-3)',
          fontSize: 15, fontWeight: 700,
          cursor: canJoin ? 'pointer' : 'default',
          fontFamily: 'var(--vb-font-body)',
          transition: 'background .15s',
        }}
      >
        {loading ? 'Đang vào nhóm...' : 'Vào nhóm →'}
      </button>
    </div>
  )
}
```

- [ ] **Bước 8.3: Sửa App() để dùng ScreenJoinGroup**

Trong function `App()`, tìm đoạn:
```jsx
if (state.currentUserId === null) {
  return (
    <div ...>
      <ScreenEnterName/>
    </div>
  );
}
```

Thay `<ScreenEnterName/>` bằng `<ScreenJoinGroup/>`.

- [ ] **Bước 8.4: Bỏ ReactDOM.createRoot ở cuối app.jsx**

Xóa toàn bộ đoạn cuối file:
```js
function Mount() {
  return (
    <IOSDevice width={402} height={874} dark={false}>
      <App/>
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppProvider><Mount/></AppProvider>);
```

Thêm `export default App` cuối file.

- [ ] **Bước 8.5: Cập nhật src/main.jsx để render đúng**

Viết lại `src/main.jsx`:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store.jsx'
import { IOSDevice } from './ios-frame.jsx'
import App from './app.jsx'
import './vb-tokens.css'

function Mount() {
  return (
    <IOSDevice width={402} height={874} dark={false}>
      <App />
    </IOSDevice>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <Mount />
  </AppProvider>
)
```

- [ ] **Bước 8.6: Commit**

```bash
git add src/app.jsx src/main.jsx
git commit -m "feat: replace ScreenEnterName with ScreenJoinGroup (invite code + Supabase auth)"
```

---

## Task 9: Cập nhật tất cả screen files — thêm imports, thêm exports

**Files:**
- Modify: `src/screen-home.jsx`
- Modify: `src/screen-groups.jsx`
- Modify: `src/screen-pickleball.jsx`
- Modify: `src/screen-profile.jsx`

Pattern chung cho mỗi file:
1. Thêm imports React + hooks đầu file
2. Import `useApp` từ store, import helpers từ data, import components
3. Xóa `Object.assign(window, {...})` cuối file
4. Thêm `export default ScreenXxx`

- [ ] **Bước 9.1: Sửa screen-home.jsx**

Thêm đầu file:
```js
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from './store.jsx'
import { getMemberMap, fmtVND, fmtVNDFull, totalBalances, recentActivity, groupNet, groupBalance } from './data.jsx'
import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, ScreenTransition } from './components.jsx'
```

Xóa cuối file dòng `Object.assign(window, { ScreenHome, ... })`.

Thêm cuối file:
```js
export default ScreenHome
```

- [ ] **Bước 9.2: Sửa screen-groups.jsx**

Thêm đầu file:
```js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useApp } from './store.jsx'
import { getMemberMap, fmtVND, fmtVNDFull, groupBalance, groupNet, splitEqual } from './data.jsx'
import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, ListRow } from './components.jsx'
```

Xóa cuối file dòng `Object.assign(window, { ScreenGroups, ... })`.

Thêm cuối file:
```js
export default ScreenGroups
export { ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense, ScreenSettleAll, ScreenNewGroup, ScreenNotifications }
```

> Lưu ý: `app.jsx` cần import các sub-screens từ đây hoặc chuyển chúng thành file riêng. Đơn giản nhất: giữ tất cả trong screen-groups.jsx và export named.

- [ ] **Bước 9.3: Sửa screen-pickleball.jsx**

Thêm đầu file:
```js
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from './store.jsx'
import { getMemberMap, fmtVND, fmtVNDFull, pickleSummary } from './data.jsx'
import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle } from './components.jsx'
```

Xóa cuối file `Object.assign(window, {...})`.

Thêm cuối file:
```js
export default ScreenPickleball
export { ScreenSessionDetail, ScreenAddSessionExpense, ScreenAddExternalTicket }
```

- [ ] **Bước 9.4: Sửa screen-profile.jsx**

Thêm đầu file:
```js
import React, { useState, useMemo } from 'react'
import { useApp } from './store.jsx'
import { getMemberMap, fmtVND, totalBalances, pickleSummary } from './data.jsx'
import { Icon, Avatar, Money, Button, Card, Pill, iconBtnStyle, ListRow } from './components.jsx'
import { useTweaks, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakToggle } from './tweaks-panel.jsx'
```

Xóa cuối file `Object.assign(window, {...})`.

Thêm cuối file:
```js
export default ScreenProfile
export { ScreenSettings }
```

- [ ] **Bước 9.5: Cập nhật imports trong app.jsx cho sub-screens**

app.jsx cần import các sub-screens được dùng trong `renderScreen()`:

```js
import ScreenHome from './screen-home.jsx'
import ScreenGroups, {
  ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense,
  ScreenSettleAll, ScreenNewGroup, ScreenNotifications
} from './screen-groups.jsx'
import ScreenPickleball, {
  ScreenSessionDetail, ScreenAddSessionExpense, ScreenAddExternalTicket
} from './screen-pickleball.jsx'
import ScreenProfile, { ScreenSettings } from './screen-profile.jsx'
```

- [ ] **Bước 9.6: Commit**

```bash
git add src/screen-home.jsx src/screen-groups.jsx src/screen-pickleball.jsx src/screen-profile.jsx src/app.jsx
git commit -m "refactor: convert all screen files to ES modules with proper imports/exports"
```

---

## Task 10: Fix import errors — chạy dev server và fix từng lỗi

Đây là bước quan trọng nhất — Vite sẽ báo lỗi nếu có import thiếu hoặc export sai.

- [ ] **Bước 10.1: Chạy dev server**

```bash
cd /Users/giinlow./Spliteasy-boss
npm run dev
```

Kết quả mong đợi: `Local: http://localhost:5173/`

- [ ] **Bước 10.2: Mở trình duyệt**

Vào `http://localhost:5173/` — kiểm tra console DevTools (F12).

- [ ] **Bước 10.3: Fix từng lỗi import**

Các lỗi thường gặp và cách fix:

**Lỗi `X is not defined`** → component/function chưa được export từ file gốc. Thêm vào export list.

**Lỗi `Cannot find module './screen-groups.jsx'`** → kiểm tra tên file chính xác.

**Lỗi `X is not exported from './components.jsx'`** → thêm X vào export list ở components.jsx.

**Lỗi `ReferenceError: ME is not defined`** → `ME` được export từ data.jsx nhưng chưa import ở screen. Thêm `ME` vào import list.

**Lỗi `useMemo is not defined`** → hook chưa được import. Thêm vào `import React, { ..., useMemo }`.

- [ ] **Bước 10.4: Commit sau khi fix xong**

```bash
git add -p   # review từng thay đổi
git commit -m "fix: resolve all import errors after ES module conversion"
```

---

## Task 11: Test end-to-end

- [ ] **Bước 11.1: Test join group**

Vào `http://localhost:5173/`:
- Nhập mã nhóm: `PICKLE-TEST`
- Nhập tên: `Nguyễn Test`
- Bấm "Vào nhóm →"
- Kết quả mong đợi: app load, thấy giao diện chính với dữ liệu từ Supabase

- [ ] **Bước 11.2: Verify dữ liệu load đúng**

- Tab "Trang chủ": thấy tên nhóm, danh sách thành viên
- Tab "Nhóm": thấy nhóm "Nhóm Pickleball Quận 7"
- Tab "Pickleball": thấy cấu hình pickle (tiền sân, v.v.)

- [ ] **Bước 11.3: Test logout**

- Tab "Cá nhân" → Đăng xuất → app về màn hình nhập mã nhóm
- Kết quả mong đợi: state clear, màn hình join lại hiện ra

- [ ] **Bước 11.4: Test token persistence**

- Reload trang (F5)
- Kết quả mong đợi: app tự login lại bằng token từ localStorage, không hỏi lại invite code

- [ ] **Bước 11.5: Commit cuối**

```bash
git add .
git commit -m "feat: Phase 4 complete — frontend connected to Supabase"
```

---

## Checklist tổng kết

- [ ] `npm run dev` chạy không lỗi
- [ ] Join group bằng invite code hoạt động
- [ ] Dữ liệu từ Supabase hiển thị đúng (members, expenses, pickle)
- [ ] Logout + reload hoạt động
- [ ] Không còn CDN Babel trong index.html
- [ ] Không còn `Object.assign(window, {...})` trong bất kỳ file nào
