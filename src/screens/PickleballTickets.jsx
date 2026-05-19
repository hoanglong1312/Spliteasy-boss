// Spliteasy Boss — Pickleball · Vé lẻ
// Props: data { clubName, summary, filter, tickets[] }, isTreasurer

import React from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Badge, SubTabs, Pill, PillRow, Avatar,
} from '../primitives';

export default function PickleballTickets({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 16px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
              CLB PICKLEBALL · {d.clubName}
            </div>
            <h1 style={{ ...type.title, marginTop: 2 }}>Vé lẻ</h1>
          </div>
          {isTreasurer && (
            <IconButton style={{ background: colors.brandGradient, borderColor: 'transparent', color: 'white', fontWeight: 700, fontSize: 20 }} onClick={() => onAction?.('add')}>+</IconButton>
          )}
        </div>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
            { key: 'tickets',   label: 'Vé lẻ' },
          ]}
          active="tickets" onChange={(k) => onAction?.('subTab', k)}
        />

        {/* Summary */}
        <Hero variant="indigo" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.brandLight }}>
                Vé lẻ {d.summary.monthLabel}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 6, ...type.mono }}>
                {d.summary.sessionCount} buổi · {d.summary.totalAttendances} lượt
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', ...type.mono }}>
                {Math.round(d.summary.totalAmount / 1000)}k
              </div>
              <div style={{ fontSize: 9, color: '#c7d2fe', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 }}>
                Tổng
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <SummaryBox tone="success" label="Đã trả chủ sân" value={`${d.summary.paid.count} buổi · ${Math.round(d.summary.paid.amount / 1000)}k`} />
            <SummaryBox tone="warn"    label="Chưa trả"      value={`${d.summary.unpaid.count} buổi · ${Math.round(d.summary.unpaid.amount / 1000)}k`} />
          </div>
        </Hero>

        <PillRow style={{ marginTop: 14 }}>
          {d.filters.map(f => (
            <Pill key={f.key} active={f.key === d.activeFilter} onClick={() => onAction?.('filter', f.key)}>{f.label}</Pill>
          ))}
        </PillRow>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {d.tickets.map(t => <TicketCard key={t.id} t={t} />)}
        </div>
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function SummaryBox({ tone, label, value }) {
  const palette = {
    success: { bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.3)',  label: '#6ee7b7', val: colors.success },
    warn:    { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  label: '#fcd34d', val: colors.warning },
  }[tone];
  return (
    <div style={{
      flex: 1, padding: '8px 10px',
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 9, color: palette.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: palette.val, marginTop: 2, ...type.mono }}>{value}</div>
    </div>
  );
}

function TicketCard({ t }) {
  const isPaid = t.status === 'paid';
  const accentColor = isPaid ? colors.pickleball : colors.warning;

  return (
    <Card style={{ padding: 16, borderColor: isPaid ? colors.borderSubtle : 'rgba(251,191,36,0.25)', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textSecondary, textTransform: 'uppercase' }}>
              Vé lẻ #{t.number}
            </span>
            <Badge tone={isPaid ? 'success' : 'warn'}>{isPaid ? '✓ Đã trả chủ sân' : '⏳ Chưa trả chủ sân'}</Badge>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', marginTop: 4 }}>
            {t.dateLabel} · {t.timeLabel}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: accentColor, letterSpacing: '-0.5px', ...type.mono }}>
            {Math.round(t.amount / 1000)}k
          </div>
          <div style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 600 }}>
            {t.attendees.length} × 50k{t.advancer ? ` · ${t.advancer} ứng` : ''}
          </div>
        </div>
      </div>

      {t.expanded && (
        <>
          <div style={{ height: 1, background: colors.borderSubtle, margin: '12px 0' }} />
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
            marginBottom: 8,
            color: isPaid ? colors.textSecondary : '#fcd34d',
          }}>
            {isPaid ? `${t.advancer} đã ứng → mọi người P2P` : '→ Cộng vào quỹ nợ cuối tháng'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {t.attendees.map(a => <AttendeeChip key={a.id} a={a} isPaid={isPaid} isAdvancer={a.name === t.advancer} />)}
          </div>
        </>
      )}
    </Card>
  );
}

function AttendeeChip({ a, isPaid, isAdvancer }) {
  const style = isAdvancer ? {
    bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', color: '#c7d2fe',
  } : {
    bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: '#cbd5e1',
  };
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 9px 4px 4px', borderRadius: 100,
      background: style.bg, border: `1px solid ${style.border}`,
    }}>
      <Avatar initial={a.initial} size={16} ring={false} />
      <span style={{ fontSize: 10, fontWeight: 700, color: style.color }}>
        {a.name}{isAdvancer ? ' · Người ứng' : ''}
      </span>
      {isPaid && !isAdvancer && (
        <span style={{ color: colors.danger, fontSize: 9 }}>−50k</span>
      )}
    </span>
  );
}

const DEMO = {
  clubName: 'Cầu Giấy',
  summary: {
    monthLabel: 'tháng 5',
    sessionCount: 4, totalAttendances: 12, totalAmount: 600000,
    paid:   { count: 2, amount: 350000 },
    unpaid: { count: 2, amount: 250000 },
  },
  activeFilter: 'all',
  filters: [
    { key: 'all',    label: 'Tất cả · 4' },
    { key: 'paid',   label: '✅ Đã trả · 2' },
    { key: 'unpaid', label: '⏳ Chưa trả · 2' },
  ],
  tickets: [
    { id: 4, number: 4, dateLabel: 'CN 17/05', timeLabel: '18:00', status: 'paid',
      amount: 200000, advancer: 'Long', expanded: true,
      attendees: [
        { id: 1, initial: 'L',  name: 'Long' },
        { id: 2, initial: 'M',  name: 'Minh' },
        { id: 3, initial: 'N',  name: 'Nam' },
        { id: 4, initial: 'K',  name: 'Khải · K' },
      ]},
    { id: 3, number: 3, dateLabel: 'T7 16/05', timeLabel: '16:00', status: 'unpaid',
      amount: 150000, expanded: true,
      attendees: [
        { id: 1, initial: 'H',  name: 'Hoa'   },
        { id: 2, initial: 'Li', name: 'Linh' },
        { id: 3, initial: 'T',  name: 'Tuấn' },
      ]},
    { id: 2, number: 2, dateLabel: 'CN 10/05', timeLabel: '19:30', status: 'paid',
      amount: 150000, advancer: 'Minh', expanded: false, attendees: [{},{},{}] },
    { id: 1, number: 1, dateLabel: 'T7 03/05', timeLabel: '17:00', status: 'unpaid',
      amount: 100000, expanded: false, attendees: [{},{}] },
  ],
};
