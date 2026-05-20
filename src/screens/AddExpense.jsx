// Spliteasy Boss — Thêm chi tiêu (bottom sheet)
// Props: data { groupName, amount, title, payer, category, dateLabel, participants[], splitMode }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import { Avatar, Button, Input } from '../primitives';

const CATEGORY_OPTIONS = [
  { key: 'general', icon: '🧾', label: 'Chung' },
  { key: 'food', icon: '🍜', label: 'Ăn uống' },
  { key: 'cafe', icon: '☕', label: 'Cafe' },
  { key: 'travel', icon: '🚌', label: 'Di chuyển' },
  { key: 'gift', icon: '🎁', label: 'Quà tặng' },
];

export default function AddExpense({ data, onAction }) {
  const d = data || DEMO;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(d.members?.[0]?.id || '');
  const [category, setCategory] = useState('general');
  const [dateLabel, setDateLabel] = useState(todayLabel());
  const [participants, setParticipants] = useState(
    (d.members || []).map(m => ({ ...m, included: true }))
  );
  const [splitMode, setSplitMode] = useState('equal');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const activeCount = participants.filter(p => p.included).length;
  const amountNumber = Number(amount) || 0;
  const perPerson = activeCount > 0 ? Math.round(amountNumber / activeCount) : 0;
  const paidByMember = (d.members || []).find(m => String(m.id) === String(paidBy)) || d.members?.[0];
  const selectedCategory = CATEGORY_OPTIONS.find(c => c.key === category) || CATEGORY_OPTIONS[0];
  const allSelected = activeCount === participants.length && participants.length > 0;

  return (
    <div style={{
      width: 375, minHeight: 812, margin: '24px auto', position: 'relative',
      background: colors.shellBg, borderRadius: 38, overflow: 'hidden',
      border: `1px solid ${colors.borderNormal}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 8px #1a1c28',
      fontFamily: type.family, color: colors.textPrimary,
    }}>
      {/* Dimmed backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #07080f 60%)',
        opacity: 0.55,
      }} />

      <div style={{ position: 'relative', paddingTop: 80 }}>
        {/* Sheet */}
        <div style={{
          background: colors.shellBg,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: `1px solid ${colors.borderNormal}`,
          padding: '14px 16px 24px', minHeight: 680,
          boxShadow: '0 -30px 60px rgba(0,0,0,0.6)',
        }}>
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 100, margin: '0 auto 18px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: colors.brandLight,
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>Chi tiêu mới · {d.groupName}</div>
            <button onClick={() => onAction?.('close')} style={{
              fontSize: 20, color: colors.textMuted, background: 'none', border: 'none', cursor: 'pointer',
            }}>✕</button>
          </div>
          <h1 style={{ ...type.title, fontSize: 24, marginBottom: 8 }}>Thêm chi tiêu</h1>

          {/* Amount focal */}
          <div style={{
            background: colors.heroIndigo,
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 18, padding: 18, marginTop: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.brandLight }}>Số tiền</div>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'center',
              gap: 6, marginTop: 4,
            }}>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                type="number"
                inputMode="numeric"
                style={{
                  width: 220,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: colors.textPrimary,
                  fontSize: 38,
                  fontWeight: 900,
                  letterSpacing: '-1.5px',
                  textAlign: 'right',
                  fontFamily: 'inherit',
                }}
              />
              <span style={{ color: colors.textMuted, fontSize: 24, fontWeight: 700, marginLeft: 6 }}>đ</span>
            </div>
          </div>

          <Input
            label="Tiêu đề"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Mô tả chi tiêu..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <div>
              <FieldLabel>Người chi</FieldLabel>
              <SelectField>
                <Avatar initial={paidByMember?.initial || paidByMember?.initials || '?'} size={24} />
                <select
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  style={selectStyle}
                >
                  {(d.members || []).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <span style={{ marginLeft: 'auto', color: colors.textMuted }}>›</span>
              </SelectField>
            </div>
            <div>
              <FieldLabel>Danh mục</FieldLabel>
              <SelectField>
                <span style={{ fontSize: 16 }}>{selectedCategory.icon}</span>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={selectStyle}
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <span style={{ marginLeft: 'auto', color: colors.textMuted }}>›</span>
              </SelectField>
            </div>
          </div>

          <Input
            label="Ngày"
            value={dateLabel}
            onChange={e => setDateLabel(e.target.value)}
            placeholder="dd/mm/yyyy"
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px' }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.textSecondary }}>
              Người tham gia · {activeCount}/{participants.length}
            </span>
            <button
              onClick={() => setParticipants(p => p.map(m => ({ ...m, included: !allSelected })))}
              style={{
                color: colors.brandLight, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none', fontFamily: 'inherit',
              }}
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {participants.map(p => (
              <ParticipantChip
                key={p.id}
                p={p}
                onToggle={() => setParticipants(items => items.map(item => (
                  item.id === p.id ? { ...item, included: !item.included } : item
                )))}
              />
            ))}
          </div>

          <FieldLabel>Phương thức chia</FieldLabel>
          <div style={{
            display: 'flex', gap: 6, padding: 4,
            background: colors.cardSurface, border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 12,
          }}>
            {[
              { key: 'equal',  icon: '⚖️', label: 'Đều nhau' },
              { key: 'custom', icon: '🎚️', label: 'Tuỳ chỉnh' },
              { key: 'percent',icon: '📊', label: 'Theo %' },
            ].map(s => {
              const isActive = splitMode === s.key;
              return (
                <button key={s.key} onClick={() => setSplitMode(s.key)} style={{
                  flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 9,
                  background: isActive ? 'rgba(99,102,241,0.18)' : 'transparent',
                  fontSize: 11, fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#c7d2fe' : colors.textSecondary,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Per person */}
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.18)',
            borderRadius: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Mỗi người trả
              </div>
              <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
                Chia đều {participants.length} người ({activeCount} tham gia)
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: colors.pickleball, letterSpacing: '-0.5px', ...type.mono }}>
              {perPerson.toLocaleString('vi-VN')} đ
            </div>
          </div>

          {saveError && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 10, fontSize: 11, color: '#fca5a5',
            }}>{saveError}</div>
          )}

          <Button
            block
            variant="brand"
            style={{ marginTop: 18, opacity: saving ? 0.6 : 1 }}
            onClick={async () => {
              if (saving) return;
              setSaveError('');
              if (!title.trim()) { setSaveError('Vui lòng nhập tiêu đề chi tiêu.'); return; }
              if (!amount || Number(amount) <= 0) { setSaveError('Vui lòng nhập số tiền lớn hơn 0.'); return; }
              setSaving(true);
              try {
                await onAction?.('save', {
                  title: title.trim(),
                  amount: Number(amount),
                  paidBy,
                  category,
                  dateLabel,
                  participants: participants.filter(p => p.included).map(p => p.id),
                  splitMode,
                });
              } catch (err) {
                setSaveError(err?.message || 'Lưu thất bại. Kiểm tra kết nối và thử lại.');
                setSaving(false);
              }
            }}
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu chi tiêu'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '1.2px', color: colors.textSecondary,
      margin: '14px 0 6px',
    }}>{children}</div>
  );
}

function SelectField({ children }) {
  return (
    <div style={{
      width: '100%', padding: '11px 12px',
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    }}>{children}</div>
  );
}

const selectStyle = {
  minWidth: 0,
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: colors.textPrimary,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  appearance: 'none',
};

function ParticipantChip({ p, onToggle }) {
  if (!p.included) {
    return (
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 6px',
        borderRadius: 100, background: 'rgba(255,255,255,0.05)',
        border: '1px dashed rgba(255,255,255,0.15)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <Avatar initial={p.initial || p.initials || '?'} size={20} color="rgba(255,255,255,0.08)" />
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted }}>{p.name}</span>
      </button>
    );
  }
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 6px',
      borderRadius: 100,
      background: 'rgba(99,102,241,0.15)',
      border: '1px solid rgba(99,102,241,0.4)',
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <Avatar initial={p.initial || p.initials || '?'} size={20} />
      <span style={{ fontSize: 11, fontWeight: 600, color: '#c7d2fe' }}>{p.name}</span>
    </button>
  );
}

function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

const DEMO = {
  groupName: 'Ăn trưa thứ Bảy',
  amount: 270000,
  title: 'Bún bò Huế Phở 24',
  payer:    { initial: 'M', name: 'Minh' },
  category: { icon: '🍜', label: 'Ăn uống' },
  dateLabel: 'Thứ Bảy · 16/05/2026 · 12:30',
  splitMode: 'even',
  participants: [
    { id: 1, initial: 'L',  name: 'Long',  included: true  },
    { id: 2, initial: 'M',  name: 'Minh',  included: true  },
    { id: 3, initial: 'H',  name: 'Hoa',   included: true  },
    { id: 4, initial: 'T',  name: 'Tuấn',  included: true  },
    { id: 5, initial: 'N',  name: 'Nam',   included: true  },
    { id: 6, initial: 'Li', name: 'Linh',  included: false },
  ],
  members: [
    { id: 1, initial: 'L',  name: 'Long' },
    { id: 2, initial: 'M',  name: 'Minh' },
    { id: 3, initial: 'H',  name: 'Hoa' },
    { id: 4, initial: 'T',  name: 'Tuấn' },
    { id: 5, initial: 'N',  name: 'Nam' },
    { id: 6, initial: 'Li', name: 'Linh' },
  ],
};
