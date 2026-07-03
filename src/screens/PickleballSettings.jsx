import React, { useEffect, useState } from 'react'
import { colors, type } from '../tokens'
import {
  PhoneFrame, Screen, TabBar, Card, Badge, Button, Input,
  ModuleHero, LoadingSpinner, loadingOverlayStyle, MonthNav, Avatar,
} from '../primitives'

export default function PickleballSettings({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO
  const [mode, setMode] = useState(d.billingMode || 'fixed')
  const [courtFee, setCourtFee] = useState(Number(d.courtFee) || 0)
  const [fixedMemberIds, setFixedMemberIds] = useState(() => safeArray(d.fixedMemberIds).map(String))
  const [monthlyTicketPrice, setMonthlyTicketPrice] = useState(Number(d.monthlyTicketPrice) || 0)
  const [perSessionTicketPrice, setPerSessionTicketPrice] = useState(Number(d.perSessionTicketPrice) || 0)
  const [monthlyTicketMemberIds, setMonthlyTicketMemberIds] = useState(() => safeArray(d.monthlyTicketMemberIds).map(String))
  const [perSessionTicketMemberIds, setPerSessionTicketMemberIds] = useState(() => safeArray(d.perSessionTicketMemberIds).map(String))
  const [savingAction, setSavingAction] = useState('')

  useEffect(() => {
    setMode(d.billingMode || 'fixed')
    setCourtFee(Number(d.courtFee) || 0)
    setFixedMemberIds(safeArray(d.fixedMemberIds).map(String))
    setMonthlyTicketPrice(Number(d.monthlyTicketPrice) || 0)
    setPerSessionTicketPrice(Number(d.perSessionTicketPrice) || 0)
    setMonthlyTicketMemberIds(safeArray(d.monthlyTicketMemberIds).map(String))
    setPerSessionTicketMemberIds(safeArray(d.perSessionTicketMemberIds).map(String))
    setSavingAction('')
  }, [
    d.billingMode,
    d.courtFee,
    d.fixedMemberIds,
    d.monthlyTicketPrice,
    d.perSessionTicketPrice,
    d.monthlyTicketMemberIds,
    d.perSessionTicketMemberIds,
  ])

  async function saveConfig() {
    if (savingAction) return
    setSavingAction('saveMonthlyConfig')
    try {
      await onAction?.('saveMonthlyConfig', {
        mode,
        groupId: d.groupId,
        yearMonth: d.yearMonth,
        courtFee,
        fixedMemberIds,
        monthlyTicketPrice,
        perSessionTicketPrice,
        monthlyTicketMemberIds,
        perSessionTicketMemberIds,
      })
    } finally {
      setSavingAction('')
    }
  }

  function toggleFixedMember(memberId) {
    const id = String(memberId)
    setFixedMemberIds(current => (
      current.includes(id) ? current.filter(value => value !== id) : [...current, id]
    ))
  }

  if (!isTreasurer) {
    return (
      <PhoneFrame>
        <Screen tabBar style={{ background: colors.pageBg }}>
          <ModuleHero
            tone="pickleball"
            eyebrow={`CẤU HÌNH THÁNG · ${d.clubName || 'CLB Pickleball'}`}
            title={d.yearMonth || 'Cấu hình'}
            action={<Button type="button" variant="ghost" onClick={() => onAction?.('back')}>Đóng</Button>}
          />
          <Card>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Chỉ thủ quỹ mới sửa được cấu hình tháng.</div>
          </Card>
        </Screen>
        <TabBar active="pickleball" onChange={(key) => onAction?.('tab', key)} onFab={() => onAction?.('fab')} />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <Screen tabBar style={{ background: colors.pageBg }}>
        <ModuleHero
          tone="pickleball"
          eyebrow={`CẤU HÌNH THÁNG · ${d.clubName || 'CLB Pickleball'}`}
          title={d.yearMonth || 'Cấu hình'}
          action={<Button type="button" variant="ghost" onClick={() => onAction?.('back')}>Đóng</Button>}
        />

        <MonthNav label={d.monthLabel || d.yearMonth} onPrev={() => onAction?.('monthPrev')} onNext={() => onAction?.('monthNext')} />

        <ModeSwitch value={mode} onChange={setMode} />

        {mode === 'fixed' ? (
          <>
            <Card style={{ padding: '14px 12px', marginBottom: 14 }}>
              <div style={sectionEyebrowStyle}>Billing cố định</div>
              <Input
                label="Tiền sân/tháng"
                suffix="đ"
                value={formatInputAmount(courtFee)}
                onChange={event => setCourtFee(parseAmount(event.target.value))}
                inputMode="numeric"
                inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
              />
            </Card>
            <MemberChecklist
              title="Thành viên cố định"
              members={d.members}
              selectedIds={fixedMemberIds}
              onToggle={toggleFixedMember}
              tone="fixed"
            />
          </>
        ) : (
          <>
            <Card style={{ padding: '14px 12px', marginBottom: 14 }}>
              <div style={sectionEyebrowStyle}>Billing linh hoạt</div>
              <Input
                label="Giá vé tháng"
                suffix="đ"
                value={formatInputAmount(monthlyTicketPrice)}
                onChange={event => setMonthlyTicketPrice(parseAmount(event.target.value))}
                inputMode="numeric"
                inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
              />
              <Input
                label="Giá vé lượt"
                suffix="đ"
                value={formatInputAmount(perSessionTicketPrice)}
                onChange={event => setPerSessionTicketPrice(parseAmount(event.target.value))}
                inputMode="numeric"
                inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
              />
            </Card>
          </>
        )}

        <Button
          type="button"
          block
          variant="success"
          onClick={saveConfig}
          disabled={savingAction === 'saveMonthlyConfig'}
          style={{ marginTop: 6 }}
        >
          {savingAction === 'saveMonthlyConfig' ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </Screen>

      <TabBar active="pickleball" onChange={(key) => onAction?.('tab', key)} onFab={() => onAction?.('fab')} />
      {savingAction && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
        </div>
      )}
    </PhoneFrame>
  )
}

function ModeSwitch({ value, onChange }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6,
      marginBottom: 14,
      padding: 4,
      borderRadius: 12,
      background: colors.cardSurface,
      border: `1px solid ${colors.borderSubtle}`,
    }}>
      {[
        { key: 'fixed', label: 'Cố định' },
        { key: 'flex', label: 'Linh hoạt' },
      ].map(item => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          style={{
            border: 'none',
            borderRadius: 9,
            padding: '10px 8px',
            background: value === item.key ? colors.successSoft : 'transparent',
            color: value === item.key ? colors.pickleball : colors.textSecondary,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function MemberChecklist({ title, members, selectedIds, onToggle, tone }) {
  const selectedSet = new Set(safeArray(selectedIds).map(String))

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...type.label, color: colors.textSecondary, margin: '8px 0 8px' }}>{title}</div>
      <Card style={{ padding: '4px 12px' }}>
        {safeArray(members).length === 0 && (
          <div style={{ fontSize: 12, color: colors.textSecondary, padding: '12px 0' }}>
            Không có thành viên
          </div>
        )}
        {safeArray(members).map((member, index) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onToggle(member.id)}
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '34px minmax(0, 1fr) auto',
              gap: 10,
              alignItems: 'center',
              padding: '10px 0',
              border: 'none',
              borderBottom: index === safeArray(members).length - 1 ? 'none' : `1px solid ${colors.borderSubtle}`,
              background: 'transparent',
              color: colors.textPrimary,
              fontFamily: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <Avatar initial={member.initial} size={34} photoUrl={member.photoUrl} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {member.name}
                </span>
                {member.isTreasurer && <Badge tone="warn" style={{ padding: '2px 6px', fontSize: 9 }}>THỦ QUỸ</Badge>}
              </div>
            </div>
            <CheckChip checked={selectedSet.has(String(member.id))} tone={tone} />
          </button>
        ))}
      </Card>
    </div>
  )
}

