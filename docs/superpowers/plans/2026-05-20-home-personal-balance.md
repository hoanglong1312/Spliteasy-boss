# Home Personal Balance + Của tôi Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personal monthly balance banner to Home and a "Của tôi" filter that shows only expenses related to the logged-in member.

**Architecture:** Home renders the new UI, but `useScreenData.js` must first pass enough normalized data because current Home props only contain display-only `transactions`. `store.jsx` already normalizes Supabase `expenses.paid_by_member_id` into `expense.paidBy`, and normalized expenses include `participants` plus `splits`; `useScreenData.js` will expose current-month expense rows and per-transaction relationship metadata to `Home.jsx`.

**Tech Stack:** React 18 + Vite, inline styles only, `src/store.jsx` normalized expense shape, `src/hooks/useScreenData.js` screen data builders, Node `node:test` source-level tests, Playwright final smoke test run only by Claude main.

---

## Data Shape Findings

| Question | Actual shape |
|----------|--------------|
| Payer field | Supabase uses `paid_by_member_id`; `src/store.jsx` normalizes it to `expense.paidBy`. |
| Creator/submitter field | `submitted_by_member_id` is normalized to `submittedBy` and `submitted_by_member_id`; it is not the payer. |
| Split data | Normalized expenses have `participants: memberId[]` and `splits: { memberId, amount }[]`. |
| Current user in Home | `buildHomeData()` currently receives `currentUserId`, but does not pass it to `Home`. |
| Current Home list | `Home.jsx` receives `data.transactions`, which lacks `paidBy`, `participants`, and `splits`. |
| Multi-group member IDs | `memberIdForGroup()` maps the current user to the matching member ID inside each group; balance rows should carry `currentMemberId` per expense. |
| Month source | `buildHomeData()` currently uses `today` for `monthLabel`; `monthPrev` and `monthNext` in `src/app-v2.jsx` only log. This plan computes the banner from the same current month and does not implement month navigation. |
| Store changes | No `src/store.jsx` edit is needed; the normalized shape already exists in `state.groups[].expenses` and `state.expenses`. |

Balance should count only settled money states: empty status, `approved`, `settled`, `done`, or `closed`. This matches existing balance behavior in `src/data.jsx`, where `groupBalance()` only counts approved expenses.

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/screens/AddExpenseHome.test.mjs` | Modify | Add source-level TDD checks for Home data shape, PersonalBalance rendering, balance helper logic, and the "Của tôi" filter. |
| `src/hooks/useScreenData.js` | Modify | Expose `currentUserId`, `currentUserName`, current-month normalized `expenses`, and `isMine` transaction metadata for Home. |
| `src/screens/Home.jsx` | Modify | Render `PersonalBalance`, compute owe/owed/net from normalized props, and add the controlled "Của tôi" filter. |

## Execution Notes

- Executor runs Node source tests and `npm run build`.
- Executor does not run Playwright.
- Claude main runs final QA with:

```bash
npx playwright test --reporter=line
```

---

### Task 1: Pass Home Personal Expense Data

**Files:**
- Modify: `src/screens/AddExpenseHome.test.mjs`
- Modify: `src/hooks/useScreenData.js`

- [ ] **Step 1: Write the failing data-shape tests**

In `src/screens/AddExpenseHome.test.mjs`, after the existing `Home activity list filters by title, status, and category` test, add:

```js
test('Home data exposes member identity and current-month normalized expense rows', () => {
  assert.match(screenDataSource, /currentUserId,\s*\n\s*currentUserName: state\?\.currentUserName \|\| 'Bạn'/);
  assert.match(screenDataSource, /expenses: buildHomeExpenses\(safeGroups, currentUserId, members, state\?\.currentUserName, today\)/);
  assert.match(screenDataSource, /function buildHomeExpenses\(groups, currentUserId, members, currentUserName, monthDate\)/);
  assert.match(screenDataSource, /const meForGroup = memberIdForGroup\(group, currentUserId, members, currentUserName\)/);
  assert.match(screenDataSource, /paidBy: expense\.paidBy \|\| expense\.paid_by_member_id/);
  assert.match(screenDataSource, /participants: safeArray\(expense\.participants\)/);
  assert.match(screenDataSource, /splits: safeArray\(expense\.splits\)\.map\(normalizeHomeSplit\)\.filter\(split => split\.memberId\)/);
  assert.match(screenDataSource, /currentMemberId: meForGroup/);
});

