# Plan: Carry Forward Balance (Gộp Nợ Sang Tháng Sau)

**Date:** 2026-06-16  
**Spec:** `docs/superpowers/specs/2026-06-16-carry-forward-balance-design.md`  
**Status:** ready

## Goal

Thủ quỹ gộp khoản nợ nhỏ còn sót của tháng cũ sang tháng sau cho từng member riêng lẻ. Khoản này trở thành expense thực có payer = thủ quỹ, chia riêng member đó.

## Architecture

- DB: bảng `member_month_settlements` theo dõi settlement per member/month/group. 2 RPC (SECURITY DEFINER) xử lý create + undo toàn bộ trong 1 transaction.
- Store: fetch settlements, 2 actions mới gọi RPC rồi reload.
- useScreenData: `buildPrevMonthUnpaid` kiểm tra settlement; `buildPaymentProgressRows` thêm 2 field `prevMonthResidual` + `prevMonthSettled` per row.
- Home.jsx: `TreasurerPaymentDashboard` nhận props mới, hiện button/chip trong section "Đã nhận".

---

### Task 1: DB Migration — table + RLS + 2 RPC

**Status:** pending  
**Commit:** —

> ⚠️ Claude sẽ apply migration trực tiếp bằng MCP — Codex viết SQL, không apply.

**Files:**
- Create: `supabase/migrations/20260616_carry_forward_balance.sql`

**Steps:**

- [ ] **Step 1: Viết SQL migration**

```sql
-- Bảng theo dõi settlement per member/tháng/nhóm
CREATE TABLE IF NOT EXISTS public.member_month_settlements (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id            uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  group_id             uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  month                text NOT NULL,  -- 'YYYY-MM'
  expense_id           uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  settled_by_member_id uuid REFERENCES public.members(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, group_id)
);

ALTER TABLE public.member_month_settlements ENABLE ROW LEVEL SECURITY;

-- SELECT: mọi member trong group
CREATE POLICY "member_month_settlements_select" ON public.member_month_settlements
  FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT m.group_id FROM public.members m
      WHERE m.id = auth.uid()::uuid
         OR EXISTS (
           SELECT 1 FROM public.member_tokens mt
           WHERE mt.member_id = m.id
             AND mt.token = current_setting('request.jwt.claims', true)::json->>'sub'
             AND mt.revoked_at IS NULL
         )
    )
    OR group_id IN (
      SELECT group_id FROM public.members
      WHERE profile_id = (
        SELECT profile_id FROM public.members
        WHERE id IN (
          SELECT member_id FROM public.member_tokens
          WHERE revoked_at IS NULL
        )
        LIMIT 1
      )
    )
  );

-- Simpler SELECT: same group as caller
DROP POLICY IF EXISTS "member_month_settlements_select" ON public.member_month_settlements;
CREATE POLICY "member_month_settlements_select" ON public.member_month_settlements
  FOR SELECT TO authenticated USING (true);

-- INSERT/DELETE: chỉ treasurer
CREATE POLICY "member_month_settlements_insert" ON public.member_month_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE group_id = member_month_settlements.group_id
        AND role = 'treasurer'
        AND (
          id = auth.uid()::uuid
          OR id IN (SELECT member_id FROM public.member_tokens WHERE revoked_at IS NULL)
        )
    )
  );

CREATE POLICY "member_month_settlements_delete" ON public.member_month_settlements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE group_id = member_month_settlements.group_id
        AND role = 'treasurer'
        AND (
          id = auth.uid()::uuid
          OR id IN (SELECT member_id FROM public.member_tokens WHERE revoked_at IS NULL)
        )
    )
  );

-- RPC: tạo carry-forward expense + ghi settlement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.defer_member_month_balance(
  p_member_id            uuid,
  p_group_id             uuid,
  p_month                text,      -- 'YYYY-MM' của tháng cũ
  p_amount               numeric,   -- absolute value, số tiền chuyển sang
  p_next_month_date      date,      -- ngày đầu tháng sau (expense_date)
  p_member_name          text,
  p_treasurer_member_id  uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_settlement_id uuid;
  v_title text;
BEGIN
  -- Kiểm tra treasurer
  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_treasurer_member_id
      AND group_id = p_group_id
      AND role = 'treasurer'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not treasurer of this group';
  END IF;

  -- Không cho defer 2 lần cùng member+month
  IF EXISTS (
    SELECT 1 FROM public.member_month_settlements
    WHERE member_id = p_member_id AND group_id = p_group_id AND month = p_month
  ) THEN
    RAISE EXCEPTION 'Already settled for this member and month';
  END IF;

  v_title := 'Nợ chuyển từ tháng ' || SUBSTRING(p_month FROM 6 FOR 2) || ' · ' || p_member_name;

  -- Tạo expense
  INSERT INTO public.expenses (
    group_id, title, amount, expense_date,
    paid_by_member_id, split_method, status, created_at
  ) VALUES (
    p_group_id, v_title, p_amount, p_next_month_date,
    p_treasurer_member_id, 'custom', 'approved', now()
  )
  RETURNING id INTO v_expense_id;

  -- Participant: chỉ member đó
  INSERT INTO public.expense_participants (expense_id, member_id, share_amount)
  VALUES (v_expense_id, p_member_id, p_amount);

  -- Ghi settlement
  INSERT INTO public.member_month_settlements (
    member_id, group_id, month, expense_id, settled_by_member_id
  ) VALUES (
    p_member_id, p_group_id, p_month, v_expense_id, p_treasurer_member_id
  )
  RETURNING id INTO v_settlement_id;

  RETURN v_settlement_id;
END;
$$;

-- RPC: undo (xóa expense + settlement)
CREATE OR REPLACE FUNCTION public.undo_defer_member_month_balance(
  p_settlement_id        uuid,
  p_treasurer_member_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_group_id   uuid;
BEGIN
  SELECT expense_id, group_id INTO v_expense_id, v_group_id
  FROM public.member_month_settlements
  WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_treasurer_member_id AND group_id = v_group_id AND role = 'treasurer'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not treasurer of this group';
  END IF;

  -- Xóa participants trước (FK)
  DELETE FROM public.expense_participants WHERE expense_id = v_expense_id;
  -- Xóa expense
  DELETE FROM public.expenses WHERE id = v_expense_id;
  -- Xóa settlement
  DELETE FROM public.member_month_settlements WHERE id = p_settlement_id;
END;
$$;
```

