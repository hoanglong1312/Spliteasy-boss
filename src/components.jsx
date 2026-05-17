import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react'
import { useApp } from './store.jsx'
import { getMemberMap, fmtVND, fmtVNDFull } from './data.jsx'

// Shared UI primitives for Spliteasy

// ── Icons ───────────────────────────────────────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor', stroke = 1.75 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return <svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>;
    case 'users': return <svg {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><circle cx="17" cy="7" r="2.8"/><path d="M22 17.5c0-2.5-2-4.5-4.5-4.5"/></svg>;
    case 'pickle': return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="7" cy="10" r="1" fill={color}/><circle cx="17" cy="10" r="1" fill={color}/><circle cx="9" cy="15" r="1" fill={color}/><circle cx="15" cy="15" r="1" fill={color}/></svg>;
    case 'user': return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case 'plus': return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'bell': return <svg {...p}><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16zM9 19a3 3 0 0 0 6 0"/></svg>;
    case 'chevron-right': return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-left': return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'chevron-down': return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case 'arrow-right': return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-down': return <svg {...p}><path d="M12 5v14M6 13l6 6 6-6"/></svg>;
    case 'arrow-up': return <svg {...p}><path d="M12 19V5M6 11l6-6 6 6"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'filter': return <svg {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'check': return <svg {...p}><path d="M5 12l5 5L20 7"/></svg>;
    case 'x': return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'edit': return <svg {...p}><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case 'trash': return <svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
    case 'send': return <svg {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case 'zap': return <svg {...p}><path d="M13 2L3 14h8l-1 8 10-12h-8z"/></svg>;
    case 'wallet': return <svg {...p}><path d="M3 7h15a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M3 7V6a2 2 0 0 1 2-2h12"/><circle cx="17" cy="14" r="1.3"/></svg>;
    case 'card': return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
    case 'tag': return <svg {...p}><path d="M20.6 13.4L12 22 2 12V2h10z"/><circle cx="7" cy="7" r="1.2" fill={color}/></svg>;
    case 'food': return <svg {...p}><path d="M3 11h18M3 11l1.5 9a2 2 0 0 0 2 1.7h11a2 2 0 0 0 2-1.7L21 11M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'drink': return <svg {...p}><path d="M6 3h12l-1.4 16a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8L6 3z"/><path d="M7 9h10"/></svg>;
    case 'travel': return <svg {...p}><path d="M3 21h18M5 18l6-6 4 4 4-7M21 14V9h-5"/></svg>;
    case 'gift': return <svg {...p}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 13h18M7.5 8a2.5 2.5 0 0 1 0-5c1.5 0 2.5 1 4.5 5-2 0-4 0-4.5 0zM16.5 8a2.5 2.5 0 0 0 0-5c-1.5 0-2.5 1-4.5 5 2 0 4 0 4.5 0z"/></svg>;
    case 'ball': return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r=".8" fill={color}/><circle cx="16" cy="9" r=".8" fill={color}/><circle cx="12" cy="12" r=".8" fill={color}/><circle cx="8" cy="15" r=".8" fill={color}/><circle cx="16" cy="15" r=".8" fill={color}/></svg>;
    case 'sparkle': return <svg {...p}><path d="M12 3l1.5 5 5 1.5-5 1.5L12 16l-1.5-5L5.5 9.5l5-1.5z"/><path d="M19 3l.7 2 2 .7-2 .7L19 8.5 18.3 6.5 16.3 5.8 18.3 5z"/></svg>;
    case 'menu': return <svg {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'more': return <svg {...p}><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></svg>;
    case 'split': return <svg {...p}><path d="M12 4v6M12 14v6"/><circle cx="12" cy="12" r="2"/><path d="M5 12h2M17 12h2"/></svg>;
    case 'percent': return <svg {...p}><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5L5 19"/></svg>;
    case 'fraction': return <svg {...p}><path d="M5 19l14-14"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/></svg>;
    case 'check-circle': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>;
    case 'log-out': return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'logo-spark':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill={color}/>
        <path d="M12 5l1.8 4.4L18 11l-4.2 1.6L12 17l-1.8-4.4L6 11l4.2-1.6z" fill="#fff"/>
      </svg>;
    default: return null;
  }
}

// ── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ member, size = 32, style: avatarStyle = 'initials', ring = false }) {
  if (!member) return null;
  const useInitials = avatarStyle === 'initials' || (avatarStyle === 'mixed' && member.isMe);
  const wrap = {
    width: size, height: size, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--vb-font-body)', fontWeight: 700,
    fontSize: Math.max(10, size * 0.38),
    color: '#fff',
    flexShrink: 0,
    boxShadow: ring ? '0 0 0 2px var(--surface-1), 0 0 0 4px ' + member.color : 'none',
    overflow: 'hidden',
  };
  if (useInitials || !member.photo) {
    return <div style={{ ...wrap, background: member.color }} aria-label={member.name}>{member.initials}</div>;
  }
  return <img src={member.photo} alt={member.name} style={{ ...wrap, objectFit: 'cover' }}/>;
}

