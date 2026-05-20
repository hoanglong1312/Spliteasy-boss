// Spliteasy Boss — Pickleball · Cài đặt CLB (bottom sheet, thủ quỹ)
// Props: data { clubName, courtFeeTotal, sessionsCount, memberCount, weekdays, startDate, autoGenerate, nextMonthPreview }

import React, { useEffect, useState } from 'react';
import { colors, type } from '../tokens';
import { Button, Card, Input, SectionLabel } from '../primitives';

const DAYS = ['T2','T3','T4','T5','T6','T7','CN'];

export default function PickleballSettings({ data, onAction }) {
  const d = data || DEMO;
  const [weekdays, setWeekdays]   = useState(new Set(d.weekdays));
  const [autoGen, setAutoGen]     = useState(d.autoGenerate);
  const [courtFee, setCourtFee]   = useState(d.courtFeeTotal);
  const [members, setMembers]     = useState(() => memberRowsFromData(d));
  const [activeMemberIds, setActiveMemberIds] = useState(() => monthlyActiveIdsFromData(d));
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  const perSession = Math.round(courtFee / d.sessionsCount);
  const activeMemberCount = Math.max(activeMemberIds.size || d.memberCount || members.length || 1, 1);
  const perPerson  = Math.round(perSession / activeMemberCount);
  const canDeleteMembers = d.currentRole === 'treasurer';

  useEffect(() => {
    setWeekdays(new Set(d.weekdays));
    setAutoGen(d.autoGenerate);
    setCourtFee(d.courtFeeTotal);
    setMembers(memberRowsFromData(d));
    setActiveMemberIds(monthlyActiveIdsFromData(d));
  }, [data]);

  async function saveNewMember(e) {
    e.preventDefault();
    const trimmedName = newMemberName.trim();
    if (!trimmedName) return;
    setSavingMember(true);
    try {
      const created = await onAction?.('addMember', { name: trimmedName });
      if (created?.id) {
        const nextMember = {
          id: created.id,
          name: created.name || trimmedName,
          initial: created.initials || created.initial || trimmedName[0].toUpperCase(),
        };
        setMembers(prev => [...prev, nextMember]);
        setActiveMemberIds(prev => new Set([...prev, String(created.id)]));
      }
      setNewMemberName('');
      setShowAddMemberForm(false);
    } finally {
      setSavingMember(false);
    }
  }

  async function deleteMember(m) {
    if (!window.confirm(`Xác nhận xóa thành viên ${m.name}? Thao tác này sẽ vô hiệu hóa tài khoản của họ.`)) return;
    setMembers(prev => prev.filter(x => String(x.id) !== String(m.id)));
    setActiveMemberIds(prev => {
      const next = new Set(prev);
      next.delete(String(m.id));
      return next;
    });
    await onAction?.('deleteMember', { memberId: m.id });
  }

  return (
    <div style={{
      width: 375, height: '100%', minHeight: 812, maxHeight: 812, margin: '24px auto', position: 'relative',
      background: colors.shellBg, borderRadius: 38, overflow: 'hidden',
      border: `1px solid ${colors.borderNormal}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 8px #1a1c28',
      fontFamily: type.family, color: colors.textPrimary,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at top, #064e3b 0%, #07080f 60%)',
        opacity: 0.4,
      }} />

      <div style={{ position: 'relative', paddingTop: 60, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: colors.shellBg,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: `1px solid ${colors.borderNormal}`,
          padding: '14px 16px 0', minHeight: 0, flex: 1,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -30px 60px rgba(0,0,0,0.6)',
        }}>
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 100, margin: '0 auto 18px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
                CLB Pickleball {d.clubName}
              </div>
              <h1 style={{ ...type.title, fontSize: 24, marginTop: 4 }}>Cài đặt</h1>
            </div>
            <button onClick={() => onAction?.('close')} style={{
              fontSize: 20, color: colors.textMuted, background: 'none', border: 'none', cursor: 'pointer',
            }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: 24 }}>
          {/* Court fee */}
          <Input label="Tiền sân tháng" suffix="đ"
            value={courtFee.toLocaleString('vi-VN')}
            onChange={(e) => setCourtFee(Number(e.target.value.replace(/\D/g, '')) || 0)}
            inputStyle={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px', ...type.mono }}
          />
          <div style={{
            marginTop: 10, padding: '12px 14px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 11, color: '#c7d2fe', fontWeight: 600 }}>
              {perSession.toLocaleString('vi-VN')} đ / buổi · <span style={{ color: colors.brandLight, fontWeight: 800 }}>{perPerson.toLocaleString('vi-VN')} đ / người</span>
            </div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3 }}>
              {d.sessionsCount} buổi × {d.memberCount} thành viên
            </div>
          </div>

          {/* Members participation */}
          <SectionLabel>Thành viên tháng này</SectionLabel>
          <Card style={{ padding: '6px 16px' }}>
            {members.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textSecondary, padding: '12px 0' }}>
                Chưa có thành viên trong nhóm
              </div>
            )}
            {members.map((m, i) => {
              const playing = activeMemberIds.has(String(m.id));
              return (
                <div key={m.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
                  borderBottom: i < members.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: playing ? colors.successSoft : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                    color: playing ? colors.success : colors.textMuted,
                    flexShrink: 0,
                  }}>{m.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 10, color: playing ? colors.success : colors.textMuted, marginTop: 2, fontWeight: 700 }}>
                      Tháng này · {playing ? 'Đang chơi' : 'Nghỉ'}
                    </div>
                  </div>
                  {canDeleteMembers && (
                    <button
                      type="button"
                      aria-label={`Xóa ${m.name}`}
                      onClick={() => deleteMember(m)}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        border: `1px solid ${colors.borderSubtle}`,
                        background: colors.dangerSoft,
                        color: colors.danger,
                        fontSize: 13, cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >🗑</button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveMemberIds(prev => {
                      const next = new Set(prev);
                      playing ? next.delete(String(m.id)) : next.add(String(m.id));
                      return next;
                    })}
                    style={{
                      width: 42, height: 24, borderRadius: 100,
                      background: playing ? colors.success : 'rgba(255,255,255,0.10)',
                      position: 'relative', border: 'none',
                      boxShadow: playing ? '0 0 12px rgba(52,211,153,0.35)' : 'none',
                      flexShrink: 0, cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 3,
                      right: playing ? 3 : 'auto',
                      left: playing ? 'auto' : 3,
                    }} />
                  </button>
                </div>
              );
            })}
            <div style={{ fontSize: 10, color: colors.textSecondary, padding: '8px 0 4px' }}>
              Tắt = nghỉ tháng này, tự động bật lại tháng sau
            </div>
            {showAddMemberForm ? (
              <form onSubmit={saveNewMember} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="Tên thành viên"
                  autoFocus
                  style={{
                    flex: 1, minWidth: 0, padding: '10px 11px',
                    border: `1px solid ${colors.borderSubtle}`,
                    background: colors.inputBg, color: colors.textPrimary,
                    borderRadius: 10, outline: 'none', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 600,
                  }}
                />
                <button
                  type="submit"
                  disabled={savingMember}
                  style={{
                    padding: '0 11px', border: 'none', borderRadius: 10,
                    background: colors.success, color: '#052e26',
                    fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                    cursor: savingMember ? 'default' : 'pointer',
                    opacity: savingMember ? 0.65 : 1,
                  }}
                >Lưu</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberForm(false);
                    setNewMemberName('');
                  }}
                  style={{
                    padding: '0 10px', border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: 10, background: 'transparent',
                    color: colors.textSecondary, fontSize: 12, fontWeight: 700,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >Hủy</button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddMemberForm(true)}
                style={{
                  width: '100%', marginTop: 8, padding: '10px 14px',
                  border: '1px dashed rgba(99,102,241,0.4)',
                  background: 'transparent', borderRadius: 12,
                  color: colors.brandLight, fontSize: 12, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >+ Thêm thành viên</button>
            )}
          </Card>

          {/* Weekday picker */}
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px',
            color: colors.textSecondary, margin: '14px 0 6px',
          }}>Lịch tự động · Thứ trong tuần</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {DAYS.map(day => {
              const active = weekdays.has(day);
              return (
                <button key={day} onClick={() => {
                  const next = new Set(weekdays);
                  next.has(day) ? next.delete(day) : next.add(day);
                  setWeekdays(next);
                }} style={{
                  flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 10,
                  background: active ? 'rgba(99,102,241,0.18)' : colors.cardSurface,
                  border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : colors.borderSubtle}`,
                  color: active ? '#c7d2fe' : colors.textMuted,
                  fontSize: 11, fontWeight: active ? 700 : 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>{day}</button>
              );
            })}
          </div>

          {/* Time + start */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <div>
              <FieldLabel>Giờ chơi</FieldLabel>
              <SelectField icon="🕖" label={d.timeRange} />
            </div>
            <div>
              <FieldLabel>Ngày bắt đầu</FieldLabel>
              <SelectField icon="📅" label={d.startDate} />
            </div>
          </div>

          {/* Preview */}
          <div style={{
            marginTop: 14, padding: '14px 16px',
            background: 'linear-gradient(145deg, rgba(52,211,153,0.10), rgba(52,211,153,0.04))',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 14,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📍 Xem trước {d.nextMonthPreview.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginTop: 6 }}>
              {d.nextMonthPreview.sessions} buổi · Bắt đầu {d.nextMonthPreview.startLabel}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
              {d.nextMonthPreview.dates.slice(0, 5).map(date => (
                <span key={date} style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(52,211,153,0.15)',
                  fontSize: 10, fontWeight: 700, color: '#6ee7b7', ...type.mono,
                }}>{date}</span>
              ))}
              {d.nextMonthPreview.dates.length > 5 && (
                <span style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 10, fontWeight: 700, color: colors.textMuted, ...type.mono,
                }}>+{d.nextMonthPreview.dates.length - 5}</span>
              )}
            </div>
          </div>

          {/* Auto-generate toggle */}
          <div style={{
            marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', background: colors.cardSurface,
            border: `1px solid ${colors.borderSubtle}`, borderRadius: 12,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Tự tạo buổi cuối tháng</div>
              <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Tạo lịch tháng tiếp theo tự động</div>
            </div>
            <Toggle on={autoGen} onChange={setAutoGen} />
          </div>

          <Button block variant="muted" style={{
            marginTop: 14,
            background: colors.brandSoftBg,
            color: '#c7d2fe',
            border: '1px solid rgba(99,102,241,0.35)',
          }} onClick={() => onAction?.('batchEntry')}>📋 Nhập chi phí sân tháng này</Button>
          <Button block variant="brand" style={{ marginTop: 8 }} onClick={() => onAction?.('save', {
            courtFee,
            weekdays: Array.from(weekdays),
            autoGen,
            currentYearMonth: d.currentYearMonth,
            activeMonthlyMemberIds: Array.from(activeMemberIds),
          })}>💾 Lưu cài đặt</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function memberRowsFromData(data) {
  return (data.members || []).map(m => ({
    ...m,
    id: m.id,
    name: m.name,
    initial: m.initial || m.initials || (m.name || '?')[0].toUpperCase(),
  }));
}

function monthlyActiveIdsFromData(data) {
  const memberIds = (data.members || []).map(m => m.id).filter(Boolean).map(String);
  const activeIds = Array.isArray(data.activeMonthlyMemberIds)
    ? data.activeMonthlyMemberIds.filter(Boolean).map(String)
    : [];
  return new Set(activeIds.length > 0 ? activeIds : memberIds);
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

function SelectField({ icon, label }) {
  return (
    <div style={{
      width: '100%', padding: '11px 12px',
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    }}>
      <span>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange?.(!on)} style={{
      width: 42, height: 24, borderRadius: 100,
      background: on ? colors.brand : 'rgba(255,255,255,0.1)',
      boxShadow: on ? `0 0 12px ${colors.brandGlow}` : 'none',
      position: 'relative', border: 'none', cursor: 'pointer', padding: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3, right: on ? 3 : 'auto', left: on ? 'auto' : 3,
        transition: 'all 0.2s',
      }} />
    </button>
  );
}

const DEMO = {
  clubName: 'Cầu Giấy',
  courtFeeTotal: 3120000,
  sessionsCount: 13, memberCount: 12,
  currentYearMonth: '2026-05',
  currentRole: 'treasurer',
  activeMonthlyMemberIds: [],
  members: [],
  weekdays: ['T2','T4','T6'],
  timeRange: '19:00 – 21:00',
  startDate: '01/05/2026',
  autoGenerate: true,
  nextMonthPreview: {
    label: 'tháng 6',
    sessions: 13,
    startLabel: 'T2 01/06',
    dates: ['01','03','05','08','10','12','15','17','19','22','24','26','29'],
  },
};
