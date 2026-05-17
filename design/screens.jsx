// SpliteasyBoss screens — light/dark
// 390 × 844 iPhone 14 frames. All screens share a Phone wrapper that
// pre-applies tokens via inline style/var.

const SBTokens = {
  light: {
    name: 'light',
    surface: '#F8F8FB',
    card: '#FFFFFF',
    cardElev: '#FFFFFF',
    text: '#0F0F12',
    textSub: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#ECEEF3',
    borderStrong: '#E0E3EB',
    brand: '#574EFA',
    brandSoft: '#ECEBFF',
    brandSoftStrong: '#DEDCFF',
    success: '#2EBF43',
    successSoft: '#E4F8E7',
    warning: '#EEA23E',
    warningSoft: '#FCEFDB',
    danger: '#E7000B',
    dangerSoft: '#FCE3E5',
    chip: '#F2F3F7',
    statusBg: '#FFFFFF',
    cardShadow: '0px 1px 2px rgba(16,24,40,0.04), 0 0 0 1px rgba(16,24,40,0.04)',
    cardShadowLg: '0 12px 28px -6px rgba(16,24,40,0.12), 0 4px 10px -2px rgba(16,24,40,0.06), 0 0 0 1px rgba(16,24,40,0.04)',
    tabInactive: '#9CA3AF',
    divider: '#EEF0F4',
  },
  dark: {
    name: 'dark',
    surface: '#0F0F12',
    card: '#1A1A24',
    cardElev: '#22222E',
    text: '#FFFFFF',
    textSub: '#A1A1AA',
    textMuted: '#71717A',
    border: '#26262E',
    borderStrong: '#32323C',
    brand: '#574EFA',
    brandSoft: 'rgba(87,78,250,0.18)',
    brandSoftStrong: 'rgba(87,78,250,0.28)',
    success: '#2EBF43',
    successSoft: 'rgba(46,191,67,0.18)',
    warning: '#EEA23E',
    warningSoft: 'rgba(238,162,62,0.18)',
    danger: '#FF4D5A',
    dangerSoft: 'rgba(231,0,11,0.22)',
    chip: '#22222E',
    statusBg: '#0F0F12',
    cardShadow: '0px 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
    cardShadowLg: '0 18px 40px rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
    tabInactive: '#6B6B73',
    divider: '#22222E',
  },
};

const FONT_STACK = "'Inter', 'Be Vietnam Pro', system-ui, sans-serif";

