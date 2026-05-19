// Spliteasy Boss — Pickleball · Nhập chi phí sân (batch entry)
// Props: data { monthLabel, completedCount, pendingCount, sessions[], summary }

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button, Badge, Input } from '../primitives';

export default function BatchEntry({ data, onAction }) {
  const d = data || DEMO;
  const [sessions, setSessions] = useState(() => (d.sessions || []).map((s) => ({
    ...s,
    waterInput: s.water != null ? String(s.water) : '',
    accessories: (s.accessories || []).map((a) => ({
      ...a,
      amountInput: a.amount != null ? String(a.amount) : '',
    })),
  })));
  const total = d.completedCount + d.pendingCount;
  const pct = (d.completedCount / total) * 100;
  const summary = sessions.reduce((acc, session) => {
    acc.water += Number(session.waterInput) || Number(session.water) || 0;
    acc.accessories += (session.accessories || []).reduce((sum, accessory) => (
      sum + (Number(accessory.amountInput) || Number(accessory.amount) || 0)
    ), 0);
    return acc;
  }, { water: 0, accessories: 0 });
  const updateSession = (sessionId, updater) => {
    setSessions((items) => items.map((item) => (
      item.id === sessionId ? updater(item) : item
    )));
  };

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textMuted, textTransform: 'uppercase' }}>
              Pickleball · {d.monthLabel}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Nhập chi phí sân</div>
          </div>
          <IconButton onClick={() => onAction?.('help')}>?</IconButton>
        </div>

        {/* Progress strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 600 }}>
            Đã nhập <span style={{ color: colors.success, fontWeight: 800 }}>{d.completedCount}</span> / {total} buổi đã qua
          </div>
          {d.pendingCount > 0 && <Badge tone="warn">⏳ Còn {d.pendingCount} buổi</Badge>}
        </div>
        <div style={{ height: 6, background: colors.borderSubtle, borderRadius: 100, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'linear-gradient(90deg, #34d399, #6366f1)',
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => s.status === 'pending'
            ? (
              <PendingCard
                key={s.id}
                s={s}
                onAction={onAction}
                onWaterChange={(value) => updateSession(s.id, (item) => ({ ...item, waterInput: value }))}
                onAccessoryChange={(index, patch) => updateSession(s.id, (item) => ({
                  ...item,
                  accessories: item.accessories.map((accessory, i) => (
                    i === index ? { ...accessory, ...patch } : accessory
                  )),
                }))}
                onRemoveAccessory={(index) => updateSession(s.id, (item) => ({
                  ...item,
                  accessories: item.accessories.filter((_, i) => i !== index),
                }))}
              />
            )
            : <CompletedCard key={s.id} s={s} />)}
        </div>

        <div style={{
          marginTop: 18, padding: 14,
          background: 'linear-gradient(145deg, rgba(99,102,241,0.10), rgba(99,102,241,0.04))',
          border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14,
        }}>
          <SummaryRow label="Đã nhập (6 buổi)" value={summary.water || d.summary.water} />
          <SummaryRow label="Phụ kiện" value={summary.accessories || d.summary.accessories} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.borderSubtle}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng phụ + nước</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: colors.brandLight, letterSpacing: '-0.5px', ...type.mono }}>
              {formatVND((summary.water || d.summary.water) + (summary.accessories || d.summary.accessories))}
            </span>
          </div>
        </div>

        <Button
          block
          variant="brand"
          style={{ marginTop: 14 }}
          onClick={() => onAction?.('saveAll', {
            sessions: sessions.map((session) => ({
              id: session.id,
              water: Number(session.waterInput) || 0,
              accessories: (session.accessories || []).map((accessory) => ({
                ...accessory,
                amount: Number(accessory.amountInput) || 0,
              })),
            })),
          })}
        >
          💾 Lưu tất cả
        </Button>
      </Screen>
    </PhoneFrame>
  );
}

function PendingCard({ s, onAction, onWaterChange, onAccessoryChange, onRemoveAccessory }) {
  const water = Number(s.waterInput) || 0;
  return (
    <Card accent="pickleball" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#fcd34d', textTransform: 'uppercase' }}>
            Buổi #{s.number} · Cần nhập
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, letterSpacing: '-0.3px' }}>
            {s.dateLabel} · {s.timeLabel}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {s.attendees} thành viên{s.guests ? ` + ${s.guests} khách` : ''}
          </div>
        </div>
        <div style={{ fontSize: 16, color: colors.warning }}>⚠️</div>
      </div>

      <Input label="💧 Tiền nước" suffix="đ"
        value={s.waterInput}
        onChange={(e) => onWaterChange?.(e.target.value)}
        placeholder="0"
        inputStyle={{ fontWeight: 700, ...type.mono }}
      />
      {water > 0 && (
        <div style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 600, marginTop: 6 }}>
          → {Math.round(water / s.attendees).toLocaleString('vi-VN')} đ / người ({s.attendees} người)
        </div>
      )}

      {/* Accessory */}
      {s.accessories?.length > 0
        ? s.accessories.map((a, i) => (
          <AccessoryEditor
            key={i}
            accessory={a}
            onChange={(patch) => onAccessoryChange?.(i, patch)}
            onRemove={() => onRemoveAccessory?.(i)}
          />
        ))
        : (
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', border: '1px dashed rgba(99,102,241,0.4)',
            borderRadius: 10, color: colors.brandLight,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', cursor: 'pointer',
          }} onClick={() => onAction?.('addAccessory', s.id)}>
            <span style={{ fontSize: 14 }}>+</span> Thêm phụ kiện (cầu, băng dán…)
          </div>
        )}
    </Card>
  );
}