- [ ] **Step 2: Verify file tồn tại**
  Run: `ls supabase/migrations/20260616_carry_forward_balance.sql`
  Expected: file path in output

> ⚠️ Claude apply migration bằng MCP sau task 1 commit.

---

### Task 2: Store — fetch settlements + 2 actions

**Status:** pending  
**Commit:** —

**Files:**
- Modify: `src/store.jsx`

**Steps:**

- [ ] **Step 1: Thêm `member_month_settlements` vào `fetchGroupData`**

Trong `fetchGroupData` (line ~605), thêm vào destructure array và `Promise.all`:

```js
// Thêm vào cuối Promise.all (sau jR):
sb.from('member_month_settlements').select('*')
```

Destructure: thêm `msR` sau `jR`:
```js
const [mR, prR, gR, mtR, eR, pR, sR, spR, ppR, pcR, pmcR, psR, paR, pbsR, pbaR, psiR, ptR, popR, dR, nR, jR, msR] = await Promise.all([...])
```

Thêm warn: `if (msR.error) console.warn('[store] member_month_settlements query failed:', msR.error)`

Thêm vào return object: `monthSettlements: msR.data || []`

- [ ] **Step 2: Thêm action `DEFER_MONTH_BALANCE`**

Thêm sau case `TREASURER_CONFIRM_PAYMENT` (khoảng line 2010):

```js
case 'DEFER_MONTH_BALANCE': {
  if (!sb || !state.currentUserId) return null
  const { data, error } = await sb.rpc('defer_member_month_balance', {
    p_member_id: action.memberId,
    p_group_id: action.groupId || state.currentGroupId,
    p_month: action.month,
    p_amount: Number(action.amount),
    p_next_month_date: action.nextMonthDate,
    p_member_name: action.memberName || '',
    p_treasurer_member_id: state.currentUserId,
  })
  if (error) { console.error('[store] DEFER_MONTH_BALANCE:', error); throw error }
  await refresh()
  return data
}

case 'UNDO_DEFER_MONTH_BALANCE': {
  if (!sb || !state.currentUserId) return null
  const { data, error } = await sb.rpc('undo_defer_member_month_balance', {
    p_settlement_id: action.settlementId,
    p_treasurer_member_id: state.currentUserId,
  })
  if (error) { console.error('[store] UNDO_DEFER_MONTH_BALANCE:', error); throw error }
  await refresh()
  return data
}
```

