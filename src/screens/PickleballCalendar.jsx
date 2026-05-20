// Spliteasy Boss — Pickleball · Buổi đánh (calendar + detail panel)
// Props: data { clubName, monthLabel, days[], selectedSession }, isTreasurer

import React, { useEffect, useState } from 'react';
import { colors, type, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Card, Button, Badge, SubTabs, Avatar, Input,
} from '../primitives';

const DAYS_OF_WEEK = ['T2','T3','T4','T5','T6','T7','CN'];

const CELL_STATE = {
  normal:   { bg: 'rgba(255,255,255,0.02)', border: 'transparent',                color: colors.textMuted },
  faded:    { bg: 'rgba(255,255,255,0.02)', border: 'transparent',                color: '#1e293b' },
  today:    { bg: 'rgba(99,102,241,0.18)',  border: 'rgba(99,102,241,0.55)',      color: '#c7d2fe',
              boxShadow: '0 0 16px rgba(99,102,241,0.3)' },
  attended: { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.30)',      color: '#6ee7b7' },
  absent:   { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)',     color: '#fca5a5' },
  missed:   { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)',     color: '#fca5a5' },
  upcoming: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(99,102,241,0.35)', dashed: true, color: colors.brandLight },
  moved:    { bg: 'rgba(255,255,255,0.02)', border: 'transparent',                color: '#334155', lineThrough: true },
};

const DOT_COLOR = { attended: '#34d399', absent: '#f87171', missed: '#f87171', today: '#818cf8' };

