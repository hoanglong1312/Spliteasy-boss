// Spliteasy Boss — Trang chủ
// Props: data { user, monthLabel, totalBalance, owedTo, pickleball, groups, todaySession, transactions[] }

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Hero, Card, Button,
  SectionLabel,
} from '../primitives';

export default function Home({ data, onAction }) {
  const d = data || DEMO;
  const [filterText, setFilterText] = useState('');
  const isNeg = d.totalBalance < 0;
  const normalizedFilter = filterText.trim().toLowerCase();
  const visibleTransactions = d.transactions.filter(tx => (
    !normalizedFilter || String(tx.title || '').toLowerCase().includes(normalizedFilter)
  ));

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
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: colors.textMuted, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Tìm chi tiêu..."
            style={{
              width: '100%',
              padding: '12px 12px 12px 34px',
              background: colors.inputBg,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 12,
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>
        <Card>
          {visibleTransactions.length > 0 ? visibleTransactions.map((tx, i) => (
            <ActivityRow
              key={tx.id}
              tx={tx}
              last={i === visibleTransactions.length - 1}
              onEdit={() => onAction?.('editExpense', { expenseId: tx.id })}
            />
          )) : (
            <div style={{ padding: '14px 0', fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Không tìm thấy chi tiêu
            </div>
          )}
        </Card>
      </Screen>

      <TabBar active="home" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function ActivityRow({ tx, last, onEdit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : `1px solid rgba(255,255,255,0.04)`,
    }}>
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
        <button onClick={onEdit} style={{
          marginTop: 5,
          background: 'transparent',
          border: 'none',
          color: colors.brandLight,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 11,
          fontWeight: 700,
          padding: 0,
        }}>Sửa</button>
      </div>
    </div>
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
