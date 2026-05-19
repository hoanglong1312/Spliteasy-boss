import React, { useState } from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <b>Render Error:</b>{'\n'}{this.state.error?.message}{'\n'}{this.state.error?.stack}
        </div>
      )
    }
    return this.props.children
  }
}
import { useApp } from './store.jsx'
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakToggle } from './tweaks-panel.jsx'
import { Icon, ScreenTransition } from './components.jsx'
import { getStoredAuth, joinGroup } from './lib/auth.js'
import { createSupabase } from './lib/supabase.js'
import { ScreenJoin } from './screen-join.jsx'
import { ScreenPersonal } from './screen-personal.jsx'
import ScreenHome from './screen-home.jsx'
import ScreenGroups, {
  ScreenGroupDetail, ScreenExpenseDetail, ScreenAddExpense,
  ScreenSettleAll, ScreenNewGroup, ScreenNotifications, ScreenApprovalQueue,
  ScreenPaymentFlow,
} from './screen-groups.jsx'
import ScreenSettlementPeriod from './screen-settlement-period.jsx'
import ScreenPickleball, {
  ScreenSessionDetail, ScreenAddSessionExpense, ScreenAddExternalTicket,
} from './screen-pickleball.jsx'
import ScreenProfile, { ScreenSettings } from './screen-profile.jsx'

// Helper: hex color with alpha — used for brand-soft in dark mode
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