function AvatarStack({ ids, size = 26, overlap = 9, avatarStyle = 'initials', max = 5 }) {
  const { state } = useApp();
  const M = getMemberMap(state.members);
  const slice = ids.slice(0, max);
  const extra = ids.length - slice.length;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {slice.map((id, i) => (
        <div key={id} style={{ marginLeft: i === 0 ? 0 : -overlap, position: 'relative', zIndex: 10 - i }}>
          <Avatar member={M[id]} size={size} style={avatarStyle} ring={true}/>
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -overlap,
          width: size, height: size, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-2)', color: 'var(--text-2)',
          fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: Math.max(9, size * 0.32),
          boxShadow: '0 0 0 2px var(--surface-1)',
        }}>+{extra}</div>
      )}
    </div>
  );
}

// ── Money ───────────────────────────────────────────────────────────────────
function Money({ value, size = 16, weight = 700, color, compact = false, style = {} }) {
  const v = compact ? fmtVND(value) : fmtVNDFull(value);
  return <span style={{
    display: 'inline-block',
    fontFamily: 'var(--vb-font-num)', fontWeight: weight, fontSize: size,
    color: color || 'var(--text-1)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    ...style,
  }}>{v}</span>;
}

// ── Button ──────────────────────────────────────────────────────────────────
function Button({ variant = 'primary', size = 'md', children, onClick, icon, iconRight, full = false, disabled = false, style = {} }) {
  const sizes = {
    sm: { h: 32, px: 12, fs: 13, gap: 6, ic: 16 },
    md: { h: 44, px: 16, fs: 14, gap: 8, ic: 18 },
    lg: { h: 52, px: 20, fs: 15, gap: 10, ic: 20 },
  }[size];
  const variants = {
    primary: { bg: 'var(--brand-1)', color: '#fff', border: 'transparent' },
    secondary: { bg: 'var(--surface-1)', color: 'var(--text-1)', border: 'var(--border-1)' },
    ghost: { bg: 'transparent', color: 'var(--text-1)', border: 'transparent' },
    danger: { bg: 'var(--vb-danger-50)', color: 'var(--vb-danger-700)', border: 'transparent' },
    brandSoft: { bg: 'var(--brand-soft)', color: 'var(--brand-1)', border: 'transparent' },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        height: sizes.h, padding: `0 ${sizes.px}px`,
        background: variants.bg, color: variants.color,
        border: `1px solid ${variants.border}`,
        borderRadius: 'var(--vb-radius-md)',
        fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: sizes.fs,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
        width: full ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        transition: 'transform .15s ease, background .15s ease, box-shadow .15s ease',
        ...style,
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={(e) => e.currentTarget.style.transform = ''}
      onMouseLeave={(e) => e.currentTarget.style.transform = ''}
    >
      {icon && <Icon name={icon} size={sizes.ic} color={variants.color}/>}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={sizes.ic} color={variants.color}/>}
    </button>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick, interactive = false }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--vb-radius-xl)',
        boxShadow: 'var(--vb-shadow-card)',
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'transform .15s ease, box-shadow .15s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Pill / Chip ─────────────────────────────────────────────────────────────
function Pill({ children, color, bg, size = 'sm', icon }) {
  const sizes = { xs: { h: 20, px: 6, fs: 11 }, sm: { h: 24, px: 8, fs: 12 }, md: { h: 28, px: 10, fs: 13 } }[size];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: sizes.h, padding: `0 ${sizes.px}px`,
      background: bg || 'var(--vb-purple-100)', color: color || 'var(--vb-purple-700)',
      borderRadius: 'var(--vb-radius-pill)',
      fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: sizes.fs,
      whiteSpace: 'nowrap',
    }}>
      {icon && <Icon name={icon} size={sizes.fs + 2} color={color || 'var(--vb-purple-700)'}/>}
      {children}
    </span>
  );
}

// ── Section Header (used in screens) ────────────────────────────────────────
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 8px', gap: 8 }}>
      <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>{title}</div>
      {action && <button onClick={onAction} style={{ appearance: 'none', background: 'transparent', border: 0, padding: 0, color: 'var(--brand-1)', fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{action}</button>}
    </div>
  );
}

// ── Category icon mapping ───────────────────────────────────────────────────
function CategoryIcon({ cat, size = 36 }) {
  const map = {
    food:   { icon: 'food',   color: '#F26F4A', bg: '#FFF1EC' },
    drink:  { icon: 'drink',  color: '#0BA5A0', bg: '#E5F8F7' },
    travel: { icon: 'travel', color: '#155DFC', bg: '#E8EFFE' },
    gift:   { icon: 'gift',   color: '#E11D74', bg: '#FCE9F2' },
    ball:   { icon: 'ball',   color: '#574EFA', bg: '#ECEBFF' },
  };
  const m = map[cat] || { icon: 'tag', color: '#7839EE', bg: '#F4F0FF' };
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: m.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon name={m.icon} size={Math.round(size * 0.55)} color={m.color}/>
    </div>
  );
}

