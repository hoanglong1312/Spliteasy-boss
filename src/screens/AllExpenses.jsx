import React, { useMemo, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, IconButton, SearchInput, ListCard } from '../primitives';

export default function AllExpenses({ data, isTreasurer, onAction }) {
  const d = data || { transactions: [], currentUserId: '' };
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(true);

  const groupedTransactions = useMemo(() => {
    const matcher = makeMatcher(filterText);
    const visible = safeArray(d.transactions).filter(tx => {
      const searchText = `${tx.title || ''} ${tx.subtitle || ''} ${tx.payerName || ''} ${tx.participantNames || ''}`.toLowerCase();
      const textMatches = matcher(searchText);
      const statusMatches = statusFilter === 'all' || tx.status === statusFilter;
      const mineMatches = !mineOnly || transactionBelongsToCurrentUser(tx, d.currentUserId);
      return textMatches && statusMatches && mineMatches;
    });

    return visible.reduce((groups, tx) => {
      const key = monthKey(tx.date || tx.dateLabel);
      const group = groups.find(item => item.key === key);
      if (group) {
        group.transactions.push(tx);
      } else {
        groups.push({ key, label: monthLabel(tx.date || tx.dateLabel), transactions: [tx] });
      }
      return groups;
    }, []);
  }, [d.transactions, d.currentUserId, filterText, statusFilter, mineOnly]);

  const isEmpty = groupedTransactions.length === 0;

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 16px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <h1 style={{ ...type.title, margin: 0 }}>Tất cả chi tiêu</h1>
        </div>

        <SearchInput
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Tìm chi tiêu..."
          style={{ marginBottom: 8 }}
        />
        {isTreasurer && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setMineOnly(value => !value)}
              style={{
                flex: '0 0 auto',
                padding: '7px 13px',
                borderRadius: 10,
                border: `1px solid ${mineOnly ? 'rgba(52,211,153,0.55)' : colors.borderSubtle}`,
                background: mineOnly ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.03)',
                color: mineOnly ? '#6ee7b7' : colors.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >Của tôi</button>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                style={{
                  flex: '0 0 auto',
                  padding: '7px 13px',
                  borderRadius: 10,
                  border: `1px solid ${statusFilter === f.key ? 'rgba(99,102,241,0.55)' : colors.borderSubtle}`,
                  background: statusFilter === f.key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: statusFilter === f.key ? colors.brandLight : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >{f.label}</button>
            ))}
          </div>
        )}

        {isEmpty ? (
          <ListCard>
            <div style={{ padding: '14px 0', fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Không có giao dịch nào
            </div>
          </ListCard>
        ) : groupedTransactions.map(group => (
          <div key={group.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: colors.textSecondary, marginBottom: 8 }}>
              {group.label}
            </div>
            <ListCard>
              {group.transactions.map((tx, index) => (
                <ActivityRow
                  key={tx.id}
                  tx={tx}
                  isTreasurer={isTreasurer}
                  last={index === group.transactions.length - 1}
                  onView={() => onAction?.('viewExpense', { expenseId: tx.id })}
                  onAction={onAction}
                />
              ))}
            </ListCard>
          </div>
        ))}
      </Screen>
    </PhoneFrame>
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

function monthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value) {
  const key = monthKey(value);
  if (key === 'unknown') return 'Tháng khác';
  const [year, month] = key.split('-');
  return `Tháng ${month}/${year}`;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'declined', label: 'Từ chối' },
];

function ActivityRow({ tx, isTreasurer, last, onView, onAction }) {
  const paymentStatusLabel = tx.isComplete && (isTreasurer || !tx.isPaid)
    ? '✓ Đã hoàn thành'
    : tx.isPaid ? '✓ Đã thanh toán' : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onView?.();
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: paymentStatusLabel ? '12px 8px' : '12px 0',
          borderBottom: last && !(isTreasurer && tx.status === 'pending') ? 'none' : '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer',
          ...(paymentStatusLabel ? { background: 'rgba(52,211,153,0.07)', borderRadius: 10, margin: '0 -8px' } : {}),
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: TX_ICON_BG[tx.category] || 'rgba(255,255,255,0.06)',
          color: '#fff',
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
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.2px',
            color: tx.amount < 0 ? colors.danger : colors.success, ...type.mono,
          }}>{formatVND(tx.amount)}</div>
        </div>
        <div style={{ color: colors.textMuted, fontSize: 18, flexShrink: 0 }}>›</div>
      </div>
      {isTreasurer && tx.status === 'pending' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, paddingBottom: last ? 0 : 8, borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
          <button type="button"
            onClick={e => { e.stopPropagation(); onAction?.('approveExpense', { expenseId: tx.id, groupId: tx.groupId }); }}
            style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: '1px solid rgba(52,211,153,0.45)', background: 'rgba(52,211,153,0.12)', color: '#6ee7b7', fontSize: 12, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
            Duyệt
          </button>
          <button type="button"
            onClick={e => { e.stopPropagation(); onAction?.('rejectExpense', { expenseId: tx.id, groupId: tx.groupId }); }}
            style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(248,113,113,0.12)', color: '#fca5a5', fontSize: 12, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
            Từ chối
          </button>
        </div>
      )}
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
