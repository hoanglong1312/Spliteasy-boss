// Spliteasy Boss — Tham gia nhóm (bước 2/2)
// Props: data { code, group, existingNames[], selectedName }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button, Avatar, AvatarStack, SectionLabel } from '../primitives';

export default function JoinGroup({ data, onAction }) {
  const d = data || DEMO;
  const [code, setCode] = useState(d.code || '');
  const [selected, setSelected] = useState(d.selectedName);
  const [newName, setNewName] = useState('');
  const memberName = (newName || selected || '').trim();

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase',
            }}>Bước 2 / 2</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Tham gia nhóm</div>
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 100, background: colors.pickleball }} />
          <div style={{
            flex: 1, height: 4, borderRadius: 100, background: colors.brand,
            boxShadow: '0 0 8px rgba(99,102,241,0.4)',
          }} />
        </div>

        {/* Invite code */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 12, marginBottom: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(52,211,153,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🔗</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 9, color: '#6ee7b7', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>Mã mời</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NHẬP-MÃ-MỜI"
              style={{
                width: '100%',
                marginTop: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.5px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>
          <button onClick={() => setCode('')} style={{
            background: 'none', border: 'none',
            fontSize: 11, color: colors.brandLight, fontWeight: 700,
            letterSpacing: '0.3px', cursor: 'pointer', fontFamily: 'inherit',
          }}>XÓA</button>
        </div>

        {/* Group preview card */}
        <Card accent="pickleball" style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>{d.group.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>{d.group.name}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                Thủ quỹ: {d.group.treasurer} · Lập {d.group.foundedLabel}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, padding: '3px 9px', borderRadius: 100,
                background: 'rgba(52,211,153,0.12)',
                color: '#6ee7b7', fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
              }}>● {d.group.activeCount} đang hoạt động</div>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 14, paddingTop: 14,
            borderTop: `1px solid ${colors.borderSubtle}`,
          }}>
            <AvatarStack people={d.group.memberAvatars} extra={d.group.extraMembers} />
            <span style={{ fontSize: 11, color: colors.textSecondary }}>
              {d.group.memberCount} thành viên
            </span>
          </div>
        </Card>

        {/* Identity selection */}
        <SectionLabel>Bạn là ai?</SectionLabel>
        <div style={{ fontSize: 11, color: colors.textSecondary, margin: '-4px 0 12px', lineHeight: 1.5 }}>
          Chọn tên đã có trong nhóm nếu thủ quỹ đã thêm bạn, hoặc nhập tên mới.
        </div>

        <Card style={{ padding: 14 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '1px',
            color: colors.textSecondary, textTransform: 'uppercase',
            marginBottom: 10,
          }}>Tên có sẵn trong nhóm</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.existingNames.map((name) => {
              const active = name === selected;
              return (
                <button key={name} onClick={() => { setSelected(name); setNewName(''); }} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px 7px 6px', borderRadius: 100,
                  background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Avatar initial="?" size={22} color="rgba(255,255,255,0.08)" ring={false} style={{
                    color: active ? '#c7d2fe' : colors.textSecondary, fontWeight: 700,
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: active ? 700 : 600,
                    color: active ? '#c7d2fe' : colors.textSecondary,
                  }}>{name}{active ? ' ✓' : ''}</span>
                </button>
              );
            })}
          </div>

          <div style={{ height: 1, background: colors.borderSubtle, margin: '14px 0' }} />

          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '1px',
            color: colors.textSecondary, textTransform: 'uppercase',
            marginBottom: 8,
          }}>Hoặc nhập tên mới</div>
          <input
            value={newName}
            placeholder="VD: Phương Anh"
            onChange={(e) => { setNewName(e.target.value); if (e.target.value) setSelected(null); }}
            style={{
              width: '100%', padding: '11px 14px',
              background: colors.inputBg,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 12, color: colors.textPrimary,
              fontSize: 13, fontWeight: 500,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </Card>

        <Button block variant="brand" style={{ marginTop: 18 }}
          onClick={() => {
            if (!code.trim() || !memberName) return;
            onAction?.('joinGroup', { code: code.trim(), memberName });
          }}>
          Tham gia →
        </Button>

        {/* Pending hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
          marginTop: 14, padding: 12, borderRadius: 12,
          background: 'rgba(251,191,36,0.08)',
          border: '1px dashed rgba(251,191,36,0.3)',
        }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ fontSize: 11, color: '#fcd34d', fontWeight: 600 }}>
            Sau khi gửi, chờ thủ quỹ duyệt (~vài phút)
          </span>
        </div>
      </Screen>
    </PhoneFrame>
  );
}

const DEMO = {
  code: 'CLB-CG-2026',
  group: {
    emoji: '🏓',
    name: 'CLB Pickleball Cầu Giấy',
    treasurer: 'Long Nguyễn',
    foundedLabel: '02/2025',
    activeCount: 12,
    memberCount: 12,
    memberAvatars: ['L', 'M', 'H', 'T', 'N', 'Li'],
    extraMembers: 6,
  },
  existingNames: ['Phương Anh', 'Quang', 'Trang'],
  selectedName: 'Phương Anh',
};
