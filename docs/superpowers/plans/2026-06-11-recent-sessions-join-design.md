# JoinGroup Recent Sessions + Unified Inline PIN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-add "Vào lại tài khoản gần đây" card list + unify all PIN flows into inline-expand pattern inside `src/screens/JoinGroup.jsx`.

**Architecture:** Single-file UI change. No new files. `auth.js` and `app-v2.jsx` are read-only — only import/call their existing exports. State for inline PIN expand lives in JoinGroup local state.

**Tech Stack:** React, inline styles, `src/tokens.js` colors, `src/lib/auth.js` helpers.

---

## File Map

| File | Role |
|---|---|
| `src/screens/JoinGroup.jsx` | All changes — add imports, state, sections |
| `src/lib/auth.js` | READ ONLY — `getRecentSessions`, `removeRecentSession`, `verifyProfilePin` |
| `src/app-v2.jsx` | READ ONLY — `resumeRecentSession` handler already handles PIN + LOGIN dispatch |

---

## ⚠️ Dependency Note

Check `git log --oneline -5` before starting. If a concurrent Codex job has already modified `JoinGroup.jsx`, read the current state of the file before applying any patch.

---

### Task 1: Add imports + inline-PIN state

**Files:**
- Modify: `src/screens/JoinGroup.jsx:5` (import line)
- Modify: `src/screens/JoinGroup.jsx:9–33` (state declarations)

- [ ] **Step 1: Update import from auth.js**

Current line 5:
```js
import { lookupGroupByCode, lookupGroupInviteLink, requestJoinByInviteLink, getTokenAfterPinVerify, saveRecentInvite } from '../lib/auth.js';
```

Replace with:
```js
import { lookupGroupByCode, lookupGroupInviteLink, requestJoinByInviteLink, getTokenAfterPinVerify, saveRecentInvite, getRecentSessions, removeRecentSession, verifyProfilePin } from '../lib/auth.js';
```

- [ ] **Step 2: Add local state for recent-session inline PIN**

After existing state declarations (after line 32 `const [codeFocused, setCodeFocused] = useState(false);`), add:

```js
const [expandedPinSessionId, setExpandedPinSessionId] = useState(null);
const [sessionPinValue, setSessionPinValue] = useState('');
const [sessionPinError, setSessionPinError] = useState('');
const [sessionPinLoading, setSessionPinLoading] = useState(false);
const [localSessions, setLocalSessions] = useState(() => getRecentSessions());
```

- [ ] **Step 3: Add avatar color helper (deterministic, same palette as app)**

Add after the state declarations:

```js
const SESSION_AVATAR_COLORS = [
  'linear-gradient(135deg, #4a6cf7, #7c3aed)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #e11d48, #be123c)',
  'linear-gradient(135deg, #0ea5e9, #0284c7)',
];
const getSessionAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SESSION_AVATAR_COLORS[Math.abs(hash) % SESSION_AVATAR_COLORS.length];
};
```

- [ ] **Step 4: Add session-level PIN submit handler**

Add before the `return (` JSX block:

```js
const handleSessionPinSubmit = async (session) => {
  if (!sessionPinValue.trim()) { setSessionPinError('Nhập mã PIN'); return; }
  setSessionPinLoading(true);
  setSessionPinError('');
  await new Promise(r => requestAnimationFrame(r));
  try {
    const ok = await verifyProfilePin(session.profileId, sessionPinValue);
    if (!ok) {
      setSessionPinError('Sai PIN. Thử lại.');
      setSessionPinValue('');
      setSessionPinLoading(false);
      return;
    }
    setExpandedPinSessionId(null);
    setSessionPinValue('');
    await onAction?.('resumeSession', session);
  } catch {
    setSessionPinError('Lỗi xác minh. Thử lại.');
  } finally {
    setSessionPinLoading(false);
  }
};
```

- [ ] **Step 5: Build — no new JSX yet, just verify no import/syntax errors**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds (no new UI rendered yet).

- [ ] **Step 6: Commit**

```bash
git add src/screens/JoinGroup.jsx
git commit -m "refactor(JoinGroup): add inline-PIN state + session avatar helper + auth imports"
```

---

### Task 2: Add recent sessions card list

**Files:**
- Modify: `src/screens/JoinGroup.jsx` — add section after admin block (lines ~275)

The section renders when `!hasGroupPreview && !looking`. It replaces the "Chưa xác định nhóm" info card when sessions exist (keep info card only when `localSessions.length === 0`).

- [ ] **Step 1: Change existing "Chưa xác định nhóm" card condition**

Current (line 277):
```js
{!hasGroupPreview && !looking && !isInviteLinkFlow && (
```

