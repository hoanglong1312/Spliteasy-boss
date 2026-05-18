import React, { useEffect, useMemo, useState } from 'react'
import { useApp, fetchPickleballSessions, fetchMonthlyExpenses } from './store.jsx'
import { ME } from './data.jsx'
import { Icon, iconBtnStyle, displayMemberName } from './components.jsx'
import { getStoredAuth } from './lib/auth.js'

function ScreenHome({ push, switchTab }) {
  const { state, dispatch } = useApp()
  const { members, currentUserId } = state
  const meId = currentUserId || ME
  const [selectedMonth, setSelectedMonth] = useState(() => toYearMonth(new Date()))

  const meMember = members.find(m => m.id === meId) || {
    name: state.currentUserName || 'Bạn',
    short: state.currentUserName || 'Bạn',
    initials: (state.currentUserName || 'B')[0].toUpperCase(),
    color: '#574EFA',
    isMe: true,
  }

  useEffect(() => {
    const { token } = getStoredAuth()
    if (!token) return undefined

    let cancelled = false
    Promise.all([
      fetchPickleballSessions(token, selectedMonth),
      fetchMonthlyExpenses(token, selectedMonth),
    ]).then(([sessions, expenses]) => {
      if (cancelled) return
      dispatch({
        type: 'FETCH_HOME_MONTH_SUCCESS',
        yearMonth: selectedMonth,
        sessions,
        expenses,
      })
    }).catch(err => {
      if (cancelled) return
      dispatch({
        type: 'FETCH_HOME_MONTH_ERROR',
        error: err?.message || 'Không tải được dữ liệu tháng',
      })
    })

    return () => { cancelled = true }
  }, [dispatch, selectedMonth])

  const homeMonthReady = state.homeMonth === selectedMonth
  const homeMonthSessions = homeMonthReady ? (state.homeMonthSessions || []) : []
  const homeMonthExpenses = homeMonthReady ? (state.homeMonthExpenses || []) : []

  const monthNet = useMemo(
    () => calcMonthNet(homeMonthExpenses, meId),
    [homeMonthExpenses, meId],
  )
  const pickleExpenseSummaries = useMemo(
    () => buildExpenseSummaries(homeMonthExpenses, meId, isPickleballExpense),
    [homeMonthExpenses, meId],
  )
  const allExpenseSummaries = useMemo(
    () => buildExpenseSummaries(homeMonthExpenses, meId),
    [homeMonthExpenses, meId],
  )
  const pickleNet = pickleExpenseSummaries.reduce((sum, item) => sum + item.net, 0)
  const groupNet = allExpenseSummaries.reduce((sum, item) => sum + item.net, 0)
  const totalSpent = allExpenseSummaries.reduce((sum, item) => sum + item.total, 0)
  const monthNumber = Number(selectedMonth.split('-')[1])

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ background: '#fff', padding: '16px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>Xin chào,</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>
            {displayMemberName(meMember, 'Bạn')} 👋
          </div>
        </div>
        <button type="button" style={{ ...iconBtnStyle(), borderRadius: '50%', background: '#f4f4f8', border: 0 }} onClick={() => push('notifications')} aria-label="Thông báo">
          <Icon name="bell" size={18} color="#1a1a2e"/>
        </button>
      </div>

      <MonthNav selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}/>

      <MonthSummaryCard
        monthNumber={monthNumber}
        net={monthNet}
        onAddExpense={() => push('add-expense')}
        onSettle={() => push('settle-all')}
      />

      <div style={{ padding: '0 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {homeMonthSessions.length > 0 && (
          <PickleballMonthCard
            sessions={homeMonthSessions}
            memberId={meId}
            net={pickleNet}
            onClick={() => switchTab('pickle')}
          />
        )}

        {homeMonthExpenses.length > 0 && (
          <GroupExpensesCard
            summaries={allExpenseSummaries}
            net={groupNet}
            totalSpent={totalSpent}
            onClick={() => switchTab('groups')}
          />
        )}

        {monthNet < 0 && (
          <PaymentCTA amount={Math.abs(monthNet)} onClick={() => push('payment-flow')}/>
        )}
      </div>
    </div>
  )
}

function MonthNav({ selectedMonth, setSelectedMonth }) {
  const current = isCurrentMonth(selectedMonth)

  return (
    <div style={{ background: '#fff', padding: '10px 18px 14px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f0f0f7', borderRadius: 20, padding: 4 }}>
        <button
          type="button"
          onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
          style={monthArrowStyle(false, true)}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap' }}>
            {formatMonthLabel(selectedMonth)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!current) setSelectedMonth(nextMonth(selectedMonth))
          }}
          disabled={current}
          style={monthArrowStyle(current, false)}
          aria-label="Tháng sau"
        >
          ›
        </button>
      </div>
    </div>
  )
}

