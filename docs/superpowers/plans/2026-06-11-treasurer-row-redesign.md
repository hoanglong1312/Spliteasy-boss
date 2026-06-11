# Implementation Plan — Treasurer Payment Dashboard Row Redesign

**For agentic workers:** Use superpowers:executing-plans to implement task-by-task.
**Goal:** Redesign TreasurerPaymentDashboard unpaid-member rows: inline button cluster, select mode with floating action bar, profile-level share link.
**Architecture:** 3 independent tasks — Task 1 (UI only), Task 2 (DB migration), Task 3 (action handler). Task 3 depends on Task 2.
**Tech Stack:** React (JSX), Supabase PostgreSQL RPC, navigator.clipboard API
**Spec:** `docs/superpowers/specs/2026-06-11-treasurer-row-redesign.md`
**Decisions:** `docs/superpowers/decisions.md`

---

### Task 1: Row Layout + Select Mode UI

**Status:** pending
**Commit:** —

**Files:**
- Modify: `src/screens/Home.jsx` — TreasurerPaymentDashboard function (lines ~970–1319)

**Changes:**

**Step 1: Rename qrMode → selectMode, qrSelected → selectModeSelected**
In `TreasurerPaymentDashboard` (line 980–981):
- `const [qrMode, setQrMode]` → `const [selectMode, setSelectMode]`
- `const [qrSelected, setQrSelected]` → `const [selectModeSelected, setSelectModeSelected]`
- Update all references throughout the function

**Step 2: Replace header button "QR" → "☑ Chọn"**
Lines 1126–1148: Change header button to toggle `selectMode`:
```jsx
<button
  type="button"
  onClick={() => {
    const next = !selectMode;
    setSelectMode(next);
    setSelectModeSelected(new Set());
    if (next) setUnpaidExpanded(true);
  }}
  style={{
    padding: '4px 10px',
    borderRadius: 8,
    background: selectMode ? '#1e40af' : '#334155',
    border: 'none',
    color: selectMode ? '#93c5fd' : '#94a3b8',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  }}
>
  {selectMode ? '✕ Hủy' : '☑ Chọn'}
</button>
```

**Step 3: Replace row rendering (lines 1150–1229)**
In `selectMode=false`: each row = single-line with info left + button cluster right.
In `selectMode=true`: each row = checkbox + info (no buttons).