Replace with:
```js
{!hasGroupPreview && !looking && !isInviteLinkFlow && localSessions.length === 0 && (
```

- [ ] **Step 2: Add recent sessions section after the info card block (after `</Card>` at ~line 295)**

Add immediately after the closing `)}` of the info card:

```jsx
{!hasGroupPreview && localSessions.length > 0 && (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '1.2px',
      color: colors.textMuted, textTransform: 'uppercase',
      marginBottom: 6,
    }}>Vào lại tài khoản gần đây</div>
    <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 10 }}>
      Chạm vào tên đã dùng trên máy này.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {localSessions.map((session) => {
        const sessionKey = session.profileId || session.memberId;
        const isExpanded = expandedPinSessionId === sessionKey;
        return (
          <div
            key={sessionKey}
            style={{
              borderRadius: 14,
              border: `1px solid ${isExpanded ? colors.brand : 'rgba(255,255,255,0.08)'}`,
              background: isExpanded ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Card header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: getSessionAvatarColor(session.memberName),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#fff',
              }}>
                {(session.memberName || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                {session.memberName}
              </div>
              {!isExpanded && (
                <button
                  type="button"
                  onClick={() => {
                    if (session.hasPin) {
                      setExpandedPinSessionId(sessionKey);
                      setSessionPinValue('');
                      setSessionPinError('');
                    } else {
                      onAction?.('resumeSession', session);
                    }
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, color: colors.brand, padding: '4px 8px',
                    lineHeight: 1,
                  }}
                >
                  {session.hasPin ? '🔒' : '›'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isExpanded) { setExpandedPinSessionId(null); setSessionPinValue(''); setSessionPinError(''); }
                  const updated = removeRecentSession(session);
                  setLocalSessions(updated);
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: colors.textMuted,
                  minWidth: 28, minHeight: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14, padding: 4,
                }}
              >×</button>
            </div>
            {/* Inline PIN expand */}
            {isExpanded && (
              <div style={{
                borderTop: '1px solid rgba(99,102,241,0.25)',
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                  🔒 Nhập PIN để vào tài khoản này
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Nhập mã PIN"
                  value={sessionPinValue}
                  autoFocus
                  onChange={e => { setSessionPinValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setSessionPinError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !sessionPinLoading && handleSessionPinSubmit(session)}
                  disabled={sessionPinLoading}
                  style={{
                    width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
                    border: `1px solid ${sessionPinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
                    background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
                    fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
                    WebkitTextSecurity: 'disc', boxSizing: 'border-box', marginBottom: 6,
                  }}
                />
                {sessionPinError && (
                  <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>{sessionPinError}</div>
                )}
                <button
                  type="button"
                  onClick={() => handleSessionPinSubmit(session)}
                  disabled={sessionPinLoading}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: sessionPinLoading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)',
                    color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    cursor: sessionPinLoading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {sessionPinLoading && (
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                      display: 'inline-block', animation: 'pickleballLoadingSpin 0.8s linear infinite',
                    }} />
                  )}
                  {sessionPinLoading ? 'Đang xác nhận...' : 'Xác nhận'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -20
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/screens/JoinGroup.jsx
git commit -m "feat(JoinGroup): add recent sessions card list with inline PIN expand"
```

---

### Task 3: Fix code chips — hide when no inviteCode

**Files:**
- Modify: `src/screens/JoinGroup.jsx:343–374` (recent code suggestions)

Current (line 347–348):
```js
const suggestions = recentSessions
  .map(s => ({ code: s.inviteCode, label: s.inviteCode || s.groupName }))
  .filter(s => s.label && ...)
```

The problem: sessions without `inviteCode` produce chips with `groupName` label that don't work on click.

- [ ] **Step 1: Filter out sessions without inviteCode**

Change lines 347–349 from:
```js
const suggestions = recentSessions
  .map(s => ({ code: s.inviteCode, label: s.inviteCode || s.groupName }))
  .filter(s => s.label && !seen.has(s.label) && seen.add(s.label))
```

To:
```js
const suggestions = recentSessions
  .filter(s => s.inviteCode && s.inviteCode.trim())
  .map(s => ({ code: s.inviteCode, label: s.inviteCode }))
  .filter(s => !seen.has(s.label) && seen.add(s.label))
```

- [ ] **Step 2: Also use `localSessions` instead of `recentSessions` (already in scope from Task 1)**

Same block, change `recentSessions` to `localSessions`:
```js
const suggestions = localSessions
  .filter(s => s.inviteCode && s.inviteCode.trim())
  .map(s => ({ code: s.inviteCode, label: s.inviteCode }))
  .filter(s => !seen.has(s.label) && seen.add(s.label))
  .slice(0, 3);
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -20
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/screens/JoinGroup.jsx
git commit -m "fix(JoinGroup): hide code chips when session has no inviteCode"
```

---

### Task 4: Convert pinRequired section to inline card

**Files:**
- Modify: `src/screens/JoinGroup.jsx:510–615` (the big `pinRequired` block)

Currently the `pinRequired` block (invite link PIN) is a standalone section after `joinSent`. Per spec, it should be an inline card rendered where the group preview + "Bạn là ai?" section is.

The logic stays the same — `handleInvitePinSubmit` unchanged. Only the placement and visual container change.

- [ ] **Step 1: Move `pinRequired` rendering to just after "Bạn là ai?" cards section**

Currently rendered at lines ~510–615, after `joinSent`. Move it to render **inside** the `{hasGroupPreview && (...)}` block, after the name input card and before `joinError`.

New placement — add inside `{hasGroupPreview && (...)}`:

```jsx
{pinRequired && (
  <div style={{ marginTop: 10 }}>
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
      Xác minh danh tính
    </div>
    <div style={{
      borderRadius: 14,
      border: '1px solid rgba(99,102,241,0.5)',
      background: 'rgba(99,102,241,0.06)',
      overflow: 'hidden',
    }}>
      {/* Name header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        background: 'rgba(99,102,241,0.10)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: getSessionAvatarColor(pinRequiredMemberName || 'T'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#fff',
        }}>
          {(pinRequiredMemberName || 'T')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
            {pinRequiredMemberName || 'Thành viên'}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {foundGroup?.name || ''} · Có PIN
          </div>
        </div>
      </div>
      {/* PIN input */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: colors.textSecondary }}>
          🔒 Nhập PIN để xác minh danh tính
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Nhập mã PIN"
          value={invitePinValue}
          onChange={e => { setInvitePinValue(e.target.value); setInvitePinError(''); }}
          onKeyDown={e => e.key === 'Enter' && !invitePinLoading && handleInvitePinSubmit()}
          disabled={invitePinLoading}
          autoFocus
          style={{
            width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
            border: `1px solid ${invitePinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
            background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
            fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
            WebkitTextSecurity: 'disc', boxSizing: 'border-box',
          }}
        />
        {invitePinError && <div style={{ fontSize: 12, color: '#fca5a5' }}>{invitePinError}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button"
            onClick={() => { setPinRequired(false); setInvitePinValue(''); setInvitePinError(''); }}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 8,
              border: `1px solid ${colors.borderNormal}`, background: 'transparent',
              color: colors.textSecondary, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Hủy</button>
          <button type="button" onClick={handleInvitePinSubmit} disabled={invitePinLoading}
            style={{
              flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
              background: invitePinLoading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              cursor: invitePinLoading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {invitePinLoading && (
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                display: 'inline-block', animation: 'pickleballLoadingSpin 0.8s linear infinite',
              }} />
            )}
            {invitePinLoading ? 'Đang xác nhận...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Remove the old standalone `pinRequired` block (lines ~510–615)**

Delete the entire `{pinRequired && (...)}` block that currently sits after `joinSent` (the old indigo two-section layout). It is now replaced by the inline card above.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -20
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/screens/JoinGroup.jsx
git commit -m "feat(JoinGroup): convert pinRequired to inline card in group preview section"
```

---

### Task 5: Chip transform for PIN members in "Bạn là ai?"

**Files:**
- Modify: `src/screens/JoinGroup.jsx:426–489` ("Bạn là ai?" section)

When user selects a chip and there's a matching session with `hasPin`, show inline PIN expand below the chip row.

- [ ] **Step 1: Add state for chip-level PIN expand**

After the existing `expandedPinSessionId` state (Task 1), add:

```js
const [chipPinName, setChipPinName] = useState(null);
const [chipPinValue, setChipPinValue] = useState('');
const [chipPinError, setChipPinError] = useState('');
const [chipPinLoading, setChipPinLoading] = useState(false);
```

- [ ] **Step 2: Add chip PIN submit handler**

Before `return (`, add:

```js
const handleChipPinSubmit = async () => {
  if (!chipPinValue.trim()) { setChipPinError('Nhập mã PIN'); return; }
  const allSessions = [...(d.recentSessions || []), ...(localSessions || [])];
  if (longSession) allSessions.push(longSession);
  const session = allSessions.find(s => s.memberName === chipPinName);
  if (!session) { setChipPinError('Không tìm thấy session. Thử lại.'); return; }
  setChipPinLoading(true);
  setChipPinError('');
  await new Promise(r => requestAnimationFrame(r));
  try {
    const ok = await verifyProfilePin(session.profileId, chipPinValue);
    if (!ok) {
      setChipPinError('Sai PIN. Thử lại.');
      setChipPinValue('');
      setChipPinLoading(false);
      return;
    }
    setChipPinName(null);
    setChipPinValue('');
    setSelected(chipPinName);
    // PIN verified — mark session as verified so join button works without PIN re-entry
  } catch {
    setChipPinError('Lỗi xác minh. Thử lại.');
  } finally {
    setChipPinLoading(false);
  }
};
```

- [ ] **Step 3: Modify chip onClick to check for PIN**

Current chip onClick (line ~449):
```js
onClick={() => { setSelected(name); setNewName(''); }}
```

Replace with:
```js
onClick={() => {
  const allSessions = [...(d.recentSessions || []), ...(localSessions || [])];
  if (longSession) allSessions.push(longSession);
  const session = allSessions.find(s => s.memberName === name);
  if (session?.hasPin && !isTreasurerSession(session)) {
    setChipPinName(name);
    setChipPinValue('');
    setChipPinError('');
    setSelected(null);
    setNewName('');
  } else {
    setSelected(name);
    setNewName('');
    setChipPinName(null);
  }
}}
```

- [ ] **Step 4: Add inline PIN expand after the chips flex-wrap div**

Currently (line ~466): chips render in `<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>`.

Add after the closing `</div>` of that chips wrapper, before the `<div style={{ height: 1, ... }} />` divider:

```jsx
{chipPinName && (
  <div style={{ marginTop: 10, borderRadius: 12, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.07)', padding: 12 }}>
    <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
      🔒 Nhập PIN để xác nhận danh tính của <strong style={{ color: colors.textPrimary }}>{chipPinName}</strong>
    </div>
    <input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="Nhập mã PIN"
      value={chipPinValue}
      autoFocus
      onChange={e => { setChipPinValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setChipPinError(''); }}
      onKeyDown={e => e.key === 'Enter' && !chipPinLoading && handleChipPinSubmit()}
      disabled={chipPinLoading}
      style={{
        width: '100%', fontSize: 16, padding: '9px 12px', borderRadius: 8,
        border: `1px solid ${chipPinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.3)'}`,
        background: 'rgba(0,0,0,0.3)', color: colors.textPrimary,
        fontFamily: 'inherit', outline: 'none', letterSpacing: '0.2em',
        WebkitTextSecurity: 'disc', boxSizing: 'border-box', marginBottom: 6,
      }}
    />
    {chipPinError && <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 6 }}>{chipPinError}</div>}
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" onClick={() => { setChipPinName(null); setChipPinValue(''); setChipPinError(''); }}
        style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${colors.borderNormal}`, background: 'transparent', color: colors.textSecondary, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Hủy
      </button>
      <button type="button" onClick={handleChipPinSubmit} disabled={chipPinLoading}
        style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: chipPinLoading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: chipPinLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {chipPinLoading && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', display: 'inline-block', animation: 'pickleballLoadingSpin 0.8s linear infinite' }} />}
        {chipPinLoading ? 'Đang xác nhận...' : 'Xác nhận'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | tail -20
```
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/screens/JoinGroup.jsx
git commit -m "feat(JoinGroup): chip-level inline PIN expand for PIN-protected members in Bạn là ai? section"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run build**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

