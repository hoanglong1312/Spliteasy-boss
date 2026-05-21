import React, { useState } from 'react'

import { colors, type } from './tokens'
import { useApp } from './store.jsx'
import { getStoredAuth, joinGroup } from './lib/auth.js'
import { createSupabase } from './lib/supabase.js'
import { useScreenData } from './hooks/useScreenData'
import Home from './screens/Home'
import GroupsList from './screens/GroupsList'
import GroupDetail from './screens/GroupDetail'
import AddExpense from './screens/AddExpense'
import PickleballOverview from './screens/PickleballOverview'
import PickleballCalendar from './screens/PickleballCalendar'
import PickleballMembers from './screens/PickleballMembers'
import MemberDetail from './screens/MemberDetail'
import PickleballTickets from './screens/PickleballTickets'
import PickleballSettings from './screens/PickleballSettings'
import BatchEntry from './screens/BatchEntry'
import Profile from './screens/Profile'
import PaymentFlow from './screens/PaymentFlow'
import JoinGroup from './screens/JoinGroup'
import ExpenseDetail from './screens/ExpenseDetail'
import SessionDetail from './screens/SessionDetail'
import NewGroup from './screens/NewGroup'
import SettleAll from './screens/SettleAll'
import Notifications from './screens/Notifications'
import ApprovalQueue from './screens/ApprovalQueue'
import Settings from './screens/Settings'
import SettlementPeriod from './screens/SettlementPeriod'

const PIN_UNLOCK_KEY = 'spliteasy_pin_unlocked'

