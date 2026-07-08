// Spliteasy Boss — Chi tiết nhóm (tab Hoạt động)
// Props: data { name, balance, you, activitiesByWeek[] }, isTreasurer

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Button, Badge, SubTabs, Avatar,
  ModuleHero, ActionButton, SearchInput, SectionHeader, ListCard, BottomSheet,
  LoadingSpinner, loadingOverlayStyle,
} from '../primitives';

const VN_BANKS = ['Vietcombank', 'Techcombank', 'BIDV', 'Vietinbank', 'MB Bank', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'MSB', 'Agribank', 'HDBank'];
const GROUP_TYPES = [
  { key: 'food', label: 'Ăn uống', emoji: '🍜', hint: 'Nhà hàng, cà phê', descriptionPlaceholder: 'Ví dụ: Ăn uống sau giờ chơi, cafe cuối tuần' },
  { key: 'travel', label: 'Du lịch', emoji: '✈️', hint: 'Đi chơi, nghỉ dưỡng', descriptionPlaceholder: 'Ví dụ: Du lịch Đà Lạt 3 ngày 2 đêm' },
  { key: 'expense', label: 'Chi tiêu', emoji: '💰', hint: 'Quỹ chung, mua sắm', descriptionPlaceholder: 'Ví dụ: Quỹ chung, mua đồ, chi phí sinh hoạt' },
  { key: 'sport', label: 'Thể thao', emoji: '🏓', hint: 'Pickleball, bóng đá', descriptionPlaceholder: 'Ví dụ: Nhóm pickleball thứ 2-4-6' },
  { key: 'home', label: 'Gia đình', emoji: '🏠', hint: 'Nhà cửa, sinh hoạt', descriptionPlaceholder: 'Ví dụ: Tiền nhà, sinh hoạt gia đình' },
  { key: 'party', label: 'Tiệc', emoji: '🎂', hint: 'Sinh nhật, gặp mặt', descriptionPlaceholder: 'Ví dụ: Sinh nhật, liên hoan, gặp mặt bạn bè' },
  { key: 'work', label: 'Công việc', emoji: '💼', hint: 'Team, dự án', descriptionPlaceholder: 'Ví dụ: Chi phí team, dự án, công tác' },
  { key: 'other', label: 'Khác', emoji: '🎯', hint: 'Nhóm linh hoạt', descriptionPlaceholder: 'Ví dụ: Nhóm chi tiêu linh hoạt' },
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function GroupDetail({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const groupTypeOptions = d.groupTypeOptions || GROUP_TYPES;
  const initialGroupType = groupTypeOptions.find(option => option.key === d.groupType)
    || groupTypeOptions.find(option => option.emoji === d.emoji)
    || groupTypeOptions.find(option => option.key === 'expense')
    || groupTypeOptions[0];
  const canManageGroup = Boolean(isTreasurer || d.isGroupCreator);
  const canManageMembers = Boolean(isTreasurer || d.isGroupCreator);
  const canAddMembers = true;
  const [activeTab, setActiveTab] = useState('members');
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [archiveConfirmGroup, setArchiveConfirmGroup] = useState(false);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState(false);
  const [groupName, setGroupName] = useState(d.name || '');
  const [groupTypeKey, setGroupTypeKey] = useState(initialGroupType.key);
  const [groupDescription, setGroupDescription] = useState(d.description || '');
  const [savingAction, setSavingAction] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberMenu, setMemberMenu] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [expenseMenu, setExpenseMenu] = useState(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const pendingExpenses = d.pendingExpenses || [];
  const ownPendingExpenses = pendingExpenses.filter(expense => String(expense.submittedBy || '') === String(d.currentMemberId || ''));
  const heroBalanceLabel = d.balance > 0 ? 'Bạn cần thu' : d.balance < 0 ? 'Bạn cần nộp' : 'Bạn đã cân bằng';
  const heroBalanceTone = d.balance < 0 ? colors.danger : d.balance > 0 ? '#6ee7b7' : colors.textSecondary;
  const selectedGroupType = groupTypeOptions.find(option => option.key === groupTypeKey) || groupTypeOptions[0];
  const currentMemberRow = (d.members || []).find(member => String(member.id) === String(d.currentMemberId || '')) || null;
  const visibleMembers = (d.members || []).filter(member => {
    const query = normalizeSearch(memberSearch);
    if (!query) return true;
    return normalizeSearch(`${member.name} ${member.bankName} ${member.bankAccount}`).includes(query);
  });

  useEffect(() => {
    const focusMemberId = d.focusMemberId || d.focus_member_id || '';
    const focusProfileId = d.focusProfileId || d.focus_profile_id || '';
    if (!focusMemberId && !focusProfileId) return;
    const member = (d.members || []).find(candidate => (
      String(candidate.id) === String(focusMemberId) ||
      String(candidate.profileId || candidate.profile_id || '') === String(focusProfileId)
    ));
    if (!member) return;
    setActiveTab('members');
    setSelectedMember(member);
  }, [d.id, d.currentYearMonth, d.focusMemberId, d.focusProfileId]);

  function closeMemberSheets() {
    setAddingMember(false);
    setEditingMember(null);
    setMemberMenu(null);
  }

  async function saveGroup(e) {
    e.preventDefault();
    const name = groupName.trim();
    if (!name || savingAction) return;
    setSavingAction('saveGroup');
    try {
      await onAction?.('editGroup', {
      id: d.id,
      name,
      emoji: selectedGroupType.emoji || '👥',
      groupType: selectedGroupType.key,
      description: groupDescription.trim(),
      color: d.color || '#574EFA',
      });
      setEditingGroup(false);
    } finally {
      setSavingAction('');
    }
  }


  async function deleteGroup() {
    if (savingAction) return;
    setSavingAction('deleteGroup');
    try {
      await onAction?.('deleteGroup', { groupId: d.id });
      setDeleteConfirmGroup(false);
    } finally {
      setSavingAction('');
    }
  }

  async function archiveGroup() {
    if (savingAction) return;
    setSavingAction('archiveGroup');
    try {
      await onAction?.('archiveGroup', { groupId: d.id });
      setArchiveConfirmGroup(false);
    } finally {
      setSavingAction('');
    }
  }

  async function setMemberRole() {
    if (!memberMenu || savingAction) return;
    const role = memberMenu.role === 'treasurer' ? 'member' : 'treasurer';
    if (!window.confirm(role === 'treasurer' ? `Cấp quyền thủ quỹ cho ${memberMenu.name}?` : `Thu quyền thủ quỹ của ${memberMenu.name}?`)) return;
    setSavingAction('setMemberRole');
    try {
      await onAction?.('setMemberRole', { memberId: memberMenu.id, groupId: d.id, role });
      setMemberMenu(null);
    } finally {
      setSavingAction('');
    }
  }

  async function deleteExpense() {
    if (!deleteConfirmExpense || savingAction) return;
    setSavingAction('deleteExpense');
    try {
      await onAction?.('deleteExpense', { expenseId: deleteConfirmExpense.id });
      setDeleteConfirmExpense(null);
    } finally {
      setSavingAction('');
    }
  }

  async function removeMember() {
    if (!deleteConfirmMember || savingAction) return;
    setSavingAction('removeMember');
    try {
      await onAction?.('removeMemberFromGroup', { memberId: deleteConfirmMember.id, groupId: d.id });
      setDeleteConfirmMember(null);
    } finally {
      setSavingAction('');
    }
  }

  return (
    <PhoneFrame>
      <Screen tabBar style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* FIXED TOP: compact nav + group info */}
        <div style={{ flexShrink: 0, padding: '0 16px' }}>
        {/* Compact nav: back | emoji + name | edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 8px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{d.emoji || '👥'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>{d.monthLabel || ''}</div>
          </div>
          {canManageGroup ? <IconButton onClick={() => setEditingGroup(true)}>✎</IconButton> : <div style={{ width: 44 }} />}
        </div>

        <ModuleHero
          tone="groups"
          style={{ cursor: 'pointer' }}
        >
          {d.description && (
            <div style={{
              marginTop: 2,
              padding: '9px 10px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: colors.textSecondary,
              fontSize: 12,
              lineHeight: 1.45,
              overflowWrap: 'anywhere',
            }}>
              {d.description}
            </div>
          )}
          <SummaryChipRow
            memberCount={d.memberCount || (d.members || []).length}
            expenseCount={d.expenseCount || 0}
            totalSpent={d.totalSpent || 0}
          />
          <HeroBalancePanel
            label={heroBalanceLabel}
            balance={d.balance || 0}
            tone={heroBalanceTone}
            onOpen={currentMemberRow ? () => setSelectedMember(currentMemberRow) : null}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
            <Button variant="primary" style={{ padding: '7px 6px', fontSize: 11, color: '#7c2d12' }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>+ Thêm chi tiêu</Button>
            <Button variant="ghost" style={{ padding: '7px 6px', fontSize: 11 }} onClick={() => onAction?.('settleAll')}>💳 Thanh toán hết nợ</Button>
            <Button variant="ghost" style={{ gridColumn: '1 / -1', padding: '7px 6px', fontSize: 11 }} onClick={() => setExportMenuOpen(true)}>📤 Xuất Excel</Button>
          </div>
          <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 7, lineHeight: 1.35 }}>
            Thanh toán cho tất cả các tháng còn nợ đến hiện tại.
          </div>
        </ModuleHero>

        {!isTreasurer && ownPendingExpenses.length > 0 && (
          <PendingStatusAlert count={ownPendingExpenses.length} onClick={() => setActiveTab('activity')} />
        )}

        <SubTabs
          items={[
            { key: 'members',  label: `Thành viên · ${d.memberCount}` },
            { key: 'activity', label: 'Hoạt động' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
        </div>

        {/* FIXED: Search for members tab */}
        {activeTab === 'members' && (
          <div style={{ flexShrink: 0, padding: '4px 16px 6px' }}>
            <SearchInput
              value={memberSearch}
              onChange={event => setMemberSearch(event.target.value)}
              placeholder="Tìm thành viên..."
            />
          </div>
        )}

        {/* SCROLLABLE MIDDLE: tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>

        {activeTab === 'activity' && (
          <>
            {isTreasurer && pendingExpenses.length > 0 && (
              <section style={{ marginTop: 12 }}>
                <SectionHeader>CHỜ DUYỆT · {pendingExpenses.length}</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingExpenses.map(expense => (
                    <PendingExpenseCard
                      key={expense.id}
                      expense={expense}
                      onApprove={() => onAction?.('approveExpense', { expenseId: expense.id, groupId: d.id })}
                      onReject={() => onAction?.('rejectExpense', { expenseId: expense.id, groupId: d.id })}
                    />
                  ))}
                </div>
              </section>
            )}
            {d.activitiesByWeek.map(week => (
              <React.Fragment key={week.label}>
                <SectionHeader>{week.label}</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {week.items.map(it => (
                    <ActivityCard
                      key={it.id}
                      item={it}
                      isTreasurer={isTreasurer}
                      currentMemberId={d.currentMemberId}
                      onAction={onAction}
                      onMenu={setExpenseMenu}
                    />
                  ))}
                </div>
              </React.Fragment>
            ))}
          </>
        )}
        {activeTab === 'activity' && d.activitiesByWeek.length === 0 && (
          <EmptyState title="Chưa có chi tiêu" sub="Bấm Thêm chi tiêu để ghi khoản đầu tiên của nhóm này." />
        )}

        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
            {visibleMembers.map(member => (
              <MemberRow
                key={member.id}
                member={member}
                isTreasurer={canManageMembers}
                onOpen={setSelectedMember}
                onMore={setMemberMenu}
              />
            ))}
            {visibleMembers.length === 0 && (
              <EmptyState title="Chưa có thành viên" sub="Thêm thành viên để bắt đầu chia chi phí nhóm." />
            )}
          </div>
        )}

        </div>{/* end scrollable middle */}

        {/* FIXED BOTTOM: collapsible invite panel */}
        <div style={{ flexShrink: 0, padding: '0 16px 8px' }}>
          {inviteExpanded ? (
            <>
              <button
                type="button"
                onClick={() => setInviteExpanded(false)}
                style={{ width: '100%', textAlign: 'left', padding: '6px 0', background: 'none', border: 'none', color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 4 }}
              >
                QUẢN LÝ NHÓM ∧
              </button>
              <GroupManagementPanel
                inviteCode={d.inviteCode}
                onShare={() => onAction?.('createGroupInviteShare', { groupId: d.id, inviteCode: d.inviteCode })}
                onCopyInviteCode={() => onAction?.('copyInviteCode', { inviteCode: d.inviteCode })}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setInviteExpanded(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: colors.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <span>🔗 Link mời nhóm</span>
              <span style={{ fontSize: 10, color: colors.textMuted }}>∨ mở rộng</span>
            </button>
          )}
        </div>
      </Screen>

      {exportMenuOpen && (
        <BottomSheet title="Xuất dữ liệu" onClose={() => setExportMenuOpen(false)}>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            <ActionButton onClick={() => { setExportMenuOpen(false); onAction?.('exportGroupCsv', d); }}>CSV danh sách</ActionButton>
            <ActionButton onClick={() => { setExportMenuOpen(false); onAction?.('exportGroupMatrixXls', d); }}>Excel bảng ngang (.xlsx)</ActionButton>
          </div>
        </BottomSheet>
      )}

      {selectedMember && (
        <BottomSheet title="Chi tiết thành viên" onClose={() => setSelectedMember(null)}>
          <MemberDetailContent
            groupName={d.name}
            member={selectedMember}
            isTreasurer={canManageMembers}
            onAction={onAction}
            onClose={() => setSelectedMember(null)}
            onEdit={() => { setEditingMember(selectedMember); setSelectedMember(null); }}
            onDelete={() => {
              setDeleteConfirmMember(selectedMember);
              setSelectedMember(null);
            }}
          />
        </BottomSheet>
      )}

      {editingGroup && canManageGroup && (
        <BottomSheet title="Sửa thông tin nhóm" onClose={() => setEditingGroup(false)}>
          <form onSubmit={saveGroup}>
            <Field label="Tên nhóm" value={groupName} onChange={setGroupName} autoFocus />
            <GroupTypePicker value={groupTypeKey} options={groupTypeOptions} onChange={setGroupTypeKey} />
            <TextArea label="Mô tả nhóm" value={groupDescription} onChange={setGroupDescription} placeholder={selectedGroupType.descriptionPlaceholder} />
            <Button block variant="brand" style={{ marginTop: 14 }} type="submit">Lưu nhóm</Button>
            <ActionButton
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => {
                setEditingGroup(false);
                setArchiveConfirmGroup(true);
              }}
            >Lưu trữ nhóm</ActionButton>
            <ActionButton
              danger
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => {
                setEditingGroup(false);
                setDeleteConfirmGroup(true);
              }}
            >🗑️ Xóa nhóm</ActionButton>
          </form>
        </BottomSheet>
      )}

      {archiveConfirmGroup && canManageGroup && (
        <BottomSheet title="Lưu trữ nhóm?" onClose={() => setArchiveConfirmGroup(false)}>
          <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            Nhóm sẽ ẩn khỏi danh sách chính. Dữ liệu tiền vẫn giữ nguyên để rà soát sau.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setArchiveConfirmGroup(false)}>Hủy</Button>
            <Button
              type="button"
              variant="brand"
              onClick={archiveGroup}
              disabled={savingAction === 'archiveGroup'}
            >{savingAction === 'archiveGroup' ? 'Đang lưu…' : 'Lưu trữ'}</Button>
          </div>
        </BottomSheet>
      )}

      {deleteConfirmGroup && canManageGroup && (
        <BottomSheet title="Xóa nhóm?" onClose={() => setDeleteConfirmGroup(false)}>
          <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            Nhóm sẽ được ẩn khỏi danh sách hoạt động. Dữ liệu cũ vẫn giữ trong hệ thống để tránh mất lịch sử.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmGroup(false)}>Hủy</Button>
            <Button
              type="button"
              variant="danger"
              onClick={deleteGroup}
              disabled={savingAction === 'deleteGroup'}
            >{savingAction === 'deleteGroup' ? 'Đang xóa…' : 'Xác nhận'}</Button>
          </div>
        </BottomSheet>
      )}

      {addingMember && (
        <AddMemberEditor
          title="Thêm thành viên"
          groupId={d.id}
          candidates={d.memberCandidates || []}
          currentMembers={d.members || []}
          onClose={closeMemberSheets}
          onAction={onAction}
        />
      )}

      {memberMenu && canManageMembers && (
        <BottomSheet title={memberMenu.name} onClose={() => setMemberMenu(null)}>
          <ActionButton onClick={() => { setEditingMember(memberMenu); setMemberMenu(null); }}>✏️ Sửa thành viên</ActionButton>
          <ActionButton onClick={setMemberRole}>{savingAction === 'setMemberRole' ? 'Đang xử lý…' : memberMenu.role === 'treasurer' ? '💳 Thu quyền thủ quỹ' : '💳 Cấp quyền thủ quỹ'}</ActionButton>
          <ActionButton danger onClick={() => {
            setDeleteConfirmMember(memberMenu);
            setMemberMenu(null);
          }}>🗑️ Xóa khỏi nhóm</ActionButton>
        </BottomSheet>
      )}

      {expenseMenu && (
        <BottomSheet title={expenseMenu.title} onClose={() => setExpenseMenu(null)}>
          <ActionButton onClick={() => {
            onAction?.('editExpense', { expenseId: expenseMenu.id });
            setExpenseMenu(null);
          }}>✏️ Sửa chi tiêu</ActionButton>
          <ActionButton danger onClick={() => {
            setDeleteConfirmExpense(expenseMenu);
            setExpenseMenu(null);
          }}>🗑️ Xóa chi tiêu</ActionButton>
        </BottomSheet>
      )}

      {deleteConfirmExpense && (
        <BottomSheet title="Xóa chi tiêu?" onClose={() => setDeleteConfirmExpense(null)}>
          <div style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            Chi tiêu sẽ bị xóa khỏi danh sách và số dư của nhóm.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button variant="ghost" onClick={() => setDeleteConfirmExpense(null)}>Hủy</Button>
            <Button variant="danger" onClick={deleteExpense} disabled={savingAction === 'deleteExpense'}>{savingAction === 'deleteExpense' ? 'Đang xóa…' : 'Xác nhận'}</Button>
          </div>
        </BottomSheet>
      )}

      {deleteConfirmMember && canManageMembers && (
        <BottomSheet title="Xóa khỏi nhóm?" onClose={() => setDeleteConfirmMember(null)}>
          <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginTop: 8 }}>
            Thành viên sẽ được ẩn khỏi danh sách nhóm. Bạn có thể thêm lại sau.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmMember(null)}>Hủy</Button>
            <Button
              type="button"
              variant="danger"
              onClick={removeMember}
              disabled={savingAction === 'removeMember'}
            >{savingAction === 'removeMember' ? 'Đang xóa…' : 'Xác nhận'}</Button>
          </div>
        </BottomSheet>
      )}

      {editingMember && (
        <EditMemberEditor
          title="Sửa thành viên"
          member={editingMember}
          onClose={closeMemberSheets}
          onAction={onAction}
        />
      )}

      {fabOpen && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', padding: '0 20px', paddingBottom: 'calc(var(--tab-bar-height, 68px) + 16px)', background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setFabOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
            {canAddMembers && (
              <button type="button" onClick={() => { setFabOpen(false); setAddingMember(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 24, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: colors.textPrimary, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.35)', whiteSpace: 'nowrap' }}>
                <span>👤</span> Thêm thành viên
              </button>
            )}
            <button type="button" onClick={() => { setFabOpen(false); onAction?.('addExpense', { groupId: d.id }); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 24, background: colors.brand, border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.35)', whiteSpace: 'nowrap' }}>
              <span>✏️</span> Thêm chi tiêu
            </button>
          </div>
        </div>
      )}
      <TabBar active="groups" onChange={(k) => onAction?.('tab', k)} onFab={() => setFabOpen(f => !f)} />
      {savingAction && (
        <div role="status" aria-live="polite" style={loadingOverlayStyle}>
          <LoadingSpinner />
          <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
        </div>
      )}
    </PhoneFrame>
  );
}

