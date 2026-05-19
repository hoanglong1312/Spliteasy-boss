// Spliteasy Boss — Trang chủ
// Props: data { user, monthLabel, totalBalance, owedTo, pickleball, groups, todaySession, transactions[] }

import React from 'react';
import { colors, type, formatVND, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Hero, Card, Button,
  SectionLabel, Row,
} from '../primitives';

export default function Home({ data, onAction }) {
  const d = data || DEMO;
  const isNeg = d.totalBalance < 0;

  return (
    <PhoneFrame>
      <Screen>
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

        {/* Hero */}
        <Hero>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.brandLight }}>
            Tổng số dư tháng này
          </div>
          <div style={{ ...type.amountLg, marginTop: 6, color: colors.textPrimary, ...type.mono }}>
            {formatVND(d.totalBalance)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
            padding: '5px 10px', borderRadius: 100,
            background: isNeg ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)',
            border: `1px solid ${isNeg ? 'rgba(248,113,113,0.25)' : 'rgba(52,211,153,0.25)'}`,
            fontSize: 11, fontWeight: 600,
            color: isNeg ? '#fca5a5' : '#6ee7b7',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isNeg ? colors.danger : colors.success, boxShadow: `0 0 8px ${isNeg ? 'rgba(248,113,113,0.6)' : 'rgba(52,211,153,0.6)'}` }} />
            {isNeg ? `Bạn còn nợ ${d.owedTo} người` : 'Cân bằng'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Button variant="primary" style={{ flex: 1, padding: '12px 8px', fontSize: 12 }} onClick={() => onAction?.('addExpense')}>+ Thêm chi tiêu</Button>
            <Button variant="ghost"   style={{ flex: 1, padding: '12px 8px', fontSize: 12 }} onClick={() => onAction?.('payment')}>⚡ Thanh toán</Button>
          </div>
        </Hero>

        {/* Two mini cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <MiniStat
            accent="pickleball" emoji="🏓" label="PICKLEBALL" labelColor="#6ee7b7"
            big={d.pickleball.sessionsAttended}
            denom={`/${d.pickleball.sessionsTotal}`}
            caption="buổi tham gia"
            footLabel="Nợ tiền sân"
            footValue={formatVND(d.pickleball.balance)}
            footColor={colors.danger}
          />
          <MiniStat
            accent="groups" emoji="👥" label="NHÓM" labelColor="#fcd34d"
            big={d.groups.count} denom=" nhóm" caption="đang hoạt động"
            footLabel="Tổng nợ"
            footValue={formatVND(d.groups.balance)}
            footColor={colors.danger}
          />
        </div>

        {/* Today session */}
        {d.todaySession && (
          <Card accent="pickleball" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => onAction?.('attend', d.todaySession.id)}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🏸</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
                {d.todaySession.timeLabel}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>
                Điểm danh Buổi #{d.todaySession.number} · {d.todaySession.dateLabel}
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{d.todaySession.venue}</div>
            </div>
            <div style={{ color: colors.brandLight, fontSize: 18 }}>›</div>
          </Card>
        )}

        <SectionLabel action="Xem tất cả →">Giao dịch gần đây</SectionLabel>
        <Card>
          {d.transactions.map((tx, i) => (
            <Row key={tx.id}
              icon={tx.icon} iconBg={TX_ICON_BG[tx.category]}
              title={tx.title} sub={`${tx.subtitle} · ${tx.dateLabel}`}
              amount={formatVND(tx.amount)}
              amountColor={tx.amount < 0 ? colors.danger : colors.success}
              last={i === d.transactions.length - 1}
            />
          ))}
        </Card>
      </Screen>

      <TabBar active="home" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function MiniStat({ accent, emoji, label, labelColor, big, denom, caption, footLabel, footValue, footColor }) {
  return (
    <Card accent={accent}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, letterSpacing: '0.4px' }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 10, ...type.mono }}>
        {big}<span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>{denom}</span>
      </div>
      <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{caption}</div>
      <div style={{ height: 1, background: colors.borderSubtle, margin: '12px 0' }} />
      <div style={{ fontSize: 11, color: colors.textSecondary }}>{footLabel}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: footColor, marginTop: 2, ...type.mono }}>{footValue}</div>
    </Card>
  );
}

const TX_ICON_BG = {
  pickleball: 'rgba(52,211,153,0.12)',
  groups:     'rgba(99,102,241,0.12)',
  food:       'rgba(251,191,36,0.12)',
  payment:    'rgba(167,139,250,0.12)',
};

const DEMO = {
  user: { firstName: 'Long', dateLabel: 'Thứ Hai · 19/05/2026', hasNotifications: true },
  monthLabel: 'Tháng 5 · 2026',
  totalBalance: -333333,
  owedTo: 4,
  pickleball: { sessionsAttended: 8, sessionsTotal: 13, balance: -240000 },
  groups: { count: 3, balance: -93333 },
  todaySession: { id: 9, number: 9, timeLabel: 'Hôm nay · 19:00', dateLabel: '19/05', venue: 'CLB Pickleball Cầu Giấy' },
  transactions: [
    { id: 1, icon: '🏸', category: 'pickleball', title: 'Tiền nước Buổi #8', subtitle: 'CLB Pickleball', dateLabel: 'Hôm qua', amount: -40000 },
    { id: 2, icon: '☕', category: 'groups',     title: 'Cafe sau buổi',      subtitle: 'Nhóm CLB',         dateLabel: '17/05',   amount: -55000 },
    { id: 3, icon: '🍜', category: 'food',       title: 'Bún bò trưa T7',     subtitle: 'Minh trả',         dateLabel: '16/05',   amount: -45000 },
    { id: 4, icon: '💸', category: 'payment',    title: 'Thanh toán → Hoa',   subtitle: 'VietQR',           dateLabel: '14/05',   amount: 120000 },
  ],
};
