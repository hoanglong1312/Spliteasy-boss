// Spliteasy Boss — Pickleball · Quỹ team tháng

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, TabBar, IconButton, Card, Button, Input, Avatar } from '../primitives';

export default function PickleballTeamFund({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const ticketFund = d.ticketFund || { rows: [], totalDue: 0, totalCredit: 0 };
  const ticketStats = d.ticketStats || { sessionCount: 0, totalAmount: 0, participantCount: 0 };
  const [courtFee, setCourtFee] = useState(Number(d.courtFeeTotal) || 0);
  const [ticketPrice, setTicketPrice] = useState(Number(d.ticketPrice) || 50000);
  const [saveState, setSaveState] = useState('');
  const perSession = Math.round(courtFee / Math.max(Number(d.sessionsCount) || 1, 1));
  const perMember = Math.round(courtFee / Math.max(Number(d.memberCount) || 1, 1));

  useEffect(() => {
    setCourtFee(Number(d.courtFeeTotal) || 0);
    setTicketPrice(Number(d.ticketPrice) || 50000);
    setSaveState('');
  }, [d.courtFeeTotal, d.ticketPrice]);

  if (!isTreasurer) {
    return (
      <PhoneFrame>
        <Screen style={{ paddingBottom: '72px' }}>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Chỉ thủ quỹ xem được quỹ team.</div>
          </Card>
        </Screen>
        <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Screen style={{ paddingBottom: '72px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 16px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#93c5fd', textTransform: 'uppercase' }}>
              QUỸ TEAM · {d.clubName}
            </div>
            <h1 style={{ ...type.title, marginTop: 2 }}>Quỹ team tháng này</h1>
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
              {d.monthLabel}
            </div>
          </div>
          <IconButton onClick={() => onAction?.('back')}>×</IconButton>
        </div>

        <Card accent="finance" style={{ padding: '14px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Cấu hình tiền tháng
          </div>
          <Input
            label="Tiền sân tháng"
            suffix="đ"
            value={formatInputAmount(courtFee)}
            onChange={event => {
              setCourtFee(parseAmount(event.target.value));
              setSaveState('');
            }}
            inputMode="numeric"
            inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
          />
          <Input
            label="Giá vé lẻ/người"
            suffix="đ"
            value={formatInputAmount(ticketPrice)}
            onChange={event => {
              setTicketPrice(parseAmount(event.target.value));
              setSaveState('');
            }}
            inputMode="numeric"
            inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <MiniStat label="Tiền sân/buổi" value={perSession} tone="info" />
            <MiniStat label="Tiền sân/người" value={perMember} tone="info" />
          </div>
          {saveState && (
            <div style={{ marginTop: 9, color: saveState === 'saved' ? '#86efac' : colors.danger, fontSize: 11, fontWeight: 800 }}>
              {saveState === 'saved' ? 'Đã lưu cấu hình quỹ tháng.' : 'Chưa lưu được. Thử lại sau.'}
            </div>
          )}
          <Button
            block
            variant="success"
            style={{ marginTop: 12, padding: 12 }}
            onClick={async () => {
              setSaveState('');
              try {
                await onAction?.('saveTeamFundConfig', {
                  currentYearMonth: d.currentYearMonth,
                  courtFee,
                  ticketPrice,
                });
                setSaveState('saved');
              } catch {
                setSaveState('error');
              }
            }}
          >
            Lưu cấu hình quỹ
          </Button>
        </Card>

        <Card accent="pickleball" style={{ marginTop: 10, padding: '14px 12px', borderColor: 'rgba(251,191,36,0.24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Tổng vé lẻ team
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                {ticketStats.sessionCount || 0} buổi · {ticketStats.participantCount || 0} lượt tham gia
              </div>
            </div>
            <button type="button" onClick={() => onAction?.('push', 'pickleball-calendar')} style={pillButtonStyle()}>
              Mở lịch
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
            <MiniStat label="Tổng vé" value={ticketStats.totalAmount || 0} tone="warn" />
            <MiniStat label="Cần thu" value={ticketFund.totalDue || 0} tone="warn" />
            <MiniStat label="Cần bù" value={ticketFund.totalCredit || 0} tone="success" />
          </div>
        </Card>

        <Card accent="finance" style={{ marginTop: 10, padding: '14px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Chênh lệch qua quỹ
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
            Người tham gia nộp vào quỹ, người ứng được quỹ bù lại.
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ticketFund.rows.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 0' }}>
                Chưa có chênh lệch vé lẻ trong tháng.
              </div>
            )}
            {ticketFund.rows.map(row => (
              <div key={row.memberId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 0',
                borderTop: `1px solid ${colors.borderSubtle}`,
              }}>
                <Avatar initial={row.initial} color={row.color} size={28} ring={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{row.name}</div>
                  <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                    {row.roleLabel || row.label}
                  </div>
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: row.amount < 0 ? '#6ee7b7' : colors.warning,
                  ...type.mono,
                }}>
                  {row.amount < 0 ? `Quỹ bù ${formatVND(Math.abs(row.amount))}` : `+${formatVND(row.amount)}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function MiniStat({ label, value, tone }) {
  const palette = tone === 'success'
    ? { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', color: '#6ee7b7' }
    : tone === 'info'
      ? { bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.24)', color: '#bfdbfe' }
      : { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', color: colors.warning };
  return (
    <div style={{ padding: '9px 10px', borderRadius: 10, background: palette.bg, border: `1px solid ${palette.border}` }}>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
      <div style={{ fontSize: 14, color: palette.color, fontWeight: 900, marginTop: 3, ...type.mono }}>{formatVND(value)}</div>
    </div>
  );
}

function pillButtonStyle() {
  return {
    border: 'none',
    background: 'rgba(251,191,36,0.12)',
    color: '#fde68a',
    borderRadius: 999,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

function formatInputAmount(value) {
  return parseAmount(value).toLocaleString('vi-VN');
}

const DEMO = {
  clubName: 'Nhóm Pickleball Quận 7',
  monthLabel: 'Tháng 5 · 2026',
  currentYearMonth: '2026-05',
  courtFeeTotal: 4550000,
  ticketPrice: 50000,
  sessionsCount: 13,
  memberCount: 8,
  ticketStats: { sessionCount: 2, participantCount: 5, totalAmount: 250000 },
  ticketFund: {
    totalDue: 200000,
    totalCredit: 50000,
    rows: [
      { memberId: 1, name: 'Anh Việt', initial: 'AV', amount: -50000, label: 'Quỹ bù lại', roleLabel: 'Ứng tiền vé lẻ' },
      { memberId: 2, name: 'Minh', initial: 'M', amount: 100000, label: 'Nộp vào quỹ', roleLabel: 'Tham gia vé lẻ' },
    ],
  },
};
