// Spliteasy Boss — shared UI primitives
// Drop into src/primitives.jsx. All styles inline per spec.

import React from 'react';
import { colors, type, radius } from './tokens';

/* ───────────────────────── Phone shell ───────────────────────── */

export function PhoneFrame({ children, statusBar = true }) {
  return (
    <div style={{
      width: 375,
      height: 812,
      margin: '24px auto',
      background: colors.shellBg,
      borderRadius: radius.phone,
      border: `1px solid ${colors.borderNormal}`,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 8px #1a1c28',
      fontFamily: type.family,
      color: colors.textPrimary,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {statusBar && <StatusBar />}
      {children}
    </div>
  );
}

export function StatusBar({ time = '9:41' }) {
  return (
    <div style={{
      height: 44, display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '0 24px',
      fontSize: 14, fontWeight: 600, color: colors.textPrimary,
      position: 'relative', zIndex: 10,
    }}>
      <span>{time}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>● ●● 􀋨</span>
    </div>
  );
}

export function Screen({ children, style }) {
  return (
    <div style={{
      position: 'absolute',
      top: 44,
      bottom: 0,
      left: 0,
      right: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      padding: '0 16px 100px',
      ...style,
    }}>{children}</div>
  );
}

/* ───────────────────────── Tab bar ───────────────────────── */

const TAB_ITEMS = [
  { key: 'home',       icon: '🏠', label: 'Trang chủ' },
  { key: 'groups',     icon: '👥', label: 'Nhóm' },
  { key: 'pickleball', icon: '🏓', label: 'Pickleball' },
  { key: 'profile',    icon: '👤', label: 'Cá nhân' },
];

export function TabBar({ active = 'home', onChange, onFab }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 84,
      background: 'rgba(7,8,15,0.9)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${colors.borderSubtle}`,
      display: 'flex', alignItems: 'flex-start',
      padding: '10px 8px 24px', zIndex: 20,
    }}>
      {TAB_ITEMS.slice(0, 2).map(t => (
        <TabItem key={t.key} {...t} active={active === t.key} onClick={() => onChange?.(t.key)} />
      ))}
      <button onClick={onFab} aria-label="Thêm" style={{
        width: 56, height: 56, borderRadius: '50%',
        background: colors.brandGradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 26, fontWeight: 300,
        boxShadow: `0 8px 24px ${colors.brandGlow}, 0 0 0 4px ${colors.shellBg}`,
        marginTop: -24, border: 'none', cursor: 'pointer',
      }}>+</button>
      {TAB_ITEMS.slice(2).map(t => (
        <TabItem key={t.key} {...t} active={active === t.key} onClick={() => onChange?.(t.key)} />
      ))}
    </div>
  );
}

function TabItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '6px 4px', fontSize: 10, fontWeight: 600,
      color: active ? colors.brandLight : colors.textMuted,
      letterSpacing: '0.2px', background: 'transparent', border: 'none',
      fontFamily: 'inherit', cursor: 'pointer',
    }}>
      <span style={{
        fontSize: 20, lineHeight: 1,
        filter: active ? 'none' : 'grayscale(1) brightness(0.6)',
        textShadow: active ? '0 0 12px rgba(129,140,248,0.6)' : 'none',
      }}>{icon}</span>
      {label}
    </button>
  );
}

/* ───────────────────────── Cards / containers ───────────────────────── */

const ACCENT = {
  pickleball: colors.pickleball,
  groups:     colors.groups,
  finance:    colors.brand,
};

