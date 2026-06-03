// Spliteasy Boss — Pickleball · Buổi đánh (calendar + detail panel)
// Props: data { clubName, monthLabel, days[], selectedSession }, isTreasurer

import React, { useEffect, useState } from 'react';
import { colors, type, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, MonthNav, Card, Button, Badge, SubTabs, Input,
  LoadingSpinner, loadingOverlayStyle,
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
  ticket:   { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.38)',       color: '#fde68a' },
  ticketOther: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(251,191,36,0.48)', dashed: true, color: '#fcd34d' },
};

const DOT_COLOR = { attended: '#34d399', absent: '#f87171', missed: '#f87171', today: '#818cf8', ticket: '#fbbf24', ticketOther: 'rgba(251,191,36,0.55)' };
const ATTENDANCE_CHIP_SIZE = 34;
const ATTENDANCE_NAME_WIDTH = 44;

export default function PickleballCalendar({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const initialSession = d.selectedSession || (d.sessions || [])[0] || null;
  const [selectedDate, setSelectedDate] = useState(d.selectedSessionDate || initialSession?.date || '');
  const [selectedSessionId, setSelectedSessionId] = useState(initialSession?.id || null);
  const [savingAction, setSavingAction] = useState('');
  const selectedSession = selectedSessionId
    ? ((d.sessions || []).find(session => String(session.id) === String(selectedSessionId)) ||
      (String(d.selectedSession?.id) === String(selectedSessionId) ? d.selectedSession : null))
    : null;
  const selectedTickets = (d.tickets || []).filter(ticket => ticket.date === selectedDate);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  useEffect(() => {
    const nextSession = d.selectedSession || (d.sessions || [])[0] || null;
    setSelectedDate(d.selectedSessionDate || nextSession?.date || '');
    setSelectedSessionId(nextSession?.id || null);
  }, [d.selectedSession?.id, d.selectedSessionDate]);

  useEffect(() => {
    if (editingTicket) setTicketFormOpen(true);
  }, [editingTicket]);

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
          <LegendChip color="rgba(251,191,36,0.75)" label="Vé của tôi" />
          <LegendChip dashed borderColor="rgba(251,191,36,0.75)" label="Vé khác" />
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
              selected={day.date === selectedDate}
              onClick={() => {
                if (day.state === 'faded') return;
                setSelectedDate(day.date);
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
            savingAction={savingAction}
            setSavingAction={setSavingAction}
            onAction={onAction}
          />
        )}
        {(selectedTickets.length > 0 || (!selectedSession && selectedDate)) && (
          <TicketDayPanel
            date={selectedDate}
            tickets={selectedTickets}
            isTreasurer={isTreasurer}
            onAdd={() => {
              setEditingTicket(null);
              setTicketFormOpen(true);
            }}
            onEdit={setEditingTicket}
            savingAction={savingAction}
            setSavingAction={setSavingAction}
            onAction={onAction}
          />
        )}
      </Screen>

      {ticketFormOpen && (
        <AddTicketSheet
          data={d}
          selectedDate={editingTicket?.date || selectedDate}
          editingTicket={editingTicket}
          onClose={() => {
            setTicketFormOpen(false);
            setEditingTicket(null);
          }}
          onSave={async (payload) => {
            if (editingTicket) {
              await onAction?.('updateTicket', { ticketId: editingTicket.id, ...payload });
            } else {
              await onAction?.('addTicket', payload);
            }
            setTicketFormOpen(false);
            setEditingTicket(null);
          }}
        />
      )}

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
      {savingAction && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
        </div>
      )}
    </PhoneFrame>
  );
}

function selectedDayFromSession(session) {
  const match = String(session?.date || '').match(/-(\d{2})$/);
  return match ? Number(match[1]) : null;
}

function nextDateInputValue(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function LegendChip({ color, label, dashed, borderColor }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 2,
        background: color || 'transparent',
        border: dashed ? `1px dashed ${borderColor || 'rgba(99,102,241,0.55)'}` : 'none',
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
      {day.hasTicket && !['ticket', 'ticketOther'].includes(day.state) && (
        <span style={{
          position: 'absolute',
          right: 4,
          bottom: 4,
          width: day.hasCurrentUserTicket ? 6 : 5,
          height: day.hasCurrentUserTicket ? 6 : 5,
          borderRadius: '50%',
          background: day.hasCurrentUserTicket ? '#fbbf24' : 'rgba(251,191,36,0.55)',
          boxShadow: day.hasCurrentUserTicket ? '0 0 0 2px rgba(251,191,36,0.18)' : 'none',
        }} />
      )}
    </button>
  );
}