function sameMemberName(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function memberInitials(member) {
  const fallback = String(member?.name || '?').trim().slice(0, 2).toUpperCase() || '?'
  return member?.initials || fallback
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "purple",
  "dark": false,
  "font": "inter",
  "avatarStyle": "initials",
  "showPickleball": true,
  "homeLayout": "overview",
  "balanceView": "cards",
  "pickleballStyle": "sporty",
  "addExpenseFlow": "single"
}/*EDITMODE-END*/;

const PALETTES = {
  purple: { c1: '#574EFA', c2: '#463EE3', soft: '#ECEBFF', shadow: 'rgba(87,78,250,0.35)' },
  teal:   { c1: '#0BA5A0', c2: '#067874', soft: '#DDF5F4', shadow: 'rgba(11,165,160,0.35)' },
  coral:  { c1: '#F26F4A', c2: '#D24C28', soft: '#FFE6DC', shadow: 'rgba(242,111,74,0.35)' },
  navy:   { c1: '#2A3B8C', c2: '#1A2766', soft: '#E1E4F4', shadow: 'rgba(42,59,140,0.35)' },
};

const FONTS = {
  inter:  { body: '"Inter", "Be Vietnam Pro", system-ui, sans-serif',  display: '"Inter", system-ui, sans-serif' },
  bevn:   { body: '"Be Vietnam Pro", "Inter", system-ui, sans-serif', display: '"Be Vietnam Pro", "Inter", sans-serif' },
  system: { body: 'system-ui, -apple-system, "Helvetica Neue", sans-serif', display: 'system-ui, -apple-system, sans-serif' },
};

function ScreenJoinGroup() {
  const { dispatch } = useApp()
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newName, setNewName] = useState('')
  const [duplicateMember, setDuplicateMember] = useState(null)
  const [requestSent, setRequestSent] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  function resetStep2() {
    setSelectedMember(null)
    setNewName('')
    setDuplicateMember(null)
    setRequestSent(false)
  }

  function findExistingMember(name) {
    return (preview?.members || []).find(m => sameMemberName(m.name, name))
  }

  async function handlePreview(e) {
    e?.preventDefault()
    const trimCode = code.trim().toUpperCase()
    if (!trimCode || previewing) return
    setPreviewing(true)
    setError('')
    setPreview(null)
    resetStep2()
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('preview_group', { p_invite_code: trimCode })
      if (rpcErr || data?.error) {
        setError('Mã nhóm không đúng. Kiểm tra lại nhé!')
        return
      }
      setPreview({ ...data, members: data?.members || [] })
    } catch (err) {
      setError('Lỗi kết nối. Thử lại sau.')
    } finally {
      setPreviewing(false)
    }
  }

  async function loginWithJoinResult(result, member, existingToken = null) {
    const nextToken = result?.token || existingToken
    if (!nextToken) throw new Error('join_group_no_token')
    await dispatch({
      type: 'LOGIN',
      token: nextToken,
      memberId: result.member_id || result.memberId || member?.id,
      groupId: result.group_id || result.groupId || preview?.group_id || preview?.groupId,
      memberName: result.member_name || result.memberName || member?.name,
    })
  }

  async function handleJoinExisting(member = duplicateMember || selectedMember) {
    if (!member || joining) return
    const trimCode = code.trim().toUpperCase()
    const existingToken = getStoredAuth().token
    setJoining(true)
    setError('')
    try {
      const result = await joinGroup(trimCode, member.name, existingToken)
      await loginWithJoinResult(result, member, existingToken)
    } catch (err) {
      const msg = err.message === 'invalid_invite_code'
        ? 'Mã nhóm không đúng. Kiểm tra lại nhé!'
        : 'Không tham gia được nhóm. Thử lại sau.'
      setError(msg)
    } finally {
      setJoining(false)
    }
  }

  async function requestJoin(cleanName) {
    setJoining(true)
    setError('')
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('request_to_join', {
        p_invite_code: code.trim().toUpperCase(),
        p_name: cleanName,
      })
      if (rpcErr) throw rpcErr

      const result = Array.isArray(data) ? data[0] : data
      if (result?.error === 'name_exists') {
        setDuplicateMember({ name: cleanName })
        return
      }
      if (result?.error === 'group_not_found' || result?.error === 'invalid_invite_code') {
        setError('Mã nhóm không đúng. Kiểm tra lại nhé!')
        return
      }
      if (
        result?.error
        && !['already_pending', 'pending'].includes(result.error)
        && result?.status !== 'pending'
      ) {
        throw new Error(result.error)
      }
      setRequestSent(true)
      setSelectedMember(null)
      setDuplicateMember(null)
      setNewName('')
    } catch (err) {
      setError('Không gửi được yêu cầu tham gia. Thử lại sau.')
    } finally {
      setJoining(false)
    }
  }

  async function handleJoin(e) {
    e?.preventDefault()
    if (joining || requestSent) return
    if (selectedMember) {
      setDuplicateMember(selectedMember)
      setError('')
      return
    }

    const trimName = newName.trim()
    if (!trimName) return
    const existing = findExistingMember(trimName)
    if (existing) {
      setDuplicateMember(existing)
      setError('')
      return
    }
    await requestJoin(trimName)
  }

  function handleUseDifferentName() {
    setSelectedMember(null)
    setDuplicateMember(null)
    setNewName('')
    setError('')
  }

  function handleBackToCode() {
    setPreview(null)
    resetStep2()
    setError('')
  }

  const groupName = preview?.group_name || preview?.groupName || 'nhóm'
  const canContinue = code.trim() && !previewing
  const canJoin = Boolean((selectedMember || newName.trim()) && !joining && !requestSent)

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', background: 'var(--surface-2)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 24, marginBottom: 20,
        background: 'var(--brand-soft)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="split" size={36} color="var(--brand-1)"/>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
        SpliteasyBoss
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 36, textAlign: 'center' }}>
        Nhập mã nhóm để vào nhóm của bạn
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        {!preview ? (
          <form onSubmit={handlePreview}>
            <div style={{ width: '100%', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                Mã nhóm
              </div>
              <input
                type="text"
                placeholder="VD: PICKLE-TEST"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: 12,
                  border: '1.5px solid var(--border-1)',
                  fontSize: 15, fontWeight: 600, letterSpacing: '0.04em',
                  background: 'var(--surface-1)', color: 'var(--text-1)',
                  outline: 'none', fontFamily: 'var(--vb-font-body)',
                  textTransform: 'uppercase',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!canContinue}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 0,
                background: canContinue ? 'var(--brand-1)' : 'var(--border-1)',
                color: canContinue ? '#fff' : 'var(--text-3)',
                fontSize: 15, fontWeight: 700,
                cursor: canContinue ? 'pointer' : 'default',
                fontFamily: 'var(--vb-font-body)',
                transition: 'background .15s',
              }}
            >
              {previewing ? 'Đang tải...' : 'Tiếp tục'}
            </button>
          </form>
        ) : requestSent ? (
          <div style={{
            background: 'var(--surface-1)',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
              Nhóm: {groupName}
            </div>
            <div style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--surface-2)',
              color: 'var(--text-1)',
              fontSize: 14,
              fontWeight: 700,
              textAlign: 'center',
            }}>
              Yêu cầu đã gửi, chờ thủ quỹ duyệt
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleJoin}
            style={{
              background: 'var(--surface-1)',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
              Nhóm: {groupName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
              Chọn tên có sẵn trong nhóm
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(preview.members || []).map(m => {
                const selected = selectedMember?.id === m.id
                return (
                  <button
                    key={m.id || m.name}
                    type="button"
                    onClick={() => {
                      if (joining) return
                      setSelectedMember(m)
                      setNewName('')
                      setDuplicateMember(m)
                      setError('')
                    }}
                    disabled={joining}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 38,
                      maxWidth: '100%',
                      padding: '6px 10px 6px 6px',
                      borderRadius: 999,
                      background: selected ? 'var(--brand-soft)' : 'var(--surface-2)',
                      border: `1.5px solid ${selected ? 'var(--brand-1)' : 'var(--border-1)'}`,
                      cursor: joining ? 'default' : 'pointer',
                      opacity: joining ? 0.6 : 1,
                    }}
                  >
                    <span style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: m.color || 'var(--brand-1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {memberInitials(m)}
                    </span>
                    <span style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-1)',
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
                      {m.name}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                Hoặc nhập tên mới
              </div>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={newName}
                onChange={e => {
                  const value = e.target.value
                  setNewName(value)
                  setSelectedMember(null)
                  setDuplicateMember(findExistingMember(value) || null)
                  setError('')
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: 12,
                  border: '1.5px solid var(--border-1)',
                  fontSize: 15, fontWeight: 500,
                  background: 'var(--surface-2)', color: 'var(--text-1)',
                  outline: 'none', fontFamily: 'var(--vb-font-body)',
                }}
              />
            </div>

            {duplicateMember && (
              <div style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                background: 'var(--vb-warn-100)',
                border: '1px solid rgba(238,162,62,0.35)',
                color: 'var(--text-1)',
              }}>
                <div style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 10 }}>
                  Tên <strong>{duplicateMember.name}</strong> đã có trong nhóm. Đây có phải là bạn không?
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleJoinExisting(duplicateMember)}
                    disabled={joining}
                    style={{
                      flex: '1 1 140px',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--brand-1)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: joining ? 'default' : 'pointer',
                      opacity: joining ? 0.6 : 1,
                    }}
                  >
                    {joining ? 'Đang tham gia...' : 'Đúng, đó là tôi'}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseDifferentName}
                    disabled={joining}
                    style={{
                      flex: '1 1 140px',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-1)',
                      background: 'var(--surface-1)',
                      color: 'var(--text-1)',
                      fontWeight: 700,
                      cursor: joining ? 'default' : 'pointer',
                      opacity: joining ? 0.6 : 1,
                    }}
                  >
                    Không, đổi tên khác
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleBackToCode}
                disabled={joining}
                style={{
                  flex: '0 0 96px',
                  height: 48,
                  borderRadius: 14,
                  border: '1px solid var(--border-1)',
                  background: 'var(--surface-1)',
                  color: 'var(--text-1)',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: joining ? 'default' : 'pointer',
                  fontFamily: 'var(--vb-font-body)',
                }}
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={!canJoin}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  border: 0,
                  background: canJoin ? 'var(--brand-1)' : 'var(--border-1)',
                  color: canJoin ? '#fff' : 'var(--text-3)',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: canJoin ? 'pointer' : 'default',
                  fontFamily: 'var(--vb-font-body)',
                  transition: 'background .15s',
                }}
              >
                {joining ? 'Đang xử lý...' : 'Tham gia'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div style={{ width: '100%', marginTop: 12, padding: '10px 14px',
            boxSizing: 'border-box',
            borderRadius: 10, background: 'var(--vb-danger-50)',
            color: 'var(--vb-danger-700)', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const { state } = useApp()
  const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
  const isJoinRoute = /\/join\//i.test(initialHash)
  const isPersonalRoute = /\/me\//i.test(initialHash)
  const initialHomeScreen = isPersonalRoute ? 'personal' : isJoinRoute ? 'join' : 'home'

  const initStacks = () => ({
    home:   [{ name: initialHomeScreen }],
    groups: [{ name: 'groups' }],
    pickle: [{ name: 'pickle' }],
    me:     [{ name: 'me' }],
  })
  const [stacks, setStacks]   = useState(initStacks)
  const [activeTab, setActiveTab] = useState('home')
  const [navDir, setNavDir]   = useState('forward')
  const [animKey, setAnimKey] = useState(0)

  const push = (name, params) => {
    setNavDir('forward')
    setAnimKey(k => k + 1)
    setStacks(s => ({ ...s, [activeTab]: [...s[activeTab], { name, params }] }))
  }
  const pushToTab = (tab, name, params) => {
    setNavDir('forward')
    setAnimKey(k => k + 1)
    setActiveTab(tab)
    setStacks(s => ({ ...s, [tab]: [...s[tab], { name, params }] }))
  }
  const pop = () => {
    setNavDir('backward')
    setAnimKey(k => k + 1)
    setStacks(s => ({ ...s, [activeTab]: s[activeTab].slice(0, -1) }))
  }
  const switchTab = (tab) => {
    if (tab === activeTab) {
      if (stacks[tab].length > 1) {
        setNavDir('backward')
        setAnimKey(k => k + 1)
        setStacks(s => ({ ...s, [tab]: [s[tab][0]] }))
      }
      return
    }
    setNavDir('tab')
    setAnimKey(k => k + 1)
    setActiveTab(tab)
  }

  const pal  = PALETTES[t.palette] || PALETTES.purple
  const dark = t.dark
  const font = FONTS[t.font] || FONTS.inter

  const themeVars = {
    '--brand-1':     pal.c1,
    '--brand-2':     pal.c2,
    '--brand-soft':  dark ? hexA(pal.c1, 0.18) : pal.soft,
    '--brand-shadow': pal.shadow,
    '--surface-1':   dark ? '#1A1B1F' : '#FFFFFF',
    '--surface-2':   dark ? '#24262C' : '#F1F5F9',
    '--text-1':      dark ? '#F2F3F5' : '#101828',
    '--text-2':      dark ? '#9CA3AF' : '#62748E',
    '--text-3':      dark ? '#6B7280' : '#9CA3AF',
    '--border-1':    dark ? '#2A2D33' : '#E5E5E7',
    '--border-strong': dark ? '#3A3D44' : '#99A1AF',
    '--vb-font-body':    font.body,
    '--vb-font-display': font.display,
    '--vb-success-100': dark ? 'rgba(46,191,67,0.16)' : '#F3FFF6',
    '--vb-success-700': dark ? '#5DD477' : '#1F8A4C',
    '--vb-danger-50':   dark ? 'rgba(231,0,11,0.16)' : '#FEF2F2',
    '--vb-danger-700':  dark ? '#FF7A85' : '#C8322B',
    '--vb-warn-100':    dark ? 'rgba(238,162,62,0.16)' : '#FFFAF2',
    '--vb-gray-75':     dark ? '#1F2126' : '#EFEFF1',
  }

  const stack   = stacks[activeTab]
  const current = stack[stack.length - 1]

  const renderScreen = () => {
    const p = current.params || {}
    switch (current.name) {
      case 'join':     return <ScreenJoin push={push} />
      case 'personal': return <ScreenPersonal />
      case 'home':     return <ScreenHome tweaks={t} push={push} pushToTab={pushToTab} switchTab={switchTab}/>
      case 'groups':   return <ScreenGroups tweaks={t} push={push}/>
      case 'pickle':   return <ScreenPickleball tweaks={t} push={push}/>
      case 'me':       return <ScreenProfile tweaks={t} push={push} setTweak={setTweak}/>
      case 'group-detail':    return <ScreenGroupDetail params={p} tweaks={t} push={push} pop={pop}/>
      case 'expense-detail':  return <ScreenExpenseDetail params={p} tweaks={t} push={push} pop={pop}/>
      case 'add-expense':     return <ScreenAddExpense params={p} tweaks={t} push={push} pop={pop}/>
      case 'settle-all':      return <ScreenSettleAll tweaks={t} pop={pop}/>
      case 'settle-group':    return <ScreenSettleAll params={p} tweaks={t} pop={pop}/>
      case 'new-group':       return <ScreenNewGroup params={p} pop={pop}/>
      case 'notifications':   return <ScreenNotifications pop={pop} tweaks={t}/>
      case 'approval-queue':  return <ScreenApprovalQueue params={p} tweaks={t} pop={pop}/>
      case 'payment-flow':    return <ScreenPaymentFlow tweaks={t} pop={pop}/>
      case 'settlement-period': return <ScreenSettlementPeriod params={p} tweaks={t} pop={pop}/>
      case 'session-detail':  return <ScreenSessionDetail params={p} pop={pop} tweaks={t}/>
      case 'add-session-expense': return <ScreenAddSessionExpense params={p} pop={pop} tweaks={t}/>
      case 'add-external-ticket': return <ScreenAddExternalTicket pop={pop} tweaks={t}/>
      case 'settings':        return <ScreenSettings pop={pop}/>
      default: return null
    }
  }

  const tabs = [
    { id: 'home',   label: 'Trang chủ', icon: 'home' },
    { id: 'groups', label: 'Nhóm',      icon: 'users' },
    ...(t.showPickleball ? [{ id: 'pickle', label: 'Pickleball', icon: 'pickle' }] : []),
    { id: 'me', label: 'Cá nhân', icon: 'user' },
  ]

  if (current.name === 'join' || current.name === 'personal') {
    return (
      <div style={{ ...themeVars, fontFamily: 'var(--vb-font-body)', height: '100%', background: 'var(--bg-1)', overflowY: 'auto' }}>
        <ErrorBoundary>
          {renderScreen()}
        </ErrorBoundary>
      </div>
    )
  }

  if (state.currentUserId === null) {
    return (
      <div style={{ ...themeVars, fontFamily: 'var(--vb-font-body)', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', overflowY: 'auto' }}>
        <ScreenJoinGroup/>
      </div>
    )
  }

  return (
    <div style={{ ...themeVars, fontFamily: 'var(--vb-font-body)', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
      {state._error && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
          padding: '10px 16px', background: 'rgba(248,113,113,0.12)',
          color: '#f87171', fontSize: 13, fontWeight: 600,
          borderBottom: '1px solid rgba(248,113,113,0.2)', textAlign: 'center',
        }}>
          ⚠️ {state._error}
        </div>
      )}
      {state._loading && state.groups.length === 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-2)',
        }}>
          <div style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 600 }}>Đang tải dữ liệu…</div>
        </div>
      )}
      <div style={{ height: 60, flexShrink: 0 }} aria-hidden="true"/>
      <div className="screen-scroll" data-screen-label={`${activeTab} • ${current.name}`} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <ScreenTransition direction={navDir === 'tab' ? 'fade' : navDir} screenKey={`${activeTab}-${stack.length}-${animKey}`}>
          <ErrorBoundary>
            {renderScreen()}
          </ErrorBoundary>
        </ScreenTransition>
      </div>
      <TabBar tabs={tabs} active={activeTab} onSwitch={switchTab} onAdd={() => push('add-expense')}/>
      <SpliteasyTweaks t={t} setTweak={setTweak} activeTab={activeTab} switchTab={switchTab}/>
    </div>
  )
}