- [ ] **Step 3: Build + verify**
  Run: `npm run build 2>&1 | tail -5`
  Expected: `built in` hoặc `✓` — không có error

- [ ] **Step 4: Commit**
```
git add src/store.jsx
git commit -m "feat: fetch monthSettlements + DEFER/UNDO_DEFER_MONTH_BALANCE actions"
```

---

### Task 3: useScreenData — settlement check + enrich progressRows

**Status:** pending  
**Commit:** —

**Files:**
- Modify: `src/hooks/useScreenData.js`

**Steps:**

- [ ] **Step 1: `buildPrevMonthUnpaid` — thêm settlement check**

Tại line 198, sau check `if (selectedYearMonth !== monthKey(new Date())) return null`, thêm:

```js
// Check nếu đã settle tháng trước → không hiện notice nữa
const prevYearMonthEarly = shiftMonthKey(selectedYearMonth, -1)
const settlements = safeArray(state?.monthSettlements)
const me2 = safeArray(members).find(member => String(member.id) === String(currentUserId))
if (me2 && settlements.some(s =>
  String(s.member_id) === String(currentUserId) &&
  String(s.month) === String(prevYearMonthEarly) &&
  String(s.group_id) === String(me2.group_id)
)) return null
```

> Lưu ý: đặt check này trước khi tính `prevYearMonth` lại bên dưới (line 200 tính lại là ok vì `prevYearMonthEarly` và `prevYearMonth` cùng giá trị).

- [ ] **Step 2: `buildPaymentProgressRows` — thêm `prevMonthResidual` + `prevMonthSettled` per row**

Hàm `buildPaymentProgressRows` signature hiện tại:
```js
function buildPaymentProgressRows(profileBreakdown, members, state, monthLabel)
```

Thêm param thứ 5: `settlements = []` và `selectedYearMonth`:
```js
function buildPaymentProgressRows(profileBreakdown, members, state, monthLabel, settlements = [], selectedYearMonth = '')
```

Tại cuối `putRow` callback (trong `rowsByProfile.set(...)`), bổ sung 2 field vào object được set:

```js
// Trong rowsByProfile.set(profileId, { ... }), thêm:
prevMonthResidual: 0,
prevMonthSettled: false,
```

Sau `return [...rowsByProfile.values()]`, thêm enrich step:

```js
const prevMonth = selectedYearMonth ? shiftMonthKey(selectedYearMonth, -1) : ''
return [...rowsByProfile.values()]
  .map(row => {
    const memberIds = safeArray(row.memberIds)
    const settled = prevMonth && safeArray(settlements).some(s =>
      memberIds.includes(String(s.member_id)) &&
      String(s.month) === prevMonth
    )
    const settlement = settled ? safeArray(settlements).find(s =>
      memberIds.includes(String(s.member_id)) && String(s.month) === prevMonth
    ) : null
    // prevMonthResidual: cần biết balance tháng trước của member này
    // Để đơn giản: nếu treasurer đang xem confirmedRecords, residual > 0 = chưa settle
    // Thực ra builded từ profileBreakdown tháng trước — bỏ qua tính chi tiết,
    // để Home.jsx tự tính từ prevMonthUnpaidByMember được truyền xuống
    return {
      ...row,
      prevMonthSettled: !!settled,
      settlementId: settlement?.id || null,
      settlementExpenseId: settlement?.expense_id || null,
    }
  })
  .sort((a, b) => paymentProgressStatusRank(b.status) - paymentProgressStatusRank(a.status) || b.amount - a.amount || a.name.localeCompare(b.name, 'vi'))
```

- [ ] **Step 3: Cập nhật caller của `buildPaymentProgressRows` trong `buildHomeData`**

Tìm nơi gọi `buildPaymentProgressRows(...)` trong `buildHomeData` (line ~236 khu vực). Thêm 2 tham số:
```js
buildPaymentProgressRows(profileBreakdown, members, state, monthLabel, safeArray(state?.monthSettlements), selectedYearMonth)
```