function TicketDayPanel({ date, tickets, isTreasurer, onAdd, onEdit, savingAction, setSavingAction, onAction }) {
  const dateLabel = formatDayLabel(date);
  const total = tickets.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0);
  async function approveTicket(ticket) {
    if (savingAction) return;
    setSavingAction('approveTicket');
    try {
      await onAction?.('approveTicket', { ticketId: ticket.id, status: ticket.advancerId ? 'unpaid' : 'team_fund' });
    } finally {
      setSavingAction('');
    }
  }

  async function deleteTicket(ticket) {
    if (savingAction) return;
    setSavingAction('deleteTicket');
    try {
      await onAction?.('deleteTicket', { ticketId: ticket.id });
    } finally {
      setSavingAction('');
    }
  }

  return (
    <Card accent="pickleball" style={{ marginTop: 16, borderColor: 'rgba(251,191,36,0.28)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Vé lẻ · {dateLabel}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
            {tickets.length > 0 ? `${tickets.length} lượt · ${formatVNDShort(total)}` : 'Chưa có dữ liệu vé lẻ ngày này'}
          </div>
        </div>
        <Button variant="muted" onClick={onAdd} style={{ padding: '8px 11px', borderRadius: 10, fontSize: 12 }}>
          + Thêm vé
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
        {tickets.map(ticket => (
          <div key={ticket.id} style={{
            padding: 10,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.035)',
            border: `1px solid ${colors.borderSubtle}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900 }}>
                  {formatTimeLabel(ticket.timeLabel)} · {ticket.memberIds.length} người
                </div>
                <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(ticket.memberLabels || []).join(', ')}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fde68a', ...type.mono }}>
                {formatVNDShort(ticket.amountPerPerson)}/người
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
              <div style={{ fontSize: 10, color: ticket.status === 'pending_review' ? '#93c5fd' : ticket.status === 'team_fund' ? '#c4b5fd' : '#fcd34d', fontWeight: 800 }}>
                {ticket.status === 'pending_review'
                  ? 'Chờ thủ quỹ duyệt'
                  : ticket.status === 'team_fund' ? 'Quỹ team trả' : `${ticket.advancerName || 'Người ứng'} ứng`}
              </div>
              {isTreasurer && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {ticket.status === 'pending_review' && (
                    <button
                      type="button"
                      onClick={() => approveTicket(ticket)} disabled={savingAction === 'approveTicket'}
                      style={ticketActionStyle('success')}
                    >{savingAction === 'approveTicket' ? 'Đang xử lý…' : 'Duyệt'}</button>
                  )}
                  <button type="button" onClick={() => onEdit?.(ticket)} style={ticketActionStyle('neutral')}>Sửa</button>
                  <button type="button" onClick={() => deleteTicket(ticket)} disabled={savingAction === 'deleteTicket'} style={ticketActionStyle('danger')}>{savingAction === 'deleteTicket' ? 'Đang xóa…' : 'Xóa'}</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AddTicketSheet({ data, selectedDate, editingTicket = null, onClose, onSave }) {
  const members = data.ticketMembers || [];
  const initialPaymentMode = editingTicket?.advancerId ? 'advancer' : 'team_fund';
  const [time, setTime] = useState(formatTimeLabel(editingTicket?.timeLabel || editingTicket?.time || '19:00'));
  const [memberIds, setMemberIds] = useState(editingTicket?.memberIds || []);
  const [paymentMode, setPaymentMode] = useState(initialPaymentMode);
  const [advancerId, setAdvancerId] = useState(editingTicket?.advancerId || '');
  const [error, setError] = useState('');
  const selectedMembers = members.filter(member => memberIds.some(id => String(id) === String(member.id)));
  const ticketPrice = Number(editingTicket?.amountPerPerson || data.ticketPricePerPerson || data.ticketPrice || 50000) || 50000;
  const totalAmount = ticketPrice * memberIds.length;

  useEffect(() => {
    if (paymentMode !== 'advancer') return;
    if (selectedMembers.some(member => String(member.id) === String(advancerId))) return;
    setAdvancerId(selectedMembers[0]?.id || '');
  }, [advancerId, paymentMode, selectedMembers]);

  const toggleMember = (memberId) => {
    setError('');
    setMemberIds(current => (
      current.some(id => String(id) === String(memberId))
        ? current.filter(id => String(id) !== String(memberId))
        : [...current, memberId]
    ));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!selectedDate) return setError('Chọn ngày chơi.');
    if (!String(time || '').trim()) return setError('Nhập giờ chơi.');
    if (memberIds.length === 0) return setError('Chọn ít nhất một người.');
    if (paymentMode === 'advancer' && !advancerId) return setError('Chọn người ứng tiền.');
    try {
      await onSave({
        session_date: selectedDate,
        session_time: time,
        member_ids: memberIds,
        total_amount: totalAmount,
        advancer_id: paymentMode === 'advancer' ? advancerId : null,
        paymentMode,
      });
    } catch (err) {
      setError(ticketErrorMessage(err));
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 40,
      background: 'rgba(0,0,0,0.58)',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 12,
    }}>
      <form onSubmit={submit} style={{
        width: '100%',
        maxHeight: 700,
        overflowY: 'auto',
        background: colors.shellBg,
        border: `1px solid ${colors.borderNormal}`,
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Vé lẻ · {formatDayLabel(selectedDate)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{editingTicket ? 'Sửa vé lẻ' : 'Thêm buổi xé vé'}</div>
          </div>
          <button type="button" onClick={onClose} style={{
            border: 'none',
            background: 'transparent',
            color: colors.textSecondary,
            fontSize: 22,
            cursor: 'pointer',
          }}>×</button>
        </div>

        <Input
          label="Giờ"
          value={time}
          onChange={event => {
            setTime(event.target.value);
            setError('');
          }}
          placeholder="19:00"
          inputMode="numeric"
        />

        <div style={{ marginTop: 14, fontSize: 10, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Người tham gia · {memberIds.length} người
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {members.map(member => {
            const active = memberIds.some(id => String(id) === String(member.id));
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                style={{
                  borderRadius: 100,
                  border: `1px solid ${active ? 'rgba(251,191,36,0.38)' : colors.borderSubtle}`,
                  background: active ? 'rgba(251,191,36,0.12)' : colors.inputBg,
                  color: active ? '#fde68a' : colors.textSecondary,
                  padding: '7px 10px',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {member.name}{active ? ' ✓' : ''}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, padding: 11, borderRadius: 12, background: 'rgba(251,191,36,0.09)', border: '1px solid rgba(251,191,36,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 900 }}>
            <span>{formatVNDShort(ticketPrice)}/người</span>
            <span style={{ ...type.mono }}>Tổng {formatVNDShort(totalAmount)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <label style={paymentRowStyle(paymentMode === 'team_fund')}>
            <input type="radio" checked={paymentMode === 'team_fund'} onChange={() => setPaymentMode('team_fund')} style={{ accentColor: colors.pickleball }} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Quỹ team trả</span>
          </label>
          <label style={paymentRowStyle(paymentMode === 'advancer')}>
            <input type="radio" checked={paymentMode === 'advancer'} onChange={() => setPaymentMode('advancer')} style={{ accentColor: colors.pickleball }} />
            <select value={advancerId} disabled={paymentMode !== 'advancer'} onChange={event => setAdvancerId(event.target.value)} style={selectStyle()}>
              <option value="">Chọn người ứng...</option>
              {selectedMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
        </div>

        {error && <div style={{ marginTop: 10, color: colors.danger, fontSize: 11, fontWeight: 800 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button type="button" variant="ghost" block onClick={onClose} style={{ padding: 12 }}>Hủy</Button>
          <Button type="submit" variant="success" block style={{ padding: 12 }}>{editingTicket ? 'Cập nhật vé' : 'Lưu vé'}</Button>
        </div>
      </form>
    </div>
  );
}

function ticketErrorMessage(err) {
  const code = String(err?.message || err || '');
  const map = {
    ticket_session_date_required: 'Chọn ngày chơi.',
    ticket_members_required: 'Chọn ít nhất một người.',
    ticket_total_amount_required: 'Không tính được tổng tiền vé.',
    ticket_payment_required: 'Chọn người ứng tiền hoặc quỹ team.',
    ticket_rls_denied: 'Bạn chưa có quyền thêm vé trong nhóm pickleball này.',
  };
  return map[code] || 'Không lưu được vé. Thử lại.';
}

function SessionDetailPanel({ session, casualMembers = [], isTreasurer, savingAction, setSavingAction, onAction }) {
  const costRows = Array.isArray(session.costRows)
    ? session.costRows
    : Array.isArray(session.costs) ? session.costs : [];
  const [guestName, setGuestName] = useState('');
  const [guestFormOpen, setGuestFormOpen] = useState(false);
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
  const [costSaveState, setCostSaveState] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const canManageSession = Boolean(isTreasurer && !session.isCompleted);
  const canEditCosts = canManageSession;
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
    setRescheduleOpen(false);
    setRescheduleDate(nextDateInputValue(session.date));
    setRescheduleNote('');
    setRescheduleError('');
  }, [session.id]);

  const updateExtra = (id, patch) => {
    setExtras(prev => prev.map(extra => (
      extra.id === id ? { ...extra, ...patch } : extra
    )));
  };
  const removeExtra = (id) => {
    const nextExtras = extras.filter(extra => extra.id !== id);
    setExtras(nextExtras);
    saveSessionCosts(nextExtras).catch(err => {
      console.error('[PickleballCalendar] removeExtra:', err);
      setCostSaveState('error');
    });
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
  const cleanedExtras = (sourceExtras = extras) => sourceExtras
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
  const saveSessionCosts = async (sourceExtras = extras) => {
    if (savingAction) return;
    setSavingAction('saveSessionCost');
    setCostSaveState('');
    try {
      await onAction?.('saveSessionCost', {
        sessionId: session.id,
        waterAmount: parseAmount(waterInput),
        extras: cleanedExtras(sourceExtras),
      });
      setCostSaveState('saved');
    } finally {
      setSavingAction('');
    }
  };
  const toggleSessionCompletion = async () => {
    if (savingAction || !session.canComplete) return;
    setSavingAction('toggleSession');
    try {
      if (session.isCompleted) {
        await onAction?.('reopenSession', session.id);
      } else {
        await onAction?.('saveSessionCost', {
          sessionId: session.id,
          waterAmount: parseAmount(waterInput),
          extras: cleanedExtras(extras),
        });
        setCostSaveState('saved');
        await onAction?.('completeSession', session.id);
      }
    } catch (err) {
      console.error('[PickleballCalendar] toggleSessionCompletion:', err);
      setCostSaveState('error');
    } finally {
      setSavingAction('');
    }
  };
  const saveReschedule = async (event) => {
    event.preventDefault();
    if (savingAction) return;
    if (!session.canReschedule || !rescheduleDate) return;
    setSavingAction('rescheduleSession');
    setRescheduleError('');
    try {
      await onAction?.('rescheduleSession', {
        sessionId: session.id,
        date: rescheduleDate,
        notes: rescheduleNote,
      });
      setRescheduleOpen(false);
    } catch (err) {
      const message = String(err?.message || '')
      setRescheduleError(message === 'reschedule_date_conflict'
        ? 'Ngày này đã có buổi trong lịch. Chọn ngày khác.'
        : message === 'reschedule_same_date'
        ? 'Ngày mới phải khác ngày hiện tại.'
        : 'Chưa dời được buổi. Thử lại sau.')
    } finally {
      setSavingAction('');
    }
  };

  async function addGuest(event) {
    event.preventDefault();
    const name = guestName.trim();
    if (!name || savingAction) return;
    setSavingAction('addGuest');
    try {
      await onAction?.('addGuest', {
        sessionId: session.id,
        guestName: name,
      });
      setGuestName('');
      setGuestFormOpen(false);
    } finally {
      setSavingAction('');
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
        {isTreasurer && session.canRestore ? (
          <button
            type="button"
            onClick={() => onAction?.('reopenSession', { sessionId: session.id })}
            style={{
              border: '1px solid rgba(250,204,21,0.34)',
              borderRadius: 999,
              padding: '8px 13px',
              minWidth: 86,
              background: 'rgba(250,204,21,0.12)',
              color: '#fde68a',
              fontSize: 11,
              fontWeight: 900,
              fontFamily: 'inherit',
              lineHeight: 1.1,
              cursor: 'pointer',
            }}
          >
            Khôi phục
          </button>
        ) : isTreasurer && session.canComplete ? (
          <button
            type="button"
            aria-pressed={session.isCompleted}
            disabled={savingAction === 'toggleSession'}
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
              cursor: savingAction === 'toggleSession' ? 'default' : 'pointer',
              opacity: savingAction === 'toggleSession' ? 0.7 : 1,
            }}
          >
            ● {savingAction === 'toggleSession' ? 'Đang xử lý…' : session.isCompleted ? 'Đã đánh' : 'Chưa chốt'}
          </button>
        ) : (
          <Badge tone={session.status.tone}>● {session.status.label}</Badge>
        )}
      </div>

      {(session.moveInfo?.fromDate || session.moveInfo?.toDate || session.moveInfo?.reason) && (
        <div style={{
          marginTop: 10,
          padding: '9px 10px',
          borderRadius: 10,
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.18)',
          color: '#fde68a',
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.45,
        }}>
          {session.moveInfo?.fromDate && session.moveInfo?.toDate && (
            <div>Đã dời: {formatDayLabel(session.moveInfo.fromDate)} → {formatDayLabel(session.moveInfo.toDate)}</div>
          )}
          {session.moveInfo?.reason && (
            <div style={{ color: colors.textSecondary, marginTop: 2 }}>Lý do: {session.moveInfo.reason}</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
          Điểm danh · {session.attendance.present}/{session.attendance.total} tham gia
          {session.attendance.guests > 0 && ` · ${session.attendance.guests} khách`}
        </div>
        {canManageSession && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {session.canReschedule && (
              <button
                type="button"
                onClick={() => setRescheduleOpen(open => !open)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 11,
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >Dời buổi</button>
            )}
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
          </div>
        )}
      </div>

      {rescheduleOpen && canManageSession && session.canReschedule && (
        <form onSubmit={saveReschedule} style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 8,
          marginTop: 10,
          padding: 12,
          borderRadius: 12,
          border: '1px solid rgba(251,191,36,0.22)',
          background: 'rgba(251,191,36,0.07)',
        }}>
          <Input
            label="Ngày mới"
            type="date"
            value={rescheduleDate}
            onChange={(event) => {
              setRescheduleDate(event.target.value);
              setRescheduleError('');
            }}
            inputStyle={{ padding: '10px 11px', fontSize: 12, fontWeight: 800 }}
            style={{ marginTop: 0 }}
          />
          <Input
            label="Lý do"
            value={rescheduleNote}
            onChange={(event) => {
              setRescheduleNote(event.target.value);
              setRescheduleError('');
            }}
            placeholder="Ví dụ: mưa lớn"
            inputStyle={{ padding: '10px 11px', fontSize: 12, fontWeight: 700 }}
            style={{ marginTop: 0 }}
          />
          {rescheduleError && (
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fecaca', lineHeight: 1.35 }}>
              {rescheduleError}
            </div>
          )}
          <Button type="submit" variant="muted" disabled={!rescheduleDate || savingAction === 'rescheduleSession'} style={{ padding: 10, borderRadius: 10, fontSize: 12 }}>
            {savingAction === 'rescheduleSession' ? 'Đang lưu…' : 'Lưu ngày mới'}
          </Button>
        </form>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {session.attendees.map(a => (
          <AttendChip
            key={a.id}
            a={a}
            isTreasurer={canManageSession}
            sessionId={session.id}
            savingAction={savingAction}
            setSavingAction={setSavingAction}
            onAction={onAction}
            onToggle={canManageSession && a.kind !== 'guest' ? () => onAction?.('markAttendance', {
              sessionId: session.id,
              memberId: a.id,
              status: a.kind === 'present' ? 'absent' : 'present',
            }) : undefined}
          />
        ))}
      </div>

      {guestFormOpen && canManageSession && (
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
          <Button type="submit" disabled={!guestName.trim() || savingAction === 'addGuest'} variant="muted" style={{ padding: '10px 12px', borderRadius: 10, fontSize: 12 }}>
            {savingAction === 'addGuest' ? 'Đang lưu…' : 'Thêm'}
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
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng/người tham gia</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: colors.pickleball, ...type.mono }}>
          {session.totalPerPerson.toLocaleString('vi-VN')} đ
        </span>
      </div>
      {session.personalCostNote && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 8,
          padding: '9px 11px',
          borderRadius: 10,
          background: session.currentUserPresent ? 'rgba(52,211,153,0.08)' : 'rgba(148,163,184,0.08)',
          color: session.currentUserPresent ? '#a7f3d0' : '#cbd5e1',
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1.3,
        }}>
          <span>{session.personalCostNote}</span>
          <span style={{ whiteSpace: 'nowrap', ...type.mono }}>{(session.currentUserTotal || 0).toLocaleString('vi-VN')} đ</span>
        </div>
      )}

      {session.canShowCosts !== false && (
        <SessionCostSection
          session={session}
          isTreasurer={canManageSession}
          members={costMembers}
          waterInput={waterInput}
          setWaterInput={setWaterInput}
          waterOpen={waterOpen}
          setWaterOpen={setWaterOpen}
          extras={extras}
          extrasOpen={extrasOpen}
          setExtrasOpen={setExtrasOpen}
          updateExtra={updateExtra}
          removeExtra={removeExtra}
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
  removeExtra,
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
              onRemove={() => removeExtra(extra.id)}
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

function ExtraCostEditor({ index, extra, members, disabled, onChange, onRemove }) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: colors.pickleball, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Phát sinh #{index + 1}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              border: '1px solid rgba(248,113,113,0.24)',
              background: colors.dangerSoft,
              color: '#fca5a5',
              borderRadius: 9,
              padding: '5px 8px',
              fontSize: 10,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >Xóa</button>
        )}
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

function ticketActionStyle(tone) {
  const palette = tone === 'danger'
    ? { bg: colors.dangerSoft, border: 'rgba(248,113,113,0.24)', color: '#fca5a5' }
    : tone === 'neutral'
      ? { bg: 'rgba(255,255,255,0.05)', border: colors.borderSubtle, color: colors.textSecondary }
      : { bg: colors.successSoft, border: 'rgba(52,211,153,0.28)', color: '#86efac' };
  return {
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
    borderRadius: 9,
    padding: '6px 9px',
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function paymentRowStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    background: active ? 'rgba(52,211,153,0.10)' : colors.inputBg,
    border: `1px solid ${active ? 'rgba(52,211,153,0.30)' : colors.borderSubtle}`,
    borderRadius: 12,
  };
}

function selectStyle() {
  return {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: colors.textPrimary,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 800,
  };
}

function formatTimeLabel(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : text || '19:00';
}

function formatDayLabel(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}` : String(value || '');
}

function AttendChip({ a, onToggle, isTreasurer, sessionId, savingAction, setSavingAction, onAction }) {
  const active = a.kind === 'present' || a.kind === 'guest';

  async function removeGuest() {
    if (savingAction) return;
    setSavingAction('removeGuest');
    try {
      await onAction?.('removeGuest', { sessionId, attendeeId: a.id });
    } finally {
      setSavingAction('');
    }
  }

  if (a.kind === 'guest') {
    return (
      <div style={{ width: ATTENDANCE_NAME_WIDTH, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: ATTENDANCE_CHIP_SIZE,
          height: ATTENDANCE_CHIP_SIZE,
          borderRadius: '50%',
          background: 'rgba(96,165,250,0.22)',
          border: '1px solid rgba(147,197,253,0.44)',
          color: '#bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
          position: 'relative',
          boxShadow: '0 0 12px rgba(59,130,246,0.20)',
        }}>
          {a.initial}
          {isTreasurer && (
            <button
              type="button"
              onClick={removeGuest} disabled={savingAction === 'removeGuest'}
              style={{
                position: 'absolute',
                right: -4,
                top: -4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '1px solid rgba(248,113,113,0.46)',
                background: '#172033',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={`Xóa ${a.name}`}
            >×</button>
          )}
        </div>
        <span style={{
          width: ATTENDANCE_NAME_WIDTH,
          color: '#93c5fd',
          fontSize: 9,
          fontWeight: 700,
          textAlign: 'center',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.2,
        }}>
          {a.name}
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: ATTENDANCE_NAME_WIDTH, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
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
          opacity: onToggle ? 1 : 0.78,
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
          width: ATTENDANCE_NAME_WIDTH,
          color: active ? '#6ee7b7' : colors.textMuted,
          fontSize: 9,
          fontWeight: 700,
          textAlign: 'center',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.2,
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