- [ ] **Step 2: Verify acceptance criteria via `grep`**

```bash
grep -n "localSessions\|getRecentSessions\|removeRecentSession\|verifyProfilePin\|expandedPinSessionId\|chipPinName" src/screens/JoinGroup.jsx | head -30
```
Expected: all 6 identifiers appear.

- [ ] **Step 3: Check `pinRequired` old block is gone**

```bash
grep -n "borderRadius: '12px 12px 0 0'" src/screens/JoinGroup.jsx
```
Expected: 0 matches (the old two-panel pinRequired layout used this pattern — it should be gone).

- [ ] **Step 4: Commit if any fixups needed**

```bash
git add src/screens/JoinGroup.jsx
git commit -m "fix(JoinGroup): cleanup after unified PIN pattern"
```

---

## Acceptance Criteria

- [ ] Sessions list hiện khi `hasGroupPreview === false`, ẩn khi `true`
- [ ] Card: avatar letter (colored), memberName, `›` hoặc `🔒`, `×`
- [ ] Tap `›` card → `resumeSession` action dispatch
- [ ] Tap `🔒` card → inline PIN expand, `verifyProfilePin`, navigate nếu đúng
- [ ] Sai PIN → error inline, clear, không navigate
- [ ] Xóa card `×` → `removeRecentSession`, list re-render
- [ ] Code chips chỉ render khi `session.inviteCode` tồn tại
- [ ] `pinRequired` section render inline trong group preview section (không còn bottom block cũ)
- [ ] Chip có PIN trong "Bạn là ai?" → inline PIN expand
- [ ] `npm run build` pass
