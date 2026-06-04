// Spliteasy Boss — Pickleball · Quỹ team tháng

import React, { useEffect, useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import {
  PhoneFrame, Screen, TabBar, IconButton, Card, Button, Input, Avatar,
  LoadingSpinner, loadingOverlayStyle,
} from '../primitives';
import { BANK_LIST, generateQRUrl } from '../lib/vietqr.js';

export default function PickleballTeamFund({ data, isTreasurer = true, onAction }) {
  const d = data || DEMO;
  const ticketFund = d.ticketFund || { rows: [], totalDue: 0, totalCredit: 0 };
  const ticketStats = d.ticketStats || { sessionCount: 0, totalAmount: 0, participantCount: 0 };
  const teamFundDirectTotal = Number(d.teamFundDirectTotal ?? ticketFund.teamFundTotal) || 0;
  const ticketRows = safeArray(d.ticketRows);
  const ticketParticipantRows = safeArray(d.ticketParticipantRows);
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
  const [openTicketId, setOpenTicketId] = useState('');
  const [saveState, setSaveState] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const [itemSavingKey, setItemSavingKey] = useState('');
  const [savingAction, setSavingAction] = useState('');
  const [paymentQrOpen, setPaymentQrOpen] = useState(false);
  const [ownerBankOpen, setOwnerBankOpen] = useState(false);
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
    setItemSavingKey('');
    setPaymentQrOpen(false);
  }, [d.courtFeeTotal, d.ticketPrice, venueBank.ownerName, venueBank.bankName, venueBank.bankAccount, paymentDraft.items]);

  async function markSinglePaymentItem(item) {
    const key = paymentItemKey(item);
    if (item.paid || Number(item.amount) <= 0 || itemSavingKey || savingAction) return;
    setPaymentState('');
    setItemSavingKey(key);
    setSavingAction('markOwnerPayment');
    try {
      await onAction?.('markOwnerPayment', {
        currentYearMonth: d.currentYearMonth,
        paidAt: new Date().toISOString().slice(0, 10),
        totalAmount: Number(item.amount) || 0,
        bankSnapshot: {
          ownerName: venueOwnerName,
          bankName: selectedBank?.shortName || venueBankName,
          bankId: qrBankId,
          bankAccount: venueBankAccount,
        },
        items: [item],
        note: paymentNote,
      });
      setSelectedPaymentKeys(keys => keys.filter(value => value !== key));
      setPaymentQrOpen(false);
      setPaymentState('saved');
    } catch {
      setPaymentState('error');
    } finally {
      setItemSavingKey('');
      setSavingAction('');
    }
  }

  async function handleConfirmSelected() {
    const unpaidSelected = selectedPaymentItems.filter(item => !item.paid);
    if (savingAction || unpaidSelected.length === 0) return;
    setSavingAction('markOwnerPayment');
    setPaymentState('');
    try {
      await onAction?.('markOwnerPayment', {
        currentYearMonth: d.currentYearMonth,
        paidAt: new Date().toISOString().slice(0, 10),
        totalAmount: unpaidSelected.reduce((s, i) => s + (Number(i.amount) || 0), 0),
        bankSnapshot: {
          ownerName: venueOwnerName,
          bankName: selectedBank?.shortName || venueBankName,
          bankId: qrBankId,
          bankAccount: venueBankAccount,
        },
        items: unpaidSelected,
        note: paymentNote,
      });
      setPaymentNote('');
      setPaymentQrOpen(false);
      setPaymentState('saved');
      setSelectedPaymentKeys([]);
    } catch {
      setPaymentState('error');
    } finally {
      setSavingAction('');
    }
  }

  async function unmarkSinglePaymentItem(item) {
    const payment = ownerPaymentForItem(ownerPayments, item);
    const key = paymentItemKey(item);
    if (!payment?.id || itemSavingKey || savingAction) return;
    setPaymentState('');
    setItemSavingKey(key);
    setSavingAction('unmarkOwnerPayment');
    try {
      await onAction?.('unmarkOwnerPayment', {
        paymentId: payment.id,
        item,
      });
      setPaymentQrOpen(false);
      setPaymentState('saved');
    } catch {
      setPaymentState('error');
    } finally {
      setItemSavingKey('');
      setSavingAction('');
    }
  }

  if (!isTreasurer) {
    return (
      <PhoneFrame>
        <Screen style={{ paddingBottom: '72px' }}>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Chỉ thủ quỹ xem được quỹ team.</div>
          </Card>
          {savingAction && (
          <div role="status" aria-live="polite" style={loadingOverlayStyle}>
            <LoadingSpinner />
            <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
          </div>
        )}
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
              if (savingAction) return;
              setSavingAction('saveTeamFundConfig');
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
              } finally {
                setSavingAction('');
              }
            }}
            disabled={savingAction === 'saveTeamFundConfig'}
          >
            {savingAction === 'saveTeamFundConfig' ? 'Đang lưu…' : 'Lưu cấu hình quỹ'}
          </Button>
        </Card>

        <Card accent="finance" style={{ marginTop: 10, padding: '14px 12px', borderColor: 'rgba(96,165,250,0.24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Cần thanh toán
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                Nước, phát sinh, vé lẻ và tiền sân tháng này.
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
              const selected = selectedPaymentKeys.includes(key);
              const hasAmount = Number(item.amount) > 0;
              const selectable = !item.paid && hasAmount;
              const dimmed = !hasAmount && !item.paid;
              const payment = ownerPaymentForItem(ownerPayments, item);
              let borderColor = colors.borderSubtle;
              let bgColor = 'rgba(255,255,255,0.035)';
              if (item.paid) { borderColor = 'rgba(52,211,153,0.28)'; bgColor = 'rgba(52,211,153,0.04)'; }
              else if (selected) { borderColor = 'rgba(96,165,250,0.55)'; bgColor = 'rgba(96,165,250,0.07)'; }
              return (
                <div
                  key={key}
                  onClick={() => {
                    if (itemSavingKey || savingAction) return;
                    if (!hasAmount || item.paid) return;
                    setSelectedPaymentKeys(keys =>
                      keys.includes(key) ? keys.filter(v => v !== key) : [...keys, key]
                    );
                    setPaymentState('');
                    setPaymentQrOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    opacity: dimmed ? 0.55 : (itemSavingKey && itemSavingKey !== key ? 0.55 : 1),
                    cursor: selectable && !itemSavingKey ? 'pointer' : 'default',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, whiteSpace: 'nowrap' }}>
                      {item.yearMonth} · {item.paid ? 'Đã chuyển khoản' : !hasAmount ? 'Chưa có khoản' : 'Đã có số liệu, chưa CK'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: item.paid ? '#6ee7b7' : (hasAmount ? colors.warning : colors.textSecondary), ...type.mono }}>
                      {formatVND(item.amount || 0)}
                    </div>
                    {item.paid ? (
                      <div style={{ fontSize: 9, color: '#6ee7b7', fontWeight: 800 }}>
                        {payment?.paidAt ? formatPaymentDate(payment.paidAt) : '✓ Đã xác nhận'}
                      </div>
                    ) : hasAmount ? (
                      <div style={{ fontSize: 9, color: selected ? '#93c5fd' : colors.textSecondary, fontWeight: 700 }}>
                        {selected ? 'Đã chọn' : 'Bấm để chọn'}
                      </div>
                    ) : null}
                  </div>
                </div>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button
              variant="ghost"
              disabled={selectedPaymentItems.length === 0 || selectedPaymentTotal <= 0 || !!savingAction}
              style={{ flex: 1, padding: '12px 8px', fontSize: 13, whiteSpace: 'nowrap', opacity: selectedPaymentItems.length === 0 || selectedPaymentTotal <= 0 || !!savingAction ? 0.55 : 1 }}
              onClick={handleConfirmSelected}
            >
              {savingAction === 'markOwnerPayment' ? 'Đang xử lý…' : 'Xác nhận đã chuyển'}
            </Button>
            <Button
              variant="success"
              disabled={selectedPaymentItems.length === 0 || selectedPaymentTotal <= 0}
              style={{ flex: 1, padding: '12px 8px', fontSize: 13, whiteSpace: 'nowrap', opacity: selectedPaymentItems.length === 0 || selectedPaymentTotal <= 0 ? 0.55 : 1 }}
              onClick={() => setPaymentQrOpen(true)}
            >
              Thanh toán
            </Button>
          </div>

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
                  if (savingAction) return;
                  setSavingAction('markOwnerPayment');
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
                  } finally {
                    setSavingAction('');
                  }
                }}
              >
                {savingAction === 'markOwnerPayment' ? 'Đang xử lý…' : 'Đánh dấu đã chuyển'}
              </Button>
            </div>
          )}
        </Card>

        <Card accent="finance" style={{ marginTop: 10, padding: '14px 12px', borderColor: 'rgba(52,211,153,0.22)' }}>
          <button type="button" onClick={() => setOwnerBankOpen(!ownerBankOpen)} style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: colors.textPrimary,
            padding: 0,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  STK chủ sân
                </div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                  {venueOwnerName || 'Chưa có tên'} · {selectedBank?.shortName || venueBankName || 'Chưa chọn ngân hàng'} · {venueBankAccount || 'Chưa có STK'}
                </div>
              </div>
              <div style={{ fontSize: 18, color: '#6ee7b7', fontWeight: 900 }}>{ownerBankOpen ? '⌃' : '⌄'}</div>
            </div>
          </button>
          {ownerBankOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.borderSubtle}` }}>
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
              <Button
                block
                variant="success"
                style={{ marginTop: 12, padding: 12 }}
                onClick={async () => {
                  if (savingAction) return;
                  setSavingAction('saveTeamFundConfig');
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
                  } finally {
                    setSavingAction('');
                  }
                }}
                disabled={savingAction === 'saveTeamFundConfig'}
              >
                {savingAction === 'saveTeamFundConfig' ? 'Đang lưu…' : 'Lưu STK chủ sân'}
              </Button>
            </div>
          )}
        </Card>

        <Card accent="pickleball" style={{ marginTop: 10, padding: '14px 12px', borderColor: 'rgba(251,191,36,0.24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Giao dịch vé lẻ
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                {ticketStats.sessionCount || 0} buổi · {ticketStats.participantCount || 0} lượt · {formatVND(ticketStats.totalAmount || 0)}
              </div>
            </div>
            <button type="button" onClick={() => onAction?.('push', 'pickleball-calendar')} style={pillButtonStyle()}>
              Mở lịch
            </button>
          </div>
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)' }}>
            <div style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              Quỹ team cần trả hộ thành viên
            </div>
            <div style={{ fontSize: 17, color: colors.warning, fontWeight: 900, marginTop: 3, ...type.mono }}>{formatVND(teamFundDirectTotal)}</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3 }}>
              Chỉ gồm vé quỹ team trả trực tiếp. Vé có người ứng được cân bằng bằng dòng +/- trong từng giao dịch.
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
            {ticketRows.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 0' }}>
                Chưa có giao dịch vé lẻ trong tháng.
              </div>
            )}
            {ticketRows.map(ticket => {
              const ticketOpen = openTicketId === ticket.id;
              return (
                <div key={ticket.id} style={{ padding: '10px 0', borderTop: `1px solid ${colors.borderSubtle}` }}>
                  <button type="button" onClick={() => setOpenTicketId(ticketOpen ? '' : ticket.id)} style={{
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 900 }}>{ticket.dateLabel} · {ticket.timeLabel || 'Chưa có giờ'}</div>
                        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.memberLabels.join(', ') || 'Chưa có người tham gia'}
                        </div>
                        <div style={{ fontSize: 10, color: '#fde68a', marginTop: 3 }}>
                          {ticket.sourceLabel} · {ticketOpen ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: colors.warning, ...type.mono }}>{formatVND(ticket.totalAmount || 0)}</div>
                        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{formatVND(ticket.amountPerPerson || 0)}/người</div>
                      </div>
                    </div>
                  </button>
                  {ticketOpen && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {safeArray(ticket.ledgerRows).map((row, index) => {
                        const isPositive = Number(row.amount) > 0;
                            return (
                          <div key={`${ticket.id}-${row.memberId || row.name}-${index}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '6px 8px',
                            borderRadius: 9,
                            background: isPositive ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.07)',
                          }}>
                            <Avatar initial={row.initial} color={row.color} size={22} ring={false} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 900 }}>{row.name}</div>
                              <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 1 }}>{row.roleLabel}</div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 900, color: isPositive ? '#6ee7b7' : '#fca5a5', ...type.mono }}>
                              {formatSignedTicketAmount(row.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {ticketParticipantRows.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.borderSubtle}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Theo người tham gia
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {ticketParticipantRows.map(row => (
                  <div key={row.memberId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar initial={row.initial} color={row.color} size={26} ring={false} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 900 }}>{row.name}</div>
                      <div style={{ fontSize: 10, color: colors.textSecondary }}>{row.sessions} buổi vé lẻ trong tháng</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: row.amount > 0 ? '#6ee7b7' : '#fca5a5', ...type.mono }}>{formatSignedTicketAmount(row.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        {savingAction && (
          <div role="status" aria-live="polite" style={loadingOverlayStyle}>
            <LoadingSpinner />
            <div style={{ fontWeight: 800, color: colors.textPrimary }}>Đang xử lý…</div>
          </div>
        )}
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

function ownerPaymentForItem(payments, targetItem) {
  return safeArray(payments).find(payment => safeArray(payment?.items).some(item => paymentItemsMatch(item, targetItem, payment))) || null;
}

function paymentItemsMatch(item, targetItem, payment = {}) {
  return String(item?.key || item?.type || '') === String(targetItem?.key || targetItem?.type || '') &&
    String(item?.yearMonth || item?.year_month || payment?.yearMonth || payment?.year_month || '') === String(targetItem?.yearMonth || targetItem?.year_month || '');
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

function formatSignedTicketAmount(amount) {
  if (amount > 0) return `+${formatVND(amount)}`;
  if (amount < 0) return `-${formatVND(Math.abs(amount))}`;
  return '0 đ';
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
