// Spliteasy Boss — Payment flow (step 2/3: review + QR)
// Props: data { recipient, amount, breakdown[], bank }, step, onAction

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Hero, Card, Button, Avatar,
  SectionLabel, Row, LoadingSpinner, loadingOverlayStyle,
} from '../primitives';
import { generateQRUrl } from '../lib/vietqr.js';

export default function PaymentFlow({ data, step = 2, totalSteps = 3, onAction }) {
  const [saving, setSaving] = useState(false);
  const d = data || DEMO;
  const qrUrl = generateQRUrl({
    bankId: d.bank.code,
    account: d.bank.account,
    accountName: d.recipient.name,
    amount: d.amount,
    description: `Spliteasy ${d.recipient.name}`,
  });

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textMuted, textTransform: 'uppercase' }}>
              Thanh toán
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Bước {step} / {totalSteps}</div>
          </div>
          <IconButton onClick={() => onAction?.('help')}>?</IconButton>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const idx = i + 1;
            const done = idx < step;
            const active = idx === step;
            return (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 100,
                background: done ? colors.success : active ? colors.brand : 'rgba(255,255,255,0.08)',
                boxShadow: active ? `0 0 8px ${colors.brandGlow}` : 'none',
              }} />
            );
          })}
        </div>

        {/* Recipient */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textMuted,
          textTransform: 'uppercase', marginBottom: 8,
        }}>Bạn đang trả cho</div>
        <Card style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Avatar initial={d.recipient.initial} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{d.recipient.name}</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{d.recipient.context}</div>
          </div>
          <span style={{ fontSize: 11, color: colors.brandLight, fontWeight: 700, cursor: 'pointer' }} onClick={() => onAction?.('changeRecipient')}>ĐỔI</span>
        </Card>

        {/* Amount hero */}
        <Hero variant="emerald" style={{ marginTop: 10, padding: '22px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#6ee7b7' }}>
            SỐ TIỀN CHUYỂN
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1.5px', marginTop: 4, ...type.mono }}>
            {formatVND(d.amount)}
          </div>
          <div style={{
            display: 'inline-flex', gap: 6, marginTop: 8,
            padding: '5px 12px', borderRadius: 100,
            background: 'rgba(0,0,0,0.25)',
            fontSize: 10, fontWeight: 700, color: '#a7f3d0',
            letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer',
          }} onClick={() => onAction?.('toggleBreakdown')}>
            Gồm {d.breakdown.length} khoản · Xem chi tiết
          </div>
        </Hero>

        {/* Breakdown */}
        <Card style={{ marginTop: 10, padding: '6px 14px' }}>
          {d.breakdown.map((b, i) => (
            <Row key={i}
              icon={b.icon} iconBg={b.iconBg}
              title={b.title} sub={b.sub}
              amount={formatVND(b.amount)}
              last={i === d.breakdown.length - 1}
            />
          ))}
        </Card>

        <SectionLabel>Quét VietQR</SectionLabel>
        <VietQRCard bank={d.bank} qrUrl={qrUrl} />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="muted" style={{ flex: 1, fontSize: 12 }} onClick={() => onAction?.('copyAccount', d.bank.account)}>📋 Copy STK</Button>
          <Button variant="muted" style={{ flex: 1, fontSize: 12 }} onClick={() => onAction?.('shareQR')}>🔗 Chia sẻ QR</Button>
        </div>
        <Button block variant="success" style={{ marginTop: 8, fontSize: 13 }} disabled={saving}
          onClick={async () => { setSaving(true); try { await onAction?.('confirm') } finally { setSaving(false) } }}>
          ✓ Tôi đã chuyển khoản
        </Button>
      </Screen>
      {saving && <div role="status" aria-live="polite" style={loadingOverlayStyle}><LoadingSpinner /><div style={{ fontWeight: 800, color: '#f1f5f9' }}>Đang xử lý…</div></div>}
    </PhoneFrame>
  );
}

function VietQRCard({ bank, qrUrl }) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 16, padding: 18, textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #0066b3, #003a70)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900, color: 'white',
          }}>{bank.code}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>{bank.name}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, ...type.mono }}>{bank.account}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#1e1b4b', fontWeight: 800, letterSpacing: '0.5px' }}>VIETQR</div>
      </div>

      <div style={{ width: 200, height: 200, margin: '0 auto', borderRadius: 14, padding: 8, background: '#f8fafc' }}>
        <img src={qrUrl} style={{ width: '100%', height: '100%', borderRadius: 8 }} alt="QR chuyển khoản" />
      </div>

      <div style={{
        fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '1px', marginTop: 14,
      }}>QUÉT BẰNG APP NGÂN HÀNG</div>
    </div>
  );
}

const DEMO = {
  recipient: { initial: 'M', name: 'Minh Trần', context: 'CLB Cầu Giấy + Ăn trưa T7' },
  amount: 285000,
  breakdown: [
    { icon: '🏸', iconBg: 'rgba(52,211,153,0.12)', title: 'Tiền sân CLB · T5',  sub: 'Quỹ pickleball',      amount: 240000 },
    { icon: '💧', iconBg: 'rgba(99,102,241,0.12)', title: 'Tiền nước · 4 buổi', sub: 'Minh đã ứng',         amount:  48000 },
    { icon: '🍜', iconBg: 'rgba(251,191,36,0.12)', title: 'Bún bò 16/05',        sub: 'Nhóm Ăn trưa T7',     amount:  45000 },
  ],
  bank: { name: 'Vietcombank', code: 'VCB', account: '1027 8438 9942' },
};
