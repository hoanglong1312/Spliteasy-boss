import { createSupabase } from './supabase.js'

const TOKEN_KEY  = 'spliteasy_token'
const MEMBER_KEY = 'spliteasy_member'
const RECENT_SESSIONS_KEY = 'spliteasy_recent_sessions'

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
  }
  const nextKey = sessionIdentityKey(nextSession)
  const sessions = getRecentSessions()
    .filter(session => sessionIdentityKey(session) !== nextKey)
  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify([nextSession, ...sessions].slice(0, 5)))
}

function dedupeRecentSessions(sessions) {
  const seen = new Set()
  return (Array.isArray(sessions) ? sessions : [])
    .filter(session => session?.memberId && session?.memberName)
    .filter(session => {
      const key = sessionIdentityKey(session)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
}

function sessionIdentityKey(session) {
  const profileId = String(session?.profileId || session?.profile_id || '').trim()
  if (profileId) return `profile:${profileId}`
  const name = String(session?.memberName || session?.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLowerCase()
  return `name:${name || session?.memberId || ''}`
}

export function clearAuth({ keepRecent = true } = {}) {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(MEMBER_KEY)
  localStorage.removeItem('spliteasy_tokens')
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
