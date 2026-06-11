// Spliteasy Boss - Pickleball · Vé lẻ
// Props: data from buildPickleballTicketsData(state), isTreasurer

import React, { useEffect, useMemo, useState } from 'react'
import { colors, type, formatVNDShort } from '../tokens'
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Badge, SubTabs, Pill, PillRow, Avatar, Button, Input,
  LoadingSpinner, loadingOverlayStyle, MonthNav,
} from '../primitives'

const EMPTY_DATA = {
  clubName: 'CLB Pickleball',
  monthLabel: '',
  summary: {
    monthLabel: '',
    sessionCount: 0,
    totalAttendances: 0,
    totalAmount: 0,
    unpaid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    teamFund: { count: 0, amount: 0 },
  },
  filters: [
    { key: 'all', label: 'Tất cả · 0' },
    { key: 'pending', label: '🕓 Chờ duyệt · 0' },
    { key: 'unpaid', label: '⏳ Người ứng · 0' },
    { key: 'team', label: '🏦 Quỹ team · 0' },
  ],
  activeFilter: 'all',
  members: [],
  tickets: [],
  ticketPricePerPerson: 50000,
}

export default function PickleballTickets({ data, isTreasurer = true, onAction }) {
  const d = data || EMPTY_DATA
  const [activeFilter, setActiveFilter] = useState(d.activeFilter || d.filter || 'all')
  const [showForm, setShowForm] = useState(false)
  const [savingAction, setSavingAction] = useState('')
  const visibleTickets = useMemo(() => {
    const tickets = d.tickets || []
    if (activeFilter === 'unpaid') return tickets.filter(t => t.status === 'unpaid')
    if (activeFilter === 'pending') return tickets.filter(t => t.status === 'pending_review')
    if (activeFilter === 'team') return tickets.filter(t => t.status === 'team_fund')
    return tickets
  }, [activeFilter, d.tickets])

  async function saveTicket(payload) {
    if (savingAction) return
    setSavingAction('addTicket')
    try {
      await onAction?.('addTicket', payload)
      setShowForm(false)
    } finally {
      setSavingAction('')
    }
  }

  return (
    <PhoneFrame>
      <Screen style={{ background: colors.pageBg }}>
        <Hero variant="emerald" style={{ padding: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#a7f3d0', textTransform: 'uppercase' }}>
                CLB PICKLEBALL · {d.clubName}
              </div>
              <h1 style={{ ...type.title, margin: '4px 0 0' }}>Vé lẻ</h1>
            </div>
            <IconButton
              style={{ background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 900, fontSize: 20 }}
              onClick={() => setShowForm(true)}
            >+</IconButton>
          </div>
        </Hero>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
          ]}
          active="tickets" onChange={(k) => onAction?.('subTab', k)}
        />

        <MonthNav label={d.monthLabel || d.summary?.monthLabel} onPrev={() => onAction?.("monthPrev")} onNext={() => onAction?.("monthNext")} />

        <Card accent="pickleball" style={{ padding: 14 }}>
          <div style={{ ...type.label, color: colors.pickleball }}>{d.summary.monthLabel || d.monthLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
            <SummaryStat label="Tổng buổi" value={d.summary.sessionCount} />
            <SummaryStat label="Tổng lượt" value={d.summary.totalAttendances} />
            <SummaryStat label="Tổng tiền" value={formatShortAmount(d.summary.totalAmount)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <SummaryBox tone="warn" label="Chờ duyệt" value={`${d.summary.pending.count} buổi · ${formatShortAmount(d.summary.pending.amount)}`} />
            <SummaryBox tone="success" label="Đã duyệt" value={`${d.summary.unpaid.count + d.summary.teamFund.count} buổi`} />
          </div>
        </Card>

        <PillRow style={{ marginTop: 14 }}>
          {(d.filters || EMPTY_DATA.filters).map(f => (
            <Pill
              key={f.key}
              active={f.key === activeFilter}
              onClick={() => setActiveFilter(f.key)}
              style={f.key === activeFilter ? {
                background: 'rgba(52,211,153,0.14)',
                borderColor: 'rgba(52,211,153,0.35)',
                color: '#a7f3d0',
              } : null}
            >{f.label}</Pill>
          ))}
        </PillRow>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleTickets.length === 0 ? (
            <Card style={{ padding: 18, textAlign: 'center', color: colors.textSecondary, fontSize: 12, fontWeight: 700 }}>
              Chưa có vé lẻ trong tháng này
            </Card>
            ) : visibleTickets.map(t => (
              <TicketCard key={t.id} t={t} isTreasurer={isTreasurer} savingAction={savingAction} setSavingAction={setSavingAction} onAction={onAction} />
            ))}
        </div>
        {savingAction && (
          <div role="status" aria-live="polite" style={loadingOverlayStyle}>
            <LoadingSpinner />
            <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
          </div>
        )}
      </Screen>

      {showForm && isTreasurer && (
        <AddTicketSheet data={d} onClose={() => setShowForm(false)} onSave={saveTicket} />
      )}

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div style={{
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 10,
      padding: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: colors.textPrimary, ...type.mono }}>{value}</div>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 700, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function SummaryBox({ tone, label, value }) {
  const palette = {
    success: { bg: 'rgba(52,211,153,0.13)', border: 'rgba(52,211,153,0.28)', label: '#6ee7b7', val: colors.success },
    warn: { bg: 'rgba(251,191,36,0.11)', border: 'rgba(251,191,36,0.28)', label: '#fcd34d', val: colors.warning },
  }[tone]
  return (
    <div style={{
      flex: 1,
      padding: '8px 10px',
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      borderRadius: 10,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 9, color: palette.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: palette.val, marginTop: 2, ...type.mono }}>{value}</div>
    </div>
  )
}

function TicketCard({ t, isTreasurer, savingAction, setSavingAction, onAction }) {
  const isTeamFund = t.status === 'team_fund'
  const isPending = t.status === 'pending_review'
  const accentColor = isPending ? '#60a5fa' : isTeamFund ? '#a78bfa' : colors.warning
  const badgeTone = isPending ? 'brand' : isTeamFund ? 'brand' : 'warn'
  const badgeLabel = isPending ? '🕓 Chờ duyệt' : isTeamFund ? '🏦 Quỹ team' : '💸 Người ứng'
  const memberCount = (t.memberIds || []).length

  async function deleteTicket() {
    if (savingAction) return
    if (!window.confirm('Xoá vé lẻ này?')) return
    setSavingAction('deleteTicket')
    try {
      await onAction?.('deleteTicket', { ticketId: t.id })
    } finally {
      setSavingAction('')
    }
  }

  async function approveTicket() {
    if (savingAction) return
    setSavingAction('approveTicket')
    try {
      await onAction?.('approveTicket', { ticketId: t.id, status: t.advancerId ? 'unpaid' : 'team_fund' })
    } finally {
      setSavingAction('')
    }
  }

  return (
    <Card style={{ padding: 16, borderColor: isPending ? 'rgba(96,165,250,0.28)' : isTeamFund ? 'rgba(167,139,250,0.25)' : 'rgba(251,191,36,0.25)', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
              Buổi {t.sessionNumber}
            </span>
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginTop: 5 }}>
            {t.dateLabel} · {formatTimeLabel(t.timeLabel)}
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, color: accentColor, ...type.mono }}>
          {formatShortAmount(t.amountPerPerson)}/người
        </div>
      </div>

      <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 700, marginTop: 8 }}>
        {isTeamFund ? `${formatShortAmount(t.amountPerPerson)}/người · ${memberCount} người tham gia` : `${formatShortAmount(t.amountPerPerson)}/người · ${t.advancerName} ứng`}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {(t.memberChips || []).map(member => (
          <AttendeeChip key={member.id} member={member} isAdvancer={String(member.id) === String(t.advancerId)} />
        ))}
      </div>

      <div style={{
        marginTop: 11,
        fontSize: 11,
        fontWeight: 800,
        color: isPending ? '#93c5fd' : isTeamFund ? '#c4b5fd' : '#fcd34d',
      }}>
        {isPending ? '→ chờ thủ quỹ duyệt trước khi tính vào tháng' : isTeamFund ? '→ cộng vào chi phí tháng' : `→ tự động bù/trừ với ${t.advancerName}`}
      </div>

      {isTreasurer && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {isPending && (
            <button
              type="button"
              onClick={approveTicket}
              disabled={savingAction === 'approveTicket'}
              style={actionButtonStyle('success')}
            >{savingAction === 'approveTicket' ? 'Đang xử lý…' : 'Duyệt'}</button>
          )}
          <button type="button" onClick={deleteTicket} disabled={savingAction === 'deleteTicket'} style={actionButtonStyle('danger')}>{savingAction === 'deleteTicket' ? 'Đang xóa…' : '🗑 Xoá'}</button>
        </div>
      )}
    </Card>
  )
}

