// Spliteasy Boss — Trang chủ
// Props: data { user, monthLabel, totalBalance, owedTo, pickleball, groups, todaySession, transactions[] }

import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
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

export default function Home({ data, isTreasurer, isPickleballTreasurer = false, paymentOpen = false, onPaymentClose, onAction }) {
  const d = data || DEMO;
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(true);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentRecordDetail, setPaymentRecordDetail] = useState(null);
  const [confirmedRefunds, setConfirmedRefunds] = useState(() => new Set());
  const [savingAction, setSavingAction] = useState('');
  const memberHeroBalance = Number(d.cappedTotalBalance ?? d.totalBalance) || 0;
  const isNeg = memberHeroBalance < 0;
  const balanceLabel = isNeg && Number(d.paymentSummary?.paidAmount || 0) > 0 ? 'Cần nộp thêm' : isNeg ? 'Bạn cần nộp quỹ' : memberHeroBalance > 0 ? 'Quỹ cần bù bạn' : 'Đã cân bằng';
  const progressRowsForHero = isTreasurer ? (d.paymentSummary?.paymentProgress || []).filter(r => !d.currentProfileId || String(r.profileId || '') !== String(d.currentProfileId)) : [];
  const outstandingAmount = progressRowsForHero
    .filter(r => ['pending', 'unpaid'].includes(String(r.status || '').toLowerCase()))
    .reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
  const heroBalance = isTreasurer ? outstandingAmount : memberHeroBalance;
  const heroBalanceLabel = isTreasurer
    ? (outstandingAmount > 0 ? 'Còn cần thu' : 'Đã thu đủ')
    : balanceLabel;
  const heroSourceBreakdown = isTreasurer ? (d.sourceBreakdown || []) : (d.cappedSourceBreakdown || d.sourceBreakdown || []);
  const paymentSourceBreakdown = d.paymentSummary?.sourceBreakdown || d.sourceBreakdown || heroSourceBreakdown;
  const paymentNetBalance = Number(d.paymentSummary?.netBalance ?? d.totalBalance ?? memberHeroBalance) || 0;
  const paymentSheetData = {
    ...(d.paymentSummary || { netBalance: d.totalBalance, monthLabel: d.monthLabel }),
    ...(isTreasurer ? {} : {
      netBalance: paymentNetBalance,
      sourceBreakdown: paymentSourceBreakdown,
    }),
    yearMonth: d.yearMonth || '',
    currentProfileId: d.currentProfileId || '',
    currentGroupId: d.currentGroupId || '',
    currentUserId: d.currentUserId || '',
    pendingSettlementCheckpoint: d.pendingSettlementCheckpoint || null,
    pendingSettlementCheckpoints: d.pendingSettlementCheckpoints || [],
    pendingCheckpointsForTreasurer: d.pendingCheckpointsForTreasurer || [],
    confirmedCheckpointsForTreasurer: d.confirmedCheckpointsForTreasurer || [],
  };
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
        </div>

        <MonthNav label={d.monthLabel} onPrev={() => onAction?.('monthPrev')} onNext={() => onAction?.('monthNext')} />

        <SourceBreakdown
          sources={heroSourceBreakdown}
          totalBalance={heroBalance}
          balanceLabel={heroBalanceLabel}
          owedTo={d.owedTo}
          paymentStatus={d.paymentSummary?.paymentStatus}
          pendingSettlementCheckpoint={d.pendingSettlementCheckpoint}
          onOpenPayment={() => setPaymentSheetOpen(true)}
          onAction={onAction}
          viewedMonthKey={d.selectedYearMonth || d.yearMonth}
          onViewMonth={async (ym, source) => {
            await onAction?.('setMonth', { yearMonth: ym });
            if (source?.sourceType === 'pickleball') {
              onAction?.('push', { screen: 'pickleball-overview', params: { yearMonth: ym } });
              return;
            }
            if (source?.sourceId) {
              onAction?.('push', {
                screen: 'group-detail',
                params: {
                  groupId: source.sourceId,
                  focusMemberId: source.memberId || source.member_id || '',
                  focusProfileId: source.profileId || source.profile_id || '',
                  focusMonth: ym,
                },
              });
            }
          }}
        />


        {isPickleballTreasurer && (
          <PendingTicketsBanner
            items={d.pendingTickets?.items || []}
            count={d.pendingTickets?.count || 0}
            totalAmount={d.pendingTickets?.totalAmount || 0}
            onNavigate={() => {
              const firstItem = (d.pendingTickets?.items || [])[0]
              const date = firstItem?.date
              const yearMonth = date ? date.slice(0, 7) : undefined
              onAction?.('push', {
                screen: 'pickleball-calendar',
                params: yearMonth ? { yearMonth, selectedDate: date } : {}
              })
            }}
            onAction={onAction}
          />
        )}
        {isTreasurer && (
          <PendingApprovalZone
            expenses={pendingExpenses}
            payments={pendingPayments}
            savingAction={savingAction}
            setSavingAction={setSavingAction}
            onAction={onAction}
          />
        )}

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
          {visibleTransactions.length > 0 ? visibleTransactions.slice(0, 8).map((tx, i) => (
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
        data={paymentSheetData}
        paymentRecords={d.paymentRecords || []}
        isTreasurer={isTreasurer}
        confirmedRefunds={confirmedRefunds}
        savingAction={savingAction}
        setSavingAction={setSavingAction}
        onAction={onAction}
        onViewPaymentRecord={setPaymentRecordDetail}
        onConfirmPayment={(payload) => onAction?.(isTreasurer ? 'markMemberPaid' : 'confirmPaymentSent', payload)}
        onConfirmRefund={(row) => {
          const key = String(row.profileId || row.name || 'member');
          setConfirmedRefunds(prev => new Set([...prev, key]));
          onAction?.('markRefundPaid', row);
        }}
        onCancelRefund={(row) => {
          const key = String(row.profileId || row.name || 'member');
          setConfirmedRefunds(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
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

export function SourceBreakdown({ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, paymentStatus = '', pendingSettlementCheckpoint = null, onOpenPayment, onAction, viewedMonthKey = '', onViewMonth }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [openSourceKeys, setOpenSourceKeys] = useState(() => new Set());
  const sourceRows = safeArray(sources);
  const hasSources = sourceRows.length > 0;
  const sourceKeys = sourceRows.map((source, index) => `${source.sourceType || 'group'}:${source.sourceId || source.sourceLabel || index}`);
  const total = sourceRows.reduce((sum, source) => sum + (Number(source.amount) || 0), 0);
  const isNegativeTotal = totalBalance < 0;
  const isPositiveTotal = totalBalance > 0;
  const isZeroTotal = !isNegativeTotal && !isPositiveTotal;
  const normalizedPaymentStatus = String(paymentStatus || '').toLowerCase();
  const paidConfirmed = normalizedPaymentStatus === 'confirmed';
  const paymentPending = Boolean(pendingSettlementCheckpoint) || normalizedPaymentStatus === 'pending';
  const paymentChipLabel = paidConfirmed ? '✅ Đã thanh toán' : paymentPending ? (pendingSettlementCheckpoint ? '⏳ Chờ thủ quỹ duyệt' : '⏳ Chờ xác nhận') : isZeroTotal ? '0' : '💳 Thanh toán';
  const paymentChipBg = paidConfirmed ? 'rgba(52,211,153,0.16)' : paymentPending ? 'rgba(245,158,11,0.16)' : isZeroTotal ? 'rgba(148,163,184,0.12)' : isNegativeTotal ? 'rgba(248,113,113,0.16)' : 'rgba(52,211,153,0.16)';
  const paymentChipBorder = paidConfirmed ? 'rgba(52,211,153,0.34)' : paymentPending ? 'rgba(245,158,11,0.34)' : isZeroTotal ? 'rgba(148,163,184,0.24)' : isNegativeTotal ? 'rgba(248,113,113,0.32)' : 'rgba(52,211,153,0.32)';
  const paymentChipColor = paidConfirmed ? '#6ee7b7' : paymentPending ? '#fcd34d' : isZeroTotal ? colors.textSecondary : isNegativeTotal ? '#fca5a5' : '#6ee7b7';
  const paymentDisabled = isZeroTotal || paidConfirmed || paymentPending;
  const displayBalanceLabel = paidConfirmed ? 'Đã thanh toán' : isZeroTotal ? 'Số dư tháng này' : balanceLabel;
  const displayTotalBalance = totalBalance;
  const ctaBg = paymentDisabled ? 'rgba(148,163,184,0.16)' : isNegativeTotal ? 'rgba(248,113,113,0.20)' : 'rgba(52,211,153,0.18)';
  const ctaBorder = paymentDisabled ? 'rgba(148,163,184,0.24)' : isNegativeTotal ? 'rgba(248,113,113,0.40)' : 'rgba(52,211,153,0.38)';
  const ctaColor = paymentDisabled ? colors.textSecondary : isNegativeTotal ? '#fecaca' : '#86efac';
  const toggleSourcesOpen = () => {
    setSourcesOpen(open => {
      const nextOpen = !open;
      if (nextOpen) setOpenSourceKeys(new Set(sourceKeys));
      return nextOpen;
    });
  };
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 6px 14px' }}>
        <div style={{
          padding: '7px 12px',
          borderRadius: 999,
          background: paymentChipBg,
          border: `1px solid ${paymentChipBorder}`,
          color: paymentChipColor,
          fontSize: 12,
          fontWeight: 900,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {paymentChipLabel}
        </div>
        <div style={{
          marginTop: 12,
          fontSize: 34,
          fontWeight: 950,
          lineHeight: 1,
          color: '#f8fafc',
          whiteSpace: 'nowrap',
          ...type.mono,
        }}>
          {formatVND(Math.abs(displayTotalBalance))}
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 850,
          color: isNegativeTotal ? '#fca5a5' : isPositiveTotal ? '#6ee7b7' : colors.textSecondary,
        }}>
          {displayBalanceLabel}
        </div>
      </div>

      <button
        type="button"
        aria-label={isNegativeTotal ? `Xem ${owedTo} quỹ cần kiểm tra` : 'Xem nguồn tiền'}
        disabled={paymentDisabled}
        onPointerUp={(event) => { event.stopPropagation(); if (!paymentDisabled) onOpenPayment?.(); }}
        onClick={(event) => { event.stopPropagation(); if (!paymentDisabled) onOpenPayment?.(); }}
        style={{
          width: '100%',
          minHeight: 48,
          borderRadius: 14,
          border: `1px solid ${ctaBorder}`,
          background: ctaBg,
          color: ctaColor,
          fontSize: 14,
          fontWeight: 900,
          fontFamily: 'inherit',
          cursor: paymentDisabled ? 'default' : 'pointer',
        }}
      >
        {paymentChipLabel}
      </button>

      {hasSources && (
        <button
          type="button"
          aria-expanded={sourcesOpen}
          onClick={toggleSourcesOpen}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 12,
            padding: '11px 12px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.035)',
            color: 'inherit',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 850, color: colors.textSecondary }}>
            {sourceRows.length} nguồn · <span style={{ color: total < 0 ? colors.danger : colors.success, ...type.mono }}>{total < 0 ? '' : '+'}{formatVND(total)}</span>
          </span>
          <span style={{ color: colors.textMuted, fontSize: 16, lineHeight: 1 }}>{sourcesOpen ? '↑' : '↓'}</span>
        </button>
      )}

      {sourcesOpen && sourceRows.map((source, index) => {
        const amount = Number(source.amount) || 0;
        const sourceType = source.sourceType || 'group';
        const sourceId = source.sourceId || source.sourceLabel || index;
        const sourceKey = `${sourceType}:${sourceId}`;
        const isPickleball = sourceType === 'pickleball';
        const isNegative = amount < 0;
        const monthBreakdown = safeArray(source.monthBreakdown).filter(row => Number(row.amount) !== 0);
        const sourceExpanded = openSourceKeys.has(sourceKey);
        const toggleSource = () => {
          setOpenSourceKeys(prev => {
            const next = new Set(prev);
            next.has(sourceKey) ? next.delete(sourceKey) : next.add(sourceKey);
            return next;
          });
        };
        return (
          <div
            key={`${sourceType}-${sourceId}-${index}`}
            style={{ marginTop: 8 }}
          >
            <button
              type="button"
              aria-expanded={sourceExpanded}
              aria-label={`${sourceExpanded ? 'Thu gọn' : 'Mở'} ${source.sourceLabel}`}
              onClick={toggleSource}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 10px',
                background: isPickleball ? 'rgba(52,211,153,0.10)' : 'transparent',
                border: isPickleball ? '1px solid rgba(52,211,153,0.26)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
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
                <div style={{ fontSize: 11, color: isPickleball ? '#6ee7b7' : colors.textSecondary, marginTop: 2 }}>
                  {isPickleball ? 'Pickleball' : 'Chi tiêu nhóm'}
                </div>
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 800,
                color: isNegative ? colors.danger : colors.success,
                ...type.mono,
              }}>{isNegative ? '' : '+'}{formatVND(amount)}</div>
              <div style={{ color: isPickleball ? '#6ee7b7' : colors.textMuted, fontSize: 18, flexShrink: 0 }}>{sourceExpanded ? '⌃' : '⌄'}</div>
            </button>
            {sourceExpanded && monthBreakdown.length > 0 && (
              <div style={{
                display: 'grid',
                gap: 6,
                marginLeft: 17,
                padding: '8px 0 2px 17px',
                borderLeft: '1px solid rgba(148,163,184,0.18)',
              }}>
                <div style={{ fontSize: 9, color: colors.textMuted, paddingBottom: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  theo tháng
                </div>
                {monthBreakdown.map(row => {
                  const monthAmount = Number(row.amount) || 0;
                  const isPast = row.month && viewedMonthKey && row.month < viewedMonthKey;
                  const canViewMonth = Boolean(row.month);
                  return (
                    <div key={row.month || row.label} style={{
                      border: isPast ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '9px 10px',
                      background: isPast ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.025)',
                      fontSize: 11,
                      color: colors.textSecondary,
                      lineHeight: 1.2,
                      minHeight: 44,
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#f8fafc' }}>
                            <span>{row.label || row.month}</span>
                          </div>
                          {isPast && <div style={{ marginTop: 4, fontSize: 9, color: '#fbbf24', fontWeight: 800 }}>⚠️ chưa quyết toán</div>}
                        </div>
                        <div style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                          <span style={{
                            padding: '3px 7px',
                            borderRadius: 999,
                            background: monthAmount < 0 ? 'rgba(248,113,113,0.10)' : 'rgba(52,211,153,0.12)',
                            color: monthAmount < 0 ? colors.danger : colors.success,
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            fontWeight: 900,
                            ...type.mono,
                          }}>{monthAmount < 0 ? '' : '+'}{formatVND(monthAmount)}</span>
                          {canViewMonth && (
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); onViewMonth?.(row.month, source); }}
                              style={{
                                padding: 0,
                                border: 'none',
                                background: 'transparent',
                                color: isPast ? '#fbbf24' : colors.brandLight,
                                fontSize: 10,
                                fontWeight: 800,
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Xem →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function PaymentSheet({ open, data, paymentRecords = [], isTreasurer, confirmedRefunds, savingAction, setSavingAction, onAction, onViewPaymentRecord, onConfirmPayment, onConfirmRefund, onCancelRefund, onClose }) {
  const [copiedField, setCopiedField] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const debtSources = safeArray(data?.sourceBreakdown).filter(source => Number(source.amount) < 0);
  const ownPaymentItems = debtSources.flatMap((source, index) => sourcePaymentItems(source, {
    prefix: `own:${index}`,
    memberId: data?.memberId || data?.currentMemberId || data?.currentUserId || source.memberId || source.member_id || '',
    profileId: data?.profileId || data?.currentProfileId || source.profileId || source.profile_id || '',
  }));
  const hasOwnPaymentItems = ownPaymentItems.length > 0;
  const ownPaymentItemKeys = ownPaymentItems.map(item => item.key).join('|');
  const [selectedPayForIds, setSelectedPayForIds] = useState(() => new Set());
  const [selectedPaymentSourceKeys, setSelectedPaymentSourceKeys] = useState(() => new Set());
  const [selectedPayForSourceKeys, setSelectedPayForSourceKeys] = useState(() => new Set());
  const [payForExpanded, setPayForExpanded] = useState(false);
  const [paymentDetailsExpanded, setPaymentDetailsExpanded] = useState(false);
  useEffect(() => {
    setSelectedPaymentSourceKeys(new Set(ownPaymentItems.map(item => item.key)));
    setSelectedPayForIds(new Set());
    setSelectedPayForSourceKeys(new Set());
    setCopiedField('');
    setPaymentConfirmed(false);
  }, [open, ownPaymentItemKeys]);
  if (!open) return null;
  const netBalance = Number(data?.netBalance) || 0;
  const showOwnPaymentCard = hasOwnPaymentItems && (isTreasurer || netBalance < 0);
  const target = data?.paymentTarget || {};
  const qrBank = resolveVietQrBank(target);
  const payForRows = safeArray(data?.payForRows);
  const payForRowKey = row => String(row.profileId || row.name);
  const payForRowPaymentItems = row => safeArray(row.sources).flatMap((source, index) => sourcePaymentItems(source, {
    prefix: `payfor:${row.profileId || row.name}:${index}`,
    memberId: row.memberId || source.memberId || source.member_id || '',
    profileId: row.profileId || source.profileId || source.profile_id || '',
  })).map(item => ({ ...item, memberName: row.name }));
  const selectedPayForRows = payForRows.filter(row => selectedPayForIds.has(String(row.profileId || row.name)));
  const selectedOwnPaymentItems = ownPaymentItems.filter(item => selectedPaymentSourceKeys.has(item.key));
  const selectedPayForGroups = selectedPayForRows.map(row => {
    const items = payForRowPaymentItems(row);
    return { row, items };
  }).filter(group => group.items.length > 0);
  const selectedPayForPaymentItems = selectedPayForGroups.flatMap(group => group.items).filter(item => selectedPayForSourceKeys.has(item.key));
  const selectedPaymentItems = [...selectedOwnPaymentItems, ...selectedPayForPaymentItems];
  const selectedPayForTotal = paymentItemsAmountDue(selectedPayForPaymentItems);
  const paymentDisplayGroups = [
    {
      key: 'own',
      title: `Các khoản của ${data?.memberName || 'bạn'}`,
      items: ownPaymentItems,
      checkedKeys: selectedPaymentSourceKeys,
      onToggle: togglePaymentSource,
    },
    ...selectedPayForGroups.map(group => ({
      key: String(group.row.profileId || group.row.name),
      title: `Các khoản của ${group.row.name}`,
      items: group.items,
      checkedKeys: selectedPayForSourceKeys,
      onToggle: togglePayForSource,
    })),
  ].filter(group => group.items.length > 0);
  const coveredSources = selectedPaymentItems.map(paymentItemToCoveredSource);
  const coveredItems = selectedPaymentItems.flatMap(paymentItemToCoveredItems);
  const amountToPay = paymentItemsAmountDue(selectedOwnPaymentItems) + paymentItemsAmountDue(selectedPayForPaymentItems);
  const paymentConfirmationDisabled = savingAction === 'confirmPayment'
    || paymentConfirmed
    || amountToPay <= 0
    || (!isTreasurer && Boolean(data?.pendingSettlementCheckpoint));
  const canShowQr = amountToPay > 0 && qrBank && target.account && target.holder;
  const memberBank = data?.memberBank || {};
  const memberBankReady = Boolean(resolveVietQrBank(memberBank) && memberBank.account && memberBank.holder);
  const needsBankSetup = netBalance > 0 && !memberBankReady;
  const paymentNames = [data?.memberName || 'Thanh vien', ...selectedPayForRows.map(row => row.name)].filter(Boolean);
  const paymentPeriodLabel = paymentItemsPeriodLabel(selectedPaymentItems, data?.monthLabel);
  const payForSummary = selectedPayForRows.length
    ? `${selectedPayForRows.length} người · ${formatVND(selectedPayForTotal)}`
    : 'Chưa chọn ai';
  const transferDescription = `${paymentNames.join(', ')} - Thanh toan ${paymentPeriodLabel}`.trim();
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
    if (savingAction || paymentConfirmed || amountToPay <= 0) return;
    setSavingAction('confirmPayment');
    try {
      await onConfirmPayment?.({
        amount: amountToPay,
        memberName: data?.memberName || 'Thành viên',
        memberId: data?.memberId || data?.currentMemberId || data?.currentUserId || '',
        profileId: data?.profileId || data?.currentProfileId || '',
        groupId: data?.currentGroupId || '',
        coveredMembers: selectedPayForRows,
        coveredSources,
        coveredItems,
        transferDescription,
        monthLabel: paymentPeriodLabel,
        paymentTarget: target,
      });
      setPaymentConfirmed(true);
    } finally {
      setSavingAction('');
    }
  };
  const togglePayFor = (row) => {
    const key = payForRowKey(row);
    const rowItemKeys = payForRowPaymentItems(row).map(item => item.key);
    setSelectedPayForIds(prev => {
      const next = new Set(prev);
      const selected = next.has(key);
      if (selected) next.delete(key);
      else next.add(key);
      setSelectedPayForSourceKeys(prevKeys => {
        const nextKeys = new Set(prevKeys);
        rowItemKeys.forEach(itemKey => {
          if (selected) nextKeys.delete(itemKey);
          else nextKeys.add(itemKey);
        });
        return nextKeys;
      });
      return next;
    });
    setCopiedField('');
    setPaymentConfirmed(false);
  };
  function togglePaymentSource(key) {
    setSelectedPaymentSourceKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setCopiedField('');
    setPaymentConfirmed(false);
  }
  function togglePayForSource(key) {
    setSelectedPayForSourceKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setCopiedField('');
    setPaymentConfirmed(false);
  }

  return (
    <BottomSheet title="Thanh toán" onClose={onClose}>
      {showOwnPaymentCard && (
        <Card style={{ padding: 14, borderColor: canShowQr ? 'rgba(52,211,153,0.28)' : 'rgba(251,191,36,0.28)' }}>
          {!canShowQr && (
            <>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {isTreasurer ? 'Khoản của thủ quỹ' : 'Thanh toán về thủ quỹ'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 950, color: '#fca5a5', marginTop: 6, ...type.mono }}>
                {formatVND(amountToPay)}
              </div>
            </>
          )}
          {canShowQr && (
            <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
              <PaymentBillCardContent
                memberName={paymentNames.join(' + ')}
                amount={amountToPay}
                transferDescription={transferDescription}
                qrUrl={qrUrl}
                paymentDisplayGroups={paymentDisplayGroups}
                selectable
                caption={isTreasurer ? 'Khoản của thủ quỹ' : undefined}
                actions={(
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                    <a
                      href={qrUrl}
                      download="vietqr-thanh-toan.png"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 38,
                        borderRadius: 10,
                        background: 'rgba(59,130,246,0.18)',
                        border: '1px solid rgba(96,165,250,0.42)',
                        color: '#93c5fd',
                        fontSize: 12,
                        fontWeight: 900,
                        textDecoration: 'none',
                      }}
                    >Lưu QR</a>
                    <button type="button" onClick={confirmPayment} disabled={paymentConfirmationDisabled} style={{
                      minHeight: 38,
                      borderRadius: 10,
                      background: paymentConfirmed ? 'rgba(16,185,129,0.20)' : '#10b981',
                      border: `1px solid ${paymentConfirmed ? 'rgba(110,231,183,0.42)' : 'rgba(16,185,129,0.62)'}`,
                      color: paymentConfirmed ? '#6ee7b7' : '#052e16',
                      fontSize: 12,
                      fontWeight: 900,
                      fontFamily: 'inherit',
                      cursor: paymentConfirmationDisabled ? 'default' : 'pointer',
                      opacity: savingAction === 'confirmPayment' ? 0.72 : 1,
                    }}>{savingAction === 'confirmPayment'
                      ? 'Đang xử lý…'
                      : !isTreasurer && data?.pendingSettlementCheckpoint
                        ? 'Chờ duyệt'
                        : paymentConfirmed
                          ? 'Đã thanh toán'
                          : isTreasurer
                            ? 'Xác nhận đã nộp'
                            : 'Báo đã chuyển'}</button>
                  </div>
                )}
              />
              <div>
                <button
                  type="button"
                  aria-expanded={paymentDetailsExpanded}
                  onClick={() => setPaymentDetailsExpanded(value => !value)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 11px',
                    borderRadius: 13,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.045)',
                    color: colors.textPrimary,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>Chi tiết chuyển khoản</span>
                    <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.name || target.code || 'Ngân hàng'} · {target.account}</span>
                  </span>
                  <span style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 1 }}>{paymentDetailsExpanded ? '⌃' : '⌄'}</span>
                </button>
                {paymentDetailsExpanded && (
                  <div style={{ display: 'grid', gap: 7, marginTop: 8 }}>
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
              </div>
            </div>
          )}
          {canShowQr && !isTreasurer && payForRows.length > 0 && (
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
          {!canShowQr && (
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              {paymentDisplayGroups.map(group => (
                  <PaymentItemSection
                    key={group.key}
                    title={group.title}
                    items={group.items}
                    checkedKeys={group.checkedKeys}
                    onToggle={group.onToggle}
                  />
              ))}
            </div>
          )}
          {!canShowQr && (
            <div style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.45, fontWeight: 700, marginTop: 10 }}>
              Chưa có đủ thông tin ngân hàng của thủ quỹ. Nhờ Long cập nhật STK trong tab cá nhân.
            </div>
          )}
        </Card>
      )}

      {isTreasurer && (
        <TreasurerPaymentDashboard
          data={data}
          progressRows={(data?.paymentProgress || []).filter(row => !data?.currentProfileId || String(row.profileId || '') !== String(data.currentProfileId))}
          paymentRecords={paymentRecords}
          pendingRecords={paymentRecords}
          refundRows={refundRows}
          pendingCheckpointsForTreasurer={data?.pendingCheckpointsForTreasurer || []}
          confirmedCheckpointsForTreasurer={data?.confirmedCheckpointsForTreasurer || []}
          confirmedRefunds={confirmedRefunds}
          onAction={onAction}
          onViewPaymentRecord={onViewPaymentRecord}
          onConfirmRefund={onConfirmRefund}
          onCancelRefund={onCancelRefund}
        />
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

function treasurerProfileStatKey(record = {}) {
  const name = String(record.name || record.memberName || record.member_name || '').trim().toLowerCase();
  if (name) return `name:${name}`;
  const profileId = String(record.profileId || record.profile_id || '').trim();
  const memberIds = [
    record.memberId,
    record.member_id,
    record.linkMemberId,
    record.link_member_id,
    ...safeArray(record.memberIds || record.member_ids),
  ].map(value => String(value || '').trim()).filter(Boolean);
  if (profileId && !memberIds.includes(profileId)) return `profile:${profileId}`;
  return '';
}

function TreasurerPaymentDashboard({ data, progressRows, pendingRecords, refundRows, pendingCheckpointsForTreasurer, confirmedCheckpointsForTreasurer, confirmedRefunds, onAction, onViewPaymentRecord, onConfirmRefund, onCancelRefund }) {
  const [memberExpanded, setMemberExpanded] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareMember, setShareMember] = useState(null);
  const [paymentRow, setPaymentRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrSheetMembers, setQrSheetMembers] = useState(null);
  const [refundBillItem, setRefundBillItem] = useState(null);
  const [refundBankItem, setRefundBankItem] = useState(null);
  const [selectedTreasurerItemKeys, setSelectedTreasurerItemKeys] = useState(() => new Set());
  const [collapsedTreasurerRows, setCollapsedTreasurerRows] = useState({ keys: [], tick: 0 });
  const rows = safeArray(progressRows);
  const pending = safeArray(pendingRecords);
  const pendingCheckpoints = safeArray(pendingCheckpointsForTreasurer);
  const confirmedCheckpoints = safeArray(confirmedCheckpointsForTreasurer);
  const refunds = safeArray(refundRows);
  const confirmedRecords = pending.filter(record => String(record.status || '').toLowerCase() === 'confirmed');
  const matchSearch = makeMatcher(searchQuery);
  const pendingRecordsRaw = pending.filter(record => String(record.status || 'pending').toLowerCase() === 'pending');
  const pendingRecordsFiltered = pendingRecordsRaw.filter(record => matchSearch(record.memberName || record.name));
  const memberRows = buildTreasurerMemberRows({ progressRows: rows, confirmedRecords, confirmedCheckpoints, refundRows: refunds, pendingCheckpoints, matchSearch, confirmedRefunds, monthLabel: data?.monthLabel });
  const currentPayableItems = new Map(memberRows.flatMap(row => row.items)
    .filter(item => !item.paid && item.kind !== 'refund')
    .flatMap(item => paymentItemToCoveredItems(item))
    .filter(item => item.payableItemKey)
    .map(item => [item.payableItemKey, item]));
  const pendingCheckpointsWithState = pendingCheckpoints.map(row => ({
    ...row,
    stale: safeArray(row.coveredItems || row.covered_items).some(snapshotItem => {
      const key = snapshotItem.payableItemKey || snapshotItem.payable_item_key || '';
      const currentItem = currentPayableItems.get(key);
      return !currentItem || Math.round(Number(currentItem.amount) || 0) !== Math.round(Number(snapshotItem.amount) || 0);
    }),
  }));
  const pendingCheckpointById = new Map(pendingCheckpointsWithState.map(row => [String(row.id), row]));
  const totalNeedCollect = memberRows.reduce((sum, row) => sum + row.amountDue, 0);
  const totalReceived = memberRows.reduce((sum, row) => sum + row.amountPaid, 0);
  const totalRefund = memberRows.reduce((sum, row) => sum + row.amountRefund, 0);
  const profileStats = new Map();
  memberRows.forEach(row => {
    const key = treasurerProfileStatKey(row);
    if (!key) return;
    const stat = profileStats.get(key) || { amountDue: 0, amountPaid: 0, amountRefund: 0 };
    stat.amountDue += row.amountDue;
    stat.amountPaid += row.amountPaid;
    stat.amountRefund += row.amountRefund;
    profileStats.set(key, stat);
  });
  const profileStatRows = [...profileStats.values()];
  const totalProfileCount = profileStatRows.length;
  const paidMemberCount = profileStatRows.filter(row => row.amountPaid > 0 && row.amountDue <= 0).length;
  const pendingMemberCount = new Set([...pendingRecordsRaw, ...pendingCheckpoints].map(treasurerProfileStatKey).filter(Boolean)).size;
  const unpaidMemberCount = profileStatRows.filter(row => row.amountDue > 0).length;
  const selectedTreasurerItems = memberRows.flatMap(row => row.items.filter(item => !item.paid && !item.pending && item.kind !== 'refund' && selectedTreasurerItemKeys.has(item.key)));
  const selectedTreasurerRowKeys = memberRows.filter(row => row.items.some(item => !item.paid && !item.pending && item.kind !== 'refund' && selectedTreasurerItemKeys.has(item.key))).map(row => row.key);
  const selectedTreasurerTotal = paymentItemsAmountDue(selectedTreasurerItems);
  const refundBillData = refundBillItem ? buildRefundBillData(refundBillItem) : null;
  const refundBillBankReady = refundBillItem ? Boolean(resolveVietQrBank(refundBillItem.bank || {}) && refundBillItem.bank?.account && refundBillItem.bank?.holder) : false;
  const isSearching = Boolean(searchQuery.trim());

  async function withLoading(action) {
    if (loading) return;
    setLoading(true);
    try {
      await action?.();
    } finally {
      setLoading(false);
    }
  }

  function toggleTreasurerItemSelection(item) {
    if (!item || item.paid || item.pending || item.kind === 'refund') return;
    setSelectedTreasurerItemKeys(prev => {
      const next = new Set(prev);
      next.has(item.key) ? next.delete(item.key) : next.add(item.key);
      return next;
    });
  }

  function setTreasurerRowSelection(row, selected) {
    setSelectedTreasurerItemKeys(prev => {
      const next = new Set(prev);
      safeArray(row?.items).filter(item => !item.paid && !item.pending && item.kind !== 'refund').forEach(item => {
        selected ? next.add(item.key) : next.delete(item.key);
      });
      return next;
    });
  }

  function clearTreasurerSelection() {
    setSelectedTreasurerItemKeys(new Set());
    setCollapsedTreasurerRows(prev => ({ keys: memberRows.map(row => row.key), tick: prev.tick + 1 }));
  }

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 12, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.58)', borderRadius: 14 }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.24)', borderTopColor: '#6ee7b7', animation: 'spin 800ms linear infinite' }} />
        </div>
      )}
      <Card style={{ padding: 14, borderColor: 'rgba(59,130,246,0.24)', background: 'rgba(59,130,246,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>Tiến độ thu</div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#93c5fd', flexShrink: 0 }}>{totalProfileCount} member</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 950, color: '#f8fafc', marginTop: 4, ...type.mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatVND(totalNeedCollect)}</div>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Còn theo dõi · {data?.monthLabel || 'tháng này'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 6, marginTop: 10 }}>
          <ProgressStat label="Đã nhận" count={paidMemberCount} color="#6ee7b7" />
          <ProgressStat label="Chờ duyệt" count={pendingMemberCount} color="#fcd34d" />
          <ProgressStat label="Chưa thu" count={unpaidMemberCount} color="#fca5a5" />
        </div>
      </Card>

      <SearchInput
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Tìm thành viên trong danh sách"
      />

      {pendingRecordsRaw.length > 0 && (
        <DashboardSection
          title={`Chờ duyệt · ${pendingRecordsFiltered.length}${isSearching ? `/${pendingRecordsRaw.length}` : ''}`}
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
              <button type="button" onClick={() => withLoading(() => onAction?.('confirmPaymentNotice', record))} style={miniDashButton('#22c55e', '#052e16')}>Đã nhận</button>
              <button type="button" onClick={() => withLoading(() => onAction?.('rejectPaymentNotice', record))} style={miniDashButton(colors.danger, '#fff')}>Chưa nhận</button>
            </PaymentDashboardRow>
          )) : (
            <div style={{ padding: 10, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Không có member khớp tìm kiếm.</div>
          )}
        </DashboardSection>
      )}

      <DashboardSection
        title={`Danh sách member · ${memberRows.length}`}
        subtitle={`Còn thu ${formatVND(totalNeedCollect)} · đã nhận ${formatVND(totalReceived)}${totalRefund > 0 ? ` · cần hoàn ${formatVND(totalRefund)}` : ''}`}
        amount={totalNeedCollect}
        icon="⇄"
        color="#93c5fd"
        amountPrefix="-"
        expanded={memberExpanded}
        onToggle={() => setMemberExpanded(value => !value)}
        listScroll
        headerRight={selectedTreasurerTotal > 0 ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={clearTreasurerSelection}
              style={miniDashButton('rgba(148,163,184,0.14)', '#cbd5e1')}
            >Bỏ chọn tất cả</button>
            <button
              type="button"
              onClick={() => setPaymentRow({ ...paymentRowFromTreasurerItems(selectedTreasurerItems, data), collapseRowKeys: selectedTreasurerRowKeys })}
              style={miniDashButton('#22c55e', '#052e16')}
            >TT đã chọn {formatVND(selectedTreasurerTotal)}</button>
          </div>
        ) : null}
      >
        {memberRows.length > 0 ? memberRows.map(row => (
          <TreasurerMemberPaymentRow
            key={row.key}
            row={row}
            pendingCheckpoints={[...new Set(row.items.map(item => item.pendingCheckpointId).filter(Boolean))]
              .map(id => pendingCheckpointById.get(String(id)))
              .filter(Boolean)}
            selectedKeys={selectedTreasurerItemKeys}
            collapseTick={collapsedTreasurerRows.keys.includes(row.key) ? collapsedTreasurerRows.tick : 0}
            onShare={(member) => setShareMember(member)}
            onQr={(member) => setQrSheetMembers([member])}
            onPayItem={(item) => setPaymentRow({ ...paymentRowFromTreasurerItem(item, data), collapseRowKeys: [row.key] })}
            onPaySelected={(items) => setPaymentRow({ ...paymentRowFromTreasurerItems(items, data), collapseRowKeys: [row.key] })}
            onToggleSelect={toggleTreasurerItemSelection}
            onToggleRowSelection={(selected) => setTreasurerRowSelection(row, selected)}
            onCancelPaid={(record) => withLoading(() => onAction?.('cancelPaymentRecord', record))}
            onViewPaid={(record) => { onViewPaymentRecord?.(record); onAction?.('viewPaymentNotice', record); }}
            onConfirmRefund={(item) => onConfirmRefund?.(item.refundRow)}
            onCancelRefund={(item) => onCancelRefund?.(item.refundRow)}
            onRefundBill={(item) => setRefundBillItem(item)}
            onConfirmPending={(checkpointIds) => withLoading(() => onAction?.('confirmSettlementCheckpoint', { checkpointIds }))}
            onRejectPending={(checkpointIds) => withLoading(() => onAction?.('rejectSettlementCheckpoint', { checkpointIds }))}
          />
        )) : (
          <div style={{ padding: 10, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{isSearching ? 'Không có member khớp tìm kiếm.' : 'Không còn dữ liệu cần xử lý.'}</div>
        )}
      </DashboardSection>

      {shareMember && (
        <MemberShareLinkSheet
          member={shareMember}
          monthLabel={data?.monthLabel}
          onAction={onAction}
          onClose={() => setShareMember(null)}
        />
      )}

      {paymentRow && (
        <TreasurerConfirmPaymentSheet
          row={paymentRow}
          monthLabel={data?.monthLabel || ''}
          currentMonth={data?.yearMonth || ''}
          paymentTarget={data?.paymentTarget}
          onClose={() => setPaymentRow(null)}
          onRequestSnapshot={(payload) => onAction?.('requestSettlementCheckpoint', payload)}
          onConfirm={(payload) => withLoading(async () => {
            await onAction?.('markMemberPaid', payload);
            setCollapsedTreasurerRows(prev => ({ keys: safeArray(paymentRow?.collapseRowKeys), tick: prev.tick + 1 }));
            setSelectedTreasurerItemKeys(prev => {
              if (!selectedTreasurerTotal) return prev;
              const next = new Set(prev);
              safeArray(paymentRow?.paymentItems).forEach(item => next.delete(item.key));
              return next;
            });
            setPaymentRow(null);
          })}
        />
      )}

      {qrSheetMembers && (
        <MultiMemberQRSheet
          members={qrSheetMembers}
          paymentTarget={data?.paymentTarget}
          onClose={() => setQrSheetMembers(null)}
        />
      )}

      {refundBillData && (
        <PaymentBillCardSheet
          memberName={refundBillData.memberName}
          amount={refundBillData.amount}
          transferDescription={refundBillData.transferDescription}
          qrUrl={refundBillData.qrUrl}
          paymentDisplayGroups={refundBillData.paymentDisplayGroups}
          caption="Cần hoàn cho member"
          amountColor="#6ee7b7"
          footerActions={(
            <button type="button" onClick={() => setRefundBankItem(refundBillItem)} style={miniDashButton('rgba(96,165,250,0.16)', '#bfdbfe')}>
              {refundBillBankReady ? 'Sửa STK' : 'Bổ sung STK'}
            </button>
          )}
          onClose={() => setRefundBillItem(null)}
        />
      )}

      {refundBankItem && (
        <RefundBankSheet
          item={refundBankItem}
          onAction={onAction}
          onSaved={(bank) => {
            setRefundBillItem(item => item ? {
              ...item,
              bank,
              refundRow: item.refundRow ? { ...item.refundRow, bank } : item.refundRow,
            } : item);
          }}
          onClose={() => setRefundBankItem(null)}
        />
      )}
    </div>
  );
}

function buildTreasurerMemberRows({ progressRows, confirmedRecords, confirmedCheckpoints, refundRows, pendingCheckpoints, matchSearch, confirmedRefunds, monthLabel }) {
  const byMember = new Map();
  const pendingItems = new Map();
  const paidPayableItemKeys = new Set(safeArray(confirmedRecords)
    .flatMap(record => safeArray(record.coveredItems || record.covered_items))
    .map(item => item.payableItemKey || item.payable_item_key || '')
    .filter(Boolean));
  safeArray(pendingCheckpoints).forEach(checkpoint => {
    safeArray(checkpoint.coveredItems || checkpoint.covered_items).forEach(item => {
      const payableItemKey = item.payableItemKey || item.payable_item_key || '';
      if (payableItemKey) pendingItems.set(payableItemKey, checkpoint.id);
    });
  });
  const ensureRow = (seed = {}) => {
    const key = treasurerProfileStatKey(seed) || String(seed.memberId || seed.name || 'member');
    const existing = byMember.get(key) || {
      key,
      profileId: seed.profileId || '',
      memberId: seed.memberId || '',
      groupId: seed.groupId || '',
      name: seed.name || seed.memberName || 'Thành viên',
      amountDue: 0,
      amountPaid: 0,
      amountRefund: 0,
      items: [],
    };
    existing.profileId = existing.profileId || seed.profileId || '';
    existing.memberId = existing.memberId || seed.memberId || '';
    existing.groupId = existing.groupId || seed.groupId || '';
    existing.name = existing.name || seed.name || seed.memberName || 'Thành viên';
    byMember.set(key, existing);
    return existing;
  };

  safeArray(progressRows)
    .filter(row => ['pending', 'unpaid'].includes(String(row.status || '').toLowerCase()))
    .forEach(row => {
      const memberId = row.linkMemberId || row.memberId || '';
      const profileId = row.profileId || '';
      const base = {
        profileId,
        memberId,
        groupId: row.linkGroupId || row.groupId || '',
        name: row.name || row.memberName,
      };
      const memberRow = ensureRow(base);
      const items = safeArray(row.paymentItems).length
        ? safeArray(row.paymentItems)
        : safeArray(row.payableSources || row.coveredSources || row.sources).flatMap((source, index) => sourcePaymentItems(source, { prefix: `member:${memberRow.key}:${index}`, memberId, profileId }));
      items.forEach((item, index) => {
        const coveredItems = paymentItemToCoveredItems(item);
        const itemBuckets = new Map();
        coveredItems.forEach(coveredItem => {
          const payableItemKey = coveredItem.payableItemKey || coveredItem.payable_item_key || '';
          const pendingCheckpointId = pendingItems.get(payableItemKey) || '';
          const bucketKey = pendingCheckpointId ? 'pending' : 'unsettled';
          const bucket = itemBuckets.get(bucketKey) || { pending: Boolean(pendingCheckpointId), pendingCheckpointId, coveredItems: [] };
          bucket.coveredItems.push(coveredItem);
          itemBuckets.set(bucketKey, bucket);
        });
        itemBuckets.forEach((bucket, bucketKey) => {
          const amount = bucket.coveredItems.reduce((sum, coveredItem) => sum + (Number(coveredItem.amount) || 0), 0);
          if (amount === 0) return;
          const payableItemKey = bucket.coveredItems.length === 1 ? bucket.coveredItems[0].payableItemKey || '' : '';
          memberRow.items.push({
            ...item,
            key: `${item.key || `due:${memberRow.key}:${index}`}:${bucketKey}`,
            amount,
            coveredItems: bucket.coveredItems,
            payableItemKey,
            pendingCheckpointId: bucket.pendingCheckpointId,
            pending: bucket.pending,
            paid: false,
            kind: 'collect',
            memberName: memberRow.name,
            groupId: item.groupId || item.group_id || item.sourceId || row.linkGroupId || row.groupId || '',
            row,
          });
        });
      });
      memberRow.amountDue = paymentItemsAmountDue(memberRow.items.filter(item => !item.paid && item.kind !== 'refund'));
    });

  safeArray(confirmedRecords).forEach(record => {
    const coveredSources = safeArray(record.coveredSources || record.covered_sources);
    const fallbackItem = {
      key: `paid:${record.notificationId || record.id}`,
      sourceType: 'payment',
      sourceId: record.notificationId || record.id || '',
      sourceLabel: record.sourceSummary || 'Đã nhận',
      memberId: record.memberId || record.member_id || '',
      profileId: record.profileId || record.profile_id || '',
      memberName: record.memberName || record.name,
      month: '',
      monthLabel: record.monthLabel || monthLabel,
      amount: -Math.abs(Number(record.amount) || 0),
    };
    const items = coveredSources.length ? coveredSources.map((source, index) => ({
      key: `paid:${record.notificationId || record.id}:${index}`,
      sourceType: source.sourceType || source.source_type || 'group',
      sourceId: source.sourceId || source.source_id || '',
      sourceLabel: source.sourceLabel || source.source_label || 'Nguồn tiền',
      memberId: source.memberId || source.member_id || record.memberId || '',
      profileId: source.profileId || source.profile_id || record.profileId || '',
      memberName: source.memberName || source.member_name || record.memberName,
      month: source.month || source.yearMonth || source.year_month || '',
      monthLabel: source.monthLabel || source.month_label || record.monthLabel || monthLabel,
      amount: Number(source.amount) || -Math.abs(Number(record.amount) || 0),
    })) : [fallbackItem];
    items.forEach(item => {
      const amount = Number(item.amount) || 0;
      if (amount === 0) return;
      const memberRow = ensureRow({
        profileId: item.profileId,
        memberId: item.memberId || record.memberId,
        name: item.memberName || record.memberName || record.name,
      });
      memberRow.items.push({ ...item, paid: true, kind: 'collect', record });
      memberRow.amountPaid = paymentItemsAmountDue(memberRow.items.filter(item => item.paid && item.kind !== 'refund'));
    });
  });

  safeArray(confirmedCheckpoints).forEach(checkpoint => {
    const checkpointItems = safeArray(checkpoint.coveredItems || checkpoint.covered_items)
      .filter(item => {
        const payableItemKey = item.payableItemKey || item.payable_item_key || '';
        return (!payableItemKey || !paidPayableItemKeys.has(payableItemKey)) && Number(item.amount);
      });
    if (checkpointItems.length === 0) return;
    const item = checkpointItems[0];
    const memberRow = ensureRow({
      profileId: item.profileId || item.profile_id || '',
      memberId: item.memberId || item.member_id || checkpoint.memberId || checkpoint.member_id || '',
      groupId: checkpoint.groupId || checkpoint.group_id || item.sourceId || item.source_id || '',
      name: item.memberName || item.member_name || checkpoint.memberName,
    });
    const checkpointMonthBuckets = new Map();
    checkpointItems.forEach(coveredItem => {
      const sourceType = coveredItem.sourceType || coveredItem.source_type || 'group';
      const sourceId = coveredItem.sourceId || coveredItem.source_id || checkpoint.groupId || checkpoint.group_id || '';
      const itemMonth = coveredItem.month || coveredItem.yearMonth || coveredItem.year_month || '';
      const itemMonthLabel = coveredItem.monthLabel || coveredItem.month_label || fullMonthLabel(itemMonth) || monthLabel;
      const bucketKey = `${sourceType}:${sourceId}:${itemMonth || itemMonthLabel}`;
      const bucket = checkpointMonthBuckets.get(bucketKey) || { sourceType, sourceId, month: itemMonth, monthLabel: itemMonthLabel, items: [] };
      bucket.items.push(coveredItem);
      checkpointMonthBuckets.set(bucketKey, bucket);
    });
    checkpointMonthBuckets.forEach((bucket, bucketKey) => {
      const bucketItem = bucket.items[0];
      memberRow.items.push({
        ...bucketItem,
        key: `checkpoint:${checkpoint.id}:${bucketKey}`,
        sourceType: bucket.sourceType,
        sourceId: bucket.sourceId,
        sourceLabel: bucketItem.sourceLabel || bucketItem.source_label || 'Đã nhận',
        memberId: bucketItem.memberId || bucketItem.member_id || checkpoint.memberId || checkpoint.member_id || '',
        profileId: bucketItem.profileId || bucketItem.profile_id || '',
        memberName: bucketItem.memberName || bucketItem.member_name || checkpoint.memberName,
        month: bucket.month,
        monthLabel: bucket.monthLabel,
        amount: bucket.items.reduce((sum, coveredItem) => sum + (Number(coveredItem.amount) || 0), 0),
        coveredItems: bucket.items,
        itemCount: bucket.items.length,
        payableItemKey: '',
        paid: true,
        kind: 'collect',
        checkpoint,
      });
    });
    memberRow.amountPaid = paymentItemsAmountDue(memberRow.items.filter(row => row.paid && row.kind !== 'refund'));
  });

  safeArray(refundRows).forEach(row => {
    const amount = Math.max(0, Number(row.amount) || 0);
    if (amount <= 0) return;
    const memberRow = ensureRow({
      profileId: row.profileId || row.profile_id || '',
      memberId: row.memberId || row.member_id || '',
      name: row.name || row.memberName || row.member_name,
    });
    const refundKey = String(row.profileId || row.profile_id || row.name || 'member');
    memberRow.amountRefund += amount;
    memberRow.items.push({
      key: `refund:${refundKey}`,
      kind: 'refund',
      paid: Boolean(confirmedRefunds?.has?.(refundKey)),
      sourceType: 'refund',
      sourceId: refundKey,
      sourceLabel: 'Cần hoàn tiền',
      memberId: row.memberId || row.member_id || '',
      profileId: row.profileId || row.profile_id || '',
      memberName: memberRow.name,
      month: row.month || row.yearMonth || row.year_month || '',
      monthLabel: row.monthLabel || row.month_label || monthLabel,
      amount,
      bank: row.bank || {},
      refundRow: row,
    });
  });

  return [...byMember.values()]
    .filter(row => matchSearch(row.name))
    .map(row => ({
      ...row,
      pendingAmount: paymentItemsAmountDue(row.items.filter(item => !item.paid && item.pending && item.kind !== 'refund')),
      unsettledAmount: paymentItemsAmountDue(row.items.filter(item => !item.paid && !item.pending && item.kind !== 'refund')),
      items: row.items.sort((a, b) => String(a.sourceLabel || '').localeCompare(String(b.sourceLabel || ''), 'vi') || String(a.month || a.monthLabel || '').localeCompare(String(b.month || b.monthLabel || '')) || Number(a.paid) - Number(b.paid)),
    }))
    .filter(row => row.items.length > 0)
    .sort((a, b) => (b.amountDue + b.amountPaid + b.amountRefund) - (a.amountDue + a.amountPaid + a.amountRefund) || a.name.localeCompare(b.name, 'vi'));
}

function paymentRowFromTreasurerItem(item, data) {
  return paymentRowFromTreasurerItems([item], data);
}

function paymentRowFromTreasurerItems(items, data) {
  const paymentItems = safeArray(items).map((item, index) => ({
    ...item,
    key: item.key || `${item.sourceType || 'group'}:${item.sourceId || item.sourceLabel || 'source'}:${item.month || data?.yearMonth || index}`,
    defaultSelected: true,
  }));
  const firstItem = paymentItems[0] || {};
  const profileGroups = new Map();
  paymentItems.forEach((item, index) => {
    const key = item.profileId || item.memberId || item.memberName || `member:${index}`;
    const existing = profileGroups.get(key) || {
      key,
      name: item.memberName || item.row?.name || item.row?.memberName || 'Thành viên',
      memberId: item.memberId || item.row?.linkMemberId || item.row?.memberId || '',
      profileId: item.profileId || item.row?.profileId || '',
      items: [],
    };
    existing.items.push(item);
    profileGroups.set(key, existing);
  });
  const paymentGroups = [...profileGroups.values()].map(group => ({
    key: group.key,
    title: `Các khoản của ${group.name}`,
    items: group.items,
  }));
  const memberNames = [...new Set([...profileGroups.values()].map(group => group.name).filter(Boolean))];
  const displayName = memberNames.length > 1 ? `${memberNames[0]} + ${memberNames.length - 1} người` : (memberNames[0] || firstItem.memberName || firstItem.row?.memberName || firstItem.row?.name || 'Thành viên');
  const amount = paymentItemsAmountDue(paymentItems);
  return {
    profileId: firstItem.profileId || firstItem.row?.profileId || '',
    memberId: firstItem.memberId || firstItem.row?.linkMemberId || firstItem.row?.memberId || '',
    linkMemberId: firstItem.memberId || firstItem.row?.linkMemberId || firstItem.row?.memberId || '',
    groupId: firstItem.groupId || firstItem.row?.groupId || data?.currentGroupId || '',
    linkGroupId: firstItem.groupId || firstItem.row?.linkGroupId || firstItem.row?.groupId || data?.currentGroupId || '',
    name: displayName,
    memberName: displayName,
    paymentItems,
    paymentGroups,
    defaultPaymentItemKeys: paymentItems.map(item => item.key),
    payableSources: paymentItems.map(paymentItemToCoveredSource),
    payableAmount: amount,
  };
}

function TreasurerMemberPaymentRow({ row, pendingCheckpoints, selectedKeys, collapseTick, onShare, onQr, onPayItem, onPaySelected, onToggleSelect, onToggleRowSelection, onCancelPaid, onViewPaid, onConfirmRefund, onCancelRefund, onRefundBill, onConfirmPending, onRejectPending }) {
  const [expanded, setExpanded] = useState(false);
  const groupedItems = groupPaymentItemsBySource(row.items);
  const unpaidItems = row.items.filter(item => !item.paid && !item.pending && item.kind !== 'refund');
  const selectedUnpaidItems = row.items.filter(item => !item.paid && !item.pending && item.kind !== 'refund' && selectedKeys?.has?.(item.key));
  const selectedUnpaidTotal = paymentItemsAmountDue(selectedUnpaidItems);
  const rowAllSelected = unpaidItems.length > 0 && unpaidItems.every(item => selectedKeys?.has?.(item.key));
  const pendingCheckpointIds = [...new Set(safeArray(pendingCheckpoints).map(checkpoint => checkpoint.id).filter(Boolean))];
  const pendingApprovalDisabled = safeArray(pendingCheckpoints).some(checkpoint => checkpoint.stale);
  useEffect(() => { if (collapseTick) setExpanded(false); }, [collapseTick]);
  return (
    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
      <button type="button" onClick={() => setExpanded(value => !value)} style={{ width: '100%', padding: 0, border: 'none', background: 'transparent', color: 'inherit', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 950, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
            <div style={{ marginTop: 2, fontSize: 10, color: colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.pendingAmount > 0 ? `Đang chờ ${formatVND(row.pendingAmount)}` : ''}
              {row.pendingAmount > 0 && row.unsettledAmount > 0 ? ' · ' : ''}
              {row.unsettledAmount > 0 ? `Chưa chốt ${formatVND(row.unsettledAmount)}` : row.pendingAmount > 0 ? '' : 'Không còn nợ'}
              {row.amountPaid > 0 ? ` · đã nhận ${formatVND(row.amountPaid)}` : ''}
              {row.amountRefund > 0 ? ` · hoàn ${formatVND(row.amountRefund)}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {row.amountDue > 0 && <span style={{ fontSize: 12, fontWeight: 950, color: '#fca5a5', ...type.mono }}>-{formatVND(row.amountDue)}</span>}
            <span style={{ color: colors.textMuted, fontSize: 15 }}>{expanded ? '⌃' : '⌄'}</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div style={{ display: 'grid', gap: 8, marginTop: 9 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {pendingCheckpointIds.length > 0 && <button type="button" disabled={pendingApprovalDisabled} title={pendingApprovalDisabled ? 'Có khoản đã thay đổi hoặc bị xóa' : undefined} onClick={() => onConfirmPending?.(pendingCheckpointIds)} style={{ ...miniDashButton('#22c55e', '#052e16'), opacity: pendingApprovalDisabled ? 0.45 : 1, cursor: pendingApprovalDisabled ? 'not-allowed' : 'pointer' }}>Duyệt tất cả</button>}
            {pendingCheckpointIds.length > 0 && <button type="button" onClick={() => onRejectPending?.(pendingCheckpointIds)} style={miniDashButton(colors.danger, '#fff')}>Từ chối tất cả</button>}
            <button type="button" onClick={() => onShare?.({ name: row.name, memberId: row.memberId, groupId: row.groupId })} style={miniDashButton('#334155', '#94a3b8')}>Link</button>
            {row.unsettledAmount > 0 && <button type="button" onClick={() => onQr?.({ name: row.name, memberId: row.memberId, groupId: row.groupId, amount: row.unsettledAmount })} style={miniDashButton('#4f46e5', '#f8fafc')}>QR</button>}
            {unpaidItems.length > 0 && <button type="button" onClick={() => onToggleRowSelection?.(!rowAllSelected)} style={miniDashButton(rowAllSelected ? 'rgba(148,163,184,0.14)' : 'rgba(34,197,94,0.18)', rowAllSelected ? '#cbd5e1' : '#6ee7b7')}>{rowAllSelected ? 'Bỏ chọn' : 'Chọn hết'}</button>}
            {selectedUnpaidTotal > 0 && <button type="button" onClick={() => onPaySelected?.(selectedUnpaidItems)} style={miniDashButton('#22c55e', '#052e16')}>TT tổng {formatVND(selectedUnpaidTotal)}</button>}
          </div>
          {groupedItems.map(group => (
            <div key={group.key} style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0, fontSize: 12, color: '#e2e8f0', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.label}</div>
                <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 850 }}>{group.items.reduce((sum, item) => sum + (Number(item.itemCount) || 1), 0)} khoản</div>
              </div>
              <div style={{ display: 'grid', gap: 6, marginLeft: 8, paddingLeft: 10, borderLeft: '2px solid rgba(147,197,253,0.34)' }}>
                {group.items.map(item => {
                  const isRefund = item.kind === 'refund';
                  const isCredit = Number(item.amount) > 0;
                  const label = isRefund ? (item.paid ? 'Đã chuyển' : 'Hoàn') : isCredit ? 'Bù' : (item.paid ? 'Đã nhận' : 'TT');
                  const amountColor = isRefund || isCredit ? '#6ee7b7' : item.paid ? '#6ee7b7' : '#fca5a5';
                  const selected = !item.paid && !item.pending && !isRefund && selectedKeys?.has?.(item.key);
                  const selectable = !item.paid && !item.pending && !isRefund;
                  return (
                    <div
                      key={item.key}
                      role={selectable ? 'button' : undefined}
                      tabIndex={selectable ? 0 : undefined}
                      onClick={() => selectable ? onToggleSelect?.(item) : undefined}
                      onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && selectable) {
                          event.preventDefault();
                          onToggleSelect?.(item);
                        }
                      }}
                      style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) auto auto', gap: 7, alignItems: 'center', padding: '7px 8px', borderRadius: 9, background: selected ? 'rgba(34,197,94,0.13)' : item.pending ? 'rgba(251,191,36,0.08)' : item.paid ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.035)', border: `1px solid ${selected ? 'rgba(34,197,94,0.48)' : item.pending ? 'rgba(251,191,36,0.24)' : item.paid ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.07)'}`, cursor: selectable ? 'pointer' : 'default' }}
                    >
                      <div style={{ width: 17, height: 17, borderRadius: 6, border: `1px solid ${selected ? '#22c55e' : item.pending ? '#fbbf24' : 'rgba(148,163,184,0.35)'}`, background: selected ? '#22c55e' : 'transparent', color: item.pending ? '#fde68a' : '#052e16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 950 }}>{selected ? '✓' : item.pending ? '·' : ''}</div>
                      <div style={{ minWidth: 0, fontSize: 11, color: colors.textSecondary, fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.checkpoint ? `${item.monthLabel || fullMonthLabel(item.month) || 'Không rõ tháng'} · ${item.itemCount} khoản` : item.monthLabel || fullMonthLabel(item.month) || 'Không rõ tháng'}</div>
                      <div style={{ fontSize: 12, fontWeight: 950, color: amountColor, ...type.mono, whiteSpace: 'nowrap' }}>{signedVND(item.amount)}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {isRefund && <button type="button" onClick={(event) => { event.stopPropagation(); onRefundBill?.(item); }} style={miniDashButton('rgba(251,191,36,0.14)', '#fde68a')}>Thẻ bill</button>}
                        {!item.paid && !isRefund && <span style={{ padding: '5px 7px', borderRadius: 7, background: item.pending ? 'rgba(251,191,36,0.14)' : 'rgba(148,163,184,0.12)', color: item.pending ? '#fde68a' : '#cbd5e1', fontSize: 10, fontWeight: 850 }}>{item.pending ? 'Đang chờ nhận' : 'Chưa chốt'}</span>}
                        {!item.pending && item.checkpoint && <span style={{ padding: '5px 7px', borderRadius: 7, background: 'rgba(34,197,94,0.18)', color: '#6ee7b7', fontSize: 10, fontWeight: 850 }}>Đã nhận</span>}
                        {!item.pending && !item.checkpoint && <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isRefund && item.paid) return onCancelRefund?.(item);
                            if (isRefund) return onConfirmRefund?.(item);
                            if (item.paid) return onCancelPaid?.(item.record);
                            return onPayItem?.(item);
                          }}
                          onDoubleClick={() => item.paid && !isRefund ? onViewPaid?.(item.record) : undefined}
                          style={miniDashButton(item.paid ? 'rgba(34,197,94,0.18)' : '#22c55e', item.paid ? '#6ee7b7' : '#052e16')}
                        >{label}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TreasurerConfirmPaymentSheet({ row, monthLabel, currentMonth, paymentTarget, onClose, onRequestSnapshot, onConfirm }) {
  const items = safeArray(row?.paymentItems);
  const fallbackItems = items.length ? items : safeArray(row?.coveredSources).map((source, index) => ({
    key: `fallback:${index}`,
    sourceType: source.sourceType || source.source_type || 'group',
    sourceId: source.sourceId || source.source_id || '',
    sourceLabel: source.sourceLabel || source.source_label || 'Nguồn tiền',
    memberId: source.memberId || source.member_id || row?.memberId || '',
    profileId: source.profileId || source.profile_id || row?.profileId || '',
    month: source.month || source.yearMonth || source.year_month || currentMonth,
    monthLabel: source.monthLabel || source.month_label || monthLabel,
    amount: Number(source.amount) || 0,
    defaultSelected: true,
  })).filter(item => Number(item.amount) < 0);
  const defaultKeys = safeArray(row?.defaultPaymentItemKeys);
  const [checkedKeys, setCheckedKeys] = useState(() => new Set(defaultKeys.length ? defaultKeys : fallbackItems.filter(item => item.defaultSelected).map(item => item.key)));
  const [submitting, setSubmitting] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [billShareOpen, setBillShareOpen] = useState(false);
  const currentItems = fallbackItems.filter(item => !currentMonth || String(item.month || '') === String(currentMonth));
  const previousItems = fallbackItems.filter(item => currentMonth && String(item.month || '') !== String(currentMonth));
  const selectedItems = fallbackItems.filter(item => checkedKeys.has(item.key));
  const selectedTotal = paymentItemsAmountDue(selectedItems);
  const selectedMonths = [...new Set(selectedItems.map(item => item.month).filter(Boolean))];
  const payloadMonthLabel = selectedMonths.length === 1 ? fullMonthLabel(selectedMonths[0]) : monthLabel;
  const memberName = row?.name || row?.memberName || 'Thành viên';
  const hasProfileGroups = safeArray(row?.paymentGroups).length > 1;
  const target = paymentTarget || {};
  const qrBank = resolveVietQrBank(target);
  const transferDescription = `${memberName} - Thanh toan ${paymentItemsPeriodLabel(selectedItems, monthLabel)}`.trim();
  const qrUrl = selectedTotal > 0 && qrBank && target.account && target.holder ? generateQRUrl({
    bankId: qrBank.id,
    account: target.account,
    accountName: target.holder,
    amount: selectedTotal,
    description: transferDescription,
  }) : '';
  let paymentDisplayGroups = row?.paymentGroups || [{
    key: 'treasurer',
    title: `Các khoản của ${memberName}`,
    items: fallbackItems,
  }];
  paymentDisplayGroups = paymentDisplayGroups.map(group => ({
    ...group,
    checkedKeys,
    onToggle: toggleItem,
  }));

  function toggleItem(key) {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function requestPaymentSnapshot() {
    if (snapshotting || selectedTotal <= 0) return;
    const snapshotGroups = new Map();
    selectedItems.forEach(item => {
      const groupId = item.groupId || item.row?.linkGroupId || item.row?.groupId || row.linkGroupId || row.groupId || '';
      const memberId = item.memberId || item.row?.linkMemberId || item.row?.memberId || row.linkMemberId || row.memberId || '';
      if (!groupId || !memberId) return;
      const key = `${groupId}:${memberId}`;
      const group = snapshotGroups.get(key) || { groupId, groupName: item.sourceLabel || groupId, memberId, items: [] };
      group.items.push(item);
      snapshotGroups.set(key, group);
    });
    setSnapshotting(true);
    try {
      await onRequestSnapshot?.({
        groups: [...snapshotGroups.values()].map(group => ({
          groupId: group.groupId,
          groupName: group.groupName,
          memberId: group.memberId,
          amount: paymentItemsAmountDue(group.items),
          coveredItems: group.items.flatMap(paymentItemToCoveredItems),
        })),
      });
      onClose?.();
    } finally {
      setSnapshotting(false);
    }
  }

  async function submit() {
    if (submitting || selectedTotal <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm?.({
        memberId: row.linkMemberId || row.memberId || '',
        amount: selectedTotal,
        monthLabel: payloadMonthLabel,
        memberName: row.name || row.memberName || 'Thành viên',
        coveredSources: selectedItems.map(paymentItemToCoveredSource),
        coveredItems: selectedItems.flatMap(paymentItemToCoveredItems),
        groupId: row.linkGroupId || row.groupId || '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet title={`Xác nhận TT · ${row?.name || row?.memberName || 'Thành viên'}`} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <Card style={{ padding: 12, borderColor: 'rgba(34,197,94,0.24)', background: 'rgba(34,197,94,0.07)' }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 750 }}>Đang chọn thu</div>
          <div style={{ marginTop: 3, color: '#f8fafc', fontWeight: 950, fontSize: 21, ...type.mono }}>{formatVND(selectedTotal)}</div>
          <div style={{ marginTop: 2, color: '#94a3b8', fontSize: 11 }}>Tick khoản đã thu đủ. Không tick thì chưa trừ nợ.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={requestPaymentSnapshot} disabled={selectedTotal <= 0 || snapshotting} style={{
              minHeight: 36,
              borderRadius: 10,
              background: 'rgba(99,102,241,0.18)',
              border: '1px solid rgba(129,140,248,0.38)',
              color: colors.brandLight,
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: selectedTotal > 0 && !snapshotting ? 'pointer' : 'not-allowed',
              opacity: selectedTotal > 0 && !snapshotting ? 1 : 0.58,
            }}>{snapshotting ? 'Đang chốt...' : 'Chờ nhận tiền'}</button>
            <button type="button" onClick={() => setBillShareOpen(true)} disabled={selectedTotal <= 0} style={{
              minHeight: 36,
              borderRadius: 10,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.34)',
              color: '#fde68a',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: selectedTotal > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedTotal > 0 ? 1 : 0.58,
            }}>Thẻ bill</button>
          </div>
        </Card>

        {hasProfileGroups ? paymentDisplayGroups.map(group => (
          <PaymentItemSection
            key={group.key}
            title={group.title}
            items={group.items}
            checkedKeys={checkedKeys}
            onToggle={toggleItem}
          />
        )) : (
          <>
            <PaymentItemSection
              title={monthLabel || 'Tháng đang xem'}
              items={currentItems}
              checkedKeys={checkedKeys}
              onToggle={toggleItem}
            />

            {previousItems.length > 0 && (
              <PaymentItemSection
                title="Tháng trước"
                items={previousItems}
                checkedKeys={checkedKeys}
                onToggle={toggleItem}
              />
            )}
          </>
        )}

        <button
          type="button"
          disabled={selectedTotal <= 0 || submitting}
          onClick={submit}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 12,
            padding: '12px 14px',
            background: selectedTotal > 0 && !submitting ? '#22c55e' : 'rgba(148,163,184,0.18)',
            color: selectedTotal > 0 && !submitting ? '#052e16' : '#94a3b8',
            fontWeight: 950,
            fontSize: 13,
            cursor: selectedTotal > 0 && !submitting ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          Xác nhận đã thu {formatVND(selectedTotal)}
        </button>

        {billShareOpen && (
          <PaymentBillCardSheet
            memberName={memberName}
            amount={selectedTotal}
            transferDescription={transferDescription}
            qrUrl={qrUrl}
            paymentDisplayGroups={paymentDisplayGroups}
            onClose={() => setBillShareOpen(false)}
          />
        )}
      </div>
    </BottomSheet>
  );
}

function groupPaymentItemsBySource(items) {
  const groups = new Map();
  safeArray(items).forEach(item => {
    const key = `${item.sourceType || 'group'}:${item.sourceId || item.sourceLabel || 'source'}`;
    const existing = groups.get(key) || {
      key,
      label: item.sourceLabel || 'Nguồn tiền',
      items: [],
    };
    existing.items.push(item);
    groups.set(key, existing);
  });
  return [...groups.values()];
}

function PaymentItemSection({ title, items, checkedKeys, onToggle }) {
  const [expanded, setExpanded] = useState(true);
  if (!items.length) return null;
  const groupedItems = groupPaymentItemsBySource(items);
  const sectionTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const sectionTotalColor = sectionTotal > 0 ? '#6ee7b7' : '#fca5a5';
  const profileTitleMatch = /^Các khoản của\s+(.+)$/i.exec(title);
  const profileName = profileTitleMatch?.[1] || '';
  return (
    <div style={{
      display: 'grid',
      gap: expanded ? 10 : 0,
      padding: 10,
      borderRadius: 14,
      border: '1px solid rgba(52,211,153,0.26)',
      background: 'rgba(15,23,42,0.58)',
      boxShadow: 'inset 3px 0 0 rgba(52,211,153,0.22)',
    }}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: 8,
          rowGap: 2,
          width: '100%',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: colors.textPrimary,
          fontFamily: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ minWidth: 0, fontSize: 10, color: '#a7b6cc', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.25 }}>
          {profileName ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
              <span style={{ flexShrink: 0 }}>Các khoản của</span>
              <span style={{
                minWidth: 0,
                maxWidth: '100%',
                padding: '3px 7px',
                borderRadius: 999,
                background: 'rgba(96,165,250,0.16)',
                border: '1px solid rgba(96,165,250,0.42)',
                color: '#bfdbfe',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{profileName}</span>
            </span>
          ) : title}
        </span>
        <span style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1 }}>{expanded ? '⌃' : '⌄'}</span>
        <span style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 950, color: sectionTotalColor, ...type.mono, whiteSpace: 'nowrap' }}>Tổng {signedVND(sectionTotal)}</span>
      </button>
      {expanded && (
        <div style={{ display: 'grid', gap: 11 }}>
          {groupedItems.map(group => {
            const groupTotal = group.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const groupTotalColor = groupTotal > 0 ? '#6ee7b7' : '#fca5a5';
            return (
              <div key={group.key} style={{ display: 'grid', gap: 7 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0, fontSize: 13, color: '#f8fafc', fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 950, color: groupTotalColor, ...type.mono, whiteSpace: 'nowrap' }}>{signedVND(groupTotal)}</div>
                </div>
                <div style={{ display: 'grid', gap: 6, marginLeft: 7, paddingLeft: 12, borderLeft: '4px solid rgba(96,165,250,0.54)' }}>
                  {group.items.map(item => {
                    const checked = checkedKeys.has(item.key);
                    const isCredit = Number(item.amount) > 0;
                    return (
                      <label key={item.key} style={{
                        display: 'grid',
                        gridTemplateColumns: '22px minmax(0,1fr) auto',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 38,
                        padding: '7px 10px',
                        borderRadius: 11,
                        border: `1px solid ${checked ? 'rgba(34,197,94,0.58)' : 'rgba(255,255,255,0.09)'}`,
                        background: checked ? 'rgba(34,197,94,0.13)' : 'rgba(255,255,255,0.045)',
                        cursor: onToggle ? 'pointer' : 'default',
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly={!onToggle}
                          onChange={() => onToggle?.(item.key)}
                          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                        />
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          border: `1.5px solid ${checked ? '#22c55e' : 'rgba(148,163,184,0.48)'}`,
                          background: checked ? '#22c55e' : 'transparent',
                          color: checked ? '#052e16' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 950,
                          lineHeight: 1,
                        }}>✓</span>
                        <span style={{ minWidth: 0, fontSize: 12, color: colors.textSecondary, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.monthLabel || fullMonthLabel(item.month)}</span>
                        <span style={{ fontSize: 12, fontWeight: 950, color: isCredit ? '#6ee7b7' : '#fca5a5', ...type.mono, whiteSpace: 'nowrap' }}>{signedVND(item.amount)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function paymentRowCurrentAmount(row) {
  return Number(row?.payableAmount) || Math.abs(Number(row?.amount) || 0);
}

function sourcePaymentItems(source, { prefix = 'source', memberId = '', profileId = '' } = {}) {
  const sourceType = source.sourceType || source.source_type || 'group';
  const sourceId = source.sourceId || source.source_id || source.groupId || source.group_id || '';
  const sourceLabel = source.sourceLabel || source.source_label || source.label || source.name || 'Nguồn tiền';
  const baseMemberId = source.memberId || source.member_id || memberId || '';
  const baseProfileId = source.profileId || source.profile_id || profileId || '';
  const sourcePayableItems = safeArray(source.payableItems || source.payable_items).map(item => ({
    ...item,
    sourceType: item.sourceType || item.source_type || sourceType,
    sourceId: item.sourceId || item.source_id || sourceId,
    sourceLabel: item.sourceLabel || item.source_label || sourceLabel,
    memberId: item.memberId || item.member_id || baseMemberId,
    profileId: item.profileId || item.profile_id || baseProfileId,
    month: item.month || item.yearMonth || item.year_month || '',
    monthLabel: item.monthLabel || item.month_label || '',
    amount: Number(item.amount) || 0,
    payableItemKey: item.payableItemKey || item.payable_item_key || '',
    expenseId: item.expenseId || item.expense_id || '',
  }));
  const months = safeArray(source.monthBreakdown).length
    ? safeArray(source.monthBreakdown)
    : [{ month: source.month || source.yearMonth || source.year_month || '', label: source.monthLabel || source.month_label || '', amount: source.amount }];
  return months
    .map((row, index) => {
      const month = row.month || row.yearMonth || row.year_month || '';
      const coveredItems = sourcePayableItems.filter(item => !month || String(item.month || '') === String(month));
      return {
        key: `${prefix}:${sourceType}:${sourceId}:${baseMemberId}:${baseProfileId}:${month || index}`,
        sourceType,
        sourceId,
        sourceLabel,
        memberId: baseMemberId,
        profileId: baseProfileId,
        month,
        monthLabel: row.label || row.monthLabel || row.month_label || fullMonthLabel(month),
        amount: Number(row.amount) || 0,
        payableItemKey: coveredItems.length === 1 ? coveredItems[0].payableItemKey : source.payableItemKey || source.payable_item_key || '',
        expenseId: coveredItems.length === 1 ? coveredItems[0].expenseId : source.expenseId || source.expense_id || '',
        coveredItems,
        defaultSelected: true,
      };
    })
    .filter(item => Number(item.amount) !== 0);
}

function paymentItemsAmountDue(items) {
  const total = safeArray(items).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return total < 0 ? Math.abs(total) : 0;
}

function paymentItemsPeriodLabel(items, fallback = '') {
  const months = [...new Set(safeArray(items).map(item => item.monthLabel || fullMonthLabel(item.month)).filter(Boolean))];
  if (months.length === 1) return months[0];
  if (months.length > 1) return months.join(', ');
  return fallback || 'Khoản cần thanh toán';
}

function buildRefundBillData(item) {
  const bank = item?.bank || item?.refundRow?.bank || {};
  const qrBank = resolveVietQrBank(bank);
  const amount = Math.abs(Number(item?.amount) || 0);
  const memberName = item?.memberName || item?.refundRow?.name || item?.refundRow?.memberName || 'Thành viên';
  const monthLabel = item?.monthLabel || fullMonthLabel(item?.month);
  const transferDescription = `Hoan tien ${memberName}${monthLabel ? ` ${monthLabel}` : ''}`.trim();
  const qrUrl = amount > 0 && qrBank && bank.account && bank.holder ? generateQRUrl({
    bankId: qrBank.id,
    account: bank.account,
    accountName: bank.holder,
    amount,
    description: transferDescription,
  }) : '';
  return {
    memberName,
    amount,
    transferDescription,
    qrUrl,
    paymentDisplayGroups: [{
      key: 'refund',
      title: `Các khoản của ${memberName}`,
      items: [item],
      checkedKeys: new Set([item?.key]),
    }],
  };
}

function RefundBankSheet({ item, onAction, onClose, onSaved }) {
  const bank = item?.bank || item?.refundRow?.bank || {};
  const resolvedBank = resolveVietQrBank(bank);
  const memberName = item?.memberName || item?.member_name || item?.refundRow?.name || item?.refundRow?.memberName || item?.refundRow?.member_name || 'Thành viên';
  const bankNameSeed = resolvedBank?.shortName || (String(bank.name || '').trim() === '--' ? '' : bank.name) || (String(bank.code || '').trim() === '--' ? '' : bank.code) || '';
  const [bankName, setBankName] = useState(bankNameSeed);
  const [bankAccount, setBankAccount] = useState(bank.account || '');
  const [bankAccountName, setBankAccountName] = useState(bank.holder || memberName);
  const [saving, setSaving] = useState(false);
  const memberId = item?.memberId || item?.member_id || item?.refundRow?.memberId || item?.refundRow?.member_id || '';
  const profileId = item?.profileId || item?.profile_id || item?.refundRow?.profileId || item?.refundRow?.profile_id || '';
  const knownBank = BANK_LIST.some(row => row.shortName === bankName || row.id === bankName || row.name === bankName);
  const canSave = Boolean(profileId && resolveVietQrBank({ name: bankName }) && bankAccount.trim() && bankAccountName.trim());
  const inputStyle = {
    minHeight: 38,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.22)',
    background: colors.inputBg,
    color: colors.textPrimary,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
  };

  async function submit() {
    if (!canSave || saving) return;
    setSaving(true);
    const savedBank = {
      name: bankName.trim(),
      code: bankName.trim(),
      account: bankAccount.trim(),
      holder: bankAccountName.trim(),
    };
    try {
      await onAction?.('editMember', {
        memberId,
        profileId,
        bankName: savedBank.name,
        bankAccount: savedBank.account,
        bankAccountName: savedBank.holder,
      });
      onSaved?.(savedBank);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title={`Bổ sung STK · ${memberName}`} onClose={onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 5, fontSize: 11, color: colors.textSecondary, fontWeight: 850 }}>
          Ngân hàng
          <select value={bankName} onChange={(event) => setBankName(event.target.value)} style={inputStyle}>
            <option value="">Chọn ngân hàng</option>
            {bankName && !knownBank && <option value={bankName}>{bankName}</option>}
            {BANK_LIST.map(row => <option key={row.id} value={row.shortName}>{row.shortName} · {row.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 11, color: colors.textSecondary, fontWeight: 850 }}>
          Số tài khoản
          <input value={bankAccount} onChange={(event) => setBankAccount(event.target.value)} inputMode="numeric" style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 11, color: colors.textSecondary, fontWeight: 850 }}>
          Chủ tài khoản
          <input value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} style={inputStyle} />
        </label>
        <button type="button" onClick={submit} disabled={!canSave || saving} style={{
          minHeight: 40,
          borderRadius: 11,
          border: 'none',
          background: canSave && !saving ? '#22c55e' : 'rgba(148,163,184,0.18)',
          color: canSave && !saving ? '#052e16' : '#94a3b8',
          fontSize: 13,
          fontWeight: 950,
          fontFamily: 'inherit',
          cursor: canSave && !saving ? 'pointer' : 'not-allowed',
        }}>{saving ? 'Đang lưu...' : 'Lưu STK nhận hoàn'}</button>
      </div>
    </BottomSheet>
  );
}

function billQrOnlyUrl(value) {
  return String(value || '').replace(/-compact2\.(png|jpg|jpeg)(?=(?:\?|$))/i, '-qr_only.$1');
}

function PaymentBillCardContent({ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, selectable = false, actions = null, qrFallbackAction = null, caption = 'Cần chuyển cho thủ quỹ', amountColor = '#fca5a5' }) {
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const displayQrUrl = billQrOnlyUrl(qrUrl);
  const groups = safeArray(paymentDisplayGroups)
    .map(group => ({ ...group, items: selectable ? group.items : group.items.filter(item => group.checkedKeys?.has?.(item.key)) }))
    .filter(group => group.items.length > 0);

  return (
    <Card style={{ padding: 14, borderColor: 'rgba(96,165,250,0.30)', background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92))' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', maxWidth: '100%', padding: '4px 9px', borderRadius: 999, background: 'rgba(96,165,250,0.16)', border: '1px solid rgba(96,165,250,0.42)', color: '#bfdbfe', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberName}</div>
          <div style={{ marginTop: 7, fontSize: 26, fontWeight: 950, color: amountColor, ...type.mono }}>{formatVND(amount)}</div>
          <div style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary, fontWeight: 800 }}>{caption}</div>
        </div>
        {displayQrUrl ? (
          <button type="button" aria-label="Phóng to QR thanh toán" onClick={() => setQrPreviewOpen(true)} style={{ width: 128, height: 128, padding: 5, boxSizing: 'border-box', border: 0, borderRadius: 14, background: '#fff', cursor: 'pointer', overflow: 'hidden' }}>
            <img data-bill-qr="true" src={displayQrUrl} alt="QR thanh toán" style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6, objectFit: 'contain' }} />
          </button>
        ) : (
          <div style={{ width: 128, minHeight: 128, padding: 5, boxSizing: 'border-box', borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'grid', gap: 6, alignContent: 'center', justifyItems: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: 800, textAlign: 'center' }}>
            <div>Chưa có QR</div>
            {qrFallbackAction && <div data-bill-ui-only="true">{qrFallbackAction}</div>}
          </div>
        )}
      </div>

      {actions && <div style={{ marginTop: 10 }}>{actions}</div>}

      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        {groups.map(group => {
          const selectedItems = group.items.filter(item => group.checkedKeys?.has?.(item.key));
          const profileName = /^Các khoản của\s+(.+)$/i.exec(group.title)?.[1] || group.title;
          return (
            <div key={group.key} style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 13, background: 'rgba(15,23,42,0.62)', border: '1px solid rgba(96,165,250,0.24)', boxShadow: 'inset 3px 0 0 rgba(96,165,250,0.52)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ fontSize: 10, color: '#bfdbfe', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>Các khoản của</span>
                <span style={{ minWidth: 0, maxWidth: '100%', padding: '2px 7px', borderRadius: 999, background: 'rgba(96,165,250,0.22)', border: '1px solid rgba(147,197,253,0.48)', color: '#eff6ff', fontSize: 10, fontWeight: 950, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileName}</span>
              </div>
              {groupPaymentItemsBySource(selectable ? group.items : selectedItems).map(sourceGroup => {
                const sourceTotal = sourceGroup.items
                  .filter(item => !selectable || group.checkedKeys?.has?.(item.key))
                  .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                return (
                  <div key={sourceGroup.key} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
                      <div style={{ minWidth: 0, fontSize: 12, fontWeight: 950, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sourceGroup.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 950, color: sourceTotal > 0 ? '#6ee7b7' : '#fca5a5', ...type.mono, whiteSpace: 'nowrap' }}>{signedVND(sourceTotal)}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 5, marginLeft: 7, paddingLeft: 10, borderLeft: '3px solid rgba(148,163,184,0.38)' }}>
                      {sourceGroup.items.map(item => {
                        const checked = group.checkedKeys?.has?.(item.key);
                        const selectableItem = selectable && group.onToggle;
                        const ItemRow = selectableItem ? 'label' : 'div';
                        return (
                          <ItemRow key={item.key} style={{
                            display: 'grid',
                            gridTemplateColumns: selectableItem ? '20px minmax(0,1fr) auto' : 'minmax(0,1fr) auto',
                            gap: 8,
                            alignItems: 'center',
                            minHeight: selectableItem ? 36 : 'auto',
                            padding: selectableItem ? '5px 7px' : 0,
                            borderRadius: selectableItem ? 9 : 0,
                            border: selectableItem ? `1px solid ${checked ? 'rgba(34,197,94,0.52)' : 'rgba(255,255,255,0.08)'}` : 'none',
                            background: selectableItem && checked ? 'rgba(34,197,94,0.12)' : 'transparent',
                            cursor: selectableItem ? 'pointer' : 'default',
                          }}>
                            {selectableItem && (
                              <>
                                <input type="checkbox" checked={checked} onChange={() => group.onToggle(item.key)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                                <span style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 5,
                                  border: `1.5px solid ${checked ? '#22c55e' : 'rgba(148,163,184,0.48)'}`,
                                  background: checked ? '#22c55e' : 'transparent',
                                  color: checked ? '#052e16' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 950,
                                }}>✓</span>
                              </>
                            )}
                            <span style={{ minWidth: 0, fontSize: 11, color: colors.textSecondary, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.monthLabel || fullMonthLabel(item.month) || 'Không rõ tháng'}</span>
                            <span style={{ fontSize: 11, fontWeight: 950, color: Number(item.amount) > 0 ? '#6ee7b7' : '#fca5a5', ...type.mono, whiteSpace: 'nowrap' }}>{signedVND(item.amount)}</span>
                          </ItemRow>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {qrPreviewOpen && (
        <BottomSheet title="QR thanh toán" onClose={() => setQrPreviewOpen(false)}>
          <div style={{ display: 'grid', justifyItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 380, padding: 10, boxSizing: 'border-box', borderRadius: 18, background: '#fff' }}>
              <img src={displayQrUrl} alt="QR thanh toán phóng to" style={{ width: '100%', aspectRatio: '1 / 1', display: 'block', borderRadius: 8, objectFit: 'contain' }} />
            </div>
          </div>
        </BottomSheet>
      )}
    </Card>
  );
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function waitForElementImages(element) {
  const images = [...element.querySelectorAll('img')];
  return Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function drawBillQrOnImage(dataUrl, cardElement, qrDataUrl) {
  const qrElement = cardElement?.querySelector?.('[data-bill-qr]');
  if (!qrElement || !String(qrDataUrl || '').startsWith('data:')) return dataUrl;

  const cardRect = cardElement.getBoundingClientRect();
  const qrRect = qrElement.getBoundingClientRect();
  if (!cardRect.width || !cardRect.height || !qrRect.width || !qrRect.height) return dataUrl;

  const [baseImage, qrImage] = await Promise.all([loadImage(dataUrl), loadImage(qrDataUrl)]);
  const canvas = document.createElement('canvas');
  canvas.width = baseImage.naturalWidth || baseImage.width;
  canvas.height = baseImage.naturalHeight || baseImage.height;
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  context.drawImage(baseImage, 0, 0);
  const scaleX = canvas.width / cardRect.width;
  const scaleY = canvas.height / cardRect.height;
  const x = (qrRect.left - cardRect.left) * scaleX;
  const y = (qrRect.top - cardRect.top) * scaleY;
  const width = qrRect.width * scaleX;
  const height = qrRect.height * scaleY;
  context.drawImage(qrImage, x, y, width, height);
  return canvas.toDataURL('image/png');
}

function PaymentBillCardSheet({ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, caption = 'Cần chuyển cho thủ quỹ', amountColor = '#fca5a5', footerActions = null, onClose }) {
  const cardRef = useRef(null);
  const [sharingImage, setSharingImage] = useState(false);
  const sourceQrUrl = billQrOnlyUrl(qrUrl);
  const [billQrUrl, setBillQrUrl] = useState(sourceQrUrl);
  const [preparingQr, setPreparingQr] = useState(Boolean(sourceQrUrl));
  const billFilename = `${safeFilename(memberName || 'bill')}-bill.png`;
  const fallbackBillFilename = `${safeFilename(memberName || 'bill')}-bill.svg`;

  useEffect(() => {
    let cancelled = false;
    if (!sourceQrUrl) {
      setBillQrUrl('');
      setPreparingQr(false);
      return () => { cancelled = true; };
    }
    if (String(sourceQrUrl).startsWith('data:')) {
      setBillQrUrl(sourceQrUrl);
      setPreparingQr(false);
      return () => { cancelled = true; };
    }
    setBillQrUrl(sourceQrUrl);
    setPreparingQr(true);
    fetch(sourceQrUrl)
      .then(response => {
        if (!response.ok) throw new Error('QR download failed');
        return response.blob();
      })
      .then(blob => readBlobAsDataUrl(blob))
      .then(dataUrl => {
        if (!cancelled) setBillQrUrl(dataUrl || sourceQrUrl);
      })
      .catch(() => {
        if (!cancelled) setBillQrUrl(sourceQrUrl);
      })
      .finally(() => {
        if (!cancelled) setPreparingQr(false);
      });
    return () => { cancelled = true; };
  }, [sourceQrUrl]);

  async function shareBillImage() {
    const billQrReady = !sourceQrUrl || String(billQrUrl || '').startsWith('data:');
    if (!cardRef.current || sharingImage || preparingQr || !billQrReady) return;
    setSharingImage(true);
    try {
      await waitForElementImages(cardRef.current);
      const capturedDataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: colors.shellBg, filter: node => node?.getAttribute?.('data-bill-ui-only') !== 'true' });
      const dataUrl = await drawBillQrOnImage(capturedDataUrl, cardRef.current, billQrUrl);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], billFilename, { type: 'image/png' });
      if (navigator?.share && navigator?.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        return;
      }
      triggerDownload(dataUrl, billFilename);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        const fallbackBlob = buildElementImageBlob(cardRef.current);
        const fallbackUrl = URL.createObjectURL(fallbackBlob);
        triggerDownload(fallbackUrl, fallbackBillFilename);
        setTimeout(() => URL.revokeObjectURL(fallbackUrl), 1000);
      }
    } finally {
      setSharingImage(false);
    }
  }

  const billQrReady = !sourceQrUrl || String(billQrUrl || '').startsWith('data:');
  const shareDisabled = sharingImage || preparingQr || !billQrReady;

  return (
    <BottomSheet title="Thẻ bill" onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div ref={cardRef}>
          <PaymentBillCardContent
            memberName={memberName}
            amount={amount}
            transferDescription={transferDescription}
            qrUrl={billQrUrl}
            paymentDisplayGroups={paymentDisplayGroups}
            caption={caption}
            amountColor={amountColor}
            qrFallbackAction={footerActions}
          />
        </div>
        <button type="button" onClick={shareBillImage} disabled={shareDisabled} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: 38,
          borderRadius: 11,
          border: '1px solid rgba(96,165,250,0.36)',
          background: 'rgba(96,165,250,0.14)',
          color: '#bfdbfe',
          fontSize: 12,
          fontWeight: 950,
          fontFamily: 'inherit',
          cursor: !shareDisabled ? 'pointer' : 'default',
          opacity: !shareDisabled ? 1 : 0.7,
        }}>{preparingQr ? 'Đang chuẩn bị QR...' : !billQrReady ? 'Chưa chuẩn bị được QR' : sharingImage ? 'Đang share...' : 'Share ảnh'}</button>
        <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.45, textAlign: 'center' }}>Máy không hỗ trợ share ảnh thì app tự tải PNG.</div>
      </div>
    </BottomSheet>
  );
}

function buildElementImageBlob(element) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(element.scrollHeight || rect.height);
  const clone = element.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  clone.querySelectorAll('[data-bill-ui-only="true"]').forEach(node => node.remove());
  Object.assign(clone.style, {
    width: `${width}px`,
    minHeight: `${height}px`,
    boxSizing: 'border-box',
    fontFamily: type.family,
    color: colors.textPrimary,
    background: colors.shellBg,
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`;
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function safeFilename(value) {
  return String(value || 'bill')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'bill';
}

function signedVND(value) {
  const amount = Number(value) || 0;
  if (amount === 0) return formatVND(0);
  return `${amount > 0 ? '+' : '-'}${formatVND(Math.abs(amount))}`;
}

function paymentItemToCoveredSource(item) {
  return {
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    memberId: item.memberId,
    profileId: item.profileId,
    memberName: item.memberName,
    month: item.month,
    monthLabel: item.monthLabel,
    amount: item.amount,
    monthBreakdown: item.month ? [{ month: item.month, label: item.monthLabel, amount: item.amount }] : [],
  };
}

function paymentItemToCoveredItems(item) {
  const items = safeArray(item.coveredItems || item.covered_items);
  const rows = items.length ? items : [item];
  return rows.map(row => ({
    payableItemKey: row.payableItemKey || row.payable_item_key || item.payableItemKey || '',
    sourceType: row.sourceType || row.source_type || item.sourceType,
    sourceId: row.sourceId || row.source_id || item.sourceId,
    sourceLabel: row.sourceLabel || row.source_label || item.sourceLabel,
    expenseId: row.expenseId || row.expense_id || item.expenseId || '',
    memberId: row.memberId || row.member_id || item.memberId,
    profileId: row.profileId || row.profile_id || item.profileId,
    memberName: row.memberName || row.member_name || item.memberName,
    month: row.month || row.yearMonth || row.year_month || item.month,
    monthLabel: row.monthLabel || row.month_label || item.monthLabel,
    amount: Number(row.amount) || 0,
  })).filter(row => row.payableItemKey || row.amount);
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

function MultiMemberQRSheet({ members, paymentTarget, onClose }) {
  // When multiple members: combine into 1 QR
  // When single member: show that member's QR
  
  const isCombined = members.length > 1;
  
  // Calculate total and generate short description
  let totalAmount = 0;
  let shortNames = '';
  
  if (isCombined) {
    totalAmount = members.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    // Take first 2 names, join with ' + '
    const names = members.slice(0, 2).map(m => m.name);
    shortNames = names.join(' + ');
    if (members.length > 2) shortNames += ` (+${members.length - 2})`;
    // Truncate to max 30 chars
    if (shortNames.length > 30) {
      shortNames = shortNames.substring(0, 27) + '...';
    }
  }
  
  const currentAmount = isCombined ? totalAmount : (members[0]?.amount || 0);
  const currentName = isCombined ? shortNames : members[0]?.name;
  const description = isCombined 
    ? `Spliteasy ${shortNames}`
    : `Spliteasy ${members[0]?.name}`;
  
  const canShowQr = paymentTarget?.code && paymentTarget?.account && paymentTarget?.holder && currentAmount > 0;
  
  let qrUrl = '';
  if (canShowQr) {
    try {
      qrUrl = generateQRUrl({
        bankId: paymentTarget.code,
        account: paymentTarget.account,
        accountName: paymentTarget.holder,
        amount: currentAmount,
        description: description,
      });
    } catch (err) {
      // Silently fail if QR generation doesn't work
    }
  }

  const [saving, setSaving] = useState(false);
  const handleDownload = async () => {
    if (!qrUrl) return;
    setSaving(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vietqr-thanh-toan-${currentName || 'spliteasy'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose?.();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      title={`QR thanh toán${isCombined ? ` · ${members.length} người` : ''}`}
      onClose={onClose}
    >
      {/* Total amount — center, large */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171' }}>
            {currentAmount?.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* QR */}
        {canShowQr ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img
              src={qrUrl}
              alt="QR thanh toán"
              width={210}
              height={210}
              style={{ borderRadius: 12 }}
            />
            
            {/* List members with their amounts when combined */}
            {isCombined && (
              <div style={{ width: '100%', fontSize: 13, color: '#cbd5e1', textAlign: 'center', marginTop: 8 }}>
                {members.map((m, i) => (
                  <div key={i} style={{ padding: '4px 0' }}>
                    {m.name} · {(Number(m.amount) || 0)?.toLocaleString('vi-VN')} đ
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={handleDownload}
              disabled={saving}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#f8fafc',
                fontSize: 13,
                cursor: saving ? 'default' : 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Đang tải...' : 'Tải QR'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
            Chưa có thông tin ngân hàng để tạo QR
          </div>
        )}
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

function DashboardSection({ title, subtitle, amount, icon, color, amountPrefix = '', expanded, onToggle, listScroll = false, headerRight, collapsible = true, children }) {
  const headerInner = (
    <>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}20`, border: `1px solid ${color}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        <div style={{ fontSize: 11, fontWeight: 900, color, marginTop: 1, ...type.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{amountPrefix}{formatVND(amount)}</div>
      </div>
      {collapsible && <div style={{ fontSize: 16, color, lineHeight: 1, flexShrink: 0 }}>{expanded ? '⌃' : '⌄'}</div>}
    </>
  );
  const headerStyle = { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: 'transparent', border: 'none', color: 'inherit', cursor: collapsible ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' };
  return (
    <section style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33` }}>
        {collapsible
          ? <button type="button" aria-expanded={expanded} onClick={onToggle} style={headerStyle}>{headerInner}</button>
          : <div style={headerStyle}>{headerInner}</div>
        }
        {headerRight && (
          <div style={{ flexShrink: 0, paddingRight: 8 }}>{headerRight}</div>
        )}
      </div>
      {expanded && (
        <div
          className={listScroll ? 'screen-scroll' : undefined}
          style={{ display: 'grid', gap: 5, marginTop: 6, minWidth: 0, ...(listScroll ? { maxHeight: 340, overflowY: 'auto', paddingRight: 2 } : {}) }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

function PaymentDashboardRow({ row, tone = 'unpaid', sign, arrow = '', onSelect, children }) {
  const color = tone === 'refund' || tone === 'confirmed' ? '#6ee7b7' : tone === 'pending' ? '#fcd34d' : '#fca5a5';
  const displaySign = sign !== undefined ? sign : (tone === 'refund' ? '+' : tone === 'confirmed' ? '' : '-');
  const childArray = React.Children.toArray(children);
  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        minWidth: 0,
        cursor: onSelect ? 'pointer' : 'default',
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); }
      } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{row.memberName || row.name}</div>
        <div style={{ fontSize: 12, fontWeight: 950, color, ...type.mono, whiteSpace: 'nowrap', flexShrink: 0 }}>{displaySign}{formatVND(Math.abs(Number(row.amount) || 0))}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 }} onClick={event => event.stopPropagation()}>
        <div style={{ fontSize: 10, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{row.sourceSummary || row.monthLabel || ''}</div>
        {childArray.length > 0 ? (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>{childArray}</div>
        ) : arrow ? (
          <div style={{ color: colors.textMuted, fontSize: 15, flexShrink: 0 }}>{arrow}</div>
        ) : null}
      </div>
    </div>
  );
}

function miniDashButton(background, color) {
  return { border: 'none', borderRadius: 7, padding: '4px 7px', background, color, fontSize: 10, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };
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

function fullMonthLabel(yearMonth) {
  const [year, month] = String(yearMonth || '').split('-');
  const monthNumber = Number(month);
  return year && monthNumber ? `Tháng ${monthNumber} · ${year}` : '';
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
  const paymentStatusLabel = tx.isComplete && (isTreasurer || !tx.isPaid)
    ? '✓ Đã hoàn thành'
    : tx.isPaid ? '✓ Đã thanh toán' : '';
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
        padding: '12px 8px',
        borderBottom: last ? 'none' : `1px solid rgba(255,255,255,0.04)`,
        cursor: 'pointer',
        ...(paymentStatusLabel ? {
          background: 'rgba(52,211,153,0.07)',
          borderRadius: 10,
          margin: '0 -8px',
        } : {}),
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
        {paymentStatusLabel && (
          <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', padding: '2px 7px', borderRadius: 20 }}>{paymentStatusLabel}</span>
        )}
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
      background: 'rgba(251,191,36,0.14)',
      border: '1px solid rgba(251,191,36,0.4)',
      borderLeft: '4px solid #fbbf24',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.5)' }}>
          ⚠️ {label} chưa trả ·
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
          background: 'rgba(251,191,36,0.25)',
          border: '1px solid rgba(251,191,36,0.5)',
          color: colors.warning,
          fontSize: 11,
          fontWeight: 900,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Xem →
      </button>
    </div>
  )
}

function PendingTicketsBanner({ items = [], count, totalAmount, onNavigate, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [savingTicketId, setSavingTicketId] = useState('')
  if (!count) return null

  async function approveTicket(ticket) {
    if (savingTicketId) return
    setSavingTicketId(ticket.id)
    try {
      await onAction?.('approveTicket', { ticketId: ticket.id, status: ticket.approveStatus })
    } finally {
      setSavingTicketId('')
    }
  }

  async function deleteTicket(ticket) {
    if (savingTicketId) return
    setSavingTicketId(ticket.id)
    try {
      await onAction?.('deleteTicket', { ticketId: ticket.id })
    } finally {
      setSavingTicketId('')
    }
  }

  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.38)',
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: 0,
          background: 'transparent',
          border: 0,
          color: 'inherit',
          fontFamily: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Vé lẻ chờ duyệt
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, marginTop: 2 }}>
            {count} lượt · {totalAmount > 0 ? totalAmount.toLocaleString('vi-VN') + 'đ' : ''}
          </div>
        </div>
        <span style={{ fontSize: 18, color: '#fbbf24', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {items.map(ticket => {
            const saving = savingTicketId === ticket.id
            const total = Number(ticket.totalAmount) || 0
            const perPerson = Number(ticket.amountPerPerson) || 0
            return (
              <div
                key={ticket.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: colors.textPrimary }}>
                      {ticket.dateLabel || ticket.date || 'Chưa có ngày'}{ticket.time ? ` · ${ticket.time}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 1.45 }}>
                      {ticket.memberLabel || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 1.45 }}>
                      {ticket.advancerName ? `${ticket.advancerName} ứng` : 'Quỹ team trả'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: colors.textPrimary }}>
                      {total.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3 }}>
                      {perPerson.toLocaleString('vi-VN')}đ/người
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => approveTicket(ticket)}
                    disabled={Boolean(savingTicketId)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(52,211,153,0.45)',
                      background: 'rgba(52,211,153,0.16)',
                      color: '#6ee7b7',
                      fontSize: 12,
                      fontWeight: 900,
                      fontFamily: 'inherit',
                      cursor: savingTicketId ? 'not-allowed' : 'pointer',
                      opacity: savingTicketId && !saving ? 0.55 : 1,
                    }}
                  >
                    {saving ? 'Đang lưu…' : 'Duyệt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTicket(ticket)}
                    disabled={Boolean(savingTicketId)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(248,113,113,0.45)',
                      background: 'rgba(248,113,113,0.14)',
                      color: '#fca5a5',
                      fontSize: 12,
                      fontWeight: 900,
                      fontFamily: 'inherit',
                      cursor: savingTicketId ? 'not-allowed' : 'pointer',
                      opacity: savingTicketId && !saving ? 0.55 : 1,
                    }}
                  >
                    {saving ? 'Đang lưu…' : 'Xóa'}
                  </button>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={onNavigate}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(251,191,36,0.32)',
              background: 'rgba(251,191,36,0.1)',
              color: '#fbbf24',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Xem lịch pickleball
          </button>
        </div>
      )}
    </div>
  )
}
