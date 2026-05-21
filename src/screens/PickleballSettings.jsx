// Spliteasy Boss — Pickleball · Cài đặt CLB (bottom sheet, thủ quỹ)
// Props: data { clubName, courtFeeTotal, sessionsCount, memberCount, weekdays, startDate, autoGenerate, nextMonthPreview }

import React, { useEffect, useState } from 'react';
import { colors, type } from '../tokens';
import { Button, Input } from '../primitives';

const DAYS = ['T2','T3','T4','T5','T6','T7','CN'];
const DEFAULT_TICKET_PRICE = 50000;
const ISO_WEEKDAY_LABELS = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function hasSelectedWeekday(weekdaySet, isoWeekday) {
  return weekdaySet.has(isoWeekday) ||
    weekdaySet.has(String(isoWeekday)) ||
    weekdaySet.has(ISO_WEEKDAY_LABELS[isoWeekday]);
}

function computeSessionsCount(weekdaySet, yearMonth) {
  if (!weekdaySet.size || !yearMonth) return 0;
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(y, m - 1, day);
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay();
    if (hasSelectedWeekday(weekdaySet, isoWeekday)) count += 1;
  }
  return count;
}

function buildLiveNextMonthPreview(today, weekdaySet) {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const dates = [];
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(next.getFullYear(), next.getMonth(), day);
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay();
    if (hasSelectedWeekday(weekdaySet, isoWeekday)) dates.push(String(day).padStart(2, '0'));
  }

  return {
    label: `tháng ${next.getMonth() + 1}`,
    sessions: dates.length,
    startLabel: dates[0] ? `${labels[new Date(next.getFullYear(), next.getMonth(), Number(dates[0])).getDay()]} ${dates[0]}/${String(next.getMonth() + 1).padStart(2, '0')}` : 'chưa có',
    dates,
  };
}

function splitTimeRange(value) {
  const matches = String(value || '').match(/\d{1,2}:\d{2}/g) || [];
  return [
    normalizeTime(matches[0], '19:00'),
    normalizeTime(matches[1], '21:00'),
  ];
}

function normalizeTime(value, fallback) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(Number(match[1]) || 0, 23));
  const minute = Math.max(0, Math.min(Number(match[2]) || 0, 59));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function PickleballSettings({ data, onAction }) {
  const d = data || DEMO;
  const [weekdays, setWeekdays]   = useState(new Set(d.weekdays));
  const [autoGen, setAutoGen]     = useState(d.autoGenerate);
  const [courtFee, setCourtFee]   = useState(d.courtFeeTotal);
  const [ticketPrice, setTicketPrice] = useState(d.ticketPrice || DEFAULT_TICKET_PRICE);
  const [[timeStart, timeEnd], setTimeParts] = useState(() => splitTimeRange(d.timeRange));
  const [startDate, setStartDate] = useState(d.startDate || '');
  const [clubName, setClubName] = useState(d.clubName || '');

  const liveSessionsCount = computeSessionsCount(weekdays, d.currentYearMonth);
  const liveNextMonthPreview = buildLiveNextMonthPreview(new Date(), weekdays);
  const perSession = Math.round(courtFee / Math.max(liveSessionsCount, 1));
  const activeMemberCount = Math.max(d.memberCount || 1, 1);
  const perPerson  = Math.round(perSession / activeMemberCount);

  useEffect(() => {
    setWeekdays(new Set(d.weekdays));
    setAutoGen(d.autoGenerate);
    setCourtFee(d.courtFeeTotal);
    setTicketPrice(d.ticketPrice || DEFAULT_TICKET_PRICE);
    setTimeParts(splitTimeRange(d.timeRange));
    setStartDate(d.startDate || '');
    setClubName(d.clubName || '');
  }, [data]);

  const timeInputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '10px 8px', color: '#f1f5f9', fontSize: 13, fontWeight: 600,
    fontFamily: 'inherit', boxSizing: 'border-box', colorScheme: 'dark',
  };

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
          <Input label="Tên CLB"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            inputStyle={{ fontWeight: 700, fontSize: 15 }}
          />
          <Input label="Tiền sân tháng" suffix="đ"
            value={courtFee.toLocaleString('vi-VN')}
            onChange={(e) => setCourtFee(Number(e.target.value.replace(/\D/g, '')) || 0)}
            inputStyle={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px', ...type.mono }}
          />
          <Input label="Giá vé lẻ (đ/người)" suffix="đ"
            value={ticketPrice.toLocaleString('vi-VN')}
            onChange={(e) => setTicketPrice(Number(e.target.value.replace(/\D/g, '')) || 0)}
            inputMode="numeric"
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
              {liveSessionsCount} buổi × {d.memberCount} thành viên
            </div>
          </div>

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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 5 }}>
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeParts([e.target.value, timeEnd])}
                  style={timeInputStyle}
                />
                <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 700 }}>–</span>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeParts([timeStart, e.target.value])}
                  style={timeInputStyle}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Ngày bắt đầu</FieldLabel>
              <input
                type="date"
                value={startDate ? (startDate.includes('-') ? startDate : startDate.split('/').reverse().join('-')) : ''}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  setStartDate(parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : e.target.value);
                }}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit', boxSizing: 'border-box', colorScheme: 'dark',
                }}
              />
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
              📍 Xem trước {liveNextMonthPreview.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginTop: 6 }}>
              {liveNextMonthPreview.sessions} buổi · Bắt đầu {liveNextMonthPreview.startLabel}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
              {liveNextMonthPreview.dates.slice(0, 5).map(date => (
                <span key={date} style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(52,211,153,0.15)',
                  fontSize: 10, fontWeight: 700, color: '#6ee7b7', ...type.mono,
                }}>{date}</span>
              ))}
              {liveNextMonthPreview.dates.length > 5 && (
                <span style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 10, fontWeight: 700, color: colors.textMuted, ...type.mono,
                }}>+{liveNextMonthPreview.dates.length - 5}</span>
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

          <Button block variant="brand" style={{ marginTop: 8 }} onClick={() => onAction?.('save', {
            courtFee,
            weekdays: Array.from(weekdays),
            autoGen,
            currentYearMonth: d.currentYearMonth,
            startDate,
            scheduleTime: `${timeStart} – ${timeEnd}`,
            ticketPrice,
            clubName,
          })}>💾 Lưu cài đặt</Button>
          </div>
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
  ticketPrice: DEFAULT_TICKET_PRICE,
  sessionsCount: 13, memberCount: 12,
  currentYearMonth: '2026-05',
  currentRole: 'treasurer',
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
