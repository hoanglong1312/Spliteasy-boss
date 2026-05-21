// Spliteasy Boss — Pickleball · Nhập nhanh chi phí tháng
// Props: data { monthLabel, sessions[], summary, members[] }

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND, formatVNDShort } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button } from '../primitives';

export default function BatchEntry({ data, onAction }) {
  const d = data || DEMO;
  const [sessions, setSessions] = useState(() => sessionDrafts(d));
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [extraDraft, setExtraDraft] = useState(() => emptyExtraDraft(d.members || []));

  useEffect(() => {
    setSessions(sessionDrafts(d));
    setActiveSessionId(null);
    setExtraDraft(emptyExtraDraft(d.members || []));
  }, [data]);

  const members = d.members || collectMembers(sessions);
  const activeSession = sessions.find(session => String(session.id) === String(activeSessionId));
  const totalWater = sessions.reduce((sum, session) => sum + parseAmount(session.waterInput), 0);

  function updateWater(sessionId, value) {
    setSessions(items => items.map(session => (
      String(session.id) === String(sessionId)
        ? { ...session, waterInput: formatAmountInput(value) }
        : session
    )));
  }

  function openExtraSheet(session) {
    const sessionMembers = session.members?.length ? session.members : members;
    setActiveSessionId(session.id);
    setExtraDraft(emptyExtraDraft(sessionMembers));
  }

  function saveExtra() {
    if (!activeSession) return;
    const amount = parseAmount(extraDraft.amountInput);
    if (amount <= 0) {
      setActiveSessionId(null);
      return;
    }
    const nextExtra = {
      id: `batch-${Date.now()}`,
      note: extraDraft.note.trim() || 'Phụ phát sinh',
      amount,
      memberIds: extraDraft.memberIds,
    };
    const nextExtras = [...(activeSession.extras || []), nextExtra];
    setSessions(items => items.map(session => (
      String(session.id) === String(activeSession.id)
        ? { ...session, extras: nextExtras }
        : session
    )));
    onAction?.('saveSessionCost', {
      sessionId: activeSession.id,
      waterAmount: parseAmount(activeSession.waterInput),
      extras: nextExtras.map(extra => ({
        note: extra.note,
        amount: extra.amount,
        memberIds: isAllMembers(extra.memberIds, activeSession.members || members) ? null : extra.memberIds,
      })),
    });
    setActiveSessionId(null);
  }

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textMuted, textTransform: 'uppercase' }}>
              Pickleball · {d.monthLabel}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>Nhập nhanh chi phí tháng này</div>
          </div>
          <IconButton onClick={() => onAction?.('help')}>?</IconButton>
        </div>

        <Card accent="pickleball" style={{ padding: 0 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '82px 1fr 92px', gap: 8,
            padding: '10px 12px',
            borderBottom: `1px solid ${colors.borderSubtle}`,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.8px',
            color: colors.textMuted, textTransform: 'uppercase',
          }}>
            <span>Ngày</span>
            <span>💧 Nước (đ)</span>
            <span style={{ textAlign: 'right' }}>⚡ Phát sinh</span>
          </div>

          {sessions.map((session, index) => {
            const extraTotal = (session.extras || []).reduce((sum, extra) => sum + (Number(extra.amount) || 0), 0);
            return (
              <div key={session.id} style={{
                display: 'grid', gridTemplateColumns: '82px 1fr 92px', gap: 8,
                alignItems: 'center', padding: '10px 12px',
                borderBottom: index < sessions.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{session.dateLabel}</div>
                  <div style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>#{session.number}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={session.waterInput}
                    inputMode="numeric"
                    onChange={(event) => updateWater(session.id, event.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '10px 28px 10px 10px',
                      background: colors.inputBg,
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: 10,
                      color: colors.textPrimary,
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      outline: 'none',
                      ...type.mono,
                    }}
                  />
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    color: colors.textMuted, fontSize: 10, fontWeight: 700,
                  }}>đ</span>
                </div>
                <button
                  type="button"
                  onClick={() => openExtraSheet(session)}
                  style={{
                    justifySelf: 'end',
                    padding: '8px 9px',
                    borderRadius: 10,
                    background: extraTotal > 0 ? 'rgba(52,211,153,0.12)' : colors.inputBg,
                    border: `1px solid ${extraTotal > 0 ? 'rgba(52,211,153,0.28)' : colors.borderSubtle}`,
                    color: extraTotal > 0 ? '#6ee7b7' : colors.brandLight,
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    ...type.mono,
                  }}
                >
                  {extraTotal > 0 ? `+${formatVNDShort(extraTotal)}` : '+ Thêm'}
                </button>
              </div>
            );
          })}
        </Card>

        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.24)',
          borderRadius: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tổng nước tháng
          </span>
          <span style={{ fontSize: 18, fontWeight: 900, color: colors.pickleball, ...type.mono }}>
            {formatVND(totalWater)}
          </span>
        </div>

        <div style={{
          position: 'sticky',
          bottom: 0,
          background: colors.pageBg,
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 10,
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 10,
          margin: '14px -16px 0',
        }}>
          <Button variant="muted" onClick={() => onAction?.('back')}>Huỷ</Button>
          <Button
            variant="brand"
            onClick={() => onAction?.('saveBatchCosts', {
              sessions: sessions.map(session => ({
                sessionId: session.id,
                waterAmount: parseAmount(session.waterInput),
              })),
            })}
          >
            Lưu tất cả
          </Button>
        </div>

        {activeSession && (
          <ExtraBottomSheet
            session={activeSession}
            members={activeSession.members?.length ? activeSession.members : members}
            draft={extraDraft}
            onChange={setExtraDraft}
            onClose={() => setActiveSessionId(null)}
            onSave={saveExtra}
          />
        )}
      </Screen>
    </PhoneFrame>
  );
}

