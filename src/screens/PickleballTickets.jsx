// Spliteasy Boss - Pickleball · Vé lẻ
// Props: data from buildPickleballTicketsData(state), isTreasurer

import React, { useMemo, useState } from 'react'
import { colors, type, formatVNDShort } from '../tokens'
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Badge, SubTabs, Pill, PillRow, Avatar, Button, Input,
} from '../primitives'

const EMPTY_DATA = {
  clubName: 'CLB Pickleball',
  monthLabel: '',
  summary: {
    monthLabel: '',
    sessionCount: 0,
    totalAttendances: 0,
    totalAmount: 0,
    paid: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 },
    teamFund: { count: 0, amount: 0 },
  },
  filters: [
    { key: 'all', label: 'Tất cả · 0' },
    { key: 'unpaid', label: '⏳ Chưa trả · 0' },
    { key: 'paid', label: '✅ Đã trả · 0' },
    { key: 'team', label: '🏦 Quỹ team · 0' },
  ],
  activeFilter: 'all',
  members: [],
  tickets: [],
}

export default function PickleballTickets({ data, isTreasurer = true, onAction }) {
  const d = data || EMPTY_DATA
  const [activeFilter, setActiveFilter] = useState(d.activeFilter || d.filter || 'all')
  const [showForm, setShowForm] = useState(false)
  const visibleTickets = useMemo(() => {
    const tickets = d.tickets || []
    if (activeFilter === 'unpaid') return tickets.filter(t => t.status === 'unpaid')
    if (activeFilter === 'paid') return tickets.filter(t => t.status === 'paid')
    if (activeFilter === 'team') return tickets.filter(t => t.status === 'team_fund')
    return tickets
  }, [activeFilter, d.tickets])

  async function saveTicket(payload) {
    await onAction?.('addTicket', payload)
    setShowForm(false)
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
            {isTreasurer && (
              <IconButton
                style={{ background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 900, fontSize: 20 }}
                onClick={() => setShowForm(true)}
              >+</IconButton>
            )}
          </div>
        </Hero>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
            { key: 'tickets',   label: 'Vé lẻ' },
          ]}
          active="tickets" onChange={(k) => onAction?.('subTab', k)}
        />

        <Card accent="pickleball" style={{ padding: 14 }}>
          <div style={{ ...type.label, color: colors.pickleball }}>{d.summary.monthLabel || d.monthLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
            <SummaryStat label="Tổng buổi" value={d.summary.sessionCount} />
            <SummaryStat label="Tổng lượt" value={d.summary.totalAttendances} />
            <SummaryStat label="Tổng tiền" value={formatShortAmount(d.summary.totalAmount)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <SummaryBox tone="success" label="Đã trả" value={`${d.summary.paid.count} buổi · ${formatShortAmount(d.summary.paid.amount)}`} />
            <SummaryBox tone="warn" label="Chưa trả" value={`${d.summary.unpaid.count} buổi · ${formatShortAmount(d.summary.unpaid.amount)}`} />
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
            <TicketCard key={t.id} t={t} isTreasurer={isTreasurer} onAction={onAction} />
          ))}
        </div>
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

function TicketCard({ t, isTreasurer, onAction }) {
  const isTeamFund = t.status === 'team_fund'
  const isPaid = t.status === 'paid'
  const accentColor = isTeamFund ? '#a78bfa' : isPaid ? colors.pickleball : colors.warning
  const badgeTone = isTeamFund ? 'brand' : isPaid ? 'success' : 'warn'
  const badgeLabel = isTeamFund ? '🏦 Quỹ team' : isPaid ? '✅ Đã trả' : '⏳ Chưa trả'
  const memberCount = (t.memberIds || []).length

  async function deleteTicket() {
    if (!window.confirm('Xoá vé lẻ này?')) return
    await onAction?.('deleteTicket', { ticketId: t.id })
  }

  return (
    <Card style={{ padding: 16, borderColor: isTeamFund ? 'rgba(167,139,250,0.25)' : isPaid ? colors.borderSubtle : 'rgba(251,191,36,0.25)' }}>
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
        color: isTeamFund ? '#c4b5fd' : isPaid ? colors.textSecondary : '#fcd34d',
      }}>
        {isTeamFund ? '→ cộng vào chi phí tháng' : `→ mọi người chuyển khoản ${t.advancerName}`}
      </div>

      {isTreasurer && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {!isTeamFund && !isPaid && (
            <button
              type="button"
              onClick={() => onAction?.('markTicketPaid', { ticketId: t.id })}
              style={actionButtonStyle('success')}
            >✓ Đã trả</button>
          )}
          <button type="button" onClick={deleteTicket} style={actionButtonStyle('danger')}>🗑 Xoá</button>
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
  const [memberIds, setMemberIds] = useState(members.map(member => member.id))
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('team_fund')
  const [advancerId, setAdvancerId] = useState(members[0]?.id || '')
  const amountPerPerson = memberIds.length > 0 ? Math.round((Number(totalAmount) || 0) / memberIds.length) : 0
  const canSave = date.trim() && time.trim() && memberIds.length > 0 && Number(totalAmount) > 0 &&
    (paymentMode === 'team_fund' || advancerId)

  function toggleMember(memberId) {
    setMemberIds(current => (
      current.some(id => String(id) === String(memberId))
        ? current.filter(id => String(id) !== String(memberId))
        : [...current, memberId]
    ))
  }

  function submit(e) {
    e.preventDefault()
    if (!canSave) return
    onSave({
      date: dateToIso(date),
      time,
      memberIds,
      totalAmount: Number(totalAmount) || 0,
      advancerId: paymentMode === 'advancer' ? advancerId : null,
    })
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
          onChange={e => setDate(e.target.value)}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
        />
        <Input
          label="Giờ"
          value={time}
          onChange={e => setTime(e.target.value)}
          placeholder="HH:mm"
          inputMode="numeric"
        />

        <div style={{ ...type.label, color: colors.textSecondary, margin: '14px 0 8px' }}>Người tham gia</div>
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

        <Input
          label="Tổng tiền"
          type="number"
          value={totalAmount}
          onChange={e => setTotalAmount(e.target.value)}
          placeholder="0"
          suffix="đ"
        />
        <div style={{ fontSize: 11, color: colors.pickleball, fontWeight: 800, marginTop: 6 }}>
          = {formatShortAmount(amountPerPerson)}/người
        </div>

        <div style={{ ...type.label, color: colors.textSecondary, margin: '16px 0 8px' }}>Thanh toán</div>
        <label style={paymentRowStyle(paymentMode === 'advancer')}>
          <input
            type="radio"
            checked={paymentMode === 'advancer'}
            onChange={() => setPaymentMode('advancer')}
            style={{ accentColor: colors.pickleball }}
          />
          <select
            value={advancerId}
            onChange={e => setAdvancerId(e.target.value)}
            disabled={paymentMode !== 'advancer'}
            style={selectStyle()}
          >
            <option value="">Chọn người ứng...</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>

        <label style={paymentRowStyle(paymentMode === 'team_fund')}>
          <input
            type="radio"
            checked={paymentMode === 'team_fund'}
            onChange={() => setPaymentMode('team_fund')}
            style={{ accentColor: colors.pickleball }}
          />
          <span style={{ fontSize: 13, fontWeight: 800 }}>Quỹ team trả</span>
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button type="button" variant="ghost" block onClick={onClose} style={{ padding: 12 }}>Huỷ</Button>
          <Button type="submit" variant="success" block disabled={!canSave} style={{ padding: 12, opacity: canSave ? 1 : 0.45 }}>Lưu</Button>
        </div>
      </form>
    </div>
  )
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
