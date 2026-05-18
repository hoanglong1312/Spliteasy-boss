import { createSupabase } from './supabase.js'

const TOKEN_KEY  = 'spliteasy_token'
const MEMBER_KEY = 'spliteasy_member'

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
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(MEMBER_KEY)
  localStorage.removeItem('spliteasy_tokens')
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
