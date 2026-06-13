# Pickleball Water Cost Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix casual member water charge bug — casual members should only pay water when they have an attendance record showing them as present; fixed members keep existing fallback-true behavior.

**Architecture:** Two internal functions (`memberWaterShare`, `memberExtrasShare`) currently call `effectiveSessionMemberIds` with `fallback=true` for all members. The fix splits the member list by type and uses `fallback=false` for casual members. Call site in `buildMemberMonthBalance` already has `fixedMembers` and `casualMembers` split — just pass them through.

**Tech Stack:** JavaScript (useScreenData.js), Node.js test runner (`node:test`)

---

### Task 1: Write failing tests

**Files:**
- Modify: `src/hooks/useScreenData.test.mjs`

- [ ] **Step 1: Add test for casual member pays 0 water with no attendance record**

Append to `src/hooks/useScreenData.test.mjs`:

```js
test('pickleball casual member pays zero water when no attendance record', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'viet-hoang',
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', groupType: 'pickleball', name: 'Nhóm Test', members: ['fixed-a', 'viet-hoang'] },
    members: [
      { id: 'fixed-a', groupId: 'pickle-1', name: 'Thành viên A', memberType: 'fixed', isActive: true },
      { id: 'viet-hoang', groupId: 'pickle-1', name: 'Việt Hoàng', memberType: 'casual', isActive: true },
    ],
    pickle: {
      monthlyCourtFee: 0,
      monthlyConfigs: [{ yearMonth: '2026-05', courtFee: 0, sessionsCount: 1 }],
      sessions: [{
        id: 's1',
        groupId: 'pickle-1',
        session_date: '2026-05-10',
        status: 'completed',
        water_amount: 120000,
        attendanceRecords: [
          { memberId: 'fixed-a', status: 'present' },
        ],
      }],
      externalTickets: [],
    },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state.pickle, 'viet-hoang', state.members, '2026-05')

  // summaryCards[1] = water card; amount = -waterFee; casual with no record → waterFee must be 0
  assert.equal(data.yourBalance.summaryCards[1].amount, 0)
})

test('pickleball fixed member still pays water when no attendance record (fallback=true preserved)', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'fixed-a',
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', groupType: 'pickleball', name: 'Nhóm Test', members: ['fixed-a', 'viet-hoang'] },
    members: [
      { id: 'fixed-a', groupId: 'pickle-1', name: 'Thành viên A', memberType: 'fixed', isActive: true },
      { id: 'viet-hoang', groupId: 'pickle-1', name: 'Việt Hoàng', memberType: 'casual', isActive: true },
    ],
    pickle: {
      monthlyCourtFee: 0,
      monthlyConfigs: [{ yearMonth: '2026-05', courtFee: 0, sessionsCount: 1 }],
      sessions: [{
        id: 's1',
        groupId: 'pickle-1',
        session_date: '2026-05-10',
        status: 'completed',
        water_amount: 120000,
        attendanceRecords: [
          { memberId: 'viet-hoang', status: 'present' },
          // fixed-a has no record → fallback should treat them as present
        ],
      }],
      externalTickets: [],
    },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state.pickle, 'fixed-a', state.members, '2026-05')

  // fixed member with no record and no explicit absence → fallback=true → charged water
  // Water is 120000 split 2 ways (fixed-a + viet-hoang) = 60000 → summaryCards[1].amount = -60000
  assert.equal(data.yourBalance.summaryCards[1].amount, -60000)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:node 2>&1 | grep -A3 "casual member pays zero water\|fixed member still pays water"
```

Expected: both new tests FAIL (current code charges casual member, test expects 0).

- [ ] **Step 3: Commit failing tests**

```bash
git add src/hooks/useScreenData.test.mjs
git commit -m "test: add failing tests for casual member water charge bug"
```

---

### Task 2: Fix `memberWaterShare`

**Files:**
- Modify: `src/hooks/useScreenData.js` (line 2753)