// ─────────────────────────────────────────────────────────────
// Status bar (iOS-style)
// ─────────────────────────────────────────────────────────────
function StatusBar({ t, time = '9:41' }) {
  const ink = t.text;
  return (
    <div style={{
      height: 44, padding: '0 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', color: ink, fontWeight: 600,
      fontSize: 15, letterSpacing: '-0.01em', flex: '0 0 auto',
      background: t.surface,
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="0.5" fill={ink} />
          <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill={ink} />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={ink} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={ink} />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" aria-hidden="true">
          <path d="M7.5 1C10.5 1 13.2 2.1 15 4l-1.5 1.5C12 4 9.8 3.2 7.5 3.2S3 4 1.5 5.5L0 4C1.8 2.1 4.5 1 7.5 1z" fill={ink} />
          <path d="M7.5 5.2c1.7 0 3.3.6 4.5 1.7L10.5 8.4C9.7 7.6 8.6 7.2 7.5 7.2s-2.2.4-3 1.2L3 6.9c1.2-1.1 2.8-1.7 4.5-1.7z" fill={ink} />
          <circle cx="7.5" cy="10" r="1.2" fill={ink} />
        </svg>
        {/* battery */}
        <svg width="27" height="12" viewBox="0 0 27 12" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={ink} strokeOpacity="0.4" fill="none" />
          <rect x="2" y="2" width="19" height="8" rx="1.6" fill={ink} />
          <rect x="23.5" y="4" width="2" height="4" rx="1" fill={ink} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar
// ─────────────────────────────────────────────────────────────
function TabBar({ t, active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Tổng quát', icon: HomeIcon },
    { id: 'groups', label: 'Nhóm', icon: GroupsIcon },
    { id: 'pickle', label: 'Pickleball', icon: PickleIcon },
    { id: 'profile', label: 'Hồ sơ', icon: ProfileIcon },
  ];
  return (
    <div style={{
      flex: '0 0 auto', height: 64 + 22, background: t.card,
      borderTop: `1px solid ${t.border}`,
      paddingBottom: 22,
      display: 'flex', alignItems: 'stretch',
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const color = isActive ? t.brand : t.tabInactive;
        const Icon = tab.icon;
        return (
          <div key={tab.id} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            color, position: 'relative',
          }}>
            <Icon filled={isActive} color={color} />
            <span style={{
              fontSize: 10, fontWeight: isActive ? 600 : 500,
              letterSpacing: '-0.005em',
            }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Tab icons — line/filled variants
function HomeIcon({ filled, color }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M3.5 10.2 12 3.5l8.5 6.7V20a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5a1.5 1.5 0 0 1-1.5-1.5v-9.8z" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 10.2 12 3.5l8.5 6.7V20a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5a1.5 1.5 0 0 1-1.5-1.5v-9.8z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function GroupsIcon({ filled, color }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="17" cy="10" r="2.8" />
      <path d="M2.5 19c.5-3 3.3-5 6.5-5s6 2 6.5 5v.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V19z" />
      <path d="M16 14.5c2.6.2 4.6 1.9 5.2 4.2.2.8-.4 1.8-1.3 1.8h-3v-.5c0-2.1-.7-3.9-1-4.5z" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="17" cy="10" r="2.8" />
      <path d="M3 19.5c.5-3 3-5 6-5s5.5 2 6 5" strokeLinecap="round" />
      <path d="M15.5 14.5c2.6.2 4.6 1.9 5.2 4.2" strokeLinecap="round" />
    </svg>
  );
}
function PickleIcon({ filled, color }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <ellipse cx="10" cy="10" rx="6.5" ry="6.5" />
      <rect x="13.5" y="13.5" width="2.5" height="8" rx="1" transform="rotate(-45 14.75 17.5)" />
      <circle cx="10" cy="10" r="1.2" fill="#fff" opacity="0.4" />
      <circle cx="13" cy="8" r="0.9" fill="#fff" opacity="0.4" />
      <circle cx="8" cy="13" r="0.9" fill="#fff" opacity="0.4" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
      <ellipse cx="10" cy="10" rx="6.5" ry="6.5" />
      <path d="M14.7 14.7l5 5" strokeLinecap="round" strokeWidth="2.2" />
      <circle cx="10" cy="10" r="0.8" fill={color} />
      <circle cx="13" cy="8" r="0.6" fill={color} />
      <circle cx="8" cy="13" r="0.6" fill={color} />
    </svg>
  );
}
function ProfileIcon({ filled, color }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c.6-3.7 3.8-6.5 8-6.5s7.4 2.8 8 6.5v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V20z" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c.5-3.7 3.8-6.5 8-6.5s7.5 2.8 8 6.5" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar (initials, deterministic color)
// ─────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  ['#F5C7A9', '#7A3F1C'], ['#C8D8FF', '#1E3A8A'], ['#FFD6E0', '#9D174D'],
  ['#C7F0D8', '#14532D'], ['#FFE7AE', '#7A5A11'], ['#DCD4FF', '#3B2E8C'],
  ['#FFD1C4', '#7A2E1C'], ['#C0E6F1', '#0C4A6E'],
];
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function Avatar({ name, size = 28, ring }) {
  const [bg, fg] = AVATAR_PALETTE[hashStr(name) % AVATAR_PALETTE.length];
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: Math.round(size * 0.42),
      boxShadow: ring ? `0 0 0 2px ${ring}` : 'none', flex: '0 0 auto',
    }}>{initial}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Phone frame
// ─────────────────────────────────────────────────────────────
function Phone({ t, active, children, hideTabs }) {
  return (
    <div style={{
      width: 390, height: 844, background: t.surface, color: t.text,
      fontFamily: FONT_STACK, display: 'flex', flexDirection: 'column',
      letterSpacing: '-0.01em', overflow: 'hidden',
    }}>
      <StatusBar t={t} />
      <div style={{ flex: '1 1 auto', overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
      {!hideTabs && <TabBar t={t} active={active} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable: nav header, chip, button
// ─────────────────────────────────────────────────────────────
function IconBtn({ t, children, soft }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: soft ? t.chip : 'transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: t.text,
    }}>{children}</div>
  );
}

function BellIcon({ color, dot }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2.5a.7.7 0 0 1-.6 1H5.1a.7.7 0 0 1-.6-1L6 17z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      {dot && <circle cx="17.5" cy="6.5" r="3.2" fill="#E7000B" stroke={dot} strokeWidth="1.5" />}
    </svg>
  );
}
function BackIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 5 8 12l6.5 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MoreIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.8" fill={color} />
      <circle cx="12" cy="12" r="1.8" fill={color} />
      <circle cx="18.5" cy="12" r="1.8" fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 1: Tổng quát — Personal Overview
// ─────────────────────────────────────────────────────────────
function ScreenOverview({ t }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>
            Xin chào, Bình <span style={{ display: 'inline-block', transform: 'rotate(8deg)' }}>👋</span>
          </div>
          <div style={{ fontSize: 13, color: t.textSub, marginTop: 4, fontWeight: 500 }}>Tháng 5 · 2026</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: t.card,
          border: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <BellIcon color={t.text} dot={t.card} />
        </div>
      </div>

      {/* Body scrolling region */}
      <div style={{ flex: '1 1 auto', overflow: 'auto', padding: '0 20px 20px' }}>
        {/* Summary cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SummaryCard t={t} emoji="👥" title="Chi tiêu nhóm" amount="120,000 ₫" subtitle="2 nhóm" />
          <SummaryCard t={t} emoji="🏸" title="Pickleball" amount="200,000 ₫" subtitle="CLB Q7" />
        </div>

        {/* Total + CTA card */}
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 16,
          background: t.card, boxShadow: t.cardShadow,
          border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: t.textSub, fontWeight: 500, marginBottom: 4 }}>Tổng cần thanh toán</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: t.danger, letterSpacing: '-0.02em', lineHeight: 1 }}>
                320,000 <span style={{ fontSize: 18, color: t.danger }}>₫</span>
              </div>
            </div>
            <div style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 100,
              background: t.dangerSoft, color: t.danger, fontWeight: 600,
            }}>Nợ</div>
          </div>
          <button style={{
            width: '100%', height: 52, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: t.brand, color: '#fff',
            fontFamily: FONT_STACK, fontSize: 16, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(87,78,250,0.32)',
            letterSpacing: '-0.01em',
          }}>
            <span>Thanh toán ngay</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontWeight: 700 }}>320,000 ₫</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2 }}>
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Treasurer alert */}
        <div style={{
          marginTop: 14, padding: '14px 16px', borderRadius: 16,
          background: t.warningSoft,
          border: `1px solid ${t.name === 'dark' ? 'rgba(238,162,62,0.3)' : 'rgba(238,162,62,0.35)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: t.name === 'dark' ? 'rgba(238,162,62,0.25)' : 'rgba(238,162,62,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: '0 0 auto',
          }}>⏳</div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.01em' }}>
              3 chi tiêu đang chờ bạn duyệt
            </div>
            <div style={{ fontSize: 12, color: t.warning, marginTop: 2, fontWeight: 500 }}>
              Tổng 540,000 ₫ · CLB Pickleball Q7
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flex: '0 0 auto' }}>
            <path d="M9 6l6 6-6 6" stroke={t.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Recent activity */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>Hoạt Động gần đây</div>
            <div style={{ fontSize: 12, color: t.brand, fontWeight: 600 }}>Tất cả</div>
          </div>
          <div style={{
            background: t.card, borderRadius: 16, boxShadow: t.cardShadow,
            border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
            overflow: 'hidden',
          }}>
            <ActivityRow t={t} who="An" name="Bún chả · Ăn trưa team" date="16/05" amount="60,000 ₫" status="pending" />
            <Divider t={t} />
            <ActivityRow t={t} who="Bình" name="Cà phê · trả họ" date="15/05" amount="30,000 ₫" status="paid" />
            <Divider t={t} />
            <ActivityRow t={t} who="Q7" name="Sân pickleball · 22/05" date="14/05" amount="120,000 ₫" status="owed" />
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function SummaryCard({ t, emoji, title, amount, subtitle }) {
  return (
    <div style={{
      padding: 14, borderRadius: 16,
      background: t.brandSoft,
      border: t.name === 'dark' ? `1px solid rgba(87,78,250,0.28)` : 'none',
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: t.name === 'dark' ? 'rgba(87,78,250,0.3)' : '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>{emoji}</div>
        <div style={{ fontSize: 12, color: t.name === 'dark' ? '#C4C0FF' : '#574EFA', fontWeight: 600, letterSpacing: '-0.005em' }}>
          {title}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: t.name === 'dark' ? '#9D97FF' : '#7B73FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nợ</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginTop: 2 }}>{amount}</div>
      </div>
      <div style={{ fontSize: 11, color: t.textSub, fontWeight: 500 }}>{subtitle}</div>
    </div>
  );
}

function Divider({ t }) {
  return <div style={{ height: 1, background: t.divider, marginLeft: 60 }} />;
}

function StatusDot({ t, status }) {
  const map = {
    pending: { c: t.warning, bg: t.warningSoft },
    paid: { c: t.success, bg: t.successSoft },
    owed: { c: t.brand, bg: t.brandSoft },
  };
  const s = map[status] || map.pending;
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', background: s.c,
      boxShadow: `0 0 0 4px ${s.bg}`, flex: '0 0 auto',
    }} />
  );
}

function ActivityRow({ t, who, name, date, amount, status }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar name={who} size={36} />
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot t={t} status={status} />
          <span>{date}</span>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>
        {status === 'paid' ? '+' : '−'}{amount}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 2: Chi tiết nhóm — Group Detail
// ─────────────────────────────────────────────────────────────
function ScreenGroupDetail({ t }) {
  const [tab, setTab] = React.useState('activity');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Nav header */}
      <div style={{ padding: '4px 12px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconBtn t={t}><BackIcon color={t.text} /></IconBtn>
        <div style={{ flex: '1 1 auto', textAlign: 'center', fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>
          🍜 Ăn trưa team
        </div>
        <IconBtn t={t}><MoreIcon color={t.text} /></IconBtn>
      </div>

      <div style={{ flex: '1 1 auto', overflow: 'auto', padding: '4px 20px 20px' }}>
        {/* Summary chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 100,
          background: t.dangerSoft, color: t.danger, fontSize: 13, fontWeight: 600,
          letterSpacing: '-0.005em', whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.danger }} />
          <span>Bạn nợ <span style={{ fontWeight: 700 }}>80,000 ₫</span></span>
        </div>

        {/* Button pair */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <button style={{
            height: 44, borderRadius: 8, border: `1px solid ${t.borderStrong}`,
            background: t.card, color: t.text, cursor: 'pointer',
            fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
          }}>+ Thêm chi tiêu</button>
          <button style={{
            height: 44, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: t.brand, color: '#fff',
            fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
            boxShadow: '0 2px 8px rgba(87,78,250,0.28)',
          }}>Tất toán</button>
        </div>

        {/* Tab pills */}
        <div style={{
          marginTop: 18, display: 'flex', gap: 8,
          background: t.chip, padding: 4, borderRadius: 100, alignSelf: 'flex-start',
          width: 'fit-content',
        }}>
          {[
            { id: 'activity', label: 'Hoạt Động', dot: true },
            { id: 'balance', label: 'Số dư' },
            { id: 'members', label: 'Thành viên' },
          ].map((p) => (
            <div key={p.id} onClick={() => setTab(p.id)} style={{
              padding: '6px 14px', borderRadius: 100, cursor: 'pointer',
              background: tab === p.id ? (t.name === 'dark' ? t.cardElev : '#fff') : 'transparent',
              boxShadow: tab === p.id ? (t.name === 'dark' ? 'none' : '0 1px 3px rgba(16,24,40,0.08)') : 'none',
              fontSize: 13, fontWeight: tab === p.id ? 700 : 500,
              color: tab === p.id ? t.text : t.textSub,
              letterSpacing: '-0.005em', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {p.label}
              {p.dot && tab === p.id && <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.brand }} />}
            </div>
          ))}
        </div>

        {/* Date stamp */}
        <div style={{ marginTop: 18, fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tháng 5, 2026
        </div>

        {/* Expense list */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ExpenseItem t={t} status="pending"
            emoji="🍜"
            title="Bún chả"
            sub1="An đề xuất"
            sub2="16/05 · Chia đều 4 người"
            amount="240,000 ₫"
            yours="60,000 ₫" />
          <ExpenseItem t={t} status="approved"
            emoji="☕"
            title="Cà phê"
            sub1="Bình trả"
            sub2="15/05 · Bạn: 30,000 ₫"
            amount="120,000 ₫"
            yours="30,000 ₫" />
          <ExpenseItem t={t} status="declined"
            emoji="🍺"
            title="Bia hơi"
            sub1="Từ chối"
            sub2="Lý do: Sai số tiền"
            amount="180,000 ₫" />
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function ExpenseItem({ t, status, emoji, title, sub1, sub2, amount, yours }) {
  const meta = {
    pending: { c: t.warning, bg: t.warningSoft, label: 'Chờ duyệt', dot: '⏳' },
    approved: { c: t.success, bg: t.successSoft, label: 'Đã duyệt', dot: '✓' },
    declined: { c: t.danger, bg: t.dangerSoft, label: 'Từ chối', dot: '✕' },
  }[status];

  const strike = status === 'declined';

  return (
    <div style={{
      background: t.card, borderRadius: 14, boxShadow: t.cardShadow,
      border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
      borderLeft: `3px solid ${meta.c}`,
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: meta.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flex: '0 0 auto', position: 'relative',
      }}>
        <span style={{ filter: strike ? 'grayscale(1) opacity(0.6)' : 'none' }}>{emoji}</span>
        <div style={{
          position: 'absolute', right: -3, bottom: -3,
          width: 16, height: 16, borderRadius: '50%', background: meta.c,
          color: '#fff', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${t.card}`,
        }}>{meta.dot === '⏳' ? '·' : meta.dot}</div>
      </div>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ textDecoration: strike ? 'line-through' : 'none', opacity: strike ? 0.55 : 1 }}>{title}</span>
          <span style={{
            padding: '2px 7px', borderRadius: 100, background: meta.bg, color: meta.c,
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{meta.label}</span>
        </div>
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, fontWeight: 500 }}>{sub1}</div>
        <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 1 }}>{sub2}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.01em',
          textDecoration: strike ? 'line-through' : 'none',
          opacity: strike ? 0.55 : 1,
        }}>{amount}</div>
        {status !== 'declined' ? (
          <div style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 100,
            background: 'transparent', color: t.textMuted, fontWeight: 600,
            border: `1px solid ${t.border}`, cursor: 'pointer',
          }}>Báo sai</div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 3: Duyệt chi tiêu — Approval Swipe
