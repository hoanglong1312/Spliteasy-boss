// Spliteasy Boss — Duyệt yêu cầu tham gia (thủ quỹ)
// Props: data { pendingCount, oldestLabel, filters[], requests[], recentApproved[] }

import React, { useState } from 'react';
import { colors, type } from '../tokens';
import {
  PhoneFrame, Screen, IconButton, Card, Hero, Button, Badge, Avatar,
  Pill, PillRow, LoadingSpinner, loadingOverlayStyle,
} from '../primitives';

export default function ApprovalQueue({ data, onAction }) {
  const d = data || DEMO;
  const [filter, setFilter] = useState(d.filters[0]?.key);
  const [saving, setSaving] = useState(false);

  return (
    <PhoneFrame>
      <Screen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 14px' }}>
          <IconButton onClick={() => onAction?.('back')}>‹</IconButton>
          <div style={{
            flex: 1, textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Yêu cầu tham gia</div>
            <span style={{
              padding: '3px 9px', borderRadius: 100,
              background: 'rgba(99,102,241,0.18)', color: '#c7d2fe',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.3px', ...type.mono,
            }}>{d.pendingCount}</span>
          </div>
          <IconButton onClick={() => onAction?.('filter')}>⚲</IconButton>
        </div>

        {/* Treasurer summary */}
        <Hero variant="violet" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid rgba(251,191,36,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>👑</div>
            <div>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.2px', color: '#c4b5fd',
              }}>VAI TRÒ THỦ QUỸ</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                {d.pendingCount} yêu cầu chờ duyệt
              </div>
              <div style={{ fontSize: 11, color: '#c4b5fd', marginTop: 2 }}>
                Cũ nhất {d.oldestLabel}
              </div>
            </div>
          </div>
        </Hero>

        {/* Filter pills */}
        <PillRow style={{ marginTop: 14 }}>
          {d.filters.map((f) => (
            <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </Pill>
          ))}
        </PillRow>

        {/* Requests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {d.requests.map((r) => (
            <RequestCard key={r.id} req={r} disabled={saving}
              onApprove={async () => { setSaving(true); try { await onAction?.('approve', r.id) } finally { setSaving(false) } }}
              onReject={async () => { setSaving(true); try { await onAction?.('reject', r.id) } finally { setSaving(false) } }}
              onAddName={() => onAction?.('addName', r.id)}
            />
          ))}

          {/* Recently approved */}
          {d.recentApproved?.length > 0 && (
            <>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
                color: colors.textMuted, textTransform: 'uppercase',
                margin: '14px 0 4px',
              }}>Vừa duyệt</div>
              {d.recentApproved.map((p, i) => (
                <Card key={i} style={{
                  padding: '12px 16px', opacity: 0.6,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Avatar initial={p.initial} size={24} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                      → {p.groupLabel}
                    </div>
                  </div>
                  <Badge tone="success">✓ Đã duyệt</Badge>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Bulk action */}
        <Button block variant="success" style={{ marginTop: 18, fontSize: 13 }}
          disabled={saving}
          onClick={async () => { setSaving(true); try { await onAction?.('approveAll') } finally { setSaving(false) } }}>
          ✓ Duyệt tất cả · {d.pendingCount} yêu cầu
        </Button>
      </Screen>
      {saving && <div role="status" aria-live="polite" style={loadingOverlayStyle}><LoadingSpinner /><div style={{ fontWeight: 800, color: '#f1f5f9' }}>Đang xử lý…</div></div>}
    </PhoneFrame>
  );
}

function RequestCard({ req, onApprove, onReject, onAddName, disabled }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initial={req.initial} size={48} color={req.avatarBg} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{req.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: colors.textSecondary }}>→ {req.groupLabel}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: colors.textMuted }} />
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: req.urgent ? '#fcd34d' : colors.textSecondary,
            }}>{req.whenLabel}</span>
          </div>
        </div>
      </div>

      {req.matchType === 'matched' && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 600 }}>
            Có sẵn tên trong nhóm:
          </span>
          <span style={{ fontSize: 11, color: '#c7d2fe', fontWeight: 700 }}>{req.matchedName} ✓</span>
        </div>
      )}

      {req.matchType === 'new' && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#fcd34d', fontWeight: 600 }}>
            ⚠️ Tên mới — chưa có trong nhóm
          </span>
          <button onClick={onAddName} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#fcd34d', fontWeight: 700, fontFamily: 'inherit',
          }}>+ Thêm</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onApprove} disabled={disabled} style={approveBtn}>✓ Duyệt</button>
        <button onClick={onReject} disabled={disabled} style={rejectBtn}>✕ Từ chối</button>
      </div>
    </Card>
  );
}

const approveBtn = {
  flex: 1, padding: 11, borderRadius: 11,
  background: 'rgba(52,211,153,0.15)', color: '#6ee7b7',
  fontSize: 12, fontWeight: 700,
  border: '1px solid rgba(52,211,153,0.3)',
  fontFamily: 'inherit', letterSpacing: '0.3px', cursor: 'pointer',
};
const rejectBtn = {
  flex: 1, padding: 11, borderRadius: 11,
  background: 'rgba(248,113,113,0.08)', color: '#fca5a5',
  fontSize: 12, fontWeight: 700,
  border: '1px solid rgba(248,113,113,0.25)',
  fontFamily: 'inherit', letterSpacing: '0.3px', cursor: 'pointer',
};

const DEMO = {
  pendingCount: 3,
  oldestLabel: 'từ 2 giờ trước',
  filters: [
    { key: 'all',     label: 'Tất cả · 3' },
    { key: 'caugiay', label: '🏓 CLB Cầu Giấy · 2' },
    { key: 'lunch',   label: '🍜 Ăn trưa T7 · 1' },
  ],
  requests: [
    { id: 1, name: 'Phương Anh', initial: 'P', avatarBg: 'linear-gradient(135deg,#ec4899,#be185d)',
      groupLabel: '🏓 CLB Cầu Giấy', whenLabel: '2 giờ trước', urgent: true,
      matchType: 'matched', matchedName: 'Phương Anh' },
    { id: 2, name: 'Tuấn Anh', initial: 'T', avatarBg: 'linear-gradient(135deg,#f87171,#dc2626)',
      groupLabel: '🏓 CLB Cầu Giấy', whenLabel: '5 giờ trước',
      matchType: 'new' },
    { id: 3, name: 'Vy Nguyễn', initial: 'V', avatarBg: 'linear-gradient(135deg,#0891b2,#155e75)',
      groupLabel: '🍜 Ăn trưa thứ Bảy', whenLabel: 'Hôm qua' },
  ],
  recentApproved: [
    { initial: 'Q', name: 'Quang Tăng', groupLabel: '🏓 CLB Cầu Giấy' },
  ],
};