// ── Animated screen wrapper ─────────────────────────────────────────────────
// Subtle slide-in on navigation. We use a JS-driven class toggle so the
// animation doesn't depend on CSS-animation `currentTime` (which is paused
// when the document is hidden — e.g. inside a snapshot iframe).
function ScreenTransition({ children, direction = 'forward', screenKey }) {
  const [animClass, setAnimClass] = useState('');
  const prevKey = useRef(null);
  useEffect(() => {
    if (prevKey.current === null) { prevKey.current = screenKey; return; }
    if (prevKey.current === screenKey) return;
    prevKey.current = screenKey;
    const cls = direction === 'forward' ? 'screen-anim-fwd'
              : direction === 'backward' ? 'screen-anim-back'
              : 'screen-anim-fade';
    setAnimClass(cls);
    const t = setTimeout(() => setAnimClass(''), 380);
    return () => clearTimeout(t);
  }, [screenKey, direction]);
  return (
    <div className={animClass} style={{ width: '100%' }}>
      {children}
    </div>
  );
}

// ── Header (back, title, action) ────────────────────────────────────────────
function NavHeader({ title, subtitle, onBack, right, transparent = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: transparent ? 'transparent' : 'var(--surface-1)',
      borderBottom: transparent ? '1px solid transparent' : '1px solid var(--border-1)',
      minHeight: 56,
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          appearance: 'none', width: 36, height: 36, borderRadius: 12,
          border: '1px solid var(--border-1)', background: 'var(--surface-1)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}><Icon name="chevron-left" size={20} color="var(--text-1)"/></button>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 700, fontSize: 17, color: 'var(--text-1)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 500, fontSize: 12, color: 'var(--text-2)' }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ── List Row ────────────────────────────────────────────────────────────────
function ListRow({ left, title, subtitle, right, onClick, divider = true }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: divider ? '1px solid var(--border-1)' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background .15s ease',
    }}
    onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--surface-2)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
    >
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 600, fontSize: 15, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--vb-font-body)', fontWeight: 500, fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ icon = 'sparkle', title, subtitle, action }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
        background: 'var(--brand-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={32} color="var(--brand-1)"/>
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-1)', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{subtitle}</div>}
      {action}
    </div>
  );
}

// HScroll — horizontal scroll container with right-edge fade gradient
// Visual only — does not block scroll or touch events
function HScroll({ children, style, gap = 8, pb = 4 }) {
  return (
    <div style={{
      overflowX: 'auto',
      display: 'flex',
      gap,
      paddingBottom: pb,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
      WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
      maskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function iconBtnStyle() {
  return {
    appearance: 'none', position: 'relative',
    width: 40, height: 40, borderRadius: 12,
    border: '1px solid var(--border-1)', background: 'var(--surface-1)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  }
}

function StatusBadge({ status, declineReason }) {
  const config = {
    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '⏳', label: 'Chờ duyệt' },
    approved: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅', label: 'Đã duyệt' },
    declined: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: '❌', label: 'Bị từ chối' },
  }
  const c = config[status] || config.pending
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 600,
        color: c.color, background: c.bg,
        padding: '2px 8px', borderRadius: 99,
      }}>
        {c.icon} {c.label}
      </span>
      {status === 'declined' && declineReason && (
        <span style={{ fontSize: 11, color: 'var(--text-2)', paddingLeft: 4 }}>
          {declineReason}
        </span>
      )}
    </div>
  )
}

function DisputePopup({ expenseId, onClose }) {
  const { dispatch } = useApp()
  const [note, setNote] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const submit = async () => {
    const trimmed = note.trim()
    if (!trimmed) return
    setSending(true)
    await dispatch({ type: 'SUBMIT_DISPUTE', expenseId, note: trimmed })
    setSending(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 36px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-1)', marginBottom: 4 }}>
          Báo sai sót
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
          Mô tả sai sót để thủ quỹ kiểm tra lại
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ví dụ: Số tiền sai, tôi không tham gia buổi này..."
          style={{
            width: '100%', minHeight: 88,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 12,
            color: 'var(--text-1)',
            fontSize: 14, padding: '10px 12px',
            resize: 'none', boxSizing: 'border-box',
            fontFamily: 'var(--vb-font-body)',
          }}
        />
        <Button
          variant="primary"
          style={{ width: '100%', marginTop: 12 }}
          onClick={submit}
          disabled={sending || !note.trim()}
        >
          {sending ? 'Đang gửi...' : 'Gửi báo cáo'}
        </Button>
      </div>
    </div>
  )
}

export {
  Icon, Avatar, AvatarStack, Money, Button, Card, Pill, SectionHeader,
  CategoryIcon, ScreenTransition, NavHeader, ListRow, EmptyState, HScroll,
  iconBtnStyle, StatusBadge, DisputePopup,
}
