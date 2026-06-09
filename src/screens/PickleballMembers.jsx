// Spliteasy Boss — Pickleball · Thành viên

import React, { useMemo, useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, Card, Badge, SubTabs, Avatar, Stat, Button, Input,
  ModuleHero, ActionButton, SearchInput, StatGrid, BottomSheet, MemberPicker,
  LoadingSpinner, loadingOverlayStyle, MonthNav,
} from '../primitives';

const VN_BANKS = ['Vietcombank', 'Techcombank', 'BIDV', 'Vietinbank', 'MB Bank', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'MSB', 'Agribank', 'HDBank'];

export default function PickleballMembers({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const [search, setSearch] = useState('');
  const [expandedFixed, setExpandedFixed] = useState(false);
  const [expandedCasual, setExpandedCasual] = useState(false);
  const [quickActionMember, setQuickActionMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBankAccountName, setEditBankAccountName] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberType, setNewMemberType] = useState('fixed');
  const [addMemberError, setAddMemberError] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [savingAction, setSavingAction] = useState('');

  const fixedMembers = d.fixedMembers || d.members || [];
  const casualMembers = d.casualMembers || d.guests || [];
  const allMembers = d.allMembers || [];
  const memberCandidates = d.memberCandidates || [];
  const typedMemberName = candidateQuery.trim();
  const duplicateMember = findDuplicateMember(typedMemberName, allMembers);
  const duplicateMemberInactive = duplicateMember && !isActiveMember(duplicateMember);
  const selectedCandidates = memberCandidates.filter(candidate => selectedCandidateIds.includes(String(candidate.id)));
  const exactCandidateMatch = typedMemberName && memberCandidates.find(candidate => normalizeSearch(candidate?.name) === normalizeSearch(typedMemberName));
  const candidatesToAdd = selectedCandidates.length > 0 ? selectedCandidates : exactCandidateMatch ? [exactCandidateMatch] : [];
  const filteredCandidateCards = memberCandidates.filter(candidate => {
    const normalizedQuery = normalizeSearch(candidateQuery);
    if (!normalizedQuery) return true;
    return normalizeSearch(`${candidate.name} ${candidate.bankName} ${candidate.bankAccount}`).includes(normalizedQuery);
  });
  const query = search.trim().toLowerCase();
  const filteredFixed = useMemo(() => filterMembers(fixedMembers, query), [fixedMembers, query]);
  const filteredCasual = useMemo(() => filterMembers(casualMembers, query), [casualMembers, query]);

  function openEdit(member) {
    setQuickActionMember(null);
    setEditingMember(member);
    setEditName(member.name || '');
    setEditBankAccountName(member.bankAccountName || '');
    setEditBankName(member.bankName || '');
    setEditBankAccount(member.bankAccount || '');
  }

  async function saveEdit(e) {
    e.preventDefault();
    const name = editName.trim();
    if (!editingMember || !name || savingAction) return;
    setSavingAction('editMember');
    try {
      await onAction?.('editMember', {
        memberId: editingMember.id,
        profileId: editingMember?.profileId || editingMember?.profile_id || '',
        groupId: d.groupId,
        name,
        bankAccountName: editBankAccountName.trim(),
        bankName: editBankName,
        bankAccount: editBankAccount.trim(),
      });
      setEditingMember(null);
    } finally {
      setSavingAction('');
    }
  }

  async function saveNewMember(e) {
    e.preventDefault();
    if (savingAction || (candidatesToAdd.length === 0 && !typedMemberName)) return;
    if (duplicateMember && isActiveMember(duplicateMember)) {
      setAddMemberError('Tên này đã tồn tại trong nhóm. Vui lòng dùng tên khác.');
      return;
    }
    if (duplicateMember && candidatesToAdd.length === 0) return;
    setSavingAction('addMember');
    try {
      for (const candidate of candidatesToAdd) {
        if (candidate.isInactive) {
          await onAction?.('reactivateMember', { memberId: candidate.memberId || candidate.id, groupId: d.groupId });
          continue;
        }
        await onAction?.('addPickleballMember', {
          groupId: d.groupId,
          name: candidate.name,
          profileId: candidate?.profileId || candidate?.id || '',
          type: newMemberType,
          bankAccountName: candidate?.bankAccountName || '',
          bankName: candidate?.bankName || '',
          bankAccount: candidate?.bankAccount || '',
        });
      }
      if (candidatesToAdd.length === 0 && typedMemberName) {
        await onAction?.('addPickleballMember', { groupId: d.groupId, name: typedMemberName, profileId: '', type: newMemberType });
      }
      setNewMemberType('fixed');
      setCandidateQuery('');
      setSelectedCandidateIds([]);
      setShowAddMember(false);
    } finally {
      setSavingAction('');
    }
  }

  async function reactivateDuplicateMember() {
    if (!duplicateMemberInactive || savingAction) return;
    setSavingAction('reactivateMember');
    try {
      await onAction?.('reactivateMember', { memberId: duplicateMember.id, groupId: d.groupId });
      setCandidateQuery('');
      setAddMemberError('');
      setShowAddMember(false);
    } finally {
      setSavingAction('');
    }
  }

  function changeCandidateQuery(value) {
    setCandidateQuery(value);
    setAddMemberError('');
  }

  function toggleCandidate(candidateId) {
    const id = String(candidateId);
    setSelectedCandidateIds(current => (
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    ));
  }

  async function changeType(member) {
    if (savingAction) return;
    const type = member.type === 'casual' ? 'fixed' : 'casual';
    setQuickActionMember(null);
    setSavingAction('changeType');
    try {
      await onAction?.('setMemberType', { memberId: member.id, type, groupId: d.groupId, yearMonth: d.currentYearMonth });
    } finally {
      setSavingAction('');
    }
  }

  async function changeRole(member) {
    if (savingAction) return;
    const role = member.role === 'treasurer' ? 'member' : 'treasurer';
    setQuickActionMember(null);
    if (!window.confirm(role === 'treasurer'
      ? `Cấp quyền Thủ quỹ cho ${member.name}?`
      : `Thu quyền Thủ quỹ của ${member.name}?`)) return;
    setSavingAction('changeRole');
    try {
      await onAction?.('setMemberRole', { memberId: member.id, groupId: d.groupId, role });
    } finally {
      setSavingAction('');
    }
  }

  function deleteMember(member) {
    setQuickActionMember(null);
    setDeleteConfirmMember(member);
  }

  async function confirmDeleteMember() {
    if (!deleteConfirmMember || savingAction) return;
    setSavingAction('deleteMember');
    try {
      await onAction?.('removePickleballMember', { memberId: deleteConfirmMember.id, groupId: data.groupId });
      setDeleteConfirmMember(null);
    } finally {
      setSavingAction('');
    }
  }

  return (
    <PhoneFrame>
      <Screen tabBar style={{ background: colors.pageBg }}>
        <ModuleHero
          tone="pickleball"
          eyebrow={`CLB PICKLEBALL · ${d.clubName}`}
          title="Thành viên"
          action={isTreasurer ? (
            <Button type="button" variant="primary" onClick={() => setShowAddMember(true)} style={{ padding: '10px 12px', fontSize: 12, color: '#064e3b' }}>+ Thêm</Button>
          ) : null}
        />

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
          ]}
          active="members"
          onChange={(key) => onAction?.('subTab', key)}
        />

        <MonthNav label={d.monthLabel} onPrev={() => onAction?.("monthPrev")} onNext={() => onAction?.("monthNext")} />

        <StatGrid>
          <Stat value={d.stats?.permanent || fixedMembers.length} label="Cố định" accent="pickleball" />
          <Stat value={d.stats?.casual || casualMembers.length} label="Vãng lai" color={colors.warning} />
          <Stat value={d.stats?.total || fixedMembers.length + casualMembers.length} label="Tổng" color={colors.textPrimary} />
        </StatGrid>

        <SearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên"
          style={{ marginBottom: 14 }}
        />

        <MemberSection
          title={`Cố định · ${filteredFixed.length} người`}
          members={filteredFixed}
          expanded={expandedFixed}
          onExpand={() => setExpandedFixed(true)}
          isTreasurer={isTreasurer}
          onMore={setQuickActionMember}
          onAction={onAction}
        />

        <MemberSection
          title={`Vãng lai · ${filteredCasual.length} người`}
          members={filteredCasual}
          expanded={expandedCasual}
          onExpand={() => setExpandedCasual(true)}
          isTreasurer={isTreasurer}
          onMore={setQuickActionMember}
          onAction={onAction}
        />
      </Screen>

      {quickActionMember && isTreasurer && (
        <QuickActionSheet
          member={quickActionMember}
          onClose={() => setQuickActionMember(null)}
          onEdit={() => openEdit(quickActionMember)}
          onChangeType={() => changeType(quickActionMember)}
          onChangeRole={() => changeRole(quickActionMember)}
          onDelete={() => deleteMember(quickActionMember)}
        />
      )}

      {showAddMember && isTreasurer && (
        <BottomSheet title="Thêm thành viên" onClose={() => setShowAddMember(false)}>
          <form onSubmit={saveNewMember}>
            <MemberPicker
              candidates={filteredCandidateCards}
              selectedIds={selectedCandidateIds}
              query={candidateQuery}
              onQueryChange={changeCandidateQuery}
              onToggle={toggleCandidate}
              sectionTitle={memberPickerSectionTitle(filteredCandidateCards)}
              placeholder="Tìm thành viên hoặc nhập tên mới"
              emptyText="Không có thành viên phù hợp. Bấm lưu để thêm tên mới."
              tone="pickleball"
              maxListHeight={220}
            />
            {addMemberError && (
              <div style={{ fontSize: 12, color: colors.danger, marginTop: 8, lineHeight: 1.4 }}>
                {addMemberError}
              </div>
            )}
            {duplicateMemberInactive && (
              <div style={{
                display: 'grid',
                gap: 8,
                padding: 10,
                marginTop: 10,
                borderRadius: 12,
                border: `1px solid ${colors.borderSubtle}`,
                background: colors.cardSurface,
              }}>
                <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.45 }}>
                  Thành viên '{duplicateMember.name}' đang ở trạng thái chờ — bạn có muốn thêm lại không?
                </div>
                <Button type="button" variant="success" onClick={reactivateDuplicateMember} disabled={savingAction === 'reactivateMember'}>
                  {savingAction === 'reactivateMember' ? 'Đang lưu…' : 'Thêm lại'}
                </Button>
              </div>
            )}
            <TypeSwitch value={newMemberType} onChange={setNewMemberType} />
            <Button block variant="success" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} type="submit" disabled={savingAction === 'addMember'}>
              {savingAction === 'addMember' && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'pickleballLoadingSpin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
              {savingAction === 'addMember' ? 'Đang lưu…' : selectedCandidates.length > 0 ? `Thêm ${selectedCandidates.length} thành viên` : typedMemberName && !exactCandidateMatch && !duplicateMember ? `Thêm "${typedMemberName}" làm thành viên mới` : 'Thêm thành viên'}
            </Button>
          </form>
        </BottomSheet>
      )}

      {editingMember && isTreasurer && (
        <BottomSheet title="Sửa thông tin" onClose={() => setEditingMember(null)}>
          <form onSubmit={saveEdit}>
            <Input
              label="Tên hiển thị"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Tên thành viên"
              autoFocus
            />
            <Input
              label="Họ và tên đầy đủ"
              value={editBankAccountName}
              onChange={e => setEditBankAccountName(e.target.value)}
              placeholder="Tên trên tài khoản ngân hàng"
            />
            <BankSelect value={editBankName} onChange={setEditBankName} />
            <Input
              label="Số tài khoản"
              type="number"
              inputMode="numeric"
              value={editBankAccount}
              onChange={e => setEditBankAccount(e.target.value)}
              placeholder="Chưa cập nhật"
            />
            <Button block variant="success" style={{ marginTop: 14 }} type="submit" disabled={savingAction === 'editMember'}>
              {savingAction === 'editMember' ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </form>
        </BottomSheet>
      )}

      {deleteConfirmMember && isTreasurer && (
        <BottomSheet title="Xóa thành viên?" onClose={() => setDeleteConfirmMember(null)}>
          <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginTop: 8 }}>
            Thành viên sẽ được ẩn khỏi danh sách nhóm. Bạn có thể thêm lại sau.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmMember(null)}>Hủy</Button>
            <Button type="button" variant="danger" onClick={confirmDeleteMember} disabled={savingAction === 'deleteMember'}>
              {savingAction === 'deleteMember' ? 'Đang xóa…' : 'Xác nhận'}
            </Button>
          </div>
        </BottomSheet>
      )}

      <TabBar active="pickleball" onChange={(key) => onAction?.('tab', key)} onFab={() => onAction?.('fab')} />
      {savingAction && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
        </div>
      )}
    </PhoneFrame>
  );
}

