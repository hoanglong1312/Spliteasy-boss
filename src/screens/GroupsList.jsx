// Spliteasy Boss — Danh sách nhóm
// Props: data { activeCount, archivedCount, filter, groups[], archived[] }

import React, { useState } from 'react';
import { colors, type, formatVNDShort } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Card, Pill, PillRow, Avatar, Badge,
  SectionHeader, ModuleHero, SearchInput, ListCard, Button,
} from '../primitives';

const GROUP_TYPE_LABELS = {
  food: 'Ăn uống',
  travel: 'Du lịch',
  expense: 'Chi tiêu',
  sport: 'Thể thao',
  home: 'Gia đình',
  party: 'Tiệc',
  work: 'Công việc',
  other: 'Khác',
  groups: 'Chi tiêu',
  cafe: 'Ăn uống',
  trip: 'Du lịch',
  pickleball: 'Pickleball',
};
const GROUP_TYPE_EMOJI_LABELS = {
  '🍜': 'Ăn uống',
  '🥘': 'Ăn uống',
  '🍺': 'Ăn uống',
  '✈️': 'Du lịch',
  '🚗': 'Du lịch',
  '🏖': 'Du lịch',
  '🏖️': 'Du lịch',
  '🏨': 'Du lịch',
  '💰': 'Chi tiêu',
  '🧾': 'Chi tiêu',
  '🏓': 'Thể thao',
  '🏸': 'Thể thao',
  '🏠': 'Gia đình',
  '🎂': 'Tiệc',
  '🎲': 'Tiệc',
  '💼': 'Công việc',
  '🎯': 'Khác',
  '👥': 'Khác',
};

export default function GroupsList({ data, onAction }) {
  const d = data || DEMO;
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(d.activeFilter || 'all');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = (d.groups || []).filter(group => {
    if (activeFilter === 'owed') return group.balance < 0;
    if (activeFilter === 'balanced') return group.balance === 0;
    return true;
  });
  const visibleGroups = normalizedSearch
    ? filteredGroups.filter(g => `${g.name || ''} ${g.emoji || ''}`.toLowerCase().includes(normalizedSearch))
    : filteredGroups;
  const visibleArchived = normalizedSearch
    ? (d.archived || []).filter(g => `${g.name || ''} ${g.emoji || ''}`.toLowerCase().includes(normalizedSearch))
    : (d.archived || []);
  const pickleballGroups = visibleGroups.filter(isPickleballLikeGroup);
  const expenseGroups = visibleGroups.filter(g => !isPickleballLikeGroup(g));
  const showExpenseDivider = pickleballGroups.length > 0 && expenseGroups.length > 0;
  const showingArchived = activeFilter === 'closed';

  return (
    <PhoneFrame>
      <Screen tabBar>
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
            <Pill key={f.key} active={f.key === activeFilter} onClick={() => setActiveFilter(f.key)}>
              {f.label}
            </Pill>
          ))}
        </PillRow>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showingArchived ? (
            <>
              <SectionHeader>Đã chốt sổ</SectionHeader>
              {visibleArchived.map(g => (
                <ArchivedCard
                  key={g.id}
                  g={g}
                  onOpen={() => onAction?.('open', g.id)}
                  onRestore={() => onAction?.('restoreGroup', { groupId: g.id })}
                />
              ))}
            </>
          ) : (
            <>
              {pickleballGroups.map(g => <GroupCard key={g.id} g={g} onClick={() => onAction?.('open', g.id)} />)}
              {showExpenseDivider && <GroupsDivider />}
              {expenseGroups.map(g => <GroupCard key={g.id} g={g} onClick={() => onAction?.('open', g.id)} />)}
            </>
          )}
        </div>
      </Screen>

      <TabBar active="groups" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function isPickleballLikeGroup(g) {
  return g?.kind === 'pickleball' || Boolean(g?.isLinkedPickleballExpenseGroup);
}

