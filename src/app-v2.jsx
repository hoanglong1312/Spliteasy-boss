import React, { useEffect, useRef, useState } from 'react'

import { colors, type } from './tokens'
import { useApp } from './store.jsx'
import { getRecentSessions, getStoredAuth, joinGroup, removeRecentSession, getPinnedSession, getTokenAfterPinVerify, profilePinRequired, verifyProfilePin } from './lib/auth.js'
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
import PickleballTeamFund from './screens/PickleballTeamFund'
import BatchEntry from './screens/BatchEntry'
import Profile from './screens/Profile'
import PaymentFlow from './screens/PaymentFlow'
import JoinGroup from './screens/JoinGroup'
import ExpenseDetail from './screens/ExpenseDetail'
import SessionDetail from './screens/SessionDetail'
import NewGroup from './screens/NewGroup'
import Notifications from './screens/Notifications'
import ApprovalQueue from './screens/ApprovalQueue'
import Settings from './screens/Settings'
import SettlementPeriod from './screens/SettlementPeriod'
import MemberBillShare from './screens/MemberBillShare'

const PIN_UNLOCK_KEY = 'spliteasy_pin_unlocked'
const PROFILE_PHOTO_CHANGED_EVENT = 'spliteasy-profile-photo-changed'

function profilePhotoStorageKey(identityId) {
  return `spliteasy_profile_photo_${identityId || 'me'}`
}

function profilePhotoIdentityIds(memberId, profileId, members = []) {
  const ids = [
    profileId,
    memberId,
    ...safeArray(members)
      .filter(member => profileId && String(member?.profileId || member?.profile_id || '') === String(profileId))
      .map(member => member?.id),
  ].filter(Boolean)
  return Array.from(new Set(ids.map(String)))
}

function isPickleballActionGroup(group) {
  const explicit = String(group?.type || group?.kind || group?.groupType || group?.group_type || '').toLowerCase()
  return explicit === 'pickleball'
}

function normalizeMemberType(value) {
  const raw = String(value || '').toLowerCase()
  return ['casual', 'guest', 'vanglai', 'vãng lai'].includes(raw) ? 'casual' : 'fixed'
}

function normalizeMemberName(value) {
  return String(value || '').trim().toLowerCase()
}

function memberIdentityKey(member) {
  return String(member?.profileId || member?.profile_id || normalizeMemberName(member?.displayName || member?.name) || '').trim().toLowerCase()
}

function currentProfileId(state) {
  const me = safeArray(state?.members).find(m => String(m.id) === String(state?.currentUserId))
  return me?.profileId || me?.profile_id || ''
}

function paymentNotificationTargetMemberId(state) {
  const rows = safeArray(state?.members)
  const moneyManagers = rows.filter(member => ['treasurer', 'admin', 'owner'].includes(String(member?.role || '').toLowerCase()))
  return (
    moneyManagers.find(member => normalizeMemberName(member?.displayName || member?.name).includes('long')) ||
    moneyManagers[0] ||
    rows.find(member => normalizeMemberName(member?.displayName || member?.name).includes('long')) ||
    null
  )?.id
}

function findDuplicatePickleballMemberForType(state, currentMember, groupId, targetType) {
  const key = memberIdentityKey(currentMember)
  if (!key || !groupId || !targetType) return null
  const normalizedTargetType = normalizeMemberType(targetType)
  return safeArray(state?.members).find(member => (
    String(member?.id || '') !== String(currentMember?.id || '') &&
    String(member?.groupId || member?.group_id || '') === String(groupId) &&
    member?.isActive !== false &&
    member?.is_active !== false &&
    normalizeMemberType(member?.memberType || member?.member_type) === normalizedTargetType &&
    memberIdentityKey(member) === key
  )) || null
}

function publicBillTokenFromLocation() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  return params.get('bill') || ''
}

function accessTokenFromLocation() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  return params.get('access') || ''
}

function inviteTokenFromLocation() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  return params.get('invite') || ''
}

function joinCodeFromLocation() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  return (params.get('join') || '').trim().toUpperCase()
}

