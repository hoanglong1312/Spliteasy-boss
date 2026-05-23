// Spliteasy Boss — Tạo nhóm mới
// Props: data { name, emoji, description, requiresApproval, emojiOptions[] }

import React, { useState } from 'react';
import { colors, type, radius } from '../tokens';
import { PhoneFrame, Screen, IconButton, Card, Button, Badge, ModuleHero, MemberPicker, SectionHeader, SearchInput } from '../primitives';

const DEFAULT_EMOJIS = [
  '🏓','⚽','🏀','🎾','🏸','🏐',
  '🍜','☕','🍺','🎮','🎵','🏖',
  '💼','🏠','📚','🎂','🌿','🎁',
];

export default function NewGroup({ data, onAction }) {
  const d = data || DEMO;
  const [name, setName] = useState(d.name);
  const [emoji, setEmoji] = useState(d.emoji);
  const [description, setDescription] = useState(d.description);
  const [requiresApproval, setRequiresApproval] = useState(d.requiresApproval);
  const [selectedProfileIds, setSelectedProfileIds] = useState([]);
  const [profileQuery, setProfileQuery] = useState('');
  const profileOptions = d.profileOptions || [];
  const filteredProfileOptions = profileOptions.filter(profile => {
    const query = normalizeSearch(profileQuery);
    if (!query) return true;
    return normalizeSearch(`${profile.name} ${profile.bankName} ${profile.bankAccount}`).includes(query);
  });
  const pickerListConstraint = { maxHeight: 360 };

  function toggleProfile(profileId) {
    setSelectedProfileIds(current => (
      current.includes(profileId)
        ? current.filter(id => id !== profileId)
        : [...current, profileId]
    ));
  }

  function createPayload() {
    return { name, emoji, description, requiresApproval, profileIds: selectedProfileIds };
  }

  return (
    <PhoneFrame>
      <Screen>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 0 14px',
        }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>Tạo nhóm mới</div>
          <button onClick={() => onAction?.('create', createPayload())} style={{
            background: 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#c7d2fe', fontSize: 12, fontWeight: 700,
            padding: '8px 14px', borderRadius: 10,
            fontFamily: 'inherit', letterSpacing: '0.3px', cursor: 'pointer',
          }}>Tạo</button>
        </div>

        <ModuleHero
          tone="groups"
          eyebrow="TẠO NHÓM CHI TIÊU"
          title={name || 'Tên nhóm mới'}
          subtitle={description || 'Mô tả ngắn'}
          action={<div style={{ fontSize: 26 }}>{emoji}</div>}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>{emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>{name || 'Tên nhóm mới'}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>{description || 'Mô tả ngắn'}</div>
              {requiresApproval && (
                <Badge tone="brand" style={{ marginTop: 6 }}>🔒 Cần duyệt</Badge>
              )}
            </div>
          </div>
        </ModuleHero>

        {/* Name */}
        <Label>Tên nhóm *</Label>
        <div style={{ position: 'relative' }}>
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%', padding: '14px', paddingRight: 50,
              background: colors.inputBg,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 12, color: colors.textPrimary,
              fontSize: 15, fontWeight: 700,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <span style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: colors.textMuted, ...type.mono,
          }}>{name.length}/40</span>
        </div>

        {/* Emoji picker */}
        <Label>Chọn biểu tượng</Label>
        <Card style={{ padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {(d.emojiOptions || DEFAULT_EMOJIS).map((em) => {
              const active = em === emoji;
              return (
                <button key={em} onClick={() => setEmoji(em)} style={{
                  aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10,
                  background: active ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.04)',
                  border: active ? `2px solid ${colors.pickleball}` : `1px solid ${colors.borderSubtle}`,
                  fontSize: 22, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: active ? '0 0 12px rgba(52,211,153,0.2)' : 'none',
                }}>{em}</button>
              );
            })}
          </div>
        </Card>

        {/* Description */}
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1.2px', color: colors.textSecondary,
          margin: '14px 0 6px',
        }}>
          Mô tả ngắn{' '}
          <span style={{
            textTransform: 'none', letterSpacing: 0, color: colors.textMuted,
            fontWeight: 600, fontSize: 10,
          }}>(không bắt buộc)</span>
        </div>
        <input
          value={description}
          placeholder="VD: Nhóm pickleball thứ 2-4-6"
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: '100%', padding: '14px',
            background: colors.inputBg,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 12, color: colors.textPrimary,
            fontSize: 14, fontWeight: 500,
            fontFamily: 'inherit', outline: 'none',
          }}
        />

        {profileOptions.length > 0 && (
          <>
            <SectionHeader>Thêm thành viên có sẵn</SectionHeader>
            <MemberPicker
              candidates={profileOptions}
              selectedIds={selectedProfileIds}
              query={profileQuery}
              onQueryChange={setProfileQuery}
              onToggle={toggleProfile}
              placeholder="Tìm vài ký tự để lọc thành viên"
              emptyText="Không có thành viên phù hợp."
              tone="groups"
              maxListHeight={pickerListConstraint.maxHeight}
            />
          </>
        )}

        {/* Approval toggle */}
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: colors.cardSurface,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: colors.brandSoftBg,
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Yêu cầu duyệt khi tham gia</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
              Thủ quỹ phê duyệt từng thành viên mới
            </div>
          </div>
          <Toggle on={requiresApproval} onChange={setRequiresApproval} />
        </div>

        {/* Treasurer note */}
        <div style={{
          marginTop: 12, padding: '12px 14px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12,
          display: 'flex', gap: 10,
        }}>
          <span style={{ fontSize: 14 }}>👑</span>
          <div style={{ fontSize: 11, color: '#fcd34d', fontWeight: 500, lineHeight: 1.5 }}>
            Bạn sẽ là <strong>thủ quỹ</strong> của nhóm — toàn quyền thêm chi tiêu,
            duyệt thành viên, chốt sổ.
          </div>
        </div>

        <Button block variant="brand" style={{ marginTop: 18 }} onClick={() => onAction?.('create', createPayload())}>
          Tạo nhóm
        </Button>
      </Screen>
    </PhoneFrame>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '1.2px', color: colors.textMuted,
      margin: '14px 0 6px',
    }}>{children}</div>
  );
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLowerCase();
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

const DEMO = {
  name: 'Pickleball T2-4-6',
  emoji: '🏓',
  description: 'Nhóm chơi cố định lịch tuần',
  requiresApproval: true,
  emojiOptions: DEFAULT_EMOJIS,
};
