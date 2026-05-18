import React, { useState, useEffect } from 'react'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth, joinGroup } from './lib/auth.js'
import { useApp } from './store.jsx'

function sameMemberName(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function memberInitials(member) {
  const fallback = String(member?.name || '?').trim().slice(0, 2).toUpperCase() || '?'
  return member?.initials || fallback
}

export function ScreenJoin({ push }) {
  const { dispatch } = useApp()

  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newName, setNewName] = useState('')
  const [duplicateMember, setDuplicateMember] = useState(null)
  const [requestSent, setRequestSent] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/join[/]([A-Z0-9-]+)/i)
    if (match) {
      const c = match[1].toUpperCase()
      setCode(c)
      doPreview(c)
    }
  }, [])

  function resetStep2() {
    setSelectedMember(null)
    setNewName('')
    setDuplicateMember(null)
    setRequestSent(false)
  }

  function findExistingMember(name) {
    return (preview?.members || []).find(m => sameMemberName(m.name, name))
  }

  async function doPreview(inviteCode) {
    const c = (inviteCode || code).toUpperCase().trim()
    if (!c || previewing) return
    setPreviewing(true)
    setError(null)
    setPreview(null)
    resetStep2()
    try {
      const sb = createSupabase(null)
      const { data, error: rpcErr } = await sb.rpc('preview_group', { p_invite_code: c })
      if (rpcErr || data?.error) {
        setError('Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.')
        return
      }
      setPreview({ ...data, members: data?.members || [] })
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

  async function handleJoinExisting(member = duplicateMember || selectedMember) {
    if (!member || joining) return
    const inviteCode = code.toUpperCase().trim()
    const existingToken = getStoredAuth().token
    setJoining(true)
    setError(null)
    try {
      const data = await joinGroup(inviteCode, member.name, existingToken)
      await loginWithToken(data, member, existingToken)
    } catch (e) {
      const msg = e.message === 'invalid_invite_code'
        ? 'Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.'
        : 'Không thể tham gia nhóm. Thử lại hoặc liên hệ thủ quỹ.'
      setError(msg)
    } finally {
      setJoining(false)
    }
  }

  async function requestJoin(cleanName) {
    setJoining(true)
    setError(null)
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
        setDuplicateMember({ name: cleanName })
        return
      }
      if (result?.error === 'group_not_found' || result?.error === 'invalid_invite_code') {
        setError('Mã nhóm không hợp lệ. Kiểm tra lại mã hoặc liên hệ thủ quỹ.')
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
    } catch (e) {
      setError('Không gửi được yêu cầu tham gia. Thử lại sau.')
    } finally {
      setJoining(false)
    }
  }

  async function handleSubmitStep2(e) {
    e?.preventDefault()
    if (joining || requestSent) return
    if (selectedMember) {
      setDuplicateMember(selectedMember)
      setError(null)
      return
    }

    const cleanName = newName.trim()
    if (!cleanName) return
    const existing = findExistingMember(cleanName)
    if (existing) {
      setDuplicateMember(existing)
      setError(null)
      return
    }
    await requestJoin(cleanName)
  }

  function handleUseDifferentName() {
    setSelectedMember(null)
    setDuplicateMember(null)
    setNewName('')
    setError(null)
  }

  function handleBackToCode() {
    setPreview(null)
    resetStep2()
    setError(null)
  }

  const groupName = preview?.group_name || preview?.groupName || 'nhóm'
  const canContinue = code.trim() && !previewing
  const canJoin = Boolean((selectedMember || newName.trim()) && !joining && !requestSent)

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

      <div style={{
        width: '100%', maxWidth: 360,
        background: preview ? 'var(--surface-1)' : 'transparent',
        borderRadius: 16,
        padding: preview ? 20 : 0,
        boxShadow: preview ? '0 2px 12px rgba(0,0,0,0.12)' : 'none',
      }}>
        {!preview ? (
          <form onSubmit={(e) => { e.preventDefault(); doPreview() }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
              Mã nhóm
            </div>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="VD: PICKLE-X7K2"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--border-1)',
                background: 'var(--surface-1)',
                color: 'var(--text-1)',
                fontSize: 15, letterSpacing: 1,
                outline: 'none',
                marginBottom: 12,
              }}
            />
            <button
              type="submit"
              disabled={!canContinue}
              style={{
                width: '100%',
                padding: '12px 16px', borderRadius: 10,
                background: canContinue ? 'var(--brand-1)' : 'var(--border-1)',
                color: canContinue ? '#fff' : 'var(--text-3)',
                border: 'none', fontWeight: 700,
                cursor: canContinue ? 'pointer' : 'default',
              }}
            >
              {previewing ? 'Đang tải...' : 'Tiếp tục'}
            </button>
          </form>
        ) : requestSent ? (
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)', marginBottom: 12 }}>
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
          <form onSubmit={handleSubmitStep2}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)', marginBottom: 12 }}>
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
                      setError(null)
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

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
                Hoặc nhập tên mới
              </div>
              <input
                value={newName}
                onChange={e => {
                  const value = e.target.value
                  setNewName(value)
                  setSelectedMember(null)
                  setDuplicateMember(findExistingMember(value) || null)
                  setError(null)
                }}
                placeholder="VD: Nguyễn Văn A"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-1)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {duplicateMember && (
              <div style={{
                marginTop: 12,
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

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleBackToCode}
                disabled={joining}
                style={{
                  flex: '0 0 96px',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-1)',
                  background: 'var(--surface-1)',
                  color: 'var(--text-1)',
                  fontWeight: 700,
                  cursor: joining ? 'default' : 'pointer',
                }}
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={!canJoin}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: canJoin ? 'var(--brand-1)' : 'var(--border-1)',
                  color: canJoin ? '#fff' : 'var(--text-3)',
                  border: 'none',
                  fontWeight: 700,
                  cursor: canJoin ? 'pointer' : 'default',
                }}
              >
                {joining ? 'Đang xử lý...' : 'Tham gia'}
              </button>
            </div>
          </form>
        )}
      </div>

      {error && (
        <div style={{
          color: '#EF4444', fontSize: 13,
          marginTop: 12, textAlign: 'center',
          maxWidth: 340,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
