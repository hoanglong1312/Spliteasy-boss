// Spliteasy Boss - Pickleball / Nhap nhanh tien nuoc thang

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button } from '../primitives';
import { parseWaterOcrText } from '../lib/waterOcrImport.js';

export default function BatchEntry({ data, onAction }) {
  const d = data || DEMO;
  const [sessions, setSessions] = useState(() => sessionDrafts(d));
  const [parsedRows, setParsedRows] = useState([]);
  const [waterImportText, setWaterImportText] = useState('');
  const [waterImportResult, setWaterImportResult] = useState(null);
  const [editedAmounts, setEditedAmounts] = useState({});
  const [editedSessionAmounts, setEditedSessionAmounts] = useState({});

  useEffect(() => {
    setSessions(sessionDrafts(d));
    setParsedRows([]);
    setWaterImportText('');
    setWaterImportResult(null);
    setEditedAmounts({});
    setEditedSessionAmounts({});
  }, [data]);

  const waterImportRows = waterImportResult?.rows || [];
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
      sessions: parsedRows.map(row => {
        const edited = editedSessionAmounts[row.sessionId];
        return {
          sessionId: row.sessionId,
          waterAmount: edited !== undefined ? parseAmount(edited) : row.waterAmount,
        };
      }),
    });
  }

  function analyzeWaterImport() {
    const result = parseWaterOcrText(waterImportText);
    setWaterImportResult(result);
    setEditedAmounts({});
    setEditedSessionAmounts({});
    const rows = result?.rows || [];
    const applied = [];
    rows.forEach((row) => {
      const amount = row.detectedWaterTotal || row.calculatedWaterTotal || 0;
      if (!amount) return;
      const matched = matchSessionByDate(sessions, row.date);
      if (!matched) return;
      applied.push({
        sessionId: matched.id,
        dateLabel: matched.dateLabel,
        waterAmount: amount,
        waterInput: formatAmountInput(amount),
      });
    });
    setParsedRows(applied);
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

        <Card style={{ marginTop: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: colors.pickleball, textTransform: 'uppercase' }}>
            Nhập tiền nước từ Excel
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, lineHeight: 1.4 }}>
              Mở file trong Excel/Chrome → Chọn tất cả → Copy → Paste vào đây → Phân tích
            </div>
              <textarea
                value={waterImportText}
                onChange={(event) => setWaterImportText(event.target.value)}
                placeholder={'161 01/05/2026 2 2 4 96.000 đ 96.000 đ 162 04/05/2026 2 4 76.000 đ 76.000 đ'}
                style={{
                  width: '100%',
                  minHeight: 150,
                  padding: 12,
                  marginTop: 10,
                  resize: 'vertical',
                  background: colors.inputBg,
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: 12,
                  color: colors.textPrimary,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: type.family,
                  lineHeight: 1.5,
                  outline: 'none',
                  ...type.mono,
                }}
              />
              <Button variant="brand" onClick={analyzeWaterImport} style={{ marginTop: 10 }}>
                Phân tích
              </Button>

              {waterImportResult?.error && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#fca5a5', fontWeight: 800 }}>
                  {waterImportResult.error}
                </div>
              )}

              {waterImportResult && !waterImportResult.error && parsedRows.length === 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#fca5a5', fontWeight: 800 }}>
                  Không khớp buổi nào — kiểm tra dữ liệu có đúng tháng không
                </div>
              )}

              {waterImportRows.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '78px 1fr 70px',
                    gap: 8,
                    padding: '0 0 8px',
                    fontSize: 9,
                    fontWeight: 900,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}>
                    <div>Ngày</div>
                    <div>Nước</div>
                    <div>Trạng thái</div>
                  </div>
                  {waterImportRows.map((row, index) => (
                    <div key={`${row.date}-${index}`} style={{
                      display: 'grid',
                      gridTemplateColumns: '78px 1fr 70px',
                      gap: 8,
                      padding: '9px 0',
                      borderTop: `1px solid ${colors.borderSubtle}`,
                      alignItems: 'start',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 900 }}>{row.displayDate}</div>
                      <div style={{ minWidth: 0 }}>
                        <input
                          type="text"
                          value={editedAmounts[index] !== undefined ? editedAmounts[index] : formatAmountInput(row.detectedWaterTotal || row.calculatedWaterTotal)}
                          onChange={(e) => setEditedAmounts({ ...editedAmounts, [index]: e.target.value })}
                          placeholder={formatAmountInput(row.detectedWaterTotal || row.calculatedWaterTotal)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            marginBottom: 6,
                            background: colors.inputBg,
                            border: `1px solid ${colors.borderSubtle}`,
                            borderRadius: 8,
                            color: colors.textPrimary,
                            fontSize: 12,
                            fontWeight: 900,
                            fontFamily: type.family,
                            outline: 'none',
                            ...type.mono,
                          }}
                        />
                        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3, lineHeight: 1.35 }}>
                          10k: {row.quantities?.[10000] || 0} · 12.5k: {row.quantities?.[12500] || 0} · 14k: {row.quantities?.[14000] || 0} · 30k: {row.quantities?.[30000] || 0}
                        </div>
                        {[...(row.warnings || []), ...(row.extraNotes || [])].map((note, noteIndex) => (
                          <div key={noteIndex} style={{ fontSize: 10, color: row.status === 'ok' ? colors.textMuted : '#fca5a5', marginTop: 3, lineHeight: 1.35 }}>
                            {note}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: importStatusColor(row.status) }}>
                        {importStatusLabel(row.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                <input
                  type="text"
                  value={
                    parsed
                      ? (editedSessionAmounts[session.id] !== undefined
                          ? editedSessionAmounts[session.id]
                          : formatAmountInput(parsed.waterAmount))
                      : formatAmountInput(session.water || session.waterAmount || 0)
                  }
                  disabled={!parsed}
                  onChange={e => setEditedSessionAmounts({ ...editedSessionAmounts, [session.id]: e.target.value })}
                  style={{
                    background: parsed ? colors.inputBg : 'transparent',
                    border: parsed ? `1px solid ${colors.borderSubtle}` : 'none',
                    borderRadius: 8,
                    padding: parsed ? '4px 6px' : '0',
                    color: parsed ? colors.pickleball : colors.textMuted,
                    fontSize: 13,
                    fontWeight: 900,
                    fontFamily: type.family,
                    outline: 'none',
                    width: '80px',
                    textAlign: 'right',
                    ...type.mono,
                  }}
                />
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

function matchSessionByDate(sessions, date) {
  const isoDate = String(date || '').slice(0, 10);
  if (!isoDate) return null;
  const session = sessions.find(s => {
    const rawDate = String(s.date || s.sessionDate || s.session_date || '').slice(0, 10);
    if (rawDate === isoDate) return true;
    const [, month, day] = isoDate.match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
    return Boolean(day && month && String(s.dateLabel || '').includes(`${day}/${month}`));
  });
  return session || null;
}

function importStatusLabel(status) {
  if (status === 'ok') return 'Sẵn sàng';
  if (status === 'needs_review') return 'Xem lại';
  return 'Bỏ qua';
}

function importStatusColor(status) {
  if (status === 'ok') return colors.pickleball;
  if (status === 'needs_review') return '#fca5a5';
  return colors.textMuted;
}

function sessionDrafts(data) {
  return (data.sessions || []).map(session => ({
    ...session,
    id: session.sessionId || session.id,
    waterInput: formatAmountInput(session.water || session.waterAmount || 0),
  }));
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
