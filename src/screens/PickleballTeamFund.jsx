// Spliteasy Boss — Pickleball · Quỹ team tháng

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, TabBar, IconButton, Card, Button, Input, Avatar } from '../primitives';
import { BANK_LIST, generateQRUrl } from '../lib/vietqr.js';

export default function PickleballTeamFund({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const ticketFund = d.ticketFund || { rows: [], totalDue: 0, totalCredit: 0 };
  const ticketStats = d.ticketStats || { sessionCount: 0, totalAmount: 0, participantCount: 0 };
  const venueBank = d.venueBank || { ownerName: '', bankName: '', bankAccount: '' };
  const paymentDraft = d.paymentDraft || { items: [], totalAmount: 0 };
  const ownerPayments = d.ownerPayments || [];
  const [courtFee, setCourtFee] = useState(Number(d.courtFeeTotal) || 0);
  const [ticketPrice, setTicketPrice] = useState(Number(d.ticketPrice) || 50000);
  const [venueOwnerName, setVenueOwnerName] = useState(venueBank.ownerName || '');
  const [venueBankName, setVenueBankName] = useState(normalizeBankValue(venueBank.bankName));
  const [venueBankAccount, setVenueBankAccount] = useState(venueBank.bankAccount || '');
  const [selectedPaymentKeys, setSelectedPaymentKeys] = useState(() => defaultPaymentKeys(paymentDraft.items));
  const [paymentNote, setPaymentNote] = useState('');
  const [openPaymentId, setOpenPaymentId] = useState('');
  const [saveState, setSaveState] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const [paymentQrOpen, setPaymentQrOpen] = useState(false);
  const perSession = Math.round(courtFee / Math.max(Number(d.sessionsCount) || 1, 1));
  const perMember = Math.round(courtFee / Math.max(Number(d.memberCount) || 1, 1));
  const selectedPaymentItems = paymentDraft.items.filter(item => selectedPaymentKeys.includes(paymentItemKey(item)));
  const selectedPaymentTotal = selectedPaymentItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const selectedBank = resolveBank(venueBankName);
  const qrBankId = selectedBank?.id || venueBankName;
  const canGenerateQr = Boolean(qrBankId && venueBankAccount && venueOwnerName && selectedPaymentTotal > 0);
  const qrUrl = canGenerateQr
    ? generateQRUrl({
      bankId: qrBankId,
      account: venueBankAccount,
      accountName: venueOwnerName,
      amount: selectedPaymentTotal,
      description: `QUY PICKLEBALL ${d.currentYearMonth || ''}`.trim(),
    })
    : '';

  useEffect(() => {
    setCourtFee(Number(d.courtFeeTotal) || 0);
    setTicketPrice(Number(d.ticketPrice) || 50000);
    setVenueOwnerName(venueBank.ownerName || '');
    setVenueBankName(normalizeBankValue(venueBank.bankName));
    setVenueBankAccount(venueBank.bankAccount || '');
    setSelectedPaymentKeys(defaultPaymentKeys(paymentDraft.items));
    setSaveState('');
    setPaymentState('');
    setPaymentQrOpen(false);
  }, [d.courtFeeTotal, d.ticketPrice, venueBank.ownerName, venueBank.bankName, venueBank.bankAccount, paymentDraft.items]);

  if (!isTreasurer) {
    return (
      <PhoneFrame>
        <Screen style={{ paddingBottom: '72px' }}>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Chỉ thủ quỹ xem được quỹ team.</div>
          </Card>
        </Screen>
        <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Screen style={{ paddingBottom: '72px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 16px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#93c5fd', textTransform: 'uppercase' }}>
              QUỸ TEAM · {d.clubName}
            </div>
            <h1 style={{ ...type.title, marginTop: 2 }}>Quỹ team tháng này</h1>
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
              {d.monthLabel}
            </div>
          </div>
          <IconButton onClick={() => onAction?.('back')}>×</IconButton>
        </div>

        <Card accent="finance" style={{ padding: '14px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Cấu hình tiền tháng
          </div>
          <Input
            label="Tiền sân tháng"
            suffix="đ"
            value={formatInputAmount(courtFee)}
            onChange={event => {
              setCourtFee(parseAmount(event.target.value));
              setSaveState('');
            }}
            inputMode="numeric"
            inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
          />
          <Input
            label="Giá vé lẻ/người"
            suffix="đ"
            value={formatInputAmount(ticketPrice)}
            onChange={event => {
              setTicketPrice(parseAmount(event.target.value));
              setSaveState('');
            }}
            inputMode="numeric"
            inputStyle={{ fontWeight: 900, fontSize: 18, ...type.mono }}
          />
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSubtle}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>
              STK chủ sân
            </div>
            <Input
              label="Tên chủ tài khoản"
              value={venueOwnerName}
              onChange={event => {
                setVenueOwnerName(event.target.value);
                setSaveState('');
              }}
            />
            <BankSelect value={venueBankName} onChange={value => {
              setVenueBankName(value);
              setSaveState('');
            }} />
            <Input
              label="Số tài khoản"
              value={venueBankAccount}
              onChange={event => {
                setVenueBankAccount(event.target.value.replace(/\s/g, ''));
                setSaveState('');
              }}
              inputMode="numeric"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <MiniStat label="Tiền sân/buổi" value={perSession} tone="info" />
            <MiniStat label="Tiền sân/người" value={perMember} tone="info" />
          </div>
          {saveState && (
            <div style={{ marginTop: 9, color: saveState === 'saved' ? '#86efac' : colors.danger, fontSize: 11, fontWeight: 800 }}>
              {saveState === 'saved' ? 'Đã lưu cấu hình quỹ tháng.' : 'Chưa lưu được. Cần chạy supabase db push nếu remote chưa có cột STK chủ sân.'}
            </div>
          )}
          <Button
            block
            variant="success"
            style={{ marginTop: 12, padding: 12 }}
            onClick={async () => {
              setSaveState('');
              try {
                await onAction?.('saveTeamFundConfig', {
                  currentYearMonth: d.currentYearMonth,
                  courtFee,
                  ticketPrice,
                  venueOwnerName,
                  venueBankName,
                  venueBankAccount,
                });
                setSaveState('saved');
              } catch {
                setSaveState('error');
              }
            }}
          >
            Lưu cấu hình quỹ
          </Button>
        </Card>

        <Card accent="finance" style={{ marginTop: 10, padding: '14px 12px', borderColor: 'rgba(96,165,250,0.24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Cần thanh toán
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                Nước, phát sinh, vé lẻ và tiền sân tháng sau.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase' }}>Tổng chọn</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#bfdbfe', marginTop: 3, ...type.mono }}>{formatVND(selectedPaymentTotal)}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paymentDraft.items.map(item => {
              const key = paymentItemKey(item);
              const checked = selectedPaymentKeys.includes(key);
              return (
                <label key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 10px',
                  borderRadius: 10,
                  border: `1px solid ${item.paid ? 'rgba(52,211,153,0.28)' : colors.borderSubtle}`,
                  background: item.paid ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.035)',
                  opacity: item.paid ? 0.72 : 1,
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={item.paid || Number(item.amount) <= 0}
                    onChange={event => {
                      setSelectedPaymentKeys(keys => event.target.checked
                        ? [...keys, key]
                        : keys.filter(value => value !== key));
                      setPaymentState('');
                      setPaymentQrOpen(false);
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                      {item.yearMonth} · {item.paid ? 'Đã trả chủ sân' : 'Chưa chuyển'}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: item.paid ? '#6ee7b7' : colors.warning, ...type.mono }}>
                    {formatVND(item.amount || 0)}
                  </div>
                </label>
              );
            })}
          </div>

          <Input
            label="Ghi chú giao dịch"
            value={paymentNote}
            onChange={event => {
              setPaymentNote(event.target.value);
              setPaymentState('');
            }}
          />
          {paymentState && (
            <div style={{ marginTop: 9, color: paymentState === 'saved' ? '#86efac' : colors.danger, fontSize: 11, fontWeight: 800 }}>
              {paymentState === 'saved' ? 'Đã ghi nhận giao dịch chuyển chủ sân.' : 'Chưa lưu được giao dịch. Thử lại sau.'}
            </div>
          )}
          <Button
            block
            variant="success"
            disabled={selectedPaymentItems.length === 0 || selectedPaymentTotal <= 0}
            style={{ marginTop: 12, padding: 12, opacity: selectedPaymentItems.length === 0 || selectedPaymentTotal <= 0 ? 0.55 : 1 }}
            onClick={() => setPaymentQrOpen(true)}
          >
            Thanh toán
          </Button>

          {paymentQrOpen && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(15,23,42,0.72)',
              border: `1px solid ${canGenerateQr ? 'rgba(52,211,153,0.28)' : 'rgba(248,113,113,0.26)'}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1px', color: canGenerateQr ? '#6ee7b7' : colors.danger, textTransform: 'uppercase' }}>
                Quét VietQR
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                {selectedBank?.shortName || venueBankName || 'Chưa chọn ngân hàng'} · {venueBankAccount || 'Chưa có STK'} · {formatVND(selectedPaymentTotal)}
              </div>
              {canGenerateQr ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                  <img
                    src={qrUrl}
                    alt="VietQR chủ sân"
                    style={{ width: 180, height: 180, borderRadius: 12, background: '#fff', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 11, color: '#fecaca', fontWeight: 800 }}>
                  Cần nhập đủ tên chủ tài khoản, ngân hàng và số tài khoản để tạo QR.
                </div>
              )}
              <Button
                block
                variant="success"
                disabled={!canGenerateQr}
                style={{ marginTop: 12, padding: 12, opacity: canGenerateQr ? 1 : 0.55 }}
                onClick={async () => {
                  setPaymentState('');
                  try {
                    await onAction?.('markOwnerPayment', {
                      currentYearMonth: d.currentYearMonth,
                      paidAt: new Date().toISOString().slice(0, 10),
                      totalAmount: selectedPaymentTotal,
                      bankSnapshot: {
                        ownerName: venueOwnerName,
                        bankName: selectedBank?.shortName || venueBankName,
                        bankId: qrBankId,
                        bankAccount: venueBankAccount,
                      },
                      items: selectedPaymentItems,
                      note: paymentNote,
                    });
                    setPaymentNote('');
                    setPaymentQrOpen(false);
                    setPaymentState('saved');
                  } catch {
                    setPaymentState('error');
                  }
                }}
              >
                Đánh dấu đã chuyển
              </Button>
            </div>
          )}
        </Card>

        <Card accent="pickleball" style={{ marginTop: 10, padding: '14px 12px', borderColor: 'rgba(251,191,36,0.24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Tổng vé lẻ team
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                {ticketStats.sessionCount || 0} buổi · {ticketStats.participantCount || 0} lượt tham gia
              </div>
            </div>
            <button type="button" onClick={() => onAction?.('push', 'pickleball-calendar')} style={pillButtonStyle()}>
              Mở lịch
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
            <MiniStat label="Tổng vé" value={ticketStats.totalAmount || 0} tone="warn" />
            <MiniStat label="Cần thu" value={ticketFund.totalDue || 0} tone="warn" />
            <MiniStat label="Cần bù" value={ticketFund.totalCredit || 0} tone="success" />
          </div>
        </Card>

        <Card accent="finance" style={{ marginTop: 10, padding: '14px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Lịch sử chuyển chủ sân
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
            Các lần thủ quỹ đã chuyển cho chủ sân.
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ownerPayments.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 0' }}>
                Chưa có giao dịch chuyển chủ sân.
              </div>
            )}
            {ownerPayments.map(payment => {
              const open = openPaymentId === payment.id;
              const bank = payment.bankSnapshot || payment.bank_snapshot || {};
              return (
                <div key={payment.id} style={{ padding: '10px 0', borderTop: `1px solid ${colors.borderSubtle}` }}>
                  <button type="button" onClick={() => setOpenPaymentId(open ? '' : payment.id)} style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: colors.textPrimary,
                    padding: 0,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 900 }}>{formatPaymentDate(payment.paidAt || payment.paid_at)}</div>
                        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                          {bank.ownerName || 'Chủ sân'} · {safeArray(payment.items).length} hạng mục
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#6ee7b7', ...type.mono }}>{formatVND(payment.totalAmount || payment.total_amount || 0)}</div>
                    </div>
                  </button>
                  {open && (
                    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.035)' }}>
                      <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 7 }}>
                        {bank.bankName || 'Ngân hàng'} · {bank.bankAccount || 'Chưa có STK'}
                      </div>
                      {safeArray(payment.items).map(item => (
                        <div key={paymentItemKey(item)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0' }}>
                          <span style={{ fontSize: 11, color: colors.textSecondary }}>{item.label} · {item.yearMonth}</span>
                          <span style={{ fontSize: 11, fontWeight: 900, ...type.mono }}>{formatVND(item.amount || 0)}</span>
                        </div>
                      ))}
                      {payment.note && <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 7 }}>{payment.note}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card accent="finance" style={{ marginTop: 10, padding: '14px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Chênh lệch qua quỹ
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
            Người tham gia nộp vào quỹ, người ứng được quỹ bù lại.
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ticketFund.rows.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 0' }}>
                Chưa có chênh lệch vé lẻ trong tháng.
              </div>
            )}
            {ticketFund.rows.map(row => (
              <div key={row.memberId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 0',
                borderTop: `1px solid ${colors.borderSubtle}`,
              }}>
                <Avatar initial={row.initial} color={row.color} size={28} ring={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{row.name}</div>
                  <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                    {row.roleLabel || row.label}
                  </div>
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: row.amount < 0 ? '#6ee7b7' : colors.warning,
                  ...type.mono,
                }}>
                  {row.amount < 0 ? `Quỹ bù ${formatVND(Math.abs(row.amount))}` : `+${formatVND(row.amount)}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Screen>

      <TabBar active="pickleball" onChange={(k) => onAction?.('tab', k)} onFab={() => onAction?.('fab')} />
    </PhoneFrame>
  );
}

function MiniStat({ label, value, tone }) {
  const palette = tone === 'success'
    ? { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', color: '#6ee7b7' }
    : tone === 'info'
      ? { bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.24)', color: '#bfdbfe' }
      : { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', color: colors.warning };
  return (
    <div style={{ padding: '9px 10px', borderRadius: 10, background: palette.bg, border: `1px solid ${palette.border}` }}>
      <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
      <div style={{ fontSize: 14, color: palette.color, fontWeight: 900, marginTop: 3, ...type.mono }}>{formatVND(value)}</div>
    </div>
  );
}

function BankSelect({ value, onChange }) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: colors.textSecondary,
        margin: '14px 0 6px',
      }}>Ngân hàng</div>
      <select value={value} onChange={event => onChange(event.target.value)} style={selectFieldStyle()}>
        <option value="">Chọn ngân hàng</option>
        {BANK_LIST.map(bank => (
          <option key={bank.id} value={bank.id}>{bank.shortName}</option>
        ))}
      </select>
    </div>
  );
}