function GroupManagementPanel({ inviteCode, onShare, onCopyInviteCode }) {
  return (
    <Card style={{ marginTop: 10, padding: 11 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1px', color: colors.textMuted, textTransform: 'uppercase', minWidth: 0 }}>
          Quản lý nhóm
        </div>
        <button type="button" onClick={onShare} style={groupActionStyle('brand')}>🔗 Chia sẻ link mời</button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 8,
        marginTop: 9,
      }}>
        <span style={{ fontSize: 11, color: colors.textSecondary }}>Mã mời</span>
        <span style={{
          minWidth: 0,
          padding: '5px 8px',
          borderRadius: 8,
          background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(251,191,36,0.25)',
          color: '#fcd34d',
          fontSize: 11,
          fontWeight: 900,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...type.mono,
        }}>{inviteCode || '--'}</span>
        <button type="button" onClick={onCopyInviteCode} style={compactCopyButtonStyle()}>Sao chép</button>
      </div>
    </Card>
  );
}

function groupActionStyle(tone) {
  const palette = tone === 'brand'
    ? ['rgba(99,102,241,0.14)', 'rgba(99,102,241,0.28)', '#c7d2fe']
    : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)', colors.textPrimary];
  return {
    minWidth: 0,
    padding: '10px 9px',
    borderRadius: 11,
    border: `1px solid ${palette[1]}`,
    background: palette[0],
    color: palette[2],
    fontSize: 11,
    fontWeight: 850,
    fontFamily: 'inherit',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
}