// ─────────────────────────────────────────────────────────────
function ScreenApproval({ t }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 12px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconBtn t={t}><BackIcon color={t.text} /></IconBtn>
        <div style={{ flex: '1 1 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>Chờ duyệt</div>
          <div style={{ fontSize: 11, color: t.textSub, fontWeight: 500, marginTop: 2 }}>3 khoản · CLB Pickleball Q7</div>
        </div>
        <IconBtn t={t}><MoreIcon color={t.text} /></IconBtn>
      </div>

      <div style={{ flex: '1 1 auto', position: 'relative', overflow: 'hidden', padding: '12px 20px 0' }}>
        {/* Left/right action zones */}
        <div style={{
          position: 'absolute', left: 0, top: 60, bottom: 90, width: 80,
          background: `linear-gradient(90deg, ${t.dangerSoft}, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          paddingLeft: 12, pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: t.danger }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: t.name === 'dark' ? 'rgba(231,0,11,0.3)' : '#fff',
              boxShadow: `0 0 24px ${t.name === 'dark' ? 'rgba(255,77,90,0.5)' : 'rgba(231,0,11,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.danger,
              border: `2px solid ${t.danger}`,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke={t.danger} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em' }}>Từ chối</div>
          </div>
        </div>
        <div style={{
          position: 'absolute', right: 0, top: 60, bottom: 90, width: 80,
          background: `linear-gradient(270deg, ${t.successSoft}, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 12, pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: t.success }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: t.name === 'dark' ? 'rgba(46,191,67,0.3)' : '#fff',
              boxShadow: `0 0 24px ${t.name === 'dark' ? 'rgba(46,191,67,0.5)' : 'rgba(46,191,67,0.35)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${t.success}`,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4 4 10-10" stroke={t.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em' }}>Duyệt</div>
          </div>
        </div>

        {/* Stacked cards */}
        <div style={{ position: 'relative', height: 480, marginTop: 6 }}>
          <div style={{
            position: 'absolute', left: 32, right: 32, top: 22, height: 460,
            background: t.card, borderRadius: 20, boxShadow: t.cardShadow,
            border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
            opacity: 0.4, transform: 'scale(0.92)', transformOrigin: 'top center',
          }} />
          <div style={{
            position: 'absolute', left: 22, right: 22, top: 14, height: 460,
            background: t.card, borderRadius: 20, boxShadow: t.cardShadow,
            border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
            opacity: 0.7, transform: 'scale(0.96)', transformOrigin: 'top center',
          }} />
          {/* front card */}
          <div style={{
            position: 'absolute', left: 8, right: 8, top: 0,
            background: t.card, borderRadius: 20, boxShadow: t.cardShadowLg,
            border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
            padding: '22px 22px 24px',
            transform: 'rotate(-2.2deg)', transformOrigin: 'bottom center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: t.warningSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>🍜</div>
              <div style={{
                padding: '4px 10px', borderRadius: 100,
                background: t.warningSoft, color: t.warning,
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Chờ duyệt</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: t.textSub, fontWeight: 500 }}>Tên chi tiêu</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginTop: 2 }}>Bún chả</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: t.textSub, fontWeight: 500 }}>Tổng tiền</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: t.text, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4 }}>
                240,000 <span style={{ fontSize: 22, color: t.textSub }}>₫</span>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name="An" size={32} ring={t.card} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: '-0.005em' }}>An đề xuất</div>
                <div style={{ fontSize: 11.5, color: t.textSub, marginTop: 1 }}>16/05 · 12:34</div>
              </div>
            </div>
            <div style={{ height: 1, background: t.divider, margin: '16px 0 14px' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chia tiền</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex' }}>
                  {['An', 'Bình', 'Chi', 'Dũng'].map((n, i) => (
                    <div key={n} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                      <Avatar name={n} size={26} ring={t.card} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 600, letterSpacing: '-0.005em' }}>
                  An <span style={{ color: t.textSub, fontWeight: 500 }}>+ 3 người</span>
                </div>
              </div>
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 10, background: t.brandSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 12, color: t.name === 'dark' ? '#C4C0FF' : t.brand, fontWeight: 600, letterSpacing: '-0.005em' }}>
                  Mỗi người
                </div>
                <div style={{ fontSize: 14, color: t.name === 'dark' ? '#fff' : t.brand, fontWeight: 700 }}>60,000 ₫</div>
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, fontStyle: 'italic', fontWeight: 500 }}>
                (chia đều · không khóa)
              </div>
            </div>
          </div>
        </div>

        {/* Swipe hint */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 36,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: t.textMuted, fontSize: 12, fontWeight: 500 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M14 6l-6 6 6 6" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Vuốt để từ chối
            </span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.textMuted }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Vuốt để duyệt
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M10 6l6 6-6 6" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.brand }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.border }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.border }} />
            </div>
            <span style={{ fontSize: 11, color: t.textSub, fontWeight: 600 }}>Còn 2 khoản</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 4: CLB Pickleball — Team Overview