export default function AppV2() {
  const { state, dispatch } = useApp()
  const groups = state.groups || []
  const members = state.members || []
  const {
    isTreasurer,
    homeData,
    groupsListData,
    groupDetailData,
    pickleballOverviewData,
    profileData,
    getGroupDetailData,
    getSessionDetailData,
    getPickleballCalendarData,
    getPickleballMembersData,
    getMemberDetailData,
    getPickleballTicketsData,
    getPickleballSettingsData,
    getBatchEntryData,
    getPaymentFlowData,
    getJoinGroupData,
    getAddExpenseData,
    newGroupData,
    getSettleAllData,
    notificationsData,
    approvalQueueData,
    accountSettingsData,
    getSettlementPeriodData,
    getExpenseDetailData,
  } = useScreenData()
  // Keys must match TAB_ITEMS in primitives.jsx: 'home','groups','pickleball','profile'
  const [activeTab, setActiveTab] = useState('home')
  const [stack, setStack] = useState([])
  const [awaitingPin, setAwaitingPin] = useState(() => {
    const { token, member } = getStoredAuth()
    const memberId = member?.id
    return !!(
      localStorage.getItem('spliteasy_pin') &&
      token &&
      memberId &&
      sessionStorage.getItem(PIN_UNLOCK_KEY) !== memberId
    )
  })
  const [pinError, setPinError] = useState('')
  const [pinInput, setPinInput] = useState('')

  function submitPin(value = pinInput) {
    const stored = localStorage.getItem('spliteasy_pin')
    if (value === stored) {
      if (state.currentUserId) sessionStorage.setItem(PIN_UNLOCK_KEY, state.currentUserId)
      setAwaitingPin(false)
      setPinError('')
      setPinInput('')
    } else {
      setPinError('Mã PIN không đúng. Thử lại.')
      setPinInput('')
    }
  }

  function updatePinInput(value) {
    setPinInput(value)
    if (pinError) setPinError('')
  }

  async function handle(type, payload) {
    if (type === 'logout') {
      dispatch({ type: 'LOGOUT' })
      sessionStorage.removeItem(PIN_UNLOCK_KEY)
      setStack([])
      setActiveTab('home')
      setAwaitingPin(false)
      setPinError('')
      setPinInput('')
      return
    }

    if (type === 'tab') {
      setActiveTab(payload)
      setStack([])
      return
    }

    if (type === 'push') {
      const route = typeof payload === 'string'
        ? { screen: payload }
        : { screen: payload?.screen, params: payload?.params }
      if (route.screen) setStack((s) => [...s, route])
      return
    }

    if (type === 'pop' || type === 'back' || type === 'close') {
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'open') {
      if (payload) {
        try {
          await dispatch({ type: 'SWITCH_GROUP', groupId: payload })
        } catch (err) {
          console.error('switch group failed', err)
        }
      }
      setStack((s) => [...s, { screen: 'group-detail', params: { groupId: payload } }])
      return
    }

    if (type === 'attend' || type === 'sessionDetail') {
      setStack((s) => [...s, { screen: 'session-detail', params: { sessionId: payload } }])
      return
    }

    if (type === 'settings') {
      const route = stack[stack.length - 1]
      const routeScreen = String(route?.screen || '')
      const fromPickleball = activeTab === 'pickleball' || routeScreen.startsWith('pickleball')
      setStack((s) => [...s, { screen: fromPickleball ? 'pickleball-settings' : 'settings', params: payload }])
      return
    }

    if (type === 'saveSettings' || (type === 'save' && stack[stack.length - 1]?.screen === 'pickleball-settings')) {
      const groupId = state.currentGroupId
      const yearMonth = payload?.currentYearMonth || monthKey(new Date())
      const oldMonthlyConfig = findMonthlyPickleConfig(state, groupId, yearMonth)
      const oldWeekdays = normalizeScheduleWeekdays(oldMonthlyConfig.scheduleWeekdays ?? oldMonthlyConfig.schedule_weekdays)
      const existingScheduledSessions = scheduledSessionsForMonth(state, groupId, yearMonth)
      const newWeekdays = normalizeScheduleWeekdays(payload?.weekdays)
      const newWeekdaySet = new Set(newWeekdays)
      const hasScheduledSessionsWithOldDays = existingScheduledSessions.some(session => {
        const weekday = isoWeekdayFromDate(sessionDateValue(session))
        return weekday && (newWeekdaySet.size === 0 || !newWeekdaySet.has(weekday))
      })
      const action = {
        type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG',
        groupId,
        yearMonth,
        courtFee: payload?.courtFee,
        ticketPrice: payload?.ticketPrice,
        scheduleWeekdays: payload?.weekdays,
        scheduleStartDay: payload?.startDate,
        scheduleTime: payload?.scheduleTime,
      }
      if ('activeMonthlyMemberIds' in (payload || {}) || 'activeMemberIds' in (payload || {})) {
        action.activeMonthlyMemberIds = payload?.activeMonthlyMemberIds ?? payload?.activeMemberIds ?? []
      }
      const savedConfig = await dispatch(action)
      const savedWeekdays = normalizeScheduleWeekdays(
        savedConfig?.scheduleWeekdays ?? savedConfig?.schedule_weekdays ?? action.scheduleWeekdays
      )
      const shouldRegenerateSchedule = !sameScheduleWeekdays(oldWeekdays, savedWeekdays) || hasScheduledSessionsWithOldDays
      if (shouldRegenerateSchedule && groupId) {
        const { token } = getStoredAuth()
        if (token) {
          const sb = createSupabase(token)
          const { error: deleteError } = await sb
            .from('pickle_sessions')
            .delete()
            .eq('group_id', groupId)
            .eq('status', 'scheduled')
            .like('session_date', `${yearMonth}%`)
          if (deleteError) throw deleteError

          const generationConfig = {
            ...sessionGenerationConfigFromState(state, yearMonth),
            scheduleWeekdays: savedWeekdays,
            scheduleTime: action.scheduleTime,
            startDate: action.scheduleStartDay,
          }
          await dispatch({
            type: 'AUTO_GENERATE_SESSIONS',
            groupId,
            yearMonth,
            config: generationConfig,
          })
        }
      }
      alert('Đã lưu cài đặt tháng này')
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'AUTO_GENERATE_SESSIONS') {
      await dispatch({
        type: 'AUTO_GENERATE_SESSIONS',
        groupId: state.currentGroupId,
        yearMonth: payload?.yearMonth,
        config: payload?.config,
      })
      return
    }

    if (type === 'addMember') {
      const name = String(payload?.name || '').trim()
      if (!name) return null
      return dispatch({
        type: 'ADD_MEMBER',
        member: { name, member_type: payload?.type || payload?.memberType || 'fixed' },
      })
    }

    if (type === 'editMember') {
      const memberId = payload?.memberId
      if (!memberId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const memberUpdate = {
        name: payload?.name,
        bank_account: payload?.bankAccount ?? payload?.bank_account,
        bank_name: payload?.bankName ?? payload?.bank_name,
        bank_account_name: payload?.bankAccountName ?? payload?.bank_account_name,
      }
      if (!('bankName' in (payload || {})) && !('bank_name' in (payload || {}))) delete memberUpdate.bank_name
      if (!('bankAccountName' in (payload || {})) && !('bank_account_name' in (payload || {}))) delete memberUpdate.bank_account_name
      const { error } = await sb
        .from('members')
        .update(memberUpdate)
        .eq('id', memberId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'setMemberRole') {
      const memberId = payload?.memberId
      if (!memberId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('members')
        .update({ role: payload?.role })
        .eq('id', memberId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'setMemberType') {
      const memberId = payload?.memberId
      if (!memberId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('members')
        .update({ member_type: payload?.type })
        .eq('id', memberId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'deleteMember') {
      const memberId = payload?.memberId ?? payload
      if (!memberId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('members')
        .update({ is_active: false })
        .eq('id', memberId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'addTicket') {
      if (!isTreasurer || !state.currentGroupId || !state.currentUserId) return
      const sessionDate = normalizeTicketDate(payload?.session_date || payload?.date)
      const sessionTime = payload?.session_time || payload?.time || null
      const memberIds = normalizeTicketMemberIds(payload?.member_ids || payload?.memberIds, state)
      const totalAmount = parseMoneyAmount(payload?.total_amount ?? payload?.totalAmount)
      const isAdvancerMode = payload?.paymentMode === 'advancer'
      const wantsTeamFund = payload?.paymentMode === 'team_fund' || payload?.teamFund === true || payload?.status === 'team_fund'
      const rawAdvancerId = payload?.advancer_id ?? payload?.advancerId ?? null
      const advancerId = wantsTeamFund ? null : rawAdvancerId
      const isTeamFund = wantsTeamFund || (!isAdvancerMode && !advancerId)
      if (!sessionDate) throw new Error('ticket_session_date_required')
      if (memberIds.length === 0) throw new Error('ticket_members_required')
      if (totalAmount <= 0) throw new Error('ticket_total_amount_required')
      if (!advancerId && !isTeamFund) throw new Error('ticket_payment_required')
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_tickets')
        .insert({
          group_id: state.currentGroupId,
          session_date: sessionDate,
          session_time: sessionTime,
          total_amount: totalAmount,
          member_ids: memberIds,
          advancer_id: advancerId,
          status: advancerId ? 'unpaid' : 'team_fund',
          year_month: monthKey(sessionDate || new Date()),
          created_by: state.currentUserId,
        })
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'markAttendance') {
      if (!isTreasurer) return
      const sessionId = payload?.sessionId ?? payload?.session_id
      const memberId = payload?.memberId ?? payload?.member_id
      const status = String(payload?.status || '').toLowerCase() === 'absent' ? 'absent' : 'present'
      if (!sessionId || !memberId) return
      await dispatch({
        type: 'MARK_PICKLEBALL_ATTENDANCE',
        sessionId,
        memberId,
        status,
      })
      return
    }

    if (type === 'markTicketPaid') {
      if (!isTreasurer) return
      const ticketId = payload?.ticketId ?? payload?.id ?? payload
      if (!ticketId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_tickets')
        .update({ status: 'paid' })
        .eq('id', ticketId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'deleteTicket') {
      if (!isTreasurer) return
      const ticketId = payload?.ticketId ?? payload?.id ?? payload
      if (!ticketId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_tickets')
        .delete()
        .eq('id', ticketId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'subTab') {
      const SUBTAB_TO_SCREEN = {
        overview: 'pickleball-overview',
        calendar: 'pickleball-calendar',
        members: 'pickleball-members',
        tickets: 'pickleball-tickets',
      }
      if (payload === 'overview') {
        setStack([])
      } else if (SUBTAB_TO_SCREEN[payload]) {
        setStack((s) => [...s, { screen: SUBTAB_TO_SCREEN[payload] }])
      }
      return
    }

    if (type === 'copyAccount') {
      const text = typeof payload === 'string' ? payload : (payload?.account || '')
      if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
      return
    }

    if (type === 'confirm') {
      console.log('confirm payload', payload)
      const route = stack[stack.length - 1]
      const paymentData = route?.screen === 'payment-flow'
        ? getPaymentFlowData(route.params)
        : null
      const settlement = payload?.settlement || (payload?.fromId && payload?.toId ? payload : null) || paymentData?.settlement
      if (settlement) {
        await dispatch({
          type: 'SETTLE_DEBT',
          groupId: payload?.groupId || settlement.groupId || state.currentGroupId,
          settlement,
        })
      }
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'save' || type === 'saveExpense') {
      if (payload?.title && payload?.amount != null) {
        if (!state.currentUserId) throw new Error('Chưa đăng nhập. Vui lòng tham gia nhóm trước.')
        const groupId = payload.groupId || state.currentGroupId
        if (!groupId) throw new Error('Không xác định được nhóm. Vui lòng mở nhóm trước khi thêm chi tiêu.')
        const expense = {
          id: payload.expenseId,
          title: payload.title,
          amount: Number(payload.amount) || 0,
          paidBy: payload.paidBy,
          category: payload.category,
          cat: payload.category,
          notes: payload.notes,
          date: dateFromLabel(payload.dateLabel),
          participants: payload.participants || [],
          splitMode: payload.splitMode,
        }
        await dispatch(payload.expenseId
          ? { type: 'EDIT_EXPENSE', groupId, expense, isTreasurer }
          : { type: 'ADD_EXPENSE', groupId, expense, isTreasurer })
        setStack((s) => s.slice(0, -1))
        return
      }
      console.log('save', payload)
      return
    }

    if (type === 'saveWater') {
      const route = stack[stack.length - 1]
      const sessionId = payload?.sessionId ?? route?.params?.sessionId ?? route?.params
      const total = Number(payload?.total) || 0
      const sessionData = getSessionDetailData(sessionId)
      const participants = (sessionData?.presentMembers || []).map((m) => m.id)
      if (sessionId && total > 0) {
        await dispatch({
          type: 'ADD_PICKLE_EXPENSE',
          sessionId,
          expense: {
            title: 'Tiền nước',
            amount: total,
            paidBy: state.currentUserId,
            category: 'water',
            cat: 'water',
            participants,
          },
        })
      }
      return
    }

    if (type === 'saveSessionCost') {
      if (!isTreasurer) return
      const sessionId = payload?.sessionId
      if (!sessionId) return
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const waterAmount = parseMoneyAmount(payload?.waterAmount)
      const { error: waterError } = await sb
        .from('pickleball_session_items')
        .upsert({
          session_id: sessionId,
          name: 'Nước',
          amount: waterAmount,
          member_ids: null,
          created_by: state.currentUserId || null,
        }, { onConflict: 'session_id,name' })
      if (waterError) throw waterError

      const { error: deleteExtrasError } = await sb
        .from('pickleball_session_items')
        .delete()
        .eq('session_id', sessionId)
        .neq('name', 'Nước')
      if (deleteExtrasError) throw deleteExtrasError

      const extras = (payload?.extras || [])
        .map(extra => ({
          session_id: sessionId,
          name: String(extra?.note || extra?.name || 'Phụ phát sinh').trim() || 'Phụ phát sinh',
          amount: parseMoneyAmount(extra?.amount),
          member_ids: Array.isArray(extra?.memberIds) ? extra.memberIds : null,
          created_by: state.currentUserId || null,
        }))
        .filter(extra => extra.amount > 0)
      if (extras.length > 0) {
        const { error: insertExtrasError } = await sb
          .from('pickleball_session_items')
          .insert(extras)
        if (insertExtrasError) throw insertExtrasError
      }

      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'saveBatchCosts') {
      if (!isTreasurer) return
      const rows = (payload?.sessions || [])
        .filter(session => session?.sessionId || session?.id)
        .map(session => ({
          session_id: session.sessionId || session.id,
          name: 'Nước',
          amount: parseMoneyAmount(session.waterAmount ?? session.water),
          member_ids: null,
          created_by: state.currentUserId || null,
        }))
      if (rows.length === 0) return
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_session_items')
        .upsert(rows, { onConflict: 'session_id,name' })
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      setStack((s) => s[s.length - 1]?.screen === 'batch-entry' ? s.slice(0, -1) : s)
      return
    }

    if (type === 'togglePresence') {
      const route = stack[stack.length - 1]
      const sessionId = payload?.sessionId ?? route?.params?.sessionId ?? route?.params
      const memberId = payload?.memberId ?? payload
      if (sessionId && memberId) {
        const sessionData = getSessionDetailData(sessionId)
        const isPresent = (sessionData?.presentMembers || []).some((m) => String(m.id) === String(memberId))
        await dispatch({
          type: 'CONFIRM_ATTENDANCE',
          sessionId,
          memberId,
          attending: payload?.attending ?? !isPresent,
        })
      }
      return
    }

    if (type === 'edit') {
      const route = stack[stack.length - 1]
      const expenseId = route?.params?.expenseId ?? route?.params?.id ?? route?.params
      setStack((s) => [...s, { screen: 'add-expense', params: { expenseId } }])
      return
    }

    if (type === 'editExpense') {
      setStack((s) => [...s, { screen: 'add-expense', params: { expenseId: payload.expenseId } }])
      return
    }

    if (type === 'viewExpense') {
      setStack((s) => [...s, { screen: 'expense-detail', params: { expenseId: payload.expenseId } }])
      return
    }

    if (type === 'delete') {
      const route = stack[stack.length - 1]
      const expenseId = payload?.expenseId ?? payload?.id ?? route?.params?.expenseId ?? route?.params?.id ?? route?.params
      if (expenseId) {
        await dispatch({ type: 'DELETE_EXPENSE', expenseId, groupId: state.currentGroupId })
      }
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'payNow') {
      const route = stack[stack.length - 1]
      const expenseId = route?.params?.expenseId ?? route?.params?.id ?? route?.params
      const expenseData = getExpenseDetailData(expenseId)
      const memberId = payload?.memberId ?? payload?.toId ?? expenseData?.payer?.id ?? payload
      setStack((s) => [...s, { screen: 'payment-flow', params: { memberId, amount: payload?.amount } }])
      return
    }

    if (type === 'joinGroup') {
      const result = await joinGroup(payload.code, payload.memberName)
      await dispatch({
        type: 'LOGIN',
        token: result.token,
        memberId: result.member_id,
        groupId: result.group_id,
        memberName: result.member_name,
      })
      const storedPin = localStorage.getItem('spliteasy_pin')
      if (storedPin) {
        setAwaitingPin(true)
        return
      }
      return
    }

    if (type === 'create') {
      if (!payload?.name?.trim()) return
      try {
        await dispatch({ type: 'CREATE_GROUP', group: payload })
        setStack((s) => s.slice(0, -1))
      } catch (err) {
        console.error('create group failed', err)
      }
      return
    }

    if (type === 'approveJoin' || type === 'approve') {
      await dispatch({ type: 'APPROVE_JOIN_REQUEST', requestId: payload })
      return
    }

    if (type === 'rejectJoin' || type === 'reject' || type === 'decline') {
      await dispatch({ type: 'REJECT_JOIN_REQUEST', requestId: payload })
      return
    }

    if (type === 'approveAll') {
      await Promise.all((state.joinRequests || []).map((req) => (
        dispatch({ type: 'APPROVE_JOIN_REQUEST', requestId: req.id })
      )))
      return
    }

    if (type === 'payOne') {
      setStack((s) => [...s, { screen: 'payment-flow', params: { memberId: payload } }])
      return
    }

    if (type === 'closePeriod') {
      setStack((s) => [...s, { screen: 'settlement-period', params: payload }])
      return
    }

    if (type === 'color') {
      await dispatch({ type: 'UPDATE_MEMBER_COLOR', color: payload })
      return
    }

    if (type === 'exportCsv') {
      exportStateCsv(state)
      return
    }

    if (type === 'saveBank') {
      await dispatch({ type: 'UPDATE_BANK_INFO', bankInfo: payload })
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'addGuest') {
      if (!isTreasurer) return
      const sessionId = payload?.sessionId ?? payload?.session_id ?? (typeof payload === 'string' ? payload : null)
      const guestName = String(payload?.guestName ?? payload?.guest_name ?? '').trim()
      if (!sessionId || !guestName) return
      const groupId = state.currentGroupId
      if (!groupId) return
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickle_attendees')
        .insert({
          session_id: sessionId,
          guest_name: guestName,
          attendee_type: 'guest',
          attended: true,
        })
      if (error) throw error
      const existingMember = await findCasualMemberByName(sb, groupId, guestName)
      if (!existingMember) {
        const parts = memberNameParts(guestName)
        const { error: memberError } = await sb
          .from('members')
          .insert({
            group_id: groupId,
            name: guestName,
            short: parts.short,
            initials: parts.initials,
            color: '#574EFA',
            role: 'member',
            member_type: 'casual',
            is_active: true,
          })
        if (memberError) throw memberError
      }
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'filter') {
      return
    }

    if (type === 'removePin') {
      sessionStorage.removeItem(PIN_UNLOCK_KEY)
      console.log(type, payload)
      return
    }

    if ([
      'receive',
      'markAllRead',
      'addName',
      'editBank',
      'addBank',
      'changePin',
      'setPin',
      'changeLanguage',
      'deleteAccount',
      'more',
      'menu',
      'help',
      'shareQR',
      'toggleBreakdown',
      'changeRecipient',
      'removeGuest',
      'addAccessory',
      'reschedule',
      'remindAll',
      'confirmClose',
      'expandMembers',
      'monthPrev',
      'monthNext',
      'complete',
      'saveAll',
      'uploadPhoto',
      'promote',
      'add',
    ].includes(type)) {
      console.log(type, payload)
      return
    }

    if (type === 'fab') {
      setStack((s) => [...s, { screen: 'add-expense', params: payload }])
      return
    }

    const ACTION_TO_SCREEN = {
      addExpense:       'add-expense',
      payment:          'payment-flow',
      pay:              'payment-flow',
      settings:         'settings',
      pickleballSettings: 'pickleball-settings',
      batchEntry:       'batch-entry',
      newGroup:         'new-group',
      notifications:    'notifications',
      approvalQueue:    'approval-queue',
      settleAll:        'settle-all',
      settle:           'settle-all',
      settlementPeriod: 'settlement-period',
      closeMonth:       'settlement-period',
      closePeriod:      'settlement-period',
      join:             'join-group',
      expenseDetail:    'expense-detail',
      sessionDetail:    'session-detail',
      memberDetail:     'member-detail',
      accountSettings:  'settings',
    }

    if (ACTION_TO_SCREEN[type]) {
      setStack((s) => [...s, { screen: ACTION_TO_SCREEN[type], params: payload }])
      return
    }

    console.log('onAction', type, payload)
  }

  if (!state.currentUserId) {
    return (
      <div style={{ minHeight: '100vh', background: '#07080f' }}>
        <JoinGroup data={getJoinGroupData()} onAction={handle} />
      </div>
    )
  }

  if (awaitingPin) {
    return (
      <div style={{ minHeight: '100vh', background: '#07080f' }}>
        <PinEntryScreen
          error={pinError}
          value={pinInput}
          onChange={updatePinInput}
          onSubmit={submitPin}
        />
      </div>
    )
  }

  if (state._loading && members.length === 0 && (state.expenses || []).length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f1117',
        color: '#94a3b8',
        fontSize: 16,
      }}>
        Đang tải dữ liệu...
      </div>
    )
  }

  if (state._error && !state._loading && state.currentUserId && groups.length === 0 && members.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.pageBg,
        color: colors.textPrimary,
        fontFamily: type.family,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            lineHeight: 1.25,
          }}>
            Tài khoản của bạn chưa được kích hoạt trong nhóm
          </div>
          <div style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: colors.textSecondary,
          }}>
            Liên hệ thủ quỹ để được thêm vào nhóm.
          </div>
          <button
            type="button"
            onClick={() => handle('logout')}
            style={{
              marginTop: 10,
              border: 'none',
              borderRadius: 8,
              background: colors.brand,
              color: colors.textPrimary,
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >Đăng xuất</button>
        </div>
      </div>
    )
  }

  function renderTabScreen() {
    switch (activeTab) {
      case 'groups':
        return <GroupsList data={groupsListData} onAction={handle} />
      case 'pickleball':
        return <PickleballOverview data={pickleballOverviewData} isTreasurer={isTreasurer} onAction={handle} />
      case 'profile':
        return <Profile data={profileData} isTreasurer={isTreasurer} onAction={handle} />
      case 'home':
      default:
        return <Home data={homeData} isTreasurer={isTreasurer} onAction={handle} />
    }
  }

  function renderStackScreen(route) {
    switch (route.screen) {
      case 'group-detail':        return <GroupDetail data={route.params?.groupId ? getGroupDetailData(route.params.groupId) : groupDetailData} isTreasurer={isTreasurer} onAction={handle} />
      case 'add-expense':         return <AddExpense data={getAddExpenseData(route.params)} onAction={handle} />
      case 'pickleball-calendar': return <PickleballCalendar data={getPickleballCalendarData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'pickleball-members':  return <PickleballMembers data={getPickleballMembersData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'member-detail':       return <MemberDetail data={getMemberDetailData(route.params?.memberId ?? route.params)} isTreasurer={isTreasurer} onAction={handle} />
      case 'pickleball-tickets':  return <PickleballTickets data={getPickleballTicketsData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'pickleball-settings': return <PickleballSettings data={getPickleballSettingsData()} onAction={handle} />
      case 'batch-entry':         return <BatchEntry data={getBatchEntryData()} onAction={handle} />
      case 'payment-flow':        return <PaymentFlow data={getPaymentFlowData(route.params)} onAction={handle} />
      case 'join-group':          return <JoinGroup data={getJoinGroupData()} onAction={handle} />
      case 'expense-detail':      return <ExpenseDetail data={getExpenseDetailData(route.params?.expenseId ?? route.params)} onAction={handle} />
      case 'session-detail':      return <SessionDetail data={getSessionDetailData(route.params?.sessionId ?? route.params)} isTreasurer={isTreasurer} onAction={handle} />
      case 'new-group':           return <NewGroup data={newGroupData} onAction={handle} />
      case 'settle-all':          return <SettleAll data={getSettleAllData()} isTreasurer={isTreasurer} onAction={handle} />
      case 'notifications':       return <Notifications data={notificationsData} onAction={handle} />
      case 'approval-queue':      return <ApprovalQueue data={approvalQueueData} isTreasurer={isTreasurer} onAction={handle} />
      case 'settings':            return <Settings data={accountSettingsData} onAction={handle} />
      case 'settlement-period':   return <SettlementPeriod data={getSettlementPeriodData(route.params)} onAction={handle} />
      default:
        return renderTabScreen()
    }
  }

  function renderCurrent() {
    if (stack.length > 0) {
      return renderStackScreen(stack[stack.length - 1])
    }

    return renderTabScreen()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07080f' }}>
      {renderCurrent()}
      <ToastOverlay toast={state.toast} />
    </div>
  )
}

function sessionGenerationConfigFromState(state, yearMonth) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  const group = state?.currentGroup || safeArray(state?.groups).find(row => String(row.id) === String(groupId)) || {}
  const monthlyConfig = safeArray(state?.pickle?.monthlyConfigs)
    .find(row => (
      String(row?.groupId || row?.group_id || '') === String(groupId || '') &&
      String(row?.yearMonth || row?.year_month || '') === String(yearMonth || '')
    )) || {}
  const config = safeArray(state?._allPickle?.configs || state?.pickleConfigs)
    .find(row => String(row?.groupId || row?.group_id || '') === String(groupId || '')) || {}
  const [year, month] = String(yearMonth || '').split('-')

  return {
    scheduleWeekdays: monthlyConfig.scheduleWeekdays ?? monthlyConfig.schedule_weekdays,
    scheduleTime: monthlyConfig.scheduleTime ?? monthlyConfig.schedule_time ??
      config.scheduleTime ?? config.schedule_time ?? config.timeRange ?? group.scheduleTime ?? group.schedule_time,
    startDate: monthlyConfig.scheduleStartDay ?? monthlyConfig.schedule_start_day ??
      config.startDate ?? config.start_date ?? `01/${month || String(new Date().getMonth() + 1).padStart(2, '0')}/${year || new Date().getFullYear()}`,
    defaultVenue: config.defaultVenue ?? config.default_venue ?? group.defaultVenue ?? group.default_venue ?? group.name,
  }
}

function findMonthlyPickleConfig(state, groupId, yearMonth) {
  return [
    ...safeArray(state?._allPickle?.monthlyConfigs),
    ...safeArray(state?.pickle?.monthlyConfigs),
    ...safeArray(state?.pickleballMonthlyConfigs),
  ].find(row => (
    String(row?.groupId || row?.group_id || '') === String(groupId || '') &&
    String(row?.yearMonth || row?.year_month || '') === String(yearMonth || '')
  )) || {}
}

function scheduledSessionsForMonth(state, groupId, yearMonth) {
  const seen = new Set()
  return [
    ...safeArray(state?._allPickle?.sessions),
    ...safeArray(state?.pickle?.sessions),
    ...safeArray(state?.pickle?.upcoming),
  ].filter(session => {
    const id = String(session?.id || `${sessionDateValue(session)}:${session?.court || ''}`)
    if (seen.has(id)) return false
    seen.add(id)
    const sessionGroupId = session?.groupId || session?.group_id
    return (
      String(session?.status || '').toLowerCase() === 'scheduled' &&
      String(sessionGroupId || '') === String(groupId || '') &&
      String(sessionDateValue(session) || '').startsWith(`${yearMonth}-`)
    )
  })
}

function sessionDateValue(session) {
  return session?.sessionDate || session?.session_date || session?.date
}

function normalizeScheduleWeekdays(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\s]+/)
  const map = {
    monday: 1,
    mon: 1,
    t2: 1,
    '2': 1,
    tuesday: 2,
    tue: 2,
    t3: 2,
    '3': 2,
    wednesday: 3,
    wed: 3,
    t4: 3,
    '4': 3,
    thursday: 4,
    thu: 4,
    t5: 4,
    '5': 4,
    friday: 5,
    fri: 5,
    t6: 5,
    '6': 5,
    saturday: 6,
    sat: 6,
    t7: 6,
    '7': 6,
    sunday: 7,
    sun: 7,
    cn: 7,
    '0': 7,
  }
  return [...new Set(list
    .map(item => {
      if (typeof item === 'number' && Number.isInteger(item)) return item === 0 ? 7 : item
      return map[String(item || '').trim().toLowerCase()]
    })
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 7))]
    .sort((a, b) => a - b)
}

function sameScheduleWeekdays(left, right) {
  const a = normalizeScheduleWeekdays(left)
  const b = normalizeScheduleWeekdays(right)
  return a.length === b.length && a.every((day, index) => day === b[index])
}

function isoWeekdayFromDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return null
  return date.getDay() === 0 ? 7 : date.getDay()
}

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseMoneyAmount(value) {
  return Number(String(value ?? '').replace(/\D/g, '')) || 0
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function memberNameParts(name) {
  const trimmed = String(name || '').trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  return {
    short: words.at(-1) || trimmed,
    initials: words.map(word => word[0]).join('').slice(0, 2).toUpperCase() || '?',
  }
}

async function findCasualMemberByName(sb, groupId, name) {
  const { data, error } = await sb
    .from('members')
    .select('id')
    .eq('group_id', groupId)
    .eq('member_type', 'casual')
    .ilike('name', name)
    .maybeSingle()
  if (error) throw error
  return data
}

function normalizeTicketDate(value) {
  const text = String(value || '').trim()
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, year, month, day] = iso
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!slash) return text
  const [, day, month, year] = slash
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeTicketMemberIds(value, state) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  const members = safeArray(state?.members).filter(member => {
    const memberGroupId = member?.groupId || member?.group_id
    return !groupId || !memberGroupId || String(memberGroupId) === String(groupId)
  })
  return safeArray(value)
    .map(item => {
      const text = String(item || '').trim()
      const member = members.find(row => (
        String(row?.id || row?.member_id || '') === text ||
        String(row?.name || row?.displayName || '').trim() === text
      ))
      return member?.id || member?.member_id || text
    })
    .filter(Boolean)
}

function dateFromLabel(label) {
  const match = String(label || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return new Date().toISOString().slice(0, 10)
  const [, day, month, year] = match
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function exportStateCsv(state) {
  const members = (state.members || [])
  const expenses = (state.expenses || [])
  const findName = (id) => members.find(m => m.id === id)?.name || id || ''

  const rows = [
    ['Ngày', 'Tiêu đề', 'Số tiền', 'Người chi', 'Trạng thái', 'Nhóm'],
  ]
  expenses.forEach(ep => {
    const e = ep.expenses || ep
    rows.push([
      e.expense_date || e.date || '',
      e.title || '',
      e.amount || '',
      findName(e.paid_by_member_id || e.paidBy),
      e.status || '',
      e.groups?.name || '',
    ])
  })

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spliteasy-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ToastOverlay({ toast }) {
  const visible = toast?.visible === true
  const message = toast?.message || ''
  if (!visible && !message) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#1e293b',
      color: '#f8fafc',
      padding: '12px 20px',
      borderRadius: 8,
      opacity: visible ? 1 : 0,
      transition: 'opacity 200ms ease',
      pointerEvents: 'none',
      fontSize: 14,
      fontWeight: 600,
      maxWidth: 'calc(100vw - 32px)',
      textAlign: 'center',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
    }}>
      {message}
    </div>
  )
}

function PinEntryScreen({ error, value, onChange, onSubmit }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: colors.shellBg,
        borderRadius: 16,
        padding: 32,
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: type.family,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, textAlign: 'center' }}>Nhập mã PIN</div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          style={{
            textAlign: 'center',
            fontSize: 24,
            letterSpacing: 0,
            padding: '12px 16px',
            borderRadius: 8,
            border: `1px solid ${colors.borderNormal}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            outline: 'none',
          }}
          placeholder="••••••"
        />
        {error && <div style={{ color: colors.danger, textAlign: 'center', fontSize: 14 }}>{error}</div>}
        <button onClick={() => onSubmit()} style={{
          background: colors.brand,
          border: 'none',
          borderRadius: 8,
          color: 'white',
          padding: '12px',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
        }}>Xác nhận</button>
      </div>
    </div>
  )
}
