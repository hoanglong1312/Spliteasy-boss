// Spliteasy Boss — Pickleball · Buổi đánh (calendar + detail panel)
// Props: data { clubName, monthLabel, days[], selectedSession }, isTreasurer

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Card, Button, Badge, SubTabs, Avatar,
} from '../primitives';

const DAYS_OF_WEEK = ['T2','T3','T4','T5','T6','T7','CN'];

const CELL_STATE = {
  normal:   { bg: 'rgba(255,255,255,0.02)', border: 'transparent',                color: colors.textMuted },
  faded:    { bg: 'rgba(255,255,255,0.02)', border: 'transparent',                color: '#1e293b' },
  today:    { bg: 'rgba(99,102,241,0.18)',  border: 'rgba(99,102,241,0.55)',      color: '#c7d2fe',
              boxShadow: '0 0 16px rgba(99,102,241,0.3)' },
  attended: { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.30)',      color: '#6ee7b7' },
  absent:   { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)',     color: '#fca5a5' },
  upcoming: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(99,102,241,0.35)', dashed: true, color: colors.brandLight },
  moved:    { bg: 'rgba(255,255,255,0.02)', border: 'transparent',                color: '#334155', lineThrough: true },
};

const DOT_COLOR = { attended: '#34d399', absent: '#f87171', today: '#818cf8' };

export default function PickleballCalendar({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const [selected, setSelected] = useState(d.selectedSessionDay || 19);

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 16px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
              CLB PICKLEBALL · {d.clubName}
            </div>
            <h1 style={{ ...type.title, marginTop: 2 }}>Buổi đánh</h1>
          </div>
          {isTreasurer && <IconButton onClick={() => onAction?.('settings')}>⚙️</IconButton>}
        </div>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
            { key: 'tickets',   label: 'Vé lẻ' },
          ]}
          active="calendar"
          onChange={(k) => onAction?.('subTab', k)}
        />

        <MonthNav label={d.monthLabel} onPrev={() => onAction?.('monthPrev')} onNext={() => onAction?.('monthNext')} />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 9, color: colors.textSecondary, fontWeight: 600, marginBottom: 14 }}>
          <LegendChip color="rgba(99,102,241,0.55)" label="Hôm nay" />
          <LegendChip color="rgba(52,211,153,0.55)" label="Đã đánh" />
          <LegendChip color="rgba(248,113,113,0.55)" label="Vắng" />
          <LegendChip dashed label="Sắp tới" />
        </div>

        {/* Calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {DAYS_OF_WEEK.map(dow => (
            <div key={dow} style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
              color: colors.textMuted, textAlign: 'center', padding: '6px 0',
              textTransform: 'uppercase',
            }}>{dow}</div>
          ))}
          {d.days.map((day, i) => (
            <CalendarCell key={i} day={day} selected={day.n === selected} onClick={() => day.state !== 'faded' && setSelected(day.n)} />
          ))}
        </div>

        {/* Detail panel */}
        {d.selectedSession && (
          <SessionDetailPanel session={d.selectedSession} isTreasurer={isTreasurer} onAction={onAction} />
        )}
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function LegendChip({ color, label, dashed }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 2,
        background: color || 'transparent',
        border: dashed ? '1px dashed rgba(99,102,241,0.55)' : 'none',
      }} />
      {label}
    </span>
  );
}

function CalendarCell({ day, selected, onClick }) {
  const s = CELL_STATE[day.state] || CELL_STATE.normal;
  const dot = DOT_COLOR[day.state];
  return (
    <button onClick={onClick} style={{
      aspectRatio: '1', borderRadius: 9,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: s.dashed ? `1px dashed ${s.border}` : `1px solid ${s.border}`,
      textDecoration: s.lineThrough ? 'line-through' : 'none',
      boxShadow: s.boxShadow,
      outline: selected ? `2px solid ${colors.brandLight}` : 'none',
      outlineOffset: -2,
      fontFamily: 'inherit', cursor: day.state === 'faded' ? 'default' : 'pointer',
      position: 'relative',
    }}>
      {day.n}
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, marginTop: 3 }} />}
    </button>
  );
}

