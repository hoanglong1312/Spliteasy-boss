import { createSupabase } from './supabase.js'

const TOKENS_KEY        = 'spliteasy_tokens'
const LEGACY_TOKEN_KEY  = 'spliteasy_token'
const LEGACY_MEMBER_KEY = 'spliteasy_member'

export function getStoredAuth() {
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
    const legacyMember = JSON.parse(localStorage.getItem(LEGACY_MEMBER_KEY) || 'null')
    const sessions = JSON.parse(localStorage.getItem(TOKENS_KEY) || '[]')

    if (legacy && legacyMember && !sessions.find(s => s.token === legacy)) {
      sessions.push({ token: legacy, member: legacyMember })
      localStorage.setItem(TOKENS_KEY, JSON.stringify(sessions))
      localStorage.removeItem(LEGACY_TOKEN_KEY)
      localStorage.removeItem(LEGACY_MEMBER_KEY)
    }

    return {
      token: sessions[0]?.token || null,
      member: sessions[0]?.member || null,
      sessions,
    }
  } catch {
    return { token: null, member: null, sessions: [] }
  }
}

export function storeAuth(token, member) {
  try {
    const sessions = JSON.parse(localStorage.getItem(TOKENS_KEY) || '[]')
    const idx = sessions.findIndex(s => s.member?.groupId === member?.groupId)
    if (idx >= 0) {
      sessions[idx] = { token, member }
    } else {
      sessions.push({ token, member })
    }
    localStorage.setItem(TOKENS_KEY, JSON.stringify(sessions))
  } catch {}
}

export function clearAuth() {
  localStorage.removeItem(TOKENS_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(LEGACY_MEMBER_KEY)
}

// Gọi Supabase RPC join_group() — không cần token
export async function joinGroup(inviteCode, name) {
  const sb = createSupabase()
  const { data, error } = await sb.rpc('join_group', {
    p_invite_code: inviteCode,
    p_member_name: name,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data  // { token, member_id, group_id, member_name }
}