export function Card({ accent, elevated, children, style, ...rest }) {
  return (
    <div style={{
      background: elevated ? colors.cardElevated : colors.cardSurface,
      border: `1px solid ${elevated ? colors.borderNormal : colors.borderSubtle}`,
      borderRadius: radius.card,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }} {...rest}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${ACCENT[accent]}, transparent)`,
        }} />
      )}
      {children}
    </div>
  );
}

export function Hero({ variant = 'indigo', children, glow = true, style }) {
  const bg = {
    indigo:  colors.heroIndigo,
    emerald: colors.heroEmerald,
    amber:   colors.heroAmber,
    violet:  colors.heroViolet,
  }[variant];
  const border = {
    indigo:  'rgba(99,102,241,0.3)',
    emerald: 'rgba(52,211,153,0.35)',
    amber:   'rgba(245,158,11,0.3)',
    violet:  'rgba(167,139,250,0.35)',
  }[variant];
  const glowColor = {
    indigo:  'rgba(99,102,241,0.35)',
    emerald: 'rgba(52,211,153,0.3)',
    amber:   'rgba(245,158,11,0.3)',
    violet:  'rgba(167,139,250,0.35)',
  }[variant];
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: radius.hero,
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {glow && <div style={{
        position: 'absolute', top: -40, right: -40, width: 180, height: 180,
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/* ───────────────────────── Atoms ───────────────────────── */

const AVATAR_GRADIENTS = {
  L:  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  M:  'linear-gradient(135deg, #34d399, #10b981)',
  H:  'linear-gradient(135deg, #f59e0b, #d97706)',
  T:  'linear-gradient(135deg, #f87171, #dc2626)',
  N:  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  Li: 'linear-gradient(135deg, #ec4899, #be185d)',
  K:  'linear-gradient(135deg, #fbbf24, #d97706)',  // khách
};

export function Avatar({ initial, size = 24, color, ring = true, style }) {
  const bg = color || AVATAR_GRADIENTS[initial] || AVATAR_GRADIENTS.L;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      border: ring ? `2px solid ${colors.shellBg}` : 'none',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'white',
      flexShrink: 0,
      ...style,
    }}>{initial}</span>
  );
}

export function AvatarStack({ people = [], extra }) {
  return (
    <span style={{ display: 'inline-flex' }}>
      {people.map((p, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar initial={p} size={24} />
        </span>
      ))}
      {extra > 0 && (
        <span style={{ marginLeft: -8 }}>
          <Avatar initial={`+${extra}`} size={24} color="rgba(255,255,255,0.08)" />
        </span>
      )}
    </span>
  );
}

const BADGE_PALETTE = {
  success: { bg: colors.successSoft, color: '#6ee7b7' },
  warn:    { bg: colors.warningSoft, color: '#fcd34d' },
  danger:  { bg: colors.dangerSoft,  color: '#fca5a5' },
  brand:   { bg: colors.brandSoftBg, color: '#c7d2fe' },
  muted:   { bg: 'rgba(255,255,255,0.05)', color: colors.textSecondary },
};

export function Badge({ tone = 'muted', children, style }) {
  const p = BADGE_PALETTE[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 100,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.2px',
      background: p.bg, color: p.color, ...style,
    }}>{children}</span>
  );
}

export function Pill({ active, children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 100,
      background: active ? colors.brandSoftBg : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : colors.borderSubtle}`,
      fontSize: 11, fontWeight: 600,
      color: active ? '#c7d2fe' : colors.textSecondary,
      whiteSpace: 'nowrap', flexShrink: 0,
      fontFamily: 'inherit', cursor: 'pointer',
      ...style,
    }}>{children}</button>
  );
}

export function PillRow({ children, style }) {
  return (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto',
      margin: '4px 0 14px', scrollbarWidth: 'none', ...style,
    }}>{children}</div>
  );
}

