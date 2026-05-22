// Spliteasy Boss — Chi tiết nhóm (tab Hoạt động)
// Props: data { name, balance, you, activitiesByWeek[] }, isTreasurer

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Button, Badge, SubTabs,
} from '../primitives';

export default function GroupDetail({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const [activeTab, setActiveTab] = useState('activity');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <PhoneFrame>
      <Screen>
        {/* Nav header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textMuted, textTransform: 'uppercase' }}>NHÓM</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{d.name}</div>
          </div>
          <div style={{ position: 'relative' }}>
            <IconButton onClick={() => setMenuOpen(open => !open)}>⋯</IconButton>
            {menuOpen && (
              <Card style={{
                position: 'absolute',
                right: 0,
                top: 58,
                width: 190,
                padding: 8,
                zIndex: 20,
                boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
              }}>
                <MenuItem onClick={() => { setMenuOpen(false); onAction?.('addExpense', { groupId: d.id }); }}>+ Thêm chi tiêu</MenuItem>
                <MenuItem onClick={() => { setMenuOpen(false); onAction?.('settle', { groupId: d.id }); }}>Tất toán nhóm</MenuItem>
                {isTreasurer && <MenuItem onClick={() => { setMenuOpen(false); onAction?.('closeMonth', { groupId: d.id }); }}>Chốt sổ tháng</MenuItem>}
              </Card>
            )}
          </div>
        </div>

        {/* Balance hero */}
        <Hero variant="amber">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#fcd34d' }}>
            SỐ DƯ CỦA BẠN
          </div>
          <div style={{ ...type.amountLg, marginTop: 6, ...type.mono }}>{formatVND(d.balance)}</div>
          <div style={{
            display: 'inline-flex', gap: 6, marginTop: 10, padding: '5px 10px',
            borderRadius: 100, background: 'rgba(248,113,113,0.18)',
            border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5',
            fontSize: 11, fontWeight: 600,
          }}>{d.balanceLabel}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Button variant="primary" style={{ flex: 1, padding: '12px 8px', fontSize: 12, color: '#7c2d12' }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>+ Thêm chi tiêu</Button>
            <Button variant="ghost"   style={{ flex: 1, padding: '12px 8px', fontSize: 12 }} onClick={() => onAction?.('settle', { groupId: d.id })}>⚡ Tất toán</Button>
          </div>
        </Hero>

        {/* Treasurer actions */}
        {isTreasurer && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{
              flex: 1, padding: '11px 12px', borderRadius: 12,
              background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 600, color: '#c7d2fe', cursor: 'pointer',
            }} onClick={() => onAction?.('closeMonth', { groupId: d.id })}>
              <span style={{ fontSize: 14 }}>🔒</span> Chốt sổ tháng
            </div>
            <div style={{
              padding: '11px 12px', borderRadius: 12,
              background: colors.inputBg, border: `1px solid ${colors.borderSubtle}`,
              fontSize: 11, fontWeight: 600, color: colors.textSecondary,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>
              <span>＋</span> Thêm
            </div>
          </div>
        )}

        <SubTabs
          items={[
            { key: 'activity', label: 'Hoạt động' },
            { key: 'balances', label: 'Số dư' },
            { key: 'members',  label: `Thành viên · ${d.memberCount}` },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'activity' && d.activitiesByWeek.map(week => (
          <React.Fragment key={week.label}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase', margin: '8px 0',
            }}>{week.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {week.items.map(it => <ActivityCard key={it.id} item={it} />)}
            </div>
          </React.Fragment>
        ))}
        {activeTab === 'activity' && d.activitiesByWeek.length === 0 && (
          <EmptyState title="Chưa có chi tiêu" sub="Bấm Thêm chi tiêu để ghi khoản đầu tiên của nhóm này." />
        )}

        {activeTab === 'balances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(d.balanceRows || []).length > 0 ? d.balanceRows.map(row => (
              <BalanceRow key={row.id} row={row} />
            )) : (
              <EmptyState title="Đang cân bằng" sub="Nhóm chưa có khoản nào cần nộp hoặc được quỹ bù." />
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(d.members || []).map(member => (
              <MemberRow key={member.id} member={member} />
            ))}
            {(d.members || []).length === 0 && (
              <EmptyState title="Chưa có thành viên" sub="Thêm thành viên để bắt đầu chia chi phí nhóm." />
            )}
          </div>
        )}
      </Screen>

      <TabBar active="groups" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '11px 10px',
        border: 'none',
        borderRadius: 8,
        background: 'transparent',
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, sub }) {
  return (
    <Card style={{ marginTop: 10, textAlign: 'center', padding: '22px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 5, lineHeight: 1.45 }}>{sub}</div>
    </Card>
  );
}

function BalanceRow({ row }) {
  const isDebt = row.amount < 0;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: row.color || 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 900,
        }}>{row.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{row.name}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {isDebt ? 'Cần nộp vào quỹ' : 'Quỹ cần bù lại'}
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: isDebt ? colors.danger : '#6ee7b7', ...type.mono }}>
          {isDebt ? '-' : '+'}{formatVND(Math.abs(row.amount))}
        </div>
      </div>
    </Card>
  );
}

function MemberRow({ member }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: member.color || 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 900,
        }}>{member.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{member.name}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {member.role === 'treasurer' ? 'Thủ quỹ' : 'Thành viên'}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: member.balance < 0 ? colors.danger : member.balance > 0 ? '#6ee7b7' : colors.textSecondary, ...type.mono }}>
          {member.balance === 0 ? '0 đ' : `${member.balance > 0 ? '+' : '-'}${formatVND(Math.abs(member.balance))}`}
        </div>
      </div>
    </Card>
  );
}

function ActivityCard({ item }) {
  const iconBg = {
    food:  'rgba(245,158,11,0.12)',
    cafe:  'rgba(167,139,250,0.12)',
    veg:   'rgba(52,211,153,0.12)',
  }[item.category] || 'rgba(255,255,255,0.06)';
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>{item.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{item.sub}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', ...type.mono }}>{formatVND(item.amount)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {item.tags.map((t, i) => <Badge key={i} tone={t.tone}>{t.label}</Badge>)}
          </div>
        </div>
      </div>
    </Card>
  );
}

const DEMO = {
  name: 'Ăn trưa thứ Bảy',
  memberCount: 6,
  balance: -45000,
  balanceLabel: 'Nợ Minh 45.000 đ',
  activitiesByWeek: [
    { label: 'Tuần này', items: [
      { id: 1, icon: '🍜', category: 'food', title: 'Bún bò Huế Phở 24', sub: 'Minh trả · 16/05 · Trưa', amount: 270000,
        tags: [{ tone: 'muted', label: 'Chia đều · 6 người' }, { tone: 'warn', label: '⏳ Đang chờ' }] },
      { id: 2, icon: '☕', category: 'cafe', title: 'Cafe Highlands', sub: 'Long trả · 16/05 · Sáng', amount: 180000,
        tags: [{ tone: 'muted', label: 'Chia tuỳ chỉnh' }, { tone: 'success', label: '✓ Đã chia' }] },
    ]},
    { label: 'Tuần trước · 09/05 – 15/05', items: [
      { id: 3, icon: '🥗', category: 'veg', title: 'Salad chay', sub: 'Hoa trả · 10/05', amount: 220000,
        tags: [{ tone: 'success', label: '✓ Đã thanh toán' }] },
    ]},
  ],
};
