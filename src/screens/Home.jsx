// Spliteasy Boss — Trang chủ
// Props: data { user, monthLabel, totalBalance, owedTo, pickleball, groups, todaySession, transactions[] }

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Card,
  SectionLabel, SearchInput, SectionHeader, ListCard, BottomSheet,
} from '../primitives';
import { BANK_LIST, generateQRUrl } from '../lib/vietqr.js';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'declined', label: 'Từ chối' },
];

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'court', label: 'Tiền sân' },
  { key: 'water', label: 'Tiền nước' },
  { key: 'other', label: 'Khác' },
];

export default function Home({ data, isTreasurer, paymentOpen = false, onPaymentClose, onAction }) {
  const d = data || DEMO;
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(true);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [confirmedRefunds, setConfirmedRefunds] = useState(() => new Set());
  const isNeg = d.totalBalance < 0;
  const balanceLabel = isNeg ? 'Bạn cần nộp quỹ' : d.totalBalance > 0 ? 'Quỹ cần bù bạn' : 'Đã cân bằng';
  const normalizedFilter = filterText.trim().toLowerCase();
  const pendingExpenses = d.pendingExpenses || [];
  const visibleTransactions = d.transactions.filter(tx => {
    const titleMatches = !normalizedFilter || String(tx.title || '').toLowerCase().includes(normalizedFilter);
    const statusMatches = statusFilter === 'all' || transactionStatus(tx) === statusFilter;
    const categoryMatches = categoryFilter === 'all' || transactionCategoryGroup(tx) === categoryFilter;
    const mineMatches = !mineOnly || transactionBelongsToCurrentUser(tx, d.currentUserId);
    return titleMatches && statusMatches && categoryMatches && mineMatches;
  });

  return (
    <PhoneFrame>
      <Screen style={{ paddingBottom: '72px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <div>
            <h1 style={{ ...type.title }}>Xin chào, {d.user.firstName} 👋</h1>
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
              {d.user.dateLabel}
            </div>
          </div>
          <IconButton dot={d.user.hasNotifications} onClick={() => onAction?.('notifications')}>🔔</IconButton>
        </div>

        <MonthNav label={d.monthLabel} onPrev={() => onAction?.('monthPrev')} onNext={() => onAction?.('monthNext')} />

        <SourceBreakdown
          sources={d.sourceBreakdown || []}
          totalBalance={d.totalBalance}
          balanceLabel={balanceLabel}
          owedTo={d.owedTo}
          onOpenPayment={() => setPaymentSheetOpen(true)}
          onAction={onAction}
        />

        <PendingApprovalZone expenses={pendingExpenses} onAction={onAction} />

        <SectionHeader action="Xem tất cả →">Giao dịch gần đây</SectionHeader>
        <SearchInput
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Tìm chi tiêu..."
          style={{ marginBottom: 8 }}
        />
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 8,
        }}>
          <button
            type="button"
            onClick={() => setMineOnly(value => !value)}
            style={{
              flex: '0 0 auto',
              padding: '7px 11px',
              borderRadius: 100,
              border: `1px solid ${mineOnly ? 'rgba(52,211,153,0.55)' : colors.borderSubtle}`,
              background: mineOnly ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.03)',
              color: mineOnly ? '#6ee7b7' : colors.textSecondary,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >Của tôi</button>
          {STATUS_FILTERS.map(filter => {
            const active = statusFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                style={{
                  flex: '0 0 auto',
                  padding: '7px 11px',
                  borderRadius: 100,
                  border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : colors.borderSubtle}`,
                  background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  color: active ? colors.brandLight : colors.textSecondary,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginBottom: 10 }}>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 12px',
              background: colors.inputBg,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 12,
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          >
            {CATEGORY_FILTERS.map(filter => (
              <option key={filter.key} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </div>
        <ListCard>
          {visibleTransactions.length > 0 ? visibleTransactions.map((tx, i) => (
            <ActivityRow
              key={tx.id}
              tx={tx}
              last={i === visibleTransactions.length - 1}
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
        isTreasurer={isTreasurer}
        confirmedRefunds={confirmedRefunds}
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

      <TabBar active="home" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function PendingApprovalZone({ expenses, onAction }) {
  const [expanded, setExpanded] = useState(false);
  if (!expenses.length) return null;
  const totalAmount = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  return (
    <section style={{ marginTop: 14 }}>
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
            Cần duyệt · {expenses.length} chi tiêu
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
          {expenses.map(expense => (
            <div key={expense.id} style={{
              padding: 10,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(245,158,11,0.18)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.title}</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                    {expense.groupName} · {expense.submittedByName || 'Thành viên'} gửi
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6, color: '#fcd34d', ...type.mono }}>{formatVND(expense.amount)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 78, flexShrink: 0 }}>
                  <button type="button" onClick={() => onAction?.('approveExpense', { expenseId: expense.id, groupId: expense.groupId })} style={approvalButton('#22c55e', '#052e16')}>Duyệt</button>
                  <button type="button" onClick={() => onAction?.('rejectExpense', { expenseId: expense.id, groupId: expense.groupId })} style={approvalButton(colors.danger, '#fff')}>Từ chối</button>
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

function SourceBreakdown({ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, onOpenPayment, onAction }) {
  if (!safeArray(sources).length) return null;
  const total = sources.reduce((sum, source) => sum + (Number(source.amount) || 0), 0);
  const isNegativeTotal = totalBalance < 0;
  const isPositiveTotal = totalBalance > 0;
  return (
    <>
      <SectionLabel>Theo nguồn tiền</SectionLabel>
      <Card style={{ padding: '14px 14px 6px' }}>
        <button
          type="button"
          aria-label={isNegativeTotal ? `Xem ${owedTo} quỹ cần kiểm tra` : 'Xem nguồn tiền'}
          onClick={(event) => { event.stopPropagation(); onOpenPayment?.(); }}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            padding: '0 0 12px',
            marginBottom: 8,
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
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
                {balanceLabel}
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
              background: isNegativeTotal ? 'rgba(248,113,113,0.16)' : 'rgba(52,211,153,0.16)',
              border: `1px solid ${isNegativeTotal ? 'rgba(248,113,113,0.32)' : 'rgba(52,211,153,0.32)'}`,
              color: isNegativeTotal ? '#fca5a5' : '#6ee7b7',
              fontSize: 12,
              fontWeight: 900,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              💳 Thanh toán
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: -2 }}>
            Tổng hợp tất cả nguồn tiền tháng này
          </div>
        </button>
        {sources.map((source, index) => {
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

function PaymentSheet({ open, data, isTreasurer, confirmedRefunds, onConfirmRefund, onClose }) {
  const [copiedPayment, setCopiedPayment] = useState(false);
  if (!open) return null;
  const netBalance = Number(data?.netBalance) || 0;
  const target = data?.paymentTarget || {};
  const qrBank = resolveVietQrBank(target);
  const amountToPay = Math.max(0, Math.abs(netBalance));
  const canShowQr = netBalance < 0 && qrBank && target.account && target.holder;
  const transferDescription = `${data?.memberName || 'Thanh vien'} - Thanh toan ${data?.monthLabel || ''}`.trim();
  const qrUrl = canShowQr ? generateQRUrl({
    bankId: qrBank.id,
    account: target.account,
    accountName: target.holder,
    amount: amountToPay,
    description: transferDescription,
  }) : '';
  const paymentInfo = [
    `So tien: ${formatVND(amountToPay)}`,
    `Nguoi nhan: ${target.holder || 'Long'}`,
    target.name || target.code ? `Ngan hang: ${target.name || target.code}` : '',
    target.account ? `STK: ${target.account}` : '',
    `Noi dung: ${transferDescription}`,
  ].filter(Boolean).join('\n');
  const copyPaymentInfo = async () => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(paymentInfo);
    setCopiedPayment(true);
  };

  return (
    <BottomSheet title="Thanh toán" onClose={onClose}>
      {netBalance < 0 && (
        <Card style={{ padding: 14, borderColor: canShowQr ? 'rgba(52,211,153,0.28)' : 'rgba(251,191,36,0.28)' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Thanh toán về thủ quỹ
          </div>
          <div style={{ fontSize: 28, fontWeight: 950, color: '#fca5a5', marginTop: 6, ...type.mono }}>
            {formatVND(amountToPay)}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
            Chuyển về {target.holder || 'Long'} · {target.name || target.code || 'Ngân hàng'} {target.account ? `· ${target.account}` : ''}
          </div>
          {canShowQr && (
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, lineHeight: 1.4 }}>
              Nội dung: {transferDescription}
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
                    background: 'rgba(52,211,153,0.16)',
                    border: '1px solid rgba(52,211,153,0.32)',
                    color: '#6ee7b7',
                    fontSize: 12,
                    fontWeight: 900,
                    textDecoration: 'none',
                  }}
                >Lưu QR</a>
                <button type="button" onClick={copyPaymentInfo} style={{
                  minHeight: 42,
                  borderRadius: 12,
                  background: copiedPayment ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copiedPayment ? 'rgba(129,140,248,0.38)' : 'rgba(255,255,255,0.12)'}`,
                  color: copiedPayment ? colors.brandLight : colors.textPrimary,
                  fontSize: 12,
                  fontWeight: 900,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}>{copiedPayment ? 'Đã sao chép' : 'Sao chép STK'}</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.45, fontWeight: 700, marginTop: 10 }}>
              Chưa có đủ thông tin ngân hàng của thủ quỹ. Nhờ Long cập nhật STK trong tab cá nhân.
            </div>
          )}
        </Card>
      )}

      {netBalance >= 0 && (
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
        </Card>
      )}

      {isTreasurer && safeArray(data?.refundRows).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <SectionLabel>Cần hoàn tiền</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {safeArray(data.refundRows).map(row => {
              const key = String(row.profileId || row.name || 'member');
              const done = confirmedRefunds?.has?.(key);
              return (
                <Card key={key} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: colors.textPrimary }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                      {row.bank?.name || 'Chưa có ngân hàng'} {row.bank?.account ? `· ${row.bank.account}` : ''}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 950, color: '#6ee7b7', marginTop: 5, ...type.mono }}>{formatVND(row.amount)}</div>
                  </div>
                  <button type="button" onClick={() => onConfirmRefund?.(row)} disabled={done} style={{
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 10px',
                    background: done ? 'rgba(52,211,153,0.18)' : colors.brand,
                    color: done ? '#6ee7b7' : '#fff',
                    fontSize: 11,
                    fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: done ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}>{done ? 'Đã chuyển' : 'Xác nhận'}</button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  );
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

function transactionBelongsToCurrentUser(tx, currentUserId) {
  if (tx?.isMine === true) return true;

  const memberId = tx.currentMemberId || currentUserId;
  if (!memberId) return false;
  if (String(tx?.paidBy || '') === String(memberId)) return true;

  return safeArray(tx?.participants).some(id => String(id) === String(memberId))
    || safeArray(tx?.splits).some(split => String(split.memberId || split.member_id) === String(memberId));
}

function ActivityRow({ tx, last, onView }) {
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
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
          {tx.subtitle} · {tx.dateLabel}
        </div>
      </div>
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
