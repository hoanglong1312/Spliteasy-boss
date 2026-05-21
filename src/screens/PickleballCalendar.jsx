// Spliteasy Boss — Pickleball · Buổi đánh (calendar + detail panel)
// Props: data { clubName, monthLabel, days[], selectedSession }, isTreasurer

import React, { useEffect, useState } from 'react';
import { colors, type, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Card, Button, Badge, SubTabs, Input,
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
const ATTENDANCE_CHIP_SIZE = 34;

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
      <Screen style={{ paddingBottom: '72px' }}>
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
          <SessionDetailPanel
            session={selectedSession}
            casualMembers={d.casualMembers || []}
            isTreasurer={isTreasurer}
            onAction={onAction}
          />
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

function SessionDetailPanel({ session, casualMembers = [], isTreasurer, onAction }) {
  const costRows = Array.isArray(session.costRows)
    ? session.costRows
    : Array.isArray(session.costs) ? session.costs : [];
  const [guestName, setGuestName] = useState('');
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [submittingGuest, setSubmittingGuest] = useState(false);
  const costMembers = (session.members || [])
    .filter(member => member.id)
    .map(member => ({
      id: member.id,
      name: member.name || member.short || 'TV',
      initial: member.initial || (member.name || '?').slice(0, 1).toUpperCase(),
    }));
  const allCostMemberIds = costMembers.map(member => member.id);
  const [waterInput, setWaterInput] = useState('');
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [extras, setExtras] = useState([]);
  const [savingSessionToggle, setSavingSessionToggle] = useState(false);
  const [costSaveState, setCostSaveState] = useState('');
  const canEditCosts = Boolean(isTreasurer);
  const costDraftKey = `${session.id}:${session.costs?.waterAmount || 0}:${(session.costs?.extras || [])
    .map(extra => `${extra.id || ''}:${extra.note || ''}:${extra.amount || 0}:${(extra.memberIds || []).join(',')}`)
    .join('|')}`;

  useEffect(() => {
    setWaterInput(formatAmountInput(session.costs?.waterAmount || 0));
    setExtras(initialExtraDrafts(session.costs?.extras || [], allCostMemberIds));
    setExtrasOpen(false);
    setWaterOpen(false);
  }, [costDraftKey]);

  useEffect(() => {
    setCostSaveState('');
  }, [session.id]);

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
        memberIds: [],
      },
    ]);
    setExtrasOpen(true);
  };
  const cleanedExtras = () => extras
    .map(extra => {
      const memberIds = allCostMemberIds.length > 0 && extra.memberIds.length === allCostMemberIds.length
        ? null
        : extra.memberIds;
      return {
        note: extra.note,
        amount: parseAmount(extra.amountInput),
        memberIds,
      };
    })
    .filter(extra => extra.amount > 0);
  const saveSessionCosts = async () => {
    setCostSaveState('');
    await onAction?.('saveSessionCost', {
      sessionId: session.id,
      waterAmount: parseAmount(waterInput),
      extras: cleanedExtras(),
    });
    setCostSaveState('saved');
  };
  const toggleSessionCompletion = async () => {
    if (savingSessionToggle || !session.canComplete) return;
    setSavingSessionToggle(true);
    try {
      if (session.isCompleted) {
        await onAction?.('reopenSession', session.id);
      } else {
        await saveSessionCosts();
        await onAction?.('completeSession', session.id);
      }
    } catch (err) {
      console.error('[PickleballCalendar] toggleSessionCompletion:', err);
      setCostSaveState('error');
    } finally {
      setSavingSessionToggle(false);
    }
  };

  async function addGuest(event) {
    event.preventDefault();
    const name = guestName.trim();
    if (!name || submittingGuest) return;
    setSubmittingGuest(true);
    try {
      await onAction?.('addGuest', {
        sessionId: session.id,
        guestName: name,
      });
      setGuestName('');
      setGuestFormOpen(false);
    } finally {
      setSubmittingGuest(false);
    }
  }

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
        {isTreasurer && session.canComplete ? (
          <button
            type="button"
            aria-pressed={session.isCompleted}
            disabled={savingSessionToggle}
            onClick={toggleSessionCompletion}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '8px 13px',
              minWidth: 86,
              background: session.isCompleted ? 'rgba(52,211,153,0.18)' : 'rgba(250,204,21,0.16)',
              color: session.isCompleted ? '#6ee7b7' : '#fde68a',
              fontSize: 11,
              fontWeight: 900,
              fontFamily: 'inherit',
              lineHeight: 1.1,
              cursor: savingSessionToggle ? 'default' : 'pointer',
              opacity: savingSessionToggle ? 0.7 : 1,
            }}
          >
            ● {savingSessionToggle ? 'Đang lưu' : session.isCompleted ? 'Đã đánh' : 'Chưa chốt'}
          </button>
        ) : (
          <Badge tone={session.status.tone}>● {session.status.label}</Badge>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
          Điểm danh · {session.attendance.present}/{session.attendance.total} tham gia
          {session.attendance.guests > 0 && ` · ${session.attendance.guests} khách`}
        </div>
        {isTreasurer && (
          <button
            type="button"
            onClick={() => setGuestFormOpen(open => !open)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 11,
              color: colors.brandLight,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              padding: 0,
            }}
          >+ Thêm khách</button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {session.attendees.map(a => (
          <AttendChip
            key={a.id}
            a={a}
            isTreasurer={isTreasurer}
            sessionId={session.id}
            onAction={onAction}
            onToggle={isTreasurer && a.kind !== 'guest' ? () => onAction?.('markAttendance', {
              sessionId: session.id,
              memberId: a.id,
              status: a.kind === 'present' ? 'absent' : 'present',
            }) : undefined}
          />
        ))}
      </div>

      {guestFormOpen && isTreasurer && (
        <form onSubmit={addGuest} style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 8,
          marginTop: 10,
        }}>
          {casualMembers.length > 0 && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              {casualMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setGuestName(member.name)}
                  style={{
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: 8,
                    background: colors.cardSurface,
                    color: colors.textSecondary,
                    padding: '6px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >{member.name}</button>
              ))}
            </div>
          )}
          <Input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Tên khách mới hoặc vãng lai"
            inputStyle={{ padding: '10px 11px', fontSize: 12, fontWeight: 700 }}
            style={{ marginTop: 0 }}
          />
          <Button type="submit" disabled={submittingGuest} variant="muted" style={{ padding: '10px 12px', borderRadius: 10, fontSize: 12 }}>
            Thêm
          </Button>
        </form>
      )}

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
        <SessionCostSection
          session={session}
          isTreasurer={isTreasurer}
          members={costMembers}
          waterInput={waterInput}
          setWaterInput={setWaterInput}
          waterOpen={waterOpen}
          setWaterOpen={setWaterOpen}
          extras={extras}
          extrasOpen={extrasOpen}
          setExtrasOpen={setExtrasOpen}
          updateExtra={updateExtra}
          addExtra={addExtra}
          costSaveState={costSaveState}
          canEdit={canEditCosts}
        />
      )}

    </Card>
  );
}

