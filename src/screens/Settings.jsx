// Spliteasy Boss — Cài đặt tài khoản
// Props: data { banks[], pinEnabled, faceIdEnabled, language, version, accountHolder }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Button, Badge,
} from '../primitives';

export default function Settings({ data, onAction }) {
  const d = data || DEMO;
  const [pin, setPin] = useState(d.pinEnabled);
  const [faceId, setFaceId] = useState(d.faceIdEnabled);
  const primaryBank = d.banks.find((b) => b.primary) || d.banks[0];

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
          <Button block variant="ghost" style={{ padding: 10, fontSize: 12 }}
            onClick={() => onAction?.('editBank', primaryBank)}>
            ✏️ Sửa thông tin
          </Button>
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
          <SettingRow
            icon="🔒" iconBg="rgba(52,211,153,0.12)"
            title="PIN ứng dụng" sub="Yêu cầu khi mở app · Đã đặt"
            right={<Toggle on={pin} onChange={setPin} />}
          />
          <SettingRow
            icon="🔑" iconBg="rgba(167,139,250,0.12)"
            title="Đổi PIN" sub="Cập nhật mã 6 số"
            onClick={() => onAction?.('changePin')}
            right={<Caret />}
          />
          <SettingRow
            icon="👆" iconBg="rgba(99,102,241,0.12)"
            title="Face ID" sub="Mở khoá bằng khuôn mặt"
            right={<Toggle on={faceId} onChange={setFaceId} />}
          />
        </Card>

        {/* PIN entry preview */}
        {pin && (
          <div style={{
            marginTop: 10, padding: '18px 16px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 14, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 10, color: '#c7d2fe', fontWeight: 700,
              letterSpacing: '0.5px', textTransform: 'uppercase',
              marginBottom: 14,
            }}>Nhập PIN hiện tại</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const filled = i < 4;
                return (
                  <div key={i} style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: filled ? colors.brand : 'transparent',
                    border: filled ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                    boxShadow: filled ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
                  }} />
                );
              })}
            </div>
          </div>
        )}

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

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange?.(!on)} style={{
      width: 42, height: 24, borderRadius: 100,
      background: on ? colors.brand : 'rgba(255,255,255,0.10)',
      position: 'relative', border: 'none',
      boxShadow: on ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
      flexShrink: 0, cursor: 'pointer',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3,
        right: on ? 3 : 'auto', left: on ? 'auto' : 3,
        transition: 'all 0.18s ease',
      }} />
    </button>
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
  faceIdEnabled: false,
  language: 'Tiếng Việt',
  version: 'v2.4.1',
};