function compactCopyButtonStyle() {
  return {
    flexShrink: 0,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(99,102,241,0.28)',
    background: 'rgba(99,102,241,0.14)',
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: 850,
    fontFamily: 'inherit',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

function EmptyState({ title, sub }) {
  return (
    <Card style={{ marginTop: 10, textAlign: 'center', padding: '22px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 5, lineHeight: 1.45 }}>{sub}</div>
    </Card>
  );
}

function SummaryChipRow({ memberCount, expenseCount, totalSpent }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7, marginTop: 12 }}>
      <SummaryChip value={memberCount} label="Thành viên" tone={colors.textPrimary} />
      <SummaryChip value={expenseCount} label="Khoản chi" tone={colors.warning} />
      <SummaryChip value={formatVND(totalSpent)} label="Tổng chi" tone="#6ee7b7" />
    </div>
  );
}

function SummaryChip({ value, label, tone }) {
  return (
    <div style={{
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 3,
      padding: '8px 7px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.10)',
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 900,
        color: tone,
        lineHeight: 1.05,
        overflowWrap: 'anywhere',
        ...type.mono,
      }}>{value}</div>
      <div style={{
        fontSize: 7,
        fontWeight: 900,
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        color: 'rgba(226,232,240,0.72)',
        whiteSpace: 'nowrap',
      }}>{label}</div>
    </div>
  );
}

function HeroBalancePanel({ label, balance, tone, onOpen }) {
  const clickable = Boolean(onOpen);
  const handleKeyDown = (event) => {
    if (!clickable) return;
    if (event.key === 'Enter' || event.key === ' ') onOpen();
  };

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpen || undefined}
      onKeyDown={handleKeyDown}
      style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(112px, auto)',
      alignItems: 'end',
      gap: 12,
      marginTop: 10,
      padding: '12px 12px',
      borderRadius: 14,
      background: 'rgba(15,23,42,0.22)',
      border: '1px solid rgba(255,255,255,0.14)',
      cursor: clickable ? 'pointer' : 'default',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#fcd34d' }}>SỐ DƯ CỦA BẠN</div>
        <div style={{ marginTop: 7, fontSize: 12, fontWeight: 800, color: tone }}>{label}</div>
      </div>
      <div style={{ ...type.amountLg, ...type.mono, fontSize: 27, textAlign: 'right', lineHeight: 1.05, overflowWrap: 'anywhere', minWidth: 0 }}>
        {formatVND(Math.abs(balance || 0))}
      </div>
    </div>
  );
}

