import { createSupabase } from './supabase.js'

const TOKEN_KEY  = 'spliteasy_token'
const MEMBER_KEY = 'spliteasy_member'
const RECENT_SESSIONS_KEY = 'spliteasy_recent_sessions'
const RECENT_INVITES_KEY = 'spliteasy_recent_invites'
const PINNED_SESSION_KEY = 'spliteasy_pinned_session'

export function getStoredAuth() {
  try {
    // Migrate from multi-token array if present
    const multi = localStorage.getItem('spliteasy_tokens')
    if (multi) {
      const sessions = JSON.parse(multi)
      if (sessions.length > 0) {
        localStorage.setItem(TOKEN_KEY, sessions[0].token)
        localStorage.setItem(MEMBER_KEY, JSON.stringify(sessions[0].member))
      }
      localStorage.removeItem('spliteasy_tokens')
    }
    return {
      token: localStorage.getItem(TOKEN_KEY),
      member: JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null'),
    }
  } catch {
    return { token: null, member: null }
  }
}

export function storeAuth(token, member) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(MEMBER_KEY, JSON.stringify(member))
  rememberRecentSession(member, token)
}

export function saveRecentInvite(token, group) {
  if (!token || !group?.id) return
  const nextInvite = {
    token,
    groupId: group.id,
    groupName: group.name || '',
    emoji: group.emoji || '👥',
    treasurer: group.treasurer || group.treasurer_name || '',
  }
  const invites = getRecentInvites()
    .filter(invite => invite.token !== token && invite.groupId !== nextInvite.groupId)
  localStorage.setItem(RECENT_INVITES_KEY, JSON.stringify([nextInvite, ...invites].slice(0, 3)))
}

