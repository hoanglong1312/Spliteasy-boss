// Spliteasy Boss — Pickleball · Chi tiết thành viên

import React, { useState } from 'react';
import { colors, type, formatVND, radius } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Avatar, Badge, Button, Input,
  BottomSheet,
} from '../primitives';

const VN_BANKS = ['Vietcombank', 'Techcombank', 'BIDV', 'Vietinbank', 'MB Bank', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'MSB', 'Agribank', 'HDBank'];

export default function MemberDetail({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const canViewBank = Boolean(isTreasurer || d.isCurrentUser);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(d.name || '');
  const [editBankAccountName, setEditBankAccountName] = useState(d.bankAccountName || '');
  const [editBankName, setEditBankName] = useState(d.bankName || '');
  const [editBankAccount, setEditBankAccount] = useState(d.bankAccount || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!d) {
    return (
      <PhoneFrame>
        <Screen style={{ background: colors.pageBg }}>
          <IconButton onClick={() => onAction?.('back')} style={{ marginTop: 12 }}>‹</IconButton>
          <Card style={{ marginTop: 16 }}>Không tìm thấy thành viên</Card>
        </Screen>
      </PhoneFrame>
    );
  }

  async function saveEdit(e) {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return;
    await onAction?.('editMember', {
      memberId: d.id,
      name,
      bankAccountName: editBankAccountName.trim(),
      bankName: editBankName,
      bankAccount: editBankAccount.trim(),
    });
    setEditing(false);
  }

  async function switchType() {
    await onAction?.('setMemberType', {
      memberId: d.id,
      type: d.type === 'casual' ? 'fixed' : 'casual',
      groupId: d.groupId,
    });
  }

  async function toggleRole() {
    const role = d.role === 'treasurer' ? 'member' : 'treasurer';
    if (!window.confirm(role === 'treasurer'
      ? `Cấp quyền Thủ quỹ cho ${d.name}?`
      : `Thu quyền Thủ quỹ của ${d.name}?`)) return;
    await onAction?.('setMemberRole', {
      memberId: d.id,
      groupId: d.groupId,
      role,
    });
  }

  async function confirmDeleteMember() {
    await onAction?.('removePickleballMember', { memberId: d.id, groupId: d.groupId });
    setShowDeleteConfirm(false);
    onAction?.('back');
  }

  return (
    <PhoneFrame>
      <Screen style={{ background: colors.pageBg }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ ...type.label, color: colors.pickleball }}>{d.clubName}</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>Chi tiết thành viên</div>
          </div>
          <span style={{ width: 38 }} />
        </div>

        <div style={{
          background: colors.heroEmerald,
          border: '1px solid rgba(52,211,153,0.35)',
          borderRadius: radius.hero,
          padding: 18,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: -42,
            right: -48,
            width: 170,
            height: 170,
            background: 'radial-gradient(circle, rgba(52,211,153,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'center' }}>
            <Avatar initial={d.initial} size={56} color={d.color} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 900,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{d.name}</div>
                <span style={{ fontSize: 20 }}>{d.rank?.icon}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {d.role === 'treasurer' && <Badge tone="warn">THỦ QUỸ</Badge>}
                <Badge tone={d.type === 'fixed' ? 'success' : 'brand'}>{d.typeLabel}</Badge>
                <Badge tone={d.rank?.tone || 'muted'}>{d.rank?.label}</Badge>
              </div>
            </div>
          </div>
        </div>

        <Card accent="pickleball" style={{ marginTop: 12 }}>
          <CardTitle>Điểm danh tháng này</CardTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
            <div style={{ fontSize: 34, fontWeight: 900, ...type.mono }}>{d.attendance.percentage}%</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: progressColor(d.attendance.percentage) }}>
              {d.rank?.icon} {d.rank?.label}
            </div>
          </div>
          <ProgressBar value={d.attendance.percentage} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            <MiniStat label="Có mặt" value={d.attendance.attended} color={colors.success} />
            <MiniStat label="Vắng" value={d.attendance.missed} color={colors.danger} />
            <MiniStat label="Tổng buổi" value={d.attendance.total} color={colors.textPrimary} />
          </div>
        </Card>

        <Card accent="finance" style={{ marginTop: 12 }}>
          <CardTitle>Số dư tháng này</CardTitle>
          <MoneyRow label="Tiền sân" amount={d.balance.courtFee} />
          <MoneyRow label="Tiền nước" amount={d.balance.waterFee} />
          <MoneyRow label="Phụ phát sinh" amount={d.balance.extras} />
          {(d.balance.ticketShare || d.balance.p2pBalance) && (
            <MoneyRow label="Vé lẻ" amount={(d.balance.ticketShare || 0) - (d.balance.p2pBalance || 0)} />
          )}
          <div style={{ height: 1, background: colors.borderSubtle, margin: '10px 0' }} />
          <MoneyRow label="Tổng còn nợ" amount={d.balance.totalOwed} strong />
        </Card>

        <Card style={{ marginTop: 12 }}>
          <CardTitle>Thông tin</CardTitle>
          <InfoRow label="Ngày tham gia" value={d.joinDate || 'Chưa rõ'} />
          <InfoRow label="Ngân hàng" value={canViewBank ? d.bankName || 'Chưa cập nhật' : 'Ẩn với thành viên khác'} />
          <InfoRow label="Chủ tài khoản" value={canViewBank ? d.bankAccountName || 'Chưa cập nhật' : 'Ẩn với thành viên khác'} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 700 }}>STK ngân hàng</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {canViewBank ? d.bankAccount || 'Chưa cập nhật' : 'Ẩn với thành viên khác'}
              </div>
            </div>
            {canViewBank && d.bankAccount && <button type="button" onClick={() => onAction?.('copyAccount', { account: d.bankAccount })} style={smallButtonStyle()}>
              Copy
            </button>}
          </div>
          {isTreasurer && (
            <Button block variant="ghost" style={{ marginTop: 10, fontSize: 13 }} onClick={() => {
              setEditName(d.name || '');
              setEditBankAccountName(d.bankAccountName || '');
              setEditBankName(d.bankName || '');
              setEditBankAccount(d.bankAccount || '');
              setEditing(true);
            }}>✏️ Sửa</Button>
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <CardTitle>Tháng này đã thanh toán</CardTitle>
          {(d.payerTransactions || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {d.payerTransactions.map(transaction => (
                <PaidTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10 }}>Chưa đứng ra thanh toán khoản nào trong tháng này.</div>
          )}
        </Card>

        {isTreasurer && (
          <Card style={{ marginTop: 12 }}>
            <CardTitle>Quản lý</CardTitle>
            <Button block variant="ghost" style={{ marginTop: 10, fontSize: 13 }} onClick={switchType}>
              ↔️ {d.type === 'casual' ? 'Chuyển thành Cố định' : 'Chuyển sang Vãng lai'}
            </Button>
            <Button block variant="ghost" style={{ marginTop: 8, fontSize: 13 }} onClick={toggleRole}>
              👑 {d.role === 'treasurer' ? 'Thu quyền Thủ quỹ' : 'Cấp quyền Thủ quỹ'}
            </Button>
            <Button block variant="danger" style={{ marginTop: 8, fontSize: 13 }} onClick={() => setShowDeleteConfirm(true)}>
              🗑 Xoá khỏi nhóm
            </Button>
          </Card>
        )}
      </Screen>

      {editing && isTreasurer && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>Sửa thông tin</div>
              <button type="button" onClick={() => setEditing(false)} style={{
                border: 'none',
                background: 'transparent',
                color: colors.textSecondary,
                fontSize: 20,
                cursor: 'pointer',
              }}>×</button>
            </div>
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
          </div>
        </div>
      )}

      {showDeleteConfirm && isTreasurer && (
        <BottomSheet title="Xóa thành viên?" onClose={() => setShowDeleteConfirm(false)}>
          <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginTop: 8 }}>
            Thành viên sẽ được ẩn khỏi danh sách nhóm. Bạn có thể thêm lại sau.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
            <Button type="button" variant="danger" onClick={confirmDeleteMember}>Xác nhận</Button>
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}

function CardTitle({ children }) {
  return (
    <div style={{ ...type.label, color: colors.textSecondary }}>{children}</div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ height: 10, borderRadius: 100, overflow: 'hidden', background: colors.inputBg, marginTop: 10 }}>
      <div style={{
        width: `${Math.max(Math.min(value, 100), 0)}%`,
        height: '100%',
        background: progressColor(value),
      }} />
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 12,
      padding: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color, ...type.mono }}>{value}</div>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MoneyRow({ label, amount, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: strong ? '4px 0 0' : '10px 0 0' }}>
      <span style={{ fontSize: strong ? 13 : 12, color: strong ? colors.textPrimary : colors.textSecondary, fontWeight: strong ? 900 : 700 }}>
        {label}
      </span>
      <span style={{ fontSize: strong ? 16 : 13, fontWeight: 900, color: strong ? colors.danger : colors.textPrimary, ...type.mono }}>
        {formatVND(amount || 0)}
      </span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${colors.borderSubtle}` }}>
      <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function PaidTransactionRow({ transaction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${colors.borderSubtle}` }}>
      <div style={{ width: 40, fontSize: 11, fontWeight: 800, color: colors.textSecondary }}>{transaction.date}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transaction.title}</div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{transaction.source} · {transaction.status}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, ...type.mono }}>{formatVND(transaction.amount || 0)}</div>
    </div>
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

function smallButtonStyle() {
  return {
    border: `1px solid ${colors.borderSubtle}`,
    background: colors.inputBg,
    color: colors.pickleball,
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
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

function progressColor(value) {
  if (value >= 65) return colors.success;
  if (value >= 45) return colors.warning;
  return colors.danger;
}

const DEMO = {
  clubName: 'CLB Pickleball',
  id: 1,
  name: 'Long',
  initial: 'L',
  role: 'treasurer',
  type: 'fixed',
  typeLabel: 'Cố định',
  joinDate: 'Thứ Tư · 01/05/2026',
  bankName: 'Vietcombank',
  bankAccountName: 'Nguyen Long',
  bankAccount: '1234567890',
  rank: { icon: '🔥', label: 'Siêu chăm', tone: 'success' },
  attendance: { attended: 11, missed: 2, total: 13, percentage: 85 },
  balance: { courtFee: 220000, waterFee: 45000, extras: 20000, totalOwed: 285000 },
};