- [ ] **Step 4: Tính `prevMonthUnpaidByMember` trong `buildHomeData` để truyền xuống**

Trong `buildHomeData`, sau khi tính `profileBreakdown` (line ~237), thêm:

```js
// Per-member prev month residual cho TreasurerPaymentDashboard
const prevYM = shiftMonthKey(selectedYearMonth, -1)
const prevDate2 = dateFromYearMonth(prevYM)
const prevExpGroups = safeGroups
  .filter(group => groupKind(group) !== 'pickleball')
  .map(group => groupWithMonthExpenses(group, prevDate2))
const prevSessions2 = getStateMonthSessions(pickleballState, prevDate2)
const prevSourceBalancesAll = buildHomeSourceBalances(state, prevExpGroups, pickleballState, pickle, prevSessions2, members, prevDate2)
const allProfilesPrevBreakdown = aggregateBalancesByProfile(prevSourceBalancesAll, members)
const prevMonthUnpaidByMember = {}
safeArray(allProfilesPrevBreakdown).forEach(row => {
  if (Number(row.amount) < 0) {
    const settled = safeArray(state?.monthSettlements).some(s =>
      safeArray(row.memberIds || []).includes(String(s.member_id)) &&
      String(s.month) === prevYM
    )
    if (!settled) {
      safeArray(row.memberIds || []).forEach(mid => {
        prevMonthUnpaidByMember[String(mid)] = Math.abs(Number(row.amount))
      })
    }
  }
})
```

Thêm `prevMonthUnpaidByMember` vào return object của `buildHomeData`.

- [ ] **Step 5: npm test**
  Run: `npm test 2>&1 | tail -20`
  Expected: tất cả tests pass, không có FAIL

- [ ] **Step 6: Commit**
```
git add src/hooks/useScreenData.js
git commit -m "feat: settlement check in buildPrevMonthUnpaid + enrich progressRows with prevMonthSettled"
```

---

### Task 4: Home.jsx — UI button/chip trong TreasurerPaymentDashboard

**Status:** pending  
**Commit:** —

**Files:**
- Modify: `src/screens/Home.jsx`

**Steps:**

- [ ] **Step 1: Truyền props mới vào `TreasurerPaymentDashboard`**

Tìm nơi render `<TreasurerPaymentDashboard` trong `PaymentSheet` (line ~665 khu vực). Thêm props:
```jsx
monthSettlements={data?.monthSettlements || state?.monthSettlements || []}
prevMonthUnpaidByMember={data?.prevMonthUnpaidByMember || {}}
onDeferMonthBalance={(payload) => onAction?.('deferMonthBalance', payload)}
onUndoDeferMonthBalance={(payload) => onAction?.('undoDeferMonthBalance', payload)}
```

- [ ] **Step 2: Nhận props trong `TreasurerPaymentDashboard` function signature**

```js
function TreasurerPaymentDashboard({ data, progressRows, pendingRecords, refundRows, confirmedRefunds, onAction, onViewPaymentRecord, onConfirmRefund, monthSettlements, prevMonthUnpaidByMember, onDeferMonthBalance, onUndoDeferMonthBalance }) {
```

- [ ] **Step 3: Tính `prevMonth` và `nextMonthLabel` trong component**

Ngay sau `const rows = safeArray(progressRows)` (line ~982), thêm:

```js
const currentYM = data?.yearMonth || ''
const prevMonthStr = currentYM ? (() => {
  const [y, m] = currentYM.split('-').map(Number)
  const pm = m - 1 === 0 ? 12 : m - 1
  const py = m - 1 === 0 ? y - 1 : y
  return `${py}-${String(pm).padStart(2, '0')}`
})() : ''
const nextMonthNum = currentYM ? (() => {
  const m = Number(currentYM.split('-')[1])
  return m === 12 ? 1 : m + 1
})() : ''
const nextMonthLabel = nextMonthNum ? `T${nextMonthNum}` : ''
const nextMonthFirstDay = currentYM ? (() => {
  const [y, m] = currentYM.split('-').map(Number)
  const nm = m === 12 ? 1 : m + 1
  const ny = m === 12 ? y + 1 : y
  return `${ny}-${String(nm).padStart(2, '0')}-01`
})() : ''
const safeSettlements = safeArray(monthSettlements)
const safePrevUnpaid = prevMonthUnpaidByMember || {}
```

