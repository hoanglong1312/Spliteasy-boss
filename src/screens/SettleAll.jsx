// Spliteasy Boss — Thanh toán tổng hợp

import React from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Hero, Avatar, SectionLabel } from '../primitives';

export default function SettleAll({ data, onAction }) {
  const d = data || DEMO;
  const debts = d.debts || [];
  const credits = d.credits || [];
  const sources = d.sources || [...debts.map(row => ({ ...row, amount: -row.amount })), ...credits.map(row => ({ ...row, amount: row.amount }))];
  const totalOwe = debts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCredit = credits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const target = d.paymentTarget || {};
  const hasRefundBank = Boolean(target.account && target.holder);
  const refundAmount = Math.max(0, Number(d.netBalance) || 0);
  const bankLabel = [target.name || target.code, target.account].filter(Boolean).join(' · ');

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.2px', color: colors.textMuted, textTransform: 'uppercase' }}>
              Thanh toán tổng hợp
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{d.monthLabel || d.groupName || 'Tháng này'}</div>
          </div>
          <IconButton onClick={() => onAction?.('tab', 'profile')}>💳</IconButton>
        </div>

        <Hero variant="violet">
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#c4b5fd' }}>
            Tổng tất cả nguồn tiền
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8, color: d.netBalance < 0 ? '#fca5a5' : d.netBalance > 0 ? '#6ee7b7' : colors.textPrimary, ...type.mono }}>
            {formatVND(d.netBalance || 0)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <BalanceCell label="Cần nộp" amount={totalOwe} count={debts.length} tone="danger" />
            <BalanceCell label="Cần thu" amount={totalCredit} count={credits.length} tone="success" />
          </div>
        </Hero>

        <SectionLabel>Theo nguồn tiền</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.length === 0 && (
            <Card style={{ padding: '14px 16px', color: colors.textSecondary, fontSize: 12, fontWeight: 700 }}>
              Tháng này chưa có khoản cần thanh toán.
            </Card>
          )}
          {sources.map(source => (
            <SourceRow key={source.id || `${source.sourceType}:${source.name}`} source={source} />
          ))}
        </div>

        {Number(d.netBalance) > 0 && (
          <Card style={{ marginTop: 12, padding: 14, borderColor: hasRefundBank ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.28)' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: hasRefundBank ? '#6ee7b7' : colors.warning, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Thông tin hoàn tiền
            </div>
            {hasRefundBank ? (
              <>
                <div style={{ fontSize: 13, color: '#6ee7b7', marginTop: 7, fontWeight: 900 }}>
                  Đã có STK để thủ quỹ hoàn tiền
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  <RefundInfoRow label="Số tiền cần hoàn" value={formatVND(refundAmount)} strong />
                  <RefundInfoRow label="Ngân hàng / STK" value={bankLabel || 'Đã cập nhật'} />
                  <RefundInfoRow label="Tên tài khoản" value={target.holder} />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#fde68a', marginTop: 7, lineHeight: 1.45, fontWeight: 700 }}>
                Chưa có STK nhận tiền. Cập nhật ngân hàng trong tab cá nhân để thủ quỹ hoàn tiền.
              </div>
            )}
          </Card>
        )}
      </Screen>
    </PhoneFrame>
  );
}

function RefundInfoRow({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
      <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div style={{ fontSize: strong ? 15 : 12, color: strong ? '#6ee7b7' : colors.textPrimary, fontWeight: 900, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere', ...(strong ? type.mono : {}) }}>{value}</div>
    </div>
  );
}

function BalanceCell({ label, amount, count, tone }) {
  const success = tone === 'success';
  return (
    <div style={{
      padding: '10px 12px',
      background: success ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
      border: `1px solid ${success ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 9, color: success ? '#6ee7b7' : '#fca5a5', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: success ? '#34d399' : '#f87171', marginTop: 3, ...type.mono }}>{formatVND(amount)}</div>
      <div style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 700, marginTop: 2 }}>{count} nguồn</div>
    </div>
  );
}

function SourceRow({ source }) {
  const amount = Number(source.rawAmount ?? source.amount) || 0;
  const isCredit = amount > 0;
  return (
    <Card style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar initial={source.initial} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.name || source.sourceLabel}</div>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{isCredit ? 'Cần thu' : 'Cần nộp'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: isCredit ? '#6ee7b7' : '#fca5a5', ...type.mono }}>{formatVND(Math.abs(amount))}</div>
      </div>
    </Card>
  );
}

const DEMO = {
  groupName: 'Tất cả nguồn tiền',
  monthLabel: 'Tháng 5 · 2026',
  netBalance: 425000,
  debts: [{ id: 'group:food', initial: 'Ă', name: 'Ăn uống', sub: 'Cần nộp', amount: 125000, rawAmount: -125000 }],
  credits: [{ id: 'pickleball:main', initial: 'P', name: 'Pickleball', sub: 'Cần thu', amount: 550000, rawAmount: 550000 }],
  sources: [
    { id: 'group:food', initial: 'Ă', name: 'Ăn uống', amount: -125000, rawAmount: -125000 },
    { id: 'pickleball:main', initial: 'P', name: 'Pickleball', amount: 550000, rawAmount: 550000 },
  ],
  paymentTarget: { name: 'PGBank', code: 'PGB', account: '2060369863968', holder: 'TRAN QUANG TOAN' },
};