export function getRecentInvites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_INVITES_KEY) || '[]')
    const seen = new Set()
    const invites = (Array.isArray(parsed) ? parsed : [])
      .filter(invite => invite?.token && invite?.groupId)
      .filter(invite => {
        const key = `${invite.token}:${invite.groupId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 3)
    localStorage.setItem(RECENT_INVITES_KEY, JSON.stringify(invites))
    return invites
  } catch {
    return []
  }
}

export function getRecentSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SESSIONS_KEY) || '[]')
    const deduped = dedupeRecentSessions(parsed)
    localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(deduped))
    return deduped
  } catch {
    return []
  }
}

export function rememberRecentSession(member, token = '') {
  if (!member?.id) return
  const nextSession = {
    memberId: member.id,
    groupId: member.groupId || member.group_id || '',
    profileId: member.profileId || member.profile_id || '',
    memberName: member.name || member.memberName || '',
    groupName: member.groupName || '',
    hasPin: member.hasPin === true || member.has_pin === true,
    authToken: token || member.authToken || '',
    role: member.role || '',
  }
  const sessions = getRecentSessions()
    .filter(session => !hasMatchingSessionIdentity(session, nextSession))
  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify([nextSession, ...sessions].slice(0, 5)))
  if (isTreasurerRole(nextSession.role)) {
    setPinnedSession(nextSession)
  }
}

// Hardcoded admin shortcut — profile_id là stable identity, không cần member_id
// resume_session_by_profile RPC sẽ lookup member_id từ profile+group tại runtime
const DEFAULT_ADMIN_SESSION = {
  profileId: '6faee487-3a0e-42d7-b8b9-06ccf2248dbc',
  groupId: '11111111-1111-1111-1111-111111111111',
  memberName: 'Long',
  groupName: 'Virgo Pickleball 246',
  hasPin: true,
  role: 'treasurer',
  authToken: '',
}

export function getPinnedSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PINNED_SESSION_KEY) || 'null')
    if ((parsed?.profileId || parsed?.memberId) && parsed?.memberName) return parsed
  } catch {}
  return DEFAULT_ADMIN_SESSION
}

export function setPinnedSession(session) {
  if (!session?.memberId) return
  const payload = {
    memberId: session.memberId,
    groupId: session.groupId || '',
    profileId: session.profileId || '',
    memberName: session.memberName || '',
    groupName: session.groupName || '',
    hasPin: session.hasPin === true,
    authToken: session.authToken || '',
    role: session.role || '',
  }
  localStorage.setItem(PINNED_SESSION_KEY, JSON.stringify(payload))
}

export function clearPinnedSession() {
  localStorage.removeItem(PINNED_SESSION_KEY)
}

function isTreasurerRole(role) {
  return ['treasurer', 'admin', 'owner'].includes(String(role || '').toLowerCase())
}

export function removeRecentSession(sessionToRemove) {
  if (!sessionToRemove) return getRecentSessions()
  const sessions = getRecentSessions()
    .filter(session => !hasMatchingSessionIdentity(session, sessionToRemove))
  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(sessions))
  return sessions
}

function dedupeRecentSessions(sessions) {
  const seen = new Set()
  return (Array.isArray(sessions) ? sessions : [])
    .filter(session => session?.memberId && session?.memberName)
    .filter(session => {
      const keys = sessionIdentityKeys(session)
      if (keys.some(key => seen.has(key))) return false
      keys.forEach(key => seen.add(key))
      return true
    })
    .slice(0, 5)
}

function sessionIdentityKey(session) {
  return sessionIdentityKeys(session)[0] || 'member:'
}

function sessionIdentityKeys(session) {
  const keys = []
  const profileId = String(session?.profileId || session?.profile_id || '').trim()
  if (profileId) keys.push(`profile:${profileId}`)

  const memberId = String(session?.memberId || session?.id || '').trim()
  if (memberId) keys.push(`member:${memberId}`)

  const name = normalizedSessionName(session)
  if (name) keys.push(`name:${name}`)
  return keys.length ? keys : ['member:']
}

function hasMatchingSessionIdentity(left, right) {
  const rightKeys = new Set(sessionIdentityKeys(right))
  return sessionIdentityKeys(left).some(key => rightKeys.has(key))
}

function normalizedSessionName(session) {
  return String(session?.memberName || session?.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLowerCase()
}

export function clearAuth({ keepRecent = true } = {}) {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(MEMBER_KEY)
  localStorage.removeItem('spliteasy_tokens')
  localStorage.removeItem(PINNED_SESSION_KEY)
  if (!keepRecent) localStorage.removeItem(RECENT_SESSIONS_KEY)
}


// Tra cứu nhóm theo mã mời — không cần token (SECURITY DEFINER)
export async function lookupGroupByCode(inviteCode) {
  const sb = createSupabase()
  const { data, error } = await sb.rpc('lookup_group_by_code', { p_invite_code: inviteCode })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data // { id, name, emoji, invite_code, treasurer, member_names[] }
}

// Gọi Supabase RPC join_group() — không cần token
export async function joinGroup(inviteCode, name, existingToken = null) {
  const sb = createSupabase()
  const params = {
    p_invite_code: inviteCode,
    p_member_name: name,
  }
  if (existingToken) params.p_existing_token = existingToken
  const { data, error } = await sb.rpc('join_group', params)
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data  // { token, member_id, group_id, member_name }
}

export async function lookupGroupInviteLink(inviteToken) {
  const sb = createSupabase()
  const { data, error } = await sb.rpc('lookup_group_invite_link', { p_token: inviteToken })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function requestJoinByInviteLink(inviteToken, name) {
  const sb = createSupabase()
  const { data, error } = await sb.rpc('request_join_by_invite_link', {
    p_token: inviteToken,
    p_name: name,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

// Verify PIN for invite link login (returns boolean)
export async function verifyPinForInviteLink(memberId, pin) {
  const sb = createSupabase()
  const { data, error } = await sb.rpc('verify_member_pin', { p_member_id: memberId, p_pin: pin })
  if (error) throw error
  return data === true
}

export async function verifyProfilePin(profileId, pin) {
  if (!profileId || !pin) return false
  const sb = createSupabase()
  const { data, error } = await sb.rpc('verify_profile_pin', { p_profile_id: profileId, p_pin: pin })
  if (error) return false
  return !!data
}

export async function profilePinRequired(profileId) {
  if (!profileId) return false
  const sb = createSupabase()
  const { data, error } = await sb.rpc('profile_pin_required', { p_profile_id: profileId })
  if (error) return false
  return !!data
}

// Get token after PIN verified for invite link (returns token + member/group info)
export async function getTokenAfterPinVerify(memberId, pin) {
  const sb = createSupabase()

  // Verify PIN first
  const { data: pinOk, error: pinErr } = await sb.rpc('verify_member_pin', { p_member_id: memberId, p_pin: pin })
  if (pinErr) throw pinErr
  if (!pinOk) return { error: 'wrong_pin' }

  // PIN correct — issue new token using resume_recent_member_session RPC
  const { data, error } = await sb.rpc('resume_recent_member_session', { p_member_id: memberId })
  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return {
    token: data?.token || data?.authToken,
    member_id: data?.member_id || data?.memberId || memberId,
    group_id: data?.group_id || data?.groupId,
    member_name: data?.member_name || data?.memberName,
  }
}