export default function AppV2() {
  const { state, dispatch } = useApp()
  const [publicBillToken, setPublicBillToken] = useState(() => publicBillTokenFromLocation())
  const [memberAccessToken] = useState(() => accessTokenFromLocation())
  const [groupInviteToken] = useState(() => inviteTokenFromLocation())
  const [groupJoinCode] = useState(() => joinCodeFromLocation())
  const [publicBillData, setPublicBillData] = useState(null)
  const [publicBillLoading, setPublicBillLoading] = useState(Boolean(publicBillToken))
  const [accessLinkLoading, setAccessLinkLoading] = useState(Boolean(memberAccessToken))
  const [accessLinkError, setAccessLinkError] = useState('')
  const groups = state.groups || []
  const members = state.members || []
  const {
    isTreasurer,
    isPickleballTreasurer,
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
    getPickleballTeamFundData,
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
  const inviteTokenNavigated = useRef(false)
  const joinCodeNavigated = useRef(false)
  const [awaitingPin, setAwaitingPin] = useState(() => {
    const { token, member } = getStoredAuth()
    const memberId = member?.id
    return !!(
      member?.hasPin &&
      token &&
      memberId &&
      sessionStorage.getItem(PIN_UNLOCK_KEY) !== (member?.profileId || member?.profile_id || memberId)
    )
  })
  const [pinError, setPinError] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pendingPinSession, setPendingPinSession] = useState(null)
  const [, setRecentSessionVersion] = useState(0)
  const [homePaymentOpen, setHomePaymentOpen] = useState(false)

  // iOS Safari bypasses body overflow:hidden and scrolls window when keyboard opens.
  // This app never needs window-level scroll (all scrolling is inside Screen's overflow-y:auto).
  // Always reset window.scrollY to 0 whenever iOS manages to scroll it.
  useEffect(() => {
    const resetScroll = () => {
      if (window.scrollY === 0) return
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return
      window.scrollTo(0, 0)
    }
    window.addEventListener('scroll', resetScroll, { passive: true })
    return () => window.removeEventListener('scroll', resetScroll)
  }, [])

  useEffect(() => {
    if (!publicBillToken) return
    let alive = true
    async function openBillLink() {
      setPublicBillLoading(true)
      const openedHome = await openPersonalLinkHome(publicBillToken)
      if (!alive || openedHome) return
      const sb = createSupabase()
      const { data, error } = await sb.rpc('get_member_bill_share', { p_token: publicBillToken })
      if (!alive) return
      setPublicBillData(error ? { error: 'invalid_token' } : data)
      setPublicBillLoading(false)
    }
    openBillLink()
    return () => { alive = false }
  }, [publicBillToken])

  useEffect(() => {
    if (!memberAccessToken) return
    let alive = true
    async function consumeAccessLink() {
      setAccessLinkLoading(true)
      setAccessLinkError('')
      const sb = createSupabase()
      const { data, error } = await sb.rpc('consume_member_access_link', { p_token: memberAccessToken })
      if (!alive) return
      if (error || data?.error || !data?.authToken) {
        setAccessLinkError('Link đăng nhập không còn hiệu lực. Nhờ thủ quỹ gửi lại link mới.')
        setAccessLinkLoading(false)
        return
      }
      await dispatch({
        type: 'LOGIN',
        token: data.authToken,
        memberId: data.memberId,
        groupId: data.groupId,
        memberName: data.memberName,
        purpose: data.purpose,
      })
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname)
      }
      setAccessLinkLoading(false)
    }
    consumeAccessLink()
    return () => { alive = false }
  }, [memberAccessToken, dispatch])

  useEffect(() => {
    if (!awaitingPin || pendingPinSession) return
    const { member } = getStoredAuth()
    if (!member?.hasPin || !member?.id) return
    let alive = true
    checkMemberPinRequired(member.id).then(required => {
      if (!alive || required) return
      setAwaitingPin(false)
      setPinError('')
      setPinInput('')
    })
    return () => { alive = false }
  }, [awaitingPin, pendingPinSession])

  // Auto-navigate to join-group when logged-in user opens invite link
  useEffect(() => {
    if (!groupInviteToken) return
    if (!state.currentUserId) return  // already showing join screen at line 2000
    if (state._loading) return
    if (inviteTokenNavigated.current) return
    inviteTokenNavigated.current = true
    setStack(s => {
      // Only push if join-group not already on stack
      if (s.some(r => r.screen === 'join-group')) return s
      return [{ screen: 'join-group' }]
    })
  }, [groupInviteToken, state.currentUserId, state._loading])
  // Auto-navigate to join-group when logged-in user opens ?join=CODE link
  useEffect(() => {
    if (!groupJoinCode) return
    if (!state.currentUserId) return
    if (state._loading) return
    if (joinCodeNavigated.current) return
    joinCodeNavigated.current = true
    setStack(s => {
      if (s.some(r => r.screen === 'join-group')) return s
      return [{ screen: 'join-group' }]
    })
  }, [groupJoinCode, state.currentUserId, state._loading])


  async function openPersonalLinkHome(token) {
    if (!token) return
    const sb = createSupabase()
    const { data, error } = await sb.rpc('consume_member_access_link', { p_token: token })
    if (error || data?.error || !data?.authToken) {
      return false
    }
    await dispatch({
      type: 'LOGIN',
      token: data.authToken,
      memberId: data.memberId,
      groupId: data.groupId,
      memberName: data.memberName,
      purpose: data.purpose,
    })
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
    setPublicBillToken('')
    setPublicBillData(null)
    setPublicBillLoading(false)
    setActiveTab('home')
    setStack([])
    return true
  }

  async function openMemberBillInApp(token) {
    const openedHome = await openPersonalLinkHome(token)
    if (!openedHome) {
      dispatch({ type: 'SHOW_TOAST', message: 'Link vào app không còn hiệu lực. Nhờ thủ quỹ gửi lại link mới.' })
    }
  }

  // Returns { authToken, memberId, groupId, memberName } or null
  async function resolveRecentSessionToken(session) {
    const sb = createSupabase()

    // Profile-based session: always prefer profile_id + group_id lookup — avoids stale memberId / name-mismatch issues
    if (session?.profileId) {
      const { data, error } = await sb.rpc('resume_session_by_profile', {
        p_profile_id: session.profileId,
        p_group_id: session.groupId,
      })
      if (error || data?.error || !data?.authToken) {
        console.error('[app] resumeSessionByProfile:', error || data)
        return null
      }
      return { authToken: data.authToken, memberId: data.memberId, groupId: data.groupId, memberName: data.memberName || session.memberName }
    }

    if (!session?.memberId) return null
    // Always use RPC to get a fresh token — cached JWT may be expired
    const { data, error } = await sb.rpc('resume_recent_member_session', {
      p_member_id: session.memberId,
      p_member_name: session.memberName || '',
    })
    if (error || data?.error || !data?.authToken) {
      console.error('[app] resumeRecentSession:', error || data)
      return null
    }
    return { authToken: data.authToken, memberId: data.memberId || session.memberId, groupId: data.groupId || session.groupId, memberName: data.memberName || session.memberName }
  }

  async function verifyMemberPin(memberId, pin) {
    if (!memberId || !pin) return false
    const member = safeArray(state?.members).find(member => String(member.id) === String(memberId))
    const profileId = member?.profileId || member?.profile_id
    if (profileId) return verifyProfilePin(profileId, pin)
    try {
      const data = await getTokenAfterPinVerify(memberId, pin)
      return !!data && !data.error
    } catch (error) {
      console.error('[app] verifyMemberPin:', error)
      return false
    }
  }

  async function checkMemberPinRequired(memberId, profileId) {
    if (profileId) {
      return profilePinRequired(profileId)
    }
    if (!memberId) return false
    const sb = createSupabase()
    const { data, error } = await sb.rpc('member_pin_required', { p_member_id: memberId })
    if (error || data?.error) {
      console.error('[app] memberPinRequired:', error || data)
      return true
    }
    return data === true || data?.required === true
  }

  async function submitPin(value = pinInput) {
    const pending = pendingPinSession
    const profileId = pending?.profileId
    const memberId = pending?.memberId || state.currentUserId
    const pinKey = profileId || memberId

    let pinOk = false
    if (profileId) {
      pinOk = await verifyProfilePin(profileId, value)
    } else {
      pinOk = await verifyMemberPin(memberId, value)
    }

    if (pinOk) {
      if (pinKey) sessionStorage.setItem(PIN_UNLOCK_KEY, pinKey)
      if (document.activeElement) document.activeElement.blur()
      setPendingPinSession(null)
      setAwaitingPin(false)
      setPinError('')
      setPinInput('')
      if (pending) handle('resumeRecentSession', { ...pending, hasPin: false })
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
      setPendingPinSession(null)
      setPinError('')
      setPinInput('')
      return
    }

    if (type === 'adminPinLogin') {
      const { pin, session } = payload || {}
      const memberId = session?.memberId
      const profileId = session?.profileId
      let pinOk = false
      try {
        if (profileId) {
          pinOk = await verifyProfilePin(profileId, pin)
        } else {
          pinOk = await verifyMemberPin(memberId, pin)
        }
      } catch { pinOk = false }
      if (!pinOk) return { error: 'wrong_pin' }
      const pinKey = profileId || memberId
      if (pinKey) sessionStorage.setItem(PIN_UNLOCK_KEY, pinKey)
      const resolved = await resolveRecentSessionToken(session)
      if (!resolved?.authToken) return { error: 'no_token' }
      setStack([])
      setActiveTab('home')
      await dispatch({ type: 'LOGIN', token: resolved.authToken, memberId: resolved.memberId, groupId: resolved.groupId, memberName: resolved.memberName })
      return { ok: true }
    }

    if (type === 'resumeRecentSession') {
      const pinKey = payload?.profileId || payload?.memberId
      const requiresPin = await checkMemberPinRequired(payload?.memberId, payload?.profileId)
      if (requiresPin && sessionStorage.getItem(PIN_UNLOCK_KEY) !== pinKey) {
        setPendingPinSession(payload)
        setAwaitingPin(true)
        setPinError('')
        setPinInput('')
        return
      }
      const resolved = await resolveRecentSessionToken(payload)
      if (!resolved?.authToken) {
        dispatch({ type: 'SHOW_TOAST', message: 'Không vào lại được tài khoản này. Nhờ thủ quỹ gửi link mới nếu tên đã bị xóa hoặc đổi.' })
        return
      }
      setStack([])
      setActiveTab('home')
      await dispatch({
        type: 'LOGIN',
        token: resolved.authToken,
        memberId: resolved.memberId,
        groupId: resolved.groupId,
        memberName: resolved.memberName,
      })
      return
    }
    if (type === 'joinGroup_direct') {
      // Direct login for existing member via invite link (auto-login or after PIN verify)
      const requiresPin = await checkMemberPinRequired(payload?.memberId)
      const member = safeArray(state?.members).find(m => String(m.id) === String(payload?.memberId))
      const pinKey = member?.profileId || member?.profile_id || payload?.memberId
      if (requiresPin && sessionStorage.getItem(PIN_UNLOCK_KEY) !== pinKey) {
        sessionStorage.setItem(PIN_UNLOCK_KEY, pinKey)
      }
      setStack([])
      setActiveTab('home')
      await dispatch({
        type: 'LOGIN',
        token: payload.token,
        memberId: payload.memberId,
        groupId: payload.groupId,
        memberName: payload.memberName,
      })
      return
    }

    if (type === 'verifyPin') {
      const _vpMember = safeArray(state?.members).find(m => String(m.id) === String(payload?.memberId || state.currentUserId))
      const _vpProfileId = _vpMember?.profileId || _vpMember?.profile_id
      if (_vpProfileId) return verifyProfilePin(_vpProfileId, payload?.pin)
      return verifyMemberPin(payload?.memberId || state.currentUserId, payload?.pin)
    }

    if (type === 'setPin') {
      try {
        await dispatch({ type: 'SET_MEMBER_PIN', pin: payload?.pin })
        if (state.currentUserId) sessionStorage.setItem(PIN_UNLOCK_KEY, currentProfileId(state) || state.currentUserId)
        return true
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: 'Không lưu được PIN. Thử lại.' })
        return false
      }
    }

    if (type === 'removePin') {
      try {
        await dispatch({ type: 'RESET_MEMBER_PIN', memberId: state.currentUserId })
        sessionStorage.removeItem(PIN_UNLOCK_KEY)
        return true
      } catch (err) {
        dispatch({ type: 'SHOW_TOAST', message: 'PIN không đúng hoặc chưa xóa được.' })
        return false
      }
    }

    if (type === 'removeRecentSession') {
      removeRecentSession(payload)
      if ((pendingPinSession?.memberId && pendingPinSession.memberId === payload?.memberId) ||
          (pendingPinSession?.profileId && pendingPinSession.profileId === payload?.profileId)) {
        setPendingPinSession(null)
        setAwaitingPin(false)
        setPinError('')
        setPinInput('')
      }
      setRecentSessionVersion(version => version + 1)
      dispatch({ type: 'SHOW_TOAST', message: 'Đã xóa tài khoản gần đây trên máy này.' })
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
      const groupId = activePickleballGroupId(state)
      const pickleballGroup = activePickleballGroup(state)
      const yearMonth = payload?.currentYearMonth || monthKey(new Date())
      const { token } = getStoredAuth()
      const sb = token ? createSupabase(token) : null
      const oldMonthlyConfig = findMonthlyPickleConfig(state, groupId, yearMonth)
      const oldEffectiveScheduleConfig = sessionGenerationConfigFromState(state, yearMonth)
      const oldWeekdays = normalizeScheduleWeekdays(oldMonthlyConfig.scheduleWeekdays ?? oldMonthlyConfig.schedule_weekdays)
      const oldScheduleTime = normalizeScheduleTimeForCompare(oldEffectiveScheduleConfig.scheduleTime)
      const newScheduleTime = normalizeScheduleTimeForCompare(payload?.scheduleTime)
      const scheduleTimeChanged = oldScheduleTime !== newScheduleTime
      const oldScheduleStartDay = normalizeScheduleStartDayForCompare(oldEffectiveScheduleConfig.startDate)
      const newScheduleStartDay = normalizeScheduleStartDayForCompare(payload?.startDate)
      const scheduleStartChanged = oldScheduleStartDay !== newScheduleStartDay
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
        scheduleWeekdays: payload?.weekdays,
        scheduleStartDay: payload?.startDate,
        scheduleTime: payload?.scheduleTime,
      }
      if ('activeMonthlyMemberIds' in (payload || {}) || 'activeMemberIds' in (payload || {})) {
        action.activeMonthlyMemberIds = payload?.activeMonthlyMemberIds ?? payload?.activeMemberIds ?? []
      }
      const nextClubName = String(payload?.clubName || '').trim()
      if (nextClubName && nextClubName !== pickleballGroup?.name) {
        await dispatch({
          type: 'EDIT_GROUP',
          group: {
            ...pickleballGroup,
            id: groupId,
            name: nextClubName,
          },
        })
      }
      await dispatch(action)
      const shouldRegenerateSchedule = !sameScheduleWeekdays(oldWeekdays, newWeekdays) || scheduleTimeChanged || scheduleStartChanged || hasScheduledSessionsWithOldDays
      if (shouldRegenerateSchedule && groupId && sb) {
        await dispatch({ type: 'SET_PICKLE_REGEN', value: true })
        try {
          const [deleteResult1, deleteResult2] = await Promise.all([
            sb
              .from('pickle_sessions')
              .delete()
              .eq('group_id', groupId)
              .eq('status', 'scheduled')
              .gte('session_date', `${yearMonth}-01`)
              .lte('session_date', `${yearMonth}-31`),
            sb
              .from('pickleball_sessions')
              .delete()
              .eq('group_id', groupId)
              .or('status.is.null,status.eq.scheduled')
              .gte('date', `${yearMonth}-01`)
              .lte('date', `${yearMonth}-31`),
          ])
          if (deleteResult1.error) throw deleteResult1.error
          if (deleteResult2.error) throw deleteResult2.error

          await dispatch({
            type: 'CLEAR_SCHEDULED_SESSIONS',
            groupId,
            yearMonth,
          })

          const generationConfig = {
            ...sessionGenerationConfigFromState(state, yearMonth),
            scheduleWeekdays: newWeekdays,
            scheduleTime: action.scheduleTime,
            startDate: action.scheduleStartDay,
          }
          await dispatch({
            type: 'AUTO_GENERATE_SESSIONS',
            groupId,
            yearMonth,
            config: generationConfig,
            force: true,
          })
        } finally {
          await dispatch({ type: 'SET_PICKLE_REGEN', value: false })
        }
      }
      if (groupId && sb) {
        const [y, m] = yearMonth.split('-').map(Number)
        const nextYearMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`
        const nextMonthlyConfig = findMonthlyPickleConfig(state, groupId, nextYearMonth)
        const previousScheduleConfig = { scheduleWeekdays: oldWeekdays, scheduleTime: oldScheduleTime, scheduleStartDay: oldScheduleStartDay }
        const shouldUpdateNextMonthSchedule = shouldRegenerateSchedule && isFutureScheduleInherited(nextMonthlyConfig, previousScheduleConfig)

        if (shouldUpdateNextMonthSchedule) {
          await dispatch({
            type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG',
            groupId,
            yearMonth: nextYearMonth,
            scheduleWeekdays: newWeekdays,
            scheduleStartDay: null,
            scheduleTime: payload?.scheduleTime,
          })

          const [d1, d2] = await Promise.all([
            sb
              .from('pickle_sessions')
              .delete()
              .eq('group_id', groupId)
              .eq('status', 'scheduled')
              .gte('session_date', `${nextYearMonth}-01`)
              .lte('session_date', `${nextYearMonth}-31`),
            sb
              .from('pickleball_sessions')
              .delete()
              .eq('group_id', groupId)
              .or('status.is.null,status.eq.scheduled')
              .gte('date', `${nextYearMonth}-01`)
              .lte('date', `${nextYearMonth}-31`),
          ])
          if (d1.error) console.warn('[saveSettings] next month delete p1:', d1.error)
          if (d2.error) console.warn('[saveSettings] next month delete p2:', d2.error)

          const nextConfig = {
            ...sessionGenerationConfigFromState(state, nextYearMonth),
            scheduleWeekdays: newWeekdays,
            scheduleTime: action.scheduleTime,
          }
          await dispatch({
            type: 'AUTO_GENERATE_SESSIONS',
            groupId,
            yearMonth: nextYearMonth,
            config: nextConfig,
            force: true,
          })
        }
      }
      alert('Đã lưu cài đặt lịch')
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'AUTO_GENERATE_SESSIONS') {
      await dispatch({
        type: 'AUTO_GENERATE_SESSIONS',
        groupId: activePickleballGroupId(state),
        yearMonth: payload?.yearMonth,
        config: payload?.config,
      })
      return
    }

    if (type === 'saveTeamFundConfig') {
      if (!isPickleballTreasurer) return
      const groupId = activePickleballGroupId(state)
      if (!groupId) return
      await dispatch({
        type: 'SAVE_VENUE_OWNER_BANK',
        groupId,
        venueOwnerName: payload?.venueOwnerName,
        venueBankName: payload?.venueBankName,
        venueBankAccount: payload?.venueBankAccount,
      })
      await dispatch({
        type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG',
        groupId,
        yearMonth: payload?.currentYearMonth || monthKey(new Date()),
        courtFee: payload?.courtFee,
        ticketPrice: payload?.ticketPrice,
      })
      return
    }

    if (type === 'markOwnerPayment') {
      if (!isPickleballTreasurer) return
      const groupId = activePickleballGroupId(state)
      if (!groupId) return
      await dispatch({
        type: 'ADD_PICKLEBALL_OWNER_PAYMENT',
        groupId,
        yearMonth: payload?.currentYearMonth || payload?.yearMonth || monthKey(new Date()),
        paidAt: payload?.paidAt,
        totalAmount: payload?.totalAmount,
        bankSnapshot: payload?.bankSnapshot,
        items: payload?.items,
        note: payload?.note,
      })
      return
    }

    if (type === 'unmarkOwnerPayment') {
      if (!isPickleballTreasurer) return
      await dispatch({
        type: 'UNMARK_PICKLEBALL_OWNER_PAYMENT_ITEM',
        paymentId: payload?.paymentId,
        item: payload?.item,
      })
      return
    }

    if (type === 'monthPrev' || type === 'monthNext') {
      const route = stack[stack.length - 1]
      const currentYearMonth = state.selectedYearMonth || route?.params?.yearMonth || monthKey(new Date())
      const nextYearMonth = shiftYearMonth(currentYearMonth, type === 'monthNext' ? 1 : -1)
      await dispatch({ type: 'SET_SELECTED_MONTH', selectedYearMonth: nextYearMonth })
      if (route?.screen === 'pickleball-calendar') {
        const nextRoute = { screen: 'pickleball-calendar', params: { ...route.params, yearMonth: nextYearMonth } }
        setStack((s) => s.map((item, index) => index === s.length - 1 ? nextRoute : item))
        const groupId = activePickleballGroupId(state)
        const generationConfig = sessionGenerationConfigFromState(state, nextYearMonth)
        if (normalizeScheduleWeekdays(generationConfig.scheduleWeekdays).length > 0) {
          await dispatch({
            type: 'AUTO_GENERATE_SESSIONS',
            groupId,
            yearMonth: nextYearMonth,
            config: generationConfig,
          })
        }
      }
      return
    }

    if (type === 'addExpenseGroupMember') {
      const name = String(payload?.name || '').trim()
      const groupId = payload?.groupId
      if (!name || !groupId) return null
      const memberId = payload?.memberId || payload?.member_id
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb.rpc('add_expense_group_member', {
        p_group_id: groupId,
        p_member_id: memberId || null,
        p_name: name,
        p_profile_id: payload?.profileId || payload?.profile_id || null,
        p_bank_name: payload?.bankName ?? payload?.bank_name ?? null,
        p_bank_account: payload?.bankAccount ?? payload?.bank_account ?? null,
        p_bank_account_name: payload?.bankAccountName ?? payload?.bank_account_name ?? null,
      })
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'addPickleballMember') {
      const name = String(payload?.name || '').trim()
      if (!name) return null
      const groupId = payload?.groupId || activePickleballGroupId(state)
      if (!groupId) return null
      return dispatch({
        type: 'ADD_MEMBER',
        groupId,
        member: {
          name,
          profileId: payload?.profileId || payload?.profile_id,
          member_type: payload?.type || payload?.memberType || 'fixed',
          bank_account: payload?.bankAccount ?? payload?.bank_account,
          bank_name: payload?.bankName ?? payload?.bank_name,
          bank_account_name: payload?.bankAccountName ?? payload?.bank_account_name,
        },
      })
    }

    if (type === 'addMember') {
      const name = String(payload?.name || '').trim()
      const groupId = payload?.groupId
      if (!name || !groupId) return null
      return dispatch({
        type: 'ADD_MEMBER',
        groupId,
        member: {
          name,
          profileId: payload?.profileId || payload?.profile_id,
          member_type: payload?.type || payload?.memberType || 'fixed',
          bank_account: payload?.bankAccount ?? payload?.bank_account,
          bank_name: payload?.bankName ?? payload?.bank_name,
          bank_account_name: payload?.bankAccountName ?? payload?.bank_account_name,
        },
      })
    }

    if (type === 'editGroup') {
      const group = payload?.group || payload
      if (!group?.id || !String(group?.name || '').trim()) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb.rpc('edit_expense_group', {
        p_group_id: group.id,
        p_name: String(group.name).trim(),
        p_emoji: group.emoji || '👥',
        p_description: group.description || '',
        p_color: group.color || '#574EFA',
      })
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'deleteGroup') {
      const groupId = payload?.groupId || payload?.id || payload
      if (!groupId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data, error } = await sb.rpc('delete_expense_group', {
        p_group_id: groupId,
      })
      if (error || data?.error) throw error || new Error(data.error)
      await dispatch({ type: 'REFRESH' })
      setStack((s) => s.slice(0, -1))
      return
    }

    if (type === 'editMember') {
      const memberId = payload?.memberId
      if (!memberId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const member = safeArray(state?.members).find(item => String(item.id) === String(memberId))
      const profileUpdate = {
        name: payload?.name,
        bank_account: payload?.bankAccount ?? payload?.bank_account,
        bank_name: payload?.bankName ?? payload?.bank_name,
        bank_account_name: payload?.bankAccountName ?? payload?.bank_account_name,
      }
      if (!('bankName' in (payload || {})) && !('bank_name' in (payload || {}))) delete profileUpdate.bank_name
      if (!('bankAccountName' in (payload || {})) && !('bank_account_name' in (payload || {}))) delete profileUpdate.bank_account_name
      const profileId = payload?.profileId || payload?.profile_id || member?.profileId || member?.profile_id
      const targetGroupId = payload?.groupId || payload?.group_id || member?.groupId || member?.group_id
      const memberUpdate = {
        name: profileUpdate.name,
        bank_account: profileUpdate.bank_account,
        bank_name: profileUpdate.bank_name,
        bank_account_name: profileUpdate.bank_account_name,
      }
      if (!('bank_account' in profileUpdate)) delete memberUpdate.bank_account
      if (!('bank_name' in profileUpdate)) delete memberUpdate.bank_name
      if (!('bank_account_name' in profileUpdate)) delete memberUpdate.bank_account_name
      let updatedRows = []
      if (profileId) {
        const { data, error } = await sb.from('profiles').update(profileUpdate).eq('id', profileId).select('id')
        if (error) throw error
        updatedRows = data
        // Sync members.name so resume_recent_member_session name check stays valid
        if (profileUpdate.name && safeArray(updatedRows).length) {
          await sb.from('members').update({ name: profileUpdate.name }).eq('profile_id', profileId)
        }
      }
      if (!safeArray(updatedRows).length) {
        let request = sb.from('members').update(memberUpdate).eq('id', memberId)
        if (targetGroupId) request = request.eq('group_id', targetGroupId)
        const { data, error } = await request.select('id')
        if (error) throw error
        updatedRows = data
      }
      if (!safeArray(updatedRows).length) throw new Error(`Không thể cập nhật thành viên ${payload?.name || member?.name || memberId}. Kiểm tra quyền truy cập hoặc mã thành viên.`)
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'linkProfile') {
      const memberId = payload?.memberId
      const profileId = payload?.profileId || payload?.profile_id
      if (!memberId || !profileId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('members')
        .update({ profile_id: profileId })
        .eq('id', memberId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'unlinkProfile') {
      const memberId = payload?.memberId
      if (!memberId) return
      const member = safeArray(state?.members).find(item => String(item.id) === String(memberId))
      if (!member) return
      const parts = memberNameParts(member.displayName || member.name)
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .insert({
          name: member.displayName || member.name || 'Thành viên',
          short: member.short || parts.short,
          initials: member.initials || parts.initials,
          color: member.color || '#574EFA',
          bank_name: member.bankName || member.bank_name || null,
          bank_account: member.bankAccount || member.bank_account || null,
          bank_account_name: member.bankAccountName || member.bank_account_name || member.displayName || member.name || null,
        })
        .select('id')
        .single()
      if (profileError) throw profileError
      const { error } = await sb
        .from('members')
        .update({ profile_id: profile.id })
        .eq('id', memberId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'setMemberRole') {
      const memberId = payload?.memberId
      if (!memberId) return
      const member = safeArray(state?.members).find(item => String(item.id) === String(memberId))
      const groupId = payload?.groupId || member?.group_id || member?.groupId
      const currentGroup = safeArray(state?.groups).find(group => String(group.id) === String(groupId))
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const request = isPickleballActionGroup(currentGroup)
        ? sb
          .from('members')
          .update({ role: payload?.role })
          .eq('id', memberId)
        : sb.rpc('set_expense_group_member_role', {
          p_group_id: groupId,
          p_member_id: memberId,
          p_role: payload?.role,
        })
      const { data, error } = await request
      if (error || data?.error) throw error || new Error(data.error)
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'setMemberType') {
      const memberId = payload?.memberId
      if (!memberId) return
      const targetType = payload?.type
      const targetGroupId = payload?.groupId || state.currentGroupId
      const currentMember = safeArray(state?.members).find(item => String(item.id) === String(memberId))
      const currentGroup = safeArray(state?.groups).find(group => String(group.id) === String(targetGroupId))
      const isPickleballGroup = isPickleballActionGroup(currentGroup)
      const duplicateTargetMember = isPickleballGroup
        ? findDuplicatePickleballMemberForType(state, currentMember, targetGroupId, targetType)
        : null
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      if (duplicateTargetMember) {
        const { error: duplicateError } = await sb
          .from('members')
          .update({ is_active: false })
          .eq('id', duplicateTargetMember.id)
          .eq('group_id', targetGroupId)
        if (duplicateError) throw duplicateError
      }
      let request = sb
        .from('members')
        .update({ member_type: targetType, is_active: true })
        .eq('id', memberId)
      if (payload?.groupId) request = request.eq('group_id', payload.groupId)
      const { error } = await request
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'removeMemberFromGroup') {
      const memberId = payload?.memberId ?? payload
      const targetGroupId = payload?.groupId || state.currentGroupId
      if (!memberId || !targetGroupId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data: rpcResult, error } = await sb
        .rpc('remove_expense_group_member', {
          p_group_id: targetGroupId,
          p_member_id: memberId,
        })
      if (error) throw error
      if (rpcResult?.error) throw new Error(rpcResult.error)
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'removePickleballMember') {
      const memberId = payload?.memberId ?? payload
      if (!memberId) return
      const targetGroupId = payload?.groupId || state.currentGroupId
      const currentGroup = (state.groups || []).find(group => String(group.id) === String(targetGroupId))
      const isPickleballGroup = isPickleballActionGroup(currentGroup)
      if (!isPickleballGroup) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('members')
        .update({ is_active: false })
        .eq('id', memberId)
        .eq('group_id', targetGroupId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'reactivateMember') {
      const memberId = payload?.memberId ?? payload
      if (!memberId) return
      const targetGroupId = payload?.groupId || state.currentGroupId
      const currentGroup = (state.groups || []).find(group => String(group.id) === String(targetGroupId))
      const isPickleballGroup = isPickleballActionGroup(currentGroup)
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      if (isPickleballGroup) {
        const { error } = await sb
          .from('members')
          .update({ member_type: 'fixed', is_active: true })
          .eq('id', memberId)
          .eq('group_id', targetGroupId)
        if (error) {
          console.error('[app] reactivateMember pickleball:', error)
          dispatch({ type: 'SHOW_TOAST', message: `Không thêm lại được: ${error.message || 'lỗi không rõ'}` })
          return
        }
      } else {
        const target = safeArray(state.members).find(member => String(member.id) === String(memberId)) || {}
        const memberName = String(payload?.name || target.displayName || target.name || '').trim() || 'Thành viên'
        const { error, data } = await sb.rpc('add_expense_group_member', {
          p_group_id: targetGroupId,
          p_member_id: memberId,
          p_name: memberName,
          p_profile_id: target.profileId || target.profile_id || null,
          p_bank_name: null,
          p_bank_account: null,
          p_bank_account_name: null,
        })
        if (error) {
          console.error('[app] reactivateMember expense rpc:', error, { targetGroupId, memberId, memberName })
          dispatch({ type: 'SHOW_TOAST', message: `Không thêm lại được: ${error.message || 'lỗi không rõ'}` })
          return
        }
        console.log('[app] reactivateMember expense rpc ok:', data, { targetGroupId, memberId })
      }
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'addTicket') {
      const groupId = activePickleballGroupId(state)
      if (!groupId || !state.currentUserId) return
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
      const actorMemberId = activePickleballActorMemberId(state, groupId)
      const ticketStatus = isPickleballTreasurer ? (advancerId ? 'unpaid' : 'team_fund') : 'pending_review'
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_tickets')
        .insert({
          group_id: groupId,
          session_date: sessionDate,
          session_time: sessionTime,
          total_amount: totalAmount,
          member_ids: memberIds,
          advancer_id: advancerId,
          status: ticketStatus,
          year_month: monthKey(sessionDate || new Date()),
          created_by: actorMemberId,
        })
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'updateTicket') {
      if (!isPickleballTreasurer) return
      const ticketId = payload?.ticketId ?? payload?.id
      const groupId = activePickleballGroupId(state)
      if (!ticketId || !groupId) return
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
      const ticketStatus = isPickleballTreasurer ? (advancerId ? 'unpaid' : 'team_fund') : 'pending_review'
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_tickets')
        .update({
          session_date: sessionDate,
          session_time: sessionTime,
          total_amount: totalAmount,
          member_ids: memberIds,
          advancer_id: advancerId,
          status: ticketStatus,
          year_month: monthKey(sessionDate || new Date()),
        })
        .eq('id', ticketId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'markAttendance') {
      if (!isPickleballTreasurer) return
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

    if (type === 'completeSession') {
      if (!isPickleballTreasurer) return
      const sessionId = payload?.sessionId ?? payload?.id ?? payload
      if (!sessionId) return
      await dispatch({
        type: 'COMPLETE_PICKLEBALL_SESSION',
        sessionId,
      })
      return
    }

    if (type === 'reopenSession') {
      if (!isPickleballTreasurer) return
      const sessionId = payload?.sessionId ?? payload?.id ?? payload
      if (!sessionId) return
      await dispatch({
        type: 'REOPEN_PICKLEBALL_SESSION',
        sessionId,
      })
      return
    }

    if (type === 'rescheduleSession') {
      if (!isPickleballTreasurer) return
      const sessionId = payload?.sessionId ?? payload?.id
      const date = normalizeTicketDate(payload?.date)
      if (!sessionId || !date) return
      await dispatch({
        type: 'RESCHEDULE_PICKLEBALL_SESSION',
        sessionId,
        newDate: date,
        notes: payload?.notes,
      })
      return
    }

    if (type === 'cleanupStaleReplacementSessions') {
      if (!isPickleballTreasurer) return
      await dispatch({
        type: 'CLEANUP_STALE_REPLACEMENT_SESSIONS',
        ids: payload?.ids || payload,
      })
      return
    }

    if (type === 'approveTicket') {
      if (!isPickleballTreasurer) return
      const ticketId = payload?.ticketId ?? payload?.id ?? payload
      if (!ticketId) return
      const approvedStatus = String(payload?.status || '').toLowerCase() === 'team_fund' ? 'team_fund' : 'unpaid'
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickleball_tickets')
        .update({ status: approvedStatus })
        .eq('id', ticketId)
      if (error) throw error
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'deleteTicket') {
      if (!isPickleballTreasurer) return
      const ticketId = payload?.ticketId ?? payload?.id ?? payload
      if (!ticketId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data, error } = await sb
        .from('pickleball_tickets')
        .delete()
        .eq('id', ticketId)
        .select('id')
      if (error) throw error
      if (!data?.length) {
        dispatch({ type: 'SHOW_TOAST', message: 'Không xóa được vé lẻ. Kiểm tra quyền thủ quỹ hoặc thử tải lại.' })
        return
      }
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'subTab') {
      const SUBTAB_TO_SCREEN = {
        overview: 'pickleball-overview',
        calendar: 'pickleball-calendar',
        members: 'pickleball-members',
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

    if (type === 'copyInviteCode') {
      const inviteCode = String(payload?.inviteCode || payload?.invite_code || '').trim().toUpperCase()
      if (!inviteCode) return
      if (navigator.clipboard) navigator.clipboard.writeText(inviteCode).catch(() => {})
      dispatch({ type: 'SHOW_TOAST', message: 'Đã sao chép mã mời.' })
      return
    }

    if (type === 'toast') {
      dispatch({ type: 'SHOW_TOAST', message: typeof payload === 'string' ? payload : payload?.message || '' })
      return
    }

    if (type === 'createMemberBillShare') {
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const { data, error } = await sb.rpc('create_member_access_link', {
        p_group_id: payload?.groupId,
        p_member_id: payload?.memberId,
        p_purpose: 'member_bill',
      })
      if (error || data?.error) {
        const billShareError = error?.message || data?.error || 'Không tạo được link chia sẻ.'
        console.error('[app] createMemberBillShare:', billShareError, error || data)
        dispatch({ type: 'SHOW_TOAST', message: `Không tạo được link chia sẻ: ${billShareError}` })
        return
      }
      const shareToken = data?.urlToken || data?.token || data
      const url = `${window.location.origin}${window.location.pathname}?bill=${encodeURIComponent(shareToken)}`
      if (payload?.copy !== false && navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {})
        dispatch({ type: 'SHOW_TOAST', message: 'Đã sao chép link cá nhân.' })
      }
      return url
    }

    if (type === 'createGroupInviteShare') {
      const { token } = getStoredAuth()
      const groupId = payload?.groupId || state.currentGroupId
      if (token && groupId) {
        try {
          const sb = createSupabase(token)
          const { data, error } = await sb.rpc('create_group_invite_link', { p_group_id: groupId })
          if (!error && !data?.error && data?.urlToken) {
            const url = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(data.urlToken)}`
            if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {})
            dispatch({ type: 'SHOW_TOAST', message: 'Đã sao chép link mời nhóm.' })
            return
          }
        } catch { /* fall through to code fallback */ }
      }
      // Fallback: plain invite code
      const inviteCode = String(payload?.inviteCode || payload?.invite_code || state.currentGroup?.inviteCode || state.currentGroup?.invite_code || '').trim().toUpperCase()
      if (!inviteCode) {
        dispatch({ type: 'SHOW_TOAST', message: 'Nhóm chưa có mã mời.' })
        return
      }
      const url = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(inviteCode)}`
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {})
      dispatch({ type: 'SHOW_TOAST', message: 'Đã sao chép link mời nhóm.' })
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
          receiptImages: payload.receiptImages || [],
          participants: payload.participants || [],
          splitMode: payload.splitMode,
        }
        const { token } = getStoredAuth()
        if (!token) throw new Error('Chưa đăng nhập. Vui lòng tham gia nhóm trước.')
        const sb = createSupabase(token)
        if (payload.expenseId) {
          const { data, error } = await sb.rpc('update_expense_group_expense', {
            p_expense_id: expense.id,
            p_group_id: groupId,
            p_title: expense.title,
            p_amount: expense.amount,
            p_paid_by_member_id: expense.paidBy,
            p_category: expense.category,
            p_notes: expense.notes || null,
            p_expense_date: expense.date,
            p_participant_ids: expense.participants,
            p_receipt_images: expense.receiptImages,
          })
          if (error || data?.error) throw error || new Error(data.error)
          await dispatch({ type: 'REFRESH' })
        } else {
          const { data, error } = await sb.rpc('create_expense_group_expense', {
            p_group_id: groupId,
            p_title: expense.title,
            p_amount: expense.amount,
            p_paid_by_member_id: expense.paidBy,
            p_category: expense.category,
            p_notes: expense.notes || null,
            p_expense_date: expense.date,
            p_participant_ids: expense.participants,
            p_receipt_images: expense.receiptImages,
          })
          if (error || data?.error) throw error || new Error(data.error)
          await dispatch({ type: 'REFRESH' })
        }
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
      if (!isPickleballTreasurer) return
      const sessionId = payload?.sessionId
      if (!sessionId) return
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const waterAmount = parseMoneyAmount(payload?.waterAmount)
      const session = findSessionInPickleState(state, sessionId)
      const sourceTable = session?.sourceTable || session?.source_table
      if (sourceTable === 'pickle_sessions') {
        const groupId = session?.groupId || session?.group_id || activePickleballGroupId(state)
        const expenseDate = String(session?.sessionDate || session?.session_date || session?.date || new Date().toISOString().slice(0, 10)).slice(0, 10)
        await savePickleSessionWaterExpense(sb, state, session, sessionId, waterAmount)
        const { error: deleteExtrasError } = await sb
          .from('expenses')
          .delete()
          .eq('pickle_session_id', sessionId)
          .eq('category', 'pickleball_extra')
        if (deleteExtrasError) throw deleteExtrasError

        const allMemberIds = currentGroupMemberIds(state, groupId)
        const extras = (payload?.extras || [])
          .map(extra => {
            const memberIds = Array.isArray(extra?.memberIds) ? extra.memberIds : allMemberIds
            return {
              title: String(extra?.note || extra?.name || 'Phụ phát sinh').trim() || 'Phụ phát sinh',
              amount: parseMoneyAmount(extra?.amount),
              memberIds,
              category: 'pickleball_extra',
            }
          })
          .filter(extra => extra.amount > 0)
        for (const extra of extras) {
          const { data: insertedExtra, error: insertExtraError } = await sb
            .from('expenses')
            .insert({
              group_id: groupId,
              module: 'pickleball',
              pickle_session_id: sessionId,
              title: extra.title,
              amount: extra.amount,
              expense_date: expenseDate,
              category: 'pickleball_extra',
              paid_by_member_id: state.currentUserId,
              submitted_by_member_id: state.currentUserId,
              status: 'approved',
              reviewed_by_member_id: state.currentUserId,
              reviewed_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (insertExtraError) throw insertExtraError

          if (insertedExtra?.id && extra.memberIds.length > 0) {
            const per = Math.round(extra.amount / extra.memberIds.length)
            const { error: participantError } = await sb
              .from('expense_participants')
              .insert(extra.memberIds.map((memberId, index) => ({
                expense_id: insertedExtra.id,
                member_id: memberId,
                share_amount: index === extra.memberIds.length - 1
                  ? extra.amount - per * (extra.memberIds.length - 1)
                  : per,
              })))
            if (participantError) throw participantError
          }
        }
        await dispatch({ type: 'REFRESH' })
        return
      }
      const { error: waterError } = await sb
        .from('pickleball_session_items')
        .upsert({
          session_id: sessionId,
          name: 'Nước',
          amount: waterAmount,
          member_ids: [],
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
          member_ids: Array.isArray(extra?.memberIds) ? extra.memberIds : [],
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
      if (!isPickleballTreasurer) return
      const rows = (payload?.sessions || [])
        .filter(session => session?.sessionId || session?.id)
        .map(session => ({
          sessionId: session.sessionId || session.id,
          waterAmount: parseMoneyAmount(session.waterAmount ?? session.water),
        }))
        .filter(row => row.waterAmount >= 0)
      if (rows.length === 0) return
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const legacyRows = []
      for (const row of rows) {
        const session = findSessionInPickleState(state, row.sessionId)
        const sourceTable = session?.sourceTable || session?.source_table
        if (sourceTable === 'pickle_sessions') {
          await savePickleSessionWaterExpense(sb, state, session, row.sessionId, row.waterAmount)
        } else {
          await zeroWaterSessionItems(sb, waterSessionItemIds(session))
          const { error: deleteLegacyWaterError } = await sb
            .from('pickleball_session_items')
            .delete()
            .eq('session_id', row.sessionId)
            .eq('name', 'Nước')
          if (deleteLegacyWaterError) throw deleteLegacyWaterError
          if (row.waterAmount > 0) {
            legacyRows.push({
              session_id: row.sessionId,
              name: 'Nước',
              amount: row.waterAmount,
              member_ids: [],
              created_by: state.currentUserId || null,
            })
          }
        }
      }
      if (legacyRows.length > 0) {
        const { error } = await sb
          .from('pickleball_session_items')
          .insert(legacyRows)
        if (error) throw error
      }
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

    if (type === 'deleteExpense') {
      const expenseId = payload?.expenseId ?? payload?.id ?? payload
      const groupId = payload?.groupId || expenseGroupId(state, expenseId)
      if (!expenseId || !groupId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data, error } = await sb.rpc('delete_expense_group_expense', {
        p_expense_id: expenseId,
        p_group_id: groupId,
      })
      if (error || data?.error) throw error || new Error(data.error)
      await dispatch({ type: 'REFRESH' })
      if (payload?.returnToPrevious) {
        setStack((s) => s.slice(0, -1))
      }
      return
    }

    if (type === 'approveExpense') {
      const expenseId = payload?.expenseId ?? payload?.id ?? payload
      const groupId = payload?.groupId || expenseGroupId(state, expenseId)
      if (!expenseId || !groupId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data, error } = await sb.rpc('review_expense_group_expense', {
        p_expense_id: expenseId,
        p_group_id: groupId,
        p_status: 'approved',
      })
      if (error || data?.error) throw error || new Error(data.error)
      await dispatch({ type: 'REFRESH' })
      return
    }

    if (type === 'rejectExpense') {
      const expenseId = payload?.expenseId ?? payload?.id ?? payload
      const groupId = payload?.groupId || expenseGroupId(state, expenseId)
      if (!expenseId || !groupId) return
      const { token } = getStoredAuth()
      const sb = createSupabase(token)
      const { data, error } = await sb.rpc('review_expense_group_expense', {
        p_expense_id: expenseId,
        p_group_id: groupId,
        p_status: 'rejected',
      })
      if (error || data?.error) throw error || new Error(data.error)
      await dispatch({ type: 'REFRESH' })
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
      const manualSession = {
        authToken: result.token,
        memberId: result.member_id,
        groupId: result.group_id,
        memberName: result.member_name,
        hasPin: true,
      }
      const requiresPin = await checkMemberPinRequired(manualSession.memberId)
      const member = safeArray(state?.members).find(m => String(m.id) === String(manualSession.memberId))
      const pinKey = member?.profileId || member?.profile_id || manualSession.memberId
      if (requiresPin && sessionStorage.getItem(PIN_UNLOCK_KEY) !== pinKey) {
        setPendingPinSession(manualSession)
        setAwaitingPin(true)
        setPinError('')
        setPinInput('')
        return
      }
      setStack([])
      setActiveTab('home')
      await dispatch({
        type: 'LOGIN',
        token: manualSession.authToken,
        memberId: manualSession.memberId,
        groupId: manualSession.groupId,
        memberName: manualSession.memberName,
      })
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

    if (type === 'uploadPhoto') {
      const memberId = payload?.memberId || state.currentUserId
      const member = safeArray(state.members).find(item => String(item.id) === String(memberId)) || {}
      const profileId = payload?.profileId || payload?.profile_id || member.profileId || member.profile_id
      const photoUrl = String(payload?.photoUrl || '')
      if (memberId && photoUrl) {
        await dispatch({ type: 'UPDATE_PROFILE_PHOTO', memberId, profileId, photoUrl })
        localStorage.setItem(profilePhotoStorageKey(profileId || memberId), photoUrl)
        profilePhotoIdentityIds(memberId, profileId, state.members).forEach(identityId => {
          localStorage.setItem(profilePhotoStorageKey(identityId), photoUrl)
        })
        window.dispatchEvent(new Event(PROFILE_PHOTO_CHANGED_EVENT))
      }
      return
    }

    if (type === 'clearPhoto') {
      const memberId = payload?.memberId || state.currentUserId
      const member = safeArray(state.members).find(item => String(item.id) === String(memberId)) || {}
      const profileId = payload?.profileId || payload?.profile_id || member.profileId || member.profile_id
      if (memberId) {
        await dispatch({ type: 'UPDATE_PROFILE_PHOTO', memberId, profileId, photoUrl: null })
        localStorage.removeItem(profilePhotoStorageKey(profileId || memberId))
        profilePhotoIdentityIds(memberId, profileId, state.members).forEach(identityId => {
          localStorage.removeItem(profilePhotoStorageKey(identityId))
        })
        window.dispatchEvent(new Event(PROFILE_PHOTO_CHANGED_EVENT))
      }
      return
    }

    if (type === 'exportCsv') {
      exportStateCsv(state)
      return
    }

    if (type === 'saveBank') {
      await dispatch({ type: 'UPDATE_BANK_INFO', bankInfo: payload })
      if (stack[stack.length - 1]?.screen === 'settings') {
        setStack((s) => s.slice(0, -1))
      }
      return
    }

    if (type === 'addGuest') {
      if (!isPickleballTreasurer) return
      const sessionId = payload?.sessionId ?? payload?.session_id ?? (typeof payload === 'string' ? payload : null)
      const guestName = String(payload?.guestName ?? payload?.guest_name ?? '').trim()
      if (!sessionId || !guestName) return
      const groupId = activePickleballGroupId(state)
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

    if (type === 'removeGuest') {
      if (!isPickleballTreasurer) return
      const attendeeId = payload?.attendeeId
      const sessionId = payload?.sessionId
      if (!attendeeId || !sessionId) return
      const { token } = getStoredAuth()
      if (!token) return
      const sb = createSupabase(token)
      const { error } = await sb
        .from('pickle_attendees')
        .delete()
        .eq('id', attendeeId)
      if (error) throw error
      await dispatch({ type: 'REMOVE_SESSION_GUEST', attendeeId, sessionId })
      return
    }

    if (type === 'filter') {
      return
    }

    if ([
      'receive',
      'markAllRead',
      'addName',
      'editBank',
      'addBank',
      'changePin',
      'changeLanguage',
      'deleteAccount',
      'more',
      'menu',
      'help',
      'shareQR',
      'toggleBreakdown',
      'changeRecipient',
      'addAccessory',
      'reschedule',
      'remindAll',
      'confirmClose',
      'expandMembers',
      'complete',
      'saveAll',
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

    if (type === 'settleAll' || type === 'settle') {
      setActiveTab('home')
      setStack([])
      setHomePaymentOpen(true)
      return
    }

    if (type === 'closeHomePayment') {
      setHomePaymentOpen(false)
      return
    }

    if (type === 'markRefundPaid') {
      dispatch({ type: 'SHOW_TOAST', message: `Đã đánh dấu hoàn tiền cho ${payload?.name || 'thành viên'}.` })
      return
    }

    if (type === 'confirmPaymentSent') {
      const covered = Array.isArray(payload?.coveredMembers) ? payload.coveredMembers : []
      const coveredSources = Array.isArray(payload?.coveredSources) ? payload.coveredSources : []
      const names = [payload?.memberName, ...covered.map(row => row?.name)].filter(Boolean).join(', ')
      try {
        await dispatch({
          type: 'SEND_PAYMENT_NOTIFICATION',
          targetMemberId: payload?.paymentTarget?.memberId || paymentNotificationTargetMemberId(state),
          amount: payload?.amount,
          memberName: payload?.memberName,
          coveredMembers: covered,
          coveredSources,
          transferDescription: payload?.transferDescription,
          paymentTarget: payload?.paymentTarget,
          monthLabel: homeData?.monthLabel,
        })
        await dispatch({ type: 'REFRESH' })
        dispatch({ type: 'SHOW_TOAST', message: `Đã gửi báo thanh toán cho thủ quỹ: ${names || 'thành viên'}.` })
      } catch (error) {
        console.error('[app] confirmPaymentSent:', error)
        dispatch({ type: 'SHOW_TOAST', message: 'Chưa gửi được báo thanh toán. Thử lại hoặc báo Long kiểm tra kết nối.' })
        throw error
      }
      return
    }

    if (type === 'confirmPaymentNotice' || type === 'rejectPaymentNotice') {
      await dispatch({
        type: 'REVIEW_PAYMENT_NOTIFICATION',
        notificationId: payload?.id,
        status: type === 'confirmPaymentNotice' ? 'confirmed' : 'rejected',
      })
      dispatch({ type: 'SHOW_TOAST', message: type === 'confirmPaymentNotice' ? 'Đã xác nhận nhận được thanh toán.' : 'Đã đánh dấu chưa nhận được thanh toán.' })
      return
    }

    if (type === 'deletePaymentNotice') {
      await dispatch({
        type: 'DELETE_PAYMENT_NOTIFICATION',
        notificationId: payload?.notificationId || payload?.id,
      })
      dispatch({ type: 'SHOW_TOAST', message: 'Đã xóa báo thanh toán. Số dư sẽ được tính lại.' })
      return
    }

    if (type === 'viewPaymentNotice') {
      return
    }

    if (type === 'markAllRead') {
      await dispatch({ type: 'MARK_NOTIFICATIONS_READ' })
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

  if (publicBillToken) {
    return (
      <div style={{ minHeight: '100dvh', width: '100%', background: '#07080f' }}>
        <MemberBillShare data={publicBillData} loading={publicBillLoading} onOpenApp={() => openMemberBillInApp(publicBillToken)} />
      </div>
    )
  }

  if (accessLinkLoading) {
    return (
      <div style={{ minHeight: '100dvh', width: '100%', background: '#07080f', color: colors.textPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: type.family }}>
        Đang mở link đăng nhập...
      </div>
    )
  }

  const pinProps = awaitingPin ? {
    pinSession: pendingPinSession,
    pinValue: pinInput,
    pinError,
    onPinChange: updatePinInput,
    onPinSubmit: submitPin,
    onPinCancel: () => { setAwaitingPin(false); setPendingPinSession(null); setPinError(''); setPinInput('') },
  } : {}

  if (!state.currentUserId) {
    return (
      <div style={{ minHeight: '100dvh', width: '100%', background: '#07080f' }}>
        <JoinGroup data={{ ...getJoinGroupData(), recentSessions: getRecentSessions(), pinnedSession: getPinnedSession(), inviteToken: groupInviteToken, joinCode: groupJoinCode, accessLinkError }} onAction={handle} {...pinProps} />
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
        minHeight: '100dvh',
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
        return <PickleballOverview data={pickleballOverviewData} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'profile':
        return <Profile data={profileData} isTreasurer={isTreasurer} onAction={handle} />
      case 'home':
      default:
        return <Home data={homeData} isTreasurer={isTreasurer} paymentOpen={homePaymentOpen} onPaymentClose={() => handle('closeHomePayment')} onAction={handle} />
    }
  }

  function renderStackScreen(route) {
    switch (route.screen) {
      case 'group-detail': {
        const detailData = route.params?.groupId ? getGroupDetailData(route.params.groupId) : groupDetailData
        return <GroupDetail data={detailData} isTreasurer={detailData?.isTreasurer ?? isTreasurer} onAction={handle} />
      }
      case 'add-expense':         return <AddExpense data={getAddExpenseData(route.params)} onAction={handle} />
      case 'pickleball-calendar': return <PickleballCalendar data={getPickleballCalendarData(route.params)} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'pickleball-members':  return <PickleballMembers data={getPickleballMembersData()} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'member-detail':       return <MemberDetail data={getMemberDetailData(route.params?.memberId ?? route.params)} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'pickleball-tickets':  return <PickleballTickets data={getPickleballTicketsData()} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'pickleball-settings': return <PickleballSettings data={getPickleballSettingsData()} onAction={handle} />
      case 'pickleball-team-fund': return <PickleballTeamFund data={getPickleballTeamFundData(route.params)} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'batch-entry':         return <BatchEntry data={getBatchEntryData()} onAction={handle} />
      case 'payment-flow':        return <PaymentFlow data={getPaymentFlowData(route.params)} onAction={handle} />
      case 'join-group':          return <JoinGroup data={{ ...getJoinGroupData(), recentSessions: getRecentSessions(), pinnedSession: getPinnedSession(), inviteToken: groupInviteToken, joinCode: groupJoinCode }} onAction={handle} {...pinProps} />
      case 'expense-detail':      return <ExpenseDetail data={getExpenseDetailData(route.params?.expenseId ?? route.params)} onAction={handle} />
      case 'session-detail':      return <SessionDetail data={getSessionDetailData(route.params?.sessionId ?? route.params)} isTreasurer={isPickleballTreasurer} onAction={handle} />
      case 'new-group':           return <NewGroup data={newGroupData} onAction={handle} />
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
    <div style={{ minHeight: '100dvh', width: '100%', background: '#07080f' }}>
      {renderCurrent()}
      <ToastOverlay toast={state.toast} />
    </div>
  )
}

function sessionGenerationConfigFromState(state, yearMonth) {
  const groupId = activePickleballGroupId(state)
  const group = activePickleballGroup(state) || {}
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

function isFutureScheduleInherited(futureConfig, previousConfig) {
  if (!futureConfig || Object.keys(futureConfig).length === 0) return true
  const futureWeekdays = futureConfig.scheduleWeekdays ?? futureConfig.schedule_weekdays
  const previousWeekdays = previousConfig.scheduleWeekdays ?? previousConfig.schedule_weekdays
  const futureTime = futureConfig.scheduleTime ?? futureConfig.schedule_time
  const previousTime = previousConfig.scheduleTime ?? previousConfig.schedule_time
  const futureStartDay = futureConfig.scheduleStartDay ?? futureConfig.schedule_start_day
  const previousStartDay = previousConfig.scheduleStartDay ?? previousConfig.schedule_start_day
  const hasOwnWeekdays = normalizeScheduleWeekdays(futureWeekdays).length > 0 && !sameScheduleWeekdays(futureWeekdays, previousWeekdays)
  const hasOwnTime = normalizeScheduleTimeForCompare(futureTime) && normalizeScheduleTimeForCompare(futureTime) !== normalizeScheduleTimeForCompare(previousTime)
  const hasOwnStartDay = normalizeScheduleStartDayForCompare(futureStartDay) && normalizeScheduleStartDayForCompare(futureStartDay) !== normalizeScheduleStartDayForCompare(previousStartDay)
  return !hasOwnWeekdays && !hasOwnTime && !hasOwnStartDay
}

function normalizeScheduleTimeForCompare(value) {
  const parts = String(value || '').match(/\d{1,2}:\d{2}/g) || []
  return parts
    .slice(0, 2)
    .map(part => {
      const [hour, minute] = part.split(':').map(Number)
      return `${String(Math.max(0, Math.min(hour || 0, 23))).padStart(2, '0')}:${String(Math.max(0, Math.min(minute || 0, 59))).padStart(2, '0')}`
    })
    .join('-')
}

function normalizeScheduleStartDayForCompare(value) {
  const text = String(value || '').trim()
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return String(Number(iso[3]) || 1).padStart(2, '0')
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{4})?$/)
  if (slash) return String(Number(slash[1]) || 1).padStart(2, '0')
  return ''
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

function shiftYearMonth(yearMonth, delta) {
  const [year, month] = String(yearMonth || monthKey(new Date())).split('-').map(Number)
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1 + delta, 1)
  return monthKey(date)
}

function findSessionInPickleState(state, sessionId) {
  const target = String(sessionId || '')
  if (!target) return null
  return [
    ...safeArray(state?.pickle?.sessions),
    ...safeArray(state?.pickle?.upcoming),
    ...safeArray(state?._allPickle?.sessions),
    ...safeArray(state?.sessions),
  ].find(session => String(session?.id || '') === target) || null
}

function currentGroupMemberIds(state, groupId) {
  return safeArray(state?.members)
    .filter(member => member?.isActive !== false && member?.is_active !== false)
    .filter(member => !groupId || String(member?.groupId || member?.group_id || '') === String(groupId))
    .map(member => member.id)
    .filter(Boolean)
}

async function savePickleSessionWaterExpense(sb, state, session, sessionId, waterAmount) {
  const expenseDate = String(session?.sessionDate || session?.session_date || session?.date || new Date().toISOString().slice(0, 10)).slice(0, 10)
  await zeroWaterSessionItems(sb, waterSessionItemIds(session))
  await deletePickleSessionWaterExpenses(sb, sessionId)
  const { error: deleteLegacyWaterItemError } = await sb
    .from('pickleball_session_items')
    .delete()
    .eq('session_id', sessionId)
    .eq('name', 'Nước')
  if (deleteLegacyWaterItemError) throw deleteLegacyWaterItemError

  if (waterAmount <= 0) {
    return
  }

  const { error: insertWaterError } = await sb
    .from('expenses')
    .insert({
      group_id: session?.groupId || session?.group_id || activePickleballGroupId(state),
      module: 'pickleball',
      pickle_session_id: sessionId,
      title: 'Tiền nước',
      amount: waterAmount,
      expense_date: expenseDate,
      category: 'water',
      paid_by_member_id: state.currentUserId,
      submitted_by_member_id: state.currentUserId,
      status: 'approved',
      reviewed_by_member_id: state.currentUserId,
      reviewed_at: new Date().toISOString(),
    })
  if (insertWaterError) throw insertWaterError
}

async function deletePickleSessionWaterExpenses(sb, sessionId) {
  const { error } = await sb
    .from('expenses')
    .delete()
    .eq('pickle_session_id', sessionId)
    .eq('category', 'water')
  if (error) throw error
}

function waterSessionItemIds(session) {
  return safeArray(session?.sessionItems || session?.session_items)
    .filter(item => /nước|nuoc|water/i.test(`${item?.name || item?.title || item?.category || item?.cat || ''}`))
    .map(item => item.id)
    .filter(Boolean)
}

async function zeroWaterSessionItems(sb, ids) {
  const itemIds = safeArray(ids)
  if (itemIds.length === 0) return
  const { error } = await sb
    .from('pickleball_session_items')
    .update({ amount: 0 })
    .in('id', itemIds)
  if (error) throw error
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
  const groupId = activePickleballGroupId(state)
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

function activePickleballActorMemberId(state, groupId = activePickleballGroupId(state)) {
  const members = safeArray(state?.members)
  const currentMember = members.find(member => String(member?.id || member?.member_id || '') === String(state?.currentUserId || ''))
  const currentIdentity = memberIdentityKey(currentMember) || normalizeMemberName(state?.currentUserName)
  const actor = members.find(member => (
    String(member?.groupId || member?.group_id || '') === String(groupId || '') &&
    member?.isActive !== false &&
    member?.is_active !== false &&
    (
      String(member?.id || member?.member_id || '') === String(state?.currentUserId || '') ||
      (currentIdentity && memberIdentityKey(member) === currentIdentity)
    )
  ))
  return actor?.id || actor?.member_id || state?.currentUserId
}

function expenseGroupId(state, expenseId) {
  const expense = safeArray(state?.expenses)
    .concat(safeArray(state?.groups).flatMap(group => safeArray(group?.expenses)))
    .find(item => String(item?.id || '') === String(expenseId || ''))
  return expense?.groupId || expense?.group_id || ''
}

function activePickleballGroupId(state) {
  return state?.pickleballGroupId || state?.pickleballGroup?.id || state?.currentGroupId || state?.currentGroup?.id || null
}

function activePickleballGroup(state) {
  const groupId = activePickleballGroupId(state)
  return safeArray(state?.groups).find(group => String(group.id) === String(groupId)) || state?.pickleballGroup || state?.currentGroup || null
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
