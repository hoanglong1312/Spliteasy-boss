// Spliteasy Boss — Chốt sổ tháng (thủ quỹ)
// Props: data { groupName, monthLabel, totalSpent, totalPaid, sessionsCount,
//                expenseCount, categories[], members[], remainingCount }

import React from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Button, Badge, Avatar, SectionLabel,
} from '../primitives';

const STATUS_BADGE = {
  paid:    { tone: 'success', label: '✓ Đã trả' },
  unpaid:  { tone: 'danger',  label: '⏳ Chưa trả' },
  notified:{ tone: 'warn',    label: '📩 Đã nhắc' },
};

export default function SettlementPeriod({ data, onAction }) {
  const d = data || DEMO;
  const profileBills = d.profileBills || [];
  const paidPct = Math.round((d.totalPaid / d.totalSpent) * 100);
  const remaining = d.members.filter((m) => m.status !== 'paid').length;

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase',
            }}>Thủ quỹ · {d.groupName}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Chốt sổ {d.monthLabel}</div>
              <Badge tone="warn">⏳ Chưa chốt</Badge>
            </div>
          </div>
          <IconButton onClick={() => onAction?.('more')}>⋯</IconButton>
        </div>

        {/* Hero amber */}
        <div style={{
          background: colors.heroAmber,
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 20, padding: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
            <HeroStat label="TỔNG CHI" amount={d.totalSpent}
              color="#fca5a5" sub={`${d.expenseCount} khoản · ${d.sessionsCount} buổi`} />
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <HeroStat label="ĐÃ THANH TOÁN" amount={d.totalPaid}
              color="#6ee7b7" sub={`${paidPct}% hoàn tất`} />
          </div>
          {/* Progress bar */}
          <div style={{
            marginTop: 14, height: 6, borderRadius: 100,
            background: 'rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: `${paidPct}%`, height: '100%',
              background: 'linear-gradient(90deg,#34d399,#fbbf24)',
              borderRadius: 100,
            }} />
          </div>
        </div>

        {/* Categories */}
        <SectionLabel>Phân loại khoản chi</SectionLabel>
        <Card style={{ padding: '14px 16px' }}>
          {/* Stacked bar */}
          <div style={{
            height: 12, borderRadius: 6, overflow: 'hidden',
            display: 'flex', background: 'rgba(0,0,0,0.3)', marginBottom: 14,
          }}>
            {d.categories.map((c, i) => (
              <div key={i} style={{ flex: c.amount, background: c.color }} />
            ))}
          </div>
          {d.categories.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{c.label}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, ...type.mono }}>{formatVND(c.amount)}</div>
            </div>
          ))}
        </Card>

        <ProfileBillList bills={profileBills} />

        {/* Per member balance */}
        <SectionLabel action="cần thu">Số dư từng người · {d.members.length}</SectionLabel>

        <Card style={{ padding: '6px 14px' }}>
          {d.members.slice(0, d.previewLimit || 5).map((m, i) => (
            <MemberRow key={i} member={m} />
          ))}
          {d.members.length > (d.previewLimit || 5) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 10, fontSize: 11, color: colors.brandLight, fontWeight: 700,
              letterSpacing: '0.3px', cursor: 'pointer',
            }} onClick={() => onAction?.('expandMembers')}>
              + {d.members.length - (d.previewLimit || 5)} thành viên khác · {remaining - 1} chưa trả
            </div>
          )}
        </Card>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button block variant="ghost" style={{ fontSize: 12 }} onClick={() => onAction?.('exportCsv')}>
            📊 Xuất CSV
          </Button>
          <Button block variant="ghost" style={{ fontSize: 12 }} onClick={() => onAction?.('remindAll')}>
            📩 Nhắc {remaining} người
          </Button>
        </div>

        {/* Warning */}
        <div style={{
          marginTop: 10, padding: '12px 14px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 12, display: 'flex', gap: 10,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 11, color: '#fcd34d', fontWeight: 500, lineHeight: 1.5 }}>
            Sau khi chốt sổ, <strong>không thể sửa</strong> các khoản chi {d.monthLabel.toLowerCase()}.
            Còn <strong>{remaining} người</strong> chưa thanh toán đủ — họ sẽ chuyển sang quỹ nợ.
          </div>
        </div>

        <Button block variant="brand" style={{ marginTop: 10 }} onClick={() => onAction?.('confirmClose')}>
          🔒 Xác nhận chốt sổ
        </Button>
      </Screen>
    </PhoneFrame>
  );
}

