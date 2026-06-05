// Spliteasy Boss — Thêm chi tiêu (bottom sheet)
// Props: data { groupName, amount, title, payer, category, dateLabel, participants[] }

import React, { useEffect, useState } from 'react';
import { colors, type } from '../tokens';
import { Avatar, Button, Input, LoadingSpinner, loadingOverlayStyle } from '../primitives';

const CATEGORY_OPTIONS = [
  { key: 'court',      icon: '🏸', label: 'Tiền sân' },
  { key: 'pickleball', icon: '🎾', label: 'Tiền bóng' },
  { key: 'water',      icon: '💧', label: 'Tiền nước' },
  { key: 'food',       icon: '🍜', label: 'Ăn uống' },
  { key: 'cafe',       icon: '☕', label: 'Cafe' },
  { key: 'travel',     icon: '🚌', label: 'Di chuyển' },
  { key: 'gift',       icon: '🎁', label: 'Quà tặng' },
  { key: 'general',    icon: '🧾', label: 'Chung' },
];

export default function AddExpense({ data, onAction }) {
  const d = data || DEMO;
  const editExpense = d.editExpense;
  const groupOptions = d.groupOptions || [{
    id: d.groupId,
    name: d.groupName,
    groupName: d.groupName,
    emoji: d.groupEmoji,
    groupEmoji: d.groupEmoji,
    memberCount: d.memberCount,
    currentMemberId: d.currentMemberId,
    members: d.members || [],
  }];
  const [selectedGroupId, setSelectedGroupId] = useState(() => editExpense?.groupId || d.groupId || groupOptions[0]?.id || '');
  const selectedGroup = groupOptions.find(group => String(group.id) === String(selectedGroupId)) || groupOptions[0] || d;
  const selectedMembers = selectedGroup.members || [];
  const [title, setTitle] = useState(() => editExpense?.title ?? '');
  const [amount, setAmount] = useState(() => editExpense?.amount != null ? String(editExpense.amount) : '');
  const [paidBy, setPaidBy] = useState(() => editExpense?.paidBy ?? selectedGroup.currentMemberId ?? selectedMembers[0]?.id ?? '');
  const [category, setCategory] = useState(() => editExpense?.category ?? 'general');
  const [dateLabel, setDateLabel] = useState(() => editExpense?.date ? dateLabelFromValue(editExpense.date) : (d.defaultDate || todayLabel()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [notes, setNotes] = useState(() => editExpense?.notes ?? '');
  const [receiptImages, setReceiptImages] = useState(() => editExpense?.receiptImages || []);
  const [participants, setParticipants] = useState(() => {
    const selected = new Set((editExpense?.participants || []).map(id => String(id)));
    return selectedMembers.map(m => ({
      ...m,
      included: editExpense ? selected.has(String(m.id)) : true,
    }));
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (editExpense) return;
    const nextMembers = selectedGroup.members || [];
    setPaidBy(selectedGroup.currentMemberId || nextMembers[0]?.id || '');
    setParticipants(nextMembers.map(member => ({ ...member, included: true })));
  }, [editExpense, selectedGroupId]);

  const activeCount = participants.filter(p => p.included).length;
  const amountNumber = Number(amount) || 0;
  const perPerson = activeCount > 0 ? Math.round(amountNumber / activeCount) : 0;
  const paidByMember = selectedMembers.find(m => String(m.id) === String(paidBy)) || selectedMembers[0];
  const selectedCategory = CATEGORY_OPTIONS.find(c => c.key === category) || CATEGORY_OPTIONS[0];
  const allSelected = activeCount === participants.length && participants.length > 0;
  const amountInputWidth = amount ? 220 : 54;

  return (
    <div data-spliteasy-phone-frame style={{
      width: 375, height: 812, margin: '24px auto', position: 'relative',
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

      {/* Back button */}
      <button
        type="button"
        aria-label="Quay lại"
        onClick={() => onAction?.('back')}
        style={{
          position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', left: 16, zIndex: 30,
          width: 38, height: 38, borderRadius: 12,
          background: colors.inputBg,
          border: `1px solid ${colors.borderSubtle}`,
          color: colors.textPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontFamily: 'inherit', cursor: 'pointer',
        }}
      >←</button>

      <div style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 80,
        paddingBottom: '72px',
        boxSizing: 'border-box',
      }}>
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
            }}>{editExpense ? 'Sửa chi tiêu' : 'Chi tiêu mới'} · {selectedGroup.name || selectedGroup.groupName}</div>
            <button onClick={() => onAction?.('close')} style={{
              fontSize: 20, color: colors.textMuted, background: 'none', border: 'none', cursor: 'pointer',
            }}>✕</button>
          </div>
          <h1 style={{ ...type.title, fontSize: 24, marginBottom: 8 }}>{editExpense ? 'Sửa chi tiêu' : 'Thêm chi tiêu'}</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${colors.borderSubtle}`,
            marginTop: 10,
            position: 'relative',
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(245,158,11,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>{selectedGroup.emoji || selectedGroup.groupEmoji || '👥'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedGroup.name || selectedGroup.groupName}</div>
              <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                Chia trong nhóm · {selectedGroup.memberCount || (selectedGroup.members || []).length} thành viên
              </div>
            </div>
            <select
              value={selectedGroupId}
              onChange={event => setSelectedGroupId(event.target.value)}
              disabled={Boolean(editExpense)}
              aria-label="Chọn nhóm chi tiêu"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: editExpense ? 'default' : 'pointer',
              }}
            >
              {groupOptions.map(group => (
                <option key={group.id} value={group.id}>{group.name || group.groupName}</option>
              ))}
            </select>
            <span style={{ color: colors.textMuted, fontSize: 18 }}>›</span>
          </div>

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
                value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmount(raw);
                }}
                placeholder="0"
                type="text"
                inputMode="numeric"
                style={{
                  width: amountInputWidth,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: colors.textPrimary,
                  fontSize: 38,
                  fontWeight: 900,
                  letterSpacing: '-1.5px',
                  textAlign: amount ? 'right' : 'center',
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
                  {selectedMembers.map(m => (
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

          <FieldLabel>Ngày</FieldLabel>
          <PickerRow onClick={() => setDatePickerOpen(true)}>
            <span>{dateLabel}</span>
            <span style={{ marginLeft: 'auto', color: colors.textMuted }}>›</span>
          </PickerRow>

          <Input
            label="Ghi chú"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ghi chú thêm..."
          />

          <ReceiptImages
            images={receiptImages}
            onAdd={async (files) => {
              const nextImages = await Promise.all(Array.from(files || [])
                .filter(file => file.type.startsWith('image/'))
                .map(async file => ({
                  id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
                  name: file.name,
                  url: await readImageDataUrl(file),
                })));
              setReceiptImages(items => [...items, ...nextImages]);
            }}
            onRemove={(imageId) => {
              setReceiptImages(items => {
                return items.filter(image => image.id !== imageId);
              });
            }}
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

          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 14, marginBottom: 6 }}>
            Chia đều cho tất cả người tham gia
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
                  expenseId: editExpense?.id,
                  groupId: editExpense?.groupId || selectedGroup.id,
                  title: title.trim(),
                  amount: Number(amount),
                  paidBy,
                  category,
                  notes: notes.trim(),
                  dateLabel,
                  receiptImages,
                  participants: participants.filter(p => p.included).map(p => p.id),
                  splitMode: 'equal',
                });
              } catch (err) {
                setSaveError(err?.message || 'Lưu thất bại. Kiểm tra kết nối và thử lại.');
                setSaving(false);
              }
            }}
          >
            {saving ? '⏳ Đang lưu...' : editExpense ? '💾 Cập nhật chi tiêu' : '💾 Lưu chi tiêu'}
          </Button>
        </div>
      </div>
      {datePickerOpen && (
        <DateScrollPicker
          value={dateLabel}
          onChange={setDateLabel}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
      {saving && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang lưu…</div>
        </div>
      )}
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

function readImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read_image_failed'));
    reader.readAsDataURL(file);
  });
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

function PickerRow({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%',
      padding: '15px 14px',
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: 800,
      fontFamily: 'inherit',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
    }}>{children}</button>
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
      <button type="button" onClick={onToggle} style={{
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
    <button type="button" onClick={onToggle} style={{
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

function ReceiptImages({ images, onAdd, onRemove }) {
  return (
    <div style={{ marginTop: 14 }}>
      <FieldLabel>Hình ảnh</FieldLabel>
      <div style={{
        padding: 14,
        borderRadius: 16,
        background: colors.inputBg,
        border: `1px solid ${colors.borderSubtle}`,
      }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {images.map(image => (
            <div key={image.id} style={{ position: 'relative', flex: '0 0 86px', height: 86 }}>
              <img src={image.url} alt={image.name || 'Ảnh chi tiêu'} style={{
                width: 86,
                height: 86,
                objectFit: 'cover',
                borderRadius: 12,
                border: `1px solid ${colors.borderSubtle}`,
              }} />
              <button type="button" aria-label="Xóa ảnh" onClick={() => onRemove(image.id)} style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: colors.danger,
                color: 'white',
                fontSize: 16,
                lineHeight: '24px',
                cursor: 'pointer',
              }}>×</button>
            </div>
          ))}
          <label style={{
            flex: '0 0 86px',
            height: 86,
            borderRadius: 12,
            border: `1px dashed ${colors.borderNormal}`,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: 30,
            cursor: 'pointer',
          }}>
            +
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={event => {
                onAdd(event.target.files);
                event.target.value = '';
              }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function DateScrollPicker({ value, onChange, onClose }) {
  const selected = parseDateParts(value);
  const [year, setYear] = useState(selected.year);
  const [month, setMonth] = useState(selected.month);
  const [day, setDay] = useState(selected.day);
  const years = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1);

  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);
  }, [day, month, year]);

  function saveDate() {
    onChange(formatDateLabel(day, month, year));
    onClose?.();
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 40,
      background: 'rgba(0,0,0,0.58)',
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%',
        background: colors.shellBg,
        borderTop: `1px solid ${colors.borderNormal}`,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: '14px 16px 18px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onClose} style={pickerTextButton(colors.textSecondary)}>Hủy</button>
          <div style={{ fontSize: 14, fontWeight: 900 }}>Chọn ngày</div>
          <button type="button" onClick={saveDate} style={pickerTextButton(colors.brandLight)}>Xong</button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          marginTop: 16,
        }}>
          <ScrollColumn label="Năm" value={year} items={years} onChange={setYear} />
          <ScrollColumn label="Tháng" value={month} items={months} onChange={setMonth} render={item => `Tháng ${item}`} />
          <ScrollColumn label="Ngày" value={day} items={days} onChange={setDay} />
        </div>
      </div>
    </div>
  );
}

function ScrollColumn({ label, value, items, onChange, render }) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 800,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        textAlign: 'center',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        height: 156,
        overflowY: 'auto',
        borderRadius: 14,
        background: colors.inputBg,
        border: `1px solid ${colors.borderSubtle}`,
        padding: 6,
      }}>
        {items.map(item => {
          const active = Number(item) === Number(value);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              style={{
                width: '100%',
                minHeight: 42,
                border: 'none',
                borderRadius: 10,
                background: active ? 'rgba(129,140,248,0.20)' : 'transparent',
                color: active ? colors.textPrimary : colors.textSecondary,
                fontSize: active ? 17 : 14,
                fontWeight: active ? 900 : 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >{render ? render(item) : item}</button>
          );
        })}
      </div>
    </div>
  );
}

function pickerTextButton(color) {
  return {
    border: 'none',
    background: 'transparent',
    color,
    fontSize: 14,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatDateLabel(day, month, year) {
  return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
}

function parseDateParts(value) {
  const fallback = new Date();
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) {
    return { day: fallback.getDate(), month: fallback.getMonth() + 1, year: fallback.getFullYear() };
  }
  return {
    day: Number(match[1]) || fallback.getDate(),
    month: Number(match[2]) || fallback.getMonth() + 1,
    year: Number(match[3]) || fallback.getFullYear(),
  };
}

function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function dateLabelFromValue(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || todayLabel();
}

const DEMO = {
  groupName: 'Ăn trưa thứ Bảy',
  currentMemberId: 2,
  currentMemberName: 'Minh',
  amount: 270000,
  title: 'Bún bò Huế Phở 24',
  payer:    { initial: 'M', name: 'Minh' },
  category: { icon: '🍜', label: 'Ăn uống' },
  dateLabel: 'Thứ Bảy · 16/05/2026 · 12:30',
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