function filterMembers(members, query) {
  if (!query) return members;
  return members.filter(member => String(member.name || '').toLowerCase().includes(query));
}

function findDuplicateMember(name, members) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return null;
  return members.find(member => (
    String(member?.name || member?.displayName || '').trim().toLowerCase() === normalizedName
  )) || null;
}

function isActiveMember(member) {
  return member?.isActive !== false && member?.is_active !== false;
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

function memberPickerSectionTitle(candidates) {
  return candidates.length > 0 && candidates.every(candidate => candidate.isInactive)
    ? 'Danh sách chờ thêm lại'
    : 'Thành viên có sẵn';
}

function maskAccount(value) {
  const text = String(value || '').replace(/\s+/g, '');
  if (text.length <= 4) return text;
  return `${text.slice(0, 4)} •••• ${text.slice(-3)}`;
}

function MemberSection({ title, members, expanded, onExpand, isTreasurer, onMore, onAction }) {
  const visibleMembers = expanded ? members : members.slice(0, 5);
  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        ...type.label,
        color: colors.textSecondary,
        margin: '8px 0 8px',
      }}>{title}</div>
      <Card style={{ padding: '4px 12px' }}>
        {visibleMembers.length === 0 && (
          <div style={{ fontSize: 12, color: colors.textSecondary, padding: '12px 0' }}>
            Không có thành viên
          </div>
        )}
        {visibleMembers.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            last={index === visibleMembers.length - 1 && hiddenCount === 0}
            isTreasurer={isTreasurer}
            onMore={onMore}
            onAction={onAction}
          />
        ))}
        {hiddenCount > 0 && (
          <button type="button" onClick={onExpand} style={{
            width: '100%',
            padding: '11px 0',
            border: 'none',
            borderTop: `1px solid ${colors.borderSubtle}`,
            background: 'transparent',
            color: colors.pickleball,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}>▼ Xem thêm {hiddenCount} thành viên</button>
        )}
      </Card>
    </div>
  );
}