function SessionCostSection({
  isTreasurer,
  members,
  waterInput,
  setWaterInput,
  waterOpen,
  setWaterOpen,
  extras,
  extrasOpen,
  setExtrasOpen,
  updateExtra,
  addExtra,
  costSaveState,
  canEdit,
}) {
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

      <button
        type="button"
        onClick={() => setWaterOpen(open => !open)}
        style={{
          marginTop: 8, width: '100%', padding: '10px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none',
          color: '#cbd5e1', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800 }}>💧 Tiền nước</span>
        <span style={{ fontSize: 11, color: colors.textSecondary }}>{waterOpen ? '▼' : '▶'}</span>
      </button>
      {waterOpen && (
        <Input
          label=""
          suffix="đ"
          value={waterInput}
          disabled={!canEdit}
          inputMode="numeric"
          onChange={(event) => setWaterInput(formatAmountInput(event.target.value))}
          placeholder="0"
          inputStyle={{ fontWeight: 800, ...type.mono, opacity: canEdit ? 1 : 0.7 }}
          style={{ marginTop: 0 }}
        />
      )}

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

      {costSaveState && (
        <div style={{
          marginTop: 8,
          fontSize: 10,
          fontWeight: 800,
          color: costSaveState === 'saved' ? '#6ee7b7' : '#fca5a5',
        }}>
          {costSaveState === 'saved' ? 'Đã lưu chi phí buổi.' : 'Không lưu được. Thử lại.'}
        </div>
      )}
    </div>
  );
}