Replace the entire `unpaidRows.map(row => {...})` block:
```jsx
{unpaidRows.length > 0 ? unpaidRows.map(row => {
  const rowKey = row.linkMemberId || row.memberId;
  const rowAmount = Number(row.amount) || 0;
  const isSelected = selectMode && selectModeSelected.has(rowKey) && rowAmount > 0;

  return (
    <div
      key={row.profileId || row.name}
      onClick={() => {
        if (selectMode && rowAmount > 0) {
          const newSet = new Set(selectModeSelected);
          if (newSet.has(rowKey)) newSet.delete(rowKey);
          else newSet.add(rowKey);
          setSelectModeSelected(newSet);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: selectMode ? 10 : 0,
        background: isSelected ? 'rgba(59,130,246,0.10)' : 'transparent',
        padding: '8px 0',
        borderRadius: isSelected ? 10 : 0,
        opacity: (selectMode && rowAmount <= 0) ? 0.5 : 1,
        cursor: selectMode ? 'pointer' : 'default',
      }}
    >
      {selectMode && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.3)'}`,
          background: isSelected ? '#3b82f6' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSelected && <div style={{ fontSize: 12, color: '#fff' }}>✓</div>}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.name || row.memberName}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
            {row.sourceSummary || (row.sourceCount ? `${row.sourceCount} nguồn` : 'nguồn tiền')}
            {rowAmount > 0 && <span style={{ color: '#f87171', marginLeft: 4 }}>· {(rowAmount).toLocaleString('vi-VN')} đ</span>}
          </div>
        </div>
        {!selectMode && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {/* 🔗 Copy profile share link */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('copyProfileShareLink', {
                  profileId: row.profileId,
                  memberId: row.linkMemberId || row.memberId || '',
                  groupId: row.linkGroupId || row.groupId || data?.currentGroupId || '',
                  name: row.name || row.memberName || '',
                });
              }}
              style={{ ...miniDashButton('#334155', '#94a3b8'), padding: '6px 8px', fontSize: 11 }}
              title="Copy link chia sẻ"
            >🔗</button>
            {/* QR per-member */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQrSheetMembers([{
                  name: row.name || row.memberName,
                  memberId: row.linkMemberId || row.memberId || '',
                  amount: rowAmount,
                }]);
              }}
              style={{ ...miniDashButton('#4f46e5', '#f8fafc'), padding: '6px 9px', fontSize: 11 }}
            >QR</button>
            {/* ✓TT mark paid */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                withLoading(() => onAction?.('markMemberPaid', {
                  memberId: row.linkMemberId || row.memberId || safeArray(row.memberIds)[0] || '',
                  amount: Math.abs(rowAmount),
                  monthLabel: data?.monthLabel || row.monthLabel || '',
                  memberName: row.name || row.memberName || 'Thành viên',
                  coveredSources: safeArray(row.coveredSources),
                  groupId: row.linkGroupId || row.groupId || data?.currentGroupId || '',
                }));
              }}
              style={{ ...miniDashButton('#22c55e', '#052e16'), padding: '6px 10px', fontSize: 11, fontWeight: 900 }}
            >✓TT</button>
          </div>
        )}
      </div>
    </div>
  );
}) : ( /* existing empty state */ )}
```

**Step 4: Replace floating bar (lines 1280–1299)**
Replace single "Tạo QR" button with 3-button floating action bar:
```jsx
{selectMode && selectModeSelected.size > 0 && (
  <div style={{
    padding: '10px 12px',
    background: '#1e40af',
    borderRadius: 12,
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}>
    <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, flex: 1 }}>
      {selectModeSelected.size} member đã chọn
    </span>
    <button
      onClick={handleOpenQrSheet}
      style={{ ...miniDashButton('#2563eb', '#f8fafc'), padding: '7px 11px', fontSize: 11, fontWeight: 800 }}
    >QR</button>
    <button
      onClick={() => {
        const selectedRows = unpaidRows.filter(r =>
          selectModeSelected.has(r.linkMemberId || r.memberId)
        );
        selectedRows.forEach(row => {
          withLoading(() => onAction?.('markMemberPaid', {
            memberId: row.linkMemberId || row.memberId || '',
            amount: Math.abs(Number(row.amount) || 0),
            monthLabel: data?.monthLabel || '',
            memberName: row.name || row.memberName || 'Thành viên',
            coveredSources: safeArray(row.coveredSources),
            groupId: row.linkGroupId || row.groupId || data?.currentGroupId || '',
          }));
        });
        setSelectMode(false);
        setSelectModeSelected(new Set());
      }}
      style={{ ...miniDashButton('#22c55e', '#052e16'), padding: '7px 11px', fontSize: 11, fontWeight: 900 }}
    >✓ ĐÃ TT</button>
    <button
      onClick={() => { setSelectMode(false); setSelectModeSelected(new Set()); }}
      style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '7px 8px', fontSize: 11, cursor: 'pointer' }}
    >✕</button>
  </div>
)}
```

**Step 5: Remove `setShareMember` open trigger (was clicking row in !qrMode)**
The `setShareMember` call in the old `onClick` handler is now replaced. Do NOT remove `shareMember` state or `MemberShareLinkSheet` render — just don't trigger it from unpaid rows anymore.

**Verify:**
- `npm run build` — no TypeScript/JSX errors
- Browser: unpaid rows show inline `[🔗][QR][✓TT]` cluster when not in select mode
- Header shows "☑ Chọn" button
- Tap "☑ Chọn" → rows switch to checkbox mode, buttons hidden
- Select ≥1 → floating bar appears with QR + ĐÃ TT + ✕
- QR button in floating bar → MultiMemberQRSheet opens (existing behavior)
- ✕ → exits select mode
- `[QR]` per-row → single-member MultiMemberQRSheet
- `[✓TT]` per-row → markMemberPaid (same as before)

---

### Task 2: Supabase Migration — create_profile_access_link RPC

**Status:** pending
**Commit:** —

**Files:**
- Create: `supabase/migrations/20260611120000_create_profile_access_link.sql`

**Schema facts (confirmed from existing migrations):**
- `member_access_links` columns: `id, token_hash, purpose, group_id, member_id, expires_at, consumed_at, created_by, created_at`
- `purpose` CHECK constraint: `('member_login', 'member_bill', 'group_invite')`  
- Token pattern: raw token = `encode(gen_random_bytes(24), 'hex')`, stored hash = `encode(digest(token, 'sha256'), 'hex')`
- `created_by` = `member_id` (not profile_id)
- Helper function `public.get_current_member_id()` available

**Step 1: Write migration file**

```sql
-- Add profile_id column to support profile-level access links
ALTER TABLE public.member_access_links
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Extend purpose CHECK constraint to include 'profile_login'
-- Drop old constraint, add new one
ALTER TABLE public.member_access_links
  DROP CONSTRAINT IF EXISTS member_access_links_purpose_check;

ALTER TABLE public.member_access_links
  ADD CONSTRAINT member_access_links_purpose_check
  CHECK (purpose IN ('member_login', 'member_bill', 'group_invite', 'profile_login'));

