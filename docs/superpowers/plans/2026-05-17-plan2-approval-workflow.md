# Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm vào Groups tab: badge trạng thái chi tiêu (pending/approved/declined), dispute popup, store actions duyệt/từ chối, và màn hình swipe duyệt cho thủ quỹ.

**Architecture:** Thêm 3 store actions mới vào `store.jsx`, thêm 3 components mới (`StatusBadge`, `DisputePopup`, `SwipeCard`) vào `components.jsx`, cập nhật `ActivityRow` trong `screen-groups.jsx` để hiển thị badge và nút báo sai, thêm màn hình `ScreenApprovalQueue` cho thủ quỹ.

**Tech Stack:** React, Supabase (expenses + expense_disputes tables), vb-tokens.css

---

## File Structure

| File | Thay đổi |
|------|---------|
| `src/store.jsx` | Thêm cases: `APPROVE_EXPENSE`, `DECLINE_EXPENSE`, `SUBMIT_DISPUTE` |
| `src/components.jsx` | Thêm: `StatusBadge`, `DisputePopup`, `SwipeCard` — export thêm 3 cái này |
| `src/screen-groups.jsx` | Cập nhật `ActivityRow` hiển thị `StatusBadge` + nút "Báo sai"; thêm `ScreenApprovalQueue`; cập nhật `ScreenGroupDetail` header để thủ quỹ thấy nút duyệt |
| `src/app.jsx` | Đăng ký route `'approval-queue'` → `ScreenApprovalQueue` |

---

## Task 1: Store — Thêm APPROVE_EXPENSE, DECLINE_EXPENSE, SUBMIT_DISPUTE

**Files:**
- Modify: `src/store.jsx` — thêm 3 cases vào `switch (action.type)`

**Context cần biết:**
- `expenses` table: cột `status`, `reviewed_by_member_id`, `reviewed_at`, `decline_reason`
- `expense_disputes` table: cột `raised_by` (uuid), `note` (text), `expense_id`, `status` (default 'open')
- DB constraint: khi `declined` bắt buộc có `decline_reason`, `reviewed_by_member_id`, `reviewed_at`
- `state.currentUserId` = UUID thành viên hiện tại

- [ ] **Step 1: Xác định vị trí chèn trong store.jsx**

Mở `src/store.jsx`, tìm dòng:
```js
case 'ADD_PICKLE_EXPENSE':
```
Chèn 3 cases MỚI ngay TRƯỚC dòng này.

- [ ] **Step 2: Codex thêm 3 store actions**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/store.jsx, inside the switch(action.type) block, add these 3 new cases
BEFORE the existing `case 'ADD_PICKLE_EXPENSE':` line:

case 'APPROVE_EXPENSE': {
  const { expenseId } = action
  await sb.from('expenses').update({
    status: 'approved',
    reviewed_by_member_id: state.currentUserId,
    reviewed_at: new Date().toISOString(),
  }).eq('id', expenseId)
  await refresh()
  break
}
case 'DECLINE_EXPENSE': {
  const { expenseId, reason } = action
  await sb.from('expenses').update({
    status: 'declined',
    reviewed_by_member_id: state.currentUserId,
    reviewed_at: new Date().toISOString(),
    decline_reason: reason,
  }).eq('id', expenseId)
  await refresh()
  break
}
case 'SUBMIT_DISPUTE': {
  const { expenseId, note } = action
  await sb.from('expense_disputes').insert({
    expense_id: expenseId,
    raised_by: state.currentUserId,
    note,
  })
  await refresh()
  break
}
```

- [ ] **Step 3: Verify**

```bash
grep -n "APPROVE_EXPENSE\|DECLINE_EXPENSE\|SUBMIT_DISPUTE" src/store.jsx
```
Expected: 3 dòng case xuất hiện.

- [ ] **Step 4: Commit**

```bash
git add src/store.jsx
git commit -m "feat: add APPROVE_EXPENSE, DECLINE_EXPENSE, SUBMIT_DISPUTE store actions"
```

---

## Task 2: Component — StatusBadge

**Files:**
- Modify: `src/components.jsx` — thêm function `StatusBadge` + export

**Context:** `components.jsx` có export block ở cuối file (line ~354). Thêm `StatusBadge` vào đó.

- [ ] **Step 1: Codex thêm StatusBadge**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/components.jsx:

1. Add this function BEFORE the existing `export {` block at the end of the file:

function StatusBadge({ status, declineReason }) {
  const config = {
    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '⏳', label: 'Chờ duyệt' },
    approved: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅', label: 'Đã duyệt' },
    declined: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: '❌', label: 'Bị từ chối' },
  }
  const c = config[status] || config.pending
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 600,
        color: c.color, background: c.bg,
        padding: '2px 8px', borderRadius: 99,
      }}>
        {c.icon} {c.label}
      </span>
      {status === 'declined' && declineReason && (
        <span style={{ fontSize: 11, color: 'var(--text-2)', paddingLeft: 4 }}>
          {declineReason}
        </span>
      )}
    </div>
  )
}

2. Add `StatusBadge` to the existing export block so it reads:
export { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, NavHeader, ListRow, SectionHeader, HScroll, EmptyState, CategoryIcon, ScreenTransition, StatusBadge }
```

- [ ] **Step 2: Verify**

```bash
grep -n "StatusBadge" src/components.jsx
```
Expected: function definition + export.

- [ ] **Step 3: Commit**

```bash
git add src/components.jsx
git commit -m "feat: add StatusBadge component"
```

---

## Task 3: Component — DisputePopup

**Files:**
- Modify: `src/components.jsx` — thêm `DisputePopup` + export

- [ ] **Step 1: Codex thêm DisputePopup**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/components.jsx, add this function BEFORE the existing `export {` block:

function DisputePopup({ expenseId, onClose }) {
  const { dispatch } = useApp()
  const [note, setNote] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const submit = async () => {
    const trimmed = note.trim()
    if (!trimmed) return
    setSending(true)
    await dispatch({ type: 'SUBMIT_DISPUTE', expenseId, note: trimmed })
    setSending(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 36px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-1)', marginBottom: 4 }}>
          Báo sai sót
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
          Mô tả sai sót để thủ quỹ kiểm tra lại
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ví dụ: Số tiền sai, tôi không tham gia buổi này..."
          style={{
            width: '100%', minHeight: 88,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 12,
            color: 'var(--text-1)',
            fontSize: 14, padding: '10px 12px',
            resize: 'none', boxSizing: 'border-box',
            fontFamily: 'var(--vb-font-body)',
          }}
        />
        <Button
          variant="primary"
          style={{ width: '100%', marginTop: 12 }}
          onClick={submit}
          disabled={sending || !note.trim()}
        >
          {sending ? 'Đang gửi...' : 'Gửi báo cáo'}
        </Button>
      </div>
    </div>
  )
}

Then add `DisputePopup` to the export block.
```

- [ ] **Step 2: Verify**

```bash
grep -n "DisputePopup" src/components.jsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components.jsx
git commit -m "feat: add DisputePopup component"
```

---

## Task 4: Component — SwipeCard

**Files:**
- Modify: `src/components.jsx` — thêm `SwipeCard` + export

**Context:** SwipeCard dùng touch events để swipe trái (từ chối) / phải (duyệt). Threshold 80px.

- [ ] **Step 1: Codex thêm SwipeCard**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/components.jsx, add this function BEFORE the `export {` block.
It needs `fmtVND` and `fmtDate` which are already imported from './data.jsx'.

function SwipeCard({ expense, members, onApprove, onDecline }) {
  const [offset, setOffset] = React.useState(0)
  const startX = React.useRef(null)
  const isDragging = React.useRef(false)

  const handleTouchStart = e => {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }
  const handleTouchMove = e => {
    if (!isDragging.current) return
    setOffset(e.touches[0].clientX - startX.current)
  }
  const handleTouchEnd = () => {
    isDragging.current = false
    if (offset > 80) onApprove()
    else if (offset < -80) onDecline()
    else setOffset(0)
    startX.current = null
  }
  // Mouse support for desktop testing
  const handleMouseDown = e => { startX.current = e.clientX; isDragging.current = true }
  const handleMouseMove = e => { if (!isDragging.current) return; setOffset(e.clientX - startX.current) }
  const handleMouseUp = () => { handleTouchEnd() }

  const payer = members[expense.paidBy] || { name: '?', short: '?' }
  const parts = expense.participantIds?.length || expense.participants?.length || 1
  const perPerson = parts > 0 ? Math.round((expense.amount || 0) / parts) : (expense.amount || 0)
  const isEven = !expense.splitType || expense.splitType === 'equal'

  const approveOpacity = Math.min(1, Math.max(0, offset / 80))
  const declineOpacity = Math.min(1, Math.max(0, -offset / 80))

  return (
    <div
      style={{ position: 'relative', userSelect: 'none' }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    >
      {/* Decline hint */}
      <div style={{
        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        color: '#EF4444', opacity: declineOpacity, fontSize: 28, fontWeight: 800,
        pointerEvents: 'none',
      }}>✕</div>
      {/* Approve hint */}
      <div style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        color: '#10B981', opacity: approveOpacity, fontSize: 28, fontWeight: 800,
        pointerEvents: 'none',
      }}>✓</div>

      {/* Card */}
      <div style={{
        transform: `translateX(${offset}px) rotate(${offset * 0.03}deg)`,
        transition: isDragging.current ? 'none' : 'transform 0.25s ease',
        background: 'var(--surface-1)',
        borderRadius: 20,
        padding: '28px 24px',
        margin: '0 48px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        cursor: 'grab',
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>
          {expense.cat === 'food' ? '🍜' : expense.cat === 'drink' ? '☕' : expense.cat === 'transport' ? '🚗' : '📦'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
          {expense.title || 'Chi tiêu'}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand-1)', marginBottom: 16 }}>
          {fmtVND(expense.amount || 0)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 2 }}>
          {payer.name} đề xuất
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {expense.date || ''}
        </div>
        {isEven && parts > 1 && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 10, fontSize: 13, color: 'var(--text-1)',
          }}>
            {parts} người • mỗi người {fmtVND(perPerson)}
          </div>
        )}
      </div>
    </div>
  )
}

Then add `SwipeCard` to the export block.
```

- [ ] **Step 2: Verify**

```bash
grep -n "SwipeCard" src/components.jsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components.jsx
git commit -m "feat: add SwipeCard component for approval queue"
```

---

## Task 5: screen-groups — Cập nhật ActivityRow + import mới

**Files:**
- Modify: `src/screen-groups.jsx`

**Thay đổi cần làm:**
1. Thêm `StatusBadge`, `DisputePopup` vào import từ `./components.jsx`
2. `ActivityRow` thêm: hiển thị `StatusBadge` bên dưới title, nút "Báo sai" nếu status không phải `declined`

- [ ] **Step 1: Codex cập nhật import và ActivityRow**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/screen-groups.jsx, make TWO changes:

CHANGE 1 — Update the import from './components.jsx' to add StatusBadge and DisputePopup:
Find the line:
  import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, NavHeader, ListRow, EmptyState, HScroll, SectionHeader, CategoryIcon } from './components.jsx'
Replace with:
  import { Icon, Avatar, AvatarStack, Money, Button, Card, Pill, iconBtnStyle, NavHeader, ListRow, EmptyState, HScroll, SectionHeader, CategoryIcon, StatusBadge, DisputePopup } from './components.jsx'

CHANGE 2 — Update the ActivityRow function (currently at around line 134).
Replace the entire function body with:

function ActivityRow({ e, divider, avatarStyle, showGroup }) {
  const { state: _s } = useApp();
  const me = _s.currentUserId || ME;
  const M = getMemberMap(_s.members);
  const [disputeOpen, setDisputeOpen] = React.useState(false);
  const participants = safeArray(e?.participants);
  const amount = Number(e?.amount) || 0;
  const myShare = participants.includes(me) && participants.length > 0 ? Math.round(amount / participants.length) : 0;
  const balance = e?.paidBy === me ? amount - myShare : -myShare;
  const payer = memberOrFallback(M, e?.paidBy);
  const status = e?.status || 'approved';
  const canDispute = status !== 'declined';

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        borderBottom: divider ? '1px solid var(--border-1)' : 'none',
      }}>
        <CategoryIcon cat={e?.cat} size={40}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e?.title || 'Chi tiêu'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {showGroup ? <>{e?.groupEmoji} {e?.groupName} • </> : null}
            {payer.short === 'Bạn' || e?.paidBy === me ? 'Bạn trả' : `${payer.short} trả`} {fmtVND(amount)} • {e?.date || '--/--'}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={status} declineReason={e?.declineReason}/>
            {canDispute && (
              <button
                onClick={ev => { ev.stopPropagation(); setDisputeOpen(true); }}
                style={{
                  appearance: 'none', cursor: 'pointer', border: 'none', background: 'none',
                  fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--vb-font-body)',
                  padding: '2px 6px', borderRadius: 6,
                  textDecoration: 'underline',
                }}
              >
                Báo sai
              </button>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {balance > 0 ? 'Bạn cho mượn' : balance < 0 ? 'Bạn nợ' : '—'}
          </div>
          <Money value={Math.abs(balance)} size={13} color={balance > 0 ? 'var(--vb-success-700)' : balance < 0 ? 'var(--vb-danger-700)' : 'var(--text-2)'} compact/>
        </div>
      </div>
      {disputeOpen && (
        <DisputePopup expenseId={e?.id} onClose={() => setDisputeOpen(false)}/>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

```bash
grep -n "StatusBadge\|DisputePopup\|disputeOpen" src/screen-groups.jsx | head -10
```
Expected: import có `StatusBadge`, `DisputePopup`; ActivityRow có `disputeOpen` state.

- [ ] **Step 3: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: show StatusBadge and dispute button in expense activity row"
```

---

## Task 6: screen-groups — Thêm ScreenApprovalQueue + nút từ ScreenGroupDetail

**Files:**
- Modify: `src/screen-groups.jsx` — thêm `ScreenApprovalQueue`, cập nhật header `ScreenGroupDetail`, export

**Context:**
- Thủ quỹ: `state.members.find(m => m.id === meId)?.role === 'treasurer'`
- Pending expenses trong group: `group.expenses.filter(e => e.status === 'pending')`
- `ScreenGroupDetail` header có nút `[⋯]` menu — cần thêm nút duyệt chi tiêu cho thủ quỹ

- [ ] **Step 1: Đọc ScreenGroupDetail header để tìm vị trí chèn**

```bash
grep -n "Tất toán\|Settle\|menuOpen\|right={" src/screen-groups.jsx | head -15
```

- [ ] **Step 2: Codex thêm ScreenApprovalQueue**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/screen-groups.jsx, add this new component BEFORE the final `export {` line:

function ScreenApprovalQueue({ params = {}, pop }) {
  const { state, dispatch } = useApp()
  const meId = state.currentUserId || ME
  const M = getMemberMap(state.members)
  const g = safeArray(state.groups).find(x => x.id === params?.groupId)
  const group = safeGroup(g)
  const pending = safeArray(group.expenses).filter(e => e.status === 'pending')

  const [idx, setIdx] = React.useState(0)
  const [declineMode, setDeclineMode] = React.useState(false)
  const [declineReason, setDeclineReason] = React.useState('')

  const current = pending[idx]

  const handleApprove = async () => {
    if (!current) return
    await dispatch({ type: 'APPROVE_EXPENSE', expenseId: current.id })
    setIdx(i => i + 1)
    setDeclineMode(false)
  }

  const handleDeclineClick = () => setDeclineMode(true)

  const handleDeclineConfirm = async () => {
    if (!current || !declineReason.trim()) return
    await dispatch({ type: 'DECLINE_EXPENSE', expenseId: current.id, reason: declineReason.trim() })
    setIdx(i => i + 1)
    setDeclineMode(false)
    setDeclineReason('')
  }

  if (!g) return null

  return (
    <div style={{ paddingBottom: 40 }}>
      <NavHeader title="Duyệt chi tiêu" onBack={pop}/>

      {pending.length === 0 ? (
        <div style={{ padding: '40px 20px' }}>
          <EmptyState icon="check-circle" title="Không còn chi tiêu chờ duyệt" subtitle="Tất cả đã được xử lý"/>
        </div>
      ) : idx >= pending.length ? (
        <div style={{ padding: '40px 20px' }}>
          <EmptyState icon="check-circle" title="Hoàn tất!" subtitle={`Đã xử lý ${pending.length} chi tiêu`}/>
          <div style={{ padding: '0 20px' }}>
            <Button variant="primary" full onClick={pop}>Xong</Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 0' }}>
          {/* Progress */}
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
            {idx + 1} / {pending.length} chi tiêu
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
            {pending.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                background: i < idx ? 'var(--vb-success-700)' : i === idx ? 'var(--brand-1)' : 'var(--border-1)',
              }}/>
            ))}
          </div>

          {/* SwipeCard */}
          <SwipeCard
            expense={current}
            members={M}
            onApprove={handleApprove}
            onDecline={handleDeclineClick}
          />

          {/* Buttons */}
          {!declineMode ? (
            <div style={{ display: 'flex', gap: 12, padding: '24px 24px 0' }}>
              <Button variant="ghost" style={{ flex: 1, borderColor: '#EF4444', color: '#EF4444' }} onClick={handleDeclineClick}>
                ✕ Từ chối
              </Button>
              <Button variant="primary" style={{ flex: 1 }} onClick={handleApprove}>
                ✓ Duyệt
              </Button>
            </div>
          ) : (
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                Lý do từ chối:
              </div>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Ghi lý do ngắn gọn..."
                style={{
                  width: '100%', minHeight: 80,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 12,
                  color: 'var(--text-1)',
                  fontSize: 14, padding: '10px 12px',
                  resize: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--vb-font-body)',
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setDeclineMode(false); setDeclineReason(''); }}>
                  Huỷ
                </Button>
                <Button variant="primary" style={{ flex: 1, background: '#EF4444' }} onClick={handleDeclineConfirm} disabled={!declineReason.trim()}>
                  Xác nhận từ chối
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Codex thêm import SwipeCard + export ScreenApprovalQueue**

Dùng Codex `workspace-write` `approval-policy: never` với prompt:

```
In src/screen-groups.jsx:

CHANGE 1 — In the import from './components.jsx', add SwipeCard:
Find: import { ..., StatusBadge, DisputePopup } from './components.jsx'
Replace the end with: ..., StatusBadge, DisputePopup, SwipeCard } from './components.jsx'

CHANGE 2 — In the export block at the bottom (the line starting with `export {`), add ScreenApprovalQueue:
Find: export { ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense, ScreenSett...
Add ScreenApprovalQueue to that export list.
```

- [ ] **Step 4: Codex thêm nút "Duyệt chi tiêu" vào ScreenGroupDetail cho thủ quỹ**

Đầu tiên đọc khu vực header của ScreenGroupDetail:
```bash
grep -n "Tất toán\|Settle\|push.*add-expense\|push.*settle" src/screen-groups.jsx | head -10
```

Dùng Codex `workspace-write` `approval-policy: never` với prompt (sau khi xác nhận vị trí):

```
In src/screen-groups.jsx, inside ScreenGroupDetail, add a treasurer-only button that navigates to the approval queue.

Find the section where "+ Thêm chi tiêu" and "Tất toán" buttons are rendered (around the area with push('add-expense')).

Add this BEFORE those buttons (only rendered for treasurer):

const isTreasurer = state.members.find(m => m.id === meId)?.role === 'treasurer'
const pendingCount = safeArray(group.expenses).filter(e => e.status === 'pending').length

Then add a conditional button in the JSX, right above the "+ Thêm chi tiêu" button:
{isTreasurer && pendingCount > 0 && (
  <button
    onClick={() => push('approval-queue', { groupId: params?.groupId })}
    style={{
      appearance: 'none', cursor: 'pointer',
      height: 36, padding: '0 14px',
      background: 'rgba(245,158,11,0.12)',
      color: '#F59E0B',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 10,
      fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      flexShrink: 0,
    }}
  >
    ⏳ {pendingCount} chờ duyệt
  </button>
)}
```

- [ ] **Step 5: Verify**

```bash
grep -n "ScreenApprovalQueue\|approval-queue\|isTreasurer\|pendingCount" src/screen-groups.jsx | head -10
```

- [ ] **Step 6: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: add ScreenApprovalQueue with swipe approve/decline UI"
```

---

## Task 7: app.jsx — Đăng ký route approval-queue

**Files:**
- Modify: `src/app.jsx`

**Context:** `app.jsx` có một switch/map dùng `push` để navigate. Tìm pattern đăng ký screens.

- [ ] **Step 1: Xem app.jsx tìm pattern route**

```bash
grep -n "ScreenGroupDetail\|ScreenExpenseDetail\|case\|screenKey\|push(" src/app.jsx | head -20
```

- [ ] **Step 2: Codex thêm import + route**

Dùng Codex `workspace-write` `approval-policy: never` với prompt (sau khi xem output Step 1):

```
In src/app.jsx:

CHANGE 1 — In the import from './screen-groups.jsx', add ScreenApprovalQueue:
Find the existing import line for screen-groups and add ScreenApprovalQueue to it.

CHANGE 2 — Register the new route. Find where 'group-detail', 'expense-detail', 'add-expense' are mapped to their screen components. Add a new entry for 'approval-queue' → ScreenApprovalQueue with the same pattern.
```

- [ ] **Step 3: Verify**

```bash
grep -n "approval-queue\|ScreenApprovalQueue" src/app.jsx
```

- [ ] **Step 4: Test thủ công**

```bash
npm run dev
```

Mở browser → đăng nhập → vào một nhóm có chi tiêu pending → kiểm tra:
- [ ] Expenses trong list có badge `⏳ Chờ duyệt`
- [ ] Approved expenses có badge `✅ Đã duyệt`
- [ ] Nút "Báo sai" hiển thị trên pending + approved expenses
- [ ] Bấm "Báo sai" → popup mở, nhập lý do, gửi được
- [ ] Thủ quỹ thấy nút `⏳ N chờ duyệt` trong group detail header
- [ ] Bấm vào → SwipeCard màn hình
- [ ] Swipe/bấm Duyệt → expense chuyển sang approved
- [ ] Swipe/bấm Từ chối → popup lý do → declined + hiển thị lý do

- [ ] **Step 5: Commit**

```bash
git add src/app.jsx
git commit -m "feat: register approval-queue route in app router"
```

---

## Self-Review

**Spec coverage:**
- ✅ StatusBadge (pending/approved/declined) — Task 2
- ✅ Expense list hiển thị badge — Task 5
- ✅ "Báo sai" button + DisputePopup — Task 3, Task 5
- ✅ SwipeCard approval (Tinder style) — Task 4, Task 6
- ✅ Store actions approve/decline/dispute — Task 1
- ✅ Thủ quỹ thấy pending count + navigate to queue — Task 6, Task 7
- ✅ Decline reason popup — Task 6
- ⏳ Màn hình duyệt từ Tab Tổng quát (Thủ quỹ) — sẽ làm ở Plan 2 (SmartHome)

**Placeholder scan:** Không có TBD hay TODO trong plan.

**Type consistency:**
- `dispatch({ type: 'APPROVE_EXPENSE', expenseId })` → dùng nhất quán
- `dispatch({ type: 'DECLINE_EXPENSE', expenseId, reason })` → nhất quán
- `dispatch({ type: 'SUBMIT_DISPUTE', expenseId, note })` → nhất quán (dùng `note` vì đó là tên cột trong DB)
- `e.status`, `e.paidBy`, `e.participants`, `e.participantIds` → nhất quán với normalize trong store.jsx