function ExtraBottomSheet({ session, members, draft, onChange, onClose, onSave }) {
  const allSelected = isAllMembers(draft.memberIds, members);
  const amount = parseAmount(draft.amountInput);
  const splitCount = Math.max(draft.memberIds.length, 1);
  const perPerson = amount > 0 ? Math.round(amount / splitCount) : 0;

  function toggleMember(memberId) {
    const selected = new Set(draft.memberIds);
    selected.has(memberId) ? selected.delete(memberId) : selected.add(memberId);
    onChange({ ...draft, memberIds: Array.from(selected) });
  }

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
      padding: '18px 16px 24px',
      background: '#0c0e18',
      borderTop: `1px solid ${colors.borderNormal}`,
      boxShadow: '0 -24px 60px rgba(0,0,0,0.55)',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    }}>
      <div style={{ width: 40, height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.16)', margin: '0 auto 14px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: colors.pickleball, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Phát sinh · {session.dateLabel}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>Thêm khoản phụ</div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: colors.textMuted,
          fontSize: 18, fontFamily: 'inherit', cursor: 'pointer',
        }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8, marginTop: 14 }}>
        <SheetInput value={draft.note} placeholder="Ghi chú" onChange={(value) => onChange({ ...draft, note: value })} />
        <SheetInput
          value={draft.amountInput}
          placeholder="Số tiền"
          suffix="đ"
          inputMode="numeric"
          mono
          onChange={(value) => onChange({ ...draft, amountInput: formatAmountInput(value) })}
        />
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: colors.textSecondary, fontWeight: 800 }}>Chia cho:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {members.map(member => (
          <Chip
            key={member.id}
            label={member.name}
            selected={draft.memberIds.some(id => String(id) === String(member.id))}
            onClick={() => toggleMember(member.id)}
          />
        ))}
        <Chip label="Tất cả" selected={allSelected} onClick={() => onChange({ ...draft, memberIds: members.map(member => member.id) })} />
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: perPerson ? '#6ee7b7' : colors.textMuted, fontWeight: 800 }}>
        = {perPerson ? `${formatVNDShort(perPerson)}/người` : '0/người'}
      </div>

      <Button block variant="success" style={{ marginTop: 14, padding: 12, borderRadius: 12 }} onClick={onSave}>
        Lưu phát sinh
      </Button>
    </div>
  );
}

function SheetInput({ value, placeholder, suffix, inputMode, mono, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange?.(event.target.value)}
        style={{
          width: '100%',
          padding: suffix ? '11px 30px 11px 11px' : '11px',
          background: colors.inputBg,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 10,
          color: colors.textPrimary,
          fontSize: 12,
          fontWeight: mono ? 800 : 600,
          fontFamily: 'inherit',
          outline: 'none',
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

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
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
        cursor: 'pointer',
      }}
    >
      {label}{selected ? ' ✓' : ''}
    </button>
  );
}

function sessionDrafts(data) {
  const members = data.members || [];
  return (data.sessions || []).map(session => {
    const sessionMembers = session.members?.length ? session.members : members;
    return {
      ...session,
      id: session.sessionId || session.id,
      waterInput: formatAmountInput(session.water || session.waterAmount || 0),
      members: sessionMembers,
      extras: normalizeExtras(session.extras || session.accessories || [], sessionMembers),
    };
  });
}

function normalizeExtras(extras, members) {
  const allMemberIds = members.map(member => member.id);
  return (extras || []).map((extra, index) => ({
    id: extra.id || `extra-${index}`,
    note: extra.note || extra.name || 'Phụ phát sinh',
    amount: Number(extra.amount) || 0,
    memberIds: Array.isArray(extra.memberIds) && extra.memberIds.length > 0 ? extra.memberIds : allMemberIds,
  }));
}

function collectMembers(sessions) {
  const byId = new Map();
  sessions.forEach(session => {
    (session.members || []).forEach(member => {
      if (member.id && !byId.has(String(member.id))) byId.set(String(member.id), member);
    });
  });
  return Array.from(byId.values());
}

function emptyExtraDraft(members) {
  return {
    note: '',
    amountInput: '',
    memberIds: [],
  };
}

function isAllMembers(memberIds, members) {
  const ids = (members || []).map(member => String(member.id));
  return ids.length > 0 && ids.every(id => (memberIds || []).some(memberId => String(memberId) === id));
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

function formatAmountInput(value) {
  const amount = parseAmount(value);
  return amount > 0 ? amount.toLocaleString('vi-VN') : '';
}

const DEMO = {
  monthLabel: 'Tháng 5 · 2026',
  completedCount: 2,
  pendingCount: 1,
  members: [
    { id: 1, name: 'Long' },
    { id: 2, name: 'Minh' },
    { id: 3, name: 'Hoa' },
  ],
  sessions: [
    { id: 8, number: 8, dateLabel: '17/05', timeLabel: '19:00', attendees: 3, water: 108000, extras: [] },
    { id: 9, number: 9, dateLabel: '19/05', timeLabel: '19:00', attendees: 3, water: 90000,
      extras: [{ id: 'x1', note: 'Bóng thi đấu', amount: 60000, memberIds: [1, 2, 3] }] },
    { id: 10, number: 10, dateLabel: '21/05', timeLabel: '19:00', attendees: 3, water: 0, extras: [] },
  ],
  summary: { water: 198000, accessories: 60000 },
};
