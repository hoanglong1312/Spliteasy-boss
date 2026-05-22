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
  const currentWaterRows = sessions.filter(session => parseAmount(session.water || session.waterAmount || 0) > 0);
  const previewWaterTotal = sessions.reduce((sum, session) => {
    const parsed = parsedRows.find(row => String(row.sessionId) === String(session.id));
    return sum + (parsed ? parsed.waterAmount : parseAmount(session.water || session.waterAmount || 0));
  }, 0);
  const summaryLabel = parsedRows.length > 0
    ? `${parsedRows.length}/${sessions.length} buổi khớp`
    : `${currentWaterRows.length}/${sessions.length} buổi đã có dữ liệu`;

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

        <div style={{
          position: 'sticky',
          top: 0,
          background: colors.pageBg,
          padding: '10px 0 12px',
          zIndex: 10,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 8,
        }}>
          <div style={{
            padding: '10px 12px',
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
                {summaryLabel}
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: colors.pickleball, ...type.mono }}>
              {formatVND(previewWaterTotal)}
            </span>
          </div>
          <Button variant="brand" disabled={parsedRows.length === 0} onClick={saveAll}>
            Lưu tất cả
          </Button>
        </div>

        <Card accent="pickleball" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: colors.pickleball, textTransform: 'uppercase' }}>
            Dán tiền nước
          </div>
          <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 6, lineHeight: 1.4 }}>
            Nhập 0 để xóa tiền nước đã lưu cho buổi đó.
          </div>
          <textarea
            value={bulkInput}
            onChange={(event) => setBulkInput(event.target.value)}
            placeholder={'60.000\n45.000\n0\n22/05 60.000'}
            style={{
              width: '100%',
              minHeight: 126,
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

        <Card style={{ marginTop: 10, padding: 0 }}>
          {sessions.map((session, index) => {
            const parsed = parsedRows.find(row => String(row.sessionId) === String(session.id));
            const status = batchPreviewStatus(session, parsed);
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
                  <div style={{ fontSize: 10, color: status.color, marginTop: 2 }}>
                    {status.label}
                  </div>
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: status.amountColor,
                  ...type.mono,
                }}>
                  {parsed ? formatVND(parsed.waterAmount) : formatVND(session.water || session.waterAmount || 0)}
                </div>
              </div>
            );
          })}
        </Card>
      </Screen>
    </PhoneFrame>
  );
}

function batchPreviewStatus(session, parsed) {
  if (!parsed) {
    return {
      label: 'Không đổi',
      color: colors.textSecondary,
      amountColor: colors.textMuted,
    };
  }
  const currentWater = parseAmount(session.water || session.waterAmount || 0);
  if (parsed.waterAmount === 0 && currentWater > 0) {
    return {
      label: 'Sẽ xóa',
      color: '#fca5a5',
      amountColor: '#fca5a5',
    };
  }
  if (parsed.waterAmount === 0) {
    return {
      label: 'Giữ 0',
      color: colors.textSecondary,
      amountColor: colors.textMuted,
    };
  }
  return {
    label: 'Sẽ lưu',
    color: '#6ee7b7',
    amountColor: colors.pickleball,
  };
}

function parseMonthlyWaterInput(input, sessions) {
  const lines = String(input || '')
    .split(/\n|;/)
    .map(line => line.trim())
    .filter(Boolean);
  let sequentialIndex = 0;
  const rows = [];
  lines.forEach(line => {
    const rawDateMatch = line.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/);
    const dateMatch = rawDateMatch && isValidInputDate(rawDateMatch) ? rawDateMatch : null;
    const amountText = dateMatch ? line.replace(dateMatch[0], '') : line;
    const hasAmountDigits = /\d/.test(amountText);
    const hasExplicitZero = /\b0\b/.test(amountText);
    if (!hasAmountDigits && !hasExplicitZero) {
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

function isValidInputDate(dateMatch) {
  const day = Number(dateMatch?.[1]);
  const month = Number(dateMatch?.[2]);
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
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
