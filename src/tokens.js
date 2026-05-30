// Spliteasy Boss — design tokens
// All values hardcoded per spec — no CSS variables.
// Drop into src/tokens.js and import: `import { colors, type } from './tokens'`

export const colors = {
  // Surfaces
  pageBg:        '#07080f',
  shellBg:       '#0c0e18',
  cardSurface:   'rgba(255,255,255,0.07)',
  cardElevated:  'rgba(255,255,255,0.06)',
  inputBg:       'rgba(255,255,255,0.05)',

  // Text
  textPrimary:   '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted:     '#475569',
  textHint:      '#334155',

  // Brand (indigo)
  brand:         '#6366f1',
  brandLight:    '#818cf8',
  brandSoftBg:   'rgba(99,102,241,0.12)',
  brandGlow:     'rgba(99,102,241,0.4)',

  // Accents per tab
  pickleball:    '#34d399', // emerald
  groups:        '#f59e0b', // amber
  profile:       '#a78bfa', // violet

  // States
  success:       '#34d399',
  successSoft:   'rgba(52,211,153,0.12)',
  danger:        '#f87171',
  dangerSoft:    'rgba(248,113,113,0.12)',
  warning:       '#fbbf24',
  warningSoft:   'rgba(251,191,36,0.12)',

  // Borders
  borderSubtle:  'rgba(255,255,255,0.06)',
  borderNormal:  'rgba(255,255,255,0.10)',
  borderStrong:  'rgba(255,255,255,0.18)',

  // Gradients (use as background:)
  heroIndigo:    'linear-gradient(145deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
  heroEmerald:   'linear-gradient(145deg, #052e26 0%, #064e3b 40%, #065f46 100%)',
  heroAmber:     'linear-gradient(145deg, #1a1410 0%, #3a2410 40%, #7c3a07 100%)',
  heroViolet:    'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
  brandGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
};

export const type = {
  family: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  // Sizes / weights
  amountLg:  { fontSize: 34, fontWeight: 900, letterSpacing: '-1px' },
  amountMd:  { fontSize: 28, fontWeight: 900, letterSpacing: '-1px' },
  amountSm:  { fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' },
  title:     { fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' },
  heading:   { fontSize: 13, fontWeight: 700 },
  body:      { fontSize: 12, fontWeight: 500, color: '#94a3b8' },
  // Tiny uppercase label
  label:     { fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
               letterSpacing: '1.2px', color: '#475569' },
  mono:      { fontVariantNumeric: 'tabular-nums' },
};

export const radius = {
  card:   16,
  inner:  10,
  hero:   16,
  pill:   100,
  phone:  38,
};

export const spacing = { page: 16, gap: 10, gapSm: 8 };

// Helper: format VND
export const formatVND = (n) => {
  const v = Math.abs(n).toLocaleString('vi-VN');
  return (n < 0 ? '−' : '') + v + ' đ';
};
// Short form: 240k / 1.2M
export const formatVNDShort = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(abs % 1_000_000 ? 1 : 0) + 'M';
  if (abs >= 1_000)     return sign + Math.round(abs / 1_000) + 'k';
  return sign + abs;
};