test('Home transactions carry relationship metadata for the Của tôi filter', () => {
  assert.match(screenDataSource, /const group = groups\.find\(g => g\.id === expense\.groupId\)/);
  assert.match(screenDataSource, /const normalizedExpense = \{ \.\.\.expense, paidBy, participants, splits \}/);
  assert.match(screenDataSource, /isMine: isExpenseRelatedToMember\(normalizedExpense, meForGroup\)/);
  assert.match(screenDataSource, /function isExpenseRelatedToMember\(expense, memberId\)/);
  assert.match(screenDataSource, /safeArray\(expense\?\.participants\)\.some\(member => String\(member\) === id\)/);
  assert.match(screenDataSource, /safeArray\(expense\?\.splits\)\.some\(split => String\(split\.memberId \|\| split\.member_id\) === id\)/);
});
```

- [ ] **Step 2: Run the failing data-shape tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs
```

Expected: FAIL because `buildHomeExpenses`, `currentUserId`, `currentUserName`, normalized Home expense rows, and `isMine` metadata are not in `useScreenData.js` yet.

- [ ] **Step 3: Add Home identity and monthly expenses to `buildHomeData()`**

In `src/hooks/useScreenData.js`, replace the end of the `return` object in `buildHomeData()`:

```js
    todaySession: session ? toTodaySessionCard(session, pickle, members) : null,
    transactions: buildTransactions(safeGroups, currentUserId, members, state?.currentUserName),
  }
}
```

with:

```js
    todaySession: session ? toTodaySessionCard(session, pickle, members) : null,
    currentUserId,
    currentUserName: state?.currentUserName || 'Bạn',
    expenses: buildHomeExpenses(safeGroups, currentUserId, members, state?.currentUserName, today),
    transactions: buildTransactions(safeGroups, currentUserId, members, state?.currentUserName),
  }
}
```

- [ ] **Step 4: Add normalized Home expense helpers**

In `src/hooks/useScreenData.js`, immediately after `buildHomeData()`, add:

```js
function buildHomeExpenses(groups, currentUserId, members, currentUserName, monthDate) {
  return safeArray(groups).flatMap(group => {
    const meForGroup = memberIdForGroup(group, currentUserId, members, currentUserName)
    return safeArray(group.expenses)
      .filter(expense => isSameExpenseMonth(expense, monthDate))
      .map(expense => {
        const paidBy = expense.paidBy || expense.paid_by_member_id
        const participants = safeArray(expense.participants)
        const splits = safeArray(expense.splits).map(normalizeHomeSplit).filter(split => split.memberId)
        const normalizedExpense = { ...expense, paidBy, participants, splits }

        return {
          id: expense.id,
          groupId: expense.groupId || expense.group_id || group.id,
          groupName: group.name || 'Nhóm',
          title: expense.title || 'Chi tiêu',
          amount: Number(expense.amount) || 0,
          paidBy,
          participants,
          splits,
          date: expense.date || expense.expense_date,
          status: expense.status,
          currentMemberId: meForGroup,
          isMine: isExpenseRelatedToMember(normalizedExpense, meForGroup),
        }
      })
  })
}

function normalizeHomeSplit(split) {
  return {
    memberId: split.memberId || split.member_id,
    amount: Number(split.amount ?? split.share_amount ?? split.share ?? 0) || 0,
  }
}

function isSameExpenseMonth(expense, monthDate) {
  const expenseMonth = monthKey(expense?.date || expense?.expense_date)
  const targetMonth = monthKey(monthDate)
  return Boolean(expenseMonth && targetMonth && expenseMonth === targetMonth)
}

function isExpenseRelatedToMember(expense, memberId) {
  if (!memberId) return false
  const id = String(memberId)
  if (String(expense?.paidBy || expense?.paid_by_member_id || '') === id) return true
  return safeArray(expense?.participants).some(member => String(member) === id)
    || safeArray(expense?.splits).some(split => String(split.memberId || split.member_id) === id)
}
```

- [ ] **Step 5: Add relationship metadata to Home transactions**

In `src/hooks/useScreenData.js`, replace the full `buildTransactions()` function with:

```js
function buildTransactions(groups, currentUserId, members, currentUserName) {
  return recentActivity(groups, 24)
    .slice()
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .slice(0, 4)
    .map(expense => {
      const group = groups.find(g => g.id === expense.groupId)
      const meForGroup = memberIdForGroup(
        group,
        currentUserId,
        members,
        currentUserName
      )
      const amount = expenseImpact(expense, meForGroup)
      const paidBy = expense.paidBy || expense.paid_by_member_id
      const participants = safeArray(expense.participants)
      const splits = safeArray(expense.splits).map(normalizeHomeSplit).filter(split => split.memberId)
      const normalizedExpense = { ...expense, paidBy, participants, splits }

      return {
        id: expense.id,
        icon: expenseIcon(expense),
        category: expenseCategory(expense),
        title: expense.title || 'Chi tiêu',
        subtitle: expense.groupName || memberName(expense.paidBy, members),
        dateLabel: relativeDateLabel(expense.date),
        amount,
        status: expense.status,
        paidBy,
        participants,
        splits,
        currentMemberId: meForGroup,
        isMine: isExpenseRelatedToMember(normalizedExpense, meForGroup),
      }
    })
}
```

- [ ] **Step 6: Run the data-shape tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs
```

Expected: PASS for the new data-shape tests and all existing tests in that file.

- [ ] **Step 7: Build**

Run:

```bash
npm run build
```

Expected: Vite build completes without compile errors.

- [ ] **Step 8: Commit Task 1**

Run:

```bash
git add src/screens/AddExpenseHome.test.mjs src/hooks/useScreenData.js
git commit -m "feat: expose home personal expense data"
```

---

### Task 2: Render PersonalBalance Banner

**Files:**
- Modify: `src/screens/AddExpenseHome.test.mjs`
- Modify: `src/screens/Home.jsx`

- [ ] **Step 1: Write the failing PersonalBalance tests**

In `src/screens/AddExpenseHome.test.mjs`, after the Task 1 tests, add:

```js
test('Home renders a PersonalBalance banner only when a current user exists', () => {
  assert.match(homeSource, /<PersonalBalance\s+expenses=\{d\.expenses\}\s+currentUserId=\{d\.currentUserId\}\s+memberName=\{d\.currentUserName \|\| d\.user\.name \|\| d\.user\.firstName\}\s+\/>/);
  assert.match(homeSource, /function PersonalBalance\(\{ expenses, currentUserId, memberName \}\)/);
  assert.match(homeSource, /if \(!currentUserId\) return null/);
  assert.match(homeSource, /const balance = calculatePersonalBalance\(expenses, currentUserId\)/);
  assert.match(homeSource, /background: '#1e293b'/);
  assert.match(homeSource, /borderRadius: 8/);
  assert.match(homeSource, /Nợ: \{formatDong\(balance\.owes\)\} · Được nợ: \{formatDong\(balance\.owed\)\}/);
});

test('Home personal balance helper uses paidBy, splits, participants, and per-expense member IDs', () => {
  assert.match(homeSource, /function calculatePersonalBalance\(expenses, currentUserId\)/);
  assert.match(homeSource, /const memberId = expense\.currentMemberId \|\| currentUserId/);
  assert.match(homeSource, /if \(!isBalanceStatus\(expense\.status\)\) return totals/);
  assert.match(homeSource, /if \(String\(expense\.paidBy \|\| ''\) === String\(memberId\)\)/);
  assert.match(homeSource, /owed: totals\.owed \+ Math\.max\(amount - myShare, 0\)/);
  assert.match(homeSource, /owes: totals\.owes \+ myShare/);
  assert.match(homeSource, /function shareForMember\(expense, memberId\)/);
  assert.match(homeSource, /const split = safeArray\(expense\.splits\)\.find\(item => String\(item\.memberId\) === String\(memberId\)\)/);
  assert.match(homeSource, /return index === participants\.length - 1 \? amount - per \* \(participants\.length - 1\) : per/);
});
```

- [ ] **Step 2: Run the failing PersonalBalance tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs
```

Expected: FAIL because `PersonalBalance`, `calculatePersonalBalance`, `shareForMember`, and `formatDong` do not exist in `Home.jsx` yet.

- [ ] **Step 3: Render the banner above the transaction filters**

In `src/screens/Home.jsx`, immediately before:

```jsx
        <SectionLabel action="Xem tất cả →">Giao dịch gần đây</SectionLabel>
```

add:

```jsx
        <PersonalBalance
          expenses={d.expenses}
          currentUserId={d.currentUserId}
          memberName={d.currentUserName || d.user.name || d.user.firstName}
        />
```

- [ ] **Step 4: Add PersonalBalance and balance helpers**

In `src/screens/Home.jsx`, add this block after the `Home` component and before `ActivityRow`:

```jsx
function PersonalBalance({ expenses, currentUserId, memberName }) {
  if (!currentUserId) return null;

  const balance = calculatePersonalBalance(expenses, currentUserId);
  const netColor = balance.net > 0
    ? colors.success
    : balance.net < 0
      ? colors.danger
      : colors.textSecondary;
  const netLabel = balance.net > 0
    ? `+${formatDong(balance.net)}`
    : balance.net < 0
      ? `-${formatDong(Math.abs(balance.net))}`
      : formatDong(0);

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 8,
      padding: '12px 16px',
      margin: '0 0 8px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary }}>
        {memberName || 'Bạn'}
      </div>
      <div style={{ ...type.amountSm, ...type.mono, marginTop: 4, color: netColor }}>
        {netLabel}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 4 }}>
        Nợ: {formatDong(balance.owes)} · Được nợ: {formatDong(balance.owed)}
      </div>
    </div>
  );
}

function calculatePersonalBalance(expenses, currentUserId) {
  const totals = safeArray(expenses).reduce((totals, expense) => {
    const memberId = expense.currentMemberId || currentUserId;
    if (!isBalanceStatus(expense.status)) return totals;

    const amount = Number(expense.amount) || 0;
    const myShare = shareForMember(expense, memberId);
    if (String(expense.paidBy || '') === String(memberId)) {
      return {
        owed: totals.owed + Math.max(amount - myShare, 0),
        owes: totals.owes,
      };
    }

    if (myShare > 0) {
      return {
        owed: totals.owed,
        owes: totals.owes + myShare,
      };
    }

    return totals;
  }, { owed: 0, owes: 0 });

  return {
    ...totals,
    net: totals.owed - totals.owes,
  };
}

function shareForMember(expense, memberId) {
  const split = safeArray(expense.splits).find(item => String(item.memberId) === String(memberId));
  if (split) return Number(split.amount) || 0;

  const participants = safeArray(expense.participants);
  const index = participants.findIndex(id => String(id) === String(memberId));
  if (index === -1 || participants.length === 0) return 0;

  const amount = Number(expense.amount) || 0;
  const per = Math.round(amount / participants.length);
  return index === participants.length - 1 ? amount - per * (participants.length - 1) : per;
}

function isBalanceStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === '' || value === 'approved' || value === 'settled' || value === 'done' || value === 'closed';
}

function formatDong(value) {
  return `${Math.round(Math.abs(Number(value) || 0)).toLocaleString('vi-VN')}đ`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
```

- [ ] **Step 5: Add demo data for local fallback rendering**

In `src/screens/Home.jsx`, replace the top of `DEMO`:

```js
const DEMO = {
  user: { firstName: 'Long', dateLabel: 'Thứ Hai · 19/05/2026', hasNotifications: true },
  monthLabel: 'Tháng 5 · 2026',
```

with:

```js
const DEMO = {
  user: { name: 'Long Nguyễn', firstName: 'Long', dateLabel: 'Thứ Hai · 19/05/2026', hasNotifications: true },
  currentUserId: 'long',
  currentUserName: 'Long Nguyễn',
  monthLabel: 'Tháng 5 · 2026',
```

Then add `expenses` before `transactions`:

```js
  expenses: [
    {
      id: 1,
      title: 'Tiền nước Buổi #8',
      amount: 120000,
      paidBy: 'hoa',
      participants: ['long', 'hoa', 'minh'],
      splits: [
        { memberId: 'long', amount: 40000 },
        { memberId: 'hoa', amount: 40000 },
        { memberId: 'minh', amount: 40000 },
      ],
      status: 'approved',
      currentMemberId: 'long',
    },
    {
      id: 2,
      title: 'Cafe sau buổi',
      amount: 220000,
      paidBy: 'long',
      participants: ['long', 'hoa', 'minh', 'an'],
      splits: [
        { memberId: 'long', amount: 55000 },
        { memberId: 'hoa', amount: 55000 },
        { memberId: 'minh', amount: 55000 },
        { memberId: 'an', amount: 55000 },
      ],
      status: 'approved',
      currentMemberId: 'long',
    },
  ],
```

