// Spliteasy Boss — Trang chủ
// Props: data { user, monthLabel, totalBalance, owedTo, pickleball, groups, todaySession, transactions[] }

import React, { useState, useEffect } from 'react';
import { Bell } from '@phosphor-icons/react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Card,
  SectionLabel, SearchInput, SectionHeader, ListCard, BottomSheet,
  LoadingSpinner, loadingOverlayStyle,
} from '../primitives';
import { BANK_LIST, generateQRUrl } from '../lib/vietqr.js';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'declined', label: 'Từ chối' },
];

function filterChipStyle(isActive, variant) {
  const green = variant === 'mine';
  return {
    flexShrink: 0,
    padding: '7px 14px',
    borderRadius: 999,
    border: `1.5px solid ${isActive ? (green ? 'rgba(52,211,153,0.55)' : 'rgba(99,102,241,0.55)') : 'rgba(255,255,255,0.1)'}`,
    background: isActive ? (green ? 'rgba(52,211,153,0.16)' : 'rgba(99,102,241,0.14)') : 'rgba(255,255,255,0.04)',
    color: isActive ? (green ? '#6ee7b7' : '#a5b4fc') : colors.textSecondary,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

export default function Home({ data, isTreasurer, paymentOpen = false, onPaymentClose, onAction }) {
  const d = data || DEMO;
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(true);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentRecordDetail, setPaymentRecordDetail] = useState(null);
  const [confirmedRefunds, setConfirmedRefunds] = useState(() => new Set());
  const [savingAction, setSavingAction] = useState('');
  const isNeg = d.totalBalance < 0;
  const balanceLabel = isNeg && Number(d.paymentSummary?.paidAmount || 0) > 0 ? 'Cần nộp thêm' : isNeg ? 'Bạn cần nộp quỹ' : d.totalBalance > 0 ? 'Quỹ cần bù bạn' : 'Đã cân bằng';
  const normalizedFilter = filterText.trim().toLowerCase();
  const pendingExpenses = d.pendingExpenses || [];
  const pendingPayments = d.pendingPayments || [];
  const visibleTransactions = d.transactions.filter(tx => {
    const textMatches = !normalizedFilter || String(tx.title || '').toLowerCase().includes(normalizedFilter);
    const statusMatches = statusFilter === 'all' || tx.status === statusFilter;
    const mineMatches = !mineOnly || transactionBelongsToCurrentUser(tx, d.currentUserId);
    return textMatches && mineMatches && statusMatches;
  });

  return (
    <PhoneFrame>
      <Screen tabBar>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <div>
            <h1 style={{ ...type.title }}>Xin chào, {d.user.name} 👋</h1>
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
              {d.user.dateLabel}
            </div>
          </div>
          <IconButton dot={d.user.hasNotifications} onClick={() => onAction?.('notifications')}><Bell size={18} weight="fill" /></IconButton>
        </div>

        <MonthNav label={d.monthLabel} onPrev={() => onAction?.('monthPrev')} onNext={() => onAction?.('monthNext')} />

        <SourceBreakdown
          sources={d.sourceBreakdown || []}
          totalBalance={d.totalBalance}
          balanceLabel={balanceLabel}
          owedTo={d.owedTo}
          paymentStatus={d.paymentSummary?.paymentStatus}
          onOpenPayment={() => setPaymentSheetOpen(true)}
          onAction={onAction}
        />


        {d.prevMonthUnpaid && (
          <PrevMonthNotice
            label={d.prevMonthUnpaid.label}
            balance={d.prevMonthUnpaid.balance}
            onView={() => onAction?.('monthPrev')}
          />
        )}
        {null}

        <SectionHeader action="Xem tất cả →" onAction={() => onAction?.('allExpenses')}>Giao dịch gần đây</SectionHeader>
        {isTreasurer && (
          <>
            <SearchInput
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Tìm chi tiêu..."
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
              <button type="button" onClick={() => setMineOnly(value => !value)} style={filterChipStyle(mineOnly, 'mine')}>Của tôi</button>
              {STATUS_FILTERS.map(filter => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  style={filterChipStyle(statusFilter === filter.key)}
                >{filter.label}</button>
              ))}
            </div>
          </>
        )}
        <ListCard>
          {visibleTransactions.length > 0 ? visibleTransactions.map((tx, i) => (
            <ActivityRow
              key={tx.id}
              tx={tx}
              last={i === visibleTransactions.length - 1}
              isTreasurer={isTreasurer}
              onApprove={() => onAction?.('approveExpense', { expenseId: tx.id, groupId: tx.groupId })}
              onReject={() => onAction?.('rejectExpense', { expenseId: tx.id, groupId: tx.groupId })}
              onView={() => onAction?.('viewExpense', { expenseId: tx.id })}
            />
          )) : (
            <div style={{ padding: '14px 0', fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Không tìm thấy chi tiêu
            </div>
          )}
        </ListCard>
      </Screen>

      <PaymentSheet
        open={paymentOpen || paymentSheetOpen}
        data={d.paymentSummary || { netBalance: d.totalBalance, monthLabel: d.monthLabel }}
        paymentRecords={d.paymentRecords || []}
        isTreasurer={isTreasurer}
        confirmedRefunds={confirmedRefunds}
        savingAction={savingAction}
        setSavingAction={setSavingAction}
        onAction={onAction}
        onViewPaymentRecord={setPaymentRecordDetail}
        onConfirmPayment={(payload) => onAction?.('confirmPaymentSent', payload)}
        onConfirmRefund={(row) => {
          const key = String(row.profileId || row.name || 'member');
          setConfirmedRefunds(prev => new Set([...prev, key]));
          onAction?.('markRefundPaid', row);
        }}
        onClose={() => {
          setPaymentSheetOpen(false);
          onPaymentClose?.();
        }}
      />

      <PaymentRecordDetailSheet
        record={paymentRecordDetail}
        onClose={() => setPaymentRecordDetail(null)}
      />

      <TabBar active="home" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
      {savingAction && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
        </div>
      )}
    </PhoneFrame>
  );
}

function PaymentManagementZone({ records, onAction, onViewRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const rows = safeArray(records);
  if (!rows.length) return null;
  const totalAmount = rows.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  return (
    <section style={{ marginTop: 12 }}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 12px',
          borderRadius: 14,
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(129,140,248,0.26)',
          color: 'inherit',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: 'rgba(99,102,241,0.18)',
          border: '1px solid rgba(129,140,248,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>💳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: colors.brandLight, textTransform: 'uppercase' }}>
            Quản lý thanh toán · {rows.length}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Xem lại hoặc xóa báo thanh toán của member
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: colors.brandLight, ...type.mono }}>{formatVND(totalAmount)}</div>
          <div style={{ fontSize: 18, color: colors.brandLight, lineHeight: 1 }}>{expanded ? '⌃' : '⌄'}</div>
        </div>
      </button>
      {expanded && (
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {rows.map(record => {
            const confirming = String(confirmDeleteId) === String(record.id);
            return (
            <div key={record.id} style={{
              padding: 10,
              borderRadius: 12,
              background: confirming ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.035)',
              border: `1px solid ${confirming ? 'rgba(248,113,113,0.24)' : 'rgba(129,140,248,0.18)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.memberName}</div>
                    <span style={paymentRecordStatusStyle(record.status)}>{paymentRecordStatusLabel(record.status)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                    {record.monthLabel || 'Tháng này'} · {record.sourceSummary || 'Nguồn tiền'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#fca5a5', marginTop: 6, ...type.mono }}>{formatVND(record.amount)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, width: 66, flexShrink: 0 }}>
                  <button type="button" onClick={() => { onViewRecord?.(record); onAction?.('viewPaymentNotice', record); }} style={paymentRecordButton('rgba(99,102,241,0.20)', colors.brandLight)}>Xem</button>
                  <button type="button" onClick={() => setConfirmDeleteId(record.id)} style={paymentRecordButton('rgba(248,113,113,0.16)', '#fca5a5')}>Xóa</button>
                </div>
              </div>
              {confirming && (
                <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid rgba(248,113,113,0.18)' }}>
                  <div style={{ fontSize: 11, color: '#fecaca', lineHeight: 1.4, fontWeight: 700 }}>
                    Xóa báo thanh toán này? Số dư của member sẽ tính lại như chưa thanh toán.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => setConfirmDeleteId('')} style={paymentRecordButton('rgba(255,255,255,0.07)', colors.textSecondary)}>Hủy</button>
                    <button type="button" onClick={() => { setConfirmDeleteId(''); onAction?.('deletePaymentNotice', record); }} style={paymentRecordButton('#ef4444', '#fff')}>Xóa</button>
                  </div>
                </div>
              )}
            </div>
          );})}
        </div>
      )}
    </section>
  );
}

function paymentRecordButton(background, color) {
  return {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '8px 6px',
    background,
    color,
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function paymentRecordStatusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'confirmed') return 'Đã nhận';
  if (value === 'rejected') return 'Chưa nhận';
  return 'Chờ duyệt';
}

function paymentRecordStatusStyle(status) {
  const value = String(status || '').toLowerCase();
  const isConfirmed = value === 'confirmed';
  const isRejected = value === 'rejected';
  return {
    flexShrink: 0,
    padding: '3px 6px',
    borderRadius: 999,
    background: isConfirmed ? 'rgba(52,211,153,0.16)' : isRejected ? 'rgba(248,113,113,0.14)' : 'rgba(245,158,11,0.14)',
    color: isConfirmed ? '#6ee7b7' : isRejected ? '#fca5a5' : '#fcd34d',
    fontSize: 9,
    fontWeight: 900,
    textTransform: 'uppercase',
  };
}

function PaymentRecordDetailSheet({ record, onClose }) {
  if (!record) return null;
  const sources = safeArray(record.coveredSources);
  return (
    <BottomSheet title="Chi tiết thanh toán" onClose={onClose}>
      <Card style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase' }}>Người báo thanh toán</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: colors.textPrimary, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.memberName}</div>
          </div>
          <span style={paymentRecordStatusStyle(record.status)}>{paymentRecordStatusLabel(record.status)}</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 950, color: '#fca5a5', marginTop: 12, ...type.mono }}>{formatVND(record.amount)}</div>
        {record.transferDescription && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase' }}>Nội dung CK</div>
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 750, marginTop: 4, lineHeight: 1.4 }}>{record.transferDescription}</div>
          </div>
        )}
      </Card>
      <SectionLabel>Nguồn đã thanh toán</SectionLabel>
      <div style={{ display: 'grid', gap: 8 }}>
        {sources.length > 0 ? sources.map((source, index) => (
          <Card key={`${source.sourceId || source.source_id || source.sourceLabel}-${index}`} style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.sourceLabel || source.source_label || 'Nguồn tiền'}</div>
              {(source.memberName || source.member_name) && (
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                  {source.memberName || source.member_name}
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 950, color: '#fca5a5', ...type.mono }}>{formatVND(Math.abs(Number(source.amount) || 0))}</div>
          </Card>
        )) : (
          <Card style={{ padding: 12, fontSize: 12, color: colors.textSecondary }}>Chưa có danh sách nguồn chi tiết.</Card>
        )}
      </div>
    </BottomSheet>
  );
}

function PendingApprovalZone({ expenses, payments, savingAction, setSavingAction, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const items = [
    ...safeArray(expenses).map(expense => ({ ...expense, type: 'expense' })),
    ...safeArray(payments).map(payment => ({ ...payment, type: 'payment' })),
  ];
  async function handleApproval(action, payload) {
    if (savingAction) return;
    setSavingAction(action);
    try {
      await onAction?.(action, payload);
    } finally {
      setSavingAction('');
    }
  }

  if (!items.length) return null;
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return (
    <section style={{ marginTop: 14, position: 'relative' }}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 12px',
          borderRadius: 14,
          background: 'rgba(245,158,11,0.10)',
          border: '1px solid rgba(245,158,11,0.28)',
          color: 'inherit',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          boxShadow: '0 10px 24px rgba(245,158,11,0.08)',
        }}
      >
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: 'rgba(245,158,11,0.18)',
          border: '1px solid rgba(245,158,11,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>⏳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#fcd34d', textTransform: 'uppercase' }}>
            Cần duyệt · {items.length} việc
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Bấm để xem danh sách giao dịch đang chờ
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#fcd34d', ...type.mono }}>{formatVND(totalAmount)}</div>
          <div style={{ fontSize: 18, color: '#fcd34d', lineHeight: 1 }}>{expanded ? '⌃' : '⌄'}</div>
        </div>
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {items.map(item => (
            <div key={`${item.type}:${item.id}`} style={{
              padding: 10,
              borderRadius: 12,
              background: item.type === 'payment' ? 'rgba(52,211,153,0.055)' : 'rgba(255,255,255,0.035)',
              border: `1px solid ${item.type === 'payment' ? 'rgba(52,211,153,0.22)' : 'rgba(245,158,11,0.18)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                    {item.type === 'payment'
                      ? `${item.groupName} · báo đã chuyển`
                      : `${item.groupName} · ${item.submittedByName || 'Thành viên'} gửi`}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6, color: item.type === 'payment' ? '#6ee7b7' : '#fcd34d', ...type.mono }}>{formatVND(item.amount)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 78, flexShrink: 0 }}>
                  {item.type === 'payment' ? (
                    <>
                      <button type="button" onClick={() => handleApproval('confirmPaymentNotice', item)} disabled={savingAction === 'confirmPaymentNotice'} style={approvalButton('#22c55e', '#052e16')}>{savingAction === 'confirmPaymentNotice' ? 'Đang xử lý…' : 'Đã nhận'}</button>
                      <button type="button" onClick={() => handleApproval('rejectPaymentNotice', item)} disabled={savingAction === 'rejectPaymentNotice'} style={approvalButton(colors.danger, '#fff')}>{savingAction === 'rejectPaymentNotice' ? 'Đang xử lý…' : 'Chưa nhận'}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleApproval('approveExpense', { expenseId: item.id, groupId: item.groupId })} disabled={savingAction === 'approveExpense'} style={approvalButton('#22c55e', '#052e16')}>{savingAction === 'approveExpense' ? 'Đang xử lý…' : 'Duyệt'}</button>
                      <button type="button" onClick={() => handleApproval('rejectExpense', { expenseId: item.id, groupId: item.groupId })} disabled={savingAction === 'rejectExpense'} style={approvalButton(colors.danger, '#fff')}>{savingAction === 'rejectExpense' ? 'Đang xử lý…' : 'Từ chối'}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function approvalButton(background, color) {
  return {
    border: 'none',
    borderRadius: 10,
    padding: '8px 6px',
    background,
    color,
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function SourceBreakdown({ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, paymentStatus = '', onOpenPayment, onAction }) {
  const sourceRows = safeArray(sources);
  const hasSources = sourceRows.length > 0;
  const total = sourceRows.reduce((sum, source) => sum + (Number(source.amount) || 0), 0);
  const isNegativeTotal = totalBalance < 0;
  const isPositiveTotal = totalBalance > 0;
  const isZeroTotal = !isNegativeTotal && !isPositiveTotal;
  const normalizedPaymentStatus = String(paymentStatus || '').toLowerCase();
  const paidConfirmed = normalizedPaymentStatus === 'confirmed';
  const paymentPending = normalizedPaymentStatus === 'pending';
  const paymentChipLabel = paidConfirmed ? '✅ Đã thanh toán' : paymentPending ? '⏳ Chờ xác nhận' : isZeroTotal ? '0' : '💳 Thanh toán';
  const paymentChipBg = paidConfirmed ? 'rgba(52,211,153,0.16)' : paymentPending ? 'rgba(245,158,11,0.16)' : isZeroTotal ? 'rgba(148,163,184,0.12)' : isNegativeTotal ? 'rgba(248,113,113,0.16)' : 'rgba(52,211,153,0.16)';
  const paymentChipBorder = paidConfirmed ? 'rgba(52,211,153,0.34)' : paymentPending ? 'rgba(245,158,11,0.34)' : isZeroTotal ? 'rgba(148,163,184,0.24)' : isNegativeTotal ? 'rgba(248,113,113,0.32)' : 'rgba(52,211,153,0.32)';
  const paymentChipColor = paidConfirmed ? '#6ee7b7' : paymentPending ? '#fcd34d' : isZeroTotal ? colors.textSecondary : isNegativeTotal ? '#fca5a5' : '#6ee7b7';
  const paymentDisabled = isZeroTotal || paidConfirmed || paymentPending;
  const displayBalanceLabel = paidConfirmed ? 'Đã thanh toán' : isZeroTotal ? 'Số dư tháng này' : balanceLabel;
  return (
    <>
      <SectionLabel>Theo nguồn tiền</SectionLabel>
      <Card style={{ padding: hasSources ? '14px 14px 6px' : 14 }}>
        <button
          type="button"
          aria-label={isNegativeTotal ? `Xem ${owedTo} quỹ cần kiểm tra` : 'Xem nguồn tiền'}
          onPointerUp={(event) => { event.stopPropagation(); if (!paymentDisabled) onOpenPayment?.(); }}
          onClick={(event) => { event.stopPropagation(); if (!paymentDisabled) onOpenPayment?.(); }}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            padding: hasSources ? '0 0 12px' : 0,
            marginBottom: hasSources ? 8 : 0,
            border: 'none',
            borderBottom: hasSources ? '1px solid rgba(255,255,255,0.08)' : 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: paymentDisabled ? 'default' : 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            minHeight: 62,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 850,
                color: isNegativeTotal ? '#fca5a5' : isPositiveTotal ? '#6ee7b7' : colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '1.4px',
              }}>
                {displayBalanceLabel}
              </div>
              <div style={{
                fontSize: 26,
                fontWeight: 900,
                marginTop: 5,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                ...type.mono,
              }}>
                {formatVND(Math.abs(totalBalance))}
              </div>
            </div>
            <div style={{
              padding: '8px 13px',
              borderRadius: 100,
              background: paymentChipBg,
              border: `1px solid ${paymentChipBorder}`,
              color: paymentChipColor,
              fontSize: 12,
              fontWeight: 900,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {paymentChipLabel}
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: -2 }}>
            Tổng hợp tất cả nguồn tiền tháng này
          </div>
        </button>
        {sourceRows.map((source, index) => {
          const amount = Number(source.amount) || 0;
          const isPickleball = source.sourceType === 'pickleball';
          const isNegative = amount < 0;
          const openSource = () => {
            if (isPickleball) {
              onAction?.('tab', 'pickleball');
              return;
            }
            onAction?.('open', source.sourceId);
          };
          return (
            <button
              key={`${source.sourceType}-${source.sourceId || source.sourceLabel}-${index}`}
              type="button"
              aria-label={`Mở ${source.sourceLabel}`}
              onClick={openSource}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 10px',
                marginTop: index === 0 ? 0 : 4,
                background: isPickleball ? 'rgba(52,211,153,0.10)' : 'transparent',
                border: isPickleball ? '1px solid rgba(52,211,153,0.26)' : '1px solid transparent',
                borderRadius: 12,
                borderBottom: isPickleball ? '1px solid rgba(52,211,153,0.26)' : index === sources.length - 1 ? '1px solid transparent' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isPickleball ? '0 10px 24px rgba(16,185,129,0.10)' : 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isPickleball ? 'rgba(52,211,153,0.18)' : 'rgba(99,102,241,0.12)',
                border: isPickleball ? '1px solid rgba(52,211,153,0.34)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}>{isPickleball ? '🏸' : '👥'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {source.sourceLabel}
                </div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {isPickleball ? 'Pickleball' : 'Chi tiêu nhóm'}
                </div>
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 800,
                color: isNegative ? colors.danger : colors.success,
                ...type.mono,
              }}>{isNegative ? '' : '+'}{formatVND(amount)}</div>
              <div style={{ color: isPickleball ? '#6ee7b7' : colors.textMuted, fontSize: 18, flexShrink: 0 }}>›</div>
            </button>
          );
        })}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 10,
          marginTop: 2,
          fontSize: 12,
          fontWeight: 800,
        }}>
          <span style={{ color: colors.textSecondary }}>Tổng tháng này</span>
          <span style={{ color: total < 0 ? colors.danger : colors.success, ...type.mono }}>{total < 0 ? '' : '+'}{formatVND(total)}</span>
        </div>
      </Card>
    </>
  );
}

function PaymentSheet({ open, data, paymentRecords = [], isTreasurer, confirmedRefunds, savingAction, setSavingAction, onAction, onViewPaymentRecord, onConfirmPayment, onConfirmRefund, onClose }) {
  const [copiedField, setCopiedField] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [selectedPayForIds, setSelectedPayForIds] = useState(() => new Set());
  const [payForExpanded, setPayForExpanded] = useState(false);
  if (!open) return null;
  const netBalance = Number(data?.netBalance) || 0;
  const target = data?.paymentTarget || {};
  const qrBank = resolveVietQrBank(target);
  const payForRows = safeArray(data?.payForRows);
  const selectedPayForRows = payForRows.filter(row => selectedPayForIds.has(String(row.profileId || row.name)));
  const debtSources = safeArray(data?.sourceBreakdown).filter(source => Number(source.amount) < 0);
  const coveredSources = [
    ...debtSources.map(source => ({ ...source, memberName: data?.memberName || 'Thành viên' })),
    ...selectedPayForRows.flatMap(row => safeArray(row.sources).filter(source => Number(source.amount) < 0).map(source => ({ ...source, profileId: row.profileId, memberName: row.name }))),
  ];
  const amountToPay = Math.max(0, Math.abs(netBalance)) + selectedPayForRows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  const canShowQr = netBalance < 0 && qrBank && target.account && target.holder;
  const memberBank = data?.memberBank || {};
  const memberBankReady = Boolean(resolveVietQrBank(memberBank) && memberBank.account && memberBank.holder);
  const needsBankSetup = netBalance > 0 && !memberBankReady;
  const paymentNames = [data?.memberName || 'Thanh vien', ...selectedPayForRows.map(row => row.name)].filter(Boolean);
  const payForSummary = selectedPayForRows.length
    ? `${selectedPayForRows.length} người · ${formatVND(selectedPayForRows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0))}`
    : 'Chưa chọn ai';
  const transferDescription = `${paymentNames.join(', ')} - Thanh toan ${data?.monthLabel || ''}`.trim();
  const refundRows = safeArray(data?.refundRows);
  const pendingPaymentRecords = safeArray(paymentRecords).filter(record => String(record.status || 'pending').toLowerCase() === 'pending');
  const qrUrl = canShowQr ? generateQRUrl({
    bankId: qrBank.id,
    account: target.account,
    accountName: target.holder,
    amount: amountToPay,
    description: transferDescription,
  }) : '';
  const copyPaymentField = async (field, value) => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(String(value || ''));
    setCopiedField(field);
  };
  const confirmPayment = async () => {
    if (savingAction || paymentConfirmed) return;
    setSavingAction('confirmPayment');
    try {
      await onConfirmPayment?.({
        amount: amountToPay,
        memberName: data?.memberName || 'Thành viên',
        coveredMembers: selectedPayForRows,
        coveredSources,
        transferDescription,
        paymentTarget: target,
      });
      setPaymentConfirmed(true);
    } finally {
      setSavingAction('');
    }
  };
  const togglePayFor = (row) => {
    const key = String(row.profileId || row.name);
    setSelectedPayForIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setCopiedField('');
    setPaymentConfirmed(false);
  };

  return (
    <BottomSheet title="Thanh toán" onClose={onClose}>
      {isTreasurer && (
        <>
          <TreasurerPaymentDashboard
            data={data}
            progressRows={data?.paymentProgress || []}
            paymentRecords={paymentRecords}
            pendingRecords={pendingPaymentRecords}
            refundRows={refundRows}
            confirmedRefunds={confirmedRefunds}
            onAction={onAction}
            onViewPaymentRecord={onViewPaymentRecord}
            onConfirmRefund={onConfirmRefund}
          />
          <PaymentManagementZone records={paymentRecords} onAction={onAction} onViewRecord={onViewPaymentRecord} />
        </>
      )}

      {!isTreasurer && netBalance < 0 && (
        <Card style={{ padding: 14, borderColor: canShowQr ? 'rgba(52,211,153,0.28)' : 'rgba(251,191,36,0.28)' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Thanh toán về thủ quỹ
          </div>
          <div style={{ fontSize: 28, fontWeight: 950, color: '#fca5a5', marginTop: 6, ...type.mono }}>
            {formatVND(amountToPay)}
          </div>
          {canShowQr && (
            <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
              <div style={{
                display: 'grid',
                gap: 7,
                padding: '9px 10px',
                borderRadius: 11,
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.08)',
                minWidth: 0,
              }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase' }}>Thông tin chủ tài khoản</span>
                <div style={{ display: 'grid', gap: 5 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase' }}>Người nhận</span>
                    <span style={{ minWidth: 0, color: colors.textSecondary, fontSize: 11, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.holder || 'Long'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase' }}>Ngân hàng</span>
                    <span style={{ minWidth: 0, color: colors.textSecondary, fontSize: 11, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.name || target.code || 'Ngân hàng'}</span>
                  </div>
                </div>
              </div>
              {[
                ['amount', 'Số tiền', formatVND(amountToPay)],
                ['account', 'STK', target.account],
                ['description', 'Nội dung', transferDescription],
              ].filter(([, , value]) => value).map(([field, label, value]) => (
                <div key={field} style={{
                  display: 'grid',
                  gridTemplateColumns: '74px 1fr auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 9px',
                  borderRadius: 11,
                  background: 'rgba(255,255,255,0.045)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ minWidth: 0, color: colors.textSecondary, fontSize: 11, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  <button type="button" onClick={() => copyPaymentField(field, value)} style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '5px 7px',
                    background: copiedField === field ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.07)',
                    color: copiedField === field ? colors.brandLight : colors.textSecondary,
                    fontSize: 10,
                    fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>{copiedField === field ? 'Đã copy' : 'Copy'}</button>
                </div>
              ))}
            </div>
          )}
          {canShowQr && payForRows.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                aria-expanded={payForExpanded}
                onClick={() => setPayForExpanded(value => !value)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 11px',
                  borderRadius: 13,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: selectedPayForRows.length ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.045)',
                  color: colors.textPrimary,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>👥</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>Thanh toán hộ người khác</span>
                  <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{payForSummary}</span>
                </span>
                <span style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 1 }}>{payForExpanded ? '⌃' : '⌄'}</span>
              </button>
              {payForExpanded && (
                <div style={{ display: 'grid', gap: 7, marginTop: 8, maxHeight: 228, overflowY: 'auto', paddingRight: 2 }}>
                  {payForRows.map(row => {
                    const key = String(row.profileId || row.name);
                    const active = selectedPayForIds.has(key);
                    return (
                      <button key={key} type="button" onClick={() => togglePayFor(row)} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: 12,
                        border: `1px solid ${active ? 'rgba(52,211,153,0.38)' : 'rgba(255,255,255,0.10)'}`,
                        background: active ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
                        color: colors.textPrimary,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}>
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          border: `1px solid ${active ? '#6ee7b7' : 'rgba(255,255,255,0.22)'}`,
                          background: active ? 'rgba(52,211,153,0.24)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6ee7b7',
                          fontSize: 12,
                          fontWeight: 900,
                          flexShrink: 0,
                        }}>{active ? '✓' : ''}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                        <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 900, ...type.mono }}>{formatVND(Math.abs(Number(row.amount) || 0))}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {canShowQr ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                <img src={qrUrl} alt="QR thanh toán thủ quỹ" style={{ width: 210, height: 210, borderRadius: 16, background: '#fff', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <a
                  href={qrUrl}
                  download="vietqr-thanh-toan.png"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 42,
                    borderRadius: 12,
                    background: 'rgba(59,130,246,0.18)',
                    border: '1px solid rgba(96,165,250,0.42)',
                    color: '#93c5fd',
                    fontSize: 12,
                    fontWeight: 900,
                    textDecoration: 'none',
                  }}
                >Lưu QR</a>
                <button type="button" onClick={confirmPayment} disabled={savingAction === 'confirmPayment' || paymentConfirmed} style={{
                  minHeight: 42,
                  borderRadius: 12,
                  background: paymentConfirmed ? 'rgba(16,185,129,0.20)' : '#10b981',
                  border: `1px solid ${paymentConfirmed ? 'rgba(110,231,183,0.42)' : 'rgba(16,185,129,0.62)'}`,
                  color: paymentConfirmed ? '#6ee7b7' : '#052e16',
                  fontSize: 12,
                  fontWeight: 900,
                  fontFamily: 'inherit',
                  cursor: savingAction === 'confirmPayment' || paymentConfirmed ? 'default' : 'pointer',
                  opacity: savingAction === 'confirmPayment' ? 0.72 : 1,
                }}>{savingAction === 'confirmPayment' ? 'Đang xử lý…' : paymentConfirmed ? 'Đã báo thanh toán' : 'Xác nhận đã thanh toán'}</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.45, fontWeight: 700, marginTop: 10 }}>
              Chưa có đủ thông tin ngân hàng của thủ quỹ. Nhờ Long cập nhật STK trong tab cá nhân.
            </div>
          )}
        </Card>
      )}

      {!isTreasurer && netBalance >= 0 && (
        <Card style={{ padding: 14, borderColor: 'rgba(52,211,153,0.25)' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Chờ thủ quỹ hoàn tiền
          </div>
          <div style={{ fontSize: 24, fontWeight: 950, color: '#6ee7b7', marginTop: 6, ...type.mono }}>
            {formatVND(Math.max(0, netBalance))}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 5, lineHeight: 1.45 }}>
            Bạn đang dư tiền trong tháng này. Long sẽ xem danh sách cần hoàn ở giao diện thủ quỹ và chuyển khoản ngược lại.
          </div>
          {needsBankSetup && (
            <button type="button" onClick={() => { onClose?.(); onAction?.('tab', 'profile'); }} style={{
              width: '100%',
              marginTop: 12,
              minHeight: 42,
              borderRadius: 12,
              border: '1px solid rgba(52,211,153,0.38)',
              background: 'rgba(52,211,153,0.14)',
              color: '#6ee7b7',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}>Cập nhật STK nhận tiền</button>
          )}
        </Card>
      )}

    </BottomSheet>
  );
}

function TreasurerPaymentDashboard({ data, progressRows, pendingRecords, refundRows, confirmedRefunds, onAction, onViewPaymentRecord, onConfirmRefund }) {
  const [unpaidExpanded, setUnpaidExpanded] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [refundExpanded, setRefundExpanded] = useState(false);
  const [selectedRefundKey, setSelectedRefundKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareMember, setShareMember] = useState(null);
  const rows = safeArray(progressRows);
  const pending = safeArray(pendingRecords);
  const refunds = safeArray(refundRows);
  const confirmedRows = rows.filter(row => String(row.status || '').toLowerCase() === 'confirmed');
  const pendingRowsRaw = rows.filter(row => String(row.status || '').toLowerCase() === 'pending');
  const unpaidRowsRaw = rows.filter(row => String(row.status || '').toLowerCase() === 'unpaid');
  const matchSearch = makeMatcher(searchQuery);
  const pendingRecordsFiltered = pending.filter(record => matchSearch(record.memberName || record.name));
  const pendingRows = pendingRowsRaw.filter(row => matchSearch(row.name || row.memberName));
  const unpaidRows = unpaidRowsRaw.filter(row => matchSearch(row.name || row.memberName));
  const refundsFiltered = refunds.filter(row => matchSearch(row.name || row.memberName));
  const selectedRefund = refundsFiltered.find(row => String(row.profileId || row.name || 'member') === selectedRefundKey) || null;
  const refundBank = selectedRefund?.bank || {};
  const refundQrBank = resolveVietQrBank(refundBank);
  const refundAmount = Math.max(0, Number(selectedRefund?.amount) || 0);
  const refundDescription = selectedRefund ? `Hoan tien ${selectedRefund.name || 'thanh vien'} ${data?.monthLabel || ''}`.trim() : '';
  const refundQrUrl = selectedRefund && refundQrBank && refundBank.account && refundBank.holder ? generateQRUrl({
    bankId: refundQrBank.id,
    account: refundBank.account,
    accountName: refundBank.holder,
    amount: refundAmount,
    description: refundDescription,
  }) : '';
  const totalNeedCollect = [...pendingRowsRaw, ...unpaidRowsRaw].reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  const totalRefund = refunds.reduce((sum, row) => sum + Math.max(0, Number(row.amount) || 0), 0);
  const isSearching = Boolean(searchQuery.trim());

  return (
    <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      <Card style={{ padding: 14, borderColor: 'rgba(59,130,246,0.24)', background: 'rgba(59,130,246,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>Tiến độ thu</div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#93c5fd', flexShrink: 0 }}>{rows.length} member</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 950, color: '#f8fafc', marginTop: 4, ...type.mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatVND(totalNeedCollect)}</div>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Còn theo dõi · {data?.monthLabel || 'tháng này'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 6, marginTop: 10 }}>
          <ProgressStat label="Đã nhận" count={confirmedRows.length} color="#6ee7b7" />
          <ProgressStat label="Chờ duyệt" count={pendingRowsRaw.length || pending.length} color="#fcd34d" />
          <ProgressStat label="Chưa thu" count={unpaidRowsRaw.length} color="#fca5a5" />
        </div>
      </Card>

      <SearchInput
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Tìm thành viên trong danh sách"
      />

      {pending.length > 0 && (
        <DashboardSection
          title={`Chờ duyệt · ${pendingRecordsFiltered.length}${isSearching ? `/${pending.length}` : ''}`}
          subtitle="Member đã bấm xác nhận thanh toán"
          amount={pendingRecordsFiltered.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)}
          icon="⏳"
          color="#fcd34d"
          expanded={pendingExpanded}
          onToggle={() => setPendingExpanded(value => !value)}
          listScroll
        >
          {pendingRecordsFiltered.length > 0 ? pendingRecordsFiltered.map(record => (
            <PaymentDashboardRow
              key={record.id}
              row={record}
              tone="pending"
              onSelect={() => setShareMember({
                name: record.memberName || record.name,
                memberId: record.memberId || record.member_id,
                groupId: record.groupId || record.group_id || data?.currentGroupId || '',
              })}
            >
              <button type="button" onClick={() => { onViewPaymentRecord?.(record); onAction?.('viewPaymentNotice', record); }} style={miniDashButton('rgba(99,102,241,0.18)', colors.brandLight)}>Xem</button>
              <button type="button" onClick={() => onAction?.('confirmPaymentNotice', record)} style={miniDashButton('#22c55e', '#052e16')}>Đã nhận</button>
              <button type="button" onClick={() => onAction?.('rejectPaymentNotice', record)} style={miniDashButton(colors.danger, '#fff')}>Chưa nhận</button>
            </PaymentDashboardRow>
          )) : (
            <div style={{ padding: 10, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Không có member khớp tìm kiếm.</div>
          )}
        </DashboardSection>
      )}

      <DashboardSection
        title={`Còn chưa thanh toán · ${unpaidRows.length}${isSearching ? `/${unpaidRowsRaw.length}` : ''}`}
        subtitle="Các member còn âm tiền sau khi trừ khoản đã nhận"
        amount={unpaidRows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0)}
        icon="⌁"
        color="#fca5a5"
        expanded={unpaidExpanded}
        onToggle={() => setUnpaidExpanded(value => !value)}
        listScroll
      >
        {unpaidRows.length > 0 ? unpaidRows.map(row => (
          <PaymentDashboardRow
            key={row.profileId || row.name}
            row={row}
            tone="unpaid"
            onSelect={() => setShareMember({
              name: row.name || row.memberName,
              memberId: row.linkMemberId || row.memberId || safeArray(row.memberIds)[0] || '',
              groupId: row.linkGroupId || row.groupId || data?.currentGroupId || '',
            })}
          />
        )) : (
          <div style={{ padding: 10, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{isSearching ? 'Không có member khớp tìm kiếm.' : 'Không còn ai cần nộp.'}</div>
        )}
      </DashboardSection>

      {refunds.length > 0 && (
        <DashboardSection
          title={`Cần hoàn tiền · ${refundsFiltered.length}${isSearching ? `/${refunds.length}` : ''}`}
          subtitle="Chọn member để mở QR chuyển ngược lại"
          amount={totalRefund}
          icon="↩"
          color="#6ee7b7"
          expanded={refundExpanded}
          onToggle={() => setRefundExpanded(value => !value)}
        >
          {refundsFiltered.length > 0 ? refundsFiltered.map(row => {
            const key = String(row.profileId || row.name || 'member');
            const selected = String(selectedRefund?.profileId || selectedRefund?.name || '') === key;
            const done = confirmedRefunds?.has?.(key);
            return (
              <React.Fragment key={key}>
                <button type="button" onClick={() => setSelectedRefundKey(selected ? '' : key)} style={{ width: '100%', border: 'none', background: 'transparent', color: 'inherit', fontFamily: 'inherit', padding: 0, cursor: 'pointer' }}>
                  <PaymentDashboardRow row={{ ...row, amount: row.amount, sourceSummary: row.bank?.account ? `${row.bank?.name || 'Ngân hàng'} · ${row.bank.account}` : 'Chưa có STK nhận tiền' }} tone="refund" arrow={selected ? '⌃' : '›'} />
                </button>
                {selected && selectedRefund && (
                  <Card style={{ padding: 12, borderColor: 'rgba(110,231,183,0.26)', background: 'rgba(52,211,153,0.07)' }}>
                    {refundQrUrl ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <img src={refundQrUrl} alt={`QR nhận tiền của ${selectedRefund.name}`} style={{ width: 150, height: 150, borderRadius: 14, background: '#fff', padding: 6 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 11 }}>
                          <a href={refundQrUrl} download={`hoan-tien-${selectedRefund.name || 'member'}.png`} style={dashLinkButton('rgba(99,102,241,0.16)', '#c4b5fd')}>Lưu QR</a>
                          <button type="button" onClick={() => onConfirmRefund?.(selectedRefund)} disabled={done} style={miniDashButton(done ? 'rgba(16,185,129,0.20)' : '#10b981', done ? '#6ee7b7' : '#052e16')}>{done ? 'Đã chuyển' : 'Xác nhận đã chuyển'}</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#fde68a', fontWeight: 750, lineHeight: 1.45 }}>Member này chưa có đủ thông tin ngân hàng để tạo QR nhận tiền.</div>
                    )}
                  </Card>
                )}
              </React.Fragment>
            );
          }) : (
            <div style={{ padding: 10, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Không có member khớp tìm kiếm.</div>
          )}
        </DashboardSection>
      )}

      {shareMember && (
        <MemberShareLinkSheet
          member={shareMember}
          monthLabel={data?.monthLabel}
          onAction={onAction}
          onClose={() => setShareMember(null)}
        />
      )}
    </div>
  );
}

function MemberShareLinkSheet({ member, monthLabel, onAction, onClose }) {
  const [status, setStatus] = useState('loading');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setLink('');
    setCopied(false);
    (async () => {
      if (!member?.groupId || !member?.memberId) {
        if (alive) setStatus('error');
        return;
      }
      const url = await onAction?.('createMemberBillShare', { groupId: member.groupId, memberId: member.memberId, copy: false });
      if (!alive) return;
      if (url) {
        setLink(url);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    })();
    return () => { alive = false; };
  }, [member?.groupId, member?.memberId]);

  const copyLink = () => {
    if (!link || !navigator?.clipboard) return;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    onAction?.('toast', 'Đã sao chép link cá nhân.');
  };

  const shareLink = async () => {
    if (!link) return;
    if (navigator?.share) {
      try {
        await navigator.share({ title: `Bảng tiền của ${member.name}`, text: `${member.name} xem số tiền cần thanh toán ${monthLabel || ''}`.trim(), url: link });
        return;
      } catch { /* user cancelled */ }
    }
    copyLink();
  };

  return (
    <BottomSheet title={`Link cá nhân · ${member.name}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
        Gửi link này cho {member.name} để họ tự mở trang chủ và xem số tiền cần thanh toán {monthLabel ? `· ${monthLabel}` : ''}.
      </div>
      <div style={{
        marginTop: 12,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 12,
        background: colors.inputBg,
        border: `1px solid ${colors.borderSubtle}`,
        color: status === 'ready' ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {status === 'loading' ? 'Đang tạo link...' : status === 'error' ? 'Không tạo được link. Thử lại sau.' : link}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={copyLink} disabled={status !== 'ready'} style={miniDashButton(status === 'ready' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)', status === 'ready' ? colors.brandLight : colors.textMuted)}>{copied ? 'Đã sao chép' : 'Sao chép link'}</button>
        <button type="button" onClick={shareLink} disabled={status !== 'ready'} style={miniDashButton(status === 'ready' ? '#10b981' : 'rgba(255,255,255,0.06)', status === 'ready' ? '#052e16' : colors.textMuted)}>Chia sẻ</button>
      </div>
    </BottomSheet>
  );
}

function ProgressStat({ label, count, color }) {
  return (
    <div style={{ minWidth: 0, padding: '8px 6px', borderRadius: 12, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 950, color, ...type.mono }}>{count}</div>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
    </div>
  );
}

function DashboardSection({ title, subtitle, amount, icon, color, expanded, onToggle, listScroll = false, children }) {
  return (
    <section style={{ minWidth: 0 }}>
      <button type="button" aria-expanded={expanded} onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33`, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 12, fontWeight: 900, color, marginTop: 2, ...type.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatVND(amount)}</div>
        </div>
        <div style={{ fontSize: 18, color, lineHeight: 1, flexShrink: 0 }}>{expanded ? '⌃' : '⌄'}</div>
      </button>
      {expanded && (
        <div
          className={listScroll ? 'screen-scroll' : undefined}
          style={{ display: 'grid', gap: 8, marginTop: 8, minWidth: 0, ...(listScroll ? { maxHeight: 320, overflowY: 'auto', paddingRight: 2 } : {}) }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

function PaymentDashboardRow({ row, tone = 'unpaid', arrow = '', onSelect, children }) {
  const color = tone === 'refund' ? '#6ee7b7' : tone === 'pending' ? '#fcd34d' : '#fca5a5';
  const childArray = React.Children.toArray(children);
  return (
    <Card
      style={{
        padding: 10,
        display: 'grid',
        gap: 8,
        background: 'rgba(255,255,255,0.035)',
        minWidth: 0,
        cursor: onSelect ? 'pointer' : 'default',
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      } : undefined}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.memberName || row.name}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.sourceSummary || row.monthLabel || 'Nguồn tiền'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 950, color, ...type.mono, whiteSpace: 'nowrap' }}>{formatVND(Math.abs(Number(row.amount) || 0))}</div>
          {!childArray.length && <div style={{ color: colors.textMuted, fontSize: 17 }}>{arrow}</div>}
        </div>
      </div>
      {childArray.length > 0 && (
        <div
          style={{ display: 'grid', gridTemplateColumns: `repeat(${childArray.length}, minmax(0,1fr))`, gap: 6 }}
          onClick={event => event.stopPropagation()}
        >
          {childArray}
        </div>
      )}
    </Card>
  );
}

function miniDashButton(background, color) {
  return { border: 'none', borderRadius: 9, padding: '7px 7px', background, color, fontSize: 10, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };
}

function dashLinkButton(background, color) {
  return { minHeight: 38, borderRadius: 11, background, border: '1px solid rgba(129,140,248,0.35)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, textDecoration: 'none' };
}

function resolveVietQrBank(bank = {}) {
  const raw = String(bank.code || bank.name || '').trim().toLowerCase();
  if (!raw || raw === '--') return null;
  return BANK_LIST.find(item => (
    item.id.toLowerCase() === raw ||
    item.shortName.toLowerCase() === raw ||
    item.name.toLowerCase() === raw
  )) || { id: bank.code || bank.name, shortName: bank.name || bank.code };
}
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

function makeMatcher(query) {
  const needle = normalizeSearch(query);
  if (!needle) return () => true;
  return (value) => normalizeSearch(value).includes(needle);
}

function transactionBelongsToCurrentUser(tx, currentUserId) {
  if (tx?.isMine === true) return true;

  const memberId = tx.currentMemberId || currentUserId;
  if (!memberId) return false;
  if (String(tx?.paidBy || '') === String(memberId)) return true;

  return safeArray(tx?.participants).some(id => String(id) === String(memberId))
    || safeArray(tx?.splits).some(split => String(split.memberId || split.member_id) === String(memberId));
}

function ActivityRow({ tx, last, isTreasurer, onApprove, onReject, onView }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onView?.();
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0',
        borderBottom: last ? 'none' : `1px solid rgba(255,255,255,0.04)`,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: TX_ICON_BG[tx.category] || 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{tx.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{tx.title}</div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.subtitle} · {tx.dateLabel}
        </div>
      </div>
      {isTreasurer && tx.status === 'pending' && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onApprove?.(); }} style={{ padding: '6px 8px', borderRadius: 9, border: '1px solid rgba(52,211,153,0.45)', background: 'rgba(52,211,153,0.12)', color: '#6ee7b7', fontSize: 11, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>Duyệt</button>
          <button type="button" onClick={e => { e.stopPropagation(); onReject?.(); }} style={{ padding: '6px 8px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(248,113,113,0.12)', color: '#fca5a5', fontSize: 11, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>Từ chối</button>
        </div>
      )}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '-0.2px',
          color: tx.amount < 0 ? colors.danger : colors.success, ...type.mono,
        }}>{formatVND(tx.amount)}</div>
      </div>
      <div style={{ color: colors.textMuted, fontSize: 18, flexShrink: 0 }}>›</div>
    </div>
  );
}

const TX_ICON_BG = {
  pickleball: 'rgba(52,211,153,0.12)',
  court:      'rgba(52,211,153,0.12)',
  water:      'rgba(99,102,241,0.12)',
  groups:     'rgba(99,102,241,0.12)',
  food:       'rgba(251,191,36,0.12)',
  cafe:       'rgba(251,191,36,0.12)',
  payment:    'rgba(167,139,250,0.12)',
  general:    'rgba(255,255,255,0.06)',
};

function transactionStatus(tx) {
  const status = String(tx.status || '').toLowerCase();
  if (status === 'approved' || status === 'settled' || status === 'done' || status === 'closed') return 'approved';
  if (status === 'declined' || status === 'rejected') return 'declined';
  return 'pending';
}

function transactionCategoryGroup(tx) {
  const category = String(tx.category || '').toLowerCase();
  const title = String(tx.title || '').toLowerCase();
  if (category === 'court' || title.includes('sân') || title.includes('court')) return 'court';
  if (category === 'water' || title.includes('nước') || title.includes('water')) return 'water';
  return 'other';
}

const DEMO = {
  user: { name: 'Long Nguyễn', firstName: 'Long', dateLabel: 'Thứ Hai · 19/05/2026', hasNotifications: true },
  currentUserId: 'long',
  currentUserName: 'Long Nguyễn',
  monthLabel: 'Tháng 5 · 2026',
  totalBalance: -333333,
  owedTo: 4,
  pickleball: { sessionsAttended: 8, sessionsTotal: 13, balance: -240000 },
  groups: { count: 3, balance: -93333 },
  todaySession: { id: 9, number: 9, timeLabel: 'Hôm nay · 19:00', dateLabel: '19/05', venue: 'CLB Pickleball Cầu Giấy' },
  memberBalances: [
    { memberId: 'long', initial: 'L', name: 'Long', netBalance: -333333, owed: 333333 },
    { memberId: 'minh', initial: 'M', name: 'Minh', netBalance: -240000, owed: 240000 },
    { memberId: 'hoa', initial: 'H', name: 'Hoa', netBalance: 120000, owed: 0 },
  ],
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
};

function PrevMonthNotice({ label, balance, onView }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 12px',
      marginTop: 6,
      borderRadius: 10,
      background: 'rgba(251,191,36,0.07)',
      border: '1px solid rgba(251,191,36,0.22)',
      borderLeft: '3px solid #fbbf24',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.warning }}>
          {label} chưa trả ·
        </span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#fca5a5', marginLeft: 4, ...type.mono }}>
          {formatVND(Math.abs(balance))}
        </span>
      </div>
      <button
        type="button"
        onClick={onView}
        style={{
          flexShrink: 0,
          padding: '5px 10px',
          borderRadius: 8,
          background: 'rgba(251,191,36,0.14)',
          border: '1px solid rgba(251,191,36,0.32)',
          color: colors.warning,
          fontSize: 11,
          fontWeight: 800,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Xem →
      </button>
    </div>
  )
}
