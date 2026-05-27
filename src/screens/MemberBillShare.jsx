import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, Card, SearchInput, SubTabs, Badge, Button } from '../primitives';
import { BANK_LIST, generateQRUrl } from '../lib/vietqr.js';

export default function MemberBillShare({ data, loading = false, onOpenApp }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const bill = data || {};
  const invalid = !loading && (bill.error || !bill.memberId);
  const rows = safeArray(bill.transactions);
  const summary = bill.summary || summarizeRows(rows);
  const visibleRows = rows.filter(row => {
    const query = normalizeSearch(search);
    const haystack = normalizeSearch(`${row.title} ${row.category} ${row.paidByName} ${row.status}`);
    const net = Number(row.netAmount || 0);
    return (!query || haystack.includes(query)) && (
      filter === 'all' ||
      (filter === 'owes' && net < 0) ||
      (filter === 'advanced' && net > 0) ||
      (filter === 'settled' && net === 0)
    );
  });

  return (
    <PhoneFrame statusBar={false}>
      <Screen style={{ top: 0, paddingTop: 18, paddingBottom: 28 }}>
        {loading && <Card><div style={{ fontSize: 14, fontWeight: 800 }}>Đang tải bill...</div></Card>}
        {invalid && (
          <Card>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Link không còn hiệu lực</div>
            <div style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>
              Hãy nhờ thủ quỹ gửi lại link mới.
            </div>
          </Card>
        )}
        {!loading && !invalid && (
          <>
            <Card style={{
              background: 'linear-gradient(145deg, rgba(16,185,129,0.18), rgba(251,191,36,0.08))',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#fcd34d', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Bill cá nhân</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 950, lineHeight: 1.15 }}>{bill.memberName}</div>
              <div style={{
                marginTop: 10,
                display: 'inline-flex',
                maxWidth: '100%',
                padding: '7px 10px',
                borderRadius: 999,
                background: 'rgba(7,8,15,0.34)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: 850,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {bill.groupName}
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>{bill.monthLabel || 'Tháng hiện tại'}</div>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <MiniShareStat label="Cần trả" value={summary.owes} tone={colors.danger} />
                <MiniShareStat label="Đã ứng" value={summary.advanced} tone="#6ee7b7" />
                <MiniShareStat label="Net" value={summary.net} tone={(summary.net || 0) < 0 ? colors.danger : '#6ee7b7'} signed />
              </div>
            </Card>
            <PaymentCard bill={bill} summary={summary} />
            <Card style={{ marginTop: 12 }}>
              <SearchInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm giao dịch..." />
              <SubTabs
                items={[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'owes', label: 'Cần trả' },
                  { key: 'advanced', label: 'Đã ứng' },
                  { key: 'settled', label: 'Cân bằng' },
                ]}
                active={filter}
                onChange={setFilter}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visibleRows.map(row => <ShareTransactionRow key={row.id} row={row} />)}
                {visibleRows.length === 0 && (
                  <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 0' }}>Không có giao dịch phù hợp.</div>
                )}
              </div>
            </Card>
            {bill.canOpenApp && (
              <Button variant="muted" style={{ marginTop: 12, width: '100%' }} onClick={onOpenApp}>Mở trang chính</Button>
            )}
          </>
        )}
      </Screen>
    </PhoneFrame>
  );
}

function PaymentCard({ bill, summary }) {
  const owesAmount = Math.max(0, Number(summary?.owes || 0));
  const paymentTarget = bill?.paymentTarget || {};
  const bank = resolveBank(paymentTarget.bankName);
  const qrBankId = bank?.id || paymentTarget.bankName || '';
  const description = `${bill?.memberName || 'Thanh vien'} - ${bill?.groupName || 'Nhom'} - ${bill?.monthLabel || 'Thang hien tai'}`;
  const canGenerateQr = Boolean(qrBankId && paymentTarget.bankAccount && paymentTarget.bankAccountName && owesAmount > 0);
  const qrUrl = canGenerateQr
    ? generateQRUrl({
        bankId: qrBankId,
        account: paymentTarget.bankAccount,
        accountName: paymentTarget.bankAccountName,
        amount: owesAmount,
        description,
      })
    : '';

  function copyPaymentInfo() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText([
      formatVND(owesAmount),
      paymentTarget.bankAccountName,
      paymentTarget.bankAccount,
      description,
    ].filter(Boolean).join('\n')).catch(() => {});
  }

  return (
    <Card style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>Thanh toán về quỹ nhóm</div>
      {owesAmount <= 0 && (
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: '#6ee7b7' }}>Không cần thanh toán</div>
      )}
      {owesAmount > 0 && !canGenerateQr && (
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: colors.textSecondary, lineHeight: 1.45 }}>
          Chưa có thông tin quỹ, liên hệ thủ quỹ.
        </div>
      )}
      {canGenerateQr && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '116px 1fr',
            gap: 12,
            alignItems: 'center',
          }}>
            <img
              src={qrUrl}
              alt="QR thanh toán"
              style={{ width: 116, height: 116, borderRadius: 12, background: '#fff', objectFit: 'cover' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 800 }}>Số tiền cần chuyển</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: colors.danger, ...type.mono }}>{formatVND(owesAmount)}</div>
              <div style={{ marginTop: 9, fontSize: 11, color: colors.textSecondary, lineHeight: 1.45 }}>
                {paymentTarget.bankAccountName}<br />
                {bank?.shortName || paymentTarget.bankName} · {paymentTarget.bankAccount}
              </div>
            </div>
          </div>
          <div style={{ padding: 10, borderRadius: 12, background: colors.inputBg, border: `1px solid ${colors.borderSubtle}` }}>
            <div style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 800 }}>Nội dung chuyển khoản</div>
            <div style={{ marginTop: 5, fontSize: 12, fontWeight: 850, lineHeight: 1.4 }}>{description}</div>
          </div>
          <Button variant="muted" onClick={copyPaymentInfo}>Copy thông tin chuyển khoản</Button>
        </div>
      )}
    </Card>
  );
}

