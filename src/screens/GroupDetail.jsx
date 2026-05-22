// Spliteasy Boss — Chi tiết nhóm (tab Hoạt động)
// Props: data { name, balance, you, activitiesByWeek[] }, isTreasurer

import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Hero, Card, Button, Badge, SubTabs,
} from '../primitives';

const VN_BANKS = ['Vietcombank', 'Techcombank', 'BIDV', 'Vietinbank', 'MB Bank', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'MSB', 'Agribank', 'HDBank'];

export default function GroupDetail({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const [activeTab, setActiveTab] = useState('activity');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(d.name || '');
  const [groupEmoji, setGroupEmoji] = useState(d.emoji || '👥');
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberMenu, setMemberMenu] = useState(null);

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
      color: d.color || '#574EFA',
    });
    setEditingGroup(false);
  }

  async function deleteGroup() {
    if (!window.confirm(`Xóa nhóm ${d.name}? Dữ liệu sẽ được ẩn khỏi danh sách nhóm.`)) return;
    await onAction?.('deleteGroup', { groupId: d.id });
  }

  return (
    <PhoneFrame>
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
                {isTreasurer && <MenuItem danger onClick={() => { setMenuOpen(false); deleteGroup(); }}>Xóa nhóm</MenuItem>}
              </Card>
            )}
          </div>
        </div>

        {/* Balance hero */}
        <Hero variant="amber">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#fcd34d' }}>
            SỐ DƯ CỦA BẠN
          </div>
          <div style={{ ...type.amountLg, marginTop: 6, ...type.mono }}>{formatVND(d.balance)}</div>
          <div style={{
            display: 'inline-flex', gap: 6, marginTop: 10, padding: '5px 10px',
            borderRadius: 100, background: 'rgba(248,113,113,0.18)',
            border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5',
            fontSize: 11, fontWeight: 600,
          }}>{d.balanceLabel}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Button variant="primary" style={{ flex: 1, padding: '12px 8px', fontSize: 12, color: '#7c2d12' }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>+ Thêm chi tiêu</Button>
            <Button variant="ghost"   style={{ flex: 1, padding: '12px 8px', fontSize: 12 }} onClick={() => onAction?.('settle', { groupId: d.id })}>⚡ Tất toán</Button>
          </div>
        </Hero>

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

        <SubTabs
          items={[
            { key: 'activity', label: 'Hoạt động' },
            { key: 'balances', label: 'Số dư' },
            { key: 'members',  label: `Thành viên · ${d.memberCount}` },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'activity' && d.activitiesByWeek.map(week => (
          <React.Fragment key={week.label}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase', margin: '8px 0',
            }}>{week.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {week.items.map(it => <ActivityCard key={it.id} item={it} />)}
            </div>
          </React.Fragment>
        ))}
        {activeTab === 'activity' && d.activitiesByWeek.length === 0 && (
          <EmptyState title="Chưa có chi tiêu" sub="Bấm Thêm chi tiêu để ghi khoản đầu tiên của nhóm này." />
        )}

        {activeTab === 'balances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(d.balanceRows || []).length > 0 ? d.balanceRows.map(row => (
              <BalanceRow key={row.id} row={row} />
            )) : (
              <EmptyState title="Đang cân bằng" sub="Nhóm chưa có khoản nào cần nộp hoặc được quỹ bù." />
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isTreasurer && (
              <Button variant="ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setAddingMember(true)}>
                + Thêm thành viên
              </Button>
            )}
            {(d.members || []).map(member => (
              <MemberRow
                key={member.id}
                member={member}
                isTreasurer={isTreasurer}
                onMore={setMemberMenu}
              />
            ))}
            {(d.members || []).length === 0 && (
              <EmptyState title="Chưa có thành viên" sub="Thêm thành viên để bắt đầu chia chi phí nhóm." />
            )}
          </div>
        )}
      </Screen>

      {editingGroup && (
        <BottomSheet title="Sửa thông tin nhóm" onClose={() => setEditingGroup(false)}>
          <form onSubmit={saveGroup}>
            <Field label="Tên nhóm" value={groupName} onChange={setGroupName} autoFocus />
            <Field label="Biểu tượng" value={groupEmoji} onChange={setGroupEmoji} maxLength={2} />
            <Button block variant="brand" style={{ marginTop: 14 }} type="submit">Lưu nhóm</Button>
          </form>
        </BottomSheet>
      )}

      {addingMember && (
        <MemberEditor
          title="Thêm thành viên"
          groupId={d.id}
          onClose={closeMemberSheets}
          onAction={onAction}
        />
      )}

      {memberMenu && isTreasurer && (
        <BottomSheet title={memberMenu.name} onClose={() => setMemberMenu(null)}>
          <ActionButton onClick={() => { setEditingMember(memberMenu); setMemberMenu(null); }}>Sửa thành viên</ActionButton>
          <ActionButton onClick={async () => {
            const role = memberMenu.role === 'treasurer' ? 'member' : 'treasurer';
            if (!window.confirm(role === 'treasurer' ? `Cấp quyền thủ quỹ cho ${memberMenu.name}?` : `Thu quyền thủ quỹ của ${memberMenu.name}?`)) return;
            await onAction?.('setMemberRole', { memberId: memberMenu.id, role });
            setMemberMenu(null);
          }}>{memberMenu.role === 'treasurer' ? 'Thu quyền thủ quỹ' : 'Cấp quyền thủ quỹ'}</ActionButton>
          <ActionButton danger onClick={async () => {
            if (!window.confirm(`Xóa ${memberMenu.name} khỏi nhóm?`)) return;
            await onAction?.('deleteMember', { memberId: memberMenu.id });
            setMemberMenu(null);
          }}>Xóa thành viên</ActionButton>
        </BottomSheet>
      )}

      {editingMember && (
        <MemberEditor
          title="Sửa thành viên"
          member={editingMember}
          groupId={d.id}
          onClose={closeMemberSheets}
          onAction={onAction}
        />
      )}

      <TabBar active="groups" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
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