// ─────────────────────────────────────────────────────────────
function ScreenClub({ t }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: t.brandSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🏸</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>CLB Pickleball Q7</div>
            <div style={{ fontSize: 12, color: t.textSub, fontWeight: 500, marginTop: 2 }}>Tháng 5 · 2026 · Thủ quỹ: Bình</div>
          </div>
        </div>
        <IconBtn t={t} soft><MoreIcon color={t.text} /></IconBtn>
      </div>

      <div style={{ flex: '1 1 auto', overflow: 'auto', padding: '0 20px 20px' }}>
        {/* Progress card */}
        <div style={{
          padding: 16, borderRadius: 16, background: t.card, boxShadow: t.cardShadow,
          border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: t.textSub, fontWeight: 500 }}>Buổi tháng này</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: '-0.03em', marginTop: 2, lineHeight: 1 }}>
                8 <span style={{ fontSize: 16, color: t.textMuted, fontWeight: 600 }}>/ 10 buổi</span>
              </div>
            </div>
            <div style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 100,
              background: t.successSoft, color: t.success, fontWeight: 700,
            }}>80%</div>
          </div>
          <div style={{
            marginTop: 12, height: 10, borderRadius: 100,
            background: t.chip, position: 'relative', overflow: 'hidden',
            display: 'flex', gap: 2, padding: 1,
          }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 100, background: i < 8 ? t.brand : 'transparent' }} />
            ))}
          </div>
          <div style={{
            marginTop: 10, fontSize: 11.5, color: t.textSub, fontWeight: 500,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>2 buổi còn lại</span>
            <span>Kết thúc 31/05</span>
          </div>
        </div>

        {/* Upcoming sessions */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>Buổi sắp tới</div>
            <div style={{ fontSize: 12, color: t.brand, fontWeight: 600 }}>Lịch</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SessionRow t={t} day="T7" date="24" month="05" time="19:00" court="Sân A · Riverside" you avatars={['An', 'Bình', 'Chi', 'Dũng', 'Em']} extra={2} />
            <SessionRow t={t} day="T3" date="28" month="05" time="19:00" court="Sân B · Riverside" avatars={['An', 'Chi', 'Dũng']} extra={0} />
          </div>
        </div>

        {/* Team cost */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', marginBottom: 10 }}>Chi phí cả đội</div>
          <div style={{
            padding: '4px 16px', borderRadius: 16, background: t.card, boxShadow: t.cardShadow,
            border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
          }}>
            <CostRow t={t} emoji="💧" name="Nước uống" amount="600,000 ₫" />
            <Divider t={t} />
            <CostRow t={t} emoji="🏸" name="Chi tiêu khác" amount="300,000 ₫" expandable />
            <div style={{ height: 1, background: t.text, opacity: 0.08, margin: '4px 0' }} />
            <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>Tổng</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: '-0.02em' }}>900,000 ₫</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, fontWeight: 500, textAlign: 'right' }}>
            Mỗi người ~ 112,500 ₫
          </div>
        </div>

        {/* Members row */}
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 14,
          background: t.card, boxShadow: t.cardShadow,
          border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex' }}>
            {['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Phúc', 'Giang', 'Hà'].map((n, i) => (
              <div key={n} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar name={n} size={28} ring={t.card} />
              </div>
            ))}
            <div style={{
              marginLeft: -8, width: 28, height: 28, borderRadius: '50%',
              background: t.chip, color: t.textSub,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, boxShadow: `0 0 0 2px ${t.card}`,
            }}>+2</div>
          </div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: '-0.005em' }}>8 thành viên</div>
            <div style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>5 đã thanh toán · 3 chờ</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function SessionRow({ t, day, date, month, time, court, avatars, extra, you }) {
  return (
    <div style={{
      padding: 12, borderRadius: 14, background: t.card, boxShadow: t.cardShadow,
      border: t.name === 'dark' ? `1px solid ${t.border}` : 'none',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 48, height: 52, borderRadius: 12, background: t.brandSoft,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 auto',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.brand, letterSpacing: '0.04em' }}>{day}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: t.brand, letterSpacing: '-0.02em', lineHeight: 1 }}>{date}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: t.brand, opacity: 0.7 }}>thg {month}</div>
      </div>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: '-0.005em' }}>{time}</div>
          {you && (
            <div style={{
              fontSize: 9, fontWeight: 700, color: t.success, padding: '2px 6px',
              borderRadius: 100, background: t.successSoft, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Bạn đi</div>
          )}
        </div>
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, fontWeight: 500 }}>{court}</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {avatars.slice(0, 4).map((n, i) => (
              <div key={n} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                <Avatar name={n} size={20} ring={t.card} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: t.textSub, fontWeight: 500 }}>
            {avatars.length}{extra ? ` +${extra}` : ''} đi
          </div>
        </div>
      </div>
    </div>
  );
}

function CostRow({ t, emoji, name, amount, expandable }) {
  return (
    <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, background: t.chip,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flex: '0 0 auto',
      }}>{emoji}</div>
      <div style={{ flex: '1 1 auto', fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em' }}>{name}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>{amount}</div>
      {expandable && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

Object.assign(window, {
  SBTokens, Phone,
  ScreenOverview, ScreenGroupDetail, ScreenApproval, ScreenClub,
});