export function SubTabs({ items, active, onChange, style }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: colors.cardSurface,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12, margin: '12px 0 16px', ...style,
    }}>
      {items.map(item => {
        const isActive = item.key === active;
        return (
          <button key={item.key} onClick={() => onChange?.(item.key)} style={{
            flex: 1, textAlign: 'center', padding: '8px 6px',
            fontSize: 11, fontWeight: isActive ? 700 : 600,
            color: isActive ? colors.textPrimary : colors.textSecondary,
            background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
            boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            borderRadius: 9, border: 'none',
            fontFamily: 'inherit', cursor: 'pointer',
          }}>{item.label}</button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Buttons / inputs ───────────────────────── */

export function Button({ variant = 'brand', block, children, style, ...rest }) {
  const palette = {
    brand:   { bg: colors.brandGradient, color: 'white', shadow: '0 8px 24px rgba(99,102,241,0.3)' },
    primary: { bg: 'rgba(255,255,255,0.95)', color: '#1e1b4b' },
    ghost:   { bg: 'rgba(255,255,255,0.08)', color: colors.textPrimary, border: `1px solid ${colors.borderNormal}` },
    danger:  { bg: colors.dangerSoft, color: '#fca5a5', border: '1px solid rgba(248,113,113,0.2)' },
    success: { bg: 'rgba(52,211,153,0.15)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.25)' },
    muted:   { bg: colors.inputBg, color: '#cbd5e1', border: `1px solid ${colors.borderSubtle}` },
  }[variant];

  return (
    <button style={{
      width: block ? '100%' : 'auto',
      padding: '14px',
      borderRadius: 14,
      fontSize: 14, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: palette.bg, color: palette.color,
      border: palette.border || 'none',
      boxShadow: palette.shadow || 'none',
      fontFamily: 'inherit', cursor: 'pointer', ...style,
    }} {...rest}>{children}</button>
  );
}

export function IconButton({ children, dot, style, ...rest }) {
  return (
    <button style={{
      width: 38, height: 38, borderRadius: 12,
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, position: 'relative',
      fontFamily: 'inherit', cursor: 'pointer', color: colors.textPrimary,
      ...style,
    }} {...rest}>
      {children}
      {dot && <span style={{
        position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%',
        background: colors.danger, boxShadow: '0 0 8px rgba(248,113,113,0.6)',
      }} />}
    </button>
  );
}

export function Input({ label, suffix, style, inputStyle, ...rest }) {
  return (
    <div style={style}>
      {label && <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: colors.textSecondary,
        margin: '14px 0 6px',
      }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <input style={{
          width: '100%', padding: '14px 14px',
          paddingRight: suffix ? 40 : 14,
          background: colors.inputBg,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 12, color: colors.textPrimary,
          fontSize: 14, fontWeight: 500,
          fontFamily: 'inherit', outline: 'none',
          ...inputStyle,
        }} {...rest} />
        {suffix && <span style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          color: colors.textMuted, fontSize: 13, fontWeight: 600,
        }}>{suffix}</span>}
      </div>
    </div>
  );
}

/* ───────────────────────── List row ───────────────────────── */

export function Row({ icon, iconBg, title, sub, amount, amountColor = colors.textPrimary, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : `1px solid rgba(255,255,255,0.04)`,
    }}>
      {icon && (
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: iconBg || 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{sub}</div>}
      </div>
      {amount != null && (
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '-0.2px',
          color: amountColor, ...type.mono,
        }}>{amount}</div>
      )}
    </div>
  );
}

/* ───────────────────────── Misc ───────────────────────── */

export function SectionLabel({ children, action, onAction }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '1.2px', color: colors.textMuted,
      margin: '22px 0 10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{children}</span>
      {action && (
        <span
          onClick={onAction}
          style={{
            color: colors.brandLight, fontSize: 11, letterSpacing: 0,
            textTransform: 'none', fontWeight: 600,
            cursor: onAction ? 'pointer' : 'default',
          }}
        >{action}</span>
      )}
    </div>
  );
}

export function MonthNav({ label, onPrev, onNext }) {
  const arrow = {
    width: 28, height: 28, borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: colors.textSecondary, fontSize: 14,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: '4px 0 14px',
      fontSize: 13, fontWeight: 700, color: '#cbd5e1', letterSpacing: '-0.2px',
    }}>
      <button style={arrow} onClick={onPrev}>‹</button>
      <span>{label}</span>
      <button style={arrow} onClick={onNext}>›</button>
    </div>
  );
}

export function Stat({ value, label, color, accent }) {
  return (
    <Card accent={accent} style={{ padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: color || colors.textPrimary, ...type.mono }}>{value}</div>
      <div style={{
        fontSize: 9, color: colors.textSecondary, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2,
      }}>{label}</div>
    </Card>
  );
}
