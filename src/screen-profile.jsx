import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from './store.jsx'
import { ME, totalBalances } from './data.jsx'
import { Icon, Avatar, Money, Button, Card, iconBtnStyle, ListRow, SectionHeader, NavHeader } from './components.jsx'
import { exportMonthlyCSV } from './lib/export.js'
import { BANK_LIST } from './lib/vietqr.js'

// Profile / Cá nhân tab — personal stats + settings
const PRESET_COLORS = ['#574EFA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const PIN_RE = /^\d{4,6}$/

function getBank(bankValue) {
  return BANK_LIST.find(b => b.id === bankValue || b.shortName === bankValue || b.name === bankValue)
}

function getBankLabel(bankValue) {
  return getBank(bankValue)?.shortName || bankValue || ''
}

function normalizeBankId(bankValue) {
  return getBank(bankValue)?.id || bankValue || ''
}

function maskBankAccount(account) {
  const clean = String(account || '').replace(/\s+/g, '')
  if (!clean) return ''
  if (clean.length <= 4) return '****'
  return `**** ${clean.slice(-4)}`
}

function ScreenProfile({ tweaks, push }) {
  const { state, dispatch } = useApp();
  const meId = state.currentUserId || ME;
  const userName = state.currentUserName || 'Bạn';
  const now = new Date();
  const currentMonthLabel = `Tháng ${now.getMonth() + 1}`;
  const me = state.members.find(m => m.id === meId) || {
    name: state.currentUserName || 'Bạn',
    short: state.currentUserName || 'Bạn',
    initials: (state.currentUserName || 'B')[0].toUpperCase(),
    color: '#574EFA',
    isMe: true,
  };
  const currentBankName = me.bankName ?? me.bank_name ?? '';
  const currentBankAccount = me.bankAccount ?? me.bank_account ?? '';
  const currentBankAccountName = me.bankAccountName ?? me.bank_account_name ?? '';
  const hasPin = me.hasPin === true || me.has_pin === true;
  const [bankName, setBankName] = useState(normalizeBankId(currentBankName));
  const [bankAccount, setBankAccount] = useState(currentBankAccount || '');
  const [bankAccountName, setBankAccountName] = useState(currentBankAccountName || '');
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState(null);
  const [pinMode, setPinMode] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState(null);
  const [pinMessage, setPinMessage] = useState(null);

  const totals = useMemo(() => totalBalances(state.groups, meId), [state.groups, meId]);
  const netBalance = useMemo(
    () => Object.values(totals).reduce((sum, value) => sum + value, 0),
    [totals]
  );
  const monthStats = useMemo(() => {
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const monthSessions = (state.pickle.sessions || []).filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && new Date(s.date) <= now;
    });
    const attendedCount = monthSessions.filter(s => (s.attendees || []).includes(meId)).length;
    const totalCount = monthSessions.length;
    const attendancePct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
    return { attendedCount, totalCount, attendancePct };
  }, [state.pickle.sessions, meId, now]);

  const netLabel = netBalance > 0 ? 'Được nhận' : netBalance < 0 ? 'Nợ' : 'Cân bằng';
  const netColor = netBalance > 0 ? 'var(--vb-success-700)' : netBalance < 0 ? 'var(--vb-danger-700)' : 'var(--text-1)';
  const activeColor = me.color || '#574EFA';
  const currentBankLabel = getBankLabel(currentBankName);
  const maskedBankAccount = maskBankAccount(currentBankAccount);
  const hasBankInfo = Boolean(currentBankName || currentBankAccount || currentBankAccountName);

  useEffect(() => {
    setBankName(normalizeBankId(currentBankName));
    setBankAccount(currentBankAccount || '');
    setBankAccountName(currentBankAccountName || '');
  }, [currentBankName, currentBankAccount, currentBankAccountName]);

  function resetBankDraft() {
    setBankName(normalizeBankId(currentBankName));
    setBankAccount(currentBankAccount || '');
    setBankAccountName(currentBankAccountName || '');
  }

  function openBankForm() {
    resetBankDraft();
    setBankMessage(null);
    setIsEditingBank(true);
  }

  function handleCancelBankInfo() {
    resetBankDraft();
    setBankMessage(null);
    setIsEditingBank(false);
  }

  async function handleSaveBankInfo() {
    if (bankSaving) return;
    setBankSaving(true);
    setBankMessage(null);
    try {
      await dispatch({
        type: 'UPDATE_BANK_INFO',
        bankName: bankName.trim() || null,
        bankAccount: bankAccount.trim() || null,
        bankAccountName: bankAccountName.trim() || null,
      });
      setBankMessage({ type: 'success', text: 'Đã lưu thông tin ngân hàng' });
      setIsEditingBank(false);
    } catch (err) {
      setBankMessage({ type: 'error', text: 'Không lưu được thông tin ngân hàng' });
    } finally {
      setBankSaving(false);
    }
  }

  function openPinForm(mode) {
    setPinMode(mode);
    setPinValue('');
    setPinConfirm('');
    setPinError(null);
    setPinMessage(null);
  }

  async function handleSavePin() {
    if (pinSaving) return;
    if (!PIN_RE.test(pinValue)) {
      setPinError('PIN cần 4-6 chữ số');
      return;
    }
    if (pinValue !== pinConfirm) {
      setPinError('PIN xác nhận không khớp');
      return;
    }
    setPinSaving(true);
    setPinError(null);
    setPinMessage(null);
    try {
      await dispatch({ type: 'SET_MEMBER_PIN', pin: pinValue });
      setPinMode(null);
      setPinValue('');
      setPinConfirm('');
      setPinMessage({ type: 'success', text: 'Đã lưu mã PIN' });
    } catch (err) {
      setPinError('Không lưu được mã PIN');
    } finally {
      setPinSaving(false);
    }
  }

  async function handleResetPin() {
    if (pinSaving || !me.id) return;
    if (!window.confirm('Xóa mã PIN của bạn?')) return;
    setPinSaving(true);
    setPinError(null);
    setPinMessage(null);
    try {
      await dispatch({ type: 'SET_MEMBER_PIN', pin: null });
      setPinMode(null);
      setPinValue('');
      setPinConfirm('');
      setPinMessage({ type: 'success', text: 'Đã xóa mã PIN' });
    } catch (err) {
      setPinMessage({ type: 'error', text: 'Không xóa được mã PIN' });
    } finally {
      setPinSaving(false);
    }
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
          Hồ sơ
        </div>
        <button onClick={() => push('settings')} style={iconBtnStyle()} aria-label="Cài đặt">
          <Icon name="settings" size={20} color="var(--text-1)"/>
        </button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card style={{ padding: '22px 18px', textAlign: 'center' }}>
          <Avatar member={me} size={72} style={tweaks.avatarStyle} ring/>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-1)', marginTop: 12 }}>
            {userName || me.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginTop: 3 }}>
            {me.short?.toLowerCase()}@spliteasy.vn
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
            {PRESET_COLORS.map(color => (
              <ColorSwatch
                key={color}
                color={color}
                active={activeColor.toLowerCase() === color.toLowerCase()}
                onClick={() => {
                  if (activeColor.toLowerCase() !== color.toLowerCase()) {
                    dispatch({ type: 'UPDATE_MEMBER_COLOR', color });
                  }
                }}
              />
            ))}
          </div>
        </Card>

        <div>
          <SectionHeader title="Tháng này" action={currentMonthLabel} onAction={() => {}}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ProfileStatCard
              icon="pickle"
              iconColor="var(--brand-1)"
              iconBg="var(--brand-soft)"
              label="Buổi pickleball"
              value={`${monthStats.attendedCount}/${monthStats.totalCount}`}
              sub="buổi đã đi"
            />
            <ProfileStatCard
              icon={netBalance >= 0 ? 'arrow-down' : 'arrow-up'}
              iconColor={netBalance >= 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)'}
              iconBg={netBalance >= 0 ? 'var(--vb-success-100)' : 'var(--vb-danger-50)'}
              label={netLabel}
              value={<Money value={Math.abs(netBalance)} size={20} color={netColor} compact/>}
              sub="số dư net"
            />
          </div>
          <AttendanceCard pct={monthStats.attendancePct}/>
        </div>

        {me?.role === 'treasurer' && (
          <Button
            variant="secondary"
            full
            icon="arrow-down"
            onClick={() => exportMonthlyCSV(state)}
            style={{ justifyContent: 'flex-start' }}
          >
            Xuất báo cáo tháng (CSV)
          </Button>
        )}

        <div>
          <SectionHeader title="Tài khoản ngân hàng"/>
          <Card style={{ padding: 16 }}>
            {!isEditingBank && hasBankInfo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>
                        {currentBankLabel || 'Ngân hàng'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginTop: 6 }}>
                        {maskedBankAccount || 'Chưa có số tài khoản'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 3 }}>
                        {currentBankAccountName || 'Chưa có tên chủ tài khoản'}
                      </div>
                    </div>
                    <Button variant="brandSoft" size="sm" onClick={openBankForm}>
                      Sửa
                    </Button>
                  </div>
                </div>
                {bankMessage && (
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: bankMessage.type === 'error' ? 'var(--vb-danger-700)' : 'var(--vb-success-700)',
                  }}>
                    {bankMessage.text}
                  </div>
                )}
              </div>
            )}

            {!isEditingBank && !hasBankInfo && (
              <Button variant="brandSoft" full onClick={openBankForm}>
                Thêm tài khoản ngân hàng
              </Button>
            )}

            {isEditingBank && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ProfileField label="Ngân hàng">
                  <select
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    style={profileControlStyle()}
                  >
                    <option value="">Chọn ngân hàng</option>
                    {bankName && !getBank(bankName) && (
                      <option value={bankName}>{getBankLabel(bankName)}</option>
                    )}
                    {BANK_LIST.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.shortName}</option>
                    ))}
                  </select>
                </ProfileField>
                <ProfileField label="Số tài khoản">
                  <input
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    placeholder="Nhập số tài khoản"
                    style={profileControlStyle()}
                  />
                </ProfileField>
                <ProfileField label="Tên chủ tài khoản">
                  <input
                    value={bankAccountName}
                    onChange={e => setBankAccountName(e.target.value)}
                    placeholder="Nhập tên chủ tài khoản"
                    style={profileControlStyle()}
                  />
                </ProfileField>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={handleCancelBankInfo} disabled={bankSaving}>
                    Hủy
                  </Button>
                  <Button style={{ flex: 1 }} onClick={handleSaveBankInfo} disabled={bankSaving}>
                    {bankSaving ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                </div>
                {bankMessage && (
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: bankMessage.type === 'error' ? 'var(--vb-danger-700)' : 'var(--vb-success-700)',
                  }}>
                    {bankMessage.text}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHeader title="Bảo mật / Mã PIN"/>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--text-2)', fontWeight: 600, marginBottom: 14 }}>
              Mã PIN bảo vệ tài khoản khi chia sẻ link nhóm. Nếu quên PIN, nhờ thủ quỹ reset giúp.
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!hasPin ? (
                <Button variant="brandSoft" onClick={() => openPinForm('set')} disabled={pinSaving}>
                  Đặt mã PIN
                </Button>
              ) : (
                <>
                  <Button variant="brandSoft" onClick={() => openPinForm('change')} disabled={pinSaving}>
                    Đổi PIN
                  </Button>
                  <Button variant="danger" onClick={handleResetPin} disabled={pinSaving}>
                    Xóa PIN
                  </Button>
                </>
              )}
            </div>

            {pinMode && (
              <div style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border-1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <ProfileField label={pinMode === 'change' ? 'PIN mới' : 'PIN'}>
                  <input
                    value={pinValue}
                    onChange={e => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    type="password"
                    inputMode="numeric"
                    placeholder="4-6 số"
                    style={profileControlStyle({ borderColor: pinError ? 'var(--vb-danger-700)' : undefined })}
                  />
                </ProfileField>
                <ProfileField label="Nhập lại PIN">
                  <input
                    value={pinConfirm}
                    onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    type="password"
                    inputMode="numeric"
                    placeholder="4-6 số"
                    style={profileControlStyle({ borderColor: pinError ? 'var(--vb-danger-700)' : undefined })}
                  />
                </ProfileField>
                {pinError && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vb-danger-700)' }}>
                    {pinError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setPinMode(null)} disabled={pinSaving}>
                    Hủy
                  </Button>
                  <Button style={{ flex: 1 }} onClick={handleSavePin} disabled={pinSaving || !PIN_RE.test(pinValue) || !PIN_RE.test(pinConfirm)}>
                    {pinSaving ? 'Đang lưu...' : 'Lưu PIN'}
                  </Button>
                </div>
              </div>
            )}

            {pinMessage && (
              <div style={{
                marginTop: 12,
                fontSize: 12,
                fontWeight: 700,
                color: pinMessage.type === 'error' ? 'var(--vb-danger-700)' : 'var(--vb-success-700)',
              }}>
                {pinMessage.text}
              </div>
            )}
          </Card>
        </div>

        <Button
          variant="danger"
          full
          icon="log-out"
          onClick={() => {
            if (window.confirm('Đăng xuất khỏi SpliteasyBoss?')) {
              dispatch({ type: 'LOGOUT' });
            }
          }}
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}

