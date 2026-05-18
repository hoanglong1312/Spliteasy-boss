import React, { useState, useEffect } from 'react'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth, joinGroup } from './lib/auth.js'
import { disambiguateMembers, useApp } from './store.jsx'

function sameMemberName(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

export function ScreenJoin({ push }) {
  const { dispatch } = useApp()

  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [storedMatch, setStoredMatch] = useState(null)
  const [showMemberPicker, setShowMemberPicker] = useState(true)
  const [newName, setNewName] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const [pinMember, setPinMember] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(null)
  const [verifyingPin, setVerifyingPin] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/join[/]([A-Z0-9-]+)/i)
    if (match) {
      const c = match[1].toUpperCase()
      setCode(c)
      doPreview(c)
    }
  }, [])

  async function doPreview(inviteCode) {
    const c = (inviteCode || code).toUpperCase().trim()
    if (!c) return
    setPreviewing(true)
    setError(null)
    setPreview(null)
    setStoredMatch(null)
    setShowMemberPicker(true)
    setNewName('')
    setRequestSent(false)
    setPinMember(null)
    setPin('')
    setPinError(null)
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('preview_group', { p_invite_code: c })
      if (rpcErr || data?.error) {
        setError('Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.')
      } else {
        const members = disambiguateMembers(data?.members || [])
        const nextPreview = { ...data, members }
        const storedAuth = getStoredAuth()
        const storedName = storedAuth.member?.name
        const match = storedName ? members.find(m => sameMemberName(m.name, storedName)) : null
        setPreview(nextPreview)
        setStoredMatch(match ? { ...match, storedName } : null)
        setShowMemberPicker(!match)
      }
    } catch (e) {
      setError('Không kết nối được. Kiểm tra mạng và thử lại.')
    } finally {
      setPreviewing(false)
    }
  }

  async function loginWithToken(data, member, existingToken = null) {
    const token = data.token || existingToken
    if (!token) throw new Error('join_group_no_token')
    await dispatch({
      type: 'LOGIN',
      token,
      memberId: data.member_id || data.memberId || member?.id,
      groupId: data.group_id || data.groupId || preview?.group_id || preview?.groupId,
      memberName: data.member_name || data.memberName || member?.name,
    })
    push('home')
  }

  async function handleJoinName(memberName, member = null) {
    const cleanName = String(memberName || '').trim()
    if (!cleanName || joining) return
    const inviteCode = code.toUpperCase().trim()
    const existingToken = getStoredAuth().token
    setJoining(true)
    setError(null)
    setPinError(null)
    try {
      const data = await joinGroup(inviteCode, cleanName, existingToken)
      await loginWithToken(data, member || { name: cleanName }, existingToken)
    } catch (e) {
      const msg = e.message === 'member_not_found'
        ? 'Tên này chưa có trong nhóm. Nhập tên mới để gửi yêu cầu tham gia.'
        : e.message === 'invalid_invite_code'
        ? 'Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.'
        : 'Không thể tham gia nhóm. Thử lại hoặc liên hệ thủ quỹ.'
      setError(msg)
    } finally {
      setJoining(false)
    }
  }

  async function handleConfirmStoredName() {
    if (!storedMatch) return
    await handleJoinName(storedMatch.storedName || storedMatch.name, storedMatch)
  }

  async function handleJoinMember(member) {
    await handleJoinName(member.name, member)
  }

  function handleSelectMember(member) {
    if (member.has_pin === true || member.hasPin === true) {
      setPinMember(member)
      setPin('')
      setPinError(null)
      setError(null)
      return
    }
    handleJoinMember(member)
  }

  async function handleConfirmPin(member = pinMember) {
    const cleanPin = pin.trim()
    if (!member || !/^\d{4,6}$/.test(cleanPin) || verifyingPin) return
    setVerifyingPin(true)
    setJoining(true)
    setError(null)
    setPinError(null)
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('verify_member_pin', {
        p_invite_code: code.toUpperCase().trim(),
        p_member_id: member.id,
        p_pin: cleanPin,
      })
      if (rpcErr) {
        setError('Không thể xác nhận PIN. Thử lại.')
        return
      }
      if (data?.token) {
        await loginWithToken(data, member)
        return
      }
      if (data?.error === 'wrong_pin') {
        setPinError('Mã PIN không đúng')
        setPin('')
        return
      }
      setError('Không thể xác nhận PIN. Thử lại.')
    } catch (e) {
      setError('Có lỗi xảy ra. Thử lại.')
    } finally {
      setVerifyingPin(false)
      setJoining(false)
    }
  }

  async function handleSubmitName(e) {
    e?.preventDefault()
    const cleanName = newName.trim()
    if (!cleanName || joining || requestSent) return

    const existing = (preview?.members || []).find(m =>
      sameMemberName(m.name, cleanName) || sameMemberName(m.displayName, cleanName)
    )
    if (existing) {
      handleSelectMember(existing)
      return
    }

    setJoining(true)
    setError(null)
    setPinError(null)
    try {
      const inviteCode = code.toUpperCase().trim()
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('request_to_join', {
        p_invite_code: inviteCode,
        p_name: cleanName,
      })
      if (rpcErr) throw rpcErr

      const result = Array.isArray(data) ? data[0] : data
      if (result?.error === 'name_exists') {
        const existingToken = getStoredAuth().token
        const joined = await joinGroup(inviteCode, cleanName, existingToken)
        await loginWithToken(joined, { name: cleanName }, existingToken)
        return
      }
      if (result?.error === 'group_not_found') {
        setError('Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.')
        return
      }
      if (result?.error && !['already_pending', 'pending'].includes(result.error)) {
        throw new Error(result.error)
      }
      setRequestSent(true)
      setShowMemberPicker(false)
      setPinMember(null)
      setPin('')
      setNewName('')
    } catch (e) {
      setError('Không gửi được yêu cầu tham gia. Thử lại sau.')
    } finally {
      setJoining(false)
    }
  }

  const groupName = preview?.group_name || preview?.groupName || 'nhóm'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-1)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏸</div>
      <h2 style={{ color: 'var(--text-1)', margin: '0 0 4px', textAlign: 'center' }}>
        Tham gia nhóm
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>
        Nhập mã từ thủ quỹ hoặc mở link nhóm
      </p>

      <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Mã nhóm (vd: PICKLE-X7K2)"
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid var(--border-1)',
              background: 'var(--surface-1)',
              color: 'var(--text-1)',
              fontSize: 15, letterSpacing: 1,
              outline: 'none',
            }}
            onKeyDown={e => e.key === 'Enter' && doPreview()}
          />
          <button
            onClick={() => doPreview()}
            disabled={previewing || !code.trim()}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--brand-1)', color: '#fff',
              border: 'none', fontWeight: 600, cursor: 'pointer',
              opacity: (previewing || !code.trim()) ? 0.5 : 1,
            }}
          >
            {previewing ? '...' : 'Tìm'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          color: '#EF4444', fontSize: 13,
          marginBottom: 12, textAlign: 'center',
          maxWidth: 320,
        }}>
          {error}
        </div>
      )}

      {preview && (
        <div style={{
          width: '100%', maxWidth: 340,
          background: 'var(--surface-1)',
          borderRadius: 16, padding: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-1)', marginBottom: 4 }}>
            {groupName}
          </div>
          {requestSent ? (
            <div style={{
              marginTop: 14,
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
          ) : storedMatch && !showMemberPicker ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--text-1)', marginBottom: 14 }}>
                Vào nhóm {groupName} với tên <strong>{storedMatch.storedName || storedMatch.name}</strong>?
              </div>
              <button
                onClick={handleConfirmStoredName}
                disabled={joining}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--brand-1)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: joining ? 'default' : 'pointer',
                  opacity: joining ? 0.6 : 1,
                }}
              >
                {joining ? 'Đang tham gia...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => {
                  setShowMemberPicker(true)
                  setPinMember(null)
                  setPin('')
                  setPinError(null)
                  setError(null)
                }}
                disabled={joining}
                style={{
                  appearance: 'none',
                  display: 'block',
                  margin: '12px auto 0',
                  padding: 0,
                  background: 'transparent',
                  border: 0,
                  color: 'var(--text-2)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: joining ? 'default' : 'pointer',
                }}
              >
                Dùng tên khác
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '12px 0 12px' }}>
                Bạn là ai trong nhóm này?
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(preview.members || []).map(m => {
                  const selectedForPin = pinMember?.id === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => !joining && !verifyingPin && handleSelectMember(m)}
                      disabled={joining || verifyingPin}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 38,
                        maxWidth: '100%',
                        padding: '6px 10px 6px 6px',
                        borderRadius: 999,
                        background: selectedForPin ? 'var(--brand-soft)' : 'var(--surface-2)',
                        border: `1.5px solid ${selectedForPin ? 'var(--brand-1)' : 'var(--border-1)'}`,
                        cursor: joining || verifyingPin ? 'default' : 'pointer',
                        opacity: joining || verifyingPin ? 0.6 : 1,
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
                        {m.initials}
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
                        {m.displayName || m.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              {pinMember && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
                    Nhập PIN cho {pinMember.displayName || pinMember.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={e => e.key === 'Enter' && handleConfirmPin(pinMember)}
                      type="password"
                      inputMode="numeric"
                      autoFocus
                      placeholder="PIN 4-6 số"
                      style={{
                        flex: 1, minWidth: 0,
                        padding: '10px 12px', borderRadius: 10,
                        border: `1.5px solid ${pinError ? '#EF4444' : 'var(--border-1)'}`,
                        background: 'var(--surface-1)',
                        color: 'var(--text-1)',
                        fontSize: 15,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleConfirmPin(pinMember)}
                      disabled={!/^\d{4,6}$/.test(pin) || verifyingPin}
                      style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: 'var(--brand-1)', color: '#fff',
                        border: 'none', fontWeight: 700, cursor: 'pointer',
                        opacity: (!/^\d{4,6}$/.test(pin) || verifyingPin) ? 0.5 : 1,
                      }}
                    >
                      {verifyingPin ? '...' : 'Xác nhận'}
                    </button>
                  </div>
                  {pinError && (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#EF4444' }}>
                      {pinError}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmitName} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Hoặc nhập tên mới..."
                    style={{
                      flex: 1, minWidth: 0,
                      padding: '11px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border-1)',
                      background: 'var(--surface-2)',
                      color: 'var(--text-1)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={joining || !newName.trim()}
                    style={{
                      padding: '11px 12px',
                      borderRadius: 10,
                      background: 'var(--brand-1)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      cursor: joining || !newName.trim() ? 'default' : 'pointer',
                      opacity: joining || !newName.trim() ? 0.5 : 1,
                    }}
                  >
                    Gửi
                  </button>
                </div>
              </form>
            </>
          )}

          {joining && !requestSent && (
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
              Đang tham gia...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