function ProfileBillList({ bills }) {
  if (!bills.length) return null;
  return (
    <>
      <SectionLabel>Bill tổng theo người</SectionLabel>
      <Card style={{ padding: '6px 14px' }}>
        {bills.map((bill, index) => {
          const amount = Number(bill.amount) || 0;
          const isPositive = amount > 0;
          return (
            <div key={bill.profileId || index} style={{
              padding: '12px 0',
              borderBottom: index === bills.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar initial={bill.initials || bill.initial} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{bill.name}</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{bill.sub}</div>
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: isPositive ? '#34d399' : '#f87171',
                  ...type.mono,
                }}>{isPositive ? '+' : ''}{formatVND(amount)}</div>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                {bill.sources.map((source, sourceIndex) => {
                  const sourceAmount = Number(source.amount) || 0;
                  return (
                    <div key={`${source.sourceType}-${source.sourceId || source.sourceLabel}-${sourceIndex}`} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 11,
                      color: colors.textSecondary,
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {source.sourceType === 'pickleball' ? '🏸' : '👥'} {source.sourceLabel}
                      </span>
                      <span style={{ flexShrink: 0, color: sourceAmount < 0 ? '#fca5a5' : '#6ee7b7', ...type.mono }}>
                        {sourceAmount > 0 ? '+' : ''}{formatVND(sourceAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}

function HeroStat({ label, amount, color, sub }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#fcd34d',
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 900, letterSpacing: '-1px',
        marginTop: 6, color, ...type.mono,
      }}>{formatVND(amount)}</div>
      <div style={{ fontSize: 10, color: '#fcd34d', opacity: 0.7, marginTop: 4, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function MemberRow({ member }) {
  const isPositive = member.balance > 0;
  const badge = STATUS_BADGE[member.status];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
    }}>
      <Avatar initial={member.initial} size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
          {member.name}
          {member.isTreasurer && (
            <span style={{
              fontSize: 9, color: '#fcd34d', fontWeight: 700, marginLeft: 4,
              background: 'rgba(251,191,36,0.12)', padding: '1px 5px',
              borderRadius: 5, letterSpacing: '0.3px',
            }}>👑</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{member.sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isPositive ? '#34d399' : '#f87171',
          letterSpacing: '-0.2px', ...type.mono,
        }}>{isPositive ? '+' : ''}{member.balance.toLocaleString('vi-VN')}</div>
        {badge && <Badge tone={badge.tone} style={{ marginTop: 3 }}>{badge.label}</Badge>}
      </div>
    </div>
  );
}

const DEMO = {
  groupName: 'CLB Cầu Giấy',
  monthLabel: 'Tháng 5/2026',
  totalSpent: 3620000,
  totalPaid:  2830000,
  sessionsCount: 13,
  expenseCount: 42,
  categories: [
    { label: '🏸 Tiền sân',         amount: 3120000, color: '#6366f1' },
    { label: '💧 Tiền nước (8 buổi)', amount:  320000, color: '#34d399' },
    { label: '🎟️ Vé lẻ (4 buổi)',    amount:  600000, color: '#fbbf24' },
    { label: '📦 Phụ kiện',          amount:  180000, color: '#a78bfa' },
  ],
  previewLimit: 5,
  members: [
    { initial: 'M', name: 'Minh', sub: 'Đã chuyển khoản VietQR', balance:  285000, status: 'paid' },
    { initial: 'H', name: 'Hoa',  sub: 'Hôm qua',                 balance:  240000, status: 'paid' },
    { initial: 'L', name: 'Long', sub: 'Sân + nước + vé lẻ',      balance: -333333, status: 'unpaid', isTreasurer: true },
    { initial: 'T', name: 'Tuấn', sub: 'Sân + nước',              balance: -210000, status: 'unpaid' },
    { initial: 'N', name: 'Nam',  sub: 'Sân + 2 vé lẻ',           balance: -246667, status: 'notified' },
    { initial: 'Li',name: 'Linh', sub: '', balance: -50000, status: 'unpaid' },
    { initial: 'D', name: 'Diệu', sub: '', balance: -20000, status: 'unpaid' },
    { initial: 'B', name: 'Bình', sub: '', balance:  20000, status: 'paid' },
    { initial: 'Q', name: 'Quang',sub: '', balance:  60000, status: 'paid' },
    { initial: 'P', name: 'Phú',  sub: '', balance:  40000, status: 'paid' },
    { initial: 'A', name: 'An',   sub: '', balance:  85000, status: 'paid' },
    { initial: 'V', name: 'Vy',   sub: '', balance:  140000, status: 'paid' },
  ],
  remainingCount: 5,
};
