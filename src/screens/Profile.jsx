// Spliteasy Boss — Profile / Cá nhân
// Props: data { user, bank, pin }, isTreasurer

import React, { useEffect, useRef, useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, Hero, Card, Button, Badge,
  SectionLabel,
} from '../primitives';

const BANK_SUGGESTIONS = [
  'Vietcombank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'BIDV',
  'VietinBank',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'PGBank',
];

function memberPinStorageKey(memberId) {
  return `spliteasy_pin_${memberId || 'unknown'}`;
}

export default function Profile({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const fileInputRef = useRef(null);
  const pinKey = memberPinStorageKey(d.user.id);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(d.user.photoUrl || '');
  const [avatarHover, setAvatarHover] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState(d.bank.bankName || d.bank.name || '');
  const [bankAccount, setBankAccount] = useState(d.bank.bankAccount || d.bank.account || '');
  const [bankOwner, setBankOwner] = useState(d.bank.accountName || d.bank.owner || d.user.name || '');
  const [pinSet, setPinSet] = useState(() => !!localStorage.getItem(pinKey));
  const [pinSetupMode, setPinSetupMode] = useState(null);
  const [pinInputValue, setPinInputValue] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');

  useEffect(() => {
    setCurrentPhotoUrl(d.user.photoUrl || '');
  }, [d.user.id, d.user.photoUrl]);

  useEffect(() => {
    setBankName(d.bank.bankName || d.bank.name || '');
    setBankAccount(d.bank.bankAccount || d.bank.account || '');
    setBankOwner(d.bank.accountName || d.bank.owner || d.user.name || '');
  }, [d.bank.bankName, d.bank.name, d.bank.bankAccount, d.bank.account, d.bank.accountName, d.bank.owner, d.user.name]);

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

  function cancelBankEdit() {
    setBankName(d.bank.bankName || d.bank.name || '');
    setBankAccount(d.bank.bankAccount || d.bank.account || '');
    setBankOwner(d.bank.accountName || d.bank.owner || d.user.name || '');
    setEditingBank(false);
  }

  function saveBank() {
    onAction?.('saveBank', { bankName: bankName.trim(), bankAccount: bankAccount.trim(), bankAccountName: bankOwner.trim() });
    setEditingBank(false);
  }

  function startPinSetup(mode) {
    setPinSetupMode(mode);
    setPinInputValue('');
    setPinSetupError('');
  }

  function cancelPinSetup() {
    setPinSetupMode(null);
    setPinInputValue('');
    setPinSetupError('');
  }

  function submitPinSetup() {
    const stored = localStorage.getItem(pinKey);
    if (pinSetupMode === 'set') {
      if (pinInputValue.length < 6) { setPinSetupError('Nhập đủ 6 số.'); return; }
      localStorage.setItem(pinKey, pinInputValue);
      setPinSet(true);
      cancelPinSetup();
      onAction?.('setPin');
    } else if (pinSetupMode === 'remove') {
      if (pinInputValue !== stored) { setPinSetupError('PIN không đúng.'); return; }
      localStorage.removeItem(pinKey);
      setPinSet(false);
      cancelPinSetup();
      onAction?.('removePin');
    } else if (pinSetupMode === 'change-old') {
      if (pinInputValue !== stored) { setPinSetupError('PIN hiện tại không đúng.'); return; }
      setPinSetupMode('change-new');
      setPinInputValue('');
      setPinSetupError('');
    } else if (pinSetupMode === 'change-new') {
      if (pinInputValue.length < 6) { setPinSetupError('Nhập đủ 6 số.'); return; }
      localStorage.setItem(pinKey, pinInputValue);
      setPinSet(true);
      cancelPinSetup();
      onAction?.('setPin');
    }
  }

  return (
    <PhoneFrame>
      <Screen>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 16px' }}>
          <h1 style={type.title}>Cá nhân</h1>
        </div>

        <Hero variant="violet" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <div
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            onFocus={() => setAvatarHover(true)}
            onBlur={() => setAvatarHover(false)}
            style={{ position: 'relative', display: 'inline-block' }}
          >
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
            {currentPhotoUrl && (
              <button
                type="button"
                aria-label="Xóa ảnh đại diện"
                onClick={clearPhoto}
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '1px solid rgba(254,202,202,0.75)',
                  background: 'rgba(127,29,29,0.95)',
                  color: '#fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 900,
                  fontFamily: 'inherit',
                  lineHeight: 1,
                  boxShadow: '0 8px 18px rgba(127,29,29,0.35)',
                  cursor: 'pointer',
                  opacity: avatarHover ? 1 : 0,
                  transform: avatarHover ? 'scale(1)' : 'scale(0.82)',
                  transition: 'opacity 140ms ease, transform 140ms ease',
                  pointerEvents: avatarHover ? 'auto' : 'none',
                }}
              >
                ×
              </button>
            )}
          </div>
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

        <SectionLabel>Thông tin ngân hàng</SectionLabel>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #0066b3, #003a70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: 'white', letterSpacing: '0.3px',
            }}>{d.bank.code || '--'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.bank.name || 'Ngân hàng'}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, minHeight: 14, ...type.mono }}>{d.bank.maskedAccount}</div>
            </div>
            <Badge tone="success">✓ Mặc định</Badge>
          </div>
          <div style={{ height: 1, background: colors.borderSubtle, margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: colors.textSecondary }}>Chủ tài khoản</span>
            <span style={{ fontWeight: 700 }}>{d.bank.owner || d.user.name}</span>
          </div>
          {editingBank ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <BankInput label="Tên ngân hàng" value={bankName} onChange={setBankName} placeholder="Chọn hoặc nhập ngân hàng" list="profile-bank-suggestions" />
              <datalist id="profile-bank-suggestions">
                {BANK_SUGGESTIONS.map(bank => <option key={bank} value={bank} />)}
              </datalist>
              <BankInput label="Số tài khoản" value={bankAccount} onChange={setBankAccount} placeholder="" inputMode="numeric" />
              <BankInput label="Chủ tài khoản" value={bankOwner} onChange={setBankOwner} placeholder="" />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button variant="ghost" style={{ flex: 1, padding: 10, fontSize: 12 }} onClick={cancelBankEdit}>Huỷ</Button>
                <Button variant="brand" style={{ flex: 1, padding: 10, fontSize: 12 }} onClick={saveBank}>Lưu</Button>
              </div>
            </div>
          ) : (
            <Button block variant="ghost" style={{ padding: 10, fontSize: 12, marginTop: 12 }}
              onClick={() => setEditingBank(true)}>
              ✏️ Sửa thông tin
            </Button>
          )}
        </Card>

        <SectionLabel>Bảo mật</SectionLabel>
        <Card style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🔒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>PIN bảo mật</div>
              <div style={{ fontSize: 10, color: '#6ee7b7', marginTop: 2, fontWeight: 600 }}>
                {pinSet ? '● ● ● ● ● ●  Đang bật' : 'Chưa đặt'}
              </div>
            </div>
            {pinSet ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => startPinSetup('change-old')} style={miniActionStyle('brand')}>Đổi</button>
                <button onClick={() => startPinSetup('remove')} style={miniActionStyle('danger')}>Xoá</button>
              </div>
            ) : (
              <button onClick={() => startPinSetup('set')} style={miniActionStyle('success')}>Đặt ngay</button>
            )}
          </div>
        </Card>
        {pinSetupMode && (
          <Card style={{ padding: 16, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#c7d2fe', marginBottom: 12 }}>
              {pinSetupMode === 'set' && 'Nhập mã PIN mới (6 số)'}
              {pinSetupMode === 'change-old' && 'Nhập PIN hiện tại để xác nhận'}
              {pinSetupMode === 'change-new' && 'Nhập PIN mới (6 số)'}
              {pinSetupMode === 'remove' && 'Nhập PIN hiện tại để xoá'}
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInputValue}
              onChange={e => {
                setPinInputValue(e.target.value.replace(/\D/g, '').slice(0, 6));
                setPinSetupError('');
              }}
              placeholder="● ● ● ● ● ●"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', borderRadius: 10, fontSize: 18,
                letterSpacing: '8px', textAlign: 'center',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f1f5f9', fontFamily: 'inherit', outline: 'none',
              }}
            />
            {pinSetupError && (
              <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 8 }}>{pinSetupError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="ghost" style={{ flex: 1, padding: 10, fontSize: 12 }} onClick={cancelPinSetup}>Huỷ</Button>
              <Button variant="brand" style={{
                flex: 1,
                padding: 10,
                fontSize: 12,
                opacity: pinInputValue.length === 6 ? 1 : 0.4,
              }} onClick={submitPinSetup}>
                {pinSetupMode === 'set' || pinSetupMode === 'change-new' ? 'Lưu PIN'
                  : pinSetupMode === 'remove' ? 'Xoá PIN' : 'Tiếp theo →'}
              </Button>
            </div>
          </Card>
        )}

        <SectionLabel>Ứng dụng</SectionLabel>
        <Card style={{ padding: '6px 16px' }}>
          <SettingRow
            icon="🇻🇳" iconBg="rgba(255,255,255,0.05)" title="Ngôn ngữ"
            right={<span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>{d.language || 'vi'}</span>}
            onClick={() => onAction?.('changeLanguage')}
          />
          <SettingRow
            icon="🔔" iconBg="rgba(255,255,255,0.05)"
            title="Thông báo đẩy" sub="Chi tiêu mới, thanh toán, lịch"
            right={<Caret />}
            onClick={() => onAction?.('notifications')}
          />
          <SettingRow
            icon="ℹ️" iconBg="rgba(255,255,255,0.05)"
            title="Phiên bản" sub="Đã cập nhật mới nhất"
            right={<span style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted }}>{d.version || 'v2.4.1'}</span>}
          />
        </Card>

        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1.2px', color: '#fca5a5',
          margin: '22px 0 10px',
        }}>Khu vực nguy hiểm</div>
        <Button block variant="danger" style={{ marginTop: 0 }} onClick={() => onAction?.('logout')}>Đăng xuất</Button>
        <div style={{
          textAlign: 'center', fontSize: 10, color: colors.textHint, marginTop: 14, letterSpacing: '0.3px',
        }}>Spliteasy Boss v2.4.1</div>
      </Screen>

      <TabBar active="profile" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function BankInput({ label, value, onChange, placeholder, inputMode, list }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: colors.textSecondary, marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        list={list}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '10px 12px',
          color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit',
          outline: 'none',
        }}
      />
    </div>
  );
}

function SettingRow({ icon, iconBg, title, sub, right, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Caret() {
  return <span style={{ color: colors.brandLight, fontSize: 18 }}>›</span>;
}

function miniActionStyle(tone) {
  const palette = {
    brand: ['rgba(99,102,241,0.15)', 'rgba(99,102,241,0.3)', '#c7d2fe'],
    danger: ['rgba(248,113,113,0.1)', 'rgba(248,113,113,0.2)', '#fca5a5'],
    success: ['rgba(52,211,153,0.15)', 'rgba(52,211,153,0.3)', '#6ee7b7'],
  }[tone] || ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.16)', '#f1f5f9'];
  return {
    padding: '5px 10px',
    borderRadius: 8,
    background: palette[0],
    border: `1px solid ${palette[1]}`,
    color: palette[2],
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
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
  bank: {
    bankName: 'Vietcombank',
    name: 'Vietcombank',
    code: 'VCB',
    maskedAccount: '1027 8438 ••••',
    bankAccount: '102784381234',
    owner: 'NGUYEN HOANG LONG',
    accountName: 'NGUYEN HOANG LONG',
  },
  pin: true,
  language: 'vi',
  version: 'v2.4.1',
};
