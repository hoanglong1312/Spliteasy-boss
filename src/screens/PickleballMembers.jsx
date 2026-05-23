// Spliteasy Boss — Pickleball · Thành viên

import React, { useMemo, useState } from 'react';
import { colors, type, radius } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, Card, Badge, SubTabs, Avatar, Stat, Button, Input,
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
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberType, setNewMemberType] = useState('fixed');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  const fixedMembers = d.fixedMembers || d.members || [];
  const casualMembers = d.casualMembers || d.guests || [];
  const memberCandidates = d.memberCandidates || [];
  const selectedCandidates = memberCandidates.filter(candidate => selectedCandidateIds.includes(String(candidate.id)));
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
    if (!editingMember || !name) return;
    await onAction?.('editMember', {
      memberId: editingMember.id,
      name,
      bankAccountName: editBankAccountName.trim(),
      bankName: editBankName,
      bankAccount: editBankAccount.trim(),
    });
    setEditingMember(null);
  }

  async function saveNewMember(e) {
    e.preventDefault();
    const name = newMemberName.trim();
    if (selectedCandidates.length === 0 && !name) return;
    for (const candidate of selectedCandidates) {
      await onAction?.('addMember', {
        name: candidate.name,
        profileId: candidate?.profileId || candidate?.id || '',
        type: newMemberType,
        bankAccountName: candidate?.bankAccountName || '',
        bankName: candidate?.bankName || '',
        bankAccount: candidate?.bankAccount || '',
      });
    }
    if (name) {
      await onAction?.('addMember', { name, profileId: '', type: newMemberType });
    }
    setNewMemberName('');
    setNewMemberType('fixed');
    setCandidateQuery('');
    setSelectedCandidateIds([]);
    setShowAddMember(false);
  }

  function toggleCandidate(candidateId) {
    const id = String(candidateId);
    setSelectedCandidateIds(current => (
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    ));
  }

  async function changeType(member) {
    const type = member.type === 'casual' ? 'fixed' : 'casual';
    setQuickActionMember(null);
    await onAction?.('setMemberType', { memberId: member.id, type });
  }

  async function changeRole(member) {
    const role = member.role === 'treasurer' ? 'member' : 'treasurer';
    setQuickActionMember(null);
    if (!window.confirm(role === 'treasurer'
      ? `Cấp quyền Thủ quỹ cho ${member.name}?`
      : `Thu quyền Thủ quỹ của ${member.name}?`)) return;
    await onAction?.('setMemberRole', { memberId: member.id, role });
  }

  async function deleteMember(member) {
    setQuickActionMember(null);
    if (!window.confirm(`Xóa ${member.name} khỏi nhóm?`)) return;
    await onAction?.('deleteMember', { memberId: member.id });
  }

  return (
    <PhoneFrame>
      <Screen style={{ background: colors.pageBg }}>
        <div style={{
          background: colors.heroEmerald,
          border: `1px solid rgba(52,211,153,0.35)`,
          borderRadius: radius.hero,
          padding: 18,
          marginTop: 8,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: -44,
            right: -48,
            width: 170,
            height: 170,
            background: 'radial-gradient(circle, rgba(52,211,153,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...type.label, color: colors.pickleball }}>CLB PICKLEBALL · {d.clubName}</div>
              <h1 style={{ ...type.title, margin: '4px 0 0' }}>Thành viên</h1>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
                {d.monthLabel}
              </div>
            </div>
            {isTreasurer && (
              <button type="button" onClick={() => setShowAddMember(true)} style={{
                border: 'none',
                borderRadius: 12,
                background: colors.textPrimary,
                color: '#064e3b',
                padding: '10px 12px',
                fontSize: 12,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
                flexShrink: 0,
              }}>+ Thêm</button>
            )}
          </div>
        </div>

        <SubTabs
          items={[
            { key: 'overview',  label: 'Tổng quan' },
            { key: 'calendar',  label: 'Buổi đánh' },
            { key: 'members',   label: 'Thành viên' },
          ]}
          active="members"
          onChange={(key) => onAction?.('subTab', key)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          <Stat value={d.stats?.permanent || fixedMembers.length} label="Cố định" accent="pickleball" />
          <Stat value={d.stats?.casual || casualMembers.length} label="Vãng lai" color={colors.warning} />
          <Stat value={d.stats?.total || fixedMembers.length + casualMembers.length} label="Tổng" color={colors.textPrimary} />
        </div>

        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên"
          style={{ marginBottom: 14 }}
          inputStyle={{ fontSize: 13, padding: '12px 14px' }}
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
            <div style={{
              background: colors.heroEmerald,
              border: `1px solid rgba(52,211,153,0.28)`,
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}>
              <div style={{ ...type.label, color: colors.pickleball, marginBottom: 8 }}>Thành viên có sẵn</div>
              <input
                value={candidateQuery}
                onChange={e => setCandidateQuery(e.target.value)}
                placeholder="Tìm vài ký tự để lọc thành viên"
                style={{ ...selectFieldStyle(), marginBottom: 10 }}
              />
              {selectedCandidates.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {selectedCandidates.map(candidate => (
                    <span key={candidate.id} style={{
                      borderRadius: 999,
                      background: colors.successSoft,
                      color: colors.pickleball,
                      padding: '6px 9px',
                      fontSize: 11,
                      fontWeight: 900,
                    }}>{candidate.name}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                {filteredCandidateCards.map(candidate => {
                  const active = selectedCandidateIds.includes(String(candidate.id));
                  return (
                    <button key={candidate.id} type="button" onClick={() => toggleCandidate(candidate.id)} style={{
                      display: 'grid',
                      gridTemplateColumns: '24px minmax(0, 1fr)',
                      gap: 10,
                      alignItems: 'center',
                      width: '100%',
                      border: `1px solid ${active ? 'rgba(52,211,153,0.55)' : colors.borderSubtle}`,
                      borderRadius: 12,
                      background: active ? colors.successSoft : colors.inputBg,
                      color: colors.textPrimary,
                      padding: 12,
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}>
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: 8,
                        border: active ? 'none' : `1px solid ${colors.borderSubtle}`,
                        background: active ? colors.pickleball : 'transparent',
                        color: '#06281f',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 900,
                      }}>{active ? '✓' : ''}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{candidate.name}</span>
                        <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                          {candidate.bankName && candidate.bankAccount ? `${candidate.bankName} · ${maskAccount(candidate.bankAccount)}` : 'Chưa cập nhật ngân hàng'}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {filteredCandidateCards.length === 0 && (
                  <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 2px' }}>Không có thành viên phù hợp.</div>
                )}
              </div>
            </div>
            <Input
              label={memberCandidates.length > 0 ? 'Hoặc nhập tên mới' : 'Tên'}
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              placeholder="Tên thành viên"
              autoFocus
            />
            <TypeSwitch value={newMemberType} onChange={setNewMemberType} />
            <Button block variant="success" style={{ marginTop: 14 }} type="submit">
              {selectedCandidates.length > 0 ? `Lưu ${selectedCandidates.length + (newMemberName.trim() ? 1 : 0)} thành viên` : 'Lưu thành viên'}
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
            <Button block variant="success" style={{ marginTop: 14 }} type="submit">Lưu thay đổi</Button>
          </form>
        </BottomSheet>
      )}

      <TabBar active="pickleball" onChange={(key) => onAction?.('tab', key)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function filterMembers(members, query) {
  if (!query) return members;
  return members.filter(member => String(member.name || '').toLowerCase().includes(query));
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
  const pct = Number(member.progressPct) || 0;
  const rank = member.rank || {};
  const barColor = progressColor(pct);

  return (
    <button type="button" onClick={() => onAction?.('memberDetail', { memberId: member.id })} style={{
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
      <Avatar initial={member.initial} size={34} color={member.color} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{member.name}</span>
          <span style={{ fontSize: 13, flexShrink: 0 }}>{rank.icon || member.rankIcon}</span>
          {member.isTreasurer && <Badge tone="warn" style={{ padding: '2px 6px', fontSize: 9 }}>THỦ QUỸ</Badge>}
        </div>
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
    </button>
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

function ActionButton({ children, danger, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%',
      border: `1px solid ${danger ? 'rgba(248,113,113,0.24)' : colors.borderSubtle}`,
      borderRadius: 12,
      background: danger ? colors.dangerSoft : colors.inputBg,
      color: danger ? colors.danger : colors.textPrimary,
      padding: '12px 14px',
      marginTop: 8,
      textAlign: 'left',
      fontSize: 13,
      fontWeight: 800,
      fontFamily: 'inherit',
      cursor: 'pointer',
    }}>{children}</button>
  );
}

function BottomSheet({ title, children, onClose }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 30,
      background: 'rgba(0,0,0,0.50)',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 12,
    }}>
      <div style={{
        width: '100%',
        background: colors.shellBg,
        border: `1px solid ${colors.borderNormal}`,
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{title}</div>
          <button type="button" onClick={onClose} style={{
            border: 'none',
            background: 'transparent',
            color: colors.textSecondary,
            fontSize: 20,
            cursor: 'pointer',
          }}>×</button>
        </div>
        {children}
      </div>
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