- [ ] **Step 6: Run the PersonalBalance tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs
```

Expected: PASS for the new PersonalBalance tests and all existing tests in that file.

- [ ] **Step 7: Build**

Run:

```bash
npm run build
```

Expected: Vite build completes without compile errors.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add src/screens/AddExpenseHome.test.mjs src/screens/Home.jsx
git commit -m "feat: add home personal balance banner"
```

---

### Task 3: Add "Của tôi" Filter

**Files:**
- Modify: `src/screens/AddExpenseHome.test.mjs`
- Modify: `src/screens/Home.jsx`

- [ ] **Step 1: Write the failing filter tests**

In `src/screens/AddExpenseHome.test.mjs`, after the Task 2 tests, add:

```js
test('Home has a controlled Của tôi filter that composes with existing filters', () => {
  assert.match(homeSource, /const \[mineOnly, setMineOnly\] = useState\(false\)/);
  assert.match(homeSource, /const mineMatches = !mineOnly \|\| transactionBelongsToCurrentUser\(tx, d\.currentUserId\)/);
  assert.match(homeSource, /return titleMatches && statusMatches && categoryMatches && mineMatches/);
  assert.match(homeSource, /onClick=\{\(\) => setMineOnly\(value => !value\)\}/);
  assert.match(homeSource, />Của tôi<\/button>/);
});

test('Home Của tôi helper falls back from isMine to paidBy, participants, and splits', () => {
  assert.match(homeSource, /function transactionBelongsToCurrentUser\(tx, currentUserId\)/);
  assert.match(homeSource, /if \(tx\?\.isMine === true\) return true/);
  assert.match(homeSource, /const memberId = tx\.currentMemberId \|\| currentUserId/);
  assert.match(homeSource, /if \(String\(tx\?\.paidBy \|\| ''\) === String\(memberId\)\) return true/);
  assert.match(homeSource, /safeArray\(tx\?\.participants\)\.some\(id => String\(id\) === String\(memberId\)\)/);
  assert.match(homeSource, /safeArray\(tx\?\.splits\)\.some\(split => String\(split\.memberId \|\| split\.member_id\) === String\(memberId\)\)/);
});
```

- [ ] **Step 2: Run the failing filter tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs
```

Expected: FAIL because `mineOnly`, the "Của tôi" button, and `transactionBelongsToCurrentUser()` do not exist in `Home.jsx` yet.

- [ ] **Step 3: Add the controlled filter state**

In `src/screens/Home.jsx`, inside `Home`, after:

```js
  const [categoryFilter, setCategoryFilter] = useState('all');
```

add:

```js
  const [mineOnly, setMineOnly] = useState(false);
```

- [ ] **Step 4: Compose the mine filter with existing filters**

In `src/screens/Home.jsx`, replace:

```js
  const visibleTransactions = d.transactions.filter(tx => {
    const titleMatches = !normalizedFilter || String(tx.title || '').toLowerCase().includes(normalizedFilter);
    const statusMatches = statusFilter === 'all' || transactionStatus(tx) === statusFilter;
    const categoryMatches = categoryFilter === 'all' || transactionCategoryGroup(tx) === categoryFilter;
    return titleMatches && statusMatches && categoryMatches;
  });
```

with:

```js
  const visibleTransactions = d.transactions.filter(tx => {
    const titleMatches = !normalizedFilter || String(tx.title || '').toLowerCase().includes(normalizedFilter);
    const statusMatches = statusFilter === 'all' || transactionStatus(tx) === statusFilter;
    const categoryMatches = categoryFilter === 'all' || transactionCategoryGroup(tx) === categoryFilter;
    const mineMatches = !mineOnly || transactionBelongsToCurrentUser(tx, d.currentUserId);
    return titleMatches && statusMatches && categoryMatches && mineMatches;
  });