function ExtraCostEditor({ index, extra, members, disabled, onChange }) {
  const allMemberIds = members.map(member => member.id);
  const selectedIds = new Set(extra.memberIds);
  const allSelected = allMemberIds.length > 0 && extra.memberIds.length === allMemberIds.length;
  const amount = parseAmount(extra.amountInput);
  const splitCount = extra.memberIds.length;
  const splitLabel = splitCount > 0 ? `${splitCount} người` : '0 người';
  const perPerson = amount > 0 && splitCount > 0 ? Math.round(amount / splitCount) : 0;
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
        Chia cho: {splitLabel}
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
    memberIds: Array.isArray(extra.memberIds) ? extra.memberIds : allMemberIds,
  }));
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

function formatAmountInput(value) {
  const amount = parseAmount(value);
  return amount > 0 ? amount.toLocaleString('vi-VN') : '';
}

function AttendChip({ a, onToggle, isTreasurer, sessionId, onAction }) {
  const active = a.kind === 'present' || a.kind === 'guest';

  if (a.kind === 'guest') {
    return (
      <div style={{
        flex: '1 1 132px',
        maxWidth: 180,
        minWidth: 132,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 6px',
        borderRadius: 999,
        background: 'rgba(96,165,250,0.12)',
        border: '1px solid rgba(96,165,250,0.38)',
        boxShadow: '0 0 14px rgba(59,130,246,0.16)',
      }}>
        <span style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(96,165,250,0.22)',
          border: '1px solid rgba(147,197,253,0.44)',
          color: '#bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 900,
          flexShrink: 0,
        }}>
          {a.initial}
        </span>
        <div style={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <span style={{
            color: '#dbeafe',
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {a.name}
          </span>
          <span style={{
            color: '#93c5fd',
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
          }}>
            Khách
          </span>
        </div>
        {isTreasurer && (
          <button
            type="button"
            onClick={() => onAction?.('removeGuest', { sessionId, attendeeId: a.id })}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid rgba(248,113,113,0.34)',
              background: 'rgba(248,113,113,0.10)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
            aria-label={`Xóa ${a.name}`}
          >×</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${a.name} ${active ? 'tham gia' : 'vắng'}`}
        style={{
          width: ATTENDANCE_CHIP_SIZE,
          height: ATTENDANCE_CHIP_SIZE,
          borderRadius: '50%',
          background: a.kind === 'present' ? colors.pickleball : 'rgba(255,255,255,0.06)',
          border: `1px solid ${active ? 'rgba(52,211,153,0.48)' : colors.borderSubtle}`,
          color: active ? '#052e26' : colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
          fontFamily: 'inherit',
          cursor: onToggle ? 'pointer' : 'default',
          boxShadow: active ? '0 0 12px rgba(52,211,153,0.22)' : 'none',
        }}
      >
        {a.initial}
      </button>
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
      }}>
        <span style={{
          color: active ? '#6ee7b7' : colors.textMuted,
          fontSize: 9,
          fontWeight: 700,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}>
          {a.name}
        </span>
      </div>
    </div>
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