function AttendeeChip({ member, isAdvancer }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 9px 4px 4px',
      borderRadius: 100,
      background: isAdvancer ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${isAdvancer ? 'rgba(52,211,153,0.32)' : colors.borderSubtle}`,
      color: isAdvancer ? '#a7f3d0' : '#cbd5e1',
    }}>
      <Avatar initial={member.initial} color={member.color} size={16} ring={false} />
      <span style={{ fontSize: 10, fontWeight: 800 }}>{member.name}</span>
    </span>
  )
}

function AddTicketSheet({ data, onClose, onSave }) {
  const today = new Date()
  const members = data.members || []
  const [date, setDate] = useState(toDateInput(today))
  const [time, setTime] = useState('19:00')
  const [memberIds, setMemberIds] = useState([])
  const [paymentMode, setPaymentMode] = useState('team_fund')
  const [advancerId, setAdvancerId] = useState('')
  const [error, setError] = useState('')
  const selectedMembers = members.filter(member => memberIds.some(id => String(id) === String(member.id)))
  const ticketPrice = Number(data.ticketPricePerPerson || data.ticketPrice || data.defaultTicketAmountPerPerson || 50000) || 50000
  const totalAmountToSave = ticketPrice * memberIds.length
  const amountPerPerson = ticketPrice
  const canSave = !ticketValidationError({ date, time, memberIds, totalAmount: totalAmountToSave, paymentMode, advancerId })

  useEffect(() => {
    if (paymentMode !== 'advancer') return
    if (selectedMembers.some(member => String(member.id) === String(advancerId))) return
    setAdvancerId(selectedMembers[0]?.id || '')
  }, [advancerId, paymentMode, selectedMembers])

  function toggleMember(memberId) {
    if (error) setError('')
    setMemberIds(current => (
      current.some(id => String(id) === String(memberId))
        ? current.filter(id => String(id) !== String(memberId))
        : [...current, memberId]
    ))
  }

  async function submit(e) {
    e.preventDefault()
    const validationError = ticketValidationError({ date, time, memberIds, totalAmount: totalAmountToSave, paymentMode, advancerId })
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      await onSave({
        session_date: dateToIso(date),
        session_time: time,
        member_ids: memberIds,
        total_amount: totalAmountToSave,
        advancer_id: paymentMode === 'advancer' ? advancerId : null,
        paymentMode,
      })
    } catch (err) {
      setError(ticketErrorMessage(err))
    }
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 40,
      background: 'rgba(0,0,0,0.58)',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 12,
    }}>
      <form onSubmit={submit} style={{
        width: '100%',
        maxHeight: 720,
        overflowY: 'auto',
        background: colors.shellBg,
        border: `1px solid ${colors.borderNormal}`,
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...type.label, color: colors.pickleball }}>Vé lẻ</div>
            <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>Thêm vé lẻ</div>
          </div>
          <button type="button" onClick={onClose} style={{
            border: 'none',
            background: 'transparent',
            color: colors.textSecondary,
            fontSize: 22,
            cursor: 'pointer',
          }}>×</button>
        </div>

        <Input
          label="Ngày"
          value={date}
          onChange={e => {
            setDate(e.target.value)
            if (error) setError('')
          }}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
        />
        <Input
          label="Giờ"
          value={time}
          onChange={e => {
            setTime(e.target.value)
            if (error) setError('')
          }}
          placeholder="HH:mm"
          inputMode="numeric"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
          <div style={{ ...type.label, color: colors.textSecondary }}>Người tham gia</div>
          <div style={{ fontSize: 10, color: colors.pickleball, fontWeight: 800 }}>
            {memberIds.length} người đã chọn
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {members.map(member => {
            const active = memberIds.some(id => String(id) === String(member.id))
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 100,
                  border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : colors.borderSubtle}`,
                  background: active ? 'rgba(52,211,153,0.14)' : colors.inputBg,
                  color: active ? '#a7f3d0' : colors.textSecondary,
                  padding: '6px 10px 6px 6px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                <Avatar initial={member.initial} color={member.color} size={18} ring={false} />
                {member.name}{active ? ' ✓' : ''}
              </button>
            )
          })}
        </div>

        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.22)',
        }}>
          <div style={{ fontSize: 10, color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Price per person
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ fontSize: 15, color: colors.textPrimary, fontWeight: 900, ...type.mono }}>
              {formatShortAmount(amountPerPerson)}/người
            </span>
            <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 800, ...type.mono }}>
              Tổng {formatShortAmount(totalAmountToSave)}
            </span>
          </div>
        </div>

        <div style={{ ...type.label, color: colors.textSecondary, margin: '16px 0 8px' }}>Thanh toán</div>
        <label style={paymentRowStyle(paymentMode === 'advancer')}>
          <input
            type="radio"
            checked={paymentMode === 'advancer'}
            onChange={() => {
              setPaymentMode('advancer')
              if (!advancerId && selectedMembers[0]?.id) setAdvancerId(selectedMembers[0].id)
              if (error) setError('')
            }}
            style={{ accentColor: colors.pickleball }}
          />
          <select
            value={advancerId}
            onChange={e => {
              setAdvancerId(e.target.value)
              if (error) setError('')
            }}
            disabled={paymentMode !== 'advancer'}
            style={selectStyle()}
          >
            <option value="">Chọn người ứng...</option>
            {selectedMembers.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>

        <label style={paymentRowStyle(paymentMode === 'team_fund')}>
          <input
            type="radio"
            checked={paymentMode === 'team_fund'}
            onChange={() => {
              setPaymentMode('team_fund')
              if (error) setError('')
            }}
            style={{ accentColor: colors.pickleball }}
          />
          <span style={{ fontSize: 16, fontWeight: 800 }}>Quỹ team trả</span>
        </label>

        {error && (
          <div style={{ marginTop: 12, color: colors.danger, fontSize: 11, fontWeight: 800 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button type="button" variant="ghost" block onClick={onClose} style={{ padding: 12 }}>Huỷ</Button>
          <Button type="submit" variant="success" block aria-disabled={canSave ? 'false' : 'true'} style={{ padding: 12, opacity: canSave ? 1 : 0.65 }}>Lưu</Button>
        </div>
      </form>
    </div>
  )
}

function ticketValidationError({ date, time, memberIds, totalAmount, paymentMode, advancerId }) {
  if (!String(date || '').trim()) return 'Chọn ngày chơi.'
  if (!String(time || '').trim()) return 'Nhập giờ chơi.'
  if (!Array.isArray(memberIds) || memberIds.length === 0) return 'Chọn ít nhất một người tham gia.'
  if ((Number(totalAmount) || 0) <= 0) return 'Nhập tổng tiền vé.'
  if (paymentMode === 'advancer' && !advancerId) return 'Chọn người ứng tiền hoặc quỹ team.'
  return ''
}

function ticketErrorMessage(err) {
  const code = String(err?.message || err || '')
  const map = {
    ticket_session_date_required: 'Chọn ngày chơi.',
    ticket_members_required: 'Chọn ít nhất một người tham gia.',
    ticket_total_amount_required: 'Nhập tổng tiền vé.',
    ticket_payment_required: 'Chọn người ứng tiền hoặc quỹ team.',
  }
  return map[code] || 'Không lưu được vé lẻ. Thử lại.'
}

function parseMoneyAmount(value) {
  return Number(String(value ?? '').replace(/\D/g, '')) || 0
}

function actionButtonStyle(tone) {
  const palette = tone === 'danger'
    ? { bg: colors.dangerSoft, border: 'rgba(248,113,113,0.24)', color: '#fca5a5' }
    : { bg: colors.successSoft, border: 'rgba(52,211,153,0.28)', color: '#86efac' }
  return {
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  }
}

function paymentRowStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    background: active ? 'rgba(52,211,153,0.10)' : colors.inputBg,
    border: `1px solid ${active ? 'rgba(52,211,153,0.30)' : colors.borderSubtle}`,
    borderRadius: 12,
  }
}

function selectStyle() {
  return {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: colors.textPrimary,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 800,
  }
}

function formatShortAmount(value) {
  return formatVNDShort(Number(value) || 0)
}

function formatTimeLabel(value) {
  const text = String(value || '')
  const match = text.match(/^(\d{1,2}:\d{2})/)
  return match ? match[1] : text || '19:00'
}

function toDateInput(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function dateToIso(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return text
  const [, day, month, year] = match
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
