// Spliteasy Boss — Danh sách nhóm
// Props: data { activeCount, archivedCount, filter, groups[], archived[] }

import React, { useState } from 'react';
import { colors, type, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Card, Pill, PillRow, Avatar, Badge,
  SectionHeader, ModuleHero, SearchInput, ListCard,
} from '../primitives';

export default function GroupsList({ data, onAction }) {
  const d = data || DEMO;
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const visibleGroups = normalizedSearch
    ? d.groups.filter(g => `${g.name || ''} ${g.emoji || ''}`.toLowerCase().includes(normalizedSearch))
    : d.groups;
  const visibleArchived = normalizedSearch
    ? d.archived.filter(g => `${g.name || ''} ${g.emoji || ''}`.toLowerCase().includes(normalizedSearch))
    : d.archived;

  return (
    <PhoneFrame>
      <Screen>
        <ModuleHero
          tone="groups"
          eyebrow="QUẢN LÝ NHÓM"
          title="Nhóm"
          subtitle={`${d.activeCount} đang hoạt động · ${d.archivedCount} đã chốt`}
          action={<IconButton style={{ background: colors.brandGradient, borderColor: 'transparent', color: 'white', fontWeight: 700, fontSize: 20 }} onClick={() => onAction?.('newGroup')}>+</IconButton>}
        />

        <SearchInput
          placeholder="Tìm nhóm…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ margin: '14px 0' }}
        />

        <PillRow>
          {d.filters.map(f => (
            <Pill key={f.key} active={f.key === d.activeFilter} onClick={() => onAction?.('filter', f.key)}>
              {f.label}
            </Pill>
          ))}
        </PillRow>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleGroups.map(g => <GroupCard key={g.id} g={g} onClick={() => onAction?.('open', g.id)} />)}

          <SectionHeader>Đã chốt sổ</SectionHeader>
          {visibleArchived.map(g => <ArchivedCard key={g.id} g={g} />)}
        </div>
      </Screen>

      <TabBar active="groups" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function GroupCard({ g, onClick }) {
  const accentMap = { pickleball: 'pickleball', food: 'groups', cafe: 'finance', trip: 'finance' };
  const linked = g.isLinkedPickleballExpenseGroup;
  const isPickleballGroup = g.kind === 'pickleball' || linked;
  const iconBg = {
    pickleball: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    food:       { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
    cafe:       { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)' },
  }[isPickleballGroup ? 'pickleball' : g.kind] || { bg: 'rgba(255,255,255,0.04)', border: colors.borderSubtle };
  const balanceLabel = g.balance === 0 ? '0' : formatVNDShort(g.balance);

  return (
    <ListCard accent={isPickleballGroup ? 'pickleball' : accentMap[g.kind]} style={{
      padding: '18px 16px',
      cursor: 'pointer',
      background: isPickleballGroup ? 'linear-gradient(145deg, rgba(6,95,70,0.30), rgba(15,23,42,0.95))' : undefined,
      borderColor: isPickleballGroup ? 'rgba(52,211,153,0.72)' : undefined,
      boxShadow: isPickleballGroup ? '0 0 0 1px rgba(52,211,153,0.16), 0 16px 40px rgba(16,185,129,0.12)' : undefined,
    }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: iconBg.bg, border: `1px solid ${iconBg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          flexShrink: 0,
        }}>{g.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {g.name}
            </div>
            <div style={{ textAlign: 'right', minWidth: 76, flexShrink: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: colors.textSecondary,
                textTransform: 'uppercase', letterSpacing: '1px',
              }}>Số dư</div>
              <div style={{
                fontSize: 15, fontWeight: 800, marginTop: 2, ...type.mono,
                color: g.balance === 0 ? colors.textSecondary : g.balance < 0 ? colors.danger : '#6ee7b7',
              }}>
                {balanceLabel}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Badge tone={isPickleballGroup ? 'success' : 'muted'}>{g.kind === 'pickleball' ? 'Pickleball' : linked ? 'Liên kết Pickleball' : 'Chi tiêu'}</Badge>
            <span style={{ fontSize: 11, color: colors.textSecondary }}>{g.memberCount} thành viên</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
            <span style={{ display: 'inline-flex', minWidth: 0 }}>
              {g.members.slice(0, 4).map((m, i) => (
                <span key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar initial={m} size={24} />
                </span>
              ))}
              {g.memberCount > 4 && (
                <span style={{ marginLeft: -8 }}>
                  <Avatar initial={`+${g.memberCount - 4}`} size={24} color="rgba(255,255,255,0.08)" />
                </span>
              )}
            </span>
          </div>
          {linked && (
            <div style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 700, marginTop: 9, lineHeight: 1.25 }}>
              Dùng chung danh bạ với {g.linkedPickleballGroupName}
            </div>
          )}
        </div>
      </div>
    </ListCard>
  );
}

function ArchivedCard({ g }) {
  return (
    <Card style={{ padding: '14px 16px', opacity: 0.7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, filter: 'grayscale(0.5)',
        }}>{g.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>{g.name}</div>
          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 3 }}>{g.closedLabel}</div>
        </div>
        <Badge tone="muted">✓ Đóng</Badge>
      </div>
    </Card>
  );
}

const DEMO = {
  activeCount: 3, archivedCount: 2,
  activeFilter: 'all',
  filters: [
    { key: 'all',     label: 'Tất cả · 3' },
    { key: 'owed',    label: 'Còn nợ · 2' },
    { key: 'balanced',label: '0 · 1' },
    { key: 'closed',  label: 'Đã chốt' },
  ],
  groups: [
    { id: 'p1', kind: 'pickleball', emoji: '🏓', name: 'CLB Pickleball Cầu Giấy',
      members: ['L','M','H','T'], memberCount: 12, balance: -240000 },
    { id: 'f1', kind: 'food',       emoji: '🍜', name: 'Ăn trưa thứ Bảy',
      members: ['M','L','N'], memberCount: 6, balance: -45000 },
    { id: 'c1', kind: 'cafe',       emoji: '☕', name: 'Cafe sáng sau buổi',
      members: ['L','H','M'], memberCount: 5, balance: 0 },
  ],
  archived: [
    { id: 'a1', emoji: '🏖️', name: 'Du lịch Đà Nẵng 4/2026', closedLabel: 'Đã thanh toán xong · 28/04/2026' },
  ],
};
