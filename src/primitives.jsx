// Spliteasy Boss — shared UI primitives
// Drop into src/primitives.jsx. All styles inline per spec.

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { House, Users, TennisBall, User, Bell } from '@phosphor-icons/react';
import { colors, type, radius } from './tokens';

/* ───────────────────────── Phone shell ───────────────────────── */

export function PhoneFrame({ children, statusBar = true }) {
  return (
    <div data-spliteasy-phone-frame style={{
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
    <div data-spliteasy-status-bar style={{
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
      top: 'var(--screen-top, 44px)',
      bottom: 0,
      left: 0,
      right: 0,
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      boxSizing: 'border-box',
      padding: '0 16px calc(72px + var(--safe-bottom, 0px))',
      ...style,
    }}>{children}</div>
  );
}

/* ───────────────────────── Tab bar ───────────────────────── */

const TAB_ICONS = {
  home:       <House weight="fill" size={22} />,
  groups:     <Users weight="fill" size={22} />,
  pickleball: <TennisBall weight="fill" size={22} />,
  profile:    <User weight="fill" size={22} />,
};

const TAB_ITEMS = [
  { key: 'home',       label: 'Trang chủ' },
  { key: 'groups',     label: 'Nhóm' },
  { key: 'pickleball', label: 'Pickleball' },
  { key: 'profile',    label: 'Cá nhân' },
];

export function TabBar({ active = 'home', onChange, onFab }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 'calc(84px + var(--safe-bottom, 0px))',
      background: 'rgba(7,8,15,0.9)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${colors.borderSubtle}`,
      display: 'flex', alignItems: 'flex-start',
      padding: '10px 8px calc(24px + var(--safe-bottom, 0px))', zIndex: 20,
    }}>
      {TAB_ITEMS.slice(0, 2).map(t => (
        <TabItem key={t.key} tabKey={t.key} label={t.label} active={active === t.key} onClick={() => onChange?.(t.key)} />
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
        <TabItem key={t.key} tabKey={t.key} label={t.label} active={active === t.key} onClick={() => onChange?.(t.key)} />
      ))}
    </div>
  );
}