function paymentItemKey(item) {
  return `${item?.key || item?.label}:${item?.yearMonth || ''}`;
}

function resolveBank(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return BANK_LIST.find(bank => (
    bank.id.toLowerCase() === normalized ||
    bank.shortName.toLowerCase() === normalized ||
    bank.name.toLowerCase() === normalized
  )) || null;
}

function normalizeBankValue(value) {
  return resolveBank(value)?.id || value || '';
}

function defaultPaymentKeys(items) {
  return safeArray(items)
    .filter(item => !item.paid && Number(item.amount) > 0)
    .map(paymentItemKey);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPaymentDate(value) {
  if (!value) return 'Chưa có ngày';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function selectFieldStyle() {
  return {
    width: '100%',
    padding: '15px 16px',
    borderRadius: 12,
    border: `1px solid ${colors.borderSubtle}`,
    background: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 800,
    fontFamily: 'inherit',
    outline: 'none',
  };
}

function pillButtonStyle() {
  return {
    border: 'none',
    background: 'rgba(251,191,36,0.12)',
    color: '#fde68a',
    borderRadius: 999,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

function formatInputAmount(value) {
  return parseAmount(value).toLocaleString('vi-VN');
}

const DEMO = {
  clubName: 'Nhóm Pickleball Quận 7',
  monthLabel: 'Tháng 5 · 2026',
  currentYearMonth: '2026-05',
  courtFeeTotal: 4550000,
  ticketPrice: 50000,
  sessionsCount: 13,
  memberCount: 8,
  ticketStats: { sessionCount: 2, participantCount: 5, totalAmount: 250000 },
  venueBank: {
    ownerName: 'Virgo Pickleball',
    bankName: 'VCB',
    bankAccount: '123456789',
  },
  paymentDraft: {
    totalAmount: 4630000,
    items: [
      { key: 'water', label: 'Tiền nước', yearMonth: '2026-05', amount: 60000, paid: false },
      { key: 'extras', label: 'Phát sinh', yearMonth: '2026-05', amount: 80000, paid: false },
      { key: 'tickets', label: 'Vé lẻ team', yearMonth: '2026-05', amount: 250000, paid: false },
      { key: 'next_court', label: 'Tiền sân tháng sau', yearMonth: '2026-06', amount: 4240000, paid: false },
    ],
  },
  ownerPayments: [
    {
      id: 'demo-pay-1',
      paidAt: '2026-05-01',
      totalAmount: 4550000,
      bankSnapshot: { ownerName: 'Virgo Pickleball', bankName: 'VCB', bankAccount: '123456789' },
      items: [{ key: 'court', label: 'Tiền sân', yearMonth: '2026-05', amount: 4550000 }],
    },
  ],
  ticketFund: {
    totalDue: 200000,
    totalCredit: 50000,
    rows: [
      { memberId: 1, name: 'Anh Việt', initial: 'AV', amount: -50000, label: 'Quỹ bù lại', roleLabel: 'Ứng tiền vé lẻ' },
      { memberId: 2, name: 'Minh', initial: 'M', amount: 100000, label: 'Nộp vào quỹ', roleLabel: 'Tham gia vé lẻ' },
    ],
  },
};