function GroupsDivider() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10,
      margin: '2px 2px 0',
    }}>
      <div style={{ height: 1, background: 'rgba(148,163,184,0.22)' }} />
      <div style={{
        fontSize: 10, fontWeight: 800, color: colors.textMuted, letterSpacing: '0.8px',
        textTransform: 'uppercase',
      }}>
        Nhóm chi tiêu thường
      </div>
      <div style={{ height: 1, background: 'rgba(148,163,184,0.22)' }} />
    </div>
  );
}

function GroupCard({ g, onClick }) {
  const accentMap = { pickleball: 'pickleball', food: 'groups', cafe: 'finance', trip: 'finance' };
  const linked = g.isLinkedPickleballExpenseGroup;
  const isPickleballGroup = isPickleballLikeGroup(g);
  const groupTypeLabel = g.groupTypeLabel || groupTypeLabelFor(g);
  const metaItems = [groupTypeLabel, `${g.memberCount} thành viên`];
  const iconBg = {
    pickleball: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    food:       { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
    cafe:       { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)' },
  }[isPickleballGroup ? 'pickleball' : g.kind] || { bg: 'rgba(255,255,255,0.04)', border: colors.borderSubtle };
  const balanceLabel = g.balance === 0 ? 'Cân bằng' : formatVNDShort(g.balance);

  return (
    <ListCard accent={isPickleballGroup ? 'pickleball' : accentMap[g.kind]} style={{
      padding: '14px 14px',
      cursor: 'pointer',
      background: isPickleballGroup ? 'linear-gradient(145deg, rgba(6,95,70,0.30), rgba(15,23,42,0.95))' : undefined,
      borderColor: isPickleballGroup ? 'rgba(52,211,153,0.72)' : undefined,
      boxShadow: isPickleballGroup ? '0 0 0 1px rgba(52,211,153,0.16), 0 16px 40px rgba(16,185,129,0.12)' : undefined,
    }} onClick={onClick}>
      <div style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13,
          background: iconBg.bg, border: `1px solid ${iconBg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          flexShrink: 0,
        }}>{g.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, lineHeight: 1.25, minWidth: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {g.name}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isPickleballGroup ? '1fr' : 'auto 1fr',
            alignItems: 'center',
            gap: 6,
            marginTop: 7,
            minWidth: 0,
          }}>
            {linked && (
              <Badge tone="success" style={{
                justifySelf: 'start',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{g.linkedPickleballLabel || 'Liên kết Pickleball'}</Badge>
            )}
            <span style={{
              fontSize: 11,
              color: colors.textSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}>{metaItems.join(' · ')}</span>
          </div>
          {g.description && (
            <div style={{
              fontSize: 10,
              color: colors.textMuted,
              marginTop: 5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{g.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 74 }}>
          <div style={{
            fontSize: 15, fontWeight: 850, ...type.mono, lineHeight: 1,
            color: g.balance === 0 ? colors.textSecondary : g.balance < 0 ? colors.danger : '#6ee7b7',
          }}>
            {balanceLabel}
          </div>
          <span style={{ display: 'inline-flex' }}>
            {g.members.slice(0, 3).map((m, i) => (
              <span key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar initial={m} size={22} />
              </span>
            ))}
            {g.memberCount > 3 && (
              <span style={{ marginLeft: -8 }}>
                <Avatar initial={`+${g.memberCount - 3}`} size={22} color="rgba(255,255,255,0.08)" />
              </span>
            )}
          </span>
        </div>
      </div>
    </ListCard>
  );
}

function groupTypeLabelFor(g) {
  return GROUP_TYPE_EMOJI_LABELS[g?.emoji] || GROUP_TYPE_LABELS[g?.groupType] || GROUP_TYPE_LABELS[g?.kind] || 'Chi tiêu';
}

function ArchivedCard({ g, onOpen, onRestore }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button type="button" variant="ghost" size="sm" onClick={onOpen}>Mở</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRestore}>Khôi phục</Button>
        </div>
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
    { key: 'balanced',label: 'Cân bằng · 1' },
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
