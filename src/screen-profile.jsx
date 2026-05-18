import React, { useMemo } from 'react'
import { useApp } from './store.jsx'
import { ME, totalBalances } from './data.jsx'
import { Icon, Avatar, Money, Button, Card, iconBtnStyle, ListRow, SectionHeader, NavHeader } from './components.jsx'
import { exportMonthlyCSV } from './lib/export.js'

// Profile / Cá nhân tab — personal stats + settings
const PRESET_COLORS = ['#574EFA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

function ScreenProfile({ tweaks, push }) {
  const { state, dispatch } = useApp();
  const meId = state.currentUserId || ME;
  const userName = state.currentUserName || 'Bạn';
  const now = new Date();
  const currentMonthLabel = `Tháng ${now.getMonth() + 1}`;
  const me = state.members.find(m => m.id === meId) || {
    name: state.currentUserName || 'Bạn',
    short: state.currentUserName || 'Bạn',
    initials: (state.currentUserName || 'B')[0].toUpperCase(),
    color: '#574EFA',
    isMe: true,
  };
  const totals = useMemo(() => totalBalances(state.groups, meId), [state.groups, meId]);
  const netBalance = useMemo(
    () => Object.values(totals).reduce((sum, value) => sum + value, 0),
    [totals]
  );
  const monthStats = useMemo(() => {
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const monthSessions = (state.pickle.sessions || []).filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && new Date(s.date) <= now;
    });
    const attendedCount = monthSessions.filter(s => (s.attendees || []).includes(meId)).length;
    const totalCount = monthSessions.length;
    const attendancePct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
    return { attendedCount, totalCount, attendancePct };
  }, [state.pickle.sessions, meId, now]);

  const netLabel = netBalance > 0 ? 'Được nhận' : netBalance < 0 ? 'Nợ' : 'Cân bằng';
  const netColor = netBalance > 0 ? 'var(--vb-success-700)' : netBalance < 0 ? 'var(--vb-danger-700)' : 'var(--text-1)';
  const activeColor = me.color || '#574EFA';

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
          Hồ sơ
        </div>
        <button onClick={() => push('settings')} style={iconBtnStyle()} aria-label="Cài đặt">
          <Icon name="settings" size={20} color="var(--text-1)"/>
        </button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card style={{ padding: '22px 18px', textAlign: 'center' }}>
          <Avatar member={me} size={72} style={tweaks.avatarStyle} ring/>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-1)', marginTop: 12 }}>
            {userName || me.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginTop: 3 }}>
            {me.short?.toLowerCase()}@spliteasy.vn
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
            {PRESET_COLORS.map(color => (
              <ColorSwatch
                key={color}
                color={color}
                active={activeColor.toLowerCase() === color.toLowerCase()}
                onClick={() => {
                  if (activeColor.toLowerCase() !== color.toLowerCase()) {
                    dispatch({ type: 'UPDATE_MEMBER_COLOR', color });
                  }
                }}
              />
            ))}
          </div>
        </Card>

        <div>
          <SectionHeader title="Tháng này" action={currentMonthLabel} onAction={() => {}}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ProfileStatCard
              icon="pickle"
              iconColor="var(--brand-1)"
              iconBg="var(--brand-soft)"
              label="Buổi pickleball"
              value={`${monthStats.attendedCount}/${monthStats.totalCount}`}
              sub="buổi đã đi"
            />
            <ProfileStatCard
              icon={netBalance >= 0 ? 'arrow-down' : 'arrow-up'}
              iconColor={netBalance >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}
              iconBg={netBalance >= 0 ? 'var(--vb-success-100)' : 'var(--vb-danger-50)'}
              label={netLabel}
              value={<Money value={Math.abs(netBalance)} size={20} color={netColor} compact/>}
              sub="số dư net"
            />
          </div>
          <AttendanceCard pct={monthStats.attendancePct}/>
        </div>

        {me?.role === 'treasurer' && (
          <Button
            variant="secondary"
            full
            icon="arrow-down"
            onClick={() => exportMonthlyCSV(state)}
            style={{ justifyContent: 'flex-start' }}
          >
            Xuất báo cáo tháng (CSV)
          </Button>
        )}

        <Button
          variant="danger"
          full
          icon="log-out"
          onClick={() => {
            if (window.confirm('Đăng xuất khỏi SpliteasyBoss?')) {
              dispatch({ type: 'LOGOUT' });
            }
          }}
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}

function ColorSwatch({ color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color}
      aria-label={`Chọn màu ${color}`}
      aria-pressed={active}
      style={{
        appearance: 'none',
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: active ? '2px solid var(--text-1)' : '2px solid var(--surface-1)',
        background: color,
        cursor: 'pointer',
        boxShadow: active ? `0 0 0 3px ${color}33` : '0 0 0 1px var(--border-1)',
      }}
    />
  );
}

function MenuIcon({ name, bg, c }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={name} size={18} color={c}/>
    </div>
  );
}

function ProfileStatCard({ icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div style={{
      padding: 14, background: 'var(--surface-1)', border: '1px solid var(--border-1)',
      borderRadius: 14, boxShadow: 'var(--vb-shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={14} color={iconColor}/>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: 'var(--text-1)', fontFamily: 'var(--vb-font-num)' }}>
        {value}
      </div>
      <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{sub}</div>
    </div>
  );
}

function AttendanceCard({ pct }) {
  return (
    <Card style={{ marginTop: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>Tham gia</span>
        <span style={{ fontFamily: 'var(--vb-font-num)', fontSize: 20, fontWeight: 800, color: 'var(--brand-1)' }}>{pct}%</span>
      </div>
      <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: 'var(--brand-1)',
          transition: 'width .25s ease',
        }}/>
      </div>
    </Card>
  );
}

function ScreenSettings({ pop }) {
  const { dispatch } = useApp();
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Cài đặt" onBack={pop}/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <ListRow left={<MenuIcon name="user" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Thông tin cá nhân" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>}/>
          <ListRow left={<MenuIcon name="card" bg="var(--vb-success-100)" c="var(--vb-success-700)"/>} title="Tiền tệ" subtitle="VND" right={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--vb-warn-100)', color: '#B45309' }}>Sắp ra mắt</span>}/>
          <ListRow left={<MenuIcon name="bell" bg="#FFF7E0" c="#A05C0C"/>} title="Nhắc qua Zalo" subtitle="Đang bật" right={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--vb-warn-100)', color: '#B45309' }}>Sắp ra mắt</span>} divider={false}/>
        </Card>
        <Card>
          <ListRow left={<MenuIcon name="sparkle" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Phiên bản" subtitle="Spliteasy 1.0.0 (build 2026.05)" divider={false}/>
        </Card>
        {/* Logout */}
        <div style={{ padding: '8px 16px 32px' }}>
          <button
            onClick={() => {
              if (window.confirm('Đăng xuất khỏi SpliteasyBoss?')) {
                dispatch({ type: 'LOGOUT' });
              }
            }}
            style={{
              appearance: 'none', width: '100%', height: 48,
              borderRadius: 14, border: 0, cursor: 'pointer',
              background: 'var(--vb-danger-50)', color: 'var(--vb-danger-700)',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--vb-font-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="log-out" size={18} color="var(--vb-danger-700)"/>
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScreenProfile
export { ScreenSettings }