function TabBar({ tabs, active, onSwitch, onAdd }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--surface-1)',
      borderTop: '1px solid var(--border-1)',
      paddingTop: 6, paddingBottom: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 50,
    }}>
      {tabs.map((tab, i) => {
        const isActive = active === tab.id
        const isMid = i === Math.floor(tabs.length / 2)
        return (
          <React.Fragment key={tab.id}>
            {isMid && (
              <button onClick={onAdd} style={{
                appearance: 'none', cursor: 'pointer',
                width: 52, height: 52, borderRadius: 16,
                background: 'var(--brand-1)', color: '#fff', border: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px -4px var(--brand-shadow)',
                marginTop: -8, transition: 'transform .15s ease',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.94)'}
              onMouseUp={(e) => e.currentTarget.style.transform = ''}
              onMouseLeave={(e) => e.currentTarget.style.transform = ''}
              >
                <Icon name="plus" size={26} color="#fff" stroke={2.5}/>
              </button>
            )}
            <button onClick={() => onSwitch(tab.id)} style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, height: 52, background: 'transparent', border: 0,
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              color: isActive ? 'var(--brand-1)' : 'var(--text-2)',
            }}>
              <Icon name={tab.icon} size={22} color={isActive ? 'var(--brand-1)' : 'var(--text-2)'} stroke={isActive ? 2 : 1.8}/>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '-0.005em' }}>{tab.label}</span>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function SpliteasyTweaks({ t, setTweak, activeTab, switchTab }) {
  return (
    <TweaksPanel title="Tweaks · Spliteasy">
      <TweakSection label="Giao diện"/>
      <TweakRadio label="Theme" value={t.dark ? 'dark' : 'light'} options={['light','dark']} onChange={(v) => setTweak('dark', v === 'dark')}/>
      <TweakColor label="Màu chủ đạo" value={t.palette}
        options={Object.keys(PALETTES).map(k => PALETTES[k].c1)}
        onChange={(v) => { const key = Object.keys(PALETTES).find(k => PALETTES[k].c1 === v); setTweak('palette', key) }}
      />
      <TweakSelect label="Font chữ" value={t.font}
        options={[
          { value: 'inter', label: 'Inter (mặc định)' },
          { value: 'bevn', label: 'Be Vietnam Pro' },
          { value: 'system', label: 'System UI' },
        ]}
        onChange={(v) => setTweak('font', v)}
      />
      <TweakRadio label="Avatar" value={t.avatarStyle} options={['photo','initials']} onChange={(v) => setTweak('avatarStyle', v)}/>
      <TweakSection label="Layout & nội dung"/>
      <TweakSelect label="Trang chủ" value={t.homeLayout}
        options={[
          { value: 'overview', label: 'Tổng quan (mặc định)' },
          { value: 'feed', label: 'Activity feed' },
          { value: 'compact', label: 'Tối giản' },
        ]}
        onChange={(v) => setTweak('homeLayout', v)}
      />
      <TweakSelect label="Ai nợ ai" value={t.balanceView}
        options={[
          { value: 'cards', label: 'Cards (scroll ngang)' },
          { value: 'list', label: 'List' },
          { value: 'graph', label: 'Biểu đồ' },
        ]}
        onChange={(v) => setTweak('balanceView', v)}
      />
      <TweakRadio label="Flow thêm chi" value={t.addExpenseFlow} options={['single','wizard']} onChange={(v) => setTweak('addExpenseFlow', v)}/>
      <TweakRadio label="Style Pickleball" value={t.pickleballStyle} options={['sporty','consistent']} onChange={(v) => setTweak('pickleballStyle', v)}/>
      <TweakToggle
        label="Bật tab Pickleball"
        value={t.showPickleball}
        onChange={(v) => {
          setTweak('showPickleball', v)
          if (!v && activeTab === 'pickle') switchTab('home')
        }}
      />
    </TweaksPanel>
  )
}

export default App