function MemberRow({ member, last, isTreasurer, onMore, onAction }) {
  const isCasual = member.type === 'casual';
  const pct = Number(member.progressPct) || 0;
  const rank = member.rank || {};
  const barColor = progressColor(pct);

  return (
    <div role="button" tabIndex={0} onClick={() => onAction?.('memberDetail', { memberId: member.id })} onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onAction?.('memberDetail', { memberId: member.id });
    }} style={{
      width: '100%',
      display: 'grid',
      gridTemplateColumns: '34px minmax(0, 1fr) 30px',
      gap: 10,
      alignItems: 'center',
      padding: '10px 0',
      border: 'none',
      borderBottom: last ? 'none' : `1px solid ${colors.borderSubtle}`,
      background: 'transparent',
      color: colors.textPrimary,
      fontFamily: 'inherit',
      textAlign: 'left',
      cursor: 'pointer',
    }}>
      <Avatar initial={member.initial} size={34} color={member.color} photoUrl={member.photoUrl} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{member.name}</span>
          {!isCasual && <span style={{ fontSize: 13, flexShrink: 0 }}>{rank.icon || member.rankIcon}</span>}
          {member.isTreasurer && <Badge tone="warn" style={{ padding: '2px 6px', fontSize: 9 }}>THỦ QUỸ</Badge>}
        </div>
        {isCasual ? (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: colors.textSecondary, ...type.mono }}>
              {member.sessionsAttended || 0} buổi
            </span>
          </div>
        ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{
            height: 6,
            flex: 1,
            borderRadius: 100,
            overflow: 'hidden',
            background: colors.inputBg,
          }}>
            <div style={{
              width: `${Math.max(Math.min(pct, 100), 0)}%`,
              height: '100%',
              borderRadius: 100,
              background: barColor,
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: barColor, whiteSpace: 'nowrap', ...type.mono }}>
            {pct}% · {rank.label || member.rankLabel}
          </span>
        </div>
        )}
      </div>
      {isTreasurer ? (
        <button type="button" aria-label={`Mở thao tác ${member.name}`} onClick={(e) => {
          e.stopPropagation();
          onMore(member);
        }} style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          border: `1px solid ${colors.borderSubtle}`,
          background: colors.inputBg,
          color: colors.textSecondary,
          fontSize: 18,
          lineHeight: 1,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}>⋯</button>
      ) : (
        <span />
      )}
    </div>
  );
}

