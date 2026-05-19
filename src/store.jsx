import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth, storeAuth, clearAuth, joinGroup } from './lib/auth.js'

const AppContext = createContext(null)

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function getMonthRange(yearMonth) {
  const [yearText, monthText] = String(yearMonth || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('invalid_year_month')
  }
  const mm = String(month).padStart(2, '0')
  const endDay = new Date(year, month, 0).getDate()
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(endDay).padStart(2, '0')}`,
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function memberNameParts(name) {
  const trimmed = String(name || '').trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  return {
    short: words.at(-1) || trimmed,
    initials: words.map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?',
  }
}

export function disambiguateMembers(members = []) {
  const rows = safeArray(members).map((member, index) => ({ member, index }))
  const byName = new Map()

  rows.forEach(row => {
    const key = String(row.member?.name || '').trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(row)
  })

  const suffixByIndex = new Map()
  byName.forEach(group => {
    if (group.length < 2) return
    group
      .slice()
      .sort((a, b) => {
        const at = Date.parse(a.member?.created_at || a.member?.createdAt || '')
        const bt = Date.parse(b.member?.created_at || b.member?.createdAt || '')
        const av = Number.isNaN(at) ? Number.MAX_SAFE_INTEGER : at
        const bv = Number.isNaN(bt) ? Number.MAX_SAFE_INTEGER : bt
        return av === bv ? a.index - b.index : av - bv
      })
      .forEach((row, position) => suffixByIndex.set(row.index, position + 1))
  })

  return rows.map(({ member, index }) => {
    const name = String(member?.name || '').trim()
    const suffix = suffixByIndex.get(index)
    return {
      ...member,
      displayName: suffix ? `${name} (${suffix})` : name,
    }
  })
}

function randomInviteCode(name) {
  const prefix = String(name || 'GROUP')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase() || 'GROUP'
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  const suffix = Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
  return `${prefix}-${suffix}`
}

function memberInsertRow(groupId, member, role) {
  const parts = memberNameParts(member?.name)
  return {
    group_id: groupId,
    name: String(member?.name || '').trim(),
    short: member?.short || parts.short,
    initials: member?.initials || parts.initials,
    color: member?.color || '#574EFA',
    role,
  }
}

function buildEmptyState() {
  return {
    currentUserId: null,
    currentUserName: null,
    currentGroupId: null,
    currentGroup: null,
    members: [],
    memberTokens: [],
    groups: [],
    joinRequests: [],
    settlementPeriods: [],
    pickle: {
      sessions: [],
      upcoming: [],
      fixedMembers: [],
      externalTickets: [],
      monthlyCourtFee: 0,
      guestFeePerSession: 0,
    },
    notifications: [],
    disputeCount: 0,
    homeMonth: null,
    homeMonthSessions: [],
    homeMonthExpenses: [],
    homeMonthError: null,
    _allPickle: null,
    _loading: false,
    _error: null,
  }
}

function memberHasPin(member) {
  if (typeof member.has_pin === 'boolean') return member.has_pin
  if (typeof member.hasPin === 'boolean') return member.hasPin
  if ('pin_hash' in member) return Boolean(member.pin_hash)
  if ('pinHash' in member) return Boolean(member.pinHash)
  return false
}

async function fetchGroupData(token) {
  const sb = createSupabase(token)
  const [mR, gR, mtR, eR, pR, sR, spR, ppR, pcR, psR, paR, dR, jR] = await Promise.all([
    sb.from('members').select('*'),
    sb.from('groups').select('*'),
    sb.from('member_tokens').select('member_id,revoked_at'),
    sb.from('expenses').select('*').order('expense_date', { ascending: false }),
    sb.from('expense_participants').select('*'),
    sb.from('settlements').select('*').order('settlement_date', { ascending: false }),
    sb.from('settlement_periods').select('*').order('period_end', { ascending: false }),
    sb.from('period_payments').select('*'),
    sb.from('pickle_configs').select('*'),
    sb.from('pickle_sessions').select('*').order('session_date', { ascending: false }),
    sb.from('pickle_attendees').select('*'),
    sb.from('expense_disputes').select('id').eq('status', 'open'),
    sb.from('join_requests').select('*').eq('status', 'pending'),
  ])
  if (mR.error) throw mR.error
  if (gR.error) throw gR.error
  if (mtR.error) console.warn('[store] member_tokens query failed:', mtR.error)
  if (spR.error) console.warn('[store] settlement_periods query failed:', spR.error)
  if (ppR.error) console.warn('[store] period_payments query failed:', ppR.error)
  if (pcR.error) console.warn('[store] pickle_configs query failed:', pcR.error)
  if (dR.error) console.warn('[store] dispute count query failed:', dR.error)
  if (jR.error) console.warn('[store] join_requests query failed:', jR.error)
  return {
    members:         mR.data || [],
    groups:          gR.data || [],
    memberTokens:    mtR.data || [],
    expenses:        eR.data || [],
    participants:    pR.data || [],
    settlements:     sR.data || [],
    settlementPeriods: spR.data || [],
    periodPayments:    ppR.data || [],
    pickleConfigs:   pcR.data || [],
    pickleSessions:  psR.data || [],
    pickleAttendees: paR.data || [],
    disputeCount:    (dR.data || []).length,
    joinRequests:    jR.data || [],
  }
}

export async function fetchPickleballSessions(token, yearMonth) {
  const { start, end } = getMonthRange(yearMonth)
  const sb = createSupabase(token)
  const { data, error } = await sb
    .from('pickleball_sessions')
    .select(`
      id,
      group_id,
      date,
      notes,
      created_at,
      pickleball_attendance (
        session_id,
        member_id,
        status
      )
    `)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchMonthlyExpenses(token, yearMonth) {
  const { start, end } = getMonthRange(yearMonth)
  const sb = createSupabase(token)
  const { data, error } = await sb
    .from('expense_participants')
    .select(`
      expense_id,
      member_id,
      share_amount,
      amount:share_amount,
      share:share_amount,
      share_type,
      expenses!inner (
        id,
        group_id,
        title,
        description:title,
        amount,
        expense_date,
        date:expense_date,
        category,
        cat:category,
        module,
        pickle_session_id,
        paid_by_member_id,
        submitted_by_member_id,
        status,
        groups (
          id,
          name
        )
      )
    `)
    .gte('expenses.expense_date', start)
    .lte('expenses.expense_date', end)

  if (error) throw error
  return (data || []).slice().sort((a, b) => (
    String(b.expenses?.expense_date || b.expenses?.date || '')
      .localeCompare(String(a.expenses?.expense_date || a.expenses?.date || ''))
  ))
}

function sameMemberName(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function normalizeMemberTokens(memberTokens = []) {
  return safeArray(memberTokens)
    .map(token => {
      const memberId = token.member_id ?? token.memberId
      return memberId ? { ...token, memberId, member_id: memberId } : null
    })
    .filter(Boolean)
}

function resolveMemberForGroup({ members, memberTokens, groupId, currentMemberId, currentUserName }) {
  const groupMembers = safeArray(members).filter(m => (m.groupId ?? m.group_id) === groupId)
  const tokenMemberIds = new Set(normalizeMemberTokens(memberTokens).map(t => t.memberId))
  const tokenMember = groupMembers.find(m => tokenMemberIds.has(m.id))
  if (tokenMember) return tokenMember

  const currentMember = groupMembers.find(m => m.id === currentMemberId)
  if (currentMember) return currentMember

  const namedMember = groupMembers.find(m => sameMemberName(m.name, currentUserName))
  if (namedMember) return namedMember

  const previousMember = safeArray(members).find(m => m.id === currentMemberId)
  if (previousMember?.name) {
    const matchingName = groupMembers.find(m => sameMemberName(m.name, previousMember.name))
    if (matchingName) return matchingName
  }

  return groupMembers[0] || null
}

function pickleForGroup(allPickle, members, groupId) {
  const source = allPickle || {}
  const sessions = safeArray(source.sessions).filter(s => (s.groupId ?? s.group_id) === groupId)
  const upcoming = safeArray(source.upcoming).filter(s => (s.groupId ?? s.group_id) === groupId)
  const configs = safeArray(source.configs)
  const config = configs.find(c => (c.groupId ?? c.group_id) === groupId)
    || configs.find(c => !(c.groupId ?? c.group_id))
    || {}
  const fixedMembers = safeArray(members)
    .filter(m => (m.groupId ?? m.group_id) === groupId && m.isActive !== false && m.is_active !== false)
    .map(m => m.id)

  return {
    sessions,
    upcoming,
    fixedMembers,
    externalTickets: safeArray(source.externalTickets).filter(t => (t.groupId ?? t.group_id) === groupId),
    monthlyCourtFee: Number(config.monthlyCourtFee ?? config.monthly_court_fee ?? 0),
    guestFeePerSession: Number(config.guestFeePerSession ?? config.guest_fee_per_session ?? 0),
  }
}

function applyGroupSelection(state, groupId, options = {}) {
  const groups = safeArray(state.groups)
  const currentGroup = groups.find(g => g.id === groupId)
  if (!currentGroup) return state

  const nextMember = resolveMemberForGroup({
    members: state.members,
    memberTokens: state.memberTokens,
    groupId,
    currentMemberId: options.currentMemberId ?? state.currentUserId,
    currentUserName: options.currentUserName ?? state.currentUserName,
  })
  const currentUserId = nextMember?.id || state.currentUserId
  const currentUserName = nextMember?.name || state.currentUserName || ''
  const members = safeArray(state.members).map(m => ({ ...m, isMe: m.id === currentUserId }))

  return {
    ...state,
    currentUserId,
    currentUserName,
    currentGroupId: groupId,
    currentGroup,
    members,
    pickle: pickleForGroup(state._allPickle || state.pickle, members, groupId),
  }
}

function normalize(raw, currentMemberId, preferredGroupId = null, preferredMemberName = '') {
  const {
    members,
    groups,
    memberTokens = [],
    expenses,
    participants,
    settlements,
    settlementPeriods,
    periodPayments,
    pickleConfigs,
    pickleConfig,
    pickleSessions,
    pickleAttendees,
    disputeCount,
    joinRequests = [],
  } = raw
  if (groups.length === 0) return null  // signal: data empty but keep session

  const me = members.find(m => m.id === currentMemberId)
  const currentGroup = groups.find(g => g.id === preferredGroupId) || groups.find(g => g.id === me?.group_id) || groups[0]
  const normalJoinRequests = safeArray(joinRequests)
    .map(r => ({
      id: r.id,
      groupId: r.group_id,
      group_id: r.group_id,
      name: r.name,
      status: r.status || 'pending',
      createdAt: r.created_at,
      created_at: r.created_at,
    }))

  const normalExpenses = expenses.map(e => ({
    id: e.id,
    groupId: e.group_id,
    group_id: e.group_id,
    title: e.title,
    cat: e.cat || e.category || 'food',
    amount: Number(e.amount),
    paidBy: e.paid_by_member_id,
    participants: participants.filter(p => p.expense_id === e.id).map(p => p.member_id),
    splits: participants.filter(p => p.expense_id === e.id).map(p => ({
      memberId: p.member_id,
      amount: Number(p.share_amount),
    })),
    date: e.expense_date,
    status: e.status,
    declineReason: e.decline_reason,
    submittedBy: e.submitted_by_member_id,
    pickleSessionId: e.pickle_session_id,
  }))

  const normalSettlements = settlements.map(s => ({
    id: s.id,
    groupId: s.group_id,
    group_id: s.group_id,
    fromId: s.from_member_id,
    toId: s.to_member_id,
    amount: Number(s.amount),
    date: s.settlement_date,
  }))

  const normalPeriodPayments = (periodPayments || []).map(p => ({
    id: p.id,
    periodId: p.period_id,
    period_id: p.period_id,
    fromMemberId: p.from_member_id,
    from_member_id: p.from_member_id,
    toMemberId: p.to_member_id,
    to_member_id: p.to_member_id,
    amount: Number(p.amount),
    status: p.status || 'pending',
    transferredAt: p.transferred_at,
    transferred_at: p.transferred_at,
    confirmedAt: p.confirmed_at,
    confirmed_at: p.confirmed_at,
  }))

  const normalSettlementPeriods = (settlementPeriods || []).map(p => ({
    id: p.id,
    groupId: p.group_id,
    group_id: p.group_id,
    periodStart: p.period_start,
    period_start: p.period_start,
    periodEnd: p.period_end,
    period_end: p.period_end,
    status: p.status || 'open',
    createdByMemberId: p.created_by_member_id,
    created_by_member_id: p.created_by_member_id,
    createdAt: p.created_at,
    created_at: p.created_at,
    payments: normalPeriodPayments.filter(pay => pay.periodId === p.id),
  }))

  const normalSessions = pickleSessions.map(s => ({
    id: s.id,
    groupId: s.group_id,
    group_id: s.group_id,
    date: s.session_date,
    status: s.status,
    notes: s.notes,
    attendees: pickleAttendees
      .filter(a => a.session_id === s.id && !a.is_guest)
      .map(a => a.member_id),
    guests: pickleAttendees
      .filter(a => a.session_id === s.id && a.is_guest),
    expenses: normalExpenses.filter(e => e.pickleSessionId === s.id),
  }))

  const normalMembers = members.map(m => ({
    id: m.id,
    groupId: m.group_id,
    group_id: m.group_id,
    name: String(m.name || '').trim(),
    short: m.short || String(m.name || '').trim().split(' ').pop(),
    initials: m.initials || String(m.name || '').trim().slice(0, 2).toUpperCase(),
    color: m.color || '#574EFA',
    role: m.role,
    isMe: m.id === currentMemberId,
    isActive: m.is_active !== false,
    is_active: m.is_active !== false,
    bankName: m.bank_name || '',
    bankAccount: m.bank_account || '',
    bankAccountName: m.bank_account_name || '',
    bank_name: m.bank_name || '',
    bank_account: m.bank_account || '',
    bank_account_name: m.bank_account_name || '',
    createdAt: m.created_at,
    created_at: m.created_at,
    hasPin: memberHasPin(m),
    has_pin: memberHasPin(m),
  }))

  const normalGroups = groups.map(group => ({
    id: group.id,
    name: group.name,
    emoji: group.emoji || '👥',
    color: group.color || '#574EFA',
    inviteCode: group.invite_code,
    members: members.filter(m => m.group_id === group.id).map(m => m.id),
    expenses: normalExpenses.filter(e => e.groupId === group.id),
    settlements: normalSettlements.filter(s => s.groupId === group.id),
    settlementPeriods: normalSettlementPeriods.filter(p => p.groupId === group.id),
  }))
  const normalPickleConfigs = safeArray(pickleConfigs ?? (pickleConfig ? [pickleConfig] : [])).map(config => ({
    ...config,
    groupId: config.group_id ?? config.groupId,
    group_id: config.group_id ?? config.groupId,
    monthlyCourtFee: Number(config.monthly_court_fee ?? config.monthlyCourtFee ?? 0),
    monthly_court_fee: Number(config.monthly_court_fee ?? config.monthlyCourtFee ?? 0),
    guestFeePerSession: Number(config.guest_fee_per_session ?? config.guestFeePerSession ?? 0),
    guest_fee_per_session: Number(config.guest_fee_per_session ?? config.guestFeePerSession ?? 0),
  }))
  const baseState = {
    currentUserId: currentMemberId,
    currentUserName: me?.name || '',
    currentGroupId: currentGroup.id,
    currentGroup: normalGroups.find(g => g.id === currentGroup.id) || normalGroups[0] || null,
    members: normalMembers,
    memberTokens: normalizeMemberTokens(memberTokens),
    groups: normalGroups,
    joinRequests: normalJoinRequests,
    settlementPeriods: normalSettlementPeriods,
    pickle: null,
    _allPickle: {
      sessions: normalSessions,
      upcoming: [],
      configs: normalPickleConfigs,
      externalTickets: [],
    },
    notifications: [],
    disputeCount: disputeCount || 0,
    _loading: false,
    _error: null,
  }

  return applyGroupSelection(baseState, currentGroup.id, {
    currentMemberId,
    currentUserName: preferredMemberName || me?.name || '',
  })
}

export function AppProvider({ children, onToast }) {
  const { token: storedToken, member: storedMember } = getStoredAuth()

  const [state, setState] = useState(() => {
    if (storedToken && storedMember) {
      return {
        ...buildEmptyState(),
        currentUserId: storedMember.id,
        currentUserName: storedMember.name,
        currentGroupId: storedMember.groupId || storedMember.group_id,
        _loading: true,
      }
    }
    return buildEmptyState()
  })

  const tokenRef = useRef(storedToken)
  const channelRef  = useRef(null)
  const debounceRef = useRef(null)
  const stateRef    = useRef(state)

  useEffect(() => { stateRef.current = state })

  const refresh = useCallback(async (tok) => {
    const t = tok ?? tokenRef.current
    if (!t) return
    setState(s => ({ ...s, _loading: true }))
    try {
      const { member } = getStoredAuth()
      const raw = await fetchGroupData(t)
      const next = normalize(raw, member?.id, member?.groupId || member?.group_id, member?.name)
      if (next) {
        setState(next)
      } else {
        // groups empty — RLS / token issue, keep session, show error
        setState(s => ({ ...s, _loading: false, _error: 'Không tải được dữ liệu nhóm. Kiểm tra kết nối.' }))
      }
    } catch (err) {
      console.error('[store] refresh error:', err)
      setState(s => ({ ...s, _loading: false, _error: err.message }))
    }
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => refresh(), 600)
  }, [refresh])

  const broadcastChange = useCallback((table, evType, row) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'data_changed',
      payload: { table, event: evType, new: row },
    })
  }, [])

  useEffect(() => {
    if (storedToken) refresh(storedToken)
  }, [])

  useEffect(() => {
    const groupId = stateRef.current.currentGroupId
    const token   = tokenRef.current
    if (!groupId || !token) return

    const sb      = createSupabase(null)
    const channel = sb.channel(`group-${groupId}`)

    const getMemberName = (id) => {
      const member = stateRef.current.members.find(m => m.id === id)
      return member?.displayName || member?.name || 'Ai đó'
    }
    const getMyRole = () =>
      stateRef.current.members.find(m => m.isMe)?.role

    channel.on('broadcast', { event: 'data_changed' }, (payload) => {
      const { table, event: evType, new: row } = payload.payload ?? {}
      scheduleRefresh()

      if (!onToast || !row) return
      const submittedBy = row.submitted_by_member_id
      const fromMe = submittedBy === stateRef.current.currentUserId
      const toMe   = row.to_member_id === stateRef.current.currentUserId

      if (table === 'expenses' && evType === 'INSERT' && !fromMe) {
        if (getMyRole() === 'treasurer') {
          onToast('Có khoản mới chờ duyệt ⏳', 'warning')
        } else {
          onToast(`${getMemberName(submittedBy)} vừa thêm chi tiêu ${row.title}`, 'info')
        }
      } else if (table === 'expenses' && evType === 'UPDATE' && fromMe) {
        if (row.status === 'approved') {
          onToast(`Chi tiêu "${row.title}" đã được duyệt ✅`, 'success')
        } else if (row.status === 'declined') {
          onToast(`Chi tiêu "${row.title}" bị từ chối ❌`, 'warning')
        }
      } else if (table === 'settlements' && evType === 'INSERT' && toMe) {
        onToast(`${getMemberName(row.from_member_id)} đã thanh toán cho bạn 💸`, 'success')
      } else if (table === 'expense_disputes' && evType === 'INSERT' && getMyRole() === 'treasurer') {
        onToast('Có sai sót cần xem ⚠️', 'warning')
      }
    }).subscribe((status, err) => {
      if (err) {
        console.error('[realtime]', status, err)
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [state.currentGroupId, scheduleRefresh, onToast])

  const dispatch = useCallback(async (action) => {
    const token = tokenRef.current
    const sb = token ? createSupabase(token) : null

    switch (action.type) {

      case 'FETCH_HOME_MONTH_SUCCESS': {
        const next = {
          ...stateRef.current,
          homeMonth: action.yearMonth,
          homeMonthSessions: action.sessions,
          homeMonthExpenses: action.expenses,
          homeMonthError: null,
        }
        stateRef.current = next
        setState(next)
        return next
      }

      case 'FETCH_HOME_MONTH_ERROR': {
        const next = {
          ...stateRef.current,
          homeMonthError: action.error,
        }
        stateRef.current = next
        setState(next)
        return next
      }

      case 'LOGIN': {
        const { token: newToken, memberId, groupId, memberName } = action
        storeAuth(newToken, { id: memberId, groupId, name: memberName })
        tokenRef.current = newToken
        await refresh(newToken)
        break
      }

      case 'REFRESH': {
        await refresh(action.token)
        break
      }

      case 'SWITCH_GROUP': {
        const groupId = action.groupId ?? action.group_id
        if (!groupId) return null
        const current = stateRef.current
        const next = applyGroupSelection(current, groupId)
        if (next === current) return null
        if (tokenRef.current && next.currentUserId) {
          storeAuth(tokenRef.current, {
            id: next.currentUserId,
            groupId: next.currentGroupId,
            name: next.currentUserName,
          })
        }
        stateRef.current = next
        setState(next)
        return next.currentGroupId
      }

      case 'JOIN_GROUP': {
        const inviteCode = String(action.inviteCode || '').trim().toUpperCase()
        const memberName = String(action.memberName || '').trim()
        if (!inviteCode) throw new Error('invite_code_required')
        if (!memberName) throw new Error('name_required')

        const existingToken = getStoredAuth().token || tokenRef.current
        const result = await joinGroup(inviteCode, memberName, existingToken)
        const nextToken = result?.token || existingToken
        if (!nextToken || !result?.member_id) {
          throw new Error('join_group_no_token')
        }

        storeAuth(nextToken, {
          id: result.member_id,
          groupId: result.group_id,
          name: result.member_name || memberName,
        })
        tokenRef.current = nextToken
        await refresh(nextToken)
        return result
      }

      case 'LOGOUT': {
        clearAuth()
        tokenRef.current = null
        setState(buildEmptyState())
        break
      }

      case 'UPDATE_MEMBER_COLOR': {
        if (!sb) return
        const { error } = await sb
          .from('members')
          .update({ color: action.color })
          .eq('id', state.currentUserId)
        if (error) { console.error('[store] UPDATE_MEMBER_COLOR:', error); return }
        await refresh()
        break
      }

      case 'SET_MEMBER_PIN': {
        if (!sb) return
        const { data, error } = await sb.rpc('set_member_pin', {
          p_pin: action.pin ?? action.p_pin,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] SET_MEMBER_PIN:', err)
          throw err
        }
        await refresh()
        break
      }

      case 'RESET_MEMBER_PIN': {
        if (!sb) return
        const { data, error } = await sb.rpc('reset_member_pin', {
          p_member_id: action.memberId ?? action.p_member_id,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] RESET_MEMBER_PIN:', err)
          throw err
        }
        await refresh()
        break
      }

      case 'UPDATE_BANK_INFO': {
        if (!sb || !state.currentUserId) return
        const bankInfo = action.bankInfo || action
        const { error } = await sb
          .from('members')
          .update({
            bank_name: bankInfo.bankName ?? bankInfo.bank_name ?? null,
            bank_account: bankInfo.bankAccount ?? bankInfo.bank_account ?? null,
            bank_account_name: bankInfo.bankAccountName ?? bankInfo.bank_account_name ?? null,
          })
          .eq('id', state.currentUserId)
        if (error) {
          console.error('[store] UPDATE_BANK_INFO:', error)
          throw error
        }
        await refresh()
        break
      }

      case 'ADD_EXPENSE': {
        if (!sb) return
        const { groupId, expense } = action
        const isTreasurer = action.isTreasurer === true
        const statusFields = isTreasurer
          ? { status: 'approved', reviewed_by_member_id: state.currentUserId, reviewed_at: new Date().toISOString() }
          : { status: 'pending' }
        const { data: newExp, error } = await sb
          .from('expenses')
          .insert({
            group_id: groupId,
            title: expense.title,
            amount: expense.amount,
            category: expense.category || expense.cat || null,
            paid_by_member_id: expense.paidBy,
            submitted_by_member_id: state.currentUserId,
            expense_date: expense.date || new Date().toISOString().slice(0, 10),
            pickle_session_id: expense.pickleSessionId || null,
            ...statusFields,
          })
          .select()
          .single()
        if (error) { console.error('[store] ADD_EXPENSE:', error); return }
        if (expense.participants?.length > 0) {
          const per = Math.round(expense.amount / expense.participants.length)
          await sb.from('expense_participants').insert(
            expense.participants.map((memberId, i) => ({
              expense_id: newExp.id,
              member_id: memberId,
              share_amount: i === expense.participants.length - 1
                ? expense.amount - per * (expense.participants.length - 1)
                : per,
            }))
          )
        }
        broadcastChange('expenses', 'INSERT', {
          submitted_by_member_id: state.currentUserId,
          title: expense.title,
          group_id: groupId,
        })
        await refresh()
        break
      }

      case 'EDIT_EXPENSE': {
        if (!sb) return
        const { expense } = action
        await sb.from('expenses').update({
          title: expense.title,
          amount: expense.amount,
          paid_by_member_id: expense.paidBy,
          expense_date: expense.date,
        }).eq('id', expense.id)
        await sb.from('expense_participants').delete().eq('expense_id', expense.id)
        if (expense.participants?.length > 0) {
          const per = Math.round(expense.amount / expense.participants.length)
          await sb.from('expense_participants').insert(
            expense.participants.map((memberId, i) => ({
              expense_id: expense.id,
              member_id: memberId,
              share_amount: i === expense.participants.length - 1
                ? expense.amount - per * (expense.participants.length - 1)
                : per,
            }))
          )
        }
        await refresh()
        break
      }

      case 'DELETE_EXPENSE': {
        if (!sb) return
        await sb.from('expense_participants').delete().eq('expense_id', action.expenseId)
        await sb.from('expenses').delete().eq('id', action.expenseId)
        await refresh()
        break
      }

      case 'SETTLE_DEBT': {
        if (!sb) return
        const { groupId, settlement } = action
        await sb.from('settlements').insert({
          group_id: groupId,
          from_member_id: settlement.fromId,
          to_member_id: settlement.toId,
          amount: settlement.amount,
          settlement_date: settlement.date || new Date().toISOString().slice(0, 10),
          settled_by_member_id: state.currentUserId,
        })
        broadcastChange('settlements', 'INSERT', {
          from_member_id: settlement.fromId,
          to_member_id: settlement.toId,
        })
        await refresh()
        break
      }

      case 'CREATE_PERIOD': {
        if (!sb || !state.currentGroupId || !state.currentUserId) return null
        const cleanPayments = (action.payments || [])
          .map(p => ({
            from_member_id: p.fromMemberId ?? p.from_member_id,
            to_member_id: p.toMemberId ?? p.to_member_id,
            amount: Number(p.amount) || 0,
          }))
          .filter(p => p.from_member_id && p.to_member_id && p.amount > 0)

        const { data: newPeriod, error } = await sb
          .from('settlement_periods')
          .insert({
            group_id: state.currentGroupId,
            period_start: action.periodStart,
            period_end: action.periodEnd,
            created_by_member_id: state.currentUserId,
          })
          .select('id')
          .single()
        if (error) {
          console.error('[store] CREATE_PERIOD:', error)
          throw error
        }

        if (cleanPayments.length > 0) {
          const { error: paymentsError } = await sb
            .from('period_payments')
            .insert(cleanPayments.map(p => ({
              period_id: newPeriod.id,
              from_member_id: p.from_member_id,
              to_member_id: p.to_member_id,
              amount: p.amount,
            })))
          if (paymentsError) {
            console.error('[store] CREATE_PERIOD payments:', paymentsError)
            throw paymentsError
          }
        }

        broadcastChange('settlement_periods', 'INSERT', {
          id: newPeriod.id,
          group_id: state.currentGroupId,
        })
        await refresh()
        return newPeriod.id
      }

      case 'MARK_TRANSFERRED': {
        if (!sb || !state.currentUserId) return
        const { error } = await sb
          .from('period_payments')
          .update({
            status: 'transferred',
            transferred_at: new Date().toISOString(),
          })
          .eq('id', action.paymentId)
          .eq('from_member_id', state.currentUserId)
        if (error) {
          console.error('[store] MARK_TRANSFERRED:', error)
          throw error
        }
        broadcastChange('period_payments', 'UPDATE', { id: action.paymentId })
        await refresh()
        break
      }

      case 'CONFIRM_RECEIVED': {
        if (!sb || !state.currentUserId) return
        const isTreasurer = stateRef.current.members.find(m => m.id === state.currentUserId)?.role === 'treasurer'
        let query = sb
          .from('period_payments')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', action.paymentId)
          .eq('status', 'transferred')
        if (!isTreasurer) {
          query = query.eq('to_member_id', state.currentUserId)
        }

        const { data: updatedPayment, error } = await query
          .select('period_id')
          .maybeSingle()
        if (error) {
          console.error('[store] CONFIRM_RECEIVED:', error)
          throw error
        }
        if (!updatedPayment?.period_id) {
          await refresh()
          break
        }

        const { data: payments, error: paymentsError } = await sb
          .from('period_payments')
          .select('id,status')
          .eq('period_id', updatedPayment.period_id)
        if (paymentsError) {
          console.error('[store] CONFIRM_RECEIVED check period:', paymentsError)
          throw paymentsError
        }
        const allConfirmed = (payments || []).length > 0 && payments.every(p => p.status === 'confirmed')
        if (allConfirmed) {
          const { error: periodError } = await sb
            .from('settlement_periods')
            .update({ status: 'closed' })
            .eq('id', updatedPayment.period_id)
          if (periodError) {
            console.error('[store] CONFIRM_RECEIVED close period:', periodError)
            throw periodError
          }
          broadcastChange('settlement_periods', 'UPDATE', { id: updatedPayment.period_id, status: 'closed' })
        }
        broadcastChange('period_payments', 'UPDATE', { id: action.paymentId })
        await refresh()
        break
      }

      case 'EDIT_GROUP': {
        if (!sb) return
        await sb.from('groups').update({
          name: action.group.name,
          emoji: action.group.emoji,
          color: action.group.color,
        }).eq('id', action.group.id)
        await refresh()
        break
      }

      case 'CREATE_GROUP':
      case 'ADD_GROUP': {
        if (!sb || !state.currentUserId) return null
        const group = action.group || {}
        const name = String(group.name || '').trim()
        if (!name) return null

        const memberIds = safeArray(action.memberIds ?? group.members)
        const currentMembers = stateRef.current.members || []
        const currentMember = currentMembers.find(m => m.id === state.currentUserId)
        let selectedMembers = memberIds
          .map(id => currentMembers.find(m => m.id === id))
          .filter(Boolean)
        if (currentMember) {
          selectedMembers = [
            currentMember,
            ...selectedMembers.filter(m => m.id !== currentMember.id),
          ]
        }
        if (selectedMembers.length === 0) return null

        const memberNamesArray = selectedMembers
          .map(member => String(member?.name || '').trim())
          .filter(Boolean)
        const inviteCode = group.inviteCode || group.invite_code || randomInviteCode(name)
        const { data, error } = await sb.rpc('create_group', {
          p_name: name,
          p_invite_code: inviteCode,
          p_member_names: memberNamesArray,
        })
        const newGroup = Array.isArray(data) ? data[0] : data
        if (error || data?.error || newGroup?.error || !newGroup) {
          const err = error || new Error(data?.error || newGroup?.error || 'create_group_no_data')
          console.error('[store] CREATE_GROUP group:', err)
          throw err
        }
        const newGroupId = newGroup.group_id || newGroup.id
        const newInviteCode = newGroup.invite_code || newGroup.inviteCode || inviteCode
        const creatorName = currentMember?.name || state.currentUserName || memberNamesArray[0]
        const existingToken = tokenRef.current
        let joined = null
        try {
          joined = await joinGroup(newInviteCode, creatorName, existingToken)
        } catch (err) {
          console.error('[store] CREATE_GROUP join:', err)
          throw err
        }
        if (!joined?.token || !joined?.member_id) {
          const err = new Error('join_group_no_token')
          console.error('[store] CREATE_GROUP join:', err)
          throw err
        }

        storeAuth(joined.token, {
          id: joined.member_id,
          groupId: joined.group_id || newGroupId,
          name: joined.member_name || creatorName,
        })
        tokenRef.current = joined.token

        const joinedSb = createSupabase(joined.token)
        const { error: creatorError } = await joinedSb
          .from('groups')
          .update({
            created_by: joined.member_id,
            emoji: group.emoji || '🎯',
            color: group.color || '#574EFA',
          })
          .eq('id', joined.group_id || newGroupId)
        if (creatorError) {
          console.warn('[store] CREATE_GROUP created_by:', creatorError)
        }

        await refresh(joined.token)
        return newGroupId
      }

      case 'ADD_MEMBER': {
        if (!sb) return
        const { member } = action
        const insertRow = memberInsertRow(state.currentGroupId, member, member.role || 'member')
        if (isUuid(member.id)) insertRow.id = member.id
        const { data: newMember, error } = await sb
          .from('members')
          .insert(insertRow)
          .select()
          .single()
        if (error) {
          console.error('[store] ADD_MEMBER:', error)
          throw error
        }
        await refresh()
        return newMember
      }

      case 'APPROVE_JOIN_REQUEST': {
        if (!sb) return
        const requestId = action.requestId ?? action.p_request_id
        if (!requestId) return
        const { data, error } = await sb.rpc('approve_join_request', {
          p_request_id: requestId,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] APPROVE_JOIN_REQUEST:', err)
          throw err
        }
        scheduleRefresh()
        return data
      }

      case 'REJECT_JOIN_REQUEST': {
        if (!sb) return
        const requestId = action.requestId ?? action.p_request_id
        if (!requestId) return
        const { data, error } = await sb.rpc('reject_join_request', {
          p_request_id: requestId,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] REJECT_JOIN_REQUEST:', err)
          throw err
        }
        scheduleRefresh()
        return data
      }

      case 'CONFIRM_ATTENDANCE': {
        if (!sb) return
        const { sessionId, memberId, attending } = action
        if (attending) {
          await sb.from('pickle_attendees').upsert(
            { session_id: sessionId, member_id: memberId, is_guest: false },
            { onConflict: 'session_id,member_id' }
          )
        } else {
          await sb.from('pickle_attendees').delete()
            .eq('session_id', sessionId).eq('member_id', memberId)
        }
        await refresh()
        break
      }

      case 'ADD_PICKLE_SESSION': {
        if (!sb) return
        const { date, notes, attendeeIds } = action
        const { data: newSession, error } = await sb
          .from('pickle_sessions')
          .insert({
            group_id: state.currentGroupId,
            session_date: date,
            status: action.status || 'external',
            notes: notes || null,
          })
          .select()
          .single()
        if (error) { console.error('[store] ADD_PICKLE_SESSION:', error); return }
        if (attendeeIds?.length > 0) {
          await sb.from('pickle_attendees').insert(
            attendeeIds.map(memberId => ({
              session_id: newSession.id,
              member_id: memberId,
              is_guest: false,
            }))
          )
        }
        await refresh()
        break
      }

      case 'APPROVE_EXPENSE': {
        const { expenseId } = action
        const expense = stateRef.current.groups
          .flatMap(g => g.expenses || [])
          .find(e => e.id === expenseId)
        const { error } = await sb.from('expenses').update({
          status: 'approved',
          reviewed_by_member_id: state.currentUserId,
          reviewed_at: new Date().toISOString(),
        }).eq('id', expenseId)
        if (error) { console.error('[store] APPROVE_EXPENSE:', error); throw error }
        if (expense) {
          broadcastChange('expenses', 'UPDATE', {
            submitted_by_member_id: expense.submittedBy,
            title: expense.title,
            status: 'approved',
          })
        }
        await refresh()
        break
      }
      case 'DECLINE_EXPENSE': {
        const { expenseId, reason } = action
        const expense = stateRef.current.groups
          .flatMap(g => g.expenses || [])
          .find(e => e.id === expenseId)
        const { error } = await sb.from('expenses').update({
          status: 'declined',
          reviewed_by_member_id: state.currentUserId,
          reviewed_at: new Date().toISOString(),
          decline_reason: reason,
        }).eq('id', expenseId)
        if (error) { console.error('[store] DECLINE_EXPENSE:', error); throw error }
        if (expense) {
          broadcastChange('expenses', 'UPDATE', {
            submitted_by_member_id: expense.submittedBy,
            title: expense.title,
            status: 'declined',
          })
        }
        await refresh()
        break
      }
      case 'SUBMIT_DISPUTE': {
        const { expenseId, note } = action
        const { error } = await sb.from('expense_disputes').insert({
          expense_id: expenseId,
          raised_by: state.currentUserId,
          note,
        })
        if (error) { console.error('[store] SUBMIT_DISPUTE:', error); throw error }
        await refresh()
        break
      }

      case 'ADD_PICKLE_EXPENSE': {
        const isTreasurer = state.members.find(m => m.id === state.currentUserId)?.role === 'treasurer'
        dispatch({
          type: 'ADD_EXPENSE',
          groupId: state.currentGroupId,
          expense: { ...action.expense, pickleSessionId: action.sessionId },
          isTreasurer,
        })
        break
      }

      case 'DELETE_GROUP':
      case 'ADD_EXTERNAL_TICKET':
      case 'TOGGLE_UPCOMING':
      case 'ADD_PICKLE_MEMBER':
        console.warn(`[store] ${action.type}: not implemented in Phase 4`)
        break

      case 'SET_CURRENT_USER':
        break

      default:
        console.warn('[store] Unknown action:', action.type)
    }
  }, [state.currentUserId, state.currentGroupId, refresh, scheduleRefresh, broadcastChange])

  return (
    <AppContext.Provider value={{ state, dispatch, genId }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