-- RPC: create a profile-level access link
-- Caller must be treasurer of ≥1 group containing the target profile
CREATE OR REPLACE FUNCTION public.create_profile_access_link(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_member_id uuid;
  v_group_id uuid;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
BEGIN
  v_actor_member_id := public.get_current_member_id();

  IF v_actor_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Validate: caller is treasurer of a group that has the target profile as active member
  SELECT m_caller.group_id INTO v_group_id
  FROM public.members m_caller
  WHERE m_caller.id = v_actor_member_id
    AND m_caller.role = 'treasurer'
    AND m_caller.is_active IS DISTINCT FROM false
    AND EXISTS (
      SELECT 1 FROM public.members m_target
      WHERE m_target.profile_id = p_profile_id
        AND m_target.group_id = m_caller.group_id
        AND m_target.is_active IS DISTINCT FROM false
    )
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '14 days';

  INSERT INTO public.member_access_links (
    token_hash, purpose, group_id, profile_id, expires_at, created_by
  ) VALUES (
    v_token_hash, 'profile_login', v_group_id, p_profile_id, v_expires_at, v_actor_member_id
  );

  RETURN jsonb_build_object('urlToken', v_token, 'purpose', 'profile_login', 'expiresAt', v_expires_at);
END;
$$;

-- RPC: consume a profile-level access link → return first active member for this profile
CREATE OR REPLACE FUNCTION public.consume_profile_access_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link record;
  v_member record;
  v_auth_token text;
  v_auth_hash text;
BEGIN
  SELECT mal.*
  INTO v_link
  FROM public.member_access_links mal
  WHERE mal.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND mal.purpose = 'profile_login'
    AND mal.profile_id IS NOT NULL
    AND mal.expires_at > now()
    AND mal.consumed_at IS NULL;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- Find the first active member for this profile (prefer the group the link was created for)
  SELECT m.id, m.group_id, m.name
  INTO v_member
  FROM public.members m
  WHERE m.profile_id = v_link.profile_id
    AND m.is_active IS DISTINCT FROM false
  ORDER BY (m.group_id = v_link.group_id) DESC, m.created_at ASC
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_member');
  END IF;

  -- Issue auth token
  v_auth_token := encode(gen_random_bytes(32), 'hex');
  v_auth_hash := encode(digest(v_auth_token, 'sha256'), 'hex');

  UPDATE public.member_tokens
  SET revoked_at = now()
  WHERE member_id = v_member.id AND revoked_at IS NULL;

  INSERT INTO public.member_tokens (member_id, token_hash)
  VALUES (v_member.id, v_auth_hash);

  UPDATE public.member_access_links
  SET consumed_at = now()
  WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'authToken', v_auth_token,
    'memberId', v_member.id,
    'groupId', v_member.group_id,
    'memberName', v_member.name,
    'purpose', 'profile_login',
    'profileId', v_link.profile_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_access_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_profile_access_link(text) TO anon;
```

**Note:** Claude main will apply this migration via `mcp__supabase__apply_migration` — Codex only writes the `.sql` file.

**Verify (Codex):**
- Migration file is valid SQL (no syntax errors)
- `npm run build` still passes

---

### Task 3: copyProfileShareLink Action + Landing Handler

**Status:** pending
**Commit:** —
**Depends on:** Task 2 (migration must be applied first)

**Files:**
- Modify: `src/app-v2.jsx` — action handler + landing handler

**Step 1: Add copyProfileShareLink action**
In `app-v2.jsx` action handler switch (near `createMemberBillShare` around line 1431):
```js
case 'copyProfileShareLink': {
  const { profileId, name } = arg;
  if (!profileId) { showToast?.('Không tìm thấy profile'); break; }
  const data = await supabase.rpc('create_profile_access_link', {
    p_profile_id: profileId,
  });
  if (data.error) { showToast?.('Lỗi tạo link'); console.error(data.error); break; }
  const token = data.data?.urlToken;
  const url = `${window.location.origin}${window.location.pathname}?access=${encodeURIComponent(token)}&profile=1`;
  try {
    await navigator.clipboard.writeText(url);
    showToast?.(`Đã copy link của ${name || 'member'}`);
  } catch {
    showToast?.('Không copy được — thử lại');
  }
  break;
}
```

**Step 2: Update landing handler for profile-level tokens**
Locate existing `?access=<token>` handler (around lines 245–260 in app-v2.jsx). Add profile-level branch:

When landing URL has `?access=<token>&profile=1`:
1. Call `supabase.rpc('consume_profile_access_link', { p_token: token })` — OR use existing `consume_access_link` if it handles profile-level tokens (Codex: check existing RPC first)
2. If profile-level response: get list of members for this profile, pick the first active group's member, set as `currentUserId`
3. Navigate to Home (existing behavior)
4. `window.history.replaceState(null, '', window.location.pathname)` (already done in existing handlers)

**ASSUMPTION for Codex:** If `consume_access_link` already handles `is_profile_level` links and returns `profile_id` + list of members, use that. Otherwise create `consume_profile_access_link` RPC in a new migration file.

**Verify:**
- `npm run build` passes
- Action `copyProfileShareLink` appears in switch statement
- No existing actions broken

---

## Execution Order for Codex

1. Task 1 — independently parallelizable (UI only)
2. Task 2 — independently parallelizable (DB only, Codex writes file, Claude applies)
3. Task 3 — after Task 2 migration is applied by Claude

Claude will:
- Apply Task 2 migration via MCP after Codex commits the file
- Verify Task 3 behavior via localhost browser after Codex commits