export default function PickleballCalendar({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const initialSession = d.selectedSession || (d.sessions || [])[0] || null;
  const [selected, setSelected] = useState(d.selectedSessionDay || selectedDayFromSession(initialSession) || 19);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSession?.id || null);
  const selectedSession = selectedSessionId
    ? ((d.sessions || []).find(session => String(session.id) === String(selectedSessionId)) ||
      (String(d.selectedSession?.id) === String(selectedSessionId) ? d.selectedSession : null))
    : null;

  useEffect(() => {
    const nextSession = d.selectedSession || (d.sessions || [])[0] || null;
    setSelected(d.selectedSessionDay || selectedDayFromSession(nextSession) || 19);
    setSelectedSessionId(nextSession?.id || null);
  }, [d.selectedSession?.id, d.selectedSessionDay]);

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
            <CalendarCell
              key={i}
              day={day}
              selected={day.n === selected}
              onClick={() => {
                if (day.state === 'faded') return;
                setSelected(day.n);
                setSelectedSessionId(day.sessionId || null);
              }}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selectedSession && (
          <SessionDetailPanel session={selectedSession} isTreasurer={isTreasurer} onAction={onAction} />
        )}
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function selectedDayFromSession(session) {
  const match = String(session?.date || '').match(/-(\d{2})$/);
  return match ? Number(match[1]) : null;
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
  const costRows = Array.isArray(session.costRows)
    ? session.costRows
    : Array.isArray(session.costs) ? session.costs : [];

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
      {costRows.map((c, i) => (
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

      {session.canShowCosts !== false && (
        <SessionCostSection session={session} isTreasurer={isTreasurer} onAction={onAction} />
      )}

      {isTreasurer && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button variant="muted" style={{ flex: 1, fontSize: 12, padding: 11 }} onClick={() => onAction?.('reschedule', session.id)}>📅 Dời buổi</Button>
          <Button variant="brand" style={{ flex: 1, fontSize: 12, padding: 11 }} onClick={() => onAction?.('complete', session.id)}>✓ Hoàn tất</Button>
        </div>
      )}
    </Card>
  );
}

function SessionCostSection({ session, isTreasurer, onAction }) {
  const members = (session.members || [])
    .filter(member => member.id)
    .map(member => ({
      id: member.id,
      name: member.name || member.short || 'TV',
      initial: member.initial || (member.name || '?').slice(0, 1).toUpperCase(),
    }));
  const allMemberIds = members.map(member => member.id);
  const [waterInput, setWaterInput] = useState('');
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [extras, setExtras] = useState([]);
  const canEdit = Boolean(isTreasurer);
  const costDraftKey = `${session.id}:${session.costs?.waterAmount || 0}:${(session.costs?.extras || [])
    .map(extra => `${extra.id || ''}:${extra.note || ''}:${extra.amount || 0}:${(extra.memberIds || []).join(',')}`)
    .join('|')}`;

  useEffect(() => {
    setWaterInput(formatAmountInput(session.costs?.waterAmount || 0));
    setExtras(initialExtraDrafts(session.costs?.extras || [], allMemberIds));
    setExtrasOpen(false);
  }, [costDraftKey]);

  const updateExtra = (id, patch) => {
    setExtras(prev => prev.map(extra => (
      extra.id === id ? { ...extra, ...patch } : extra
    )));
  };
  const addExtra = () => {
    setExtras(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${prev.length}`,
        note: '',
        amountInput: '',
        memberIds: allMemberIds,
      },
    ]);
    setExtrasOpen(true);
  };
  const save = () => {
    const cleanedExtras = extras
      .map(extra => {
        const memberIds = allMemberIds.length > 0 && extra.memberIds.length === allMemberIds.length
          ? null
          : extra.memberIds;
        return {
          note: extra.note,
          amount: parseAmount(extra.amountInput),
          memberIds,
        };
      })
      .filter(extra => extra.amount > 0);
    onAction?.('saveSessionCost', {
      sessionId: session.id,
      waterAmount: parseAmount(waterInput),
      extras: cleanedExtras,
    });
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${colors.borderSubtle}` }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 10, fontWeight: 700, letterSpacing: '1px',
        color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8,
      }}>
        <span>Chi phí buổi này</span>
        <span style={{ color: isTreasurer ? colors.pickleball : colors.textMuted }}>
          {isTreasurer ? 'thủ quỹ' : 'chỉ xem'}
        </span>
      </div>

      <Input
        label="💧 Tiền nước"
        suffix="đ"
        value={waterInput}
        disabled={!canEdit}
        inputMode="numeric"
        onChange={(event) => setWaterInput(formatAmountInput(event.target.value))}
        placeholder="0"
        inputStyle={{ fontWeight: 800, ...type.mono, opacity: canEdit ? 1 : 0.7 }}
        style={{ marginTop: 0 }}
      />

      <button
        type="button"
        onClick={() => setExtrasOpen(open => !open)}
        style={{
          marginTop: 14, width: '100%', padding: '10px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none',
          color: '#cbd5e1', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800 }}>⚡ Phụ phát sinh</span>
        <span style={{ fontSize: 11, color: colors.textSecondary }}>{extrasOpen ? '▼' : '▶'}</span>
      </button>

      {extrasOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {extras.map((extra, index) => (
            <ExtraCostEditor
              key={extra.id}
              index={index}
              extra={extra}
              members={members}
              disabled={!canEdit}
              onChange={(patch) => updateExtra(extra.id, patch)}
            />
          ))}
          {canEdit && (
            <Button variant="muted" style={{ padding: 10, fontSize: 12 }} onClick={addExtra}>
              + Thêm phát sinh
            </Button>
          )}
          {!canEdit && extras.length === 0 && (
            <div style={{ fontSize: 11, color: colors.textSecondary, padding: '6px 0' }}>
              Chưa có phụ phát sinh.
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <Button block variant="success" style={{ marginTop: 14, padding: 12, borderRadius: 12 }} onClick={save}>
          Lưu chi phí
        </Button>
      )}
    </div>
  );
}

function ExtraCostEditor({ index, extra, members, disabled, onChange }) {
  const allMemberIds = members.map(member => member.id);
  const selectedIds = new Set(extra.memberIds);
  const allSelected = allMemberIds.length > 0 && extra.memberIds.length === allMemberIds.length;
  const amount = parseAmount(extra.amountInput);
  const splitCount = Math.max(extra.memberIds.length, 1);
  const perPerson = amount > 0 ? Math.round(amount / splitCount) : 0;
  const toggleMember = (memberId) => {
    if (disabled) return;
    const next = selectedIds.has(memberId)
      ? extra.memberIds.filter(id => id !== memberId)
      : [...extra.memberIds, memberId];
    onChange({ memberIds: next });
  };

  return (
    <div style={{
      padding: 12,
      background: 'rgba(255,255,255,0.035)',
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: colors.pickleball, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
        Phát sinh #{index + 1}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8, marginTop: 8 }}>
        <CostInput
          value={extra.note}
          disabled={disabled}
          placeholder="Ghi chú"
          onChange={(value) => onChange({ note: value })}
        />
        <CostInput
          value={extra.amountInput}
          disabled={disabled}
          placeholder="Số tiền"
          suffix="đ"
          inputMode="numeric"
          onChange={(value) => onChange({ amountInput: formatAmountInput(value) })}
          mono
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: colors.textSecondary, fontWeight: 700 }}>
        Chia cho:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
        {members.map(member => (
          <MemberCostChip
            key={member.id}
            label={member.name}
            selected={selectedIds.has(member.id)}
            disabled={disabled}
            onClick={() => toggleMember(member.id)}
          />
        ))}
        <MemberCostChip
          label="Tất cả"
          selected={allSelected}
          disabled={disabled}
          onClick={() => !disabled && onChange({ memberIds: allMemberIds })}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: perPerson ? '#6ee7b7' : colors.textMuted, fontWeight: 700 }}>
        = {perPerson ? `${formatVNDShort(perPerson)}/người` : '0/người'}
      </div>
    </div>
  );
}

