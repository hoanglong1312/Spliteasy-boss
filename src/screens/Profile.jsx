// Spliteasy Boss — Profile / Cá nhân
// Props: data { user, monthStats, bank, pin }, isTreasurer

import React, { useEffect, useRef, useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Button, Badge,
  SectionLabel,
} from '../primitives';

export default function Profile({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const fileInputRef = useRef(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(d.user.photoUrl || '');

  useEffect(() => {
    setCurrentPhotoUrl(d.user.photoUrl || '');
  }, [d.user.id, d.user.photoUrl]);

  function handlePhotoFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const photoUrl = String(reader.result || '');
      if (!photoUrl) return;
      setCurrentPhotoUrl(photoUrl);
      onAction?.('uploadPhoto', { memberId: d.user.id, profileId: d.user.profileId, photoUrl });
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setCurrentPhotoUrl('');
    onAction?.('clearPhoto', { memberId: d.user.id, profileId: d.user.profileId });
  }

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <h1 style={type.title}>Cá nhân</h1>
          <IconButton onClick={() => onAction?.('settings')}>⚙️</IconButton>
        </div>

        {/* Avatar hero */}
        <Hero variant="violet" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: currentPhotoUrl ? colors.shellBg : d.user.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              fontSize: 36, fontWeight: 900, color: 'white',
              border: '4px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
            }}>
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={d.user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : d.user.initial}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoFile}
              style={{ display: 'none' }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: colors.shellBg, border: '2px solid #1e1b4b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, cursor: 'pointer',
            }}>📷</button>
          </div>
          {currentPhotoUrl && (
            <button type="button" onClick={clearPhoto} style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
              padding: '7px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(7,8,15,0.26)',
              color: '#e2e8f0',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}>Xóa ảnh</button>
          )}
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14, letterSpacing: '-0.3px' }}>{d.user.name}</div>
          <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 500 }}>{d.user.email}</div>
          {isTreasurer && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
              padding: '5px 12px', borderRadius: 100,
              background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
              fontSize: 10, fontWeight: 700, color: '#fcd34d', letterSpacing: '0.5px',
            }}>
              👑 THỦ QUỸ · CLB {d.user.club}
            </div>
          )}
        </Hero>

        {/* Bank */}
        <SectionLabel action="Sửa →" onAction={() => onAction?.('settings')}>Thông tin ngân hàng</SectionLabel>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #0066b3, #003a70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: 'white', letterSpacing: '0.3px',
            }}>{d.bank.code}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.bank.name}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, ...type.mono }}>{d.bank.maskedAccount}</div>
            </div>
            <Badge tone="success">✓ Mặc định</Badge>
          </div>
          <div style={{ height: 1, background: colors.borderSubtle, margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: colors.textSecondary }}>Chủ tài khoản</span>
            <span style={{ fontWeight: 700 }}>{d.bank.owner}</span>
          </div>
        </Card>

        {/* PIN */}
        <Card style={{ marginTop: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => onAction?.('settings')}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>PIN bảo mật</div>
            <div style={{ fontSize: 10, color: '#6ee7b7', marginTop: 2, fontWeight: 600 }}>
              {d.pin ? '● ● ● ● đã đặt' : 'Chưa đặt'}
            </div>
          </div>
          <span style={{ fontSize: 10, color: colors.brandLight, fontWeight: 700, letterSpacing: '0.5px' }}>ĐỔI · XOÁ</span>
        </Card>

        <Button block variant="danger" style={{ marginTop: 16 }} onClick={() => onAction?.('logout')}>Đăng xuất</Button>
        <div style={{
          textAlign: 'center', fontSize: 10, color: colors.textHint, marginTop: 14, letterSpacing: '0.3px',
        }}>Spliteasy Boss v2.4.1</div>
      </Screen>

      <TabBar active="profile" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

const DEMO = {
  user: {
    id: 'demo',
    name: 'Long Nguyễn',
    email: 'long.nguyen@gmail.com',
    initial: 'L',
    club: 'Cầu Giấy',
    color: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    photoUrl: '',
  },
  monthStats: {
    label: 'Tháng 5 · 2026',
    sessions: { attended: 8, total: 13, deltaLabel: '+2 so với tháng 4' },
    balance: -333333, balanceLabel: 'Còn nợ 4 người',
  },
  bank: {
    name: 'Vietcombank', code: 'VCB',
    maskedAccount: '1027 8438 ••••',
    owner: 'NGUYEN HOANG LONG',
  },
  pin: true,
};