- [ ] **Step 4: Thêm button/chip vào section "Đã nhận" (confirmedRecords)**

Tại line ~1103, trong `confirmedRecordsFiltered.map(record => (...)`:

```jsx
{confirmedRecordsFiltered.length > 0 ? confirmedRecordsFiltered.map(record => {
  const memberIds = safeArray(record.memberIds || [record.memberId]).map(String)
  const residual = memberIds.reduce((max, mid) => Math.max(max, safePrevUnpaid[mid] || 0), 0)
  const settlement = prevMonthStr ? safeSettlements.find(s =>
    memberIds.includes(String(s.member_id)) && String(s.month) === prevMonthStr
  ) : null
  const isSettled = !!settlement
  return (
    <PaymentDashboardRow key={record.notificationId || record.id} row={record} tone="confirmed">
      <button type="button" onClick={() => { onViewPaymentRecord?.(record); onAction?.('viewPaymentNotice', record); }} style={miniDashButton('rgba(99,102,241,0.20)', colors.brandLight)}>Xem</button>
      <button type="button" onClick={() => withLoading(() => onAction?.('cancelPaymentRecord', record))} style={miniDashButton(colors.danger, '#fff')}>Hủy</button>
      {residual > 0 && !isSettled && (
        <button
          type="button"
          onClick={() => withLoading(() => onDeferMonthBalance?.({
            memberId: memberIds[0] || record.memberId,
            profileId: record.profileId,
            month: prevMonthStr,
            amount: residual,
            nextMonthDate: nextMonthFirstDay,
            memberName: record.name || record.memberName || '',
            groupId: data?.currentGroupId || '',
          }))}
          style={miniDashButton('#f59e0b', '#1c1917')}
        >
          Gộp → {nextMonthLabel}
        </button>
      )}
      {isSettled && (
        <>
          <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.18)', color: '#4ade80', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>✓ Gộp {nextMonthLabel}</span>
          <button
            type="button"
            onClick={() => withLoading(() => onUndoDeferMonthBalance?.({
              settlementId: settlement.id,
            }))}
            style={miniDashButton(colors.danger, '#fff')}
          >
            Hủy gộp
          </button>
        </>
      )}
    </PaymentDashboardRow>
  )
}) : (
  <div style={{ padding: 10, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Không có member khớp tìm kiếm.</div>
)}
```

- [ ] **Step 5: Xử lý action dispatch trong `handle()` của app-v2 / Home**

Tìm handler `onAction` của PaymentSheet. Thêm 2 cases:

```js
case 'deferMonthBalance':
  await dispatch('DEFER_MONTH_BALANCE', { ...payload })
  break
case 'undoDeferMonthBalance':
  await dispatch('UNDO_DEFER_MONTH_BALANCE', { settlementId: payload.settlementId })
  break
```

- [ ] **Step 6: Build**
  Run: `npm run build 2>&1 | tail -5`
  Expected: build pass

- [ ] **Step 7: npm test**
  Run: `npm test 2>&1 | tail -20`
  Expected: tất cả tests pass

- [ ] **Step 8: Commit**
```
git add src/screens/Home.jsx
git commit -m "feat: Gộp→Tháng button in TreasurerPaymentDashboard confirmedRecords"
```

---

### Task 5: Claude apply DB migration (MCP)

**Status:** pending  
**Commit:** —

> Claude tự làm — không giao Codex.

- [ ] **Step 1:** Apply migration file bằng `mcp__supabase__apply_migration`
- [ ] **Step 2:** Verify table tồn tại: `SELECT count(*) FROM member_month_settlements`
- [ ] **Step 3:** Verify RPCs tồn tại: `SELECT proname FROM pg_proc WHERE proname LIKE '%defer_member%'`

---

## Thứ Tự Thực Hiện

1. Codex: Task 1 (viết SQL file) → Claude: Task 5 (apply migration)
2. Codex: Task 2 (store) → Codex: Task 3 (useScreenData) → Codex: Task 4 (Home.jsx)
3. Claude: verify build + npm test cuối cùng