function MiniShareStat({ label, value, tone, signed = false }) {
  const amount = Number(value || 0);
  const prefix = signed && amount > 0 ? '+' : signed && amount < 0 ? '-' : '';
  return (
    <div style={{ padding: 9, borderRadius: 12, background: colors.inputBg }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: colors.textSecondary }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 900, color: tone, ...type.mono }}>{prefix}{formatVND(Math.abs(amount))}</div>
    </div>
  );
}

function ShareTransactionRow({ row }) {
  const net = Number(row.netAmount || 0);
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: `1px solid ${colors.borderSubtle}` }}>
      <div style={{ width: 42, color: colors.textSecondary, fontSize: 11, fontWeight: 800 }}>{row.date}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{row.title}</div>
        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge tone={net < 0 ? 'danger' : net > 0 ? 'success' : 'muted'}>{net < 0 ? 'Cần trả' : net > 0 ? 'Đã ứng' : 'Cân bằng'}</Badge>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{row.paidByName} trả</span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color: net < 0 ? colors.danger : net > 0 ? '#6ee7b7' : colors.textSecondary, ...type.mono }}>
        {net < 0 ? '-' : net > 0 ? '+' : ''}{formatVND(Math.abs(net))}
      </div>
    </div>
  );
}

function resolveBank(value) {
  const target = normalizeSearch(value);
  if (!target) return null;
  return BANK_LIST.find(bank => (
    normalizeSearch(bank.id) === target ||
    normalizeSearch(bank.shortName) === target ||
    normalizeSearch(bank.name) === target
  )) || null;
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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeRows(rows) {
  const owes = safeArray(rows).reduce((sum, row) => sum + Math.max(0, -Number(row.netAmount || 0)), 0);
  const advanced = safeArray(rows).reduce((sum, row) => sum + Math.max(0, Number(row.netAmount || 0)), 0);
  return { owes, advanced, net: advanced - owes };
}
