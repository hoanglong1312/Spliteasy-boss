// Spliteasy Boss — Cài đặt tài khoản
// Props: data { banks[], pinEnabled, language, version, accountHolder }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Button, Badge,
} from '../primitives';

export default function Settings({ data, onAction }) {
  const d = data || DEMO;
  const [pinSet, setPinSet] = useState(d.pinEnabled);
  const primaryBank = d.banks.find((b) => b.primary) || d.banks[0];
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState(primaryBank?.name || '');
  const [bankAccount, setBankAccount] = useState(primaryBank?.accountRaw || primaryBank?.accountMasked || '');
  const [bankOwner, setBankOwner] = useState(d.accountHolder || '');

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 800 }}>Cài đặt</div>
          <div style={{ width: 38 }} />
        </div>

        {/* Bank info */}
        <SectionLabel>Thông tin ngân hàng</SectionLabel>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: primaryBank.brandColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: 'white', letterSpacing: '0.3px',
            }}>{primaryBank.code}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{primaryBank.name}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, ...type.mono }}>
                {primaryBank.accountMasked}
              </div>
            </div>
            {primaryBank.primary && <Badge tone="success">Mặc định</Badge>}
          </div>
          <div style={{ height: 1, background: colors.borderSubtle, margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10 }}>
            <span style={{ color: colors.textSecondary }}>Chủ tài khoản</span>
            <span style={{ fontWeight: 700 }}>{d.accountHolder}</span>
          </div>
          {editingBank ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <BankInput label="Tên ngân hàng" value={bankName} onChange={setBankName} placeholder="Vietcombank" />
              <BankInput label="Số tài khoản" value={bankAccount} onChange={setBankAccount} placeholder="1027 8438 1234" />
              <BankInput label="Chủ tài khoản" value={bankOwner} onChange={setBankOwner} placeholder="NGUYEN VAN A" />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button variant="ghost" style={{ flex: 1, padding: 10, fontSize: 12 }} onClick={() => setEditingBank(false)}>Huỷ</Button>
                <Button variant="brand" style={{ flex: 1, padding: 10, fontSize: 12 }} onClick={() => {
                  onAction?.('saveBank', { bankName, bankAccount, bankAccountName: bankOwner });
                  setEditingBank(false);
                }}>Lưu</Button>
              </div>
            </div>
          ) : (
            <Button block variant="ghost" style={{ padding: 10, fontSize: 12 }}
              onClick={() => setEditingBank(true)}>
              ✏️ Sửa thông tin
            </Button>
          )}
        </Card>

        {/* Add second bank */}
        <button onClick={() => onAction?.('addBank')} style={{
          width: '100%', marginTop: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 14px',
          border: '1px dashed rgba(99,102,241,0.4)',
          background: 'transparent', borderRadius: 12,
          color: colors.brandLight, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.3px', fontFamily: 'inherit', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 14 }}>+</span> Thêm ngân hàng khác
        </button>

        {/* Security */}
        <SectionLabel>Bảo mật</SectionLabel>
        <Card style={{ padding: '6px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(52,211,153,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
            }}>🔒</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>PIN ứng dụng</div>
              <div style={{ fontSize: 11, color: pinSet ? '#6ee7b7' : colors.textSecondary, marginTop: 2 }}>
                {pinSet ? '● ● ● ● ● ●  Đang bật' : 'Chưa đặt · Chạm để thiết lập'}
              </div>
            </div>
            {pinSet ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onAction?.('changePin')} style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#c7d2fe', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>Đổi</button>
                <button onClick={() => { onAction?.('removePin'); setPinSet(false); }} style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#fca5a5', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>Xoá</button>
              </div>
            ) : (
              <button onClick={() => { onAction?.('setPin'); setPinSet(true); }} style={{
                padding: '5px 12px', borderRadius: 8,
                background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                color: '#6ee7b7', fontSize: 11, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Đặt ngay</button>
            )}
          </div>
        </Card>

        {/* App */}
        <SectionLabel>Ứng dụng</SectionLabel>
        <Card style={{ padding: '6px 16px' }}>
          <SettingRow
            icon="🇻🇳" iconBg="rgba(255,255,255,0.05)" title="Ngôn ngữ"
            right={<span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>{d.language}</span>}
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
            right={
              <span style={{
                fontSize: 11, fontWeight: 700, color: colors.textMuted,
                letterSpacing: '0.3px', fontVariantNumeric: 'tabular-nums',
              }}>{d.version}</span>
            }
          />
        </Card>

        {/* Danger zone */}
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1.2px', color: '#fca5a5',
          margin: '22px 0 10px',
        }}>Khu vực nguy hiểm</div>
        <Button block variant="danger" style={{ fontSize: 13 }} onClick={() => onAction?.('logout')}>
          🚪 Đăng xuất
        </Button>
        <button onClick={() => onAction?.('deleteAccount')} style={{
          width: '100%', marginTop: 8,
          background: 'transparent', color: colors.textMuted,
          border: '1px solid rgba(248,113,113,0.15)',
          fontSize: 11, fontWeight: 600,
          padding: 11, borderRadius: 14,
          fontFamily: 'inherit', cursor: 'pointer',
        }}>🗑 Xóa tài khoản vĩnh viễn</button>

        <div style={{
          textAlign: 'center', fontSize: 10, color: colors.textHint,
          marginTop: 14, letterSpacing: '0.3px', lineHeight: 1.5,
        }}>
          Spliteasy Boss · Made in Vietnam 🇻🇳<br />
          <span style={{ color: colors.textMuted, textDecoration: 'underline' }}>Điều khoản</span>
          {' · '}
          <span style={{ color: colors.textMuted, textDecoration: 'underline' }}>Quyền riêng tư</span>
        </div>
      </Screen>
    </PhoneFrame>
  );
}

function BankInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: colors.textSecondary, marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
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

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '1.2px', color: colors.textMuted,
      margin: '22px 0 10px',
    }}>{children}</div>
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

const DEMO = {
  accountHolder: 'NGUYEN HOANG LONG',
  banks: [
    { code: 'VCB', name: 'Vietcombank', accountMasked: '1027 8438 ••••',
      brandColor: 'linear-gradient(135deg,#0066b3,#003a70)', primary: true },
  ],
  pinEnabled: true,
  language: 'Tiếng Việt',
  version: 'v2.4.1',
};
