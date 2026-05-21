// Spliteasy Boss — Pickleball · Tổng quan
// Props: data { clubName, monthLabel, memberCount, todaySession, progress, monthCosts, yourBalance }, isTreasurer

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Card, Button, Badge, SubTabs, Avatar,
} from '../primitives';

export default function PickleballOverview({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const ticketFund = d.ticketFund || { rows: [] };
  const [tab, setTab] = useState('overview');

  return (
    <PhoneFrame>
      <Screen style={{ paddingBottom: '72px' }}>
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
          {isTreasurer && <IconButton onClick={() => onAction?.('settings')}>⚙️</IconButton>}
        </div>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
            { key: 'tickets',   label: 'Vé lẻ' },
          ]}
          active={tab}
          onChange={(k) => {
            setTab(k);
            if (k === 'calendar') onAction?.('push', 'pickleball-calendar');
            if (k === 'members') onAction?.('push', 'pickleball-members');
            if (k === 'tickets') onAction?.('push', 'pickleball-tickets');
          }}
        />

        {/* Progress + costs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: 10, marginTop: 10 }}>
          <Card accent="pickleball" style={{ padding: '17px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
              Tiến độ tháng
            </div>
            <ProgressDonut value={d.progress.attended} max={d.progress.total} />
            <div style={{ textAlign: 'center', fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>
              {Math.round(d.progress.attended / d.progress.total * 100)}% hoàn thành
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
                      {d.todaySession.statusLabel} · {d.todaySession.timeRange}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Buổi #{d.todaySession.number} · {d.todaySession.dateLabel}
                    </div>
                    <div style={{ fontSize: 11, color: '#a7f3d0', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.todaySession.venue}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', ...type.mono }}>
                      {d.todaySession.present}<span style={{ fontSize: 11, color: colors.textMuted }}>/{d.todaySession.total}</span>
                    </div>
                    <div style={{ fontSize: 8, color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Có mặt
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CompactCostCard icon="🏸" label="Tiền sân" value={d.monthCosts.court} sub={d.monthCosts.courtSub} />
            <CompactCostCard icon="💧" label="Tiền nước" value={d.monthCosts.water} sub={d.monthCosts.waterSub} />
            <CompactCostCard icon="🎟️" label="Vé lẻ quỹ" value={d.monthCosts.ticketFund || 0} sub={d.monthCosts.ticketFundSub || '0 lượt quỹ trả hộ'} />
          </div>
        </div>

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

        {d.ticketFund?.rows?.length > 0 && (
          <Card accent="pickleball" style={{ marginTop: 10, padding: '16px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: colors.pickleball, textTransform: 'uppercase' }}>
                  Vé lẻ trong quỹ
                </div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                  {ticketFund.unpaidCount} người ứng · {ticketFund.teamFundCount} quỹ team
                </div>
              </div>
              <button type="button" onClick={() => onAction?.('push', 'pickleball-tickets')} style={{
                border: 'none',
                background: 'transparent',
                color: colors.brandLight,
                fontSize: 11,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
                padding: 0,
              }}>
                Chi tiết →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <TicketFundStat label="Nộp thêm" value={ticketFund.totalDue} tone="warn" />
              <TicketFundStat label="Được trừ" value={ticketFund.totalCredit} tone="success" />
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ticketFund.rows.map(row => (
                <div key={row.memberId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 0',
                  borderTop: `1px solid ${colors.borderSubtle}`,
                }}>
                  <Avatar initial={row.initial} color={row.color} size={26} ring={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{row.name}</div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                      {row.amount < 0 ? 'Trừ vào quỹ' : 'Nộp thêm quỹ'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: row.amount < 0 ? '#6ee7b7' : colors.warning,
                    ...type.mono,
                  }}>
                    {formatSignedFundAmount(row.amount)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Your balance */}
        <Card accent="finance" style={{ marginTop: 10, padding: '18px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: colors.textSecondary, textTransform: 'uppercase' }}>
                Số dư của bạn
              </div>
              <div style={{ ...type.amountMd, marginTop: 6, color: colors.danger, ...type.mono }}>
                {formatVND(d.yourBalance.total)}
              </div>
            </div>
            <Badge tone={d.yourBalance.total < 0 ? 'danger' : 'success'} style={{ marginTop: 4 }}>
              {d.yourBalance.total < 0 ? 'Còn nợ' : 'Cân bằng'}
            </Badge>
          </div>
          <div style={{ height: 1, background: colors.borderSubtle, margin: '14px 0' }} />
          {d.yourBalance.breakdown.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0' }}>
              <span style={{ color: colors.textSecondary }}>{b.label}</span>
              <span style={{ color: '#f1f5f9', fontWeight: 700, ...type.mono }}>{formatVND(b.amount)}</span>
            </div>
          ))}
        </Card>
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function TicketFundStat({ label, value, tone }) {
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
      <div style={{ fontSize: 14, color: palette.color, fontWeight: 900, marginTop: 3, ...type.mono }}>{formatVND(value)}</div>
    </div>
  );
}

function CompactCostCard({ icon, label, value, sub }) {
  return (
    <Card style={{ padding: '11px 9px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div style={{ fontSize: 8, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 800 }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0, marginTop: 7, ...type.mono }}>
        {formatVND(value)}
      </div>
      <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, lineHeight: 1.25 }}>{sub}</div>
    </Card>
  );
}

function formatSignedFundAmount(amount) {
  return amount > 0 ? `+${formatVND(amount)}` : formatVND(amount);
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
    breakdown: [
      { label: '🏸 Tiền sân',          amount: 240000 },
      { label: '💧 Tiền nước (8 buổi)', amount: 93333 },
      { label: '🎟️ Vé lẻ chưa trả',     amount: 0 },
    ],
  },
  ticketFund: {
    totalDue: 150000,
    totalCredit: 50000,
    unpaidCount: 1,
    teamFundCount: 1,
    rows: [
      { memberId: 1, name: 'Anh Việt', initial: 'AV', amount: -50000, label: 'Trừ vào quỹ' },
      { memberId: 2, name: 'Cường', initial: 'C', amount: 100000, label: 'Nộp thêm quỹ' },
    ],
  },
};