function SessionDetailPanel({ session, isTreasurer, onAction }) {
  return (
    <Card accent="pickleball" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
            Buổi #{session.number} · {session.dateLabel}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, letterSpacing: '-0.3px' }}>
            {session.timeRange} · {session.court}
          </div>
        </div>
        <Badge tone={session.status.tone}>● {session.status.label}</Badge>
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
          Điểm danh · {session.attendance.present}/{session.attendance.total}
          {session.attendance.guests > 0 && ` + ${session.attendance.guests} khách`}
        </div>
        {isTreasurer && <span style={{ fontSize: 11, color: colors.brandLight, fontWeight: 600, cursor: 'pointer' }} onClick={() => onAction?.('addGuest', session.id)}>+ Thêm khách</span>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {session.attendees.map(a => <AttendChip key={a.id} a={a} onToggle={isTreasurer ? () => onAction?.('togglePresence', a.id) : undefined} />)}
      </div>

      <div style={{ height: 1, background: colors.borderSubtle, margin: '14px 0' }} />
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
        Chi phí buổi
      </div>
      {session.costs.map((c, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}>
          <span style={{ color: '#cbd5e1' }}>{c.label}</span>
          <span style={{ fontWeight: 700, ...type.mono }}>{c.amount.toLocaleString('vi-VN')} đ</span>
        </div>
      ))}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
        padding: '10px 12px', background: 'rgba(52,211,153,0.08)', borderRadius: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng/người</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: colors.pickleball, ...type.mono }}>
          {session.totalPerPerson.toLocaleString('vi-VN')} đ
        </span>
      </div>

      {isTreasurer && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button variant="muted" style={{ flex: 1, fontSize: 12, padding: 11 }} onClick={() => onAction?.('reschedule', session.id)}>📅 Dời buổi</Button>
          <Button variant="brand" style={{ flex: 1, fontSize: 12, padding: 11 }} onClick={() => onAction?.('complete', session.id)}>✓ Hoàn tất</Button>
        </div>
      )}
    </Card>
  );
}

function AttendChip({ a, onToggle }) {
  const palette = {
    present: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)',  color: '#6ee7b7', mark: '✓' },
    absent:  { bg: 'rgba(248,113,113,0.10)',border: 'rgba(248,113,113,0.3)',  color: '#fca5a5', mark: '✕' },
    guest:   { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)',  color: '#fcd34d' },
  }[a.kind];

  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '5px 9px 5px 5px', borderRadius: 100,
      background: palette.bg, border: `1px solid ${palette.border}`,
      fontFamily: 'inherit', cursor: onToggle ? 'pointer' : 'default',
    }}>
      <Avatar initial={a.initial} size={18}
        color={a.kind === 'absent' ? 'rgba(255,255,255,0.08)' : undefined}
        ring={false} />
      <span style={{ fontSize: 10, fontWeight: 700, color: palette.color }}>
        {a.kind === 'guest' ? `Khách · ${a.name}` : `${a.name} ${palette.mark}`}
      </span>
    </button>
  );
}

const DEMO = {
  clubName: 'Cầu Giấy',
  monthLabel: 'Tháng 5 · 2026',
  selectedSessionDay: 19,
  days: [
    // Week 1
    { n: 27, state: 'faded' }, { n: 28, state: 'faded' }, { n: 29, state: 'faded' }, { n: 30, state: 'faded' },
    { n: 1, state: 'normal' }, { n: 2, state: 'normal' }, { n: 3, state: 'normal' },
    // Week 2
    { n: 4, state: 'attended' }, { n: 5, state: 'normal' }, { n: 6, state: 'attended' }, { n: 7, state: 'normal' },
    { n: 8, state: 'attended' }, { n: 9, state: 'normal' }, { n: 10, state: 'normal' },
    // Week 3
    { n: 11, state: 'attended' }, { n: 12, state: 'normal' }, { n: 13, state: 'absent' }, { n: 14, state: 'normal' },
    { n: 15, state: 'moved' }, { n: 16, state: 'normal' }, { n: 17, state: 'attended' },
    // Week 4
    { n: 18, state: 'attended' }, { n: 19, state: 'today' }, { n: 20, state: 'normal' }, { n: 21, state: 'upcoming' },
    { n: 22, state: 'normal' }, { n: 23, state: 'normal' }, { n: 24, state: 'upcoming' },
    // Week 5
    { n: 25, state: 'upcoming' }, { n: 26, state: 'normal' }, { n: 27, state: 'upcoming' }, { n: 28, state: 'normal' },
    { n: 29, state: 'upcoming' }, { n: 30, state: 'normal' }, { n: 31, state: 'normal' },
  ],
  selectedSession: {
    id: 9, number: 9, dateLabel: 'T3 19/05',
    timeRange: '19:00 – 21:00', court: 'Sân 3',
    status: { tone: 'brand', label: 'Hôm nay' },
    attendance: { present: 10, total: 12, guests: 1 },
    attendees: [
      { id: 1, initial: 'L', name: 'Long', kind: 'present' },
      { id: 2, initial: 'M', name: 'Minh', kind: 'present' },
      { id: 3, initial: 'H', name: 'Hoa',  kind: 'present' },
      { id: 4, initial: 'N', name: 'Nam',  kind: 'present' },
      { id: 5, initial: 'T', name: 'Tuấn', kind: 'absent' },
      { id: 6, initial: 'Li',name: 'Linh', kind: 'absent' },
      { id: 7, initial: 'K', name: 'An',   kind: 'guest' },
    ],
    costs: [
      { label: '🏸 Tiền sân/người',     amount: 20000 },
      { label: '💧 Tiền nước/người',    amount: 12000 },
      { label: '📦 Băng dán vợt',       amount: 8000 },
    ],
    totalPerPerson: 40000,
  },
};