function CheckChip({ checked, tone }) {
  const palette = tone === 'per_session'
    ? { border: 'rgba(251,191,36,0.28)', bg: 'rgba(251,191,36,0.10)', color: '#fde68a' }
    : tone === 'monthly'
      ? { border: 'rgba(96,165,250,0.28)', bg: 'rgba(96,165,250,0.12)', color: '#bfdbfe' }
      : { border: 'rgba(52,211,153,0.30)', bg: 'rgba(52,211,153,0.10)', color: '#6ee7b7' }

  return (
    <div style={{
      minWidth: 62,
      border: `1px solid ${checked ? palette.border : colors.borderSubtle}`,
      background: checked ? palette.bg : 'transparent',
      color: checked ? palette.color : colors.textSecondary,
      borderRadius: 10,
      padding: '7px 9px',
      fontSize: 11,
      fontWeight: 900,
      textAlign: 'center',
      ...type.mono,
    }}>
      {checked ? 'Đã chọn' : 'Chọn'}
    </div>
  )
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0
}

function formatInputAmount(value) {
  return parseAmount(value).toLocaleString('vi-VN')
}

const sectionEyebrowStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: '#93c5fd',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const DEMO = {
  yearMonth: '2026-07',
  monthLabel: 'Tháng 7 · 2026',
  billingMode: 'fixed',
  courtFee: 1200000,
  fixedMemberIds: ['1', '2'],
  monthlyTicketPrice: 700000,
  perSessionTicketPrice: 120000,
  monthlyTicketMemberIds: ['1'],
  perSessionTicketMemberIds: ['2'],
  members: [
    { id: '1', name: 'Long', initial: 'L', isTreasurer: true },
    { id: '2', name: 'An', initial: 'A' },
    { id: '3', name: 'Bình', initial: 'B' },
  ],
  groupId: 'pickle-group',
  clubName: 'CLB Pickleball',
}
