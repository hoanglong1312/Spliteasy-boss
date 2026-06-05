// Spliteasy Boss — Thông báo
// Props: data { groups: [{ label, items[] }], filters[] }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import { PhoneFrame, Screen, IconButton, Pill, PillRow } from '../primitives';

export default function Notifications({ data, onAction }) {
  const d = data || DEMO;
  const [filter, setFilter] = useState(d.filters[0]?.key);

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Thông báo</h1>
          </div>
          <button onClick={() => onAction?.('markAllRead')} style={{
            fontSize: 10, color: colors.brandLight, fontWeight: 700,
            letterSpacing: '0.3px', textAlign: 'right', lineHeight: 1.2,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
          }}>ĐÁNH DẤU<br />ĐÃ ĐỌC TẤT CẢ</button>
        </div>

        {/* Filters */}
        <PillRow>
          {d.filters.map((f) => (
            <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </Pill>
          ))}
        </PillRow>

        {/* Groups */}
        {d.groups.map((g, gi) => (
          <React.Fragment key={gi}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
              color: colors.textMuted, textTransform: 'uppercase',
              margin: gi === 0 ? '8px 0' : '18px 0 8px',
            }}>{g.label}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.items.map((n, i) => (
                <NotifItem key={i} notif={n}
                  onApprove={() => onAction?.('approveJoin', n.id)}
                  onReject={() => onAction?.('rejectJoin', n.id)}
                  onConfirmPayment={() => onAction?.('confirmPaymentNotice', n)}
                  onRejectPayment={() => onAction?.('rejectPaymentNotice', n)}
                  onApproveExpense={() => onAction?.('approveExpense', { expenseId: n.id, groupId: n.groupId })}
                  onRejectExpense={() => onAction?.('rejectExpense', { expenseId: n.id, groupId: n.groupId })}
                  onPress={n.refId ? () => onAction?.('viewNotifDetail', n) : undefined}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </Screen>
    </PhoneFrame>
  );
}

function NotifItem({ notif, onApprove, onReject, onConfirmPayment, onRejectPayment, onApproveExpense, onRejectExpense, onPress }) {
  const [saving, setSaving] = useState(false);
  const wrap = (fn) => async () => { setSaving(true); try { await fn?.() } finally { setSaving(false) } };
  const unread = notif.unread;
  const paymentStatus = String(notif.status || '').toLowerCase();
  const base = {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '14px 14px', borderRadius: 12,
    background: unread ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${unread ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)'}`,
    position: 'relative',
    ...(unread ? { borderLeft: `3px solid ${colors.brand}`, paddingLeft: 11 } : {}),
  };

  // Stacked variant when actions present
  if (notif.actions === 'joinRequest') {
    return (
      <div style={{ ...base, flexDirection: 'column', alignItems: 'stretch' }}>
        {unread && <ReadDot />}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <IconCircle bg={notif.iconBg}>{notif.icon}</IconCircle>
          <Meta notif={notif} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={wrap(onApprove)} disabled={saving} style={approveBtn}>✓ Duyệt</button>
          <button onClick={wrap(onReject)} disabled={saving} style={rejectBtn}>✕ Từ chối</button>
        </div>
      </div>
    );
  }

  if (notif.actions === 'paymentConfirmation') {
    return (
      <div style={{ ...base, flexDirection: 'column', alignItems: 'stretch' }}>
        {unread && <ReadDot />}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <IconCircle bg={notif.iconBg}>{notif.icon}</IconCircle>
          <Meta notif={notif} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={wrap(onConfirmPayment)} disabled={saving} style={approveBtn}>Đã nhận</button>
          <button onClick={wrap(onRejectPayment)} disabled={saving} style={rejectBtn}>Chưa nhận</button>
        </div>
      </div>
    );
  }

  if (notif.actions === 'expenseApproval') {
    return (
      <div style={{ ...base, flexDirection: 'column', alignItems: 'stretch' }}>
        {unread && <ReadDot />}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <IconCircle bg={notif.iconBg}>{notif.icon}</IconCircle>
          <Meta notif={notif} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={wrap(onApproveExpense)} disabled={saving} style={approveBtn}>✓ Duyệt</button>
          <button onClick={wrap(onRejectExpense)} disabled={saving} style={rejectBtn}>✕ Từ chối</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onPress} style={{ ...base, cursor: onPress ? 'pointer' : 'default' }}>
      {unread && <ReadDot />}
      <IconCircle bg={notif.iconBg}>{notif.icon}</IconCircle>
      <Meta notif={notif} />
      {paymentStatus && paymentStatus !== 'pending' && (
        <div style={statusBadge(paymentStatus)}>{paymentStatus === 'confirmed' ? 'Đã xác nhận' : 'Chưa nhận'}</div>
      )}
    </div>
  );
}

function statusBadge(status) {
  const confirmed = status === 'confirmed';
  return {
    alignSelf: 'flex-start',
    flexShrink: 0,
    padding: '5px 8px',
    borderRadius: 999,
    background: confirmed ? 'rgba(52,211,153,0.14)' : 'rgba(248,113,113,0.14)',
    border: `1px solid ${confirmed ? 'rgba(52,211,153,0.28)' : 'rgba(248,113,113,0.28)'}`,
    color: confirmed ? '#6ee7b7' : '#fca5a5',
    fontSize: 10,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  };
}

function Meta({ notif }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4 }}
        dangerouslySetInnerHTML={{ __html: notif.title }} />
      <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4, fontWeight: 500 }}>
        {notif.sub}
      </div>
      <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 600, marginTop: 6 }}>
        {notif.when}
      </div>
    </div>
  );
}

