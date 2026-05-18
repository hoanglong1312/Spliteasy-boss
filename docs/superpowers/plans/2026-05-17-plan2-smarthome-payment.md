# Plan 2 — SmartHome + Payment Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp Tab Tổng quát thành SmartHome thông minh theo role + thêm màn hình Thanh toán (debt breakdown → confirm settlement).

**Architecture:**
- `store.jsx`: fetch open dispute count từ `expense_disputes`, expose `disputeCount` trong state.
- `screen-home.jsx`: thêm `SmartHomeSummary` trong `OverviewLayout` — hai card (Nhóm + Pickleball), CTA thanh toán, treasurer block.
- `screen-groups.jsx`: thêm `ScreenPaymentFlow` — breakdown nợ theo người, confirm settlement.
- `app.jsx`: wire route `payment-flow`.

**Tech Stack:** React, Supabase, existing `data.jsx` helpers (`totalBalances`, `groupBalance`, `pickleSummary`, `fmtVND`)

---

### Task 1: Store — thêm disputeCount vào state

**Files:**
- Modify: `src/store.jsx`

**Context:**
- `fetchGroupData(token)` đang dùng `Promise.all` với 8 queries.
- `normalize(raw, currentMemberId)` build state từ raw data.
- `buildEmptyState()` định nghĩa shape mặc định.
- `expense_disputes` table có cột `status` với giá trị `'open'|'resolved'|'dismissed'`.

- [ ] **Step 1: Viết failing test (manual)**

Mở DevTools Console sau khi login, chạy:
```js
// Expected: state.disputeCount là number >= 0
console.log(window.__store?.getState?.()?.disputeCount)
```
Expected: undefined (chưa có field này)

- [ ] **Step 2: Sửa `fetchGroupData` — thêm dispute count query**

Trong `src/store.jsx`, tìm block `Promise.all`:
```js
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
```

Thay bằng:
```js
const [mR, gR, eR, pR, sR, pcR, psR, paR, dR] = await Promise.all([
  sb.from('members').select('*'),
  sb.from('groups').select('*'),
  sb.from('expenses').select('*').order('expense_date', { ascending: false }),
  sb.from('expense_participants').select('*'),
  sb.from('settlements').select('*').order('settlement_date', { ascending: false }),
  sb.from('pickle_configs').select('*').limit(1).maybeSingle(),
  sb.from('pickle_sessions').select('*').order('session_date', { ascending: false }),
  sb.from('pickle_attendees').select('*'),
  sb.from('expense_disputes').select('id').eq('status', 'open'),
])
```

- [ ] **Step 3: Sửa return của `fetchGroupData`**

Thêm `disputeCount` vào object trả về:
```js
return {
  members:         mR.data || [],
  groups:          gR.data || [],
  expenses:        eR.data || [],
  participants:    pR.data || [],
  settlements:     sR.data || [],
  pickleConfig:    pcR.data,
  pickleSessions:  psR.data || [],
  pickleAttendees: paR.data || [],
  disputeCount:    (dR.data || []).length,
}
```

- [ ] **Step 4: Sửa `buildEmptyState` — thêm disputeCount**

```js
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
    disputeCount: 0,
    _loading: false,
    _error: null,
  }
}
```

- [ ] **Step 5: Sửa `normalize` — thêm disputeCount**

Trong hàm `normalize(raw, currentMemberId)`, thêm `const { ..., disputeCount } = raw` và trả về:
```js
const { members, groups, expenses, participants, settlements, pickleConfig, pickleSessions, pickleAttendees, disputeCount } = raw
```

Và trong object return cuối hàm, thêm trước `_loading`:
```js
disputeCount: disputeCount || 0,
```

- [ ] **Step 6: Verify**

Reload app, login, mở DevTools > Components (React DevTools) hoặc Console:
```js
// Kiểm tra không có lỗi network 400/500
// Kiểm tra app vẫn load bình thường
```
Expected: app load, không có lỗi.

- [ ] **Step 7: Commit**
```bash
git add src/store.jsx
git commit -m "feat: add disputeCount to store state via expense_disputes query"
```

---

### Task 2: SmartHome — hai summary card + treasurer block