function MonthSummaryCard({ monthNumber, net, onAddExpense, onSettle }) {
  const label = net > 0
    ? `Bạn được nhận ${formatVNDPlain(net)}`
    : net < 0
      ? `Bạn đang nợ ${formatVNDPlain(Math.abs(net))}`
      : 'Cân bằng'

  return (
    <div style={{
      margin: '0 14px 14px',
      padding: 18,
      background: 'linear-gradient(135deg,#5b4ede 0%,#7c6ff7 100%)',
      borderRadius: 20,
      color: '#fff',
      boxShadow: '0 6px 24px rgba(91,78,222,.45)',
    }}>
      <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.75, marginBottom: 6 }}>
        TỔNG THÁNG {monthNumber}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
        {formatSignedVND(net)}
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 14 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onAddExpense} style={summaryButtonStyle(true)}>
          + Thêm chi tiêu
        </button>
        <button type="button" onClick={onSettle} style={summaryButtonStyle(false)}>
          ⚡ Thanh toán
        </button>
      </div>
    </div>
  )
}

function PickleballMonthCard({ sessions, memberId, net, onClick }) {
  const today = toDateKey(new Date())
  const sessionItems = useMemo(() => {
    return (sessions || [])
      .slice()
      .sort((a, b) => getSessionDate(a).localeCompare(getSessionDate(b)))
      .map(session => {
        const date = getSessionDate(session)
        return {
          id: session.id || date,
          date,
          weekday: formatWeekday(date),
          day: Number(date.split('-')[2]) || '',
          status: getSessionStatus(session, memberId, today),
        }
      })
      .filter(item => item.date)
  }, [memberId, sessions, today])

  const presentCount = sessionItems.filter(item => item.status === 'present').length
  const absentCount = sessionItems.filter(item => item.status === 'absent').length
  const upcomingCount = sessionItems.filter(item => item.status === 'upcoming').length
  const debt = Math.max(-net, 0)
  const statusText = net > 0
    ? `Nhận ${formatVNDPlain(net)}`
    : debt > 0
      ? `Nợ ${formatVNDPlain(debt)}`
      : 'Cân bằng'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        width: '100%',
        padding: 0,
        border: 0,
        textAlign: 'left',
        fontFamily: 'var(--vb-font-body)',
        background: 'linear-gradient(160deg,#1e1b4b 0%,#312e81 55%,#3730a3 100%)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 6px 24px rgba(30,27,75,.5)',
        cursor: 'pointer',
      }}
      aria-label="Mở tab Pickleball"
    >
      <CardHeader
        icon="🏓"
        title="Pickleball CLB"
        subtitle={statusText}
        subtitleColor="#fca5a5"
        action="Xem CLB ›"
      />

      <div style={{ padding: '2px 16px 8px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Điểm danh cá nhân · {formatSessionPattern(sessionItems)}
        </div>
      </div>

      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5 }}>
          {sessionItems.map(item => (
            <AttendanceCell key={item.id} item={item}/>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 9, flexWrap: 'wrap' }}>
          <LegendItem
            label={`Có mặt (${presentCount})`}
            color="rgba(167,243,208,.75)"
            swatchBg="rgba(110,231,183,.4)"
            swatchBorder="1px solid rgba(110,231,183,.6)"
          />
          <LegendItem
            label={`Vắng (${absentCount})`}
            color="rgba(253,164,175,.75)"
            swatchBg="rgba(251,113,133,.3)"
            swatchBorder="1px solid rgba(251,113,133,.5)"
          />
          <LegendItem
            label={`Sắp tới (${upcomingCount})`}
            color="rgba(255,255,255,.3)"
            swatchBg="rgba(255,255,255,.05)"
            swatchBorder="1px dashed rgba(255,255,255,.2)"
          />
        </div>
      </div>

      <StatsFooter
        items={[
          { value: presentCount, label: 'Có mặt', color: '#a7f3d0' },
          { value: absentCount, label: 'Vắng', color: '#fecdd3' },
          { value: sessionItems.length, label: 'Tổng buổi', color: 'rgba(255,255,255,.8)' },
          { value: compactMoney(debt), label: 'Bạn nợ', color: '#fca5a5' },
        ]}
      />
    </button>
  )
}