function BalanceRow({ row }) {
  const isDebt = row.amount < 0;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: row.color || 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 900,
        }}>{row.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{row.name}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {isDebt ? 'Cần nộp vào quỹ' : 'Quỹ cần bù lại'}
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: isDebt ? colors.danger : '#6ee7b7', ...type.mono }}>
          {isDebt ? '-' : '+'}{formatVND(Math.abs(row.amount))}
        </div>
      </div>
    </Card>
  );
}

function MemberRow({ member, isTreasurer, onOpen, onMore }) {
  const balance = Number(member.balance || 0);
  const balanceTone = balance < 0 ? colors.danger : balance > 0 ? '#6ee7b7' : colors.textSecondary;
  const balanceLabel = balance === 0 ? '0 đ' : `${balance > 0 ? '+' : '-'}${formatVND(Math.abs(balance))}`;
  return (
    <Card
      onClick={() => onOpen?.(member)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen?.(member);
      }}
      style={{
        cursor: 'pointer',
        padding: '11px 12px',
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(251,191,36,0.20)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar initial={member.initials} size={34} color={member.color} photoUrl={member.photoUrl} ring={false} style={{ borderRadius: 12 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</span>
            {member.role === 'treasurer' && <RolePill icon="💳" label="Thủ quỹ" />}
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: balanceTone, ...type.mono }}>
          {balanceLabel}
        </div>
        {isTreasurer && (
          <button type="button" aria-label={`Sửa ${member.name}`} onClick={(event) => { event.stopPropagation(); onMore?.(member); }} style={{
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
        )}
      </div>
      {safeArray(member.monthBreakdown).length > 0 && (
        <MonthBreakdown rows={member.monthBreakdown} />
      )}
    </Card>
  );
}

function RolePill({ icon, label }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 6px',
      borderRadius: 999,
      background: 'rgba(251,191,36,0.12)',
      border: '1px solid rgba(251,191,36,0.24)',
      color: '#fcd34d',
      fontSize: 9,
      fontWeight: 800,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 10 }}>{icon}</span>
      {label}
    </span>
  );
}