function AccessoryEditor({ accessory, onChange, onRemove }) {
  return (
    <div style={{
      marginTop: 12, padding: 12,
      background: 'rgba(167,139,250,0.06)',
      border: '1px solid rgba(167,139,250,0.18)',
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>📦</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Phụ kiện · 1
          </span>
        </div>
        <button onClick={onRemove} style={{
          color: colors.textMuted, fontSize: 14, cursor: 'pointer',
          background: 'none', border: 'none', fontFamily: 'inherit',
        }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={accessory.name || ''} onChange={(e) => onChange?.({ name: e.target.value })} style={{
          flex: 1.4, padding: '9px 12px', fontSize: 12,
          background: colors.inputBg, border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 12, color: colors.textPrimary, fontFamily: 'inherit', outline: 'none',
        }} />
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={accessory.amountInput || ''} onChange={(e) => onChange?.({ amountInput: e.target.value })} style={{
            width: '100%', padding: '9px 30px 9px 12px', fontSize: 12, fontWeight: 700,
            background: colors.inputBg, border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 12, color: colors.textPrimary, fontFamily: 'inherit', outline: 'none',
            ...type.mono,
          }} />
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            color: colors.textMuted, fontSize: 11, fontWeight: 600,
          }}>đ</span>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: colors.textSecondary, fontWeight: 600 }}>Áp dụng cho:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {accessory.applies.map((p, i) => (
          <span key={i} style={{
            padding: '4px 8px', borderRadius: 100,
            background: p.included ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${p.included ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
            fontSize: 10, fontWeight: p.included ? 700 : 600,
            color: p.included ? '#c4b5fd' : colors.textSecondary,
          }}>
            {p.name}{p.included ? ' ✓' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompletedCard({ s }) {
  return (
    <Card style={{ padding: 14, opacity: 0.7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
            Buổi #{s.number} ✓ Đã nhập
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{s.dateLabel} · {s.attendees} người</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 800, ...type.mono }}>{formatVND(s.water)}</div>
          <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 600 }}>
            {Math.round(s.water / s.attendees / 1000)}k/người
          </div>
        </div>
      </div>
    </Card>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
      <span style={{ color: colors.textSecondary }}>{label}</span>
      <span style={{ fontWeight: 700, ...type.mono }}>{formatVND(value)}</span>
    </div>
  );
}

const DEMO = {
  monthLabel: 'Tháng 5',
  completedCount: 6, pendingCount: 2,
  sessions: [
    { id: 8, number: 8, dateLabel: 'CN 17/05', timeLabel: '19:00', status: 'pending', attendees: 11, guests: 1 },
    { id: 7, number: 7, dateLabel: 'T6 15/05', timeLabel: '19:00', status: 'pending', attendees: 9, water: 108000,
      accessories: [{
        name: 'Hộp cầu Yonex', amount: 180000,
        applies: [
          { name: 'Long', included: true },
          { name: 'Minh', included: true },
          { name: 'Hoa',  included: true },
          { name: 'Tuấn', included: false },
          { name: '+5',   included: false },
        ],
      }],
    },
    { id: 6, number: 6, dateLabel: 'T4 13/05', status: 'done', attendees: 10, water: 120000 },
    { id: 5, number: 5, dateLabel: 'T2 11/05', status: 'done', attendees: 12, water: 132000 },
  ],
  summary: { water: 720000, accessories: 180000 },
};
