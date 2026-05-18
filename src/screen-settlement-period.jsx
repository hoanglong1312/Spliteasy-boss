import React, { useMemo, useState } from 'react'
import { useApp } from './store.jsx'
import { getMemberMap, fmtVNDFull } from './data.jsx'
import { Avatar, Button, Card, EmptyState, Icon, Money, NavHeader } from './components.jsx'
import { BANK_LIST, generateQRUrl, openBankingApp } from './lib/vietqr.js'

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function field(row, camel, snake) {
  return row?.[camel] ?? row?.[snake]
}

function memberOrFallback(M, id) {
  return M[id] || {
    id,
    name: id ? 'Không rõ' : 'Chưa chọn',
    short: '?',
    initials: '?',
    color: '#99A1AF',
  }
}

function formatDate(value) {
  if (!value) return '--/--'
  const [year, month, day] = String(value).split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return String(value)
}

function getMonthYear(value) {
  const [year, month] = String(value || '').split('-')
  return {
    month: Number(month) || new Date().getMonth() + 1,
    year: Number(year) || new Date().getFullYear(),
  }
}

function normalizeBankId(value) {
  return BANK_LIST.find(b => b.id === value || b.shortName === value || b.name === value)?.id || value || ''
}

function paymentStatusMeta(status) {
  const map = {
    pending: { label: 'Chưa chuyển', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
    transferred: { label: 'Chờ xác nhận', color: '#D97706', bg: 'rgba(245,158,11,0.14)' },
    confirmed: { label: 'Hoàn tất', color: '#1F8A4C', bg: 'rgba(31,138,76,0.12)' },
  }
  return map[status] || map.pending
}

function periodStatusMeta(status) {
  if (status === 'closed') return { label: 'Đã đóng', color: '#1F8A4C', bg: 'rgba(31,138,76,0.12)' }
  return { label: 'Đang mở', color: '#D97706', bg: 'rgba(245,158,11,0.14)' }
}

function StatusChip({ meta }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 24,
      padding: '0 8px',
      borderRadius: 999,
      background: meta.bg,
      color: meta.color,
      fontSize: 12,
      fontWeight: 800,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

function ScreenSettlementPeriod({ params = {}, pop, tweaks = {} }) {
  const { state, dispatch } = useApp()
  const meId = state.currentUserId
  const M = getMemberMap(state.members)
  const me = memberOrFallback(M, meId)
  const isTreasurer = me.role === 'treasurer'
  const period = safeArray(state.settlementPeriods).find(p => p.id === params?.periodId)
  const [sheetPaymentId, setSheetPaymentId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const payments = useMemo(() => {
    const rows = safeArray(period?.payments)
    if (isTreasurer) return rows
    return rows.filter(p => {
      const fromId = field(p, 'fromMemberId', 'from_member_id')
      const toId = field(p, 'toMemberId', 'to_member_id')
      return fromId === meId || toId === meId
    })
  }, [period, isTreasurer, meId])

  const activePayment = safeArray(period?.payments).find(p => p.id === sheetPaymentId)
  const statusMeta = periodStatusMeta(period?.status)

  async function markTransferred(payment) {
    if (!payment) return
    setBusyId(payment.id)
    try {
      await dispatch({ type: 'MARK_TRANSFERRED', paymentId: payment.id })
      setSheetPaymentId(null)
    } catch (err) {
      window.alert('Không cập nhật được trạng thái chuyển khoản.')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmReceived(payment) {
    if (!payment) return
    setBusyId(payment.id)
    try {
      await dispatch({ type: 'CONFIRM_RECEIVED', paymentId: payment.id })
    } catch (err) {
      window.alert('Không xác nhận được khoản thanh toán.')
    } finally {
      setBusyId(null)
    }
  }

  if (!period) {
    return (
      <div style={{ paddingBottom: 96 }}>
        <NavHeader title="Chốt sổ" onBack={pop}/>
        <div style={{ padding: 16 }}>
          <Card>
            <EmptyState icon="calendar" title="Không tìm thấy kỳ chốt sổ" subtitle="Dữ liệu có thể đã được cập nhật."/>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <NavHeader
        title={`Chốt sổ ${formatDate(field(period, 'periodStart', 'period_start'))} - ${formatDate(field(period, 'periodEnd', 'period_end'))}`}
        subtitle={`${payments.length}/${safeArray(period.payments).length} khoản thanh toán`}
        onBack={pop}
        right={<StatusChip meta={statusMeta}/>}
      />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {payments.length === 0 ? (
          <Card>
            <EmptyState icon="check-circle" title="Bạn không có khoản nào trong kỳ này" subtitle="Thủ quỹ vẫn có thể theo dõi toàn bộ kỳ chốt sổ."/>
          </Card>
        ) : (
          <Card>
            {payments.map((payment, index) => {
              const fromId = field(payment, 'fromMemberId', 'from_member_id')
              const toId = field(payment, 'toMemberId', 'to_member_id')
              const fromMember = memberOrFallback(M, fromId)
              const toMember = memberOrFallback(M, toId)
              const status = payment.status || 'pending'
              const canTransfer = period.status !== 'closed' && status === 'pending' && fromId === meId
              const canConfirm = period.status !== 'closed' && status === 'transferred' && (toId === meId || isTreasurer)

              return (
                <div key={payment.id} style={{
                  padding: 14,
                  borderBottom: index < payments.length - 1 ? '1px solid var(--border-1)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar member={fromMember} size={34} style={tweaks.avatarStyle}/>
                    <Icon name="arrow-right" size={16} color="var(--text-2)"/>
                    <Avatar member={toMember} size={34} style={tweaks.avatarStyle}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fromMember.name} → {toMember.name}
                      </div>
                      <Money value={Number(payment.amount) || 0} size={14} color="var(--text-1)"/>
                    </div>
                    <StatusChip meta={paymentStatusMeta(status)}/>
                  </div>

                  {(canTransfer || canConfirm) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                      {canTransfer && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon="card"
                          onClick={() => setSheetPaymentId(payment.id)}
                          disabled={busyId === payment.id}
                        >
                          Chuyển khoản
                        </Button>
                      )}
                      {canConfirm && (
                        <Button
                          size="sm"
                          variant="brandSoft"
                          icon="check"
                          onClick={() => confirmReceived(payment)}
                          disabled={busyId === payment.id}
                        >
                          Xác nhận đã nhận
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        )}
      </div>

      {activePayment && (
        <PaymentSheet
          payment={activePayment}
          period={period}
          members={M}
          busy={busyId === activePayment.id}
          onClose={() => setSheetPaymentId(null)}
          onMarkTransferred={() => markTransferred(activePayment)}
        />
      )}
    </div>
  )
}

function PaymentSheet({ payment, period, members, busy, onClose, onMarkTransferred }) {
  const fromId = field(payment, 'fromMemberId', 'from_member_id')
  const toId = field(payment, 'toMemberId', 'to_member_id')
  const fromMember = memberOrFallback(members, fromId)
  const toMember = memberOrFallback(members, toId)
  const bankId = normalizeBankId(toMember.bankName ?? toMember.bank_name)
  const account = toMember.bankAccount ?? toMember.bank_account ?? ''
  const accountName = toMember.bankAccountName ?? toMember.bank_account_name ?? toMember.name
  const amount = Number(payment.amount) || 0
  const { month, year } = getMonthYear(field(period, 'periodEnd', 'period_end'))
  const description = `SpliteasyBoss T${month}/${year} - ${fromMember.name}`
  const hasBankInfo = Boolean(bankId && account)

  const payArgs = { bankId, account, accountName, amount, description }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--surface-1)',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px 34px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>
              Chuyển khoản cho {toMember.short || toMember.name}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>
              {fmtVNDFull(amount)} • {description}
            </div>
          </div>
          <button onClick={onClose} style={{
            appearance: 'none',
            width: 36,
            height: 36,
            borderRadius: 12,
            border: '1px solid var(--border-1)',
            background: 'var(--surface-1)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="x" size={18} color="var(--text-1)"/>
          </button>
        </div>

        {hasBankInfo ? (
          <>
            <div style={{
              alignSelf: 'center',
              width: 224,
              height: 224,
              borderRadius: 16,
              background: '#fff',
              border: '1px solid var(--border-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={generateQRUrl(payArgs)}
                alt="QR chuyển khoản"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-1)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>
                {bankId} • {account}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>
                {accountName}
              </div>
            </div>
            <Button variant="secondary" full icon="send" onClick={() => openBankingApp(payArgs)}>
              Mở app ngân hàng
            </Button>
          </>
        ) : (
          <div style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--vb-warn-100)',
            border: '1px solid rgba(245,158,11,0.28)',
            color: '#B45309',
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.4,
          }}>
            Người nhận chưa cập nhật tài khoản ngân hàng. Liên hệ trực tiếp.
          </div>
        )}

        <Button full icon="check" onClick={onMarkTransferred} disabled={busy}>
          {busy ? 'Đang cập nhật...' : '✓ Đã chuyển khoản'}
        </Button>
      </div>
    </div>
  )
}

export default ScreenSettlementPeriod