function TabItem({ tabKey, label, active, onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '6px 4px', fontSize: 10, fontWeight: 600,
        color: active ? colors.brandLight : colors.textMuted,
        letterSpacing: '0.2px', background: 'transparent', border: 'none',
        fontFamily: 'inherit', cursor: 'pointer',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
      <span style={{
        lineHeight: 1,
        opacity: active ? 1 : 0.4,
        filter: active ? 'drop-shadow(0 0 8px rgba(129,140,248,0.7))' : 'none',
      }}>{TAB_ICONS[tabKey]}</span>
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

const TONE = {
  pickleball: {
    hero: 'emerald',
    accent: colors.pickleball,
    text: '#064e3b',
    soft: colors.successSoft,
  },
  groups: {
    hero: 'amber',
    accent: colors.warning,
    text: '#7c2d12',
    soft: colors.warningSoft,
  },
  finance: {
    hero: 'indigo',
    accent: colors.brandLight,
    text: '#1e1b4b',
    soft: colors.brandSoftBg,
  },
  profile: {
    hero: 'violet',
    accent: '#c4b5fd',
    text: '#3b0764',
    soft: 'rgba(167,139,250,0.16)',
  },
};

function toneConfig(tone = 'finance') {
  return TONE[tone] || TONE.finance;
}

export function ModuleHero({ eyebrow, title, subtitle, action, tone = 'finance', children, style, ...rest }) {
  const t = toneConfig(tone);
  return (
    <Hero variant={t.hero} style={{ marginTop: 8, padding: 18, ...style }} {...rest}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {eyebrow && <div style={{ ...type.label, color: t.accent }}>{eyebrow}</div>}
          {title && <h1 style={{ ...type.title, margin: '4px 0 0' }}>{title}</h1>}
          {subtitle && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </Hero>
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

export function Avatar({ initial, size = 24, color, photoUrl = '', ring = true, style }) {
  const bg = color || AVATAR_GRADIENTS[initial] || AVATAR_GRADIENTS.L;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      border: ring ? `2px solid ${colors.shellBg}` : 'none',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'white',
      flexShrink: 0,
      overflow: 'hidden',
      ...style,
    }}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={initial}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : initial}
    </span>
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

export function ActionButton({ children, danger, tone = 'finance', icon, style, ...rest }) {
  const t = toneConfig(danger ? 'groups' : tone);
  return (
    <button type="button" style={{
      width: '100%',
      border: `1px solid ${danger ? 'rgba(248,113,113,0.24)' : colors.borderSubtle}`,
      borderRadius: 12,
      background: danger ? colors.dangerSoft : colors.inputBg,
      color: danger ? colors.danger : colors.textPrimary,
      padding: '12px 14px',
      marginTop: 8,
      textAlign: 'left',
      fontSize: 13,
      fontWeight: 800,
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      ...style,
    }} {...rest}>
      {icon && <span style={{ color: t.accent, fontSize: 15, lineHeight: 1 }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({ children, dot, style, ...rest }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: 38, height: 38, borderRadius: 12,
        background: colors.inputBg,
        border: `1px solid ${colors.borderSubtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, position: 'relative',
        fontFamily: 'inherit', cursor: 'pointer', color: colors.textPrimary,
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)',
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

export function IconActionButton({ children, tone = 'finance', style, ...rest }) {
  const t = toneConfig(tone);
  return (
    <button type="button" style={{
      width: 38,
      height: 38,
      borderRadius: 12,
      background: t.soft,
      border: `1px solid ${t.accent}`,
      color: t.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      fontWeight: 900,
      fontFamily: 'inherit',
      cursor: 'pointer',
      ...style,
    }} {...rest}>{children}</button>
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

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', style, inputStyle, ...rest }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12,
      padding: '11px 14px',
      ...style,
    }}>
      <span style={{ color: colors.textMuted, fontSize: 14 }}>⌕</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: colors.textPrimary,
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: 600,
          ...inputStyle,
        }}
        {...rest}
      />
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

export function ListCard({ children, style, ...rest }) {
  return (
    <Card style={{ padding: '4px 12px', ...style }} {...rest}>
      {children}
    </Card>
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

export function SectionHeader({ children, action, onAction, style }) {
  return (
    <div style={{
      fontSize: 9,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '1.2px',
      color: colors.textMuted,
      margin: '18px 0 8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...style,
    }}>
      <span>{children}</span>
      {action && (
        <button type="button" onClick={onAction} style={{
          border: 'none',
          background: 'transparent',
          color: colors.brandLight,
          fontSize: 11,
          fontWeight: 800,
          fontFamily: 'inherit',
          cursor: onAction ? 'pointer' : 'default',
          padding: 0,
        }}>{action}</button>
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

export function StatGrid({ children, style }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      marginBottom: 12,
      ...style,
    }}>{children}</div>
  );
}

export function BottomSheet({ title, children, onClose, tone = 'finance', style }) {
  const t = toneConfig(tone);
  const sheet = (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 30,
      background: 'rgba(0,0,0,0.50)',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 12,
    }}>
      <div style={{
        width: '100%',
        maxHeight: '86%',
        overflowY: 'auto',
        background: colors.shellBg,
        border: `1px solid ${colors.borderNormal}`,
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
        ...style,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ width: 34, height: 3, borderRadius: 99, background: t.accent, opacity: 0.7, marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 900 }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: `1px solid ${colors.borderSubtle}`,
            background: colors.inputBg,
            color: colors.textSecondary,
            fontSize: 18,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
  const target = typeof document === 'undefined'
    ? null
    : document.querySelector('[data-spliteasy-phone-frame]');
  return target ? createPortal(sheet, target) : sheet;
}

export function MemberPicker({
  candidates = [],
  selectedIds = [],
  query = '',
  onQueryChange,
  onToggle,
  emptyText = 'Không có thành viên phù hợp.',
  placeholder = 'Tìm vài ký tự để lọc thành viên',
  sectionTitle = 'Thành viên có sẵn',
  tone = 'finance',
  maxListHeight = 260,
}) {
  const t = toneConfig(tone);
  const normalizedQuery = normalizePickerSearch(query);
  const visible = candidates.filter(candidate => {
    if (!normalizedQuery) return true;
    return normalizePickerSearch(`${candidate.name} ${candidate.bankName} ${candidate.bankAccount}`).includes(normalizedQuery);
  });
  const hasVisibleCandidates = visible.length > 0;
  const allVisibleSelected = hasVisibleCandidates && visible.every(candidate => selectedIds.includes(String(candidate.id)));

  function selectVisibleCandidates() {
    visible
      .filter(candidate => !selectedIds.includes(String(candidate.id)))
      .forEach(candidate => onToggle?.(candidate.id));
  }

  function clearVisibleCandidates() {
    visible
      .filter(candidate => selectedIds.includes(String(candidate.id)))
      .forEach(candidate => onToggle?.(candidate.id));
  }

  return (
    <div style={{
      background: tone === 'pickleball' ? colors.heroEmerald : colors.cardSurface,
      border: `1px solid ${tone === 'pickleball' ? 'rgba(52,211,153,0.28)' : colors.borderSubtle}`,
      borderRadius: 16,
      padding: 14,
    }}>
      <SectionHeader style={{ marginTop: 0, color: t.accent }}>{sectionTitle}</SectionHeader>
      <SearchInput
        value={query}
        onChange={event => onQueryChange?.(event.target.value)}
        placeholder={placeholder}
        style={{ marginBottom: 10 }}
      />
      {hasVisibleCandidates && (
        <div style={{ marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => allVisibleSelected ? clearVisibleCandidates() : selectVisibleCandidates()}
            style={{ ...pickerActionStyle(t), width: '100%' }}
          >
            {allVisibleSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: maxListHeight, overflowY: 'auto', paddingRight: 2 }}>
        {visible.map(candidate => {
          const active = selectedIds.includes(String(candidate.id));
          const hasBank = candidate.bankName || candidate.bankAccount;
          return (
            <button key={candidate.id} type="button" onClick={() => onToggle?.(candidate.id)} style={{
              display: 'grid',
              gridTemplateColumns: '24px minmax(0, 1fr)',
              gap: 10,
              alignItems: 'center',
              width: '100%',
              border: `1px solid ${active ? t.accent : colors.borderSubtle}`,
              borderRadius: 12,
              background: active ? t.soft : colors.inputBg,
              color: colors.textPrimary,
              padding: 12,
              textAlign: 'left',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: 8,
                border: active ? 'none' : `1px solid ${colors.borderSubtle}`,
                background: active ? t.accent : 'transparent',
                color: t.text,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 900,
              }}>{active ? '✓' : ''}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hasBank ? `${candidate.bankName || 'Ngân hàng'} · ${candidate.bankAccount || 'chưa có STK'}` : 'Chưa cập nhật ngân hàng'}
                </span>
              </span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <div style={{ fontSize: 12, color: colors.textSecondary, padding: '12px 2px' }}>{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function pickerActionStyle(t) {
  return {
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: 10,
    background: colors.inputBg,
    color: t.accent,
    padding: '9px 10px',
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function normalizePickerSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLowerCase();
}
