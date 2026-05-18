import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth, storeAuth, clearAuth } from './lib/auth.js'

const AppContext = createContext(null)

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function buildEmptyState() {
  return {
    currentUserId: null,
    currentUserName: null,
    currentGroupId: null,
    members: [],
    groups: [],
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
    _loading: false,
    _error: null,
  }
}

async function fetchGroupData(token) {
  const sb = createSupabase(token)
  const [mR, gR, eR, pR, sR, pcR, psR, paR, dR] = await Promise.all([
    sb.from('members').select('*'),
    sb.from('groups').select('*'),
    sb.from('expenses').select('*').order('expense_date', { ascending: false }),
    sb.from('expense_participants').select('*'),
    sb.from('settlements').select('*').order('settlement_date', { ascending: false }),
    sb.from('pickle_configs').select('*').limit(1).maybeSingle(),
    sb.from('pickle_sessions').select('*').order('session_date', { ascending: false }),
    sb.from('pickle_attendees').select('*'),
    sb.from('expense_disputes').select('id').eq('status', 'open'),
  ])
  if (mR.error) throw mR.error
  if (gR.error) throw gR.error
  if (dR.error) console.warn('[store] dispute count query failed:', dR.error)
  return {
    members:         mR.data || [],
    groups:          gR.data || [],
    expenses:        eR.data || [],
    participants:    pR.data || [],
    settlements:     sR.data || [],
    pickleConfig:    pcR.data,
    pickleSessions:  psR.data || [],
    pickleAttendees: paR.data || [],
    disputeCount:    (dR.data || []).length,
  }
}

function normalize(raw, currentMemberId) {
  const { members, groups, expenses, participants, settlements, pickleConfig, pickleSessions, pickleAttendees, disputeCount } = raw
  const group = groups[0]
  if (!group) return null  // signal: data empty but keep session

  const me = members.find(m => m.id === currentMemberId)

  const normalExpenses = expenses.map(e => ({
    id: e.id,
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
    fromId: s.from_member_id,
    toId: s.to_member_id,
    amount: Number(s.amount),
    date: s.settlement_date,
  }))

  const normalSessions = pickleSessions.map(s => ({
    id: s.id,
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

  return {
    currentUserId: currentMemberId,
    currentUserName: me?.name || '',
    currentGroupId: group.id,
    members: members.map(m => ({
      id: m.id,
      name: m.name,
      short: m.short || m.name.split(' ').pop(),
      initials: m.initials || m.name.slice(0, 2).toUpperCase(),
      color: m.color || '#574EFA',
      role: m.role,
      isMe: m.id === currentMemberId,
    })),
    groups: [{
      id: group.id,
      name: group.name,
      emoji: group.emoji || '👥',
      color: group.color || '#574EFA',
      inviteCode: group.invite_code,
      members: members.map(m => m.id),
      expenses: normalExpenses,
      settlements: normalSettlements,
    }],
    pickle: {
      sessions: normalSessions,
      upcoming: [],
      fixedMembers: members.filter(m => m.is_active !== false).map(m => m.id),
      externalTickets: [],
      monthlyCourtFee: Number(pickleConfig?.monthly_court_fee || 0),
      guestFeePerSession: Number(pickleConfig?.guest_fee_per_session || 0),
    },
    notifications: [],
    disputeCount: disputeCount || 0,
    _loading: false,
    _error: null,
  }
}

export function AppProvider({ children, onToast }) {
  const { token: storedToken, member: storedMember } = getStoredAuth()

  const [state, setState] = useState(() => {
    if (storedToken && storedMember) {
      return {
        ...buildEmptyState(),
        currentUserId: storedMember.id,
        currentUserName: storedMember.name,
        currentGroupId: storedMember.groupId,
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
      const next = normalize(raw, member?.id)
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

  useEffect(() => {
    if (storedToken) refresh(storedToken)
  }, [])

  useEffect(() => {
    const groupId = stateRef.current.currentGroupId
    const token   = tokenRef.current
    if (!groupId || !token) return

    const sb      = createSupabase(token)
    const channel = sb.channel(`group-${groupId}`)

    const getMemberName = (id) =>
      stateRef.current.members.find(m => m.id === id)?.name || 'Ai đó'
    const getMyRole = () =>
      stateRef.current.members.find(m => m.isMe)?.role

    channel
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'expenses',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        scheduleRefresh()
        const row = payload.new
        if (row.submitted_by_member_id === stateRef.current.currentUserId) return
        if (!onToast) return
        if (getMyRole() === 'treasurer') {
          onToast('Có khoản mới chờ duyệt ⏳', 'warning')
        } else {
          onToast(`${getMemberName(row.submitted_by_member_id)} vừa thêm chi tiêu ${row.title}`, 'info')
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'expenses',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        scheduleRefresh()
        const row = payload.new
        if (row.submitted_by_member_id !== stateRef.current.currentUserId) return
        if (!onToast) return
        if (row.status === 'approved') {
          onToast(`Chi tiêu "${row.title}" đã được duyệt ✅`, 'success')
        } else if (row.status === 'declined') {
          onToast(`Chi tiêu "${row.title}" bị từ chối ❌`, 'warning')
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'settlements',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        scheduleRefresh()
        const row = payload.new
        if (row.to_member_id !== stateRef.current.currentUserId) return
        if (onToast) onToast(`${getMemberName(row.from_member_id)} đã thanh toán cho bạn 💸`, 'success')
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pickle_sessions',
        filter: `group_id=eq.${groupId}`,
      }, () => scheduleRefresh())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pickle_attendees',
      }, () => scheduleRefresh())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'expense_disputes',
      }, () => {
        scheduleRefresh()
        if (getMyRole() === 'treasurer' && onToast) {
          onToast('Có sai sót cần xem ⚠️', 'warning')
        }
      })
      .subscribe()

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

      case 'LOGIN': {
        const { token: newToken, memberId, groupId, memberName } = action
        storeAuth(newToken, { id: memberId, groupId, name: memberName })
        tokenRef.current = newToken
        await refresh(newToken)
        break
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

      case 'ADD_MEMBER': {
        if (!sb) return
        const { member } = action
        await sb.from('members').insert({
          id: member.id,
          group_id: state.currentGroupId,
          name: member.name,
          short: member.short,
          initials: member.initials,
          color: member.color || '#574EFA',
          role: member.role || 'member',
        })
        await refresh()
        break
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

      case 'APPROVE_EXPENSE': {
        const { expenseId } = action
        const { error } = await sb.from('expenses').update({
          status: 'approved',
          reviewed_by_member_id: state.currentUserId,
          reviewed_at: new Date().toISOString(),
        }).eq('id', expenseId)
        if (error) { console.error('[store] APPROVE_EXPENSE:', error); throw error }
        await refresh()
        break
      }
      case 'DECLINE_EXPENSE': {
        const { expenseId, reason } = action
        const { error } = await sb.from('expenses').update({
          status: 'declined',
          reviewed_by_member_id: state.currentUserId,
          reviewed_at: new Date().toISOString(),
          decline_reason: reason,
        }).eq('id', expenseId)
        if (error) { console.error('[store] DECLINE_EXPENSE:', error); throw error }
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

      case 'ADD_PICKLE_EXPENSE':
        dispatch({
          type: 'ADD_EXPENSE',
          groupId: state.currentGroupId,
          expense: { ...action.expense, pickleSessionId: action.sessionId },
        })
        break

      case 'ADD_GROUP':
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
  }, [state.currentUserId, state.currentGroupId, refresh])

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
