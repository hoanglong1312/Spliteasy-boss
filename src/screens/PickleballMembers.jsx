// Spliteasy Boss — Pickleball · Thành viên

import React, { useMemo, useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, Card, Badge, SubTabs, Avatar, Stat, Button, Input,
  ModuleHero, SearchInput, StatGrid, BottomSheet, MemberPicker,
  LoadingSpinner, loadingOverlayStyle, MonthNav,
} from '../primitives';

const VN_BANKS = ['Vietcombank', 'Techcombank', 'BIDV', 'Vietinbank', 'MB Bank', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'MSB', 'Agribank', 'HDBank'];

export default function PickleballMembers({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const [search, setSearch] = useState('');
  const [expandedFixed, setExpandedFixed] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState(null);
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
  const isFlexBilling = d.billingMode === 'flex';
  const monthlyTicketIds = new Set((d.monthlyTicketMemberIds || []).map(String));
  const perSessionTicketIds = new Set((d.perSessionTicketMemberIds || []).map(String));
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
  const filteredMembers = useMemo(() => filterMembers([...fixedMembers, ...casualMembers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')), query), [fixedMembers, casualMembers, query]);

  function openEdit(member) {
    setExpandedMemberId(null);
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
    const memberType = isFlexBilling ? 'fixed' : newMemberType;
    try {
      async function addMemberWithTicketType(member) {
        const addedMember = await onAction?.('addPickleballMember', member);
        if (isFlexBilling && addedMember?.id) {
          await onAction?.('setMemberTicketType', { memberId: addedMember.id, groupId: d.groupId, yearMonth: d.currentYearMonth, ticketType: 'per_session' });
        }
      }

      for (const candidate of candidatesToAdd) {
        if (candidate.isInactive) {
          const memberId = candidate.memberId || candidate.id
          await onAction?.('reactivateMember', { memberId, groupId: d.groupId });
          if (isFlexBilling && memberId) {
            await onAction?.('setMemberTicketType', { memberId, groupId: d.groupId, yearMonth: d.currentYearMonth, ticketType: 'per_session' });
          }
          continue;
        }
        await addMemberWithTicketType({
          groupId: d.groupId,
          name: candidate.name,
          profileId: candidate?.profileId || candidate?.id || '',
          type: memberType,
          bankAccountName: candidate?.bankAccountName || '',
          bankName: candidate?.bankName || '',
          bankAccount: candidate?.bankAccount || '',
        });
      }
      if (candidatesToAdd.length === 0 && typedMemberName) {
        await addMemberWithTicketType({ groupId: d.groupId, name: typedMemberName, profileId: '', type: memberType });
      }
      setNewMemberType('fixed');
      setCandidateQuery('');
      setSelectedCandidateIds([]);
      setShowAddMember(false);
    } catch (error) {
      setAddMemberError(`Không thể thêm thành viên: ${error?.message || 'Vui lòng thử lại'}`);
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

  async function changeType(member, targetType) {
    if (savingAction) return;
    const type = targetType || (member.type === 'casual' ? 'fixed' : 'casual');
    setSavingAction('changeType');
    try {
      await onAction?.('setMemberType', { memberId: member.id, type, groupId: d.groupId, yearMonth: d.currentYearMonth });
    } finally {
      setSavingAction('');
    }
  }

  async function setMemberTicketType(member, ticketType) {
    if (savingAction) return;
    setSavingAction('setMemberTicketType');
    try {
      await onAction?.('setMemberTicketType', { memberId: member.id, groupId: d.groupId, yearMonth: d.currentYearMonth, ticketType });
    } finally {
      setSavingAction('');
    }
  }

  async function changeRole(member) {
    if (savingAction) return;
    const role = member.role === 'treasurer' ? 'member' : 'treasurer';
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
    setExpandedMemberId(null);
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
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="ghost" onClick={() => onAction?.('push', { screen: 'pickleball-settings', params: { yearMonth: d.currentYearMonth } })} style={{ padding: '10px 12px', fontSize: 12 }}>
                Cấu hình
              </Button>
              <Button type="button" variant="primary" onClick={() => setShowAddMember(true)} style={{ padding: '10px 12px', fontSize: 12, color: '#064e3b' }}>+ Thêm</Button>
            </div>
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
          <Stat value={isFlexBilling ? d.stats?.monthlyTickets ?? 0 : d.stats?.permanent ?? fixedMembers.length} label={isFlexBilling ? 'Vé tháng' : 'Cố định'} accent="pickleball" />
          <Stat value={isFlexBilling ? d.stats?.perSessionTickets ?? 0 : d.stats?.casual ?? casualMembers.length} label={isFlexBilling ? 'Vé lượt' : 'Vãng lai'} color={colors.warning} />
          <Stat value={d.stats?.total || fixedMembers.length + casualMembers.length} label="Tổng" color={colors.textPrimary} />
        </StatGrid>

        <SearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên"
          style={{ marginBottom: 14 }}
        />

        <MemberSection
          title={`Thành viên · ${filteredMembers.length} người`}
          members={filteredMembers}
          expanded={expandedFixed}
          onExpand={() => setExpandedFixed(true)}
          isTreasurer={isTreasurer}
          expandedMemberId={expandedMemberId}
          onToggleExpand={(id) => setExpandedMemberId(prev => prev === id ? null : id)}
          onChangeType={changeType}
          isFlexBilling={isFlexBilling}
          monthlyTicketIds={monthlyTicketIds}
          perSessionTicketIds={perSessionTicketIds}
          onSetTicketType={setMemberTicketType}
          onEdit={openEdit}
          onDelete={deleteMember}
        />
      </Screen>

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
            {!isFlexBilling && <TypeSwitch value={newMemberType} onChange={setNewMemberType} />}
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

function MemberSection({
  title,
  members,
  expanded,
  onExpand,
  isTreasurer,
  expandedMemberId,
  onToggleExpand,
  onChangeType,
  isFlexBilling,
  monthlyTicketIds,
  perSessionTicketIds,
  onSetTicketType,
  onEdit,
  onDelete,
}) {
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
            isExpanded={expandedMemberId === member.id}
            onToggleExpand={onToggleExpand}
            onChangeType={onChangeType}
            isFlexBilling={isFlexBilling}
            ticketType={monthlyTicketIds?.has(String(member.id)) ? 'monthly' : perSessionTicketIds?.has(String(member.id)) ? 'per_session' : isFlexBilling ? 'per_session' : ''}
            onSetTicketType={onSetTicketType}
            onEdit={onEdit}
            onDelete={onDelete}
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

function MemberRow({ member, last, isTreasurer, isExpanded, onToggleExpand, onChangeType, isFlexBilling, ticketType, onSetTicketType, onEdit, onDelete }) {
  const isFixed = member.memberType === 'fixed' || member.type === 'fixed';
  const isCasual = !isFixed;
  const pct = Number(member.progressPct) || 0;
  const rank = member.rank || {};
  const barColor = progressColor(pct);

  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${colors.borderSubtle}` }}>
      <div role="button" tabIndex={0} onClick={() => onToggleExpand(member.id)} onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggleExpand(member.id);
      }} style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: isTreasurer ? '34px minmax(0, 1fr) auto' : '34px minmax(0, 1fr)',
        gap: 10,
        alignItems: 'center',
        padding: '10px 0',
        border: 'none',
        background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: colors.textPrimary,
        fontFamily: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: isExpanded ? '12px 12px 0 0' : 12,
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
            {!isFlexBilling && !isCasual && <span style={{ fontSize: 13, flexShrink: 0 }}>{rank.icon || member.rankIcon}</span>}
            {member.isTreasurer && <Badge tone="warn" style={{ padding: '2px 6px', fontSize: 9 }}>THỦ QUỸ</Badge>}
          </div>
          {isFlexBilling ? (
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
                {member.sessionsAttended || 0}/{member.sessionsTotal || 0} buổi
              </span>
            </div>
          ) : isCasual ? (
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
          {!isFlexBilling && (
            <div style={{ fontSize: 10, fontWeight: 800, color: isFixed ? colors.success : colors.warning, marginTop: 5 }}>
              {isFixed ? 'Cố định' : 'Vãng lai'}
            </div>
          )}
        </div>
        {isTreasurer && (isFlexBilling ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            width: 144,
            padding: 3,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 10,
            background: colors.cardSurface,
          }}>
            <TicketTypeButton
              checked={ticketType === 'monthly'}
              tone="monthly"
              onClick={(e) => {
                e.stopPropagation();
                onSetTicketType(member, 'monthly');
              }}
            >
              Vé tháng
            </TicketTypeButton>
            <TicketTypeButton
              checked={ticketType === 'per_session'}
              tone="per_session"
              onClick={(e) => {
                e.stopPropagation();
                onSetTicketType(member, 'per_session');
              }}
            >
              Vé lượt
            </TicketTypeButton>
          </div>
        ) : (
          <MemberTypeSegmentedControl
            isFixed={isFixed}
            onSelect={(type) => onChangeType(member, type)}
          />
        ))}
      </div>
      {isExpanded && isTreasurer && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 0 10px 44px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '0 0 12px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button type="button" onClick={(e) => {
            e.stopPropagation();
            onEdit(member);
          }} style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 10,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.24)',
            color: '#c7d2fe',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}>Sửa</button>
          <button type="button" onClick={(e) => {
            e.stopPropagation();
            onDelete(member);
          }} style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 10,
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.22)',
            color: '#fca5a5',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}>Xóa</button>
        </div>
      )}
    </div>
  );
}

function TicketTypeButton({ checked, tone, onClick, children }) {
  const palette = tone === 'per_session'
    ? { border: 'rgba(251,191,36,0.28)', bg: 'rgba(251,191,36,0.10)', color: '#fde68a' }
    : { border: 'rgba(96,165,250,0.28)', bg: 'rgba(96,165,250,0.12)', color: '#bfdbfe' };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${checked ? palette.border : 'transparent'}`,
        background: checked ? palette.bg : 'transparent',
        color: checked ? palette.color : colors.textSecondary,
        borderRadius: 8,
        padding: '7px 5px',
        fontSize: 10,
        fontWeight: 900,
        fontFamily: 'inherit',
        cursor: 'pointer',
        ...type.mono,
      }}
    >
      {children}
    </button>
  );
}

function MemberTypeSegmentedControl({ isFixed, onSelect }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 4,
      width: 126,
      padding: 3,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 10,
      background: colors.cardSurface,
    }}>
      <MemberTypeButton
        checked={isFixed}
        tone="fixed"
        onClick={(e) => {
          e.stopPropagation();
          onSelect('fixed');
        }}
      >
        Cố định
      </MemberTypeButton>
      <MemberTypeButton
        checked={!isFixed}
        tone="casual"
        onClick={(e) => {
          e.stopPropagation();
          onSelect('casual');
        }}
      >
        Vãng lai
      </MemberTypeButton>
    </div>
  );
}

function MemberTypeButton({ checked, tone, onClick, children }) {
  const palette = tone === 'casual'
    ? { border: 'rgba(251,191,36,0.28)', bg: 'rgba(251,191,36,0.10)', color: '#fde68a' }
    : { border: 'rgba(52,211,153,0.30)', bg: 'rgba(52,211,153,0.10)', color: '#6ee7b7' };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${checked ? palette.border : 'transparent'}`,
        background: checked ? palette.bg : 'transparent',
        color: checked ? palette.color : colors.textSecondary,
        borderRadius: 8,
        padding: '7px 5px',
        fontSize: 10,
        fontWeight: 900,
        fontFamily: 'inherit',
        cursor: 'pointer',
        ...type.mono,
      }}
    >
      {children}
    </button>
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