function ProfileField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function profileControlStyle(overrides = {}) {
  return {
    width: '100%',
    minHeight: 42,
    boxSizing: 'border-box',
    borderRadius: 12,
    border: `1px solid ${overrides.borderColor || 'var(--border-1)'}`,
    background: 'var(--surface-1)',
    color: 'var(--text-1)',
    fontFamily: 'var(--vb-font-body)',
    fontSize: 14,
    fontWeight: 600,
    padding: '0 12px',
    outline: 'none',
    ...overrides,
  };
}

function ColorSwatch({ color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color}
      aria-label={`Chọn màu ${color}`}
      aria-pressed={active}
      style={{
        appearance: 'none',
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: active ? '2px solid var(--text-1)' : '2px solid var(--surface-1)',
        background: color,
        cursor: 'pointer',
        boxShadow: active ? `0 0 0 3px ${color}33` : '0 0 0 1px var(--border-1)',
      }}
    />
  );
}

function MenuIcon({ name, bg, c }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={name} size={18} color={c}/>
    </div>
  );
}

function ProfileStatCard({ icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div style={{
      padding: 14, background: 'var(--surface-1)', border: '1px solid var(--border-1)',
      borderRadius: 14, boxShadow: 'var(--vb-shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={14} color={iconColor}/>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: 'var(--text-1)', fontFamily: 'var(--vb-font-num)' }}>
        {value}
      </div>
      <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{sub}</div>
    </div>
  );
}

function AttendanceCard({ pct }) {
  return (
    <Card style={{ marginTop: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>Tham gia</span>
        <span style={{ fontFamily: 'var(--vb-font-num)', fontSize: 20, fontWeight: 800, color: 'var(--brand-1)' }}>{pct}%</span>
      </div>
      <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: 'var(--brand-1)',
          transition: 'width .25s ease',
        }}/>
      </div>
    </Card>
  );
}

function ScreenSettings({ pop }) {
  const { dispatch } = useApp();
  return (
    <div style={{ paddingBottom: 32 }}>
      <NavHeader title="Cài đặt" onBack={pop}/>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <ListRow left={<MenuIcon name="user" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Thông tin cá nhân" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>}/>
          <ListRow left={<MenuIcon name="card" bg="var(--vb-success-100)" c="var(--vb-success-700)"/>} title="Tiền tệ" subtitle="VND" right={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--vb-warn-100)', color: '#B45309' }}>Sắp ra mắt</span>}/>
          <ListRow left={<MenuIcon name="bell" bg="#FFF7E0" c="#A05C0C"/>} title="Nhắc qua Zalo" subtitle="Đang bật" right={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--vb-warn-100)', color: '#B45309' }}>Sắp ra mắt</span>} divider={false}/>
        </Card>
        <Card>
          <ListRow left={<MenuIcon name="sparkle" bg="var(--brand-soft)" c="var(--brand-1)"/>} title="Phiên bản" subtitle="Spliteasy 1.0.0 (build 2026.05)" divider={false}/>
        </Card>
        {/* Logout */}
        <div style={{ padding: '8px 16px 32px' }}>
          <button
            onClick={() => {
              if (window.confirm('Đăng xuất khỏi SpliteasyBoss?')) {
                dispatch({ type: 'LOGOUT' });
              }
            }}
            style={{
              appearance: 'none', width: '100%', height: 48,
              borderRadius: 14, border: 0, cursor: 'pointer',
              background: 'var(--vb-danger-50)', color: 'var(--vb-danger-700)',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--vb-font-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="log-out" size={18} color="var(--vb-danger-700)"/>
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScreenProfile
export { ScreenSettings }
