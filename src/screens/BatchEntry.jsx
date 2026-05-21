// Spliteasy Boss - Pickleball / Nhap nhanh tien nuoc thang

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button } from '../primitives';

export default function BatchEntry({ data, onAction }) {
  const d = data || DEMO;
  const [sessions, setSessions] = useState(() => sessionDrafts(d));
  const [bulkInput, setBulkInput] = useState('');

  useEffect(() => {
    setSessions(sessionDrafts(d));
    setBulkInput('');
  }, [data]);

  const parsedRows = parseMonthlyWaterInput(bulkInput, sessions);
  const totalWater = parsedRows.reduce((sum, row) => sum + row.waterAmount, 0);
  const matchedSessionIds = new Set(parsedRows.map(row => String(row.sessionId)));

  function saveAll() {
    onAction?.('saveBatchCosts', {
      sessions: parsedRows.map(row => ({
        sessionId: row.sessionId,
        waterAmount: row.waterAmount,
      })),
    });
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
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>Dán tiền nước cuối tháng</div>
          </div>
          <IconButton onClick={() => setBulkInput(exampleInput(sessions))}>↺</IconButton>
        </div>

        <Card accent="pickleball" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: colors.pickleball, textTransform: 'uppercase' }}>
            Dán tiền nước
          </div>
          <textarea
            value={bulkInput}
            onChange={(event) => setBulkInput(event.target.value)}
            placeholder={'60.000\n45.000\n0\n22/05 60.000'}
            style={{
              width: '100%',
              minHeight: 168,
              marginTop: 10,
              padding: 12,
              resize: 'vertical',
              background: colors.inputBg,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 12,
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: 800,
              fontFamily: type.family,
              lineHeight: 1.5,
              outline: 'none',
              ...type.mono,
            }}
          />
        </Card>

        <div style={{
          marginTop: 14,
          padding: '12px 14px',
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.24)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              Tổng nước tháng
            </div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
              {parsedRows.length}/{sessions.length} buổi khớp
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: colors.pickleball, ...type.mono }}>
            {formatVND(totalWater)}
          </span>
        </div>

        <Card style={{ marginTop: 10, padding: 0 }}>
          {sessions.map((session, index) => {
            const parsed = parsedRows.find(row => String(row.sessionId) === String(session.id));
            return (
              <div key={session.id} style={{
                display: 'grid',
                gridTemplateColumns: '74px 1fr auto',
                gap: 10,
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: index < sessions.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
              }}>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{session.dateLabel}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Buổi #{session.number}
                  </div>
                  <div style={{ fontSize: 10, color: matchedSessionIds.has(String(session.id)) ? '#6ee7b7' : colors.textSecondary, marginTop: 2 }}>
                    {parsed ? 'Sẽ cập nhật' : 'Không đổi'}
                  </div>
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: parsed ? colors.pickleball : colors.textMuted,
                  ...type.mono,
                }}>
                  {parsed ? formatVND(parsed.waterAmount) : formatVND(session.water || session.waterAmount || 0)}
                </div>
              </div>
            );
          })}
        </Card>

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
          <Button variant="brand" disabled={parsedRows.length === 0} onClick={saveAll}>
            Lưu tất cả
          </Button>
        </div>
      </Screen>
    </PhoneFrame>
  );
}

function parseMonthlyWaterInput(input, sessions) {
  const lines = String(input || '')
    .split(/\n|;/)
    .map(line => line.trim())
    .filter(Boolean);
  let sequentialIndex = 0;
  const rows = [];
  lines.forEach(line => {
    const dateMatch = line.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/);
    const amountText = dateMatch ? line.replace(dateMatch[0], '') : line;
    const hasAmountDigits = /\d/.test(amountText);
    if (!hasAmountDigits) {
      if (!dateMatch) sequentialIndex += 1;
      return;
    }
    const amount = parseAmount(amountText);
    const session = dateMatch
      ? findSessionByInputDate(sessions, dateMatch)
      : sessions[sequentialIndex];
    if (!dateMatch) sequentialIndex += 1;
    if (!session) return;
    rows.push({
      sessionId: session.id,
      dateLabel: session.dateLabel,
      waterAmount: amount,
      waterInput: formatAmountInput(amount),
    });
  });
  return rows;
}

function findSessionByInputDate(sessions, dateMatch) {
  const day = String(Number(dateMatch[1])).padStart(2, '0');
  const month = String(Number(dateMatch[2])).padStart(2, '0');
  return sessions.find(session => {
    const rawDate = String(session.date || '');
    const label = String(session.dateLabel || '');
    return rawDate.slice(5, 10) === `${month}-${day}` || label.includes(`${day}/${month}`);
  });
}

function sessionDrafts(data) {
  return (data.sessions || []).map(session => ({
    ...session,
    id: session.sessionId || session.id,
    waterInput: formatAmountInput(session.water || session.waterAmount || 0),
  }));
}

function exampleInput(sessions) {
  return sessions.map(session => formatAmountInput(session.water || session.waterAmount || 0) || '0').join('\n');
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
  sessions: [
    { id: 8, number: 8, date: '2026-05-17', dateLabel: 'CN 17/05', water: 108000 },
    { id: 9, number: 9, date: '2026-05-19', dateLabel: 'T3 19/05', water: 90000 },
    { id: 10, number: 10, date: '2026-05-21', dateLabel: 'T5 21/05', water: 0 },
  ],
};