function IconCircle({ bg, children }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 12,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, flexShrink: 0,
    }}>{children}</div>
  );
}

function ReadDot() {
  return (
    <span style={{
      position: 'absolute', top: 14, right: 14,
      width: 7, height: 7, borderRadius: '50%',
      background: colors.brandLight,
      boxShadow: '0 0 8px rgba(129,140,248,0.6)',
    }} />
  );
}

const approveBtn = {
  flex: 1, padding: 10, borderRadius: 10,
  background: 'rgba(52,211,153,0.15)', color: '#6ee7b7',
  fontSize: 12, fontWeight: 700,
  border: '1px solid rgba(52,211,153,0.3)',
  fontFamily: 'inherit', cursor: 'pointer',
};
const rejectBtn = {
  flex: 1, padding: 10, borderRadius: 10,
  background: 'rgba(248,113,113,0.08)', color: '#fca5a5',
  fontSize: 12, fontWeight: 700,
  border: '1px solid rgba(248,113,113,0.25)',
  fontFamily: 'inherit', cursor: 'pointer',
};

const DEMO = {
  filters: [
    { key: 'all',    label: 'Tất cả · 5' },
    { key: 'unread', label: '● Chưa đọc · 3' },
    { key: 'expense',label: '💸 Chi tiêu' },
    { key: 'paid',   label: '✅ Thanh toán' },
  ],
  groups: [
    {
      label: 'Hôm nay',
      items: [
        { unread: true, icon: '💸', iconBg: 'rgba(245,158,11,0.12)',
          title: '<strong>Minh</strong> thêm khoản chi <strong>150.000 đ</strong>',
          sub: '🍜 Bún bò Huế · Nhóm CLB Cầu Giấy',
          when: '10 phút trước' },
        { unread: true, icon: '✅', iconBg: 'rgba(52,211,153,0.12)',
          title: '<strong>Hoa</strong> xác nhận đã thanh toán <strong>240.000 đ</strong>',
          sub: 'VietQR · Tiền sân tháng 5',
          when: '1 giờ trước' },
        { id: 'jr1', unread: true, icon: '👤', iconBg: 'rgba(167,139,250,0.12)',
          title: '<strong>Tuấn</strong> yêu cầu tham gia <strong>Nhóm CLB Cầu Giấy</strong>',
          sub: 'Mã: CLB-CG-2026 · Tạm thời nhận tên "Tuấn"',
          when: '2 giờ trước',
          actions: 'joinRequest' },
      ],
    },
    {
      label: 'Sớm hơn',
      items: [
        { icon: '🏓', iconBg: 'rgba(52,211,153,0.10)',
          title: 'Buổi <strong>#9</strong> hôm nay lúc <strong>19:00</strong>',
          sub: 'Sân 3 · Trung tâm Cầu Giấy',
          when: '5 giờ trước' },
        { icon: '💰', iconBg: 'rgba(248,113,113,0.10)',
          title: '<strong>Nam</strong> còn nợ bạn <strong>93.333 đ</strong>',
          sub: 'Vé lẻ #2 · Quá hạn 3 ngày',
          when: 'Hôm qua' },
        { icon: '🔒', iconBg: 'rgba(255,255,255,0.04)',
          title: 'Đã chốt sổ tháng <strong>04/2026</strong>',
          sub: 'CLB Cầu Giấy · Long là thủ quỹ',
          when: '02/05/2026' },
      ],
    },
  ],
};