function MemberRow({ member, isTreasurer, onMore }) {
  const bankLabel = member.bankName && member.bankAccount
    ? `${member.bankName} · ${maskAccount(member.bankAccount)}`
    : 'Chưa có thông tin ngân hàng';
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: member.color || 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 900,
        }}>{member.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{member.name}</div>
            {member.role === 'treasurer' && <Badge tone="warn">THỦ QUỸ</Badge>}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {bankLabel}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: member.balance < 0 ? colors.danger : member.balance > 0 ? '#6ee7b7' : colors.textSecondary, ...type.mono }}>
          {member.balance === 0 ? '0 đ' : `${member.balance > 0 ? '+' : '-'}${formatVND(Math.abs(member.balance))}`}
        </div>
        {isTreasurer && (
          <button type="button" aria-label={`Sửa ${member.name}`} onClick={() => onMore?.(member)} style={{
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

function MemberEditor({ title, member, groupId, onClose, onAction }) {
  const [name, setName] = useState(member?.name || '');
  const [bankAccountName, setBankAccountName] = useState(member?.bankAccountName || '');
  const [bankName, setBankName] = useState(member?.bankName || '');
  const [bankAccount, setBankAccount] = useState(member?.bankAccount || '');

  async function save(e) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    if (member?.id) {
      await onAction?.('editMember', {
        memberId: member.id,
        name: cleanName,
        bankAccountName: bankAccountName.trim(),
        bankName,
        bankAccount: bankAccount.trim(),
      });
    } else {
      await onAction?.('addMember', { groupId, name: cleanName, type: 'fixed', bankAccountName: bankAccountName.trim(), bankName, bankAccount: bankAccount.trim() });
    }
    onClose?.();
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Tên hiển thị" value={name} onChange={setName} autoFocus />
        <Field label="Tên tài khoản" value={bankAccountName} onChange={setBankAccountName} placeholder="Tên trên tài khoản ngân hàng" />
        <BankSelect value={bankName} onChange={setBankName} />
        <Field label="Số tài khoản" value={bankAccount} onChange={setBankAccount} inputMode="numeric" placeholder="Chưa cập nhật" />
        <Button block variant="brand" style={{ marginTop: 14 }} type="submit">{member?.id ? 'Lưu thành viên' : 'Thêm thành viên'}</Button>
      </form>
    </BottomSheet>
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

function maskAccount(value) {
  const text = String(value || '').replace(/\s+/g, '');
  if (text.length <= 4) return text;
  return `${text.slice(0, 4)} •••• ${text.slice(-3)}`;
}

function ActivityCard({ item }) {
  const iconBg = {
    food:  'rgba(245,158,11,0.12)',
    cafe:  'rgba(167,139,250,0.12)',
    veg:   'rgba(52,211,153,0.12)',
  }[item.category] || 'rgba(255,255,255,0.06)';
  return (
    <Card>
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
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', ...type.mono }}>{formatVND(item.amount)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {item.tags.map((t, i) => <Badge key={i} tone={t.tone}>{t.label}</Badge>)}
          </div>
        </div>
      </div>
    </Card>
  );
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