function MemberDetailContent({ member, isTreasurer, onAction, onClose, onEdit, onDelete }) {
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [memberActionsOpen, setMemberActionsOpen] = useState(false);const balance = Number(member.balance || 0);
  const summary = member.memberTransactionSummary || { owes: 0, advanced: 0, net: 0 };
  const transactions = member.memberTransactions || [];
  const visibleTransactions = transactions.filter(transaction => {
    const query = normalizeSearch(transactionSearch);
    const searchable = normalizeSearch(`${transaction.date} ${transaction.title} ${transaction.category} ${transaction.paidByName} ${transaction.status}`);
    const matchesSearch = !query || searchable.includes(query);
    const net = Number(transaction.netAmount || 0);
    const matchesFilter =
      transactionFilter === 'all' ||
      (transactionFilter === 'owes' && net < 0) ||
      (transactionFilter === 'advanced' && net > 0) ||
      (transactionFilter === 'settled' && net === 0);
    return matchesSearch && matchesFilter;
  });
  const balanceTone = balance < 0 ? colors.danger : balance > 0 ? '#6ee7b7' : colors.textSecondary;
  const balanceLabel = balance < 0 ? 'Cần nộp vào quỹ' : balance > 0 ? 'Quỹ cần bù lại' : '0';
  const balanceAmountLabel = balance === 0 ? '0 đ' : `${balance > 0 ? '+' : '-'}${formatVND(Math.abs(balance))}`;
  const memberShareKey = `${member.groupId || ''}:${member.id || ''}`;return (
    <div style={{ paddingBottom: '28px' }}>
      <Hero variant="emerald" glow={false} style={{ padding: 18, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Avatar initial={member.initials} size={56} color={member.color} photoUrl={member.photoUrl} ring style={{ border: '4px solid rgba(7,8,15,0.85)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {member.role === 'treasurer' && <Badge tone="warn">THỦ QUỸ</Badge>}
              <Badge tone="success">Thành viên</Badge>
            </div>
          </div>
        </div>
      </Hero>

      <Card accent="finance" style={{ marginTop: 12 }}>
        <SectionTitle>SỐ DƯ THÁNG NÀY</SectionTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 10, minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: balanceTone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...type.mono }}>{balanceAmountLabel}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: balanceTone, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right', flexShrink: 0 }}>{balanceLabel}</div>
        </div>
        <div style={{ height: 1, background: colors.borderSubtle, margin: '12px 0' }} />
        <BalanceBreakdownRow label="Cần trả" amount={summary.owes} tone={colors.danger} />
        <BalanceBreakdownRow label="Đã ứng" amount={summary.advanced} tone="#6ee7b7" />
        {safeArray(member.monthBreakdown).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <MonthBreakdown rows={member.monthBreakdown} />
          </div>
        )}
      </Card>

      {isTreasurer && (
        <Card style={{ marginTop: 12 }}>
          <SectionTitle>THÔNG TIN NHẬN HOÀN ỨNG</SectionTitle>
          <InfoLine label="Ngân hàng" value={member.bankName || 'Chưa cập nhật'} />
          <InfoLine label="Chủ tài khoản" value={member.bankAccountName || 'Chưa cập nhật'} />
          <InfoLine label="STK ngân hàng" value={member.bankAccount || 'Chưa cập nhật'} />
          {member.joinDate && <InfoLine label="Ngày tham gia" value={member.joinDate} />}
        </Card>
      )}

      <Card style={{ marginTop: 12 }}>
        <SectionTitle>GIAO DỊCH LIÊN QUAN</SectionTitle>
        <SearchInput
          value={transactionSearch}
          onChange={event => setTransactionSearch(event.target.value)}
          placeholder="Tìm tên, ngày, loại chi phí, người trả..."
          style={{ marginTop: 12 }}
        />
        <SubTabs
          items={[
            { key: 'all', label: 'Tất cả' },
            { key: 'owes', label: 'Cần trả' },
            { key: 'advanced', label: 'Đã ứng' },
          ]}
          active={transactionFilter}
          onChange={setTransactionFilter}
          style={{ marginTop: 10, marginBottom: 8 }}
        />
        {visibleTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {visibleTransactions.map(transaction => (
              <MemberTransactionRow
                key={transaction.id}
                transaction={transaction}
                onOpen={() => onAction?.('expenseDetail', { expenseId: transaction.id })}
              />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10 }}>Không có giao dịch phù hợp trong tháng này.</div>
        )}
      </Card>      {isTreasurer && (
        <Button
          variant="muted"
          style={{ marginTop: 12, width: '100%', fontSize: 13 }}
          onClick={() => setMemberActionsOpen(true)}
        >Tùy chọn khác</Button>
      )}

      {memberActionsOpen && (
        <BottomSheet title="Tùy chọn khác" onClose={() => setMemberActionsOpen(false)}>
          <div style={{ display: 'grid', gap: 10 }}>
            {isTreasurer && <ActionButton onClick={() => { setMemberActionsOpen(false); onEdit?.(); }}>Chỉnh sửa thông tin</ActionButton>}
            {isTreasurer && <ActionButton danger onClick={() => { setMemberActionsOpen(false); onDelete?.(); }}>Xóa khỏi nhóm</ActionButton>}
          </div>
        </BottomSheet>
      )}

    </div>
  );
}

function MonthBreakdown({ rows }) {
  return (
    <div style={{ display: 'grid', gap: 4, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.borderSubtle}` }}>
      {safeArray(rows).map(row => {
        const amount = Number(row.amount) || 0;
        const tone = amount < 0 ? colors.danger : amount > 0 ? '#6ee7b7' : colors.textSecondary;
        const label = amount === 0 ? '0 đ' : `${amount > 0 ? '+' : '-'}${formatVND(Math.abs(amount))}`;
        return (
          <div key={row.month || row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: colors.textSecondary }}>
            <span>{row.label || row.month}</span>
            <span style={{ color: tone, fontWeight: 850, ...type.mono }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BalanceBreakdownRow({ label, amount, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', minWidth: 0 }}>
      <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: tone, whiteSpace: 'nowrap', ...type.mono }}>{formatVND(Math.abs(Number(amount) || 0))}</span>
    </div>
  );
}

function MemberTransactionRow({ transaction, onOpen }) {
  const net = Number(transaction.netAmount || 0);
  const tone = net < 0 ? colors.danger : net > 0 ? '#6ee7b7' : colors.textSecondary;
  const label = net < 0 ? `-${formatVND(Math.abs(net))}` : net > 0 ? `+${formatVND(net)}` : '0 đ';
  const roleLabel = transaction.role === 'payer' ? 'Đã ứng' : 'Cần trả';
  const roleTone = transaction.role === 'payer' ? '#6ee7b7' : colors.danger;
  const statusLabel = transactionStatusLabel(transaction.status);
  const statusTone = transactionStatusTone(transaction.status);
  return (
    <button type="button" onClick={onOpen} style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 0',
      borderBottom: `1px solid ${colors.borderSubtle}`,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      background: 'transparent',
      color: colors.textPrimary,
      fontFamily: 'inherit',
      textAlign: 'left',
      cursor: 'pointer',
    }}>
      <div style={{
        width: 48,
        padding: '6px 0',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.055)',
        border: `1px solid ${colors.borderSubtle}`,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: 900,
        textAlign: 'center',
        flexShrink: 0,
      }}>{transaction.date}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transaction.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
          <TransactionPill label={roleLabel} tone={roleTone} />
          <TransactionPill label={statusLabel} tone={statusTone} />
          <span style={{ fontSize: 10, color: colors.textSecondary }}>{transaction.paidByName} trả</span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color: tone, ...type.mono }}>{label}</div>
    </button>
  );
}

function TransactionPill({ label, tone }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 7px',
      borderRadius: 999,
      background: `${tone}1A`,
      border: `1px solid ${tone}33`,
      color: tone,
      fontSize: 9,
      fontWeight: 900,
      lineHeight: 1,
    }}>{label}</span>
  );
}

function transactionStatusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'pending') return 'Chờ duyệt';
  if (value === 'approved') return 'Đã duyệt';
  if (value === 'rejected' || value === 'declined') return 'Từ chối';
  return status || 'Mới';
}

function transactionStatusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'pending') return '#93c5fd';
  if (value === 'approved') return '#c4b5fd';
  if (value === 'rejected' || value === 'declined') return colors.danger;
  return colors.textSecondary;
}

function MemberPaidTransactionRow({ transaction }) {
  return <MemberTransactionRow transaction={transaction} />;
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: '2px',
      color: colors.textMuted,
      textTransform: 'uppercase',
    }}>{children}</div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      padding: '13px 0',
      borderBottom: `1px solid ${colors.borderSubtle}`,
    }}>
      <div style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 800 }}>{label}</div>
      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function AddMemberEditor({ title, groupId, candidates = [], currentMembers = [], onClose, onAction }) {
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [query, setQuery] = useState('');
  const [savingAction, setSavingAction] = useState('');
  const cleanQuery = query.trim();
  const normalizedQuery = normalizeSearch(cleanQuery);
  const selectedCandidates = candidates.filter(candidate => selectedCandidateIds.includes(String(candidate.id)));
  const visibleCandidates = candidates.filter(candidate => {
    if (!normalizedQuery) return true;
    return normalizeSearch(candidate.name).includes(normalizedQuery);
  });
  const isDuplicateCurrent = Boolean(cleanQuery && currentMembers.some(m => normalizeSearch(m.name) === normalizedQuery));
  const canAddNewName = Boolean(cleanQuery && visibleCandidates.length === 0 && !isDuplicateCurrent);
  const totalToAdd = selectedCandidates.length + (canAddNewName ? 1 : 0);

  function toggleCandidate(candidateId) {
    const id = String(candidateId);
    setSelectedCandidateIds(current => (
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    ));
  }

  async function save(e) {
    e.preventDefault();
    if (totalToAdd === 0 || savingAction) return;
    setSavingAction('addMember');
    try {
      for (const candidate of selectedCandidates) {
        if (candidate.isInactive) {
          await onAction?.('reactivateMember', {
            memberId: candidate.memberId || candidate.id,
            groupId,
            name: candidate.name,
            profileId: candidate.profileId || '',
          });
          continue;
        }
        await onAction?.('addExpenseGroupMember', {
          groupId,
          memberId: candidate.memberId || candidate.id,
          name: candidate.name,
          profileId: candidate?.profileId || candidate?.id || '',
          type: 'fixed',
        });
      }
      if (canAddNewName) {
        await onAction?.('addExpenseGroupMember', {
          groupId,
          name: cleanQuery,
          profileId: '',
          type: 'fixed',
        });
      }
      onClose?.();
    } finally {
      setSavingAction('');
    }
  }

  const newMemberLabel = canAddNewName ? '+ Thêm "' + cleanQuery + '" vào nhóm' : ''
  const actionLabel = canAddNewName && selectedCandidates.length === 0
    ? newMemberLabel
    : totalToAdd > 0 ? 'Thêm ' + totalToAdd + ' thành viên' : 'Thêm thành viên';

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form onSubmit={save}>
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Tìm hoặc nhập tên thành viên"
          style={{ marginTop: 12 }}
        />

        {(() => {
          const inactiveCandidates = visibleCandidates.filter(c => c.isInactive);
          const pickleballCandidates = visibleCandidates.filter(c => !c.isInactive && c.isPickleball);
          const regularCandidates = visibleCandidates.filter(c => !c.isInactive && !c.isPickleball);
          const sectionCount = [inactiveCandidates, pickleballCandidates, regularCandidates].filter(g => g.length > 0).length;

          function renderCandidateBtn(candidate) {
            const id = String(candidate.id);
            const selected = selectedCandidateIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCandidate(id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: selected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                  border: selected ? '1px solid rgba(99,102,241,0.45)' : `1px solid ${colors.borderSubtle}`,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 18 }}>{candidate.isInactive ? '↩️' : candidate.isPickleball ? '🏓' : '👤'}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.name}</span>
                    {candidate.isInactive && <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: colors.textSecondary }}>Thêm lại vào nhóm</span>}
                  </span>
                </span>
                <span style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, background: selected ? colors.brand : 'rgba(255,255,255,0.08)', color: selected ? '#fff' : colors.textMuted, fontSize: 13, fontWeight: 900 }}>{selected ? '✓' : ''}</span>
              </button>
            );
          }

          function renderSection(label, items) {
            if (items.length === 0) return null;
            return (
              <div key={label}>
                {sectionCount > 1 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, padding: '6px 2px 4px' }}>{label}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(renderCandidateBtn)}
                </div>
              </div>
            );
          }

          return (
            <div style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: sectionCount > 1 ? 12 : 8, paddingRight: 2 }}>
              {renderSection('Thêm lại', inactiveCandidates)}
              {renderSection('Pickleball 🏓', pickleballCandidates)}
              {renderSection('Thành viên', regularCandidates)}
              {isDuplicateCurrent && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: colors.danger, fontSize: 13, fontWeight: 700 }}>
                  "{cleanQuery}" đã là thành viên trong nhóm.
                </div>
              )}
              {visibleCandidates.length === 0 && !canAddNewName && !isDuplicateCurrent && (
                <div style={{ padding: '18px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>Không có thành viên phù hợp.</div>
              )}
            </div>
          );
        })()}

        <Button block variant="brand" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} type="submit" disabled={savingAction === 'addMember' || (totalToAdd === 0 && !canAddNewName)}>
          {savingAction === 'addMember' && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'pickleballLoadingSpin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
          {savingAction === 'addMember' ? 'Đang lưu…' : actionLabel}
        </Button>
      </form>
    </BottomSheet>
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

function EditMemberEditor({ title, member, onClose, onAction }) {
  const [savingAction, setSavingAction] = useState('');
  const [name, setName] = useState(member?.name || '');
  const [bankAccountName, setBankAccountName] = useState(member?.bankAccountName || '');
  const [bankName, setBankName] = useState(member?.bankName || '');
  const [bankAccount, setBankAccount] = useState(member?.bankAccount || '');

  async function save(e) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || savingAction) return;
    setSavingAction('editMember');
    try {
      await onAction?.('editMember', {
      memberId: member.id,
      name: cleanName,
      bankAccountName: bankAccountName.trim(),
      bankName,
      bankAccount: bankAccount.trim(),
      });
      onClose?.();
    } finally {
      setSavingAction('');
    }
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Tên hiển thị" value={name} onChange={setName} autoFocus />
        <Field label="Tên tài khoản" value={bankAccountName} onChange={setBankAccountName} placeholder="Tên trên tài khoản ngân hàng" />
        <BankSelect value={bankName} onChange={setBankName} />
        <Field label="Số tài khoản" value={bankAccount} onChange={setBankAccount} inputMode="numeric" placeholder="Chưa cập nhật" />
        <Button block variant="brand" style={{ marginTop: 14 }} type="submit" disabled={savingAction === 'editMember'}>{savingAction === 'editMember' ? 'Đang lưu…' : 'Lưu thành viên'}</Button>
      </form>
    </BottomSheet>
  );
}

function CandidateSelect({ value, candidates, onChange }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>Người đã có trong nhóm khác</div>
      <select value={value} onChange={event => onChange(event.target.value)} style={fieldStyle()}>
        <option value="">Chọn từ danh sách cũ</option>
        {candidates.map(candidate => (
          <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value, onChange, autoFocus, maxLength, inputMode, placeholder }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>{label}</div>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        onInput={event => onChange(event.target.value)}
        autoFocus={autoFocus}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        style={fieldStyle()}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>{label}</div>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        onInput={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          ...fieldStyle(),
          resize: 'vertical',
          minHeight: 82,
          lineHeight: 1.45,
        }}
      />
    </label>
  );
}

function GroupTypePicker({ value, options, onChange }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>Chọn loại nhóm</div>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '4px 0 2px',
        scrollbarWidth: 'none',
      }}>
        {options.map(option => {
          const active = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              style={{
                minWidth: 108,
                flex: '0 0 auto',
                display: 'grid',
                gridTemplateColumns: '24px minmax(0, 1fr)',
                alignItems: 'center',
                gap: 8,
                borderRadius: 12,
                padding: '10px 12px',
                background: active ? 'rgba(52,211,153,0.18)' : colors.inputBg,
                border: active ? `2px solid ${colors.pickleball}` : `1px solid ${colors.borderSubtle}`,
                color: active ? '#d1fae5' : colors.textSecondary,
                fontFamily: 'inherit',
                cursor: 'pointer',
                boxShadow: active ? '0 0 12px rgba(52,211,153,0.2)' : 'none',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{option.emoji}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' }}>{option.label}</span>
                <span style={{ display: 'block', fontSize: 9, color: colors.textMuted, marginTop: 2, whiteSpace: 'nowrap' }}>{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BankSelect({ value, onChange }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>Ngân hàng</div>
      <select value={value} onChange={event => onChange(event.target.value)} style={fieldStyle()}>
        <option value="">Chọn ngân hàng</option>
        {VN_BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
      </select>
    </label>
  );
}

function fieldStyle() {
  return {
    width: '100%',
    padding: '13px 14px',
    background: colors.inputBg,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: 12,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    outline: 'none',
  };
}

function PendingExpenseCard({ expense, onApprove, onReject }) {
  return (
    <ListCard style={{ padding: 14, borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.title}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            {expense.submittedByName || 'Thành viên'} gửi · {formatDayLabel(expense.date)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 8, ...type.mono }}>{formatVND(expense.amount)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 92, flexShrink: 0 }}>
          <Button variant="primary" style={{ padding: '9px 8px', fontSize: 12, background: '#22c55e', color: '#052e16' }} onClick={onApprove}>Duyệt</Button>
          <Button variant="danger" style={{ padding: '9px 8px', fontSize: 12 }} onClick={onReject}>Từ chối</Button>
        </div>
      </div>
    </ListCard>
  );
}

function PendingStatusAlert({ count, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%',
      marginTop: 12,
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid rgba(245,158,11,0.35)',
      background: 'rgba(245,158,11,0.10)',
      color: '#fcd34d',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'inherit',
      cursor: 'pointer',
      textAlign: 'left',
    }}>
      <span style={{ fontSize: 18 }}>⏳</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>Đang chờ duyệt · {count} chi tiêu</span>
        <span style={{ display: 'block', fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Thủ quỹ sẽ duyệt trước khi tính vào số dư nhóm</span>
      </span>
      <span style={{ color: colors.textMuted, fontSize: 18 }}>›</span>
    </button>
  );
}

function ActivityCard({ item, isTreasurer, currentMemberId, onAction, onMenu }) {
  const iconBg = {
    food:  'rgba(245,158,11,0.12)',
    cafe:  'rgba(167,139,250,0.12)',
    veg:   'rgba(52,211,153,0.12)',
  }[item.category] || 'rgba(255,255,255,0.06)';
  const isOwnPending = item.submittedBy === currentMemberId && item.status === 'pending';
  const canManage = isTreasurer || isOwnPending;
  return (
    <ListCard
      role="button"
      tabIndex={0}
      onClick={() => onAction?.('viewExpense', { expenseId: item.id })}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onAction?.('viewExpense', { expenseId: item.id });
      }}
      style={{ padding: 16, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>{item.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{item.sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', ...type.mono }}>{formatVND(item.amount)}</div>
              {canManage && (
                <button type="button" aria-label={`Sửa ${item.title}`} onClick={(event) => { event.stopPropagation(); onMenu?.(item); }} style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  border: `1px solid ${colors.borderSubtle}`,
                  background: colors.inputBg,
                  color: colors.textSecondary,
                  fontSize: 18,
                  lineHeight: 1,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}>⋯</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {item.tags.map((t, i) => <Badge key={i} tone={t.tone}>{t.label}</Badge>)}
            {!isTreasurer && isOwnPending && <Badge tone="warn">Chờ duyệt</Badge>}
          </div>
        </div>
      </div>
    </ListCard>
  );
}

function formatDayLabel(date) {
  if (!date) return 'Không rõ ngày';
  return String(date).slice(8, 10) && String(date).slice(5, 7)
    ? `${String(date).slice(8, 10)}/${String(date).slice(5, 7)}`
    : String(date);
}

const DEMO = {
  name: 'Ăn trưa thứ Bảy',
  memberCount: 6,
  balance: -45000,
  balanceLabel: 'Nợ Minh 45.000 đ',
  activitiesByWeek: [
    { label: 'Tuần này', items: [
      { id: 1, icon: '🍜', category: 'food', title: 'Bún bò Huế Phở 24', sub: 'Minh trả · 16/05 · Trưa', amount: 270000,
        tags: [{ tone: 'muted', label: 'Chia đều · 6 người' }, { tone: 'warn', label: '⏳ Đang chờ' }] },
      { id: 2, icon: '☕', category: 'cafe', title: 'Cafe Highlands', sub: 'Long trả · 16/05 · Sáng', amount: 180000,
        tags: [{ tone: 'muted', label: 'Chia tuỳ chỉnh' }, { tone: 'success', label: '✓ Đã chia' }] },
    ]},
    { label: 'Tuần trước · 09/05 – 15/05', items: [
      { id: 3, icon: '🥗', category: 'veg', title: 'Salad chay', sub: 'Hoa trả · 10/05', amount: 220000,
        tags: [{ tone: 'success', label: '✓ Đã thanh toán' }] },
    ]},
  ],
};