function GroupExpensesCard({ summaries, net, totalSpent, onClick }) {
  const recent = summaries.slice(0, 3)
  const debt = Math.max(-net, 0)
  const groupCount = new Set(summaries.map(item => item.groupId).filter(Boolean)).size
  const subtitle = net > 0
    ? `Nhận ${formatVNDPlain(net)}${groupCount ? ` · ${groupCount} nhóm` : ''}`
    : debt > 0
      ? `Nợ ${formatVNDPlain(debt)}${groupCount ? ` · ${groupCount} nhóm` : ''}`
      : `Cân bằng${groupCount ? ` · ${groupCount} nhóm` : ''}`

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        width: '100%',
        padding: 0,
        border: 0,
        textAlign: 'left',
        fontFamily: 'var(--vb-font-body)',
        background: 'linear-gradient(160deg,#0c2340 0%,#0f3460 55%,#154a7a 100%)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 6px 24px rgba(12,35,64,.5)',
        cursor: 'pointer',
      }}
      aria-label="Mở tab nhóm"
    >
      <CardHeader
        icon="📦"
        title="Chi tiêu nhóm"
        subtitle={subtitle}
        subtitleColor="#fcd34d"
        action="Chi tiết ›"
      />

      {recent.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
          {recent.map((item, index) => (
            <ExpensePreviewRow
              key={item.id}
              item={item}
              divider={index < recent.length - 1}
            />
          ))}
        </div>
      )}

      <StatsFooter
        items={[
          { value: summaries.length, label: 'Giao dịch', color: 'rgba(255,255,255,.85)' },
          { value: compactMoney(totalSpent), label: 'Tổng chi', color: 'rgba(255,255,255,.85)' },
          { value: compactMoney(debt), label: 'Bạn nợ', color: '#fcd34d' },
        ]}
      />
    </button>
  )
}

function CardHeader({ icon, title, subtitle, subtitleColor, action }) {
  return (
    <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 40,
          height: 40,
          background: 'rgba(255,255,255,.12)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: subtitleColor, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        </div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,.1)',
        border: '1px solid rgba(255,255,255,.15)',
        padding: '5px 10px',
        borderRadius: 20,
        fontSize: 11,
        color: 'rgba(255,255,255,.8)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {action}
      </div>
    </div>
  )
}

function AttendanceCell({ item }) {
  const styles = {
    present: {
      background: 'rgba(110,231,183,.25)',
      border: '1px solid rgba(110,231,183,.5)',
      labelColor: 'rgba(167,243,208,.8)',
      numColor: '#d1fae5',
      numWeight: 800,
    },
    absent: {
      background: 'rgba(251,113,133,.2)',
      border: '1px solid rgba(251,113,133,.45)',
      labelColor: 'rgba(253,164,175,.85)',
      numColor: '#fecdd3',
      numWeight: 800,
    },
    upcoming: {
      background: 'rgba(255,255,255,.05)',
      border: '1.5px dashed rgba(255,255,255,.18)',
      labelColor: 'rgba(255,255,255,.3)',
      numColor: 'rgba(255,255,255,.4)',
      numWeight: 700,
    },
  }[item.status] || {}

  return (
    <div style={{
      aspectRatio: '1',
      background: styles.background,
      border: styles.border,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ fontSize: 7, fontWeight: item.status === 'upcoming' ? 500 : 700, color: styles.labelColor }}>
        {item.weekday}
      </div>
      <div style={{ fontSize: 11, fontWeight: styles.numWeight, color: styles.numColor }}>
        {item.day}
      </div>
    </div>
  )
}

function LegendItem({ label, color, swatchBg, swatchBorder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color }}>
      <div style={{ width: 10, height: 10, background: swatchBg, border: swatchBorder, borderRadius: 3 }}/>
      {label}
    </div>
  )
}

function ExpensePreviewRow({ item, divider }) {
  const amountColor = item.net > 0 ? '#86efac' : item.net < 0 ? '#fca5a5' : 'rgba(255,255,255,.45)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '8px 16px',
      borderBottom: divider ? '1px solid rgba(255,255,255,.06)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ fontSize: 17, flexShrink: 0 }}>💰</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatShortDate(item.date)} · {item.groupName}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: amountColor, flexShrink: 0 }}>
        {formatSignedCompact(item.net)}
      </div>
    </div>
  )
}

function StatsFooter({ items }) {
  return (
    <div style={{ display: 'flex', padding: '9px 16px 13px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,.08)' }}/>}
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: item.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.value}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1 }}>
              {item.label}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function PaymentCTA({ amount, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        width: '100%',
        border: 0,
        background: 'linear-gradient(135deg,#5b4ede,#7c6ff7)',
        borderRadius: 16,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(91,78,222,.35)',
        fontFamily: 'var(--vb-font-body)',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>Thanh toán tổng</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{formatVNDPlain(amount)}</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,.2)', padding: '10px 16px', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700 }}>
        Thanh toán →
      </div>
    </button>
  )
}

function calcMonthNet(expenses, currentMemberId) {
  return buildExpenseSummaries(expenses, currentMemberId).reduce((sum, item) => sum + item.net, 0)
}

