// Spliteasy Boss — Chi tiết chi tiêu
// Props: data { id, groupName, category, title, amount, status, dateLabel, payer, splits[], note }

import React from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Hero, Button, Avatar, SectionLabel,
} from '../primitives';

const STATUS_PALETTE = {
  pending: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fcd34d', label: '⏳ Đang chờ chia' },
  settled: { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', color: '#6ee7b7', label: '✓ Đã chia' },
};

const SPLIT_TAG = {
  owe:    { bg: 'rgba(248,113,113,0.12)', color: '#fca5a5', label: 'CÒN NỢ' },
  mine:   { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', label: '— PHẦN MÌNH' },
  paid:   { bg: 'rgba(52,211,153,0.12)', color: '#6ee7b7', label: '✓ ĐÃ TRẢ' },
};

export default function ExpenseDetail({ data, onAction }) {
  const d = data || DEMO;
  const status = STATUS_PALETTE[d.status] || STATUS_PALETTE.pending;
  const myOwed = d.splits.find((s) => s.tag === 'owe' && s.isMe);
  const receiptImages = d.receiptImages || [];

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
            }}>Nhóm {d.groupName}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Chi tiêu #{d.id}</div>
          </div>
          <IconButton onClick={() => onAction?.('more')}>⋯</IconButton>
        </div>

        {/* Hero */}
        <Hero variant="violet" style={{ textAlign: 'center', padding: '24px 18px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(245,158,11,0.18)',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, margin: '0 auto',
          }}>{d.category.icon}</div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#c7d2fe',
            textTransform: 'uppercase', letterSpacing: '1px', marginTop: 12,
          }}>{d.category.label}</div>
          <div style={{
            fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', marginTop: 4,
          }}>{d.title}</div>
          <div style={{
            fontSize: 40, fontWeight: 900, letterSpacing: '-1.5px',
            marginTop: 10, ...type.mono,
          }}>{formatVND(d.amount)}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
            padding: '5px 12px', borderRadius: 100,
            background: status.bg, border: `1px solid ${status.border}`,
            fontSize: 10, fontWeight: 700, color: status.color, letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>{status.label}</div>
          <div style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 500, marginTop: 12 }}>
            {d.dateLabel}
          </div>
        </Hero>

        {/* Payer */}
        <SectionLabel>Người trả trước</SectionLabel>
        <Card style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar initial={d.payer.initial} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{d.payer.name}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
              Đã ứng trước cho cả nhóm
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', ...type.mono }}>
              {formatVND(d.amount)}
            </div>
            <div style={{
              fontSize: 9, color: '#6ee7b7', fontWeight: 700,
              letterSpacing: '0.3px', textTransform: 'uppercase', marginTop: 2,
            }}>✓ Đã thanh toán</div>
          </div>
        </Card>

        {/* Split list */}
        <SectionLabel action="⚖️ Chia đều">Chia cho · {d.splits.length} người</SectionLabel>

        <Card style={{ padding: '6px 14px' }}>
          {d.splits.map((s, i) => {
            const tag = SPLIT_TAG[s.tag];
            const amountColor =
              s.tag === 'owe' ? '#f87171' :
              s.tag === 'paid' ? '#34d399' :
              '#cbd5e1';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0',
              }}>
                <Avatar initial={s.initial} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                    {s.name}
                    {s.isMe && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: colors.textSecondary,
                        letterSpacing: '0.5px', marginLeft: 4,
                      }}>· BẠN</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{s.sub}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: amountColor,
                    letterSpacing: '-0.2px', ...type.mono,
                  }}>{formatVND(s.amount)}</div>
                  <div style={{
                    marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 100,
                    background: tag.bg, color: tag.color,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.3px',
                  }}>{tag.label}</div>
                </div>
              </div>
            );
          })}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 0 4px',
            borderTop: `1px solid ${colors.borderSubtle}`,
            marginTop: 4,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: colors.textSecondary,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>Tổng đã chia</span>
            <span style={{ fontSize: 14, fontWeight: 800, ...type.mono }}>{formatVND(d.amount)}</span>
          </div>
        </Card>

        {/* Note */}
        {d.note && (
          <>
            <SectionLabel>Ghi chú</SectionLabel>
            <Card style={{ padding: '14px 16px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
              {d.note}
            </Card>
          </>
        )}

        {receiptImages.length > 0 && (
          <>
            <SectionLabel>Ảnh hóa đơn</SectionLabel>
            <Card style={{ padding: 10 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: receiptImages.length === 1 ? '1fr' : '1fr 1fr',
                gap: 8,
              }}>
                {receiptImages.map(image => (
                  <img
                    key={image.id || image.url}
                    src={image.url}
                    alt={image.name || 'Ảnh hóa đơn'}
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: `1px solid ${colors.borderSubtle}`,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  />
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {d.canEdit === true && (
            <Button block variant="ghost" style={{ fontSize: 12 }} onClick={() => onAction?.('edit')}>
              ✏️ Sửa
            </Button>
          )}
          {d.canDelete === true && (
            <Button block variant="danger" style={{ fontSize: 12 }} onClick={() => onAction?.('deleteExpense', { expenseId: d.expenseId || d.id, groupId: d.groupId, returnToPrevious: true })}>
              🗑 Xóa
            </Button>
          )}
        </div>

        {myOwed && (
          <Button block variant="brand" style={{ marginTop: 8 }}
            onClick={() => onAction?.('payNow', { to: d.payer.name, amount: Math.abs(myOwed.amount) })}>
            ⚡ Thanh toán {formatVND(Math.abs(myOwed.amount))} cho {d.payer.name.split(' ')[0]}
          </Button>
        )}
      </Screen>
    </PhoneFrame>
  );
}

const DEMO = {
  id: 142,
  groupName: 'CLB Cầu Giấy',
  category: { icon: '🍜', label: 'ĂN UỐNG · Trưa' },
  title: 'Bún bò Huế Phở 24',
  amount: 270000,
  status: 'pending',
  dateLabel: 'Thứ Bảy · 16/05/2026 · 12:30',
  payer: { initial: 'M', name: 'Minh Trần' },
  splits: [
    { initial: 'L', name: 'Long', isMe: true,  sub: 'Còn nợ Minh',         amount: -54000, tag: 'owe'  },
    { initial: 'M', name: 'Minh',                sub: 'Người ứng tiền',     amount:  54000, tag: 'mine' },
    { initial: 'H', name: 'Hoa',                 sub: 'Đã chuyển qua VietQR', amount: 54000, tag: 'paid' },
    { initial: 'T', name: 'Tuấn',                sub: 'Còn nợ Minh',         amount: -54000, tag: 'owe'  },
    { initial: 'N', name: 'Nam',                 sub: 'Còn nợ Minh',         amount: -54000, tag: 'owe'  },
  ],
  note: 'Mọi người ăn xong rồi qua sân luôn nhé. Tuấn order trước cho 5 người, Minh trả luôn cả bill.',
  canEdit: true,
  canDelete: true,
};