```

- [ ] **Step 5: Render the "Của tôi" chip in the existing filter bar**

In `src/screens/Home.jsx`, inside the status filter `<div style={{ display: 'flex', ... }}>`, before:

```jsx
          {STATUS_FILTERS.map(filter => {
```

add:

```jsx
          <button
            type="button"
            onClick={() => setMineOnly(value => !value)}
            style={{
              flex: '0 0 auto',
              padding: '7px 11px',
              borderRadius: 100,
              border: `1px solid ${mineOnly ? 'rgba(52,211,153,0.55)' : colors.borderSubtle}`,
              background: mineOnly ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.03)',
              color: mineOnly ? '#6ee7b7' : colors.textSecondary,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >Của tôi</button>
```

- [ ] **Step 6: Add transaction relationship helper**

In `src/screens/Home.jsx`, after `safeArray()` from Task 2, add:

```js
function transactionBelongsToCurrentUser(tx, currentUserId) {
  if (tx?.isMine === true) return true;

  const memberId = tx.currentMemberId || currentUserId;
  if (!memberId) return false;
  if (String(tx?.paidBy || '') === String(memberId)) return true;

  return safeArray(tx?.participants).some(id => String(id) === String(memberId))
    || safeArray(tx?.splits).some(split => String(split.memberId || split.member_id) === String(memberId));
}
```

- [ ] **Step 7: Add relationship metadata to demo transactions**

In `src/screens/Home.jsx`, replace the demo `transactions` array with:

```js
  transactions: [
    {
      id: 1,
      icon: '🏸',
      category: 'water',
      title: 'Tiền nước Buổi #8',
      subtitle: 'CLB Pickleball',
      dateLabel: 'Hôm qua',
      amount: -40000,
      status: 'pending',
      paidBy: 'hoa',
      participants: ['long', 'hoa', 'minh'],
      splits: [{ memberId: 'long', amount: 40000 }],
      currentMemberId: 'long',
      isMine: true,
    },
    {
      id: 2,
      icon: '☕',
      category: 'groups',
      title: 'Cafe sau buổi',
      subtitle: 'Nhóm CLB',
      dateLabel: '17/05',
      amount: 165000,
      status: 'approved',
      paidBy: 'long',
      participants: ['long', 'hoa', 'minh', 'an'],
      splits: [{ memberId: 'long', amount: 55000 }],
      currentMemberId: 'long',
      isMine: true,
    },
    {
      id: 3,
      icon: '🍜',
      category: 'food',
      title: 'Bún bò trưa T7',
      subtitle: 'Minh trả',
      dateLabel: '16/05',
      amount: 0,
      status: 'declined',
      paidBy: 'minh',
      participants: ['hoa', 'minh'],
      splits: [{ memberId: 'hoa', amount: 45000 }],
      currentMemberId: 'long',
      isMine: false,
    },
    {
      id: 4,
      icon: '💸',
      category: 'payment',
      title: 'Thanh toán → Hoa',
      subtitle: 'VietQR',
      dateLabel: '14/05',
      amount: 120000,
      status: 'approved',
      paidBy: 'hoa',
      participants: ['long', 'hoa'],
      splits: [{ memberId: 'long', amount: 120000 }],
      currentMemberId: 'long',
      isMine: true,
    },
  ],
```

- [ ] **Step 8: Run the filter tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs
```

Expected: PASS for the new filter tests and all existing tests in that file.

- [ ] **Step 9: Build**

Run:

```bash
npm run build
```

Expected: Vite build completes without compile errors.

- [ ] **Step 10: Commit Task 3**

Run:

```bash
git add src/screens/AddExpenseHome.test.mjs src/screens/Home.jsx
git commit -m "feat: add home mine filter"
```

---

### Task 4: Final Verification Handoff

**Files:**
- Read: `src/screens/AddExpenseHome.test.mjs`
- Read: `src/hooks/useScreenData.js`
- Read: `src/screens/Home.jsx`

- [ ] **Step 1: Run the source-level regression tests**

Run:

```bash
node --test src/screens/AddExpenseHome.test.mjs src/app-v2.test.mjs src/screens/PickleballSettings.test.mjs
```

Expected: all Node source-level tests pass.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: Vite build completes without compile errors.

- [ ] **Step 3: Inspect the final diff for scope**

Run:

```bash
git diff -- src/screens/AddExpenseHome.test.mjs src/hooks/useScreenData.js src/screens/Home.jsx
```

Expected: diff only covers Home data shape, PersonalBalance, the "Của tôi" filter, demo data, and tests.

- [ ] **Step 4: Report Playwright handoff command for Claude main**

Report this command without running it in Codex:

```bash
npx playwright test --reporter=line
```

Expected from Claude main: all Playwright tests pass after it runs the command outside Codex.
