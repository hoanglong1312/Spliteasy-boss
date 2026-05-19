// Spliteasy Boss — Tất toán nhóm (cá nhân + thủ quỹ)
// Props: data { groupName, netBalance, debts[], credits[], settlements[], isTreasurer }

import React from 'react';
import { colors, type, formatVND, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Hero, Button, Avatar, SectionLabel,
} from '../primitives';

export default function SettleAll({ data, onAction }) {
  const d = data || DEMO;
  const totalOwe    = d.debts.reduce((s, x) => s + x.amount, 0);
  const totalCredit = d.credits.reduce((s, x) => s + x.amount, 0);
  const settlementTotal = d.settlements.reduce((s, x) => s + x.amount, 0);

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase',
            }}>Tất toán</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{d.groupName}</div>
          </div>
          <IconButton onClick={() => onAction?.('more')}>⋯</IconButton>
        </div>

        {/* Hero net balance */}
        <Hero variant="violet">
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.2px', color: '#c4b5fd',
          }}>SỐ DƯ CỦA BẠN VỚI NHÓM</div>
          <div style={{
            fontSize: 34, fontWeight: 900, letterSpacing: '-1px',
            marginTop: 8, color: d.netBalance < 0 ? '#fca5a5' : '#6ee7b7', ...type.mono,
          }}>{formatVND(d.netBalance)}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, position: 'relative' }}>
            <BalanceCell label="Bạn nợ"
              amount={totalOwe} count={d.debts.length}
              bg="rgba(248,113,113,0.12)" border="rgba(248,113,113,0.25)"
              labelColor="#fca5a5" amountColor="#f87171"
            />
            <BalanceCell label="Được nhận"
              amount={totalCredit} count={d.credits.length}
              bg="rgba(52,211,153,0.12)" border="rgba(52,211,153,0.25)"
              labelColor="#6ee7b7" amountColor="#34d399"
            />
          </div>
        </Hero>

        {/* You owe */}
        <SectionLabel action="Trả tất cả →">
          Bạn nợ · {d.debts.length} người
        </SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.debts.map((p) => (
            <PersonRow key={p.id} person={p} mode="pay"
              onAction={() => onAction?.('payOne', p.id)} />
          ))}
        </div>

        {/* They owe you */}
        {d.credits.length > 0 && (
          <>
            <SectionLabel>Người nợ bạn · {d.credits.length}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.credits.map((p) => (
                <PersonRow key={p.id} person={p} mode="receive"
                  onAction={() => onAction?.('receive', p.id)} />
              ))}
            </div>
          </>
        )}

        {/* Treasurer: full net settlement */}
        {d.isTreasurer && d.settlements.length > 0 && (
          <>
            <SectionLabel action="👑 thủ quỹ">Tất toán toàn nhóm</SectionLabel>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr',
                gap: 10, padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <ColLabel>Từ</ColLabel>
                <ColLabel>Đến</ColLabel>
                <ColLabel align="right">Số tiền</ColLabel>
              </div>
              {d.settlements.map((s, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr',
                  gap: 10, padding: '11px 14px', alignItems: 'center',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar initial={s.from.initial} size={24} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.from.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: colors.textMuted }}>→</span>
                    <Avatar initial={s.to.initial} size={24} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.to.name}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', ...type.mono }}>
                    {formatVNDShort(s.amount)}
                  </div>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px',
                borderTop: `1px solid ${colors.borderSubtle}`,
                background: 'rgba(99,102,241,0.08)',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#c7d2fe',
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                }}>{d.settlements.length} giao dịch tối ưu</span>
                <span style={{
                  fontSize: 14, fontWeight: 900, color: colors.brandLight,
                  letterSpacing: '-0.3px', ...type.mono,
                }}>{formatVNDShort(settlementTotal)}</span>
              </div>
            </Card>
          </>
        )}

        <Button block style={{
          marginTop: 14, fontSize: 13,
          background: 'rgba(245,158,11,0.10)', color: '#fcd34d',
          border: '1px solid rgba(245,158,11,0.35)',
        }} onClick={() => onAction?.('closePeriod')}>
          📋 Chốt sổ tháng này
        </Button>
      </Screen>
    </PhoneFrame>
  );
}

function BalanceCell({ label, amount, count, bg, border, labelColor, amountColor }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px',
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 9, color: labelColor, fontWeight: 700,
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 900, color: amountColor,
        letterSpacing: '-0.3px', marginTop: 3, ...type.mono,
      }}>{formatVND(amount)}</div>
      <div style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 600, marginTop: 2 }}>
        {count} người
      </div>
    </div>
  );
}

function PersonRow({ person, mode, onAction }) {
  const isReceive = mode === 'receive';
  return (
    <Card style={{
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Avatar initial={person.initial} size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{person.name}</div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{person.sub}</div>
      </div>
      <div style={{ textAlign: 'right', marginRight: 6 }}>
        <div style={{
          fontSize: 15, fontWeight: 800,
          color: isReceive ? colors.success : colors.danger,
          letterSpacing: '-0.3px', ...type.mono,
        }}>{formatVND(person.amount)}</div>
      </div>
      {isReceive ? (
        <button onClick={onAction} style={{
          padding: '8px 10px', borderRadius: 10,
          background: 'rgba(52,211,153,0.15)', color: '#6ee7b7',
          fontSize: 11, fontWeight: 700,
          border: '1px solid rgba(52,211,153,0.3)',
          fontFamily: 'inherit', letterSpacing: '0.3px', cursor: 'pointer',
        }}>✓ NHẬN</button>
      ) : (
        <button onClick={onAction} style={{
          padding: '8px 12px', borderRadius: 10,
          background: colors.brandGradient, color: 'white',
          fontSize: 11, fontWeight: 700,
          border: 'none', fontFamily: 'inherit', letterSpacing: '0.3px', cursor: 'pointer',
        }}>⚡ TRẢ</button>
      )}
    </Card>
  );
}

function ColLabel({ children, align }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
      color: colors.textMuted, textTransform: 'uppercase',
      textAlign: align || 'left',
    }}>{children}</div>
  );
}

const DEMO = {
  groupName: 'CLB Cầu Giấy',
  netBalance: -333333,
  debts: [
    { id: 1, initial: 'M', name: 'Minh Trần', sub: '3 khoản · sân + nước', amount: 285000 },
    { id: 2, initial: 'H', name: 'Hoa Lê',    sub: '1 khoản · cafe',       amount:  58000 },
    { id: 3, initial: 'N', name: 'Nam Vũ',    sub: '2 khoản · vé lẻ',      amount:  50333 },
  ],
  credits: [
    { id: 4, initial: 'T', name: 'Tuấn Phạm', sub: 'Đã chuyển khoản · 2 giờ trước', amount: 60000 },
  ],
  isTreasurer: true,
  settlements: [
    { from: { initial: 'L',  name: 'Long' }, to: { initial: 'M', name: 'Minh' }, amount: 285000 },
    { from: { initial: 'T',  name: 'Tuấn' }, to: { initial: 'M', name: 'Minh' }, amount: 120000 },
    { from: { initial: 'Li', name: 'Linh' }, to: { initial: 'H', name: 'Hoa' },  amount:  85000 },
  ],
};