function buildExpenseSummaries(expenses, currentMemberId, predicate = () => true) {
  const byExpense = new Map()

  for (const row of expenses || []) {
    const expense = getExpense(row)
    if (!expense || !isApprovedExpense(expense) || !predicate(expense, row)) continue

    const id = getExpenseId(row, expense)
    if (!id) continue

    if (!byExpense.has(id)) {
      const group = Array.isArray(expense.groups) ? expense.groups[0] : expense.groups
      byExpense.set(id, {
        id,
        expense,
        title: expense.title || expense.description || 'Chi tiêu',
        date: normalizeDateText(expense.expense_date || expense.date),
        groupId: expense.group_id || expense.groupId || group?.id,
        groupName: group?.name || expense.groupName || 'Nhóm',
        paidBy: expense.paid_by_member_id || expense.paidBy || expense.paid_by,
        total: Number(expense.amount) || 0,
        myShare: 0,
        hasMe: false,
        participantCount: 0,
      })
    }

    const summary = byExpense.get(id)
    summary.participantCount += 1
    if (row.member_id === currentMemberId || row.memberId === currentMemberId) {
      summary.myShare += getShareAmount(row)
      summary.hasMe = true
    }
  }

  return Array.from(byExpense.values())
    .map(summary => ({
      ...summary,
      net: summary.paidBy === currentMemberId
        ? summary.total - summary.myShare
        : summary.hasMe
          ? -summary.myShare
          : 0,
    }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

function getExpense(row) {
  return row?.expenses || row?.expense || null
}

function getExpenseId(row, expense) {
  return row?.expense_id || row?.expenseId || expense?.id
}

function getShareAmount(row) {
  return Number(row?.share_amount ?? row?.shareAmount ?? row?.share ?? row?.amount ?? 0) || 0
}

function isApprovedExpense(expense) {
  return !expense.status || expense.status === 'approved'
}

function isPickleballExpense(expense) {
  return Boolean(
    expense?.pickle_session_id
    || expense?.pickleSessionId
    || String(expense?.module || '').toLowerCase() === 'pickleball',
  )
}

function getSessionDate(session) {
  return normalizeDateText(session?.date || session?.session_date)
}

function getSessionStatus(session, memberId, today) {
  const date = getSessionDate(session)
  if (date && date > today) return 'upcoming'

  const attendance = session?.pickleball_attendance || session?.attendance || []
  const record = attendance.find(item => (item.member_id || item.memberId) === memberId)
  const status = String(record?.status || '').toLowerCase()
  if (['present', 'attended', 'yes', 'checked_in'].includes(status)) return 'present'
  return 'absent'
}

function formatSessionPattern(items) {
  const order = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  const labels = Array.from(new Set(items.map(item => item.weekday).filter(Boolean)))
  return labels.sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(' ') || 'T2 T4 T6'
}

function toYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatMonthLabel(yearMonth) {
  const [year, month] = String(yearMonth).split('-').map(Number)
  return `Tháng ${month}, ${year}`
}

function isCurrentMonth(yearMonth) {
  return yearMonth === toYearMonth(new Date())
}

function prevMonth(yearMonth) {
  const [year, month] = String(yearMonth).split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return toYearMonth(date)
}

function nextMonth(yearMonth) {
  const [year, month] = String(yearMonth).split('-').map(Number)
  const date = new Date(year, month, 1)
  return toYearMonth(date)
}

function normalizeDateText(value) {
  return String(value || '').slice(0, 10)
}

function formatWeekday(dateText) {
  const date = new Date(`${dateText}T00:00:00`)
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()] || ''
}

function formatShortDate(dateText) {
  const date = normalizeDateText(dateText)
  if (!date) return ''
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

function formatVNDPlain(value) {
  return `${Math.round(Math.abs(Number(value) || 0)).toLocaleString('vi-VN')} đ`
}

function formatSignedVND(value) {
  const amount = Number(value) || 0
  if (amount === 0) return '0 đ'
  return `${amount > 0 ? '+' : '-'}${formatVNDPlain(amount)}`
}

function compactMoney(value) {
  const amount = Math.round(Math.abs(Number(value) || 0))
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000).toLocaleString('vi-VN')}k`
  return `${amount.toLocaleString('vi-VN')}đ`
}

function formatSignedCompact(value) {
  const amount = Number(value) || 0
  if (amount === 0) return '0đ'
  return `${amount > 0 ? '+' : '-'}${compactMoney(amount)}`
}

function monthArrowStyle(disabled, raised) {
  return {
    appearance: 'none',
    background: raised ? '#fff' : 'none',
    border: 'none',
    width: 32,
    height: 32,
    borderRadius: 14,
    fontSize: 17,
    color: disabled ? '#ccc' : '#5b4ede',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: raised ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
    fontFamily: 'var(--vb-font-body)',
    lineHeight: 1,
  }
}

function summaryButtonStyle(primary) {
  return {
    appearance: 'none',
    flex: 1,
    background: primary ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.2)',
    color: primary ? '#5b4ede' : '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '10px 8px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--vb-font-body)',
  }
}

export default ScreenHome
