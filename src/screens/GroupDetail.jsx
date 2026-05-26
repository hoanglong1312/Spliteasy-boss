// Spliteasy Boss — Chi tiết nhóm (tab Hoạt động)
// Props: data { name, balance, you, activitiesByWeek[] }, isTreasurer

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Button, Badge, SubTabs, Avatar,
  ModuleHero, ActionButton, SearchInput, SectionHeader, StatGrid, ListCard, BottomSheet,
  MemberPicker, Stat,
} from '../primitives';
import { BANK_LIST, generateQRUrl } from '../lib/vietqr.js';

const VN_BANKS = ['Vietcombank', 'Techcombank', 'BIDV', 'Vietinbank', 'MB Bank', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'MSB', 'Agribank', 'HDBank'];
const GROUP_EMOJI_OPTIONS = [
  '🍜','🥘','☕','🍺','✈️','🚗',
  '🏖','🏨','🎮','🎵','💼','🏠',
  '🎯','🎲','💰','👥','🏓','🏸',
];

export default function GroupDetail({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const canManageMembers = Boolean(isTreasurer || d.isGroupCreator);
  const canAddMembers = true;
  const [activeTab, setActiveTab] = useState('members');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(d.name || '');
  const [groupEmoji, setGroupEmoji] = useState(d.emoji || '👥');
  const [groupDescription, setGroupDescription] = useState(d.description || '');
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberMenu, setMemberMenu] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [expenseMenu, setExpenseMenu] = useState(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const pendingExpenses = d.pendingExpenses || [];
  const visibleMembers = (d.members || []).filter(member => {
    const query = normalizeSearch(memberSearch);
    if (!query) return true;
    return normalizeSearch(`${member.name} ${member.bankName} ${member.bankAccount}`).includes(query);
  });

  function closeMemberSheets() {
    setAddingMember(false);
    setEditingMember(null);
    setMemberMenu(null);
  }

  async function saveGroup(e) {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    await onAction?.('editGroup', {
      id: d.id,
      name,
      emoji: groupEmoji || '👥',
      description: groupDescription.trim(),
      color: d.color || '#574EFA',
    });
    setEditingGroup(false);
  }

  async function deleteGroup() {
    await onAction?.('deleteGroup', { groupId: d.id });
    setDeleteConfirmGroup(false);
  }

  return (
    <PhoneFrame>
      {selectedMember ? (
          <MemberDetailPanel
            groupName={d.name}
            member={selectedMember}
            isTreasurer={canManageMembers}
            onAction={onAction}
            onBack={() => setSelectedMember(null)}
          onEdit={() => { setEditingMember(selectedMember); setSelectedMember(null); }}
          onDelete={() => {
            setDeleteConfirmMember(selectedMember);
            setSelectedMember(null);
          }}
        />
      ) : (
      <Screen>
        {/* Nav header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: colors.textMuted, textTransform: 'uppercase' }}>NHÓM</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{d.name}</div>
          </div>
          <div style={{ position: 'relative' }}>
            <IconButton onClick={() => setMenuOpen(open => !open)}>⋯</IconButton>
            {menuOpen && (
              <Card style={{
                position: 'absolute',
                right: 0,
                top: 58,
                width: 190,
                padding: 8,
                zIndex: 20,
                boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
              }}>
                <MenuItem onClick={() => { setMenuOpen(false); setEditingGroup(true); }}>Sửa thông tin nhóm</MenuItem>
                <MenuItem onClick={() => { setMenuOpen(false); onAction?.('join', { groupId: d.id }); }}>Mã mời thành viên</MenuItem>
                {isTreasurer && <MenuItem danger onClick={() => { setMenuOpen(false); setDeleteConfirmGroup(true); }}>Xóa nhóm</MenuItem>}
              </Card>
            )}
          </div>
        </div>

        <ModuleHero
          tone="groups"
          eyebrow="CHI TIÊU NHÓM"
          title={d.name}
          subtitle={`${d.memberCount || (d.members || []).length} thành viên · ${d.monthLabel || 'Tháng này'}`}
          action={<div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'rgba(251,191,36,0.14)',
            border: '1px solid rgba(251,191,36,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>{d.emoji || '👥'}</div>}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#fcd34d' }}>SỐ DƯ CỦA BẠN</div>
              <div style={{
                display: 'inline-flex', gap: 6, marginTop: 10, padding: '5px 10px',
                borderRadius: 100, background: 'rgba(248,113,113,0.18)',
                border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5',
                fontSize: 11, fontWeight: 600,
              }}>{d.balanceLabel}</div>
            </div>
            <div style={{ ...type.amountLg, ...type.mono, textAlign: 'right', lineHeight: 1 }}>{formatVND(d.balance)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Button variant="primary" style={{ flex: 1, padding: '12px 8px', fontSize: 12, color: '#7c2d12' }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>+ Thêm chi tiêu</Button>
            <Button variant="ghost"   style={{ flex: 1, padding: '12px 8px', fontSize: 12 }} onClick={() => onAction?.('settle', { groupId: d.id })}>⚡ Tất toán</Button>
          </div>
        </ModuleHero>

        <StatGrid style={{ marginTop: 12 }}>
          <Stat value={d.memberCount || (d.members || []).length} label="Thành viên" accent="groups" />
          <Stat value={(d.activitiesByWeek || []).reduce((sum, week) => sum + (week.items || []).length, 0)} label="Chi tiêu" color={colors.warning} />
          <Stat value={formatVND(Math.abs(d.balance || 0))} label="Số dư" color={(d.balance || 0) < 0 ? colors.danger : colors.success} />
        </StatGrid>

        {/* Treasurer actions */}
        {isTreasurer && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{
              flex: 1, padding: '11px 12px', borderRadius: 12,
              background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 600, color: '#c7d2fe', cursor: 'pointer',
            }} onClick={() => onAction?.('closeMonth', { groupId: d.id })}>
              <span style={{ fontSize: 14 }}>🔒</span> Chốt sổ tháng
            </div>
            <div style={{
              padding: '11px 12px', borderRadius: 12,
              background: colors.inputBg, border: `1px solid ${colors.borderSubtle}`,
              fontSize: 11, fontWeight: 600, color: colors.textSecondary,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>
              <span>＋</span> Thêm
            </div>
          </div>
        )}

        {isTreasurer && pendingExpenses.length > 0 && (
          <ReviewAlert count={pendingExpenses.length} onClick={() => setActiveTab('activity')} />
        )}

        <SubTabs
          items={[
            { key: 'members',  label: `Thành viên · ${d.memberCount}` },
            { key: 'activity', label: 'Hoạt động' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

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
                      onApprove={() => onAction?.('approveExpense', { expenseId: expense.id })}
                      onReject={() => onAction?.('rejectExpense', { expenseId: expense.id })}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {canAddMembers && (
              <Button variant="ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setAddingMember(true)}>
                + Thêm thành viên
              </Button>
            )}
            <SearchInput
              value={memberSearch}
              onChange={event => setMemberSearch(event.target.value)}
              placeholder="Tìm thành viên..."
            />
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
      </Screen>
      )}

      {editingGroup && (
        <BottomSheet title="Sửa thông tin nhóm" onClose={() => setEditingGroup(false)}>
          <form onSubmit={saveGroup}>
            <Field label="Tên nhóm" value={groupName} onChange={setGroupName} autoFocus />
            <EmojiPicker value={groupEmoji} onChange={setGroupEmoji} />
            <TextArea label="Mô tả nhóm" value={groupDescription} onChange={setGroupDescription} placeholder="Ví dụ: Ăn uống sau giờ chơi, đi du lịch, cafe..." />
            <Button block variant="brand" style={{ marginTop: 14 }} type="submit">Lưu nhóm</Button>
          </form>
        </BottomSheet>
      )}

      {addingMember && (
        <AddMemberEditor
          title="Thêm thành viên"
          groupId={d.id}
          candidates={d.memberCandidates || []}
          isPickleball={d.isPickleball}
          onClose={closeMemberSheets}
          onAction={onAction}
        />
      )}

      {deleteConfirmGroup && (
        <BottomSheet title="Xóa nhóm?" onClose={() => setDeleteConfirmGroup(false)}>
          <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginTop: 8 }}>
            Dữ liệu nhóm sẽ được ẩn khỏi danh sách nhóm. Các giao dịch cũ không bị xóa khỏi DB.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmGroup(false)}>Hủy</Button>
            <Button type="button" variant="danger" onClick={deleteGroup}>Xác nhận</Button>
          </div>
        </BottomSheet>
      )}

      {memberMenu && canManageMembers && (
        <BottomSheet title={memberMenu.name} onClose={() => setMemberMenu(null)}>
          <ActionButton onClick={() => { setEditingMember(memberMenu); setMemberMenu(null); }}>Sửa thành viên</ActionButton>
          <ActionButton onClick={async () => {
            const role = memberMenu.role === 'treasurer' ? 'member' : 'treasurer';
            if (!window.confirm(role === 'treasurer' ? `Cấp quyền thủ quỹ cho ${memberMenu.name}?` : `Thu quyền thủ quỹ của ${memberMenu.name}?`)) return;
            await onAction?.('setMemberRole', { memberId: memberMenu.id, role });
            setMemberMenu(null);
          }}>{memberMenu.role === 'treasurer' ? 'Thu quyền thủ quỹ' : 'Cấp quyền thủ quỹ'}</ActionButton>
          <ActionButton danger onClick={() => {
            setDeleteConfirmMember(memberMenu);
            setMemberMenu(null);
          }}>Xóa khỏi nhóm</ActionButton>
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
            <Button variant="danger" onClick={async () => {
              await onAction?.('deleteExpense', { expenseId: deleteConfirmExpense.id });
              setDeleteConfirmExpense(null);
            }}>Xác nhận</Button>
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
              onClick={async () => {
                await onAction?.('removeMemberFromGroup', { memberId: deleteConfirmMember.id, groupId: d.id });
                setDeleteConfirmMember(null);
              }}
            >Xác nhận</Button>
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

      {!selectedMember && <TabBar active="groups" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />}
    </PhoneFrame>
  );
}

function MenuItem({ children, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '11px 10px',
        border: 'none',
        borderRadius: 8,
        background: 'transparent',
        color: danger ? colors.danger : colors.textPrimary,
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, sub }) {
  return (
    <Card style={{ marginTop: 10, textAlign: 'center', padding: '22px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 5, lineHeight: 1.45 }}>{sub}</div>
    </Card>
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
        <Avatar initial={member.initials} size={34} color={member.color} ring={false} style={{ borderRadius: 12 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
          {(member.isGroupCreator || member.role === 'treasurer') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              {member.isGroupCreator && <RolePill icon="👑" label="Trưởng nhóm" />}
              {member.role === 'treasurer' && <RolePill icon="💳" label="Thủ quỹ" />}
            </div>
          )}
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

function MemberDetailPanel({ groupName, member, isTreasurer, onAction, onBack, onEdit, onDelete }) {
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [billQrOpen, setBillQrOpen] = useState(false);
  const balance = Number(member.balance || 0);
  const summary = member.memberTransactionSummary || { owes: 0, advanced: 0, net: 0 };
  const transactions = member.memberTransactions || [];
  const visibleTransactions = transactions.filter(transaction => {
    const query = normalizeSearch(transactionSearch);
    const searchable = normalizeSearch(`${transaction.title} ${transaction.category} ${transaction.paidByName} ${transaction.status}`);
    const matchesSearch = !query || searchable.includes(query);
    const net = Number(transaction.netAmount || 0);
    const matchesFilter =
      transactionFilter === 'all' ||
      (transactionFilter === 'owes' && net < 0) ||
      (transactionFilter === 'advanced' && net > 0) ||
      (transactionFilter === 'settled' && net === 0);
    return matchesSearch && matchesFilter;
  });
  const paymentTarget = member.paymentTarget || {};
  const debtAmount = Math.max(0, Number(summary.owes || 0));
  const selectedBank = resolveBank(paymentTarget.bankName);
  const qrBankId = selectedBank?.id || paymentTarget.bankName || '';
  const canGenerateQr = Boolean(qrBankId && paymentTarget.bankAccount && paymentTarget.bankAccountName && debtAmount > 0);
  const [billYear, billMonth] = String(member.currentYearMonth || '').split('-');
  const qrDescription = `${member.name} - ${groupName} - Thang ${billMonth || new Date().getMonth() + 1}/${billYear || new Date().getFullYear()}`;
  const qrUrl = canGenerateQr ? generateQRUrl({
    bankId: qrBankId,
    account: paymentTarget.bankAccount,
    accountName: paymentTarget.bankAccountName,
    amount: debtAmount,
    description: qrDescription,
  }) : '';
  const balanceTone = balance < 0 ? colors.danger : balance > 0 ? '#6ee7b7' : colors.textSecondary;
  const balanceLabel = balance < 0 ? 'Cần nộp vào quỹ' : balance > 0 ? 'Quỹ cần bù lại' : 'Đang cân bằng';

  return (
    <Screen style={{ paddingBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 18px' }}>
        <IconButton onClick={onBack}>‹</IconButton>
        <div style={{ flex: 1, textAlign: 'center', paddingRight: 56 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '2px', color: '#34d399', textTransform: 'uppercase' }}>{groupName}</div>
          <div style={{ fontSize: 17, fontWeight: 900, marginTop: 3 }}>Chi tiết thành viên</div>
        </div>
      </div>

      <Hero variant="emerald" glow={false} style={{ padding: 22, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar initial={member.initials} size={74} color={member.color} ring style={{ border: '4px solid rgba(7,8,15,0.85)' }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{member.name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {member.role === 'treasurer' && <Badge tone="warn">Thủ quỹ</Badge>}
              <Badge tone="success">Thành viên</Badge>
            </div>
          </div>
        </div>
      </Hero>

      <Card style={{ marginTop: 14 }}>
        <SectionTitle>SỐ DƯ TRONG NHÓM</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 700 }}>{balanceLabel}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: balanceTone, marginTop: 4, ...type.mono }}>
              {balance === 0 ? '0 đ' : `${balance > 0 ? '+' : '-'}${formatVND(Math.abs(balance))}`}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <SectionTitle>TỔNG QUAN GIAO DỊCH</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <MiniBillStat label="Cần trả" value={summary.owes} tone={colors.danger} />
          <MiniBillStat label="Đã ứng" value={summary.advanced} tone="#6ee7b7" />
          <MiniBillStat label="Net" value={summary.net} tone={summary.net < 0 ? colors.danger : summary.net > 0 ? '#6ee7b7' : colors.textSecondary} signed />
        </div>
      </Card>

      {isTreasurer && (
        <Card style={{ marginTop: 14 }}>
          <SectionTitle>THÔNG TIN THANH TOÁN</SectionTitle>
          <InfoLine label="Ngân hàng" value={member.bankName || 'Chưa cập nhật'} />
          <InfoLine label="Chủ tài khoản" value={member.bankAccountName || 'Chưa cập nhật'} />
          <InfoLine label="STK ngân hàng" value={member.bankAccount || 'Chưa cập nhật'} />
          {member.joinDate && <InfoLine label="Ngày tham gia" value={member.joinDate} />}
        </Card>
      )}

      <Card style={{ marginTop: 14 }}>
        <SectionTitle>GIAO DỊCH LIÊN QUAN</SectionTitle>
        <SearchInput
          value={transactionSearch}
          onChange={event => setTransactionSearch(event.target.value)}
          placeholder="Tìm giao dịch, loại chi phí, người trả..."
          style={{ marginTop: 12 }}
        />
        <SubTabs
          items={[
            { key: 'all', label: 'Tất cả' },
            { key: 'owes', label: 'Cần trả' },
            { key: 'advanced', label: 'Đã ứng' },
            { key: 'settled', label: 'Cân bằng' },
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
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <Button
          variant="muted"
          style={{ fontSize: 13 }}
          onClick={() => onAction?.('createMemberBillShare', { groupId: member.groupId, memberId: member.id })}
        >Chia sẻ link</Button>
        <Button variant="success" style={{ fontSize: 13 }} onClick={() => setBillQrOpen(true)}>Tạo QR thanh toán</Button>
      </div>

      {isTreasurer && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <Button variant="brand" style={{ fontSize: 13 }} onClick={onEdit}>Chỉnh sửa thông tin</Button>
          <Button variant="danger" style={{ fontSize: 13 }} onClick={onDelete}>Xóa khỏi nhóm</Button>
        </div>
      )}

      {billQrOpen && (
        <BottomSheet title="QR thanh toán" onClose={() => setBillQrOpen(false)}>
          {canGenerateQr ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <img src={qrUrl} alt="QR thanh toán" style={{ width: 220, height: 220, borderRadius: 12, background: 'white' }} />
              <div style={{ fontSize: 24, fontWeight: 900, color: colors.danger, ...type.mono }}>{formatVND(debtAmount)}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{paymentTarget.bankAccountName} · {paymentTarget.bankAccount}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{qrDescription}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>
                Cập nhật thông tin thanh toán của thủ quỹ và đảm bảo thành viên đang có số tiền cần trả.
              </div>
              <Button variant="brand" onClick={() => onAction?.('settings')}>Cập nhật thông tin thanh toán</Button>
            </div>
          )}
        </BottomSheet>
      )}
    </Screen>
  );
}

function MiniBillStat({ label, value, tone, signed = false }) {
  const amount = Number(value || 0);
  const prefix = signed && amount > 0 ? '+' : signed && amount < 0 ? '-' : '';
  return (
    <div style={{ padding: 10, borderRadius: 12, background: colors.inputBg, border: `1px solid ${colors.borderSubtle}` }}>
      <div style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 900, color: tone, ...type.mono }}>{prefix}{formatVND(Math.abs(amount))}</div>
    </div>
  );
}

function MemberTransactionRow({ transaction, onOpen }) {
  const net = Number(transaction.netAmount || 0);
  const tone = net < 0 ? colors.danger : net > 0 ? '#6ee7b7' : colors.textSecondary;
  const label = net < 0 ? `-${formatVND(Math.abs(net))}` : net > 0 ? `+${formatVND(net)}` : '0 đ';
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
      <div style={{ width: 42, color: colors.textSecondary, fontSize: 11, fontWeight: 800 }}>{transaction.date}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transaction.title}</div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
          {transaction.role === 'payer' ? 'Đã ứng' : 'Cần trả'} · {transaction.paidByName} trả · {transaction.status}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color: tone, ...type.mono }}>{label}</div>
    </button>
  );
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

function AddMemberEditor({ title, groupId, candidates = [], isPickleball = false, onClose, onAction }) {
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [inactiveCandidateQuery, setInactiveCandidateQuery] = useState('');
  const [activeCandidateQuery, setActiveCandidateQuery] = useState('');
  const [name, setName] = useState('');
  const selectedCandidates = candidates.filter(candidate => selectedCandidateIds.includes(String(candidate.id)));
  const inactiveCandidates = candidates.filter(candidate => candidate.isInactive);
  const activeCandidates = candidates.filter(candidate => !candidate.isInactive);
  const inactiveCandidateCards = inactiveCandidates.map(candidate => ({
    ...candidate,
    selected: selectedCandidateIds.includes(String(candidate.id)),
  }));
  const activeCandidateCards = activeCandidates.map(candidate => ({
    ...candidate,
    selected: selectedCandidateIds.includes(String(candidate.id)),
  }));

  async function save(e) {
    e.preventDefault();
    const cleanName = name.trim();
    if (selectedCandidates.length === 0 && !cleanName) return;
    for (const candidate of selectedCandidates) {
      if (candidate.isInactive) {
        await onAction?.('reactivateMember', { memberId: candidate.memberId || candidate.id, groupId });
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
    if (cleanName) {
      await onAction?.('addExpenseGroupMember', {
        groupId,
        name: cleanName,
        profileId: '',
        type: 'fixed',
      });
    }
    onClose?.();
  }

  function toggleCandidate(candidateId) {
    const id = String(candidateId);
    setSelectedCandidateIds(current => (
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    ));
  }

  const actionLabel = selectedCandidates.length > 0
    ? `Thêm ${selectedCandidates.length + (name.trim() ? 1 : 0)} thành viên`
    : 'Thêm thành viên';

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form onSubmit={save}>
        {inactiveCandidateCards.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <MemberPicker
              aria-label="Danh sách chờ thêm lại"
              candidates={inactiveCandidateCards}
              selectedIds={selectedCandidateIds}
              query={inactiveCandidateQuery}
              onQueryChange={setInactiveCandidateQuery}
              onToggle={toggleCandidate}
              sectionTitle="Danh sách chờ thêm lại"
              placeholder="Tìm vài ký tự để lọc thành viên"
              emptyText="Không có thành viên phù hợp."
              tone="groups"
            />
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <MemberPicker
            aria-label="Thành viên có sẵn"
            candidates={activeCandidateCards}
            selectedIds={selectedCandidateIds}
            query={activeCandidateQuery}
            onQueryChange={setActiveCandidateQuery}
            onToggle={toggleCandidate}
            sectionTitle="Thành viên có sẵn"
            placeholder="Tìm vài ký tự để lọc thành viên"
            emptyText="Không có thành viên phù hợp."
            tone="groups"
            maxListHeight={220}
          />
        </div>
        <Field
          label={candidates.length > 0 ? 'Hoặc nhập tên mới' : 'Tên hiển thị'}
          value={name}
          onChange={setName}
          autoFocus
          placeholder="Tên thành viên"
        />
        <Button block variant="brand" style={{ marginTop: 14 }} type="submit">{actionLabel}</Button>
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

function resolveBank(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return BANK_LIST.find(bank => (
    bank.id.toLowerCase() === normalized ||
    bank.shortName.toLowerCase() === normalized ||
    bank.name.toLowerCase() === normalized
  )) || null;
}

function EditMemberEditor({ title, member, onClose, onAction }) {
  const [name, setName] = useState(member?.name || '');
  const [bankAccountName, setBankAccountName] = useState(member?.bankAccountName || '');
  const [bankName, setBankName] = useState(member?.bankName || '');
  const [bankAccount, setBankAccount] = useState(member?.bankAccount || '');

  async function save(e) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    await onAction?.('editMember', {
      memberId: member.id,
      name: cleanName,
      bankAccountName: bankAccountName.trim(),
      bankName,
      bankAccount: bankAccount.trim(),
    });
    onClose?.();
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Tên hiển thị" value={name} onChange={setName} autoFocus />
        <Field label="Tên tài khoản" value={bankAccountName} onChange={setBankAccountName} placeholder="Tên trên tài khoản ngân hàng" />
        <BankSelect value={bankName} onChange={setBankName} />
        <Field label="Số tài khoản" value={bankAccount} onChange={setBankAccount} inputMode="numeric" placeholder="Chưa cập nhật" />
        <Button block variant="brand" style={{ marginTop: 14 }} type="submit">Lưu thành viên</Button>
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
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>{label}</div>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
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

function EmojiPicker({ value, options = GROUP_EMOJI_OPTIONS, onChange }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        marginBottom: 6,
      }}>Chọn biểu tượng</div>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '2px 0 4px',
        scrollbarWidth: 'none',
      }}>
        {options.map(icon => {
          const active = icon === value;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => onChange(icon)}
              style={{
                width: 40,
                height: 40,
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: active ? 'rgba(251,191,36,0.16)' : colors.inputBg,
                border: active ? '2px solid rgba(251,191,36,0.62)' : `1px solid ${colors.borderSubtle}`,
                color: colors.textPrimary,
                fontSize: 20,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >{icon}</button>
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

function ReviewAlert({ count, onClick }) {
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
        <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>Cần duyệt · {count} chi tiêu</span>
        <span style={{ display: 'block', fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Bấm để mở danh sách chờ duyệt</span>
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
    <ListCard style={{ padding: 16 }}>
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