function MemberCostChip({ label, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '5px 9px',
        borderRadius: 100,
        background: selected ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(52,211,153,0.35)' : colors.borderSubtle}`,
        color: selected ? '#6ee7b7' : colors.textSecondary,
        fontSize: 10,
        fontWeight: selected ? 800 : 700,
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.75 : 1,
      }}
    >
      {label}{selected ? ' ✓' : ''}
    </button>
  );
}

function CostInput({ value, disabled, placeholder, suffix, inputMode, onChange, mono }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange?.(event.target.value)}
        style={{
          width: '100%',
          padding: suffix ? '10px 30px 10px 11px' : '10px 11px',
          background: colors.inputBg,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 10,
          color: colors.textPrimary,
          fontSize: 12,
          fontWeight: mono ? 800 : 600,
          fontFamily: 'inherit',
          outline: 'none',
          opacity: disabled ? 0.7 : 1,
          ...(mono ? type.mono : {}),
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: colors.textMuted, fontSize: 11, fontWeight: 700,
        }}>{suffix}</span>
      )}
    </div>
  );
}

function initialExtraDrafts(extras, allMemberIds) {
  return (extras || []).map((extra, index) => ({
    id: extra.id || `extra-${index}`,
    note: extra.note || '',
    amountInput: formatAmountInput(extra.amount || 0),
    memberIds: Array.isArray(extra.memberIds) && extra.memberIds.length > 0 ? extra.memberIds : allMemberIds,
  }));
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

function formatAmountInput(value) {
  const amount = parseAmount(value);
  return amount > 0 ? amount.toLocaleString('vi-VN') : '';
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
    id: 9, number: 9, date: '2026-05-19', dateLabel: 'T3 19/05',
    timeRange: '19:00 – 21:00', court: 'Sân 3',
    status: { tone: 'brand', label: 'Hôm nay' },
    attendance: { present: 10, total: 12, guests: 1 },
    members: [
      { id: 1, initial: 'L', name: 'Long' },
      { id: 2, initial: 'M', name: 'Minh' },
      { id: 3, initial: 'H', name: 'Hoa' },
      { id: 4, initial: 'N', name: 'Nam' },
      { id: 5, initial: 'T', name: 'Tuấn' },
      { id: 6, initial: 'Li', name: 'Linh' },
    ],
    attendees: [
      { id: 1, initial: 'L', name: 'Long', kind: 'present' },
      { id: 2, initial: 'M', name: 'Minh', kind: 'present' },
      { id: 3, initial: 'H', name: 'Hoa',  kind: 'present' },
      { id: 4, initial: 'N', name: 'Nam',  kind: 'present' },
      { id: 5, initial: 'T', name: 'Tuấn', kind: 'absent' },
      { id: 6, initial: 'Li',name: 'Linh', kind: 'absent' },
      { id: 7, initial: 'K', name: 'An',   kind: 'guest' },
    ],
    costs: {
      waterAmount: 120000,
      extras: [
        { id: 'demo-extra-1', note: 'Băng dán vợt', amount: 80000, memberIds: [1, 2, 3, 4] },
      ],
    },
    costRows: [
      { label: '🏸 Tiền sân/người',     amount: 20000 },
      { label: '💧 Tiền nước/người',    amount: 12000 },
      { label: '📦 Băng dán vợt',       amount: 8000 },
    ],
    totalPerPerson: 40000,
    canShowCosts: true,
  },
};
