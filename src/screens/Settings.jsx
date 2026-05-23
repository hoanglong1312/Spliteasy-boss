// Spliteasy Boss — Cài đặt tài khoản
// Props: data { banks[], pinEnabled, language, version, accountHolder }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Button, Badge,
} from '../primitives';

export default function Settings({ data, onAction }) {
  const d = data || DEMO;
  const [pinSet, setPinSet] = useState(() => !!localStorage.getItem('spliteasy_pin'));
  const [pinSetupMode, setPinSetupMode] = useState(null);
  const [pinInputValue, setPinInputValue] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');
  const primaryBank = d.banks.find((b) => b.primary) || d.banks[0];
  const profileSync = d.profileSync;
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState(primaryBank?.name || '');
  const [bankAccount, setBankAccount] = useState(primaryBank?.accountRaw || primaryBank?.account || primaryBank?.accountMasked || '');
  const [bankOwner, setBankOwner] = useState(d.accountHolder || '');

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
    const stored = localStorage.getItem('spliteasy_pin');
    if (pinSetupMode === 'set') {
      if (pinInputValue.length < 6) { setPinSetupError('Nhập đủ 6 số.'); return; }
      localStorage.setItem('spliteasy_pin', pinInputValue);
      setPinSet(true);
      cancelPinSetup();
      onAction?.('setPin');
    } else if (pinSetupMode === 'remove') {
      if (pinInputValue !== stored) { setPinSetupError('PIN không đúng.'); return; }
      localStorage.removeItem('spliteasy_pin');
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
      localStorage.setItem('spliteasy_pin', pinInputValue);
      setPinSet(true);
      cancelPinSetup();
      onAction?.('setPin');
    }
  }

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

        <ProfileSyncSection profileSync={profileSync} onAction={onAction} />

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
                <button onClick={() => startPinSetup('change-old')} style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#c7d2fe', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>Đổi</button>
                <button onClick={() => startPinSetup('remove')} style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#fca5a5', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>Xoá</button>
              </div>
            ) : (
              <button onClick={() => startPinSetup('set')} style={{
                padding: '5px 12px', borderRadius: 8,
                background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                color: '#6ee7b7', fontSize: 11, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Đặt ngay</button>
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
              autoFocus
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
              <Button variant="ghost" style={{ flex: 1, padding: 10, fontSize: 12 }}
                onClick={cancelPinSetup}>
                Huỷ
              </Button>
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

function ProfileSyncSection({ profileSync, onAction }) {
  if (!profileSync) return null;
  return (
    <>
      <SectionLabel>Danh bạ liên thông</SectionLabel>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'rgba(99,102,241,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 900,
            color: colors.brandLight,
          }}>{initialsFromName(profileSync.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{profileSync.name}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
              {profileSync.bankName || 'Chưa có ngân hàng'} · {profileSync.bankAccount || 'Chưa có STK'}
            </div>
          </div>
          <Badge tone="success">{profileSync.linkedMemberships.length} nhóm</Badge>
        </div>

        <div style={{ height: 1, background: colors.borderSubtle, margin: '14px 0 8px' }} />
        {profileSync.linkedMemberships.map(member => (
          <ProfileMembershipRow
            key={member.memberId}
            member={member}
            actionLabel="Tách"
            actionTone="danger"
            onClick={() => onAction?.('unlinkProfile', { memberId: member.memberId })}
          />
        ))}
      </Card>

      {profileSync.candidates.length > 0 && (
        <Card style={{ padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: colors.textSecondary, marginBottom: 6 }}>
            Có thể gộp vào danh bạ này
          </div>
          {profileSync.candidates.map(member => (
            <ProfileMembershipRow
              key={member.memberId}
              member={member}
              actionLabel="Gộp"
              actionTone="brand"
              onClick={() => onAction?.('linkProfile', { memberId: member.memberId, profileId: profileSync.profileId })}
            />
          ))}
        </Card>
      )}
    </>
  );
}

function ProfileMembershipRow({ member, actionLabel, actionTone, onClick }) {
  const isDanger = actionTone === 'danger';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 0',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 800,
        flexShrink: 0,
      }}>{member.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{member.name}</div>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
          {member.groupEmoji} {member.groupName} · {member.role === 'treasurer' ? 'Thủ quỹ' : 'Thành viên'}
        </div>
      </div>
      <button type="button" onClick={onClick} style={{
        padding: '6px 10px',
        borderRadius: 8,
        background: isDanger ? 'rgba(248,113,113,0.1)' : 'rgba(99,102,241,0.15)',
        border: `1px solid ${isDanger ? 'rgba(248,113,113,0.25)' : 'rgba(99,102,241,0.3)'}`,
        color: isDanger ? '#fca5a5' : colors.brandLight,
        fontSize: 11,
        fontWeight: 800,
        fontFamily: 'inherit',
        cursor: 'pointer',
        flexShrink: 0,
      }}>{actionLabel}</button>
    </div>
  );
}

function initialsFromName(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
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