- [ ] **Step 1: Replace the function**

Find and replace in `src/hooks/useScreenData.js`:

```js
// OLD (line 2753):
function memberWaterShare(sessions, memberId, members = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const presentIds = effectiveSessionMemberIds(session, members, true)
    if (!presentIds.some(id => String(id) === String(memberId))) return sum
    const splitCount = presentIds.length + sessionGuests(session).length
    return sum + (splitCount > 0 ? Math.round(sessionWaterAmount(session) / splitCount) : 0)
  }, 0)
}
```

Replace with:

```js
function memberWaterShare(sessions, memberId, fixedMembers = [], casualMembers = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const fixedPresentIds = effectiveSessionMemberIds(session, fixedMembers, true)
    const casualPresentIds = effectiveSessionMemberIds(session, casualMembers, false)
    const presentIds = [...new Set([...fixedPresentIds, ...casualPresentIds])]
    if (!presentIds.some(id => String(id) === String(memberId))) return sum
    const splitCount = presentIds.length + sessionGuests(session).length
    return sum + (splitCount > 0 ? Math.round(sessionWaterAmount(session) / splitCount) : 0)
  }, 0)
}
```

- [ ] **Step 2: Update call site in `buildMemberMonthBalance` (line ~2732)**

Find:
```js
const waterFee = memberWaterShare(sessions, memberId, members)
```

Replace with:
```js
const waterFee = memberWaterShare(sessions, memberId, fixedMembers, casualMembers)
```

Note: `fixedMembers` and `casualMembers` are defined just above at lines 2708-2709 — no additional changes needed.

- [ ] **Step 3: Run first test to see it pass**

```bash
npm run test:node 2>&1 | grep -A3 "casual member pays zero water"
```

Expected: PASS.

---

### Task 3: Fix `memberExtrasShare`

**Files:**
- Modify: `src/hooks/useScreenData.js` (line 2772)

- [ ] **Step 1: Replace the function signature and `presentIds` line**

Find:
```js
function memberExtrasShare(sessions, memberId, state, members = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const presentIds = effectiveSessionMemberIds(session, members)
```

Replace with:
```js
function memberExtrasShare(sessions, memberId, state, fixedMembers = [], casualMembers = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const fixedPresentIds = effectiveSessionMemberIds(session, fixedMembers, true)
    const casualPresentIds = effectiveSessionMemberIds(session, casualMembers, false)
    const presentIds = [...new Set([...fixedPresentIds, ...casualPresentIds])]
```

The rest of the function body (lines 2775-2796) remains unchanged — it already uses `presentIds` as a variable reference.

- [ ] **Step 2: Update call site in `buildMemberMonthBalance` (line ~2733)**

Find:
```js
const extras = memberExtrasShare(sessions, memberId, state, members)
```

Replace with:
```js
const extras = memberExtrasShare(sessions, memberId, state, fixedMembers, casualMembers)
```

- [ ] **Step 3: Run all tests**

```bash
npm run test:node 2>&1 | tail -20
```

Expected: all tests pass including the two new ones.

- [ ] **Step 4: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useScreenData.js
git commit -m "fix: casual member water cost uses presence-based fallback only

Previously memberWaterShare and memberExtrasShare called
effectiveSessionMemberIds with fallback=true for ALL members.
This caused casual members with no attendance record to be treated
as present (by the fallback logic for fixed members), resulting in
incorrect water charges.

Fix: split members into fixedMembers (fallback=true) and
casualMembers (fallback=false) before computing present IDs.
Water is still split equally among all present members regardless
of type."
```

---

## Verification End-to-End

1. `npm run test:node` → all pass including 2 new water tests
2. `npm run build` → no errors
3. Browser check (optional): open localhost, navigate to pickleball overview for Việt Hoàng in tháng 5 → water fee should show 0đ
4. Fixed member with no record in a session with attendance records for others → still sees water fee > 0
