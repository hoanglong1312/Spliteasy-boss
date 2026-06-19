// Spliteasy Boss — Pickleball · Tổng quan
// Props: data { clubName, monthLabel, memberCount, todaySession, progress, monthCosts, yourBalance }, isTreasurer

import React, { useState, useEffect } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, Card, Button, Badge, SubTabs, Avatar, MonthNav, BottomSheet,
} from '../primitives';

const DAYS = ['T2','T3','T4','T5','T6','T7','CN'];
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

function splitTimeRange(value) {
  const matches = String(value || '').match(/\d{1,2}:\d{2}/g) || [];
  return [normalizeTime(matches[0], '19:00'), normalizeTime(matches[1], '21:00')];
}

function normalizeTime(value, fallback) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(Number(match[1]) || 0, 23));
  const minute = Math.max(0, Math.min(Number(match[2]) || 0, 59));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function PickleballOverview({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const sc = d.scheduleConfig || {};
  const yourTickets = d.yourTickets || { summary: { sessionCount: 0, totalAdjustment: 0, displayAdjustment: 0, advancedCount: 0 }, rows: [] };
  const teamFundOverview = d.teamFundOverview || { ticketFund: { rows: [], totalDue: 0, totalCredit: 0 }, ticketStats: { sessionCount: 0, totalAmount: 0 }, costRows: [] };
  const personalSummaryCards = d.yourBalance.summaryCards || [
    { icon: '🏸', label: 'Sân của bạn', amount: 0, sub: 'Phần của bạn' },
    { icon: '💧', label: 'Nước của bạn', amount: 0, sub: '0 buổi có nước' },
    { icon: '🎟️', label: 'Vé lẻ qua quỹ', amount: 0, sub: 'Qua quỹ team' },
  ];
  const [tab, setTab] = useState('overview');
  const [configExpanded, setConfigExpanded] = useState(false);
  const [popupCard, setPopupCard] = useState(null);
  const [weekdays, setWeekdays] = useState(new Set(sc.weekdays || []));
  const [autoGen, setAutoGen] = useState(sc.autoGenerate ?? true);
  const [[timeStart, timeEnd], setTimeParts] = useState(() => splitTimeRange(sc.timeRange));
  const [startDate, setStartDate] = useState(sc.startDate || '');
  const [clubNameEdit, setClubNameEdit] = useState(sc.clubName || d.clubName || '');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const nextConfig = data?.scheduleConfig || {};
    setWeekdays(new Set(nextConfig.weekdays || []));
    setAutoGen(nextConfig.autoGenerate ?? true);
    setTimeParts(splitTimeRange(nextConfig.timeRange));
    setStartDate(nextConfig.startDate || '');
    setClubNameEdit(nextConfig.clubName || data?.clubName || '');
  }, [data]);

  const liveSessionsCount = computeSessionsCount(weekdays, d.currentYearMonth);
  const timeInputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '10px 8px', color: '#f1f5f9', fontSize: 13, fontWeight: 600,
    fontFamily: 'inherit', boxSizing: 'border-box', colorScheme: 'dark',
  };

  async function saveConfig() {
    if (savingConfig) return;
    setSavingConfig(true);
    try {
      await onAction?.('save', {
        weekdays: Array.from(weekdays),
        autoGen,
        currentYearMonth: d.currentYearMonth,
        startDate,
        scheduleTime: `${timeStart} – ${timeEnd}`,
        clubName: clubNameEdit,
      });
      setConfigExpanded(false);
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <PhoneFrame>
      <Screen tabBar>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 16px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
              CLB PICKLEBALL
            </div>
            <h1 style={{ ...type.title, marginTop: 2 }}>{d.clubName} 🏓</h1>
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
              {d.monthLabel} · {d.memberCount} thành viên
            </div>
          </div>
        </div>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
          ]}
          active={tab}
          onChange={(k) => {
            setTab(k);
            if (k === 'calendar') onAction?.('push', 'pickleball-calendar');
            if (k === 'members') onAction?.('push', 'pickleball-members');
          }}
        />

        <MonthNav label={d.monthLabel} onPrev={() => onAction?.('monthPrev')} onNext={() => onAction?.('monthNext')} />

        {/* Your balance */}
        <Card accent="finance" style={balanceHeroStyle(d.yourBalance.total)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
              <Avatar initial={d.yourBalance.initial || 'B'} color={d.yourBalance.color} size={34} ring={false} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: '#93c5fd', textTransform: 'uppercase' }}>
                  Của bạn tháng này
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.yourBalance.name || 'Bạn'}
                </div>
              </div>
            </div>
            <Badge tone={d.yourBalance.total < 0 ? 'danger' : 'success'} style={{ marginTop: 4 }}>
              {d.yourBalance.statusLabel || (d.yourBalance.total < 0 ? 'Cần nộp' : 'Đã cân bằng')}
            </Badge>
          </div>
          <div style={{
            ...type.amountMd,
            marginTop: 12,
            color: d.yourBalance.total < 0 ? colors.danger : '#6ee7b7',
            ...type.mono,
          }}>
            {formatPersonalBalance(d.yourBalance.total)}
          </div>
          <div style={{
            marginTop: 10,
            padding: '10px 11px',
            borderRadius: 12,
            background: d.yourBalance.total < 0 ? 'rgba(248,113,113,0.10)' : 'rgba(52,211,153,0.10)',
            border: `1px solid ${d.yourBalance.total < 0 ? 'rgba(248,113,113,0.24)' : 'rgba(52,211,153,0.24)'}`,
            fontSize: 11,
            color: d.yourBalance.total < 0 ? '#fecaca' : '#a7f3d0',
            fontWeight: 800,
          }}>
            {d.yourBalance.total < 0 ? 'Tổng cần nộp về quỹ trong tháng' : 'Quỹ cần bù lại cho bạn trong tháng'}
          </div>
        </Card>

        {/* Progress + costs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.28fr 0.72fr', gap: 10, marginTop: 10 }}>
          <Card accent="pickleball" style={{ padding: '17px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
              Tiến độ tháng
            </div>
            <ProgressDonut value={d.progress.completed} max={d.progress.total} />
            <div style={{ textAlign: 'center', fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>
              {d.progress.completed}/{d.progress.total} buổi · {Math.round(d.progress.completed / d.progress.total * 100)}% xong
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(52,211,153,0.13)', border: '1px solid rgba(52,211,153,0.28)',
                borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#6ee7b7',
              }}>
                🏸 Bạn đã đánh {d.progress.attended} buổi
              </div>
            </div>
            {d.todaySession && (
              <div style={{
                marginTop: 12,
                padding: '12px 12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(6,95,70,0.92), rgba(16,185,129,0.42))',
                border: '1px solid rgba(52,211,153,0.38)',
                boxShadow: '0 10px 24px rgba(16,185,129,0.16)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#6ee7b7' }}>
                      {d.todaySession.statusLabel}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#a7f3d0', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...type.mono }}>
                      {displayTimeRange(d.todaySession.timeRange)}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Buổi #{d.todaySession.number} · {d.todaySession.dateLabel}
                    </div>
                    <div style={{ fontSize: 11, color: '#a7f3d0', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.todaySession.venue}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between' }}>
            {personalSummaryCards.map(card => {
              const isExpandable = card.rows || card.key === 'ticket';
              const displayRows = card.key === 'ticket' ? (yourTickets.rows || []).map(r => ({ label: r.dateLabel || r.label || '', amount: Math.abs(r.personalAmount || r.displayAmount || 0) })) : (card.rows || []);
              return (
                <div key={card.label}
                  onClick={isExpandable ? () => setPopupCard(card) : undefined}
                  style={{ position: 'relative', cursor: isExpandable ? 'pointer' : 'default' }}
                >
                  <CompactCostCard icon={card.icon} label={card.label} value={card.amount} sub={card.sub} style={{ flex: 1, paddingRight: isExpandable ? 28 : 9 }} />
                  {isExpandable && (
                    <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: colors.textSecondary, fontWeight: 700 }}>›</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card accent="pickleball" style={{ marginTop: 10, padding: '13px 12px', borderColor: 'rgba(251,191,36,0.20)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: '#fbbf24', textTransform: 'uppercase' }}>
                Vé lẻ trong tháng
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                Vé lẻ của bạn trong tháng
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => onAction?.('push', 'pickleball-calendar')} style={{
                border: 'none',
                background: 'rgba(251,191,36,0.12)',
                color: '#fde68a',
                borderRadius: 999,
                padding: '8px 10px',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}>
                Mở lịch
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
            <TicketFundStat label="Buổi thêm" value={yourTickets.summary.sessionCount} tone="warn" raw />
            <TicketFundStat label="Phần của bạn" value={yourTickets.summary.displayAdjustment ?? -yourTickets.summary.totalAdjustment} tone={(yourTickets.summary.displayAdjustment ?? -yourTickets.summary.totalAdjustment) > 0 ? 'success' : 'warn'} />
          </div>

          {yourTickets.rows.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {yourTickets.rows.map(row => (
                <div key={row.id || `${row.dateLabel}-${row.sourceLabel}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 0',
                  borderTop: `1px solid ${colors.borderSubtle}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900 }}>{row.dateLabel || 'Vé lẻ'}</div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                      {row.sourceLabel} · {row.roleLabel}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: row.displayAmount > 0 ? '#6ee7b7' : '#fca5a5',
                    ...type.mono,
                  }}>
                    {formatSignedTicketAmount(row.displayAmount ?? -row.personalAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {isTreasurer && (
          <Card accent="finance" style={{ marginTop: 10, padding: '13px 12px', borderColor: 'rgba(96,165,250,0.22)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: '#93c5fd', textTransform: 'uppercase' }}>
                  Quỹ team tháng này
                </div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                  Chi phí team và khoản đã trả chủ sân
                </div>
              </div>
              <button type="button" onClick={() => onAction?.('push', { screen: 'pickleball-team-fund', params: { yearMonth: d.currentYearMonth } })} style={{
                border: 'none',
                background: 'rgba(96,165,250,0.13)',
                color: '#bfdbfe',
                borderRadius: 999,
                padding: '8px 10px',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}>
                Mở quỹ
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
              {(teamFundOverview.costRows || []).map(row => (
                <TeamCostStat key={row.key || row.label} row={row} />
              ))}
            </div>
          </Card>
        )}

        {isTreasurer && (
          <Button
            block
            variant="ghost"
            onClick={() => onAction?.('batchEntry')}
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 12,
              color: colors.textSecondary,
              background: 'rgba(255,255,255,0.035)',
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            📋 Nhập nhanh tiền nước
          </Button>
        )}

        {isTreasurer && (
          <div style={{ marginTop: 16, borderRadius: 14, border: '1px solid rgba(99,102,241,0.22)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setConfigExpanded(prev => !prev)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', background: 'rgba(99,102,241,0.08)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#c7d2fe', letterSpacing: '0.5px' }}>⚙ Cài đặt lịch</div>
                {!configExpanded && (
                  <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {Array.from(weekdays).join(' ') || 'Chưa chọn ngày'} · {timeStart}–{timeEnd} · {liveSessionsCount} buổi
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, color: colors.textMuted, flex: '0 0 auto' }}>{configExpanded ? '▲' : '▼'}</span>
            </button>

            {configExpanded && (
              <div style={{ padding: '12px 14px 14px', background: 'rgba(99,102,241,0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  fontSize: 11, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 10, padding: '8px 12px', marginBottom: 10, color: '#c7d2fe', fontWeight: 600,
                }}>
                  {liveSessionsCount} buổi theo lịch tháng này
                </div>

                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.textSecondary, marginBottom: 6 }}>
                  Tên CLB
                </div>
                <input
                  type="text"
                  value={clubNameEdit}
                  onChange={(e) => setClubNameEdit(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: 16, fontWeight: 600,
                    fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10,
                  }}
                />

                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.textSecondary, marginBottom: 6 }}>
                  Thứ trong tuần
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                  {DAYS.map(day => {
                    const active = weekdays.has(day);
                    return (
                      <button key={day} type="button" onClick={() => {
                        const next = new Set(weekdays);
                        next.has(day) ? next.delete(day) : next.add(day);
                        setWeekdays(next);
                      }} style={{
                        flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10,
                        background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: active ? '#c7d2fe' : colors.textMuted,
                        fontSize: 11, fontWeight: active ? 700 : 600, fontFamily: 'inherit', cursor: 'pointer',
                      }}>{day}</button>
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.textSecondary, marginBottom: 6 }}>Giờ chơi</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 5 }}>
                      <input type="time" value={timeStart} onChange={(e) => setTimeParts([e.target.value, timeEnd])} style={timeInputStyle} />
                      <span style={{ color: colors.textMuted, fontSize: 16, fontWeight: 700 }}>–</span>
                      <input type="time" value={timeEnd} onChange={(e) => setTimeParts([timeStart, e.target.value])} style={timeInputStyle} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: colors.textSecondary, marginBottom: 6 }}>Ngày bắt đầu</div>
                    <input
                      type="date"
                      value={startDate ? (startDate.includes('-') ? startDate : startDate.split('/').reverse().join('-')) : ''}
                      onChange={(e) => {
                        const parts = e.target.value.split('-');
                        setStartDate(parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : e.target.value);
                      }}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: 16, fontWeight: 600,
                        fontFamily: 'inherit', boxSizing: 'border-box', colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Tự tạo buổi cuối tháng</div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Tạo lịch tháng tiếp theo tự động</div>
                  </div>
                  <button type="button" onClick={() => setAutoGen(v => !v)} style={{
                    width: 42, height: 24, borderRadius: 100,
                    background: autoGen ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)',
                    position: 'relative', border: 'none', cursor: 'pointer', padding: 0, flex: '0 0 auto',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 3, right: autoGen ? 3 : 'auto', left: autoGen ? 'auto' : 3,
                      transition: 'all 0.2s',
                    }} />
                  </button>
                </div>

                <Button block variant="brand" onClick={saveConfig} disabled={savingConfig}>
                  {savingConfig ? 'Đang lưu…' : '💾 Lưu cài đặt'}
                </Button>
              </div>
            )}
          </div>
        )}

      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />

      {popupCard && (() => {
        const rows = popupCard.key === 'ticket'
          ? (yourTickets.rows || []).map(r => ({ label: r.dateLabel || r.label || '', amount: Math.abs(r.personalAmount || r.displayAmount || 0) }))
          : (popupCard.rows || []);
        return (
          <BottomSheet title={`${popupCard.icon} ${popupCard.label}`} onClose={() => setPopupCard(null)} tone="pickleball">
            <div style={{ fontSize: 22, fontWeight: 900, ...type.mono, marginBottom: 4 }}>{formatVND(popupCard.amount)}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 14 }}>{popupCard.sub}</div>
            {rows.length === 0 ? (
              <div style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', padding: '16px 0' }}>Không có dữ liệu</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {rows.map((row, idx) => (
                  <div key={idx}>
                    {idx > 0 && <div style={{ borderTop: `1px solid ${colors.borderSubtle}` }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: 13 }}>
                      <div style={{ color: colors.textSecondary }}>{row.label}</div>
                      <div style={{ fontWeight: 700, ...type.mono }}>{formatVND(row.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BottomSheet>
        );
      })()}
    </PhoneFrame>
  );
}

function TicketFundStat({ label, value, tone, raw = false }) {
  const palette = tone === 'success'
    ? { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', color: '#6ee7b7' }
    : { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', color: colors.warning };
  return (
    <div style={{
      padding: '9px 10px',
      borderRadius: 10,
      background: palette.bg,
      border: `1px solid ${palette.border}`,
    }}>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
      <div style={{ fontSize: 14, color: palette.color, fontWeight: 900, marginTop: 3, ...type.mono }}>{raw ? value : formatVND(value)}</div>
    </div>
  );
}

function TeamCostStat({ row }) {
  const paid = Boolean(row?.paidToOwner);
  const palette = paid
    ? { bg: 'rgba(16,185,129,0.14)', border: 'rgba(52,211,153,0.34)', color: '#6ee7b7', pillBg: 'rgba(52,211,153,0.16)' }
    : { bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.20)', color: '#bfdbfe', pillBg: 'rgba(148,163,184,0.12)' };
  return (
    <div style={{
      padding: '10px 10px',
      borderRadius: 12,
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
        {row.label}
      </div>
      <div style={{ fontSize: 14, color: palette.color, fontWeight: 900, marginTop: 4, ...type.mono }}>
        {formatVND(row.amount || 0)}
      </div>
      <div style={{
        display: 'inline-flex',
        marginTop: 7,
        padding: '4px 7px',
        borderRadius: 999,
        background: palette.pillBg,
        color: paid ? '#a7f3d0' : colors.textMuted,
        fontSize: 8,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {paid ? 'Đã trả chủ sân' : 'Chưa đánh dấu trả'}
      </div>
    </div>
  );
}

function balanceHeroStyle(total) {
  const isOwed = total < 0;
  return {
    marginTop: 10,
    padding: '18px 16px',
    background: isOwed
      ? 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(127,29,29,0.40))'
      : 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(6,95,70,0.42))',
    borderColor: isOwed ? 'rgba(248,113,113,0.28)' : 'rgba(52,211,153,0.34)',
    boxShadow: isOwed ? '0 14px 32px rgba(248,113,113,0.10)' : '0 14px 32px rgba(16,185,129,0.13)',
  };
}

function CompactCostCard({ icon, label, value, sub, style }) {
  return (
    <Card style={{ padding: '11px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'center', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div style={{ fontSize: 8, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 800 }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0, marginTop: 7, whiteSpace: 'nowrap', ...type.mono }}>
        {formatVND(value)}
      </div>
      <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, lineHeight: 1.25 }}>{sub}</div>
    </Card>
  );
}

function formatSignedFundAmount(amount) {
  return amount > 0 ? `+${formatVND(amount)}` : formatVND(amount);
}

function formatPersonalBalance(amount) {
  if (amount > 0) return `+${formatVND(amount)}`;
  return formatVND(amount);
}

function formatBreakdownAmount(amount) {
  if (amount < 0) return `-${formatVND(Math.abs(amount))}`;
  if (amount > 0) return formatVND(amount);
  return '0 đ';
}

function formatSignedTicketAmount(amount) {
  if (amount > 0) return `+${formatVND(amount)}`;
  if (amount < 0) return `-${formatVND(Math.abs(amount))}`;
  return '0 đ';
}

function displayTimeRange(value) {
  return String(value || '').replace(/(\d{1,2}:\d{2}):00/g, '$1');
}

function ProgressDonut({ value, max }) {
  const circumference = 2 * Math.PI * 42; // 263.9
  const pct = value / max;
  const offset = circumference * (1 - pct);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 6px', position: 'relative' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={colors.pickleball} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', ...type.mono }}>
          {value}<span style={{ fontSize: 12, color: colors.textMuted }}>/{max}</span>
        </div>
        <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 600, letterSpacing: '0.5px' }}>BUỔI</div>
      </div>
    </div>
  );
}

const DEMO = {
  clubName: 'Cầu Giấy',
  monthLabel: 'Tháng 5 · 2026',
  memberCount: 12,
  todaySession: {
    id: 9, number: 9, timeRange: '19:00 – 21:00', dateLabel: '19/05',
    venue: 'Sân 3 · Trung tâm Cầu Giấy', present: 10, total: 12,
  },
  progress: { attended: 8, total: 13 },
  monthCosts: {
    court: 3120000, courtSub: '240k × 13 buổi',
    water: 320000,  waterSub: '8 buổi đã ghi',
  },
  yourBalance: {
    total: -333333,
    name: 'Long',
    initial: 'LO',
    statusLabel: 'Cần nộp',
    breakdown: [
      { label: '🏸 Tiền sân',          amount: 240000 },
      { label: '💧 Tiền nước (8 buổi)', amount: 93333 },
      { label: '🎟️ Vé lẻ qua quỹ',     amount: 0 },
    ],
  },
  ticketFund: {
    totalDue: 150000,
    totalCredit: 50000,
    unpaidCount: 1,
    teamFundCount: 1,
    rows: [
      { memberId: 1, name: 'Anh Việt', initial: 'AV', amount: -50000, label: 'Quỹ bù lại', roleLabel: 'Ứng tiền vé lẻ' },
      { memberId: 2, name: 'Cường', initial: 'C', amount: 100000, label: 'Nộp vào quỹ', roleLabel: 'Tham gia vé lẻ' },
    ],
  },
  teamFundOverview: {
    ticketStats: { totalAmount: 250000 },
    ticketFund: { totalDue: 150000, totalCredit: 50000 },
    costRows: [
      { key: 'court', label: 'Tiền sân', amount: 4550000, paidToOwner: false },
      { key: 'water', label: 'Tiền nước', amount: 60000, paidToOwner: false },
      { key: 'extras', label: 'Phát sinh', amount: 0, paidToOwner: false },
      { key: 'tickets', label: 'Vé lẻ team', amount: 250000, paidToOwner: true },
    ],
  },
};