function QuickActionSheet({ member, onClose, onEdit, onChangeType, onChangeRole, onDelete }) {
  return (
    <BottomSheet title={member.name} onClose={onClose}>
      <ActionButton onClick={onEdit}>✏️ Sửa</ActionButton>
      <ActionButton onClick={onChangeType}>↔️ {member.type === 'casual' ? 'Chuyển thành Cố định' : 'Chuyển sang Vãng lai'}</ActionButton>
      <ActionButton onClick={onChangeRole}>👑 {member.role === 'treasurer' ? 'Thu quyền Thủ quỹ' : 'Cấp quyền Thủ quỹ'}</ActionButton>
      <ActionButton danger onClick={onDelete}>🗑 Xoá</ActionButton>
    </BottomSheet>
  );
}

function BankSelect({ value, onChange }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: colors.textSecondary,
        margin: '14px 0 6px',
      }}>Ngân hàng</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectFieldStyle()}>
        <option value="">Chọn ngân hàng</option>
        {VN_BANKS.map(bank => (
          <option key={bank} value={bank}>{bank}</option>
        ))}
      </select>
    </div>
  );
}

function TypeSwitch({ value, onChange }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6,
      marginTop: 12,
      padding: 4,
      borderRadius: 12,
      background: colors.cardSurface,
      border: `1px solid ${colors.borderSubtle}`,
    }}>
      {[
        { key: 'fixed', label: 'Cố định' },
        { key: 'casual', label: 'Vãng lai' },
      ].map(item => (
        <button key={item.key} type="button" onClick={() => onChange(item.key)} style={{
          border: 'none',
          borderRadius: 9,
          padding: '9px 8px',
          background: value === item.key ? colors.successSoft : 'transparent',
          color: value === item.key ? colors.pickleball : colors.textSecondary,
          fontSize: 12,
          fontWeight: 800,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}>{item.label}</button>
      ))}
    </div>
  );
}

