import React, { useState, useEffect } from 'react'
import { createSupabase } from './lib/supabase.js'
import { useApp } from './store.jsx'

export function ScreenJoin({ push }) {
  const { dispatch } = useApp()

  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
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
    setPinMember(null)
    setPin('')
    setPinError(null)
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('preview_group', { p_invite_code: c })
      if (rpcErr || data?.error) {
        setError('Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.')
      } else {
        setPreview(data)
      }
    } catch (e) {
      setError('Không kết nối được. Kiểm tra mạng và thử lại.')
    } finally {
      setPreviewing(false)
    }
  }

  async function loginWithToken(data, member) {
    await dispatch({
      type: 'LOGIN',
      token: data.token,
      memberId: data.member_id || data.memberId || member?.id,
      groupId: data.group_id || data.groupId || preview?.group_id,
      memberName: data.member_name || data.memberName || member?.name,
    })
    push('home')
  }

  async function handleJoinMember(member) {
    setJoining(true)
    setError(null)
    setPinError(null)
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('join_group', {
        p_invite_code: code.toUpperCase().trim(),
        p_member_name: member.name,
      })
      if (rpcErr || data?.error) {
        setError('Không thể tham gia nhóm. Thử lại hoặc liên hệ thủ quỹ.')
        return
      }
      await loginWithToken(data, member)
    } catch (e) {
      setError('Có lỗi xảy ra. Thử lại.')
    } finally {
      setJoining(false)
    }
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
            {preview.group_name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
            Bạn là ai trong nhóm này?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(preview.members || []).map(m => {
              const selectedForPin = pinMember?.id === m.id
              return (
                <div key={m.id}>
                  <button
                    onClick={() => !joining && !verifyingPin && handleSelectMember(m)}
                    disabled={joining || verifyingPin}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--surface-2)',
                      border: `1.5px solid ${selectedForPin ? 'var(--brand-1)' : 'transparent'}`,
                      cursor: joining || verifyingPin ? 'default' : 'pointer',
                      textAlign: 'left', width: '100%',
                      opacity: joining || verifyingPin ? 0.6 : 1,
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { if (!joining && !verifyingPin) e.currentTarget.style.borderColor = 'var(--brand-1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = selectedForPin ? 'var(--brand-1)' : 'transparent' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: m.color || 'var(--brand-1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {m.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
                        {m.name}
                      </div>
                      {m.role === 'treasurer' && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>
                          Thủ quỹ
                        </div>
                      )}
                    </div>
                  </button>

                  {selectedForPin && (
                    <div style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-1)',
                    }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={pin}
                          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={e => e.key === 'Enter' && handleConfirmPin(m)}
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
                          onClick={() => handleConfirmPin(m)}
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
                </div>
              )
            })}
          </div>

          {joining && (
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
              Đang tham gia...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