**Files:**
- Modify: `src/screen-home.jsx`

**Context:**
- `OverviewLayout` là default layout (tweaks.homeLayout === 'overview').
- Hiện tại: OverviewLayout gồm quick chips → WhoOwesView → GroupCards → Recent activity.
- Spec muốn thêm `SmartHomeSummary` block vào **đầu** OverviewLayout, trước quick chips.
- State dùng: `state.groups`, `state.pickle`, `state.currentUserId`, `state.disputeCount`.
- Members map: `getMemberMap(state.members)`.
- Tính nợ nhóm: `totalBalances(groups, meId)` → tổng giá trị âm = tổng nợ nhóm.
- Tính nợ pickleball: dùng `pickleSummary(state.pickle)` → `memberOwes[meId]` (âm = nợ, dương = được nhận).
- Pending expenses: lọc từ `groups[0]?.expenses` với `status === 'pending'`.
- Treasurer check: `getMemberMap(state.members)[meId]?.role === 'treasurer'`.
- Month display: `new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })`.

- [ ] **Step 1: Thêm import `pickleSummary` vào screen-home.jsx**

Dòng import data helpers hiện tại:
```js
import { ME, getMemberMap, fmtVND, fmtVNDFull, totalBalances, recentActivity, groupBalance, groupNet } from './data.jsx'
```

Thêm `pickleSummary`:
```js
import { ME, getMemberMap, fmtVND, fmtVNDFull, totalBalances, recentActivity, groupBalance, groupNet, pickleSummary } from './data.jsx'
```

- [ ] **Step 2: Viết component `SmartHomeSummary`**

Thêm function mới vào `screen-home.jsx`, trước `OverviewLayout`:

```jsx
function SmartHomeSummary({ push, pushToTab, switchTab }) {
  const { state } = useApp()
  const meId = state.currentUserId || ME
  const M = getMemberMap(state.members)
  const isTreasurer = M[meId]?.role === 'treasurer'

  // Nợ nhóm: tổng số âm từ totalBalances
  const groupBalances = useMemo(() => totalBalances(state.groups, meId), [state.groups, meId])
  const groupDebt = Math.abs(Object.values(groupBalances).filter(v => v < 0).reduce((a, b) => a + b, 0))

  // Nợ pickleball: memberOwes[meId] âm = nợ
  const pSummary = useMemo(() => pickleSummary(state.pickle), [state.pickle])
  const pickleOwes = pSummary.memberOwes?.[meId] || 0
  const pickleDebt = pickleOwes < 0 ? Math.abs(pickleOwes) : 0

  // Tổng cần thanh toán
  const totalDebt = groupDebt + pickleDebt
  const hasDebt = totalDebt > 0

  // Pending expenses (chờ duyệt)
  const pendingCount = useMemo(() => {
    return state.groups.flatMap(g => g.expenses || []).filter(e => e.status === 'pending').length
  }, [state.groups])
  const disputeCount = state.disputeCount || 0

  const month = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Month label */}
      <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'capitalize' }}>
        {month}
      </div>

      {/* Two summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SummaryCard
          emoji="📦"
          label="Chi tiêu nhóm"
          debt={groupDebt}
          subtitle={`${state.groups.length} nhóm`}
          onClick={() => switchTab('groups')}
        />
        <SummaryCard
          emoji="🏸"
          label="Pickleball"
          debt={pickleDebt}
          subtitle="CLB Q7"
          onClick={() => switchTab('pickle')}
        />
      </div>

      {/* Thanh toán CTA */}
      {hasDebt && (
        <button
          onClick={() => push('payment-flow')}
          style={{
            appearance: 'none', cursor: 'pointer', width: '100%', height: 48,
            borderRadius: 14, border: 0,
            background: 'var(--brand-1)', color: '#fff',
            fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          → Thanh toán ngay {fmtVND(totalDebt)}
        </button>
      )}
      {!hasDebt && (
        <div style={{
          textAlign: 'center', padding: '12px 0',
          fontSize: 14, color: 'var(--vb-success-700)', fontWeight: 600,
        }}>
          🎉 Tháng này bạn đang cân bằng
        </div>
      )}

      {/* Treasurer block — chỉ hiện khi có dữ liệu */}
      {isTreasurer && (pendingCount > 0 || disputeCount > 0) && (
        <div style={{
          background: 'var(--vb-warn-100)', borderRadius: 12,
          border: '1px solid rgba(245,158,11,0.25)',
          padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {pendingCount > 0 && (
            <button
              onClick={() => push('approval-queue')}
              style={{
                appearance: 'none', cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--vb-font-body)', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14 }}>⏳</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                {pendingCount} chi tiêu chờ duyệt
              </span>
            </button>
          )}
          {disputeCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                {disputeCount} sai sót cần xem
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Viết component `SummaryCard`**

Thêm function `SummaryCard` ngay sau `SmartHomeSummary`:

```jsx
function SummaryCard({ emoji, label, debt, subtitle, onClick }) {
  const hasDebt = debt > 0
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none', cursor: 'pointer', textAlign: 'left',
        padding: '12px 14px', borderRadius: 14,
        background: 'var(--surface-1)', border: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', fontFamily: 'var(--vb-font-body)' }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: hasDebt ? 'var(--vb-danger-700)' : 'var(--vb-success-700)', fontFamily: 'var(--vb-font-body)' }}>
        {hasDebt ? `Nợ ${fmtVND(debt)}` : 'Cân bằng'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--vb-font-body)' }}>
        {subtitle}
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Thêm `SmartHomeSummary` vào `OverviewLayout`**

Tìm `OverviewLayout` trong `screen-home.jsx`:
```jsx
function OverviewLayout({ push, pushToTab, switchTab, tweaks, activity, groups }) {
  const { state: _s } = useApp();
  const meId = (_s.currentUserId || ME);
  const balances = useMemo(() => totalBalances(groups, meId), [groups, meId]);
  const ranked = Object.entries(balances).filter(([id, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Quick chips */}
```

Thêm `SmartHomeSummary` vào **đầu** div, trước Quick chips:
```jsx
  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Smart summary block */}
      <SmartHomeSummary push={push} pushToTab={pushToTab} switchTab={switchTab}/>

      {/* Quick chips */}
```

- [ ] **Step 5: Verify UI**

Mở app, vào tab Trang chủ:
- Expected: hiển thị tháng, 2 card (Nhóm + Pickleball), nút Thanh toán (nếu có nợ) hoặc "cân bằng"
- Nếu login bằng An (treasurer): hiển thị block vàng với số pending

- [ ] **Step 6: Commit**
```bash
git add src/screen-home.jsx
git commit -m "feat: add SmartHomeSummary to OverviewLayout with two cards + treasurer block"
```

---

### Task 3: ScreenPaymentFlow — debt breakdown + QR + confirm

**Files:**
- Modify: `src/screen-groups.jsx` (thêm `ScreenPaymentFlow` + export)

**Context:**
- Màn hình này được push từ SmartHome button "Thanh toán ngay".
- Hiện tại `store.jsx` đã có `SETTLE_DEBT` case: insert vào `settlements`, rồi `refresh()`.
- `totalBalances(groups, meId)` trả về `{ memberId: amount }` — âm nghĩa là bạn nợ họ.
- Cần tổng hợp: nợ nhóm + nợ pickleball theo từng người.
- Pickleball debt: `pickleSummary(state.pickle).memberOwes[meId]` — âm = bạn nợ pickleball, nhưng nợ ai? Theo spec: nợ người collect tiền (thủ quỹ).
- Group debt: lấy những entry `totalBalances` < 0 — đây là những người bạn nợ.
- Sau khi user bấm confirm: dispatch `SETTLE_DEBT` cho mỗi người owed.
- `pop()` để quay lại sau khi settle xong.

- [ ] **Step 1: Import thêm vào screen-groups.jsx**

Ở đầu `screen-groups.jsx`, kiểm tra import từ `data.jsx`. Thêm `pickleSummary` nếu chưa có:
```js
import { ME, getMemberMap, fmtVND, fmtVNDFull, fmtDate, groupBalance, groupNet, splitEqual, totalBalances, pickleSummary } from './data.jsx'
```

- [ ] **Step 2: Viết `ScreenPaymentFlow`**

Thêm function mới vào cuối file `screen-groups.jsx` (trước exports):

```jsx
export function ScreenPaymentFlow({ tweaks = {}, pop }) {
  const { state, dispatch } = useApp()
  const meId = state.currentUserId || ME
  const M = getMemberMap(state.members)
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)

  // Nợ nhóm: totalBalances âm
  const groupBals = useMemo(() => totalBalances(state.groups, meId), [state.groups, meId])
  const groupDebts = Object.entries(groupBals)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ memberId: id, amount: Math.abs(v), source: 'Nhóm' }))

  // Nợ pickleball: memberOwes[meId] âm → nợ thủ quỹ
  const pSummary = useMemo(() => pickleSummary(state.pickle), [state.pickle])
  const pickleOwes = pSummary.memberOwes?.[meId] || 0
  const treasurer = state.members.find(m => m.role === 'treasurer')
  const pickleDebts = (pickleOwes < 0 && treasurer && treasurer.id !== meId)
    ? [{ memberId: treasurer.id, amount: Math.abs(pickleOwes), source: 'Pickleball' }]
    : []

  // Gộp theo người: cùng memberId → cộng amount
  const allDebts = [...groupDebts, ...pickleDebts]
  const consolidated = useMemo(() => {
    const map = {}
    for (const d of allDebts) {
      if (!map[d.memberId]) map[d.memberId] = { memberId: d.memberId, amount: 0, sources: [] }
      map[d.memberId].amount += d.amount
      map[d.memberId].sources.push(d.source)
    }
    return Object.values(map)
  }, [state.groups, state.pickle, meId])

  const totalAmount = consolidated.reduce((a, d) => a + d.amount, 0)

  async function handleConfirm() {
    if (loading || consolidated.length === 0) return
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      for (const d of consolidated) {
        await dispatch({
          type: 'SETTLE_DEBT',
          groupId: state.currentGroupId,
          settlement: {
            fromId: meId,
            toId: d.memberId,
            amount: d.amount,
            date: today,
          },
        })
      }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ paddingBottom: 96 }}>
        <NavHeader title="Thanh toán" onBack={pop}/>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            Đã ghi nhận thanh toán!
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32 }}>
            Số dư đã được cập nhật
          </div>
          <button
            onClick={pop}
            style={{
              appearance: 'none', cursor: 'pointer',
              height: 48, padding: '0 32px', borderRadius: 14, border: 0,
              background: 'var(--brand-1)', color: '#fff',
              fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 15,
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }

  if (consolidated.length === 0) {
    return (
      <div style={{ paddingBottom: 96 }}>
        <NavHeader title="Thanh toán" onBack={pop}/>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            Không có khoản nào cần trả!
          </div>
        </div>
      </div>
    )
  }

  const today = new Date()
  const monthLabel = today.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader title={`Thanh toán ${monthLabel}`} onBack={pop}/>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Breakdown */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
            Bạn cần trả:
          </div>
          <Card>
            {consolidated.map((d, i) => {
              const m = M[d.memberId] || { name: '?', short: '?', initials: '??', color: '#999' }
              return (
                <ListRow
                  key={d.memberId}
                  left={<Avatar member={m} size={40} style={tweaks.avatarStyle}/>}
                  title={m.name}
                  subtitle={d.sources.join(' + ')}
                  right={
                    <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 15, color: 'var(--vb-danger-700)' }}>
                      {fmtVND(d.amount)}
                    </div>
                  }
                  divider={i < consolidated.length - 1}
                />
              )
            })}
          </Card>
        </div>

        {/* Total */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Tổng</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--vb-danger-700)', fontFamily: 'var(--vb-font-body)' }}>
            {fmtVND(totalAmount)}
          </span>
        </div>

        {/* QR placeholder */}
        <div style={{
          padding: '20px 16px', borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 160, height: 160, borderRadius: 12,
            background: 'var(--surface-2)', border: '1px dashed var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>📱</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>
              QR chuyển khoản
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
              {consolidated.length === 1 ? (M[consolidated[0].memberId]?.name || '?') : 'Chuyển theo từng người'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              Nội dung: SP-{consolidated.map(d => (M[d.memberId]?.short || '?')).join('-')}
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            appearance: 'none', cursor: loading ? 'default' : 'pointer',
            width: '100%', height: 52, borderRadius: 14, border: 0,
            background: loading ? 'var(--border-1)' : 'var(--vb-success-700)',
            color: loading ? 'var(--text-3)' : '#fff',
            fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 16,
            transition: 'background .15s',
          }}
        >
          {loading ? 'Đang xử lý...' : '✓ Đã chuyển tiền rồi'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify component compiles**

Kiểm tra không có lỗi import. `Avatar`, `ListRow`, `Card`, `NavHeader` đã có trong import hiện tại của `screen-groups.jsx`.

Xem lại dòng 1-5 `screen-groups.jsx` — import block đã có đủ chưa:
```js
import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, NavHeader, ListRow, EmptyState, HScroll, SectionHeader, CategoryIcon, StatusBadge, DisputePopup, SwipeCard } from './components.jsx'
```
`Avatar`, `NavHeader`, `ListRow`, `Card` đều đã có ✅

- [ ] **Step 4: Commit**
```bash
git add src/screen-groups.jsx
git commit -m "feat: add ScreenPaymentFlow with debt breakdown and settlement confirm"
```

---

### Task 4: App routing — wire payment-flow

**Files:**
- Modify: `src/app.jsx`

**Context:**
- `renderScreen()` trong `app.jsx` là switch dựa trên `current.name`.
- Import `ScreenPaymentFlow` từ `./screen-groups.jsx`.
- Route `payment-flow` được push từ `SmartHomeSummary` button.

- [ ] **Step 1: Thêm import**

Tìm dòng import screen-groups trong `app.jsx`:
```js
import ScreenGroups, {
  ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense,
  ScreenSettleAll, ScreenNewGroup, ScreenNotifications, ScreenApprovalQueue,
} from './screen-groups.jsx'
```

Thêm `ScreenPaymentFlow`:
```js
import ScreenGroups, {
  ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense,
  ScreenSettleAll, ScreenNewGroup, ScreenNotifications, ScreenApprovalQueue,
  ScreenPaymentFlow,
} from './screen-groups.jsx'
```

- [ ] **Step 2: Thêm route vào `renderScreen()`**

Tìm trong switch:
```js
case 'approval-queue':  return <ScreenApprovalQueue params={p} tweaks={t} pop={pop}/>
```

Thêm ngay sau:
```js
case 'payment-flow':    return <ScreenPaymentFlow tweaks={t} pop={pop}/>
```

- [ ] **Step 3: Verify end-to-end flow**

1. Login → Trang chủ → thấy SmartHome summary với 2 card
2. Nếu có nợ: thấy nút "Thanh toán ngay Xk"
3. Bấm nút → navigate vào ScreenPaymentFlow
4. Thấy breakdown ai nợ bao nhiêu
5. Bấm "✓ Đã chuyển tiền rồi" → ghi settlement → redirect về done screen
6. Bấm "Về trang chủ" → pop về trang chủ

- [ ] **Step 4: Commit**
```bash
git add src/app.jsx
git commit -m "feat: wire payment-flow route to ScreenPaymentFlow"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tab 1 SmartHome: greeting + month + 2 cards + CTA + treasurer block (Task 2)
- ✅ Smart context: hide treasurer block khi trống, show "cân bằng" khi không nợ (Task 2)
- ✅ Payment flow: breakdown → QR placeholder → confirm → settle (Task 3)
- ✅ disputeCount trong state (Task 1)
- ✅ Route wiring (Task 4)
- ⚠️ QR chuyển khoản thực (VietQR API): chưa implement — cần thêm bank account info vào DB. Spec Plan 2 chỉ cần placeholder, bank info sẽ là scope Plan 3 hoặc separate task.

**Type consistency:**
- `ScreenPaymentFlow` export tên khớp với import trong app.jsx
- `pickleSummary` import đã thêm vào cả 2 file cần dùng
- `disputeCount` field: `buildEmptyState` + `normalize` + `fetchGroupData` đồng nhất

**No placeholders:** Tất cả steps có code đầy đủ.