function selectFieldStyle() {
  return {
    width: '100%',
    padding: '14px 14px',
    background: colors.inputBg,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: 12,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    outline: 'none',
  };
}

function progressColor(pct) {
  if (pct >= 65) return colors.success;
  if (pct >= 45) return colors.warning;
  return colors.danger;
}

const DEMO = {
  clubName: 'Cầu Giấy',
  monthLabel: 'Tháng 5 · 2026',
  stats: { permanent: 6, casual: 2, total: 8 },
  fixedMembers: [
    { id: 1, initial: 'L', name: 'Long', role: 'treasurer', type: 'fixed', progressPct: 92, rank: { icon: '🔥', label: 'Siêu chăm' }, isTreasurer: true, bankName: 'Vietcombank', bankAccountName: 'Nguyen Long', bankAccount: '1234567890' },
    { id: 2, initial: 'M', name: 'Minh', type: 'fixed', progressPct: 76, rank: { icon: '⚡', label: 'Chăm chỉ' } },
    { id: 3, initial: 'H', name: 'Hoa', type: 'fixed', progressPct: 54, rank: { icon: '😐', label: 'Bình thường' } },
    { id: 4, initial: 'T', name: 'Tuấn', type: 'fixed', progressPct: 31, rank: { icon: '🥶', label: 'Hay vắng' } },
  ],
  casualMembers: [
    { id: 7, initial: 'A', name: 'An', type: 'casual', progressPct: 23, rank: { icon: '🥶', label: 'Hay vắng' } },
  ],
  joinRequests: [],
};
