// Spliteasy Boss — Pickleball · Thành viên
// Props: data { clubName, stats, joinRequests[], members[], guests[] }, isTreasurer

import React from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Card, Badge, SubTabs, Avatar, SectionLabel, Stat,
} from '../primitives';

export default function PickleballMembers({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 16px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#6ee7b7', textTransform: 'uppercase' }}>
              CLB PICKLEBALL · {d.clubName}
            </div>
            <h1 style={{ ...type.title, marginTop: 2 }}>Thành viên</h1>
          </div>
          {isTreasurer && (
            <IconButton style={{ background: colors.brandGradient, borderColor: 'transparent', color: 'white', fontWeight: 700, fontSize: 20 }} onClick={() => onAction?.('add')}>+</IconButton>
          )}
        </div>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
            { key: 'tickets',   label: 'Vé lẻ' },
          ]}
          active="members" onChange={(k) => onAction?.('subTab', k)}
        />

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          <Stat value={d.stats.permanent} label="Cố định" />
          <Stat value={d.stats.guests}    label="Khách" color={colors.warning} />
          <Stat value={d.stats.pending}   label="Chờ duyệt" color={colors.brandLight} />
        </div>

        {/* Join requests — treasurer only */}
        {isTreasurer && d.joinRequests.length > 0 && (
          <Card accent="finance" style={{ marginBottom: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#c7d2fe', textTransform: 'uppercase' }}>
                ⏳ Yêu cầu tham gia
              </div>
              <Badge tone="brand">{d.joinRequests.length}</Badge>
            </div>
            {d.joinRequests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <Avatar initial={r.initial} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: colors.textSecondary }}>Gửi {r.sentLabel}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={requestBtn('success')} onClick={() => onAction?.('approve', r.id)}>✓</button>
                  <button style={requestBtn('danger')}  onClick={() => onAction?.('decline', r.id)}>✕</button>
                </div>
              </div>
            ))}
          </Card>
        )}

        <SectionLabel>Thành viên cố định</SectionLabel>
        <Card style={{ padding: '6px 12px' }}>
          {d.members.map((m, i) => (
            <MemberRow key={m.id} m={m} last={i === d.members.length - 1} />
          ))}
        </Card>

        <SectionLabel action="đã chơi gần đây">Khách vãng lai</SectionLabel>
        <Card style={{ padding: '6px 12px' }}>
          {d.guests.map((g, i) => (
            <GuestRow key={g.id} g={g} last={i === d.guests.length - 1} onPromote={isTreasurer ? () => onAction?.('promote', g.id) : undefined} />
          ))}
        </Card>
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function requestBtn(kind) {
  const palette = {
    success: { bg: 'rgba(52,211,153,0.15)',  color: '#6ee7b7' },
    danger:  { bg: 'rgba(248,113,113,0.10)', color: '#fca5a5' },
  }[kind];
  return {
    padding: '6px 10px', borderRadius: 8,
    background: palette.bg, color: palette.color,
    fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
  };
}

function MemberRow({ m, last }) {
  const pct = Math.round(m.sessionsAttended / m.sessionsTotal * 100);
  const barColor = pct >= 60 ? colors.success : pct >= 40 ? colors.warning : colors.danger;
  const textColor = pct >= 60 ? '#6ee7b7' : pct >= 40 ? '#fcd34d' : '#fca5a5';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
    }}>
      <Avatar initial={m.initial} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center' }}>
          {m.name}
          {m.isTreasurer && (
            <span style={{
              fontSize: 9, color: '#fcd34d', fontWeight: 700, marginLeft: 4,
              background: 'rgba(251,191,36,0.12)', padding: '2px 6px', borderRadius: 6,
              letterSpacing: '0.5px',
            }}>👑 THỦ QUỸ</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
          {m.sessionsAttended}/{m.sessionsTotal} buổi · Tham gia {m.joinedLabel}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
        </div>
        <div style={{ fontSize: 10, color: textColor, marginTop: 4, fontWeight: 700 }}>{pct}%</div>
      </div>
    </div>
  );
}

function GuestRow({ g, last, onPromote }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
    }}>
      <Avatar initial={g.initial} size={36} color="linear-gradient(135deg, #fbbf24, #d97706)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center' }}>
          {g.name} <Badge tone="warn" style={{ marginLeft: 4 }}>Khách</Badge>
        </div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
          {g.sessions} buổi · {g.lastSeen}
        </div>
      </div>
      {onPromote && (
        <button onClick={onPromote} style={{
          fontSize: 10, color: colors.brandLight, fontWeight: 700, letterSpacing: '0.3px',
          textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', padding: 0,
        }}>
          CHUYỂN<br/>CỐ ĐỊNH →
        </button>
      )}
    </div>
  );
}

const DEMO = {
  clubName: 'Cầu Giấy',
  stats: { permanent: 12, guests: 3, pending: 2 },
  joinRequests: [
    { id: 1, initial: 'P', name: 'Phương Anh', sentLabel: '2h trước' },
  ],
  members: [
    { id: 1, initial: 'L',  name: 'Long',  sessionsAttended: 8, sessionsTotal: 13, joinedLabel: '02/2025', isTreasurer: true },
    { id: 2, initial: 'M',  name: 'Minh',  sessionsAttended: 11,sessionsTotal: 13, joinedLabel: '02/2025' },
    { id: 3, initial: 'H',  name: 'Hoa',   sessionsAttended: 7, sessionsTotal: 13, joinedLabel: '03/2025' },
    { id: 4, initial: 'T',  name: 'Tuấn',  sessionsAttended: 4, sessionsTotal: 13, joinedLabel: '04/2025' },
    { id: 5, initial: 'N',  name: 'Nam',   sessionsAttended: 9, sessionsTotal: 13, joinedLabel: '02/2025' },
    { id: 6, initial: 'Li', name: 'Linh',  sessionsAttended: 6, sessionsTotal: 13, joinedLabel: '03/2025' },
  ],
  guests: [
    { id: 'g1', initial: 'A',  name: 'An',    sessions: 2, lastSeen: 'Lần cuối hôm nay' },
    { id: 'g2', initial: 'Kh', name: 'Khải',  sessions: 1, lastSeen: 'Lần cuối 11/05' },
    { id: 'g3', initial: 'D',  name: 'Dũng',  sessions: 3, lastSeen: 'Tháng trước' },
  ],
};
