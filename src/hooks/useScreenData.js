import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import {
  fmtVNDFull,
  groupBalance,
  groupNet,
  pickleSummary,
} from '../data.jsx'
import { getRecentInvites } from '../lib/auth.js'

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const FALLBACK_AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #f87171, #dc2626)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #14b8a6, #0f766e)',
  'linear-gradient(135deg, #38bdf8, #2563eb)',
  'linear-gradient(135deg, #fb7185, #be123c)',
  'linear-gradient(135deg, #facc15, #ca8a04)',
  'linear-gradient(135deg, #c084fc, #9333ea)',
  'linear-gradient(135deg, #2dd4bf, #0891b2)',
]
const GROUP_TYPE_LABELS = [
  { key: 'food', label: 'Ăn uống', emojis: ['🍜', '🥘', '🍺'] },
  { key: 'travel', label: 'Du lịch', emojis: ['✈️', '🚗', '🏖', '🏖️', '🏨'] },
  { key: 'expense', label: 'Chi tiêu', emojis: ['💰', '🧾'] },
  { key: 'sport', label: 'Thể thao', emojis: ['🏓', '🏸'] },
  { key: 'home', label: 'Gia đình', emojis: ['🏠'] },
  { key: 'party', label: 'Tiệc', emojis: ['🎂', '🎲'] },
  { key: 'work', label: 'Công việc', emojis: ['💼'] },
  { key: 'other', label: 'Khác', emojis: ['🎯', '👥'] },
]
const PROFILE_PHOTO_CHANGED_EVENT = 'spliteasy-profile-photo-changed'

function profilePhotoStorageKey(identityId) {
  return `spliteasy_profile_photo_${identityId || 'me'}`
}

function loadStoredProfilePhoto(identityId) {
  if (!identityId || typeof localStorage === 'undefined') return ''
  return localStorage.getItem(profilePhotoStorageKey(identityId)) || ''
}

function memberPhotoUrl(member, allMembers = []) {
  const supabasePhotoUrl = member?.avatarUrl || member?.avatar_url || member?.photoUrl || member?.photo_url
  if (supabasePhotoUrl) return supabasePhotoUrl
  const profileId = member?.profileId || member?.profile_id
  const identityIds = [
    profileId,
    member?.id,
    ...safeArray(allMembers)
      .filter(item => profileId && String(item?.profileId || item?.profile_id || '') === String(profileId))
      .map(item => item?.id),
  ].filter(Boolean)
  for (const identityId of Array.from(new Set(identityIds.map(String)))) {
    const photoUrl = loadStoredProfilePhoto(identityId)
    if (photoUrl) return photoUrl
  }
  return ''
}

export function useScreenData() {
  const { state, dispatch } = useApp()
  const autoGenerateRef = useRef('')
  const staleCleanupRef = useRef('')
  const [photoVersion, setPhotoVersion] = useState(0)
  const {
    currentUserId,
    currentUserName,
    currentGroup,
    members = [],
    groups = [],
    pickle = {},
    _allPickle,
  } = state
  const selectedYearMonth = state?.selectedYearMonth || monthKey(new Date())

  const me = members.find(m => m.id === currentUserId)
  const isTreasurer = isManagerRole(me?.role)
  const pickleballGroup = state?.pickleballGroup || safeArray(groups).find(group => String(group.id) === String(state?.pickleballGroupId || ''))
  const pickleballMe = membersForGroup(pickleballGroup, members).find(member => (
    String(member.id) === String(currentUserId) ||
    sameName(member.name, currentUserName || me?.name)
  ))
  const isPickleballTreasurer = isManagerRole(pickleballMe?.role)

  const screenData = useMemo(() => {
    const pickleballState = scopedPickleballState(state)
    const homeData = buildHomeData(state, currentUserId, members, groups, pickle, pickleballState, selectedYearMonth)
    const allExpensesData = buildAllExpensesData(state, currentUserId, members, currentUserName)
    const groupsListData = buildGroupsListData(groups, currentUserId, members, currentUserName, selectedYearMonth)
    const groupDetailData = buildGroupDetailData(currentGroup, currentUserId, members, currentUserName, selectedYearMonth, state?.profiles, state)
    const pickleballOverviewData = buildPickleballOverviewData(pickleballState, pickle, _allPickle, currentUserId, members, selectedYearMonth)
    const pickleballCalendarData = buildPickleballCalendarData(pickleballState, { yearMonth: selectedYearMonth })
    const profileData = buildProfileData(me, state, pickle)
    const notificationsData = buildNotificationsData(state)
    const approvalQueueData = buildApprovalQueueData(state)
    const accountSettingsData = buildAccountSettingsData(state)

    return {
      isTreasurer,
      isPickleballTreasurer,
      homeData,
      allExpensesData,
      groupsListData,
      groupDetailData,
      pickleballOverviewData,
      pickleballCalendarData,
      profileData,
      notificationsData,
      approvalQueueData,
      accountSettingsData,
      newGroupData: buildNewGroupData(state),
      getGroupDetailData: (groupId) => {
        const group = safeArray(groups).find(g => g.id === groupId) || currentGroup
        return buildGroupDetailData(group, currentUserId, members, currentUserName, selectedYearMonth, state?.profiles, state)
      },
      getSessionDetailData: (sessionId) => buildSessionDetailData(pickleballState, pickle, sessionId, currentUserId, members),
      getPickleballCalendarData: (params) => buildPickleballCalendarData(pickleballState, { yearMonth: selectedYearMonth, ...params }),
      getPickleballMembersData: () => buildPickleballMembersData(pickleballState, selectedYearMonth),
      getPickleballSettingsData: () => buildPickleballSettingsData(pickleballState, selectedYearMonth),
      getMemberDetailData: (memberId) => buildMemberDetailData(pickleballState, memberId, selectedYearMonth),
      getPickleballTicketsData: () => buildPickleballTicketsData(pickleballState),
      getPickleballTeamFundData: (params) => buildPickleballTeamFundData(pickleballState, params?.yearMonth || selectedYearMonth),
      getBatchEntryData: (params) => buildBatchEntryData(pickleballState, params),
      getPaymentFlowData: (memberId) => buildPaymentFlowData(pickleballState, memberId),
      getJoinGroupData: () => buildJoinGroupData(state),
      getAddExpenseData: (params) => buildAddExpenseData(state, params),
      getSettleAllData: () => buildSettleAllData(state),
      getSettlementPeriodData: (params) => buildSettlementPeriodData(state, params),
      getExpenseDetailData: (params) => buildExpenseDetailData(state, params),
      dispatch,
    }
  }, [state, currentUserId, currentUserName, currentGroup, members, groups, pickle, _allPickle, selectedYearMonth, photoVersion, me, isTreasurer, isPickleballTreasurer, dispatch])

  useEffect(() => {
    function refreshProfilePhotos() {
      setPhotoVersion(version => version + 1)
    }
    window.addEventListener(PROFILE_PHOTO_CHANGED_EVENT, refreshProfilePhotos)
    return () => window.removeEventListener(PROFILE_PHOTO_CHANGED_EVENT, refreshProfilePhotos)
  }, [])

  useEffect(() => {
    const request = screenData.pickleballCalendarData?.autoGenerateRequest || screenData.pickleballOverviewData?.autoGenerateRequest
    if (!request) {
      autoGenerateRef.current = ''
      return
    }
    const groupId = state.pickleballGroupId || state.pickleballGroup?.id
    const key = screenData.pickleballCalendarData?.autoGenerateKey || screenData.pickleballOverviewData?.autoGenerateKey || `${groupId}:${request.yearMonth}`
    if (autoGenerateRef.current === key) return
    autoGenerateRef.current = key
    dispatch({
      type: 'AUTO_GENERATE_SESSIONS',
      groupId,
      yearMonth: request.yearMonth,
      config: request.config,
    }).catch(err => {
      console.error('[useScreenData] AUTO_GENERATE_SESSIONS:', err)
    })
  }, [
    dispatch,
    screenData.pickleballCalendarData?.autoGenerateKey,
    screenData.pickleballCalendarData?.autoGenerateRequest,
    screenData.pickleballOverviewData?.autoGenerateKey,
    screenData.pickleballOverviewData?.autoGenerateRequest,
    state.pickleballGroupId,
    state.pickleballGroup?.id,
  ])

  useEffect(() => {
    const request = screenData.pickleballCalendarData?.staleReplacementCleanup
    if (!request?.ids?.length) {
      staleCleanupRef.current = ''
      return
    }
    const key = request.ids.join(',')
    if (staleCleanupRef.current === key) return
    staleCleanupRef.current = key
    dispatch({
      type: 'CLEANUP_STALE_REPLACEMENT_SESSIONS',
      ids: request.ids,
    }).catch(err => {
      console.error('[useScreenData] CLEANUP_STALE_REPLACEMENT_SESSIONS:', err)
    })
  }, [
    dispatch,
    screenData.pickleballCalendarData?.staleReplacementCleanup,
  ])

  return screenData
}

export function buildPrevMonthUnpaid(state, currentUserId, members, safeGroups, pickle, pickleballState, pickleballMemberId, selectedYearMonth) {
  if (selectedYearMonth !== monthKey(new Date())) return null
  const prevYearMonthEarly = shiftMonthKey(selectedYearMonth, -1)
  const settlements = safeArray(state?.monthSettlements)
  const settledMember = safeArray(members).find(member => String(member.id) === String(currentUserId))
  if (settledMember && settlements.some(s =>
    String(s.member_id) === String(currentUserId) &&
    String(s.month) === String(prevYearMonthEarly) &&
    String(s.group_id) === String(settledMember.group_id || settledMember.groupId || '')
  )) return null
  const prevYearMonth = shiftMonthKey(selectedYearMonth, -1)
  const prevDate = dateFromYearMonth(prevYearMonth)
  const prevExpenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, prevDate))
  const prevSessions = getStateMonthSessions(pickleballState, prevDate)
  const prevSourceBalances = buildHomeSourceBalances(state, prevExpenseGroups, pickleballState, pickle, prevSessions, members, prevDate)
  const me = safeArray(members).find(member => String(member.id) === String(currentUserId))
  const prevSourceBreakdown = currentProfileSourceBreakdown(prevSourceBalances, currentUserId, members)
  const prevPaymentSummary = buildHomePaymentSummary(state, prevSourceBreakdown, null, members, me, prevDate)
  const prevTotal = prevPaymentSummary.netBalance
  if (prevTotal >= 0) return null
  return {
    yearMonth: prevYearMonth,
    label: formatMonthLabel(prevDate),
    balance: prevTotal,
  }
}

function settlementCheckpointGroupId(state) {
  return state?.currentGroupId || state?.currentGroup?.id || ''
}

function normalizeSettlementCheckpoint(row, members = []) {
  const memberId = row?.memberId || row?.member_id || ''
  return {
    id: row?.id,
    groupId: row?.groupId || row?.group_id || '',
    group_id: row?.group_id || row?.groupId || '',
    memberId,
    member_id: memberId,
    periodStart: row?.periodStart || row?.period_start || null,
    period_start: row?.period_start || row?.periodStart || null,
    periodEnd: row?.periodEnd || row?.period_end || null,
    period_end: row?.period_end || row?.periodEnd || null,
    amount: Number(row?.amount) || 0,
    status: row?.status || 'pending',
    confirmedAt: row?.confirmedAt || row?.confirmed_at || null,
    confirmed_at: row?.confirmed_at || row?.confirmedAt || null,
    createdAt: row?.createdAt || row?.created_at || null,
    created_at: row?.created_at || row?.createdAt || null,
    memberName: memberName(memberId, members),
  }
}

function latestConfirmedSettlementCheckpoint(state, groupId, memberId) {
  const checkpoint = safeArray(state?.settlementCheckpoints)
    .map(row => normalizeSettlementCheckpoint(row, state?.members))
    .filter(row => String(row.groupId || '') === String(groupId || ''))
    .filter(row => String(row.memberId || '') === String(memberId || ''))
    .filter(row => String(row.status || '').toLowerCase() === 'confirmed')
    .sort((a, b) => parseDateValue(b.confirmedAt || b.periodEnd) - parseDateValue(a.confirmedAt || a.periodEnd))[0] || null
  const notice = safeArray(state?.notifications)
    .filter(row => String(row?.type || '') === 'payment_submitted')
    .filter(row => String(row?.groupId || row?.group_id || '') === String(groupId || ''))
    .filter(row => String(row?.actorMemberId || row?.actor_member_id || '') === String(memberId || ''))
    .filter(row => String((row?.metadata || {}).status || '').toLowerCase() === 'confirmed')
    .sort((a, b) => parseDateValue(b.createdAt || b.created_at) - parseDateValue(a.createdAt || a.created_at))[0] || null
  const noticeDate = notice?.createdAt || notice?.created_at || null
  if (!noticeDate) return checkpoint
  if (parseDateValue(checkpoint?.confirmedAt || checkpoint?.periodEnd) >= parseDateValue(noticeDate)) return checkpoint
  return {
    groupId,
    group_id: groupId,
    memberId,
    member_id: memberId,
    periodEnd: noticeDate,
    period_end: noticeDate,
    confirmedAt: noticeDate,
    confirmed_at: noticeDate,
    status: 'confirmed',
  }
}

function pendingSettlementCheckpointsForProfile(state, memberId, members = [], groups = []) {
  const profileId = profileIdForMember(memberId, members)
  const memberIds = new Set(memberIdsForProfile(profileId, members).map(String))
  return safeArray(state?.settlementCheckpoints)
    .map(row => normalizeSettlementCheckpoint(row, members))
    .filter(row => memberIds.has(String(row.memberId || '')))
    .filter(row => String(row.status || '').toLowerCase() === 'pending')
    .map(row => ({
      ...row,
      groupName: safeArray(groups).find(group => String(group.id) === String(row.groupId))?.name || row.groupId || 'Nhóm',
    }))
    .sort((a, b) => parseDateValue(a.createdAt) - parseDateValue(b.createdAt))
}

function pendingSettlementCheckpointsForTreasurer(state, members = []) {
  const groupId = settlementCheckpointGroupId(state)
  return safeArray(state?.settlementCheckpoints)
    .map(row => normalizeSettlementCheckpoint(row, members))
    .filter(row => String(row.groupId || '') === String(groupId || ''))
    .filter(row => String(row.status || '').toLowerCase() === 'pending')
    .sort((a, b) => parseDateValue(a.createdAt) - parseDateValue(b.createdAt))
}

function groupWithExpensesAfter(group, startDate, endDate = null) {
  const startMs = parseDateValue(startDate)
  const endMs = parseDateValue(endDate)
  return safeGroup({
    ...group,
    expenses: safeArray(group?.expenses).filter(expense => {
      const time = parseDateValue(expense.date || expense.expense_date)
      if (!time) return false
      return (!startMs || time > startMs) && (!endMs || time <= endMs)
    }),
  })
}

function groupWithExpensesUpTo(group, endDate) {
  const endMs = parseDateValue(endDate)
  return safeGroup({
    ...group,
    expenses: safeArray(group?.expenses).filter(expense => {
      const time = parseDateValue(expense.date || expense.expense_date)
      return time && (!endMs || time <= endMs)
    }),
  })
}

function settlementRelevantMonthDates(state, startDate, endDate = null) {
  const months = new Set()
  const startMs = parseDateValue(startDate)
  const endMs = parseDateValue(endDate)
  const add = value => {
    const time = parseDateValue(value)
    if (time && (!startMs || time > startMs) && (!endMs || time <= endMs)) months.add(monthKey(value))
  }
  getAllSessions(state).forEach(session => add(sessionDate(session)))
  uniqueTickets([
    ...safeArray(state?.pickle?.externalTickets),
    ...safeArray(state?._allPickle?.externalTickets),
    ...safeArray(state?.tickets),
  ]).forEach(ticket => add(ticketDate(ticket)))
  add(new Date())
  return [...months].filter(Boolean).sort().map(dateFromYearMonth)
}

function pickleStateAfter(state, startDate, endDate = null) {
  const startMs = parseDateValue(startDate)
  const endMs = parseDateValue(endDate)
  if (!startMs && !endMs) return state
  const inRange = value => {
    const time = parseDateValue(value)
    return time && (!startMs || time > startMs) && (!endMs || time <= endMs)
  }
  const filterTickets = tickets => safeArray(tickets).filter(ticket => inRange(ticketDate(ticket)))
  const filterSessions = sessions => safeArray(sessions).filter(session => inRange(sessionDate(session)))
  return {
    ...state,
    sessions: filterSessions(state?.sessions),
    pickle: {
      ...(state?.pickle || {}),
      sessions: filterSessions(state?.pickle?.sessions),
      upcoming: filterSessions(state?.pickle?.upcoming),
      externalTickets: filterTickets(state?.pickle?.externalTickets),
    },
    _allPickle: {
      ...(state?._allPickle || {}),
      sessions: filterSessions(state?._allPickle?.sessions),
      externalTickets: filterTickets(state?._allPickle?.externalTickets),
    },
    tickets: filterTickets(state?.tickets),
  }
}

function sourceMonthLabel(month) {
  const date = dateFromYearMonth(month)
  return `Tháng ${date.getMonth() + 1}`
}

function sourceMonthBreakdown(rows) {
  const byMonth = new Map()
  safeArray(rows).forEach(row => {
    const month = row.month || monthKey(row.date || row.expense_date)
    if (!month) return
    byMonth.set(month, (byMonth.get(month) || 0) + (Number(row.amount) || 0))
  })
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, label: sourceMonthLabel(month), amount }))
    .filter(row => row.amount !== 0)
}

function buildSettlementSourceBalances(state, expenseGroups, pickleballState, pickle, members, endDate = null) {
  const expenseRows = safeArray(expenseGroups).flatMap(group => (
    membersForGroup(group, members).map(member => {
      const checkpoint = latestConfirmedSettlementCheckpoint(state, group.id, member.id)
      const checkpointGroup = groupWithExpensesAfter(group, checkpoint?.periodEnd || null, endDate)
      const monthBreakdown = sourceMonthBreakdown(safeArray(checkpointGroup.expenses).map(expense => ({
        month: monthKey(expense.date || expense.expense_date),
        amount: groupNet({ ...checkpointGroup, expenses: [expense] }, member.id),
      })))
      return {
        sourceId: group.id,
        sourceType: 'group',
        sourceLabel: group.name || 'Nhóm',
        memberId: member.id,
        amount: groupNet(checkpointGroup, member.id),
        monthBreakdown,
      }
    })
  ))
  const pickleGroupId = pickleballState?.currentGroupId || pickleballState?.currentGroup?.id
  const pickleRows = currentGroupMembers(pickleballState)
    .filter(isActiveMember)
    .flatMap(member => {
      const checkpoint = latestConfirmedSettlementCheckpoint(pickleballState, pickleGroupId, member.id)
      const startDate = checkpoint?.periodEnd || null
      const pickleState = pickleStateAfter(pickleballState, startDate, endDate)
      return settlementRelevantMonthDates(pickleState, startDate, endDate).map(monthDate => {
        const monthSessions = getStateMonthSessions(pickleState, monthDate)
        return {
        sourceId: pickleState?.currentGroupId || pickleState?.currentGroup?.id,
        sourceType: 'pickleball',
        sourceLabel: pickleState?.currentGroup?.name || 'Pickleball',
        memberId: member.id,
        amount: buildMemberMonthBalance(pickleState, pickle, monthSessions, member.id, monthDate).netBalance || 0,
        month: monthKey(monthDate),
        }
      })
    })
  return [...expenseRows, ...pickleRows].filter(row => row.memberId && row.amount !== 0)
}

function settlementCarryForwardNotice(checkpoint, selectedYearMonth, balance) {
  if (!checkpoint?.periodEnd || Number(balance) >= 0) return null
  if (monthKey(checkpoint.periodEnd) >= selectedYearMonth) return null
  const date = parseDate(checkpoint.periodEnd)
  if (!date) return null
  return {
    yearMonth: monthKey(checkpoint.periodEnd),
    label: `Còn nợ từ ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
    balance,
  }
}

function endOfYearMonth(yearMonth) {
  const date = dateFromYearMonth(yearMonth)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function buildHomeData(state, currentUserId, members, groups, pickle, pickleballState = state, selectedYearMonth = monthKey(new Date())) {
  const today = dateFromYearMonth(selectedYearMonth)
  const endOfSelectedMonth = endOfYearMonth(selectedYearMonth)
  const safeGroups = safeArray(groups).map(safeGroup)
  const expenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, today))
  const settlementExpenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(safeGroup)
  const monthSessions = getStateMonthSessions(pickleballState, today)
  const summary = pickleSummary(pickle || {})
  const session = findNearestOpenSession(pickle, today)
  const pickleballMemberId = memberIdForGroup(pickleballState?.currentGroup, currentUserId, members, state?.currentUserName)
  const settlementSourceBalances = buildSettlementSourceBalances(state, settlementExpenseGroups, pickleballState, pickle, members)
  const pickleballBalance = settlementSourceBalances
    .filter(source => source.sourceType === 'pickleball' && String(source.memberId) === String(pickleballMemberId))
    .reduce((sum, source) => sum + (Number(source.amount) || 0), 0)
  const sourceBalances = settlementSourceBalances
  const me = safeArray(members).find(member => String(member.id) === String(currentUserId))
  const rawSourceBreakdown = currentProfileSourceBreakdown(sourceBalances, currentUserId, members)
  const rawProfileBreakdown = aggregateBalancesByProfile(sourceBalances, members)
  const profileBreakdown = adjustedProfileBreakdownForPayments(state, rawProfileBreakdown, members, today)
  const treasurerExpenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithExpensesUpTo(group, endOfSelectedMonth))
  const treasurerSourceBalances = buildSettlementSourceBalances(state, treasurerExpenseGroups, pickleballState, pickle, members, endOfSelectedMonth)
  const cappedSourceBreakdown = currentProfileSourceBreakdown(treasurerSourceBalances, currentUserId, members)
  const treasurerProfileBreakdown = adjustedProfileBreakdownForPayments(
    state,
    aggregateBalancesByProfile(treasurerSourceBalances, members),
    members,
    today,
  )
  const currentProfileId = me?.profileId || me?.profile_id || profileIdForMember(currentUserId, members)
  const cappedTotalBalance = Number(safeArray(treasurerProfileBreakdown).find(row => (
    String(row.profileId || row.profile_id || '') === String(currentProfileId || '')
  ))?.amount) || 0
  const prevYearMonth = shiftMonthKey(selectedYearMonth, -1)
  const prevDate = dateFromYearMonth(prevYearMonth)
  const prevExpenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, prevDate))
  const prevSessions = getStateMonthSessions(pickleballState, prevDate)
  const prevSourceBalances = buildHomeSourceBalances(state, prevExpenseGroups, pickleballState, pickle, prevSessions, members, prevDate)
  const prevProfileBreakdown = adjustedProfileBreakdownForPayments(
    state,
    aggregateBalancesByProfile(prevSourceBalances, members),
    members,
    prevDate,
  )
  const prevMonthResidualByMember = {}
  safeArray(prevProfileBreakdown).forEach(row => {
    if (Number(row.amount) < 0) {
      safeArray(row.memberIds || memberIdsForProfile(row.profileId, members)).forEach(memberId => {
        prevMonthResidualByMember[String(memberId)] = Math.abs(Number(row.amount))
      })
    }
  })
  const currentMonthResidualByMember = {}
  safeArray(profileBreakdown).forEach(row => {
    if (Number(row.amount) < 0 && Number(row.paidAmount) > 0) {
      safeArray(row.memberIds || memberIdsForProfile(row.profileId, members)).forEach(memberId => {
        currentMonthResidualByMember[String(memberId)] = Math.abs(Number(row.amount))
      })
    }
  })
  const stateWithPrevMonthResidual = { ...state, prevMonthResidualByMember }
  const paymentSummary = buildHomePaymentSummary(stateWithPrevMonthResidual, rawSourceBreakdown, profileBreakdown, members, me, today, treasurerProfileBreakdown)
  const sourceBreakdown = paymentSummary.sourceBreakdown
  const totalBalance = paymentSummary.netBalance
  const confirmedCheckpoint = sourceBreakdown
    .filter(source => Number(source.amount) < 0)
    .map(source => latestConfirmedSettlementCheckpoint(
      source.sourceType === 'pickleball' ? pickleballState : state,
      source.sourceId,
      source.memberId,
    ))
    .filter(Boolean)
    .sort((a, b) => parseDateValue(a.periodEnd) - parseDateValue(b.periodEnd))[0] || null
  const checkpointNotice = settlementCarryForwardNotice(confirmedCheckpoint, selectedYearMonth, paymentSummary.netBalance)
  const prevMonthUnpaid = checkpointNotice || buildPrevMonthUnpaid(state, currentUserId, members, safeGroups, pickle, pickleballState, pickleballMemberId, selectedYearMonth)
  const pendingSettlementCheckpoints = pendingSettlementCheckpointsForProfile(state, currentUserId, members, safeGroups)
  const pendingSettlementCheckpoint = pendingSettlementCheckpoints[0] || null
  const pendingCheckpointsForTreasurer = pendingSettlementCheckpointsForTreasurer(state, members)
  const allTickets = [
    ...safeArray(pickleballState?._allPickle?.externalTickets),
  ]
  const pendingTicketItems = allTickets
    .filter(t => String(t?.status || '').toLowerCase() === 'pending_review')
    .map(t => {
      const memberIds = safeArray(t.memberIds || t.member_ids)
      const attendeeNames = memberIds.map(id => memberName(id, members)).filter(Boolean)
      const advancerId = t.advancerId || t.advancer_id
      return {
        id: t.id,
        date: t.sessionDate || t.session_date,
        dateLabel: formatSessionDetailDate(t.sessionDate || t.session_date),
        time: t.sessionTime || t.session_time || t.time || '',
        memberIds,
        memberLabel: attendeeNames.join(', ') || '—',
        totalAmount: Number(t.totalAmount || t.total_amount) || 0,
        amountPerPerson: memberIds.length > 0
          ? Math.round((Number(t.totalAmount || t.total_amount) || 0) / memberIds.length)
          : 0,
        advancerId,
        advancerName: advancerId ? memberName(advancerId, members) : null,
        approveStatus: advancerId ? 'unpaid' : 'team_fund',
      }
    })
  const pendingTickets = {
    count: pendingTicketItems.length,
    totalAmount: pendingTicketItems.reduce((sum, t) => sum + t.totalAmount, 0),
    items: pendingTicketItems,
  }

  return {
    user: {
      name: state?.currentUserName || "Bạn",
      firstName: firstName(state?.currentUserName),
      dateLabel: formatFullDate(today),
      hasNotifications: safeArray(state?.notifications).some(n => n.is_read === false),
    },
    yearMonth: selectedYearMonth,
    monthLabel: formatMonthLabel(today),
    currentGroupId: state?.currentGroupId || state?.currentGroup?.id || '',
    totalBalance,
    cappedTotalBalance,
    owedTo: sourceBreakdown.filter(source => Number(source.amount) < 0).length,
    pickleball: {
      sessionsAttended: monthSessions.filter(s => sessionMemberIds(s).includes(currentUserId)).length,
      sessionsTotal: monthSessions.length,
      balance: pickleballBalance || summary?.memberOwes?.[pickleballMemberId] || 0,
    },
    groups: {
      count: safeGroups.length,
      balance: totalBalance,
    },
    todaySession: session ? toTodaySessionCard(session, pickle, members) : null,
    currentUserId,
    currentUserName: state?.currentUserName || 'Bạn',
    currentProfileId,
    expenses: buildHomeExpenses(expenseGroups, currentUserId, members, state?.currentUserName, today),
    memberBalances: buildHomeMemberBalances(pickleballState, pickle, today),
    transactions: buildTransactions(expenseGroups, currentUserId, members, state?.currentUserName),
    pendingExpenses: buildPendingExpenseApprovals(expenseGroups, members, currentUserId, state?.currentUserName),
    pendingPayments: buildPendingPaymentConfirmations(state),
    paymentRecords: buildPaymentManagementRecords(state, me, today),
    sourceBreakdown,
    cappedSourceBreakdown,
    profileBreakdown,
    paymentSummary,
    prevMonthUnpaid,
    pendingSettlementCheckpoint,
    pendingSettlementCheckpoints,
    pendingCheckpointsForTreasurer,
    prevMonthResidualByMember,
    currentMonthResidualByMember,
    monthSettlements: safeArray(state?.monthSettlements),
    pendingTickets,
  }
}

function buildHomePaymentSummary(state, sourceBreakdown, profileBreakdown, members, me, monthDate, progressProfileBreakdown = profileBreakdown) {
  const monthLabel = formatMonthLabel(monthDate)
  const coverage = paymentCoverageForMember(state, me, monthLabel, sourceBreakdown)
  const adjustedSources = applyConfirmedPaymentCoverage(sourceBreakdown, coverage.confirmedSources)
  const netBalance = adjustedSources.reduce((sum, source) => sum + (Number(source.amount) || 0), 0)
  const paymentNotice = latestPaymentNoticeForMember(state, me, monthLabel)
  const paymentStatus = netBalance > 0 || (netBalance < 0 && coverage.pendingAmount <= 0) ? '' : paymentNotice?.status || ''
  return {
    monthLabel,
    memberName: me?.displayName || me?.name || state?.currentUserName || 'Thành viên',
    netBalance,
    paidAmount: coverage.confirmedAmount,
    pendingAmount: coverage.pendingAmount,
    sourceBreakdown: adjustedSources,
    paymentStatus,
    paymentStatusAmount: paymentNotice?.amount || coverage.confirmedAmount || 0,
    paymentStatusLabel: netBalance < 0 && coverage.confirmedAmount > 0 ? 'Cần nộp thêm' : paymentNotice?.label || '',
    paymentTarget: findAdminPaymentTarget(members, state),
    memberBank: bankData(me, true),
    paymentProgress: buildPaymentProgressRows(progressProfileBreakdown, members, state, monthLabel, safeArray(state?.monthSettlements), monthKey(monthDate)),
    payForRows: safeArray(profileBreakdown)
      .filter(row => Number(row.amount) < 0)
      .filter(row => String(row.profileId || '') !== String(me?.profileId || me?.profile_id || me?.id || '')),
    refundRows: safeArray(profileBreakdown)
      .filter(row => Number(row.amount) > 0)
      .filter(row => String(row.profileId || '') !== String(me?.profileId || me?.profile_id || me?.id || ''))
      .map(row => ({
        ...row,
        bank: bankData(findProfileMember(row.profileId, members), true),
      })),
  }
}

export function buildPaymentProgressRows(profileBreakdown, members, state, monthLabel, settlements = [], selectedYearMonth = '') {
  const rowsByProfile = new Map()
  const putRow = (row) => {
    const profileId = String(row.profileId || row.profile_id || row.memberId || row.member_id || row.name || '')
    if (!profileId) return
    const current = rowsByProfile.get(profileId)
    const nextStatus = String(row.status || 'unpaid').toLowerCase()
    const currentRank = paymentProgressStatusRank(current?.status)
    const nextRank = paymentProgressStatusRank(nextStatus)
    const amount = Math.abs(Number(row.amount) || 0)
    if (!current || nextRank > currentRank || amount > Math.abs(Number(current.amount) || 0)) {
      const memberIds = row.memberIds || row.member_ids || memberIdsForProfile(profileId, members)
      const groupSource = safeArray(row.sources).find(source => (source?.sourceType || source?.source_type || 'group') === 'group')
        || safeArray(row.sources).find(source => !!(source?.sourceId || source?.source_id))
      rowsByProfile.set(profileId, {
        profileId,
        memberIds,
        memberId: row.memberId || row.member_id || groupSource?.memberId || groupSource?.member_id || memberIds[0] || '',
        linkGroupId: row.linkGroupId || groupSource?.sourceId || groupSource?.source_id || '',
        linkMemberId: row.linkMemberId || groupSource?.memberId || groupSource?.member_id || memberIds[0] || '',
        name: row.name || row.memberName || row.member_name || findProfileMember(profileId, members)?.displayName || findProfileMember(profileId, members)?.name || 'Thành viên',
        amount,
        status: nextStatus,
        sourceSummary: row.sourceSummary || row.source_summary || `${safeArray(row.sources).length || 1} nguồn tiền`,
        prevMonthResidual: 0,
        prevMonthSettled: false,
      })
    }
  }

  safeArray(profileBreakdown)
    .filter(row => Number(row.amount) < 0)
    .forEach(row => putRow({
      ...row,
      amount: Math.abs(Number(row.amount) || 0),
      status: Number(row.pendingAmount) > 0 ? 'pending' : 'unpaid',
      sourceSummary: safeArray(row.sources).length ? `${safeArray(row.sources).length} nguồn tiền` : 'Nguồn tiền',
    }))

  safeArray(state?.notifications)
    .filter(notification => String(notification?.type || '').toLowerCase().includes('payment'))
    .forEach(notification => {
      const metadata = notification?.metadata || {}
      const status = String(metadata.status || 'pending').toLowerCase()
      if (status !== 'pending') return
      if (monthLabel && metadata.monthLabel && String(metadata.monthLabel) !== String(monthLabel)) return
      const actorMemberId = notification.actorMemberId || notification.actor_member_id || ''
      const actorProfileId = profileIdForMember(actorMemberId, members)
      const coveredMembers = safeArray(metadata.coveredMembers || metadata.covered_members)
      if (coveredMembers.length > 0) {
        coveredMembers.forEach(member => putRow({
          profileId: member.profileId || member.profile_id || profileIdForMember(member.memberId || member.member_id, members),
          memberId: member.memberId || member.member_id,
          memberIds: member.memberIds || member.member_ids,
          name: member.name || metadata.memberName,
          amount: member.amount || metadata.amount,
          status,
          sourceSummary: 'Đã báo thanh toán',
        }))
        return
      }
      putRow({
        profileId: actorProfileId,
        memberId: actorMemberId,
        name: metadata.memberName || notification.actorName || notification.actor_name,
        amount: metadata.amount,
        status,
        sourceSummary: 'Đã báo thanh toán',
      })
    })

  const prevMonth = selectedYearMonth ? shiftMonthKey(selectedYearMonth, -1) : ''
  return [...rowsByProfile.values()]
    .map(row => {
      const memberIds = safeArray(row.memberIds || memberIdsForProfile(row.profileId, members)).map(String)
      const settlement = prevMonth ? safeArray(settlements).find(s =>
        memberIds.includes(String(s.member_id)) && String(s.month) === prevMonth
      ) : null
      const settlementResidual = Number(settlement?.expenses?.amount ?? settlement?.amount) || 0
      const unpaidResidual = Math.max(0, ...memberIds.map(memberId => Number(state?.prevMonthResidualByMember?.[memberId]) || 0))
      return {
        ...row,
        prevMonthResidual: settlementResidual || unpaidResidual,
        prevMonthSettled: Boolean(settlement),
        settlementId: settlement?.id || null,
        settlementExpenseId: settlement?.expense_id || null,
      }
    })
    .sort((a, b) => paymentProgressStatusRank(b.status) - paymentProgressStatusRank(a.status) || b.amount - a.amount || a.name.localeCompare(b.name, 'vi'))
}

function paymentProgressStatusRank(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'confirmed') return 3
  if (value === 'pending') return 2
  return 1
}

function adjustedProfileBreakdownForPayments(state, profileBreakdown, members, monthDate) {
  const monthLabel = formatMonthLabel(monthDate)
  return safeArray(profileBreakdown)
    .map(row => {
      const member = findProfileMember(row.profileId, members)
      const coverage = paymentCoverageForMember(state, member, monthLabel, row.sources)
      const sources = applyConfirmedPaymentCoverage(row.sources, coverage.confirmedSources)
      const amount = sources.reduce((sum, source) => sum + (Number(source.amount) || 0), 0)
      return {
        ...row,
        amount,
        sources,
        paidAmount: coverage.confirmedAmount,
        pendingAmount: coverage.pendingAmount,
      }
    })
    .filter(row => Number(row.amount) !== 0)
}

function paymentCoverageForMember(state, member, monthLabel, sourceBreakdown) {
  const notices = paymentNoticesForMember(state, member, monthLabel)
  const scope = paymentScopeForMember(state, member)
  const confirmedSources = []
  let confirmedAmount = 0
  let pendingAmount = 0

  notices.forEach(notification => {
    const metadata = notification?.metadata || {}
    const status = String(metadata.status || 'pending').toLowerCase()
    if (isConfirmedPaymentSubmittedNotice(notification, status)) return
    const amount = Math.abs(Number(metadata.amount) || 0)
    const actorMemberId = notification?.actorMemberId || notification?.actor_member_id || ''
    const noticeScope = { ...scope, isActor: scope.memberIds.has(String(actorMemberId)) }
    const coveredSources = coveredSourcesForPayment(metadata, sourceBreakdown, noticeScope)
    const scopedAmount = coveredSources.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0) || coveredMemberAmountForScope(metadata, noticeScope) || (noticeScope.isActor ? amount : 0)
    if (status === 'confirmed') {
      confirmedSources.push(...coveredSources)
      confirmedAmount += scopedAmount
    } else if (status === 'pending') {
      pendingAmount += scopedAmount
    }
  })

  return { confirmedSources, confirmedAmount, pendingAmount }
}

function isConfirmedPaymentSubmittedNotice(notification, status = '') {
  return String(notification?.type || '').toLowerCase() === 'payment_submitted' &&
    String(status || (notification?.metadata || {}).status || '').toLowerCase() === 'confirmed'
}

function paymentScopeForMember(state, member) {
  const memberId = member?.id || state?.currentUserId
  const profileId = member?.profileId || member?.profile_id || profileIdForMember(memberId, state?.members) || ''
  const memberIds = new Set(
    safeArray(state?.members)
      .filter(row => profileId && String(row?.profileId || row?.profile_id || '') === String(profileId))
      .map(row => String(row.id))
  )
  if (memberId) memberIds.add(String(memberId))
  return { memberId, profileId, memberIds }
}

function paymentNoticesForMember(state, member, monthLabel) {
  const memberId = member?.id || state?.currentUserId
  const profileId = member?.profileId || member?.profile_id || ''
  const memberIds = new Set(
    safeArray(state?.members)
      .filter(row => profileId && String(row?.profileId || row?.profile_id || '') === String(profileId))
      .map(row => String(row.id))
  )
  if (memberId) memberIds.add(String(memberId))
  return safeArray(state?.notifications)
    .filter(notification => String(notification?.type || '').toLowerCase().includes('payment'))
    .filter(notification => String((notification?.metadata || {}).status || 'pending').toLowerCase() !== 'deleted')
    .filter(notification => paymentNoticeCoversMember(notification, memberIds, profileId))
    .filter(notification => {
      const metadata = notification?.metadata || {}
      return !monthLabel || !metadata.monthLabel || String(metadata.monthLabel) === String(monthLabel)
    })
    .sort((a, b) => parseDateValue(b.createdAt || b.created_at) - parseDateValue(a.createdAt || a.created_at))
}

function paymentNoticeCoversMember(notification, memberIds, profileId) {
  if (memberIds.has(String(notification?.actorMemberId || notification?.actor_member_id || ''))) return true
  const metadata = notification?.metadata || {}
  const profileKey = String(profileId || '')
  return safeArray(metadata.coveredMembers || metadata.covered_members).some(row => (
    (profileKey && String(row?.profileId || row?.profile_id || '') === profileKey) ||
    safeArray(row?.memberIds || row?.member_ids).some(id => memberIds.has(String(id))) ||
    memberIds.has(String(row?.memberId || row?.member_id || ''))
  )) || safeArray(metadata.coveredSources || metadata.covered_sources).some(source => (
    (profileKey && String(source?.profileId || source?.profile_id || '') === profileKey) ||
    memberIds.has(String(source?.memberId || source?.member_id || ''))
  ))
}

function coveredSourcesForPayment(metadata, sourceBreakdown, scope = {}) {
  const sourceProfileIds = new Set(safeArray(sourceBreakdown).map(source => String(source.profileId || source.profile_id || '')).filter(Boolean))
  const sourceMemberIds = new Set(safeArray(sourceBreakdown).map(source => String(source.memberId || source.member_id || '')).filter(Boolean))
  const explicit = safeArray(metadata?.coveredSources || metadata?.covered_sources)
    .filter(source => {
      const profileId = String(source?.profileId || source?.profile_id || '')
      const memberId = String(source?.memberId || source?.member_id || '')
      if (profileId && scope.profileId && profileId === String(scope.profileId)) return true
      if (memberId && scope.memberIds?.has(String(memberId))) return true
      if (profileId && sourceProfileIds.size > 0) return sourceProfileIds.has(profileId)
      if (memberId && sourceMemberIds.size > 0) return sourceMemberIds.has(memberId)
      return !profileId && !memberId && scope.isActor === true
    })
    .map(source => ({
      sourceId: source.sourceId || source.source_id,
      sourceType: source.sourceType || source.source_type || 'group',
      sourceLabel: source.sourceLabel || source.source_label || 'Nguồn tiền',
      profileId: source.profileId || source.profile_id || '',
      memberId: source.memberId || source.member_id || '',
      memberName: source.memberName || source.member_name || '',
      amount: Number(source.amount) || 0,
    }))
    .filter(source => source.amount !== 0)
  if (explicit.length > 0) return explicit

  let remaining = coveredMemberAmountForScope(metadata, scope) || (scope.isActor ? Math.abs(Number(metadata?.amount) || 0) : 0)
  if (remaining <= 0) return []
  return safeArray(sourceBreakdown)
    .filter(source => Number(source.amount) < 0)
    .map(source => {
      if (remaining <= 0) return null
      const covered = Math.min(Math.abs(Number(source.amount) || 0), remaining)
      remaining -= covered
      return { ...source, amount: -covered }
    })
    .filter(Boolean)
}

function coveredMemberAmountForScope(metadata, scope = {}) {
  return safeArray(metadata?.coveredMembers || metadata?.covered_members)
    .filter(row => (
      (scope.profileId && String(row?.profileId || row?.profile_id || '') === String(scope.profileId)) ||
      safeArray(row?.memberIds || row?.member_ids).some(id => scope.memberIds?.has(String(id))) ||
      scope.memberIds?.has(String(row?.memberId || row?.member_id || ''))
    ))
    .reduce((sum, row) => sum + Math.abs(Number(row?.amount) || 0), 0)
}

function applyConfirmedPaymentCoverage(sourceBreakdown, confirmedSources) {
  const coveredBySource = new Map()
  safeArray(confirmedSources).forEach(source => {
    const key = sourceKey(source)
    coveredBySource.set(key, (coveredBySource.get(key) || 0) + Math.abs(Number(source.amount) || 0))
  })
  return safeArray(sourceBreakdown)
    .map(source => {
      const amount = Number(source.amount) || 0
      if (amount >= 0) return source
      const paid = coveredBySource.get(sourceKey(source)) || 0
      const remaining = amount + paid
      return { ...source, amount: remaining, paidAmount: Math.min(Math.abs(amount), paid) }
    })
    .filter(source => Number(source.amount) !== 0)
}

function sourceKey(source) {
  return `${source?.sourceType || source?.source_type || 'group'}:${source?.sourceId || source?.source_id || source?.sourceLabel || source?.source_label || ''}`
}

function latestPaymentNoticeForMember(state, member, monthLabel) {
  const notices = paymentNoticesForMember(state, member, monthLabel)
  const notice = notices[0]
  if (!notice) return null
  const metadata = notice.metadata || {}
  const status = String(metadata.status || 'pending').toLowerCase()
  return {
    status,
    amount: Number(metadata.amount) || 0,
    label: status === 'confirmed' ? 'Đã thanh toán' : status === 'rejected' ? 'Chưa nhận được' : 'Chờ xác nhận',
  }
}

function buildHomeSourceBalances(state, expenseGroups, pickleballState, pickle, monthSessions, members, monthDate) {
  const expenseRows = safeArray(expenseGroups).flatMap(group => (
    membersForGroup(group, members).map(member => ({
      sourceId: group.id,
      sourceType: 'group',
      sourceLabel: group.name || 'Nhóm',
      memberId: member.id,
      amount: groupNet(group, member.id),
    }))
  ))
  const pickleRows = currentGroupMembers(pickleballState)
    .filter(isActiveMember)
    .map(member => ({
      sourceId: pickleballState?.currentGroupId || pickleballState?.currentGroup?.id,
      sourceType: 'pickleball',
      sourceLabel: pickleballState?.currentGroup?.name || 'Pickleball',
      memberId: member.id,
      amount: buildMemberMonthBalance(pickleballState, pickle, monthSessions, member.id, monthDate).netBalance || 0,
      month: monthKey(monthDate),
    }))
  return [...expenseRows, ...pickleRows].filter(row => row.memberId && row.amount !== 0)
}

function buildHomeMemberBalances(state, pickle, monthDate) {
  const monthSessions = getStateMonthSessions(state, monthDate)
  const yearMonth = monthKey(monthDate || new Date())
  return currentGroupMembers(state)
    .filter(isActiveMember)
    .map(member => {
      const balance = buildMemberMonthBalance(state, pickle, monthSessions, member.id, monthDate)
      const type = isFixedForMonth(state, member, yearMonth) ? 'fixed' : 'casual'
      return {
        memberId: member.id,
        id: member.id,
        name: member.displayName || member.name || 'Thành viên',
        initial: initials(member),
        initials: initials(member),
        type,
        netBalance: balance.netBalance,
        owed: balance.totalOwed,
        courtFee: balance.courtFee,
        waterFee: balance.waterFee,
        extras: balance.extras,
        ticketShare: balance.ticketShare,
        p2pBalance: balance.p2pBalance,
      }
    })
    .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name, 'vi'))
}

function buildHomeExpenses(groups, currentUserId, members, currentUserName, monthDate) {
  return safeArray(groups).flatMap(group => {
    const meForGroup = memberIdForGroup(group, currentUserId, members, currentUserName)
    return safeArray(group.expenses)
      .filter(expense => isSameExpenseMonth(expense, monthDate))
      .map(expense => {
        const fields = {
          paidBy: expense.paidBy || expense.paid_by_member_id,
          participants: safeArray(expense.participants),
          splits: safeArray(expense.splits).map(normalizeHomeSplit).filter(split => split.memberId),
        }
        const { paidBy, participants, splits } = fields
        const normalizedExpense = { ...expense, paidBy, participants, splits }

        return {
          id: expense.id,
          groupId: expense.groupId || expense.group_id || group.id,
          groupName: group.name || 'Nhóm',
          title: expense.title || 'Chi tiêu',
          amount: Number(expense.amount) || 0,
          paidBy,
          participants,
          splits,
          date: expense.date || expense.expense_date,
          status: expense.status,
          currentMemberId: meForGroup,
          isMine: isExpenseRelatedToMember(normalizedExpense, meForGroup),
        }
      })
  })
}

function buildPendingExpenseApprovals(groups, members, currentUserId, currentUserName) {
  return safeArray(groups)
    .filter(group => canReviewPendingExpensesForGroup(group, members, currentUserId, currentUserName))
    .flatMap(group => (
      safeArray(group.expenses)
      .filter(expense => String(expense.status || '').toLowerCase() === 'pending')
      .map(expense => {
        const submittedBy = expense.submittedBy || expense.submitted_by_member_id || expense.createdBy || expense.created_by || null
        return {
          id: expense.id,
          groupId: expense.groupId || expense.group_id || group.id,
          groupName: group.name || 'Nhóm',
          title: expense.title || 'Chi tiêu',
          amount: Number(expense.amount) || 0,
          date: expense.date || expense.expense_date,
          submittedBy,
          submittedByName: submittedBy ? memberName(submittedBy, members) : '',
        }
      })
    ))
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
}

function buildPendingPaymentConfirmations(state) {
  const members = safeArray(state?.members)
  const currentMember = members.find(member => String(member?.id || '') === String(state?.currentUserId || '')) || {}
  const currentName = normalizeName(currentMember?.displayName || currentMember?.name || state?.currentUserName || '')
  const canReviewPayment = ['treasurer', 'admin', 'owner'].includes(String(currentMember?.role || '').toLowerCase()) || currentName.includes('long')
  if (!canReviewPayment) return []
  return safeArray(state?.notifications)
    .filter(notification => {
      const type = String(notification?.type || '').toLowerCase()
      const metadata = notification?.metadata || {}
      return type.includes('payment') && String(metadata.status || 'pending').toLowerCase() === 'pending'
    })
    .map(notification => {
      const metadata = notification.metadata || {}
      const amount = Number(metadata.amount) || 0
      const names = [metadata.memberName, ...safeArray(metadata.coveredMembers).map(row => row?.name)].filter(Boolean)
      return {
        id: notification.id,
        notificationId: notification.id,
        title: names.length ? names.join(', ') : 'Thành viên',
        groupName: 'Thanh toán tổng hợp',
        submittedByName: metadata.memberName || 'Thành viên',
        amount,
        date: notification.createdAt || notification.created_at,
        transferDescription: metadata.transferDescription || '',
      }
    })
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
}

function buildPaymentManagementRecords(state, currentMember, monthDate) {
  const currentName = normalizeName(currentMember?.displayName || currentMember?.name || state?.currentUserName || '')
  const canReviewPayment = ['treasurer', 'admin', 'owner'].includes(String(currentMember?.role || '').toLowerCase()) || currentName.includes('long')
  if (!canReviewPayment) return []
  const monthLabel = formatMonthLabel(monthDate)
  return safeArray(state?.notifications)
    .filter(notification => String(notification?.type || '').toLowerCase().includes('payment'))
    .filter(notification => {
      const metadata = notification?.metadata || {}
      return String(metadata.status || 'pending') !== 'deleted'
    })
    .filter(notification => {
      const metadata = notification?.metadata || {}
      return !monthLabel || !metadata.monthLabel || String(metadata.monthLabel) === String(monthLabel)
    })
    .map(notification => {
      const metadata = notification.metadata || {}
      const memberName = metadata.memberName || notification.actorName || notification.actor_name || 'Thành viên'
      const actorMemberId = notification.actorMemberId || notification.actor_member_id || ''
      const actorProfileId = profileIdForMember(actorMemberId, state?.members)
      const groupId = notification.groupId || notification.group_id || ''
      const groupName = safeArray(state?.groups).find(group => String(group?.id || '') === String(groupId))?.name || ''
      const coveredSources = safeArray(metadata.coveredSources || metadata.covered_sources).map(source => ({
        ...source,
        profileId: source.profileId || source.profile_id || actorProfileId || '',
        memberId: source.memberId || source.member_id || actorMemberId || '',
        memberName: source.memberName || source.member_name || memberName,
      }))
      const coveredMembers = safeArray(metadata.coveredMembers || metadata.covered_members)
      const names = [memberName, ...coveredMembers.map(row => row?.name)].filter(Boolean)
      const status = String(metadata.status || 'pending').toLowerCase()
      return {
        id: notification.id,
        notificationId: notification.id,
        memberId: notification.actorMemberId || notification.actor_member_id || '',
        memberName: names.join(', ') || memberName,
        amount: Number(metadata.amount) || 0,
        status,
        date: notification.createdAt || notification.created_at,
        monthLabel: metadata.monthLabel || monthLabel,
        transferDescription: metadata.transferDescription || metadata.transfer_description || '',
        coveredSources,
        sourceSummary: groupName ? `${groupName} · ${metadata.monthLabel || monthLabel}` : (coveredSources.length ? `${coveredSources.length} nguồn tiền` : 'Chưa rõ nguồn'),
      }
    })
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
}

function adjustedGroupNetForMember(group, memberId, groupMembers, state, monthDate) {
  const rawAmount = groupNet(group, memberId)
  if (!state || !safeArray(state?.notifications).length) return rawAmount
  const member = safeArray(groupMembers).find(row => String(row?.id || '') === String(memberId || '')) || { id: memberId }
  const source = {
    sourceId: group.id,
    sourceType: 'group',
    sourceLabel: group.name || 'Nhóm',
    memberId,
    amount: rawAmount,
  }
  const coverage = paymentCoverageForMember({ ...state, members: safeArray(state?.members).length ? state.members : groupMembers }, member, formatMonthLabel(monthDate), [source])
  const adjusted = applyConfirmedPaymentCoverage([source], coverage.confirmedSources)[0]
  return Number(adjusted?.amount) || 0
}

function canReviewPendingExpensesForGroup(group, members, currentUserId, currentUserName) {
  const groupMembers = membersForGroup(group, members)
  const currentGroupMember = groupMembers.find(member => String(member.id) === String(memberIdForGroup(group, currentUserId, members, currentUserName)))
  const currentMember = safeArray(members).find(member => String(member.id) === String(currentUserId))
  return Boolean(
    isMemberGroupCreator(group, currentGroupMember) ||
    isMemberGroupCreator(group, currentMember) ||
    currentGroupMember?.role === 'treasurer'
  )
}

function normalizeHomeSplit(split) {
  return {
    memberId: split.memberId || split.member_id,
    amount: Number(split.amount ?? split.share_amount ?? split.share ?? 0) || 0,
  }
}

function isSameExpenseMonth(expense, monthDate) {
  const expenseMonth = monthKey(expense?.date || expense?.expense_date)
  const targetMonth = monthKey(monthDate)
  return Boolean(expenseMonth && targetMonth && expenseMonth === targetMonth)
}

function groupWithMonthExpenses(group, monthDate) {
  return safeGroup({
    ...group,
    expenses: safeArray(group?.expenses).filter(expense => isSameExpenseMonth(expense, monthDate)),
  })
}

function isExpenseRelatedToMember(expense, memberId) {
  if (!memberId) return false
  const id = String(memberId)
  if (String(expense?.paidBy || expense?.paid_by_member_id || '') === id) return true
  return safeArray(expense?.participants).some(member => String(member) === id)
    || safeArray(expense?.splits).some(split => String(split.memberId || split.member_id) === id)
}

function buildAddExpenseData(state, params) {
  const expenseId = normalizeId(params, 'expenseId')
  const expense = expenseId ? findExpense(state, expenseId) : null
  const requestedGroupId = normalizeId(params, 'groupId')
  const yearMonth = params?.yearMonth || state?.selectedYearMonth
  const currentYearMonth = monthKey(new Date())
  const defaultDate = (!expense && yearMonth && yearMonth !== currentYearMonth)
    ? (() => { const d = dateFromYearMonth(yearMonth); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` })()
    : null
  const requestedGroup = requestedGroupId ? safeArray(state?.groups).find(item => String(item.id) === String(requestedGroupId)) : null
  const expenseGroups = safeArray(state?.groups)
    .map(safeGroup)
    .filter(group => groupKind(group) !== 'pickleball')
  const group = expense ? groupForExpense(state, expense) || resolveExpenseGroupContext(state, requestedGroup) : resolveExpenseGroupContext(state, requestedGroup)
  const currentMember = safeArray(state?.members).find(member => String(member.id) === String(state?.currentUserId))
  const selectedGroup = buildAddExpenseGroupOption(state, group)
  const members = selectedGroup.members

  return {
    groupId: selectedGroup.id || state?.currentGroupId,
    groupName: selectedGroup.name || 'Nhóm',
    groupEmoji: selectedGroup.emoji || '👥',
    memberCount: members.length,
    currentMemberId: selectedGroup.currentMemberId || state?.currentUserId,
    currentMemberName: currentMember?.displayName || currentMember?.name || state?.currentUserName,
    members,
    groupOptions: expenseGroups.map(group => buildAddExpenseGroupOption(state, group)),
    defaultDate,
    editExpense: expense ? {
      id: expense.id,
      groupId: expense.groupId || expense.group_id || group?.id,
      title: expense.title || '',
      amount: Number(expense.amount) || 0,
      paidBy: expense.paidBy || expense.paid_by_member_id || '',
      category: expense.category || expense.cat || 'general',
      notes: expense.notes || expense.note || expense.description || '',
      date: expense.date || expense.expense_date || '',
      participants: safeArray(expense.participants),
      receiptImages: safeArray(expense.receiptImages || expense.receipt_images),
    } : null,
  }
}

function buildAddExpenseGroupOption(state, group) {
  const safe = safeGroup(group)
  const members = membersForGroup(safe, safeArray(state?.members))
    .map(member => ({
      id: member.id,
      name: member.displayName || member.name,
      initial: member.initial || member.initials || initials(member),
    }))
  return {
    id: safe.id,
    name: safe.name || 'Nhóm',
    emoji: safe.emoji || '👥',
    memberCount: members.length,
    currentMemberId: memberIdForGroup(safe, state?.currentUserId, safeArray(state?.members), state?.currentUserName),
    members,
  }
}

function resolveExpenseGroupContext(state, requestedGroup = null) {
  const groups = safeArray(state?.groups).map(safeGroup)
  const candidate = requestedGroup || currentGroup(state)
  if (candidate && groupKind(candidate) !== 'pickleball') return candidate
  const pickleballId = candidate?.id || state?.pickleballGroupId || state?.pickleballGroup?.id
  const linkedGroup = groups.find(group => (
    groupKind(group) !== 'pickleball' &&
    String(group.linkedPickleballGroupId || group.linked_pickleball_group_id || '') === String(pickleballId || '')
  ))
  if (linkedGroup) return linkedGroup
  return groups.find(group => groupKind(group) !== 'pickleball') || candidate || safeGroup(null)
}

function buildGroupsListData(groups, currentUserId, members, currentUserName, selectedYearMonth) {
  const monthDate = dateFromYearMonth(selectedYearMonth)
  const pickleballGroup = safeArray(groups).find(group => groupKind(group) === 'pickleball')
  const rows = safeArray(groups).map(safeGroup).filter(group => groupKind(group) !== 'pickleball').map(group => {
    const monthlyGroup = groupWithMonthExpenses(group, monthDate)
    const groupMembers = membersForGroup(group, members)
    const balance = groupNetForMember(monthlyGroup, currentUserId, members, currentUserName)
    const avatars = groupMembers.slice(0, 4).map(m => initials(m))
    const linkedPickleballGroupId = group.linkedPickleballGroupId || group.linked_pickleball_group_id || null

    return {
      id: group.id,
      kind: groupKind(group),
      emoji: group.emoji || '👥',
      name: group.name || 'Nhóm',
      description: group.description || '',
      groupTypeLabel: groupTypeLabel(group),
      isLinkedPickleballExpenseGroup: Boolean(linkedPickleballGroupId),
      linkedPickleballLabel: 'Liên kết Pickleball',
      linkedPickleballGroupId,
      linkedPickleballGroupName: linkedPickleballGroupId && String(linkedPickleballGroupId) === String(pickleballGroup?.id)
        ? pickleballGroup.name
        : 'Pickleball',
      memberCount: groupMembers.length || safeArray(group.members).length,
      members: avatars,
      avatars,
      balance,
    }
  })
  const owed = rows.filter(g => g.balance < 0).length
  const balanced = rows.filter(g => g.balance === 0).length

  return {
    activeCount: rows.length,
    archivedCount: 0,
    activeFilter: 'all',
    filters: [
      { key: 'all', label: `Tất cả · ${rows.length}` },
      { key: 'owed', label: `Còn nợ · ${owed}` },
      { key: 'balanced', label: `0 · ${balanced}` },
      { key: 'closed', label: 'Đã chốt' },
    ],
    groups: rows,
    archived: [],
  }
}

function isMemberGroupCreator(group, member) {
  const creatorId = group?.createdBy || group?.created_by || ''
  if (!creatorId || !member) return false
  return (
    String(creatorId) === String(member.id || '') ||
    String(creatorId) === String(member.profileId || member.profile_id || '')
  )
}

function isManagerRole(role) {
  return ['treasurer', 'admin', 'owner'].includes(String(role || '').toLowerCase())
}

function memberDisplayColor(member) {
  if (member?.color) return member.color
  const key = String(member?.profileId || member?.profile_id || member?.id || member?.name || '')
  return FALLBACK_AVATAR_COLORS[stableHash(key) % FALLBACK_AVATAR_COLORS.length]
}

function stableHash(value) {
  let hash = 2166136261
  for (const char of String(value || 'member')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function buildGroupDetailData(group, currentUserId, members, currentUserName, selectedYearMonth, profiles = [], appState = {}) {
  const g = safeGroup(group)
  const monthDate = dateFromYearMonth(selectedYearMonth)
  const endOfSelectedMonth = endOfYearMonth(selectedYearMonth)
  const monthlyGroup = groupWithMonthExpenses(g, monthDate)
  const groupMembers = membersForGroup(g, members)
  const currentGroupMember = groupMembers.find(member => String(member.id) === String(memberIdForGroup(g, currentUserId, members, currentUserName)))
  const currentMember = safeArray(members).find(member => String(member.id) === String(currentUserId))
  const isGroupCreator = isMemberGroupCreator(g, currentGroupMember) || isMemberGroupCreator(g, currentMember)
  const isSoloExpenseGroup = groupMembers.length === 1 && groupKind(g) !== 'pickleball'
  const isGroupTreasurer = Boolean(isGroupCreator || isManagerRole(currentGroupMember?.role) || (Boolean(currentGroupMember) && isSoloExpenseGroup))
  const currentBalanceGroup = groupDetailSettlementGroup(g, currentGroupMember?.id || currentUserId, appState, endOfSelectedMonth)
  const balanceMap = groupBalanceForMember(currentBalanceGroup, currentGroupMember?.id || currentUserId, members, currentUserName)
  const currentBalance = groupDetailSettlementBalance(g, currentGroupMember?.id || currentUserId, appState, endOfSelectedMonth)
  const balance = currentBalance.amount
  const memberBalanceMap = Object.fromEntries(
    groupMembers.map(member => [member.id, groupDetailSettlementBalance(g, member.id, appState, endOfSelectedMonth)])
  )
  const paymentTarget = buildGroupPaymentTarget(g, groupMembers)
  const activities = safeArray(monthlyGroup.expenses)
    .slice()
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .slice(0, 20)
    .map(expense => toActivity(expense, members))
  const monthlyExpenses = safeArray(monthlyGroup.expenses)
  const totalSpent = monthlyExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
  const pendingExpenses = safeArray(monthlyGroup.expenses)
    .filter(expense => expense.status === 'pending')
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .map(expense => toActivity(expense, members))

  return {
    group: {
      id: g.id,
      name: g.name || 'Nhóm',
      emoji: g.emoji || '👥',
      description: g.description || '',
      color: g.color || '#574EFA',
    },
    id: g.id,
    name: g.name || 'Nhóm',
    emoji: g.emoji || '👥',
    description: g.description || '',
    color: g.color || '#574EFA',
    monthLabel: formatMonthLabel(monthDate),
    currentYearMonth: monthKey(monthDate),
    createdBy: g.createdBy || g.created_by || null,
    inviteCode: g.inviteCode || g.invite_code || '',
    invite_code: g.inviteCode || g.invite_code || '',
    isPickleball: groupKind(g) === 'pickleball',
    isGroupCreator,
    isTreasurer: isGroupTreasurer,
    memberCount: groupMembers.length,
    expenseCount: monthlyExpenses.length,
    totalSpent,
    balance,
    balanceLabel: buildBalanceLabel(balanceMap, balance, members),
    currentMemberId: currentGroupMember?.id || null,
    pendingExpenses,
    exportExpenses: monthlyExpenses,
    activities,
    activitiesByWeek: activities.length > 0 ? [{ label: 'Hoạt động gần đây', items: activities }] : [],
    memberCandidates: buildGroupMemberCandidates(g, members, profiles, { mode: 'expense', groups: appState?.groups }),
    paymentTarget,
    members: groupMembers.map(member => {
      const memberTransactions = buildMemberTransactions(g, member.id, selectedYearMonth, groupMembers)
      return {
        id: member.id,
        groupId: g.id,
        monthLabel: formatMonthLabel(monthDate),
        currentYearMonth: monthKey(monthDate),
        name: member.displayName || member.name,
        initials: initials(member),
        color: memberDisplayColor(member),
        photoUrl: memberPhotoUrl(member, members),
        role: member.role,
        isGroupCreator: isMemberGroupCreator(g, member),
        bankName: member.bankName || member.bank_name || '',
        bankAccount: member.bankAccount || member.bank_account || '',
        bankAccountName: member.bankAccountName || member.bank_account_name || '',
        joinDate: fullExpenseDate(member.createdAt || member.created_at),
        balance: memberBalanceMap[member.id]?.amount || 0,
        monthBreakdown: memberBalanceMap[member.id]?.monthBreakdown || [],
        isCurrentUser: String(member.id) === String(currentGroupMember?.id || ''),
        memberTransactions,
        memberTransactionSummary: summarizeMemberTransactions(memberTransactions),
        paymentTarget,
      }
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    balanceRows: groupMembers
      .map(member => ({
        id: member.id,
        name: member.displayName || member.name,
        initials: initials(member),
        color: memberDisplayColor(member),
        photoUrl: memberPhotoUrl(member, members),
        role: member.role,
        isGroupCreator: isMemberGroupCreator(g, member),
        amount: memberBalanceMap[member.id]?.amount || 0,
        monthBreakdown: memberBalanceMap[member.id]?.monthBreakdown || [],
      }))
      .filter(row => row.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.name.localeCompare(b.name, 'vi')),
  }
}

function groupDetailSettlementGroup(group, memberId, state, endDate) {
  const checkpoint = latestConfirmedSettlementCheckpoint(state, group.id, memberId)
  return groupWithExpensesAfter(group, checkpoint?.periodEnd || null, endDate)
}

function groupDetailSettlementBalance(group, memberId, state, endDate) {
  const checkpointGroup = groupDetailSettlementGroup(group, memberId, state, endDate)
  return {
    amount: groupNet(checkpointGroup, memberId),
    monthBreakdown: sourceMonthBreakdown(safeArray(checkpointGroup.expenses).map(expense => ({
      month: monthKey(expense.date || expense.expense_date),
      amount: groupNet({ ...checkpointGroup, expenses: [expense] }, memberId),
    }))),
  }
}

function buildGroupMemberCandidates(group, members, profiles = [], options = {}, groups = []) {
  const allGroups = safeArray(options.groups || groups)
  const pickleballGroupIds = new Set(allGroups.filter(g => groupKind(g) === 'pickleball' || g.linkedPickleballGroupId || g.linked_pickleball_group_id).map(g => g.id))
  const currentMembers = allMembersForGroup(group, members)
  const mode = options.mode || groupKind(group)
  const blockingCurrentMembers = mode === 'pickleball'
    ? currentMembers
    : currentMembers.filter(isExpenseActiveMember)
  const currentIds = new Set(blockingCurrentMembers.map(member => String(member.id)))
  const currentProfileIds = new Set(blockingCurrentMembers.map(member => String(member.profileId || member.profile_id || member.id)))
  const activeCurrentKeys = new Set(
    currentMembers
      .filter(member => mode === 'pickleball' ? isActiveMember(member) : isExpenseActiveMember(member))
      .map(memberIdentityKey)
      .filter(Boolean)
  )
  const seenProfileIds = new Set()
  const inactiveCurrentMembers = currentMembers.filter(member => (
    (mode === 'pickleball' ? !isActiveMember(member) : !isExpenseActiveMember(member)) &&
    !activeCurrentKeys.has(memberIdentityKey(member))
  ))
    .map(member => ({
      id: member.id,
      memberId: member.id,
      profileId: member.profileId || member.profile_id || '',
      name: member.displayName || member.name || '',
      bankName: member.bankName || member.bank_name || '',
      bankAccount: member.bankAccount || member.bank_account || '',
      bankAccountName: member.bankAccountName || member.bank_account_name || '',
      isInactive: mode === 'pickleball' ? !isActiveMember(member) : !isExpenseActiveMember(member),
      memberType: memberType(member),
    }))
  const dedupedInactiveCurrentMembers = dedupeMemberRowsByProfileOrName(inactiveCurrentMembers)
  const inactiveNames = new Set(
    dedupedInactiveCurrentMembers.map(member => (member.name || '').toLowerCase().trim()).filter(Boolean)
  )
  const allCurrentMemberNames = new Set(
    blockingCurrentMembers.map(member => (member.displayName || member.name || '').toLowerCase().trim()).filter(Boolean)
  )
  const outsideGroupCandidates = candidateProfilesFromDirectory(members, profiles)
    .filter(member => {
      const nameKey = (member.name || member.displayName || '').toLowerCase().trim()
      if (nameKey && allCurrentMemberNames.has(nameKey)) return false
      if (nameKey && inactiveNames.has(nameKey)) return false
      return !currentIds.has(String(member.id)) && !currentProfileIds.has(String(member.profileId || member.profile_id || member.id))
    })
    .map(member => ({
      id: member.profileId || member.profile_id || member.id,
      memberId: member.id,
      profileId: member.profileId || member.profile_id || member.id,
      name: member.displayName || member.name || '',
      bankName: member.bankName || member.bank_name || '',
      bankAccount: member.bankAccount || member.bank_account || '',
      bankAccountName: member.bankAccountName || member.bank_account_name || '',
      isPickleball: pickleballGroupIds.size > 0 && pickleballGroupIds.has(String(member.groupId || member.group_id || '')),
    }))
    .filter(member => {
      const key = String(member.profileId || member.id || '')
      if (!key || seenProfileIds.has(key)) return false
      seenProfileIds.add(key)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  return dedupedInactiveCurrentMembers.concat(outsideGroupCandidates)
}

function candidateProfilesFromDirectory(members, profiles = []) {
  const profileRows = safeArray(profiles)
  const membersByProfile = new Map()
  safeArray(members).forEach(member => {
    const key = String(member.profileId || member.profile_id || member.id || '')
    if (!key) return
    const rows = membersByProfile.get(key) || []
    rows.push(member)
    membersByProfile.set(key, rows)
  })
  const profilesById = new Map(profileRows.map(profile => [String(profile.id), profile]))
  const rows = profileRows.map(profile => {
    const key = String(profile.id || '')
    const memberRows = membersByProfile.get(key) || []
    const activeMember = memberRows.find(isActiveMember)
    if (!activeMember) return null
    return {
      id: activeMember.id,
      profileId: profile.id,
      profile_id: profile.id,
      name: profile.name || activeMember?.displayName || activeMember?.name || '',
      bankName: profile.bankName || profile.bank_name || activeMember?.bankName || activeMember?.bank_name || '',
      bankAccount: profile.bankAccount || profile.bank_account || activeMember?.bankAccount || activeMember?.bank_account || '',
      bankAccountName: profile.bankAccountName || profile.bank_account_name || activeMember?.bankAccountName || activeMember?.bank_account_name || '',
    }
  })
  safeArray(members).filter(isActiveMember).forEach(member => {
    const key = String(member.profileId || member.profile_id || member.id || '')
    if (key && profilesById.has(key)) return
    rows.push(member)
  })
  return rows.filter(row => row && row.name)
}

function buildMemberTransactions(group, memberId, selectedYearMonth, members = []) {
  const monthDate = dateFromYearMonth(selectedYearMonth)
  return safeArray(group?.expenses)
    .filter(expense => isSameExpenseMonth(expense, monthDate))
    .filter(expense => isExpenseRelatedToMember(normalizeExpenseForMemberBill(expense), memberId))
    .sort((a, b) => parseDateValue(b.date || b.expense_date) - parseDateValue(a.date || a.expense_date))
    .map(expense => {
      const normalized = normalizeExpenseForMemberBill(expense)
      const paidBy = normalized.paidBy
      const paidAmount = String(paidBy || '') === String(memberId) ? normalized.amount : 0
      const shareAmount = memberShareAmount(normalized, memberId)
      const netAmount = paidAmount - shareAmount
      return {
        id: expense.id,
        date: formatDayMonth(expense.date || expense.expense_date),
        rawDate: expense.date || expense.expense_date,
        title: expense.title || 'Chi tiêu',
        category: expense.category || expense.cat || '',
        status: expense.status || 'approved',
        paidBy,
        paidByName: memberName(paidBy, members),
        role: paidAmount > 0 ? 'payer' : 'participant',
        paidAmount,
        shareAmount,
        netAmount,
      }
    })
}

function normalizeExpenseForMemberBill(expense) {
  return {
    ...expense,
    amount: Number(expense?.amount) || 0,
    paidBy: expense?.paidBy || expense?.paid_by_member_id,
    participants: safeArray(expense?.participants),
    splits: safeArray(expense?.splits).map(split => ({
      memberId: split.memberId || split.member_id,
      amount: Number(split.amount ?? split.share_amount ?? split.share ?? 0) || 0,
    })).filter(split => split.memberId),
  }
}

function memberShareAmount(expense, memberId) {
  const split = safeArray(expense?.splits).find(row => String(row.memberId || row.member_id) === String(memberId))
  if (split) return Number(split.amount ?? split.share_amount ?? split.share ?? 0) || 0
  const participants = safeArray(expense?.participants)
  const index = participants.findIndex(id => String(id) === String(memberId))
  if (index < 0 || participants.length === 0) return 0
  const amount = Number(expense?.amount) || 0
  const per = Math.round(amount / participants.length)
  return index === participants.length - 1 ? amount - per * (participants.length - 1) : per
}

function summarizeMemberTransactions(transactions) {
  const rows = safeArray(transactions)
  const owes = rows.reduce((sum, row) => sum + Math.max(0, -Number(row.netAmount || 0)), 0)
  const advanced = rows.reduce((sum, row) => sum + Math.max(0, Number(row.netAmount || 0)), 0)
  return {
    owes,
    advanced,
    net: advanced - owes,
  }
}

function buildGroupPaymentTarget(group, members) {
  const groupCreatorId = group?.createdBy || group?.created_by
  const treasurer = safeArray(members).find(member => member?.role === 'treasurer')
    || safeArray(members).find(member => String(member?.id || '') === String(groupCreatorId || ''))
    || safeArray(members)[0]
    || null
  return {
    memberId: treasurer?.id || '',
    name: treasurer?.displayName || treasurer?.name || '',
    bankName: treasurer?.bankName || treasurer?.bank_name || '',
    bankAccount: treasurer?.bankAccount || treasurer?.bank_account || '',
    bankAccountName: treasurer?.bankAccountName || treasurer?.bank_account_name || '',
  }
}

export function buildPickleballOverviewData(state, pickle, _allPickle, currentUserId, members, selectedYearMonth) {
  const today = dateFromYearMonth(selectedYearMonth)
  const currentYearMonth = monthKey(today)
  const group = currentGroup(state)
  const pickleConfig = currentPickleConfig(state)
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const currentMonthConfig = safeArray(pickle?.monthlyConfigs).find(
    c => c.yearMonth === currentYearMonth
  )
  const monthSessions = getStateMonthSessions(state, today)
  const autoGenerateConfig = buildSessionGenerationConfig(state, currentYearMonth)
  const overviewScheduleTime = configuredPickleScheduleTime(state, currentYearMonth)
  const shouldAutoGenerate = !state?._pickleRegenInProgress && hasMissingGeneratedSessions(state, currentYearMonth, monthSessions, autoGenerateConfig)
  const completedMonthSessions = monthSessions.filter(s => isDoneStatus(s?.status))
  const completedSessions = completedMonthSessions.length
  const summary = pickleSummary(pickle || {})
  const todaySession = findNearestOpenSession(pickle, new Date())
  const monthTickets = monthTicketsForState(state, today)
  const approvedMonthTickets = monthTickets.filter(t => ticketStatus(t) !== 'pending_review')
  const ticketWaterTotal = monthTickets.reduce((sum, t) => sum + Number(t?.waterAmount ?? t?.water_amount ?? 0), 0)
  const water = monthSessions.reduce((sum, session) => sum + sessionWaterAmount(session), 0) + ticketWaterTotal
  const courtFee = Number(currentMonthConfig?.courtFee ?? pickle?.monthlyCourtFee ?? 0)
  const currentFixedMembers = currentGroupMembers(state).filter(member => isActiveMember(member) && isFixedForMonth(state, member, currentYearMonth))
  const activeMemberIds = currentFixedMembers.map(member => member.id || member.member_id).filter(Boolean)
  const currentPickleballMemberId = memberIdForGroup(state?.currentGroup, currentUserId, members, state?.currentUserName)
  const isFlexBilling = isBillingModeFlexForMonth(state, currentYearMonth)
  const myAttendedCount = isFlexBilling
    ? approvedMonthTickets.filter(t => ticketMemberIds(t).some(id => String(id) === String(currentPickleballMemberId))).length
    : attendanceByMemberId(completedMonthSessions, currentPickleballMemberId, members, true)
  const p2pTicketBalance = memberTicketBalance(state, currentPickleballMemberId, today)
  const teamFundTicketShare = memberTeamFundTicketShare(state, currentPickleballMemberId, today)
  const ticketAmount = p2pTicketBalance - teamFundTicketShare
  const ticketStats = buildTicketMonthStats(state, today)
  const ticketFund = buildTicketFundSummary(state, today)
  const teamFundOverview = buildPickleballTeamFundData(state, currentYearMonth)
  const memberBalance = buildMemberMonthBalance(state, pickle, monthSessions, currentPickleballMemberId, today)
  const breakdown = buildPickleBreakdown(pickle, monthSessions, currentPickleballMemberId, summary, ticketAmount, memberBalance)
  const currentMember = members.find(member => String(member.id || member.member_id) === String(currentPickleballMemberId))
  const ticketAdjustment = -ticketAmount
  const scheduleWeekdays = normalizeWeekdays(
    monthlyConfig?.scheduleWeekdays ||
    monthlyConfig?.schedule_weekdays ||
    pickleConfig?.scheduleWeekdays ||
    pickleConfig?.schedule_weekdays ||
    pickleConfig?.weekdays ||
    pickleConfig?.scheduleDays ||
    pickleConfig?.schedule_days ||
    group?.scheduleWeekdays ||
    group?.schedule_weekdays ||
    group?.scheduleDays
  )

  return {
    clubName: state?.currentGroup?.name || 'CLB Pickleball',
    monthLabel: formatMonthLabel(today),
    currentYearMonth,
    isFlexBilling,
    scheduleConfig: {
      clubName: pickleConfig?.clubName || pickleConfig?.club_name || group?.name || '',
      weekdays: scheduleWeekdays,
      timeRange: monthlyConfig?.scheduleTime || monthlyConfig?.schedule_time || pickleConfig?.scheduleTime || pickleConfig?.schedule_time || pickleConfig?.timeRange || group?.scheduleTime || group?.schedule_time || '',
      startDate: monthlyConfig?.scheduleStartDay || monthlyConfig?.schedule_start_day || pickleConfig?.startDate || pickleConfig?.start_date || '',
      autoGenerate: pickleConfig?.autoGenerate ?? pickleConfig?.auto_generate ?? true,
    },
    memberCount: activeMemberIds.length,
    todaySession: todaySession ? toOverviewSessionCard(todaySession, pickle, members, overviewScheduleTime, monthSessions.filter(s => !isMovedSession(s)), state?.currentGroup?.name || '') : null,
    progress: {
      attended: myAttendedCount,
      total: monthSessions.filter(s => !isMovedSession(s)).length || 1,
      completed: completedSessions,
      ticketDatesInMonth: approvedMonthTickets.length,
    },
    monthCosts: {
      court: courtFee,
      courtSub: `${activeMemberIds.length} thành viên cố định`,
      water,
      waterSub: `${monthSessions.filter(s => sessionWaterAmount(s) > 0).length} buổi đã ghi`,
      ticketFund: ticketFund.teamFundTotal,
      ticketFundSub: `${ticketFund.teamFundCount} lượt quỹ trả hộ`,
      ticketSessions: ticketStats.sessionCount,
      ticketTotal: ticketStats.totalAmount,
    },
    yourBalance: {
      total: memberBalance.netBalance,
      name: currentMember?.displayName || currentMember?.name || 'Bạn',
      initial: initials(currentMember),
      color: currentMember?.color,
      statusLabel: memberBalance.netBalance > 0 ? 'Được quỹ bù' : memberBalance.netBalance < 0 ? 'Cần nộp' : 'Đã cân bằng',
      ticketAdjustment,
      ticketType: memberBalance.ticketType ?? null,
      summaryCards: buildPersonalPickleSummaryCards(monthSessions, memberBalance, ticketAdjustment, currentPickleballMemberId, currentGroupMembers(state).filter(isActiveMember), isFlexBilling, state, today),
      breakdown,
    },
    yourTickets: buildPersonalTicketOverview(state, currentPickleballMemberId, today),
    ticketStats,
    ticketFund,
    teamFundOverview,
    shouldAutoGenerate,
    autoGenerateRequest: shouldAutoGenerate ? {
      yearMonth: currentYearMonth,
      config: autoGenerateConfig,
    } : null,
    autoGenerateKey: shouldAutoGenerate ? `${state?.currentGroupId || state?.currentGroup?.id || 'group'}:${currentYearMonth}` : '',
  }
}

export function buildPickleballTeamFundData(state, selectedYearMonth = monthKey(new Date())) {
  const today = dateFromYearMonth(selectedYearMonth)
  const currentYearMonth = monthKey(today)
  const nextYearMonth = shiftMonthKey(currentYearMonth, 1)
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const nextMonthlyConfig = currentMonthlyPickleConfig(state, nextYearMonth)
  const monthSessions = getStateMonthSessions(state, today)
  const ticketStats = buildTicketMonthStats(state, today)
  const ticketFund = buildTicketFundSummary(state, today)
  const teamFundDirectTotal = ticketFund.teamFundTotal || 0
  const ticketRows = buildTeamFundTicketRows(state, today)
  const ticketParticipantRows = buildTeamFundTicketParticipantRows(state, today)
  const isFlexBilling = isBillingModeFlexForMonth(state, currentYearMonth)
  const flexMonthlyTicketPrice = Number(monthlyConfig?.monthlyTicketPrice ?? monthlyConfig?.monthly_ticket_price ?? 0)
  const flexPerSessionTicketPrice = Number(monthlyConfig?.perSessionTicketPrice ?? monthlyConfig?.per_session_ticket_price ?? 0)
  const flexMembers = currentGroupMembers(state).filter(isActiveMember)
  const flexMonthlyMembers = flexMembers.filter(member => memberFlexTicketType(state, member.id, currentYearMonth) === 'monthly')
  const flexPerSessionMembers = flexMembers.filter(member => memberFlexTicketType(state, member.id, currentYearMonth) === 'per_session')
  const flexMonthlyRevenue = flexMonthlyMembers.length * flexMonthlyTicketPrice
  const flexPerSessionRevenue = monthSessions.reduce((sum, session) => {
    const presentIds = new Set(effectiveSessionMemberIdsFlex(session).map(String))
    const attendeeCount = flexPerSessionMembers.filter(member => presentIds.has(String(member.id))).length
    return sum + attendeeCount * flexPerSessionTicketPrice
  }, 0)
  const flexTotalDue = flexMonthlyRevenue + flexPerSessionRevenue
  const currentFixedMembers = currentGroupMembers(state)
    .filter(member => isActiveMember(member) && isFixedForMonth(state, member, currentYearMonth))
  const courtFeeTotal = Number(monthlyConfig?.courtFee ?? monthlyConfig?.court_fee ?? state?.pickle?.monthlyCourtFee ?? 0) || 0
  const nextCourtFeeTotal = Number(nextMonthlyConfig?.courtFee ?? nextMonthlyConfig?.court_fee ?? courtFeeTotal) || 0
  const ticketPrice = Number(monthlyConfig?.ticketPrice ?? monthlyConfig?.ticket_price ?? 50000) || 50000
  const monthTickets = monthTicketsForState(state, today)
  const ticketWaterForFund = monthTickets.reduce((sum, t) => sum + Number(t?.waterAmount ?? t?.water_amount ?? 0), 0)
  const waterTotal = monthSessions.reduce((sum, session) => sum + sessionWaterAmount(session), 0) + ticketWaterForFund
  const extrasTotal = monthSessions.reduce((sum, session) => {
    return sum + sessionCostsForSession(state, session, currentFixedMembers).extras
      .reduce((extraSum, item) => extraSum + (Number(item.amount) || 0), 0)
  }, 0)
  const ownerPayments = currentGroupOwnerPayments(state)
  const venueBank = venueBankForCurrentGroup(state)
  const paymentDraftItems = [
    { key: 'water', label: 'Tiền nước', yearMonth: currentYearMonth, amount: waterTotal },
    { key: 'extras', label: 'Phát sinh', yearMonth: currentYearMonth, amount: extrasTotal },
    ...(isFlexBilling
      ? [
        { key: 'flex_monthly', label: 'Vé tháng thu về', yearMonth: currentYearMonth, amount: flexMonthlyRevenue },
        { key: 'flex_per_session', label: 'Vé lẻ thu về', yearMonth: currentYearMonth, amount: flexPerSessionRevenue },
      ]
      : [
        { key: 'tickets', label: 'Vé lẻ team', yearMonth: currentYearMonth, amount: teamFundDirectTotal },
        { key: 'next_court', label: 'Tiền sân tháng này', yearMonth: currentYearMonth, amount: courtFeeTotal },
      ]),
  ].map(item => ({
    ...item,
    paid: ownerPaymentCoversItem(ownerPayments, item.key, item.yearMonth),
  }))
  const costRows = isFlexBilling ? [
    {
      key: 'water',
      label: 'Tiền nước',
      amount: waterTotal,
      paidToOwner: monthSessions.some(session => isPaidToOwner(session?.waterPayment || session?.water_payment)) ||
        ownerPaymentCoversItem(ownerPayments, 'water', currentYearMonth),
    },
    {
      key: 'extras',
      label: 'Phát sinh',
      amount: extrasTotal,
      paidToOwner: monthSessions.some(session => sessionCostsForSession(state, session, currentFixedMembers).extras.some(isPaidToOwner)) ||
        ownerPaymentCoversItem(ownerPayments, 'extras', currentYearMonth),
    },
    {
      key: 'flex_monthly',
      label: 'Vé tháng thu về',
      amount: flexMonthlyRevenue,
      paidToOwner: ownerPaymentCoversItem(ownerPayments, 'flex_monthly', currentYearMonth),
    },
    {
      key: 'flex_per_session',
      label: 'Vé lẻ thu về',
      amount: flexPerSessionRevenue,
      paidToOwner: ownerPaymentCoversItem(ownerPayments, 'flex_per_session', currentYearMonth),
    },
  ] : [
    {
      key: 'court',
      label: 'Tiền sân',
      amount: courtFeeTotal,
      paidToOwner: isPaidToOwner(monthlyConfig) || ownerPaymentCoversItem(ownerPayments, 'next_court', currentYearMonth),
    },
    {
      key: 'water',
      label: 'Tiền nước',
      amount: waterTotal,
      paidToOwner: monthSessions.some(session => isPaidToOwner(session?.waterPayment || session?.water_payment)) ||
        ownerPaymentCoversItem(ownerPayments, 'water', currentYearMonth),
    },
    {
      key: 'extras',
      label: 'Phát sinh',
      amount: extrasTotal,
      paidToOwner: monthSessions.some(session => sessionCostsForSession(state, session, currentFixedMembers).extras.some(isPaidToOwner)) ||
        ownerPaymentCoversItem(ownerPayments, 'extras', currentYearMonth),
    },
    {
      key: 'tickets',
      label: 'Vé lẻ team',
      amount: teamFundDirectTotal,
      paidToOwner: ownerPaymentCoversItem(ownerPayments, 'tickets', currentYearMonth),
    },
  ]

  return {
    groupId: currentGroup(state)?.id,
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(today),
    currentYearMonth,
    isFlexBilling,
    flexMonthlyTicketPrice,
    flexPerSessionTicketPrice,
    flexMonthlyMemberCount: flexMonthlyMembers.length,
    flexPerSessionMemberCount: flexPerSessionMembers.length,
    flexMonthlyRevenue,
    flexPerSessionRevenue,
    flexTotalDue,
    courtFeeTotal,
    ticketPrice,
    sessionsCount: monthSessions.length,
    memberCount: currentFixedMembers.length,
    ticketStats,
    ticketFund,
    teamFundDirectTotal,
    ticketRows,
    ticketParticipantRows,
    venueBank,
    nextMonth: {
      yearMonth: nextYearMonth,
      courtFee: nextCourtFeeTotal,
    },
    paymentDraft: {
      items: paymentDraftItems,
      totalAmount: paymentDraftItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    },
    ownerPayments: ownerPayments.map(payment => ({
      id: payment.id,
      yearMonth: payment.yearMonth || payment.year_month,
      paidAt: payment.paidAt || payment.paid_at,
      totalAmount: Number(payment.totalAmount ?? payment.total_amount) || 0,
      bankSnapshot: payment.bankSnapshot || payment.bank_snapshot || {},
      items: safeArray(payment.items),
      note: payment.note || '',
    })),
    costRows,
  }
}

function buildTeamFundTicketRows(state, date) {
  return monthTicketsForState(state, date || new Date())
    .filter(ticket => ticketStatus(ticket) !== 'pending_review')
    .sort((a, b) => parseDateValue(ticketDate(a)) - parseDateValue(ticketDate(b)))
    .map((ticket, index) => {
      const row = toTicketRow(ticket, index, state)
      return {
        ...row,
        sourceLabel: row.status === 'team_fund' ? 'Quỹ team trả hộ' : `${row.advancerName || 'Người ứng'} ứng`,
        ledgerRows: buildTicketLedgerRows(ticket, state),
      }
    })
}

function buildTicketLedgerRows(ticket, state) {
  const status = ticketStatus(ticket)
  const members = safeArray(state?.members)
  const memberIds = ticketMemberIds(ticket)
  const perPerson = ticketAmountPerPerson(ticket)
  const advancerId = ticketAdvancerId(ticket)
  const rows = []

  if (status === 'unpaid' && advancerId) {
    const otherMemberIds = memberIds.filter(memberId => String(memberId) !== String(advancerId))
    const member = members.find(row => String(row?.id || row?.member_id) === String(advancerId)) || { id: advancerId }
    const creditAmount = perPerson * (memberIds.some(memberId => String(memberId) === String(advancerId)) ? otherMemberIds.length : memberIds.length)
    if (creditAmount > 0) {
      rows.push({
        memberId: advancerId,
        name: member.displayName || member.name || memberName(advancerId, members),
        initial: initials(member),
        color: member.color,
        amount: creditAmount,
        roleLabel: 'Người khác trả lại',
      })
    }
  }

  memberIds.forEach(memberId => {
    if (status === 'unpaid' && String(memberId) === String(advancerId)) return
    const member = members.find(row => String(row?.id || row?.member_id) === String(memberId)) || { id: memberId }
    rows.push({
      memberId,
      name: member.displayName || member.name || memberName(memberId, members),
      initial: initials(member),
      color: member.color,
      amount: -perPerson,
      roleLabel: status === 'team_fund' ? 'Quỹ trả hộ' : 'Phần tham gia',
    })
  })

  return rows
}

function buildTeamFundTicketParticipantRows(state, date) {
  const memberMap = new Map()
  monthTicketsForState(state, date || new Date())
    .filter(ticket => ticketStatus(ticket) !== 'pending_review')
    .forEach(ticket => {
      buildTicketLedgerRows(ticket, state).forEach(item => {
        const memberId = item.memberId
        if (!memberMap.has(String(memberId))) {
          const member = safeArray(state?.members).find(row => String(row?.id || row?.member_id) === String(memberId)) || {}
          memberMap.set(String(memberId), {
            memberId,
            name: member.displayName || member.name || 'Thành viên',
            initial: initials(member),
            color: member.color,
            sessions: 0,
            amount: 0,
          })
        }
        const row = memberMap.get(String(memberId))
        row.sessions += 1
        row.amount += Number(item.amount) || 0
      })
    })
  return [...memberMap.values()].sort((a, b) => b.amount - a.amount || b.sessions - a.sessions)
}

function shiftMonthKey(yearMonth, delta) {
  const [year, month] = String(yearMonth || monthKey(new Date())).split('-').map(Number)
  const date = new Date(year, (month || 1) - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function venueBankForCurrentGroup(state) {
  const group = currentGroup(state)
  return {
    ownerName: group.venueOwnerName || group.venue_owner_name || '',
    bankName: group.venueBankName || group.venue_bank_name || '',
    bankAccount: group.venueBankAccount || group.venue_bank_account || '',
  }
}

function currentGroupOwnerPayments(state) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  return safeArray(state?.pickle?.ownerPayments || state?._allPickle?.ownerPayments)
    .filter(payment => !groupId || String(payment?.groupId || payment?.group_id || '') === String(groupId))
}

function ownerPaymentCoversItem(payments, key, yearMonth) {
  return safeArray(payments).some(payment => {
    return safeArray(payment?.items).some(item => (
      String(item?.key || item?.type || '') === String(key) &&
      String(item?.yearMonth || item?.year_month || payment?.yearMonth || payment?.year_month || '') === String(yearMonth)
    ))
  })
}

function isPaidToOwner(value) {
  if (!value || typeof value !== 'object') return false
  if (value.paidToOwner || value.paid_to_owner || value.ownerPaid || value.owner_paid) return true
  if (value.paidToCourt || value.paid_to_court || value.courtPaid || value.court_paid) return true
  const status = String(value.paymentStatus || value.payment_status || value.ownerPaymentStatus || value.owner_payment_status || '').toLowerCase()
  return ['paid', 'settled', 'done'].includes(status)
}

function buildProfileData(me, state, pickle) {
  const today = new Date()
  const monthSessions = getMonthSessions(pickle, today)
  const currentUserId = state?.currentUserId
  const attended = attendanceByMemberId(monthSessions, currentUserId, currentGroupMembers(state).filter(isActiveMember))
  const total = monthSessions.length
  const balance = pickleSummary(pickle || {})?.memberOwes?.[currentUserId] || 0
  const bankName = me?.bankName || me?.bank_name || ''
  const bankAccount = me?.bankAccount || me?.bank_account || ''
  const bankAccountName = me?.bankAccountName || me?.bank_account_name || me?.name || ''

  return {
    name: me?.displayName || me?.name || state?.currentUserName || 'Bạn',
    initials: initials(me || { name: state?.currentUserName }),
    color: me?.color || '#6366f1',
    user: {
      id: currentUserId,
      profileId: me?.profileId || me?.profile_id || currentUserId,
      name: me?.displayName || me?.name || state?.currentUserName || 'Bạn',
      email: '',
      initial: initials(me || { name: state?.currentUserName }).slice(0, 2),
      club: state?.currentGroup?.name || 'Spliteasy',
      color: me?.color || '#6366f1',
      photoUrl: memberPhotoUrl(me, state?.members),
    },
    profileColor: profileColorIndex(me?.color),
    monthStats: {
      label: formatMonthLabel(today),
      sessions: {
        attended,
        total,
        deltaLabel: `${attended}/${total} buổi tháng này`,
      },
      balance,
      balanceLabel: balance < 0 ? 'Còn nợ quỹ CLB' : balance > 0 ? 'Đang được nhận' : 'Cân bằng',
    },
    bank: {
      bankName,
      bankAccount,
      accountName: bankAccountName,
      name: bankName,
      code: bankCode(bankName),
      maskedAccount: maskBankAccount(bankAccount),
      owner: bankAccountName,
    },
    pin: Boolean(me?.hasPin || me?.has_pin),
  }
}

function buildSessionDetailData(state, pickle, sessionId, currentUserId, members) {
  const allSessions = uniqueSessions([...safeArray(pickle?.sessions), ...safeArray(pickle?.upcoming)])
  const session = allSessions.find(s => String(s.id) === String(sessionId)) || findNearestOpenSession(pickle, new Date()) || allSessions[0]
  if (!session) return null

  const fixedMembers = safeArray(pickle?.fixedMembers)
  const groupMembers = membersForCurrentPickle(state, members, fixedMembers)
  const presentIds = effectiveSessionMemberIds(session, groupMembers)
  const presentSet = new Set(presentIds.map(String))
  const presentMembers = groupMembers
    .filter(member => presentSet.has(String(member.id)))
    .map(member => personChip(member))
  const absentMembers = groupMembers
    .filter(member => !presentSet.has(String(member.id)))
    .map(member => personChip(member))
  const guests = sessionGuests(session).map((guest, index) => ({
    id: guest.id || guest.guest_id || `guest-${index}`,
    name: guest.guestName || guest.guest_name || guest.name || `Khách ${index + 1}`,
    initial: initials({ name: guest.guestName || guest.guest_name || guest.name || 'K' }),
  }))
  const monthSessions = getMonthSessions(pickle, parseDate(sessionDate(session)) || new Date())
  const courtPerPerson = perPersonCourtFee(pickle, monthSessions)
  const explicitPresentIds = new Set([
    ...sessionMemberIds(session).map(String),
    ...sessionAttendanceRecords(session).filter(r => r.status !== 'absent').map(r => String(r.memberId)),
  ].filter(Boolean))
  const casualPresentIds = Array.from(explicitPresentIds).filter(id => memberType(groupMembers.find(member => String(member.id) === String(id))) === 'casual')
  const fixedCount = Math.max(fixedMembers.length, groupMembers.filter(member => memberType(member) === 'fixed').length, 1)
  const rebatePerFixed = casualPresentIds.length > 0 ? Math.round(casualPresentIds.length * courtPerPerson / fixedCount) : 0
  const netCourtPerPerson = Math.max(courtPerPerson - rebatePerFixed, 0)
  const waterTotal = sessionWaterAmount(session)
  const splitCount = presentMembers.length + guests.length
  const waterPerPerson = splitCount > 0 ? Math.round(waterTotal / splitCount) : 0
  const accessories = sessionAccessories(session, members, presentIds)
  const accessoriesPerPerson = accessories.reduce((sum, item) => (
    sum + (item.appliesTo.length ? Math.round(item.total / item.appliesTo.length) : 0)
  ), 0)

  return {
    id: session.id,
    number: sessionNumber(session, allSessions),
    groupName: state?.currentGroup?.name || 'CLB Pickleball',
    dateLabel: formatSessionDetailDate(sessionDate(session)),
    timeRange: sessionTimeRange(session, true),
    courtName: sessionCourt(session),
    courtAddress: sessionAddress(session),
    status: sessionStatusLabel(session),
    presentMembers,
    absentMembers,
    guests,
    courtFee: {
      perPerson: netCourtPerPerson,
      sub: `${Math.round((Number(pickle?.monthlyCourtFee) || 0) / Math.max(monthSessions.length, 1)).toLocaleString('vi-VN')} đ/buổi ÷ ${Math.max(fixedMembers.length, groupMembers.length, 1)} TV${casualPresentIds.length > 0 ? ` · ${casualPresentIds.length} vãng lai` : ''}`,
    },
    waterFee: {
      perPerson: waterPerPerson,
      total: waterTotal,
      sub: `${waterTotal.toLocaleString('vi-VN')} đ ÷ ${Math.max(splitCount, 1)} người`,
    },
    accessories,
    totalPerPerson: netCourtPerPerson + waterPerPerson + accessoriesPerPerson,
    currentUserId,
  }
}

export function buildPickleballCalendarData(state, params = {}) {
  const today = new Date()
  const monthDate = calendarMonthDate(params, today)
  const currentYearMonth = monthKey(monthDate)
  const currentGroupId = state?.currentGroupId || state?.currentGroup?.id
  const sessions = getStateMonthSessions(state, monthDate)
  const allSessions = getAllSessions(state)
  const staleReplacements = staleReplacementSessionsForMonth(state, monthDate, allSessions)
  const autoGenerateConfig = buildSessionGenerationConfig(state, currentYearMonth)
  const shouldAutoGenerate = !state?._pickleRegenInProgress && hasMissingGeneratedSessions(state, currentYearMonth, sessions, autoGenerateConfig)
  const sessionsByDay = new Map()
  sessions.forEach(session => {
    const date = parseDate(sessionDate(session))
    if (!date) return
    const day = date.getDate()
    sessionsByDay.set(day, preferredCalendarDaySession(sessionsByDay.get(day), session))
  })
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const ticketPrice = Number(monthlyConfig?.ticketPrice ?? monthlyConfig?.ticket_price ?? 50000) || 50000
  const ticketRows = monthTicketsForState(state, monthDate)
    .sort((a, b) => parseDateValue(ticketDate(a)) - parseDateValue(ticketDate(b)))
    .map((ticket, index) => toTicketRow(ticket, index, state))
  const ticketsByDate = new Map()
  ticketRows.forEach(ticket => {
    if (!ticket.date) return
    ticketsByDate.set(ticket.date, [...(ticketsByDate.get(ticket.date) || []), ticket])
  })
  const calendarSessions = sessions.map(session => toCalendarSessionDetail(state, session, sessions, today))
  const isCurrentMonth = currentYearMonth === monthKey(today)
  const requestedSelectedDate = params?.selectedDate || params?.selected_date || ''
  const selectedSession = requestedSelectedDate
    ? calendarSessions.find(session => session.date === requestedSelectedDate) || null
    : isCurrentMonth
    ? calendarSessions.find(session => session.date === dateKey(today)) || calendarSessions[0] || null
    : calendarSessions[0] || null
  const selectedDate = requestedSelectedDate || selectedSession?.date || dateKey(today)
  const casualMembers = safeArray(state?.members)
    .filter(member => String(member?.groupId || member?.group_id || '') === String(currentGroupId || ''))
    .filter(isActiveMember)
    .filter(member => !isFixedForMonth(state, member, currentYearMonth))
    .map(member => ({
      id: member.id,
      name: member.displayName || member.name || '',
    }))
    .filter(member => member.id && member.name)

  return {
    groupId: currentGroup(state)?.id,
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(monthDate),
    selectedSessionDay: selectedSession ? Number(String(selectedSession.date).slice(-2)) : Number(String(selectedDate).slice(-2)) || (isCurrentMonth ? today.getDate() : 1),
    selectedSessionDate: selectedDate,
    days: buildCalendarDays(monthDate, sessionsByDay, state, ticketsByDate),
    sessions: calendarSessions,
    selectedSession,
    tickets: ticketRows,
    selectedTickets: ticketsByDate.get(selectedDate) || [],
    ticketMembers: buildTicketPickerMembers(state, currentYearMonth),
    ticketPrice,
    ticketPricePerPerson: ticketPrice,
    staleReplacementCleanup: staleReplacements.length > 0 ? {
      action: 'cleanupStaleReplacementSessions',
      ids: staleReplacements.map(session => session.id).filter(Boolean),
    } : null,
    shouldAutoGenerate,
    autoGenerateRequest: shouldAutoGenerate ? {
      yearMonth: currentYearMonth,
      config: autoGenerateConfig,
    } : null,
    autoGenerateKey: shouldAutoGenerate ? `${state?.currentGroupId || state?.currentGroup?.id || 'group'}:${currentYearMonth}` : '',
    casualMembers,
  }
}

function calendarMonthDate(params, fallbackDate) {
  const source = typeof params === 'string'
    ? params
    : (params?.yearMonth || params?.year_month || params?.month)
  const match = String(source || '').match(/^(\d{4})-(\d{1,2})$/)
  if (!match) return fallbackDate
  const [, year, month] = match
  const date = new Date(Number(year), Number(month) - 1, 1)
  return Number.isNaN(date.getTime()) ? fallbackDate : date
}

function buildPickleballMembersData(state, selectedYearMonth) {
  const today = dateFromYearMonth(selectedYearMonth)
  const yearMonth = monthKey(today)
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  const allMemberRows = currentGroupMembers(state).map(member => ({
    id: member.id,
    name: member.displayName || member.name || '',
    displayName: member.displayName || member.name || '',
    isActive: isActiveMember(member),
    is_active: member.is_active,
  }))
  const activeMembers = dedupeMemberRowsByProfileOrName(currentGroupMembers(state).filter(isActiveMember))
  const sessions = getStateMonthSessions(state, today).filter(session => !isMovedSession(session))
  const confirmedSessions = sessions.filter(s => isDoneStatus(s?.status))
  const joinRequests = currentJoinRequests(state)
  const fixedMembers = activeMembers.filter(member => isFixedForMonth(state, member, selectedYearMonth))
  const casualMembers = dedupeMemberRowsByProfileOrName(activeMembers.filter(member => !isFixedForMonth(state, member, selectedYearMonth)))
  const joinRequestRows = joinRequests.map(request => {
    const created = parseDate(request.createdAt || request.created_at)
    return {
      id: request.id,
      initial: initials({ name: request.name }),
      name: request.name || 'Thành viên mới',
      sentLabel: relativeTimeLabel(created),
    }
  })

  const fixedRows = fixedMembers.map(member => toPickleballMemberRow({ ...member, memberType: 'fixed' }, confirmedSessions, sessions.length, fixedMembers))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
  const casualRows = casualMembers.map(member => toPickleballMemberRow({ ...member, memberType: 'casual' }, confirmedSessions, sessions.length, []))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))

  return {
    groupId: currentGroup(state)?.id,
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(today),
    currentYearMonth: yearMonth,
    billingMode: isBillingModeFlexForMonth(state, yearMonth) ? 'flex' : 'fixed',
    monthlyTicketMemberIds: safeArray(monthlyConfig?.monthlyTicketMemberIds ?? monthlyConfig?.monthly_ticket_member_ids),
    perSessionTicketMemberIds: safeArray(monthlyConfig?.perSessionTicketMemberIds ?? monthlyConfig?.per_session_ticket_member_ids),
    stats: {
      active: activeMembers.length,
      permanent: fixedRows.length,
      fixed: fixedRows.length,
      guests: casualRows.length,
      casual: casualRows.length,
      total: activeMembers.length,
      pendingJoin: joinRequests.length,
      pending: joinRequests.length,
    },
    joinRequests: joinRequestRows,
    members: fixedRows,
    guests: casualRows,
    fixedMembers: fixedRows,
    casualMembers: casualRows,
    allMembers: allMemberRows,
    memberCandidates: buildGroupMemberCandidates(currentGroup(state), state?.members, state?.profiles, { mode: 'pickleball', groups: state?.groups }),
    legacyGuests: buildGuestRows(sessions),
  }
}

export function buildPickleballSettingsData(state, selectedYearMonth = monthKey(new Date())) {
  const today = dateFromYearMonth(selectedYearMonth)
  const yearMonth = monthKey(today)
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  const activeMembers = dedupeMemberRowsByProfileOrName(currentGroupMembers(state).filter(isActiveMember))
    .map(member => ({
      id: member.id,
      name: member.displayName || member.name || 'Thành viên',
      initial: initials(member),
      role: member.role || 'member',
      isTreasurer: member.role === 'treasurer',
      photoUrl: memberPhotoUrl(member, state?.members),
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))

  return {
    yearMonth,
    billingMode: monthlyConfig?.billingMode ?? monthlyConfig?.billing_mode ?? 'fixed',
    courtFee: Number(monthlyConfig?.courtFee ?? monthlyConfig?.court_fee ?? 0),
    fixedMemberIds: safeArray(monthlyConfig?.fixedMemberIds ?? monthlyConfig?.fixed_member_ids),
    monthlyTicketPrice: Number(monthlyConfig?.monthlyTicketPrice ?? monthlyConfig?.monthly_ticket_price ?? 0),
    perSessionTicketPrice: Number(monthlyConfig?.perSessionTicketPrice ?? monthlyConfig?.per_session_ticket_price ?? 0),
    monthlyTicketMemberIds: safeArray(monthlyConfig?.monthlyTicketMemberIds ?? monthlyConfig?.monthly_ticket_member_ids),
    perSessionTicketMemberIds: safeArray(monthlyConfig?.perSessionTicketMemberIds ?? monthlyConfig?.per_session_ticket_member_ids),
    members: activeMembers,
    groupId: currentGroup(state)?.id,
    monthLabel: formatMonthLabel(today),
    clubName: currentGroupName(state, 'CLB Pickleball'),
  }
}

function buildMemberDetailData(state, memberId, selectedYearMonth) {
  const pickle = state?.pickle || {}
  const monthDate = dateFromYearMonth(selectedYearMonth)
  const sessions = getStateMonthSessions(state, monthDate)
  const members = currentGroupMembers(state).filter(isActiveMember)
  const member = members.find(row => String(row.id) === String(memberId)) || members[0]
  if (!member) return null

  const attendance = buildMemberAttendance(sessions, member.id, members.filter(row => memberType(row) === 'fixed'))
  const balance = buildMemberMonthBalance(state, pickle, sessions, member.id)

  return {
    groupId: currentGroup(state)?.id,
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(monthDate),
    id: member.id,
    name: member.displayName || member.name || 'Thành viên',
    initial: initials(member),
    initials: initials(member),
    photoUrl: memberPhotoUrl(member, state?.members),
    color: member.color,
    role: member.role || 'member',
    type: memberType(member),
    typeLabel: memberType(member) === 'fixed' ? 'Cố định' : 'Vãng lai',
    isTreasurer: member.role === 'treasurer',
    isCurrentUser: String(member.id) === String(state?.currentUserId || ''),
    joinDate: fullExpenseDate(member.createdAt || member.created_at),
    joinedLabel: monthYearLabel(member.createdAt || member.created_at),
    bankName: member?.bankName || member?.bank_name || '',
    bankAccountName: member?.bankAccountName || member?.bank_account_name || '',
    bankAccount: member?.bankAccount || member?.bank_account || '',
    payerTransactions: buildMemberTransactions(currentGroup(state), member.id, selectedYearMonth, members),
    attendance,
    balance,
    rank: calculateMemberRank(attendance.percentage),
    member: {
      id: member.id,
      name: member.displayName || member.name || 'Thành viên',
      role: member.role || 'member',
      type: memberType(member),
      joinDate: fullExpenseDate(member.createdAt || member.created_at),
      bankName: member?.bankName || member?.bank_name || '',
      bankAccountName: member?.bankAccountName || member?.bank_account_name || '',
      bankAccount: member?.bankAccount || member?.bank_account || '',
    },
  }
}

function expectedPickleballSessionCountForMonth(state, yearMonth, sessions) {
  const group = currentGroup(state)
  const config = currentPickleConfig(state)
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  const configuredCount = Number(monthlyConfig?.sessionsCount ?? monthlyConfig?.sessions_count ?? config?.sessionsCount ?? config?.sessions_count ?? 0)
  const configuredWeekdays = normalizeIsoWeekdays(
    monthlyConfig?.scheduleWeekdays ||
    monthlyConfig?.schedule_weekdays ||
    config?.scheduleWeekdays ||
    config?.schedule_weekdays ||
    config?.weekdays ||
    config?.scheduleDays ||
    config?.schedule_days ||
    group?.scheduleWeekdays ||
    group?.schedule_weekdays ||
    group?.scheduleDays
  )
  if (configuredWeekdays.length > 0) {
    const generationConfig = buildSessionGenerationConfig(state, yearMonth)
    const expectedDates = generatedSessionDatesForMonth(yearMonth, {
      ...generationConfig,
      scheduleWeekdays: configuredWeekdays,
    })
    if (expectedDates.length > 0) return expectedDates.length
  }
  if (configuredCount > 0) return configuredCount
  return sessions.length
}

export function buildPickleballTicketsData(state) {
  const today = new Date()
  const currentMonth = monthKey(today)
  const monthlyConfig = currentMonthlyPickleConfig(state, currentMonth)
  const ticketPrice = Number(monthlyConfig?.ticketPrice ?? monthlyConfig?.ticket_price ?? 50000) || 50000
  const monthSessions = getStateMonthSessions(state, today)
  const monthTickets = monthTicketsForState(state, today)
    .sort((a, b) => parseDateValue(ticketDate(a)) - parseDateValue(ticketDate(b)))
  const tickets = monthTickets.map((ticket, index) => toTicketRow(ticket, index, state)).reverse()
  const unpaid = tickets.filter(ticket => ticket.status === 'unpaid')
  const pending = tickets.filter(ticket => ticket.status === 'pending_review')
  const teamFund = tickets.filter(ticket => ticket.status === 'team_fund')
  const approvedTickets = tickets.filter(ticket => ticket.status !== 'pending_review')
  const totalAmount = approvedTickets.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0)
  const members = buildTicketPickerMembers(state, currentMonth)

  return {
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(today),
    summary: {
      total: tickets.length,
      used: approvedTickets.length,
      remaining: unpaid.length,
      expiringSoon: tickets.filter(ticket => ticket.expiringSoon).length,
      monthLabel: formatMonthLabel(today),
      sessionCount: approvedTickets.length,
      totalAttendances: approvedTickets.reduce((sum, ticket) => sum + safeArray(ticket.memberIds).length, 0),
      totalAmount,
      pending: {
        count: pending.length,
        amount: pending.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0),
      },
      unpaid: {
        count: unpaid.length,
        amount: unpaid.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0),
      },
      teamFund: {
        status: 'team_fund',
        count: teamFund.length,
        amount: teamFund.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0),
      },
    },
    filters: [
      { key: 'all', label: `Tất cả · ${tickets.length}` },
      { key: 'pending', label: `🕓 Chờ duyệt · ${pending.length}` },
      { key: 'unpaid', label: `⏳ Người ứng · ${unpaid.length}` },
      { key: 'team', label: `🏦 Quỹ team · ${teamFund.length}` },
    ],
    filter: 'all',
    activeFilter: 'all',
    members,
    ticketPrice,
    ticketPricePerPerson: ticketPrice,
    defaultTicketAmountPerPerson: ticketPrice,
    tickets,
  }
}

function buildTicketPickerMembers(state, yearMonth) {
  const activeMembers = currentGroupMembers(state).filter(isActiveMember)
  const isFlex = isBillingModeFlexForMonth(state, yearMonth)
  const sessions = [0, -1, -2].flatMap(delta => getStateMonthSessions(state, shiftMonthKey(yearMonth, delta)))
  return activeMembers
    .map((member, index) => ({
      id: member.id,
      name: member.displayName || member.name || 'Thành viên',
      initial: initials(member),
      color: member.color,
      ticketType: isFlex ? memberFlexTicketType(state, member.id, yearMonth) : null,
      sessionsAttended: attendanceByMemberId(sessions, member.id, activeMembers, true),
      _index: index,
    }))
    .sort((a, b) => b.sessionsAttended - a.sessionsAttended || a._index - b._index)
    .map(({ _index, ...member }) => member)
}

function buildBatchEntryData(state, params = {}) {
  const today = new Date()
  const monthDate = calendarMonthDate(params, today)
  const members = currentGroupMembers(state)
  const tickets = monthTicketsForState(state, monthDate).map(t => ({
    id: t.id,
    date: String(t.session_date || t.date || '').slice(0, 10),
    totalAmount: t.total_amount || t.totalAmount || 0,
    memberIds: t.member_ids || t.memberIds || [],
    advancerId: t.advancer_id || t.advancerId || null,
    status: t.status || 'team_fund',
  }))
  const sessions = getStateMonthSessions(state, monthDate)
    .slice()
    .sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))
    .map((session, index, all) => {
      const presentIds = sessionMemberIds(session)
      const guests = sessionGuests(session)
      const hasAttendance = presentIds.length > 0 || guests.length > 0
      const costs = sessionCostsForSession(state, session, members)
      const water = costs.waterAmount
      return {
        id: session.id || `session-${index}`,
        sessionId: session.id || `session-${index}`,
        number: sessionNumber(session, all),
        date: sessionDate(session),
        dateLabel: formatSessionDetailDate(sessionDate(session)),
        timeLabel: sessionTime(session),
        status: hasAttendance ? 'done' : 'pending',
        attendees: Math.max(presentIds.length, 1),
        guests: guests.length,
        water,
        extras: costs.extras,
        members: members.map(personChip),
        accessories: batchAccessories(session, members, presentIds),
        memberIds: presentIds,
      }
    })
  const completedCount = sessions.filter(session => session.status === 'done').length
  const pendingCount = sessions.length - completedCount

  return {
    monthLabel: formatMonthLabel(monthDate),
    completedCount,
    pendingCount,
    sessions,
    tickets,
    summary: {
      water: sessions.reduce((sum, session) => sum + (Number(session.water) || 0), 0),
      accessories: sessions.reduce((sum, session) => (
        sum + safeArray(session.extras || session.accessories).reduce((itemSum, item) => itemSum + (Number(item.amount) || 0), 0)
      ), 0),
    },
    members: members.map(personChip),
  }
}

function buildPaymentFlowData(state, memberId) {
  const group = currentGroup(state)
  const members = currentGroupMembers(state)
  const balanceMap = groupBalanceForMember(group, state?.currentUserId, safeArray(state?.members), state?.currentUserName)
  const requestedId = normalizeId(memberId, 'memberId')
  const requestedName = typeof memberId === 'object' ? (memberId?.to || memberId?.name) : ''
  const explicitAmount = typeof memberId === 'object' ? Number(memberId?.amount) || 0 : 0
  const fallbackDebt = Object.entries(balanceMap).find(([, amount]) => Number(amount) < 0)
  const recipient = members.find(member => String(member.id) === String(requestedId))
    || members.find(member => sameName(member.name, requestedName))
    || members.find(member => String(member.id) === String(fallbackDebt?.[0]))
    || members.find(member => member.role === 'treasurer')
    || members[0]
  const rawBalance = recipient ? Number(balanceMap[recipient.id]) || 0 : 0
  const amount = explicitAmount || Math.abs(Math.min(rawBalance, 0)) || Math.abs(rawBalance) || 0
  const bank = bankData(recipient)
  const settlement = recipient?.id && state?.currentUserId && amount > 0
    ? { fromId: state.currentUserId, toId: recipient.id, amount, groupId: group.id }
    : null

  return {
    recipient: {
      id: recipient?.id,
      initial: initials(recipient),
      initials: initials(recipient),
      name: recipient?.displayName || recipient?.name || 'Người nhận',
      color: recipient?.color || '#6366f1',
      context: group.name || 'Spliteasy',
    },
    amount,
    breakdown: [
      {
        icon: '💸',
        iconBg: 'rgba(99,102,241,0.12)',
        title: `Tất toán ${group.name || 'nhóm'}`,
        sub: rawBalance < 0 ? 'Bạn đang nợ người này' : 'Thanh toán thủ công',
        amount,
      },
    ],
    bank,
    settlement,
  }
}

function buildJoinGroupData(state) {
  const group = currentGroup(state)
  const members = currentGroupMembers(state).filter(isActiveMember)
  const treasurer = members.find(member => member.role === 'treasurer') || members[0]
  const existingNames = members.map(member => member.displayName || member.name).filter(Boolean)
  const hasGroup = Boolean(group.id)

  return {
    code: group.inviteCode || group.invite_code || '',
    group: hasGroup ? {
      id: group.id,
      emoji: group.emoji || '👥',
      name: group.name || 'Nhóm',
      treasurer: treasurer?.displayName || treasurer?.name || 'Thủ quỹ',
      foundedLabel: monthYearLabel(group.createdAt || group.created_at),
      activeCount: members.length,
      memberCount: members.length,
      memberAvatars: members.slice(0, 6).map(member => initials(member)),
      extraMembers: Math.max(members.length - 6, 0),
    } : null,
    existingNames: hasGroup ? existingNames : [],
    suggestedName: '',
    selectedName: '',
    recentInvites: getRecentInvites(),
  }
}

function buildNewGroupData(state = {}) {
  return {
    name: '',
    emoji: '🍜',
    groupType: 'food',
    description: '',
    requiresApproval: true,
    groupTypeOptions: [
      { key: 'food', label: 'Ăn uống', emoji: '🍜', hint: 'Nhà hàng, cà phê' },
      { key: 'travel', label: 'Du lịch', emoji: '✈️', hint: 'Đi chơi, nghỉ dưỡng' },
      { key: 'expense', label: 'Chi tiêu', emoji: '💰', hint: 'Quỹ chung, mua sắm' },
      { key: 'sport', label: 'Thể thao', emoji: '🏓', hint: 'Pickleball, bóng đá' },
      { key: 'home', label: 'Gia đình', emoji: '🏠', hint: 'Nhà cửa, sinh hoạt' },
      { key: 'party', label: 'Tiệc', emoji: '🎂', hint: 'Sinh nhật, gặp mặt' },
      { key: 'work', label: 'Công việc', emoji: '💼', hint: 'Team, dự án' },
      { key: 'other', label: 'Khác', emoji: '🎯', hint: 'Nhóm linh hoạt' },
    ],
    profileOptions: buildProfileOptions(state),
  }
}

function buildProfileOptions(state = {}) {
  const profiles = safeArray(state?.profiles)
  const profileRows = dedupeProfilesFromMembers(safeArray(state?.members), profiles)
  return profileRows
    .map(profile => ({
      id: profile.id || profile.profileId || profile.profile_id,
      name: profile.name || profile.displayName || '',
      initials: initials(profile),
      color: profile.color || '#574EFA',
      bankName: profile.bankName || profile.bank_name || '',
      bankAccount: profile.bankAccount || profile.bank_account || '',
      bankAccountName: profile.bankAccountName || profile.bank_account_name || '',
    }))
    .filter(profile => profile.id && profile.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

function dedupeProfilesFromMembers(members, profiles = []) {
  const byIdentity = new Map()
  const profilesById = new Map(safeArray(profiles).map(profile => [String(profile.id), profile]))
  safeArray(members).filter(isActiveMember).forEach(member => {
    const profile = profilesById.get(String(member.profileId || member.profile_id || '')) || {}
    const name = profile.name || member.displayName || member.name || ''
    const key = normalizeName(name) || String(member.profileId || member.profile_id || member.id || '')
    if (!key || byIdentity.has(key)) return
    byIdentity.set(key, {
      id: member.profileId || member.profile_id || member.id,
      name,
      initials: initials(profile.name ? profile : member),
      color: profile.color || member.color,
      bankName: profile.bankName || profile.bank_name || member.bankName || member.bank_name,
      bankAccount: profile.bankAccount || profile.bank_account || member.bankAccount || member.bank_account,
      bankAccountName: profile.bankAccountName || profile.bank_account_name || member.bankAccountName || member.bank_account_name,
    })
  })
  return [...byIdentity.values()]
}

function buildSettleAllData(state) {
  const selectedYearMonth = state?.selectedYearMonth || monthKey(new Date())
  const today = dateFromYearMonth(selectedYearMonth)
  const groups = safeArray(state?.groups).map(safeGroup)
  const expenseGroups = groups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, today))
  const members = safeArray(state?.members)
  const pickle = state?.pickle || {}
  const monthSessions = getStateMonthSessions(state, today)
  const sourceBalances = buildHomeSourceBalances(state, expenseGroups, state, pickle, monthSessions, members, today)
  const sources = currentProfileSourceBreakdown(sourceBalances, state?.currentUserId, members)
  const me = safeArray(state?.members).find(member => String(member.id) === String(state?.currentUserId))
  const debts = sources
    .filter(source => Number(source.amount) < 0)
    .map(source => sourcePaymentRow(source, 'Cần nộp'))
  const credits = sources
    .filter(source => Number(source.amount) > 0)
    .map(source => sourcePaymentRow(source, 'Cần thu'))
  const netBalance = sources.reduce((sum, source) => sum + (Number(source.amount) || 0), 0)

  return {
    groupName: 'Tất cả nguồn tiền',
    monthLabel: formatMonthLabel(today),
    netBalance,
    debts,
    credits,
    isTreasurer: me?.role === 'treasurer',
    settlements: [],
    sources,
    paymentTarget: findAdminPaymentTarget(members, state),
  }
}

function sourcePaymentRow(source, sub) {
  return {
    id: `${source.sourceType || 'group'}:${source.sourceId || source.sourceLabel}`,
    initial: initials({ name: source.sourceLabel }),
    name: source.sourceLabel || 'Nguồn tiền',
    sub,
    amount: Math.abs(Number(source.amount) || 0),
    rawAmount: Number(source.amount) || 0,
    sourceType: source.sourceType || 'group',
  }
}

function buildNotificationsData(state) {
  const baseNotifications = safeArray(state?.notifications).map(notification => toNotificationItem(notification, state))
  const joinNotifications = currentJoinRequests(state).map(request => ({
    id: request.id,
    unread: true,
    icon: '👤',
    iconBg: 'rgba(167,139,250,0.12)',
    title: `<strong>${escapeHtml(request.name || 'Thành viên')}</strong> yêu cầu tham gia nhóm`,
    sub: groupLabelById(state, request.groupId || request.group_id),
    when: relativeTimeLabel(request.createdAt || request.created_at),
    date: request.createdAt || request.created_at,
    actions: 'joinRequest',
  }))
  const expenseNotifications = buildPendingExpenseApprovals(safeArray(state?.groups), safeArray(state?.members), state?.currentUserId, state?.currentUserName)
    .map(expense => ({
      id: expense.id,
      unread: true,
      icon: '💸',
      iconBg: 'rgba(245,158,11,0.12)',
      title: `<strong>${escapeHtml(expense.submittedByName || 'Thành viên')}</strong> thêm khoản chi <strong>${escapeHtml(fmtVNDFull(expense.amount || 0))}</strong>`,
      sub: `${expense.title || 'Chi tiêu'} · ${expense.groupName || 'Nhóm chi tiêu'}`,
      when: relativeTimeLabel(expense.date),
      date: expense.createdAt || expense.date,
      actions: 'expenseApproval',
      groupId: expense.groupId,
    }))
  const notifications = [...baseNotifications, ...joinNotifications, ...expenseNotifications]
  return {
    filters: [
      { key: 'all', label: `Tất cả · ${notifications.length}` },
      { key: 'unread', label: `Chưa đọc · ${notifications.filter(item => item.unread).length}` },
      { key: 'expense', label: 'Chi tiêu' },
      { key: 'pickleball', label: 'Pickleball' },
    ],
    groups: groupNotifications(notifications),
  }
}

function buildApprovalQueueData(state) {
  const requests = currentJoinRequests(state)
  const oldest = requests
    .map(request => parseDate(request.createdAt || request.created_at))
    .filter(Boolean)
    .sort((a, b) => a - b)[0]

  return {
    pendingCount: requests.length,
    oldestLabel: oldest ? relativeTimeLabel(oldest) : 'chưa có',
    filters: approvalFilters(requests, state),
    requests: requests.map(request => toApprovalRequest(request, state)),
    recentApproved: safeArray(state?.joinRequests)
      .filter(request => String(request?.status || '').toLowerCase() === 'approved')
      .slice(0, 5)
      .map(request => ({
        initial: initials({ name: request.name }),
        name: request.name || 'Thành viên',
        groupLabel: groupLabelById(state, request.groupId || request.group_id),
      })),
  }
}

function buildAccountSettingsData(state) {
  const me = safeArray(state?.members).find(member => String(member.id) === String(state?.currentUserId))
  return {
    memberId: state?.currentUserId,
    accountHolder: me?.bankAccountName || me?.bank_account_name || me?.displayName || me?.name || state?.currentUserName || 'Bạn',
    banks: [bankData(me, true)],
    profileSync: buildProfileSyncData(state, me),
    pinEnabled: false,
    faceIdEnabled: false,
    language: 'vi',
    version: '1.0.0',
  }
}

function buildSettlementPeriodData(state, params) {
  const group = currentGroup(state)
  const members = safeArray(state?.members)
  const groupMembers = currentGroupMembers(state)
  const monthDate = periodDate(params)
  const month = monthKey(monthDate)
  const expenses = allExpenses(state)
    .filter(expense => String(expense.groupId || expense.group_id || '') === String(group.id || ''))
    .filter(expense => !month || monthKey(expense.date || expense.expense_date) === month)
  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
  const categories = buildExpenseCategories(expenses)
  const balances = groupMembers.map(member => {
    const balance = groupNet(group, member.id)
    return {
      initial: initials(member),
      name: member.displayName || member.name || 'Thành viên',
      sub: balance < 0 ? 'Chưa thanh toán đủ' : 'Đã cân bằng',
      balance,
      status: balance < 0 ? 'unpaid' : 'paid',
      isTreasurer: member.role === 'treasurer',
    }
  })
  const totalPaid = balances
    .filter(member => member.balance >= 0)
    .reduce((sum, member) => sum + Math.abs(member.balance), 0)
  const sessions = getStateMonthSessions(state, monthDate)
  const monthlySourceBalances = buildGlobalMonthlySourceBalances(state, monthDate)

  return {
    groupName: group.name || 'Nhóm',
    monthLabel: `Tháng ${monthDate.getMonth() + 1}/${monthDate.getFullYear()}`,
    totalExpenses,
    memberCount: groupMembers.length,
    settlements: buildOptimizedSettlements(group, members),
    closingDate: monthEndKey(monthDate),
    totalSpent: totalExpenses,
    totalPaid,
    sessionsCount: sessions.length,
    expenseCount: expenses.length,
    categories,
    previewLimit: 5,
    members: balances,
    profileBreakdown: aggregateBalancesByProfile(monthlySourceBalances, members),
    profileBills: buildProfileBillRows(monthlySourceBalances, members),
    remainingCount: balances.filter(member => member.status !== 'paid').length,
  }
}

function buildMonthlySourceBalances(state, group, members, monthDate) {
  const month = monthKey(monthDate)
  return safeArray(membersForGroup(group, members))
    .map(member => ({
      sourceId: group?.id,
      sourceType: groupKind(group) === 'pickleball' ? 'pickleball' : 'group',
      sourceLabel: group?.name || 'Nhóm',
      memberId: member.id,
      amount: groupNet(group, member.id),
      month,
    }))
    .filter(row => row.memberId && row.amount !== 0)
}

function buildGlobalMonthlySourceBalances(state, monthDate) {
  const month = monthKey(monthDate)
  const members = safeArray(state?.members)
  const groups = safeArray(state?.groups).map(safeGroup)
  const expenseRows = groups
    .filter(group => groupKind(group) !== 'pickleball')
    .flatMap(group => {
      const expenses = allExpenses(state)
        .filter(expense => String(expense.groupId || expense.group_id || '') === String(group.id || ''))
        .filter(expense => !month || monthKey(expense.date || expense.expense_date) === month)
      const monthlyGroup = safeGroup({ ...group, expenses })
      const monthlySourceBalances = buildMonthlySourceBalances(state, monthlyGroup, membersForGroup(monthlyGroup, members), monthDate)
      return monthlySourceBalances
    })

  const pickleballState = scopedPickleballState(state)
  const pickleballGroup = currentGroup(pickleballState)
  const pickleRows = groupKind(pickleballGroup) === 'pickleball'
    ? buildHomeSourceBalances(
      state,
      [],
      pickleballState,
      state?.pickle || {},
      getStateMonthSessions(pickleballState, monthDate),
      members,
      monthDate
    )
    : []

  return [...expenseRows, ...pickleRows].filter(row => row.memberId && row.amount !== 0)
}

function buildExpenseDetailData(state, params) {
  const id = normalizeId(params, 'expenseId')
  const expense = findExpense(state, id)
  if (!expense) return null

  const group = groupForExpense(state, expense) || currentGroup(state)
  const members = currentGroupMembers({ ...state, currentGroup: group })
  const currentUserId = state?.currentUserId
  const role = safeArray(state?.members).find(member => String(member.id) === String(currentUserId))?.role
  const reviewStatus = String(expense.status || '').toLowerCase()
  const isCurrentSubmitter = String(expense.submitted_by_member_id || '') === String(currentUserId)
  const canSubmitterRevise = isCurrentSubmitter && ['pending', 'rejected', 'declined'].includes(reviewStatus)
  const canEdit = role === 'treasurer' || canSubmitterRevise
  const payer = members.find(member => String(member.id) === String(expense.paidBy || expense.paid_by_member_id))
  const splits = expenseSplits(expense, members, payer, currentUserId)

  return {
    id: expense.id,
    expenseId: expense.id,
    groupId: group.id,
    groupName: group.name || 'Nhóm',
    category: {
      icon: expenseIcon(expense),
      label: expenseCategoryLabel(expense),
    },
    title: expense.title || 'Chi tiêu',
    amount: Number(expense.amount) || 0,
    status: reviewStatus === 'rejected' || reviewStatus === 'declined' ? 'rejected' : isDoneStatus(expense.status) || reviewStatus === 'approved' ? 'settled' : 'pending',
    dateLabel: fullExpenseDate(expense.date || expense.expense_date),
    payer: {
      id: payer?.id || expense.paidBy || expense.paid_by_member_id,
      initial: initials(payer),
      name: payer?.displayName || payer?.name || 'Người trả',
    },
    splits,
    note: expense.note || expense.description || expense.declineReason || '',
    receiptImages: safeArray(expense.receiptImages || expense.receipt_images),
    canEdit,
    canDelete: role === 'treasurer' || canSubmitterRevise,
    expense,
  }
}

function buildAllExpensesData(state, currentUserId, members, currentUserName) {
  const groups = safeArray(state?.groups)
  return {
    transactions: buildTransactionRows(buildExpenseActivity(groups), groups, currentUserId, members, currentUserName),
    currentUserId,
  }
}

function buildTransactions(groups, currentUserId, members, currentUserName) {
  return buildTransactionRows(buildExpenseActivity(groups), groups, currentUserId, members, currentUserName)
    .slice(0, 8)
}

function buildExpenseActivity(groups) {
  return safeArray(groups).flatMap(group => safeArray(group?.expenses).map(expense => ({
    ...expense,
    groupName: group.name,
    groupEmoji: group.emoji,
    groupColor: group.color,
    groupId: group.id,
  })))
}

function buildTransactionRows(expenses, groups, currentUserId, members, currentUserName) {
  return safeArray(expenses)
    .slice()
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .map(expense => {
      const group = safeArray(groups).find(g => g.id === expense.groupId)
      const meForGroup = memberIdForGroup(
        group,
        currentUserId,
        members,
        currentUserName
      )
      const amount = expenseImpact(expense, meForGroup)
      const paidBy = expense.paidBy || expense.paid_by_member_id
      const participants = safeArray(expense.participants)
      const splits = safeArray(expense.splits).map(normalizeHomeSplit).filter(split => split.memberId)
      const normalizedExpense = { ...expense, paidBy, participants, splits }

      return {
        id: expense.id,
        groupId: expense.groupId,
        icon: expenseIcon(expense),
        category: expenseCategory(expense),
        title: expense.title || 'Chi tiêu',
        subtitle: expense.groupName || memberName(expense.paidBy, members),
        date: expense.date,
        dateLabel: relativeDateLabel(expense.date),
        amount,
        status: expense.status,
        paidBy,
        payerName: memberName(paidBy, members) || '',
        participants,
        splits,
        participantNames: safeArray(splits).map(s => memberName(s.memberId || s.member_id, members)).filter(Boolean).join(' '),
        currentMemberId: meForGroup,
        isMine: isExpenseRelatedToMember(normalizedExpense, meForGroup),
      }
    })
}

function toActivity(expense, members) {
  const splitCount = safeArray(expense.participants).length || safeArray(expense.splits).length
  const submittedBy = expense.submittedBy || expense.submitted_by_member_id || expense.createdBy || expense.created_by || null
  return {
    id: expense.id,
    icon: expenseIcon(expense),
    category: expenseCategory(expense),
    title: expense.title || 'Chi tiêu',
    amount: Number(expense.amount) || 0,
    date: expense.date,
    paidBy: expense.paidBy,
    submittedBy,
    submittedByName: submittedBy ? memberName(submittedBy, members) : '',
    status: expense.status,
    splits: safeArray(expense.splits),
    sub: `${memberName(expense.paidBy, members)} trả · ${formatDayMonth(expense.date)}`,
    tags: [
      { tone: 'muted', label: splitCount > 0 ? `Chia đều · ${splitCount} người` : 'Chưa có người chia' },
      statusBadge(expense.status),
    ],
  }
}

function buildPickleBreakdown(pickle, monthSessions, currentUserId, summary, ticketAmount, balance) {
  const monthBalance = balance || {
    courtFee: Math.max((summary?.courtPerMember || 0) - (summary?.guestCreditPer || 0), 0),
    waterFee: 0,
    extras: 0,
  }

  return [
    { label: '🏸 Tiền sân', amount: monthBalance.courtFee },
    { label: `💧 Tiền nước (${monthSessions.filter(s => sessionWaterAmount(s) > 0).length} buổi)`, amount: monthBalance.waterFee },
    { label: '📦 Phụ phát sinh', amount: monthBalance.extras },
    { label: '🎟️ Vé lẻ qua quỹ', amount: -ticketAmount },
  ]
}

export function buildPersonalWaterSessionRows(monthSessions, memberId, members = [], useFlexAttendance = false, state, date) {
  const rows = monthSessions
    .filter(s => sessionWaterAmount(s) > 0)
    .map(s => {
      const attendees = useFlexAttendance ? effectiveSessionMemberIdsFlex(s) : effectiveSessionMemberIds(s, members)
      const memberPresent = attendees.some(id => String(id) === String(memberId))
      if (!memberPresent) return null
      const share = Math.round(sessionWaterAmount(s) / attendees.length)
      return {
        label: `Buổi #${sessionNumber(s, monthSessions) || ''} · ${formatDayMonth(sessionDate(s)) || ''}`,
        amount: share,
      }
    })
    .filter(Boolean)

  if (!state) return rows

  const ticketRows = monthTicketsForState(state, date || new Date())
    .filter(t => ticketStatus(t) !== 'pending_review' && Number(t?.waterAmount ?? t?.water_amount ?? 0) > 0)
    .filter(t => ticketMemberIds(t).some(id => String(id) === String(memberId)))
    .map(t => ({
      label: `Vé lẻ · ${formatDayMonth(ticketDate(t)) || ''}`,
      amount: ticketWaterSharePerPerson(t),
    }))

  return [...rows, ...ticketRows]
}

export function buildPersonalPickleSummaryCards(monthSessions, memberBalance, ticketAdjustment, memberId, members = [], useFlexAttendance = false, state, date) {
  const waterSessionRows = buildPersonalWaterSessionRows(monthSessions, memberId, members, useFlexAttendance, state, date)
  const sessionWaterCount = monthSessions.filter(s => (
    sessionWaterAmount(s) > 0 &&
    (useFlexAttendance ? effectiveSessionMemberIdsFlex(s) : effectiveSessionMemberIds(s, members)).some(id => String(id) === String(memberId))
  )).length
  const ticketWaterCount = state ? monthTicketsForState(state, date || new Date())
    .filter(t => ticketStatus(t) !== 'pending_review' && Number(t?.waterAmount ?? t?.water_amount ?? 0) > 0)
    .filter(t => ticketMemberIds(t).some(id => String(id) === String(memberId)))
    .length : 0
  const waterSessions = sessionWaterCount + ticketWaterCount
  const ticketCostCard = memberBalance.ticketType == null && !('ticketType' in memberBalance)
    ? { icon: '🏸', label: 'Sân của bạn', amount: -memberBalance.courtFee, sub: 'Phần của bạn' }
    : memberBalance.ticketType === 'monthly'
    ? { icon: '🏸', label: 'Vé tháng của bạn', amount: -memberBalance.monthlyTicketFee, sub: 'Vé tháng cố định' }
    : memberBalance.ticketType === 'per_session'
    ? { icon: '🏸', label: 'Vé lượt của bạn', amount: -memberBalance.perSessionTicketFee, sub: 'Theo buổi tham gia' }
    : { icon: '🏸', label: 'Chưa phân nhóm vé', amount: 0, sub: 'Vào Thành viên để chọn vé tháng/lượt' }
  return [
    ticketCostCard,
    { icon: '💧', label: 'Nước của bạn', amount: -memberBalance.waterFee, sub: `${waterSessions} buổi có nước`, key: 'water', rows: waterSessionRows },
    { icon: '🎟️', label: 'Vé lẻ qua quỹ', amount: -ticketAdjustment, sub: 'Qua quỹ team', key: 'ticket' },
  ]
}

function buildPersonalTicketOverview(state, memberId, date) {
  const rows = monthTicketsForState(state, date || new Date())
    .filter(ticket => ticketStatus(ticket) !== 'pending_review')
    .filter(ticket => isTicketRelatedToMember(ticket, memberId))
    .sort((a, b) => parseDateValue(ticketDate(a)) - parseDateValue(ticketDate(b)))
    .map(ticket => toPersonalTicketRow(ticket, memberId, state))

  return {
    summary: {
      sessionCount: rows.length,
      totalAdjustment: rows.reduce((sum, row) => sum + row.personalAmount, 0),
      displayAdjustment: rows.reduce((sum, row) => sum + row.displayAmount, 0),
      advancedCount: rows.filter(row => row.hasAdvancer).length,
    },
    rows,
  }
}

function isTicketRelatedToMember(ticket, memberId) {
  const memberIds = ticketMemberIds(ticket).map(String)
  return memberIds.includes(String(memberId)) || String(ticketAdvancerId(ticket) || '') === String(memberId)
}

function toPersonalTicketRow(ticket, memberId, state) {
  const status = ticketStatus(ticket)
  const advancerId = ticketAdvancerId(ticket)
  const members = safeArray(state?.members)
  const advancerName = advancerId ? memberName(advancerId, members) : ''
  const personalAmount = personalTicketAdjustment(ticket, memberId)
  const displayAmount = -personalAmount
  return {
    id: ticket?.id,
    dateLabel: formatSessionDetailDate(ticketDate(ticket)) || formatDayMonth(ticketDate(ticket)),
    sourceLabel: status === 'team_fund' ? 'Quỹ team trả' : `${advancerName || 'Người ứng'} ứng`,
    roleLabel: String(advancerId || '') === String(memberId) ? 'Bạn ứng tiền' : 'Bạn tham gia',
    totalAmount: ticketTotalAmount(ticket),
    personalAmount,
    displayAmount,
    hasAdvancer: status === 'unpaid' && Boolean(advancerId),
  }
}

function personalTicketAdjustment(ticket, memberId) {
  const status = ticketStatus(ticket)
  const memberIds = ticketMemberIds(ticket)
  const per = ticketAmountPerPerson(ticket)
  const advancerId = ticketAdvancerId(ticket)
  if (status === 'team_fund') {
    return memberIds.some(id => String(id) === String(memberId)) ? per : 0
  }
  if (status !== 'unpaid' || !advancerId) return 0
  if (String(advancerId) === String(memberId)) {
    const participantCount = memberIds.filter(id => String(id) !== String(memberId)).length
    return -per * (participantCount || memberIds.length)
  }
  return memberIds.some(id => String(id) === String(memberId)) ? per : 0
}

function buildTicketFundSummary(state, date) {
  const rows = currentGroupMembers(state)
    .filter(isActiveMember)
    .map(member => {
      const ticketNet = memberTicketBalance(state, member.id, date) - memberTeamFundTicketShare(state, member.id, date)
      const amount = Math.round(-ticketNet)
      return {
        memberId: member.id,
        name: member.displayName || member.name || 'Thành viên',
        initial: initials(member),
        color: member.color,
        amount,
        label: amount < 0 ? 'Quỹ bù lại' : 'Nộp vào quỹ',
        roleLabel: amount < 0 ? 'Ứng tiền vé lẻ' : 'Tham gia vé lẻ',
      }
    })
    .filter(row => row.amount !== 0)
    .sort((a, b) => {
      if ((a.amount < 0) !== (b.amount < 0)) return a.amount < 0 ? -1 : 1
      if (a.amount > 0 && b.amount > 0) return b.amount - a.amount
      return a.amount - b.amount
    })

  const tickets = monthTicketsForState(state, date || new Date())
  const unpaidCount = tickets.filter(ticket => ticketStatus(ticket) === 'unpaid').length
  const teamFundCount = tickets.filter(ticket => ticketStatus(ticket) === 'team_fund').length
  const teamFundTotal = tickets
    .filter(ticket => ticketStatus(ticket) === 'team_fund')
    .reduce((sum, ticket) => sum + ticketTotalAmount(ticket), 0)
  const totalDue = rows.filter(row => row.amount > 0).reduce((sum, row) => sum + row.amount, 0)
  const totalCredit = rows.filter(row => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0)

  return {
    rows,
    totalDue,
    totalCredit,
    netToFund: totalDue - totalCredit,
    unpaidCount,
    teamFundCount,
    teamFundTotal,
  }
}

function toPickleballMemberRow(member, sessions, totalSessions, members = []) {
  const sessionsAttended = attendanceByMemberId(sessions, member.id, members, true)
  const sessionsTotal = totalSessions ?? sessions.length
  const progressPct = sessionsTotal > 0 ? Math.min(100, Math.round((sessionsAttended / sessionsTotal) * 100)) : 0
  const rank = calculateMemberRank(progressPct)

  return {
    id: member.id,
    initial: initials(member),
    initials: initials(member),
    name: member.displayName || member.name || 'Thành viên',
    role: member.role || 'member',
    type: memberType(member),
    sessionsAttended,
    sessionsTotal,
    progressPct,
    rank: calculateMemberRank(progressPct),
    rankIcon: rank.icon,
    rankLabel: rank.label,
    joinedLabel: monthYearLabel(member.createdAt || member.created_at),
    isTreasurer: member.role === 'treasurer',
    bankName: member.bankName || member.bank_name || '',
    bankAccountName: member.bankAccountName || member.bank_account_name || '',
    bankAccount: member.bankAccount || member.bank_account || '',
    color: member.color,
    photoUrl: memberPhotoUrl(member, members),
  }
}

function dedupeMemberRowsByProfileOrName(members) {
  const seen = new Set()
  return safeArray(members).filter(member => {
    const key = memberIdentityKey(member) || String(member?.id || '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function memberIdentityKey(member) {
  return String(member?.profileId || member?.profile_id || normalizeName(member?.displayName || member?.name) || '').trim()
}

function buildMemberAttendance(sessions, memberId, members = []) {
  const total = sessions.length
  const attended = attendanceByMemberId(sessions, memberId, members, true)
  const missed = Math.max(total - attended, 0)
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0

  return {
    attended,
    missed,
    total,
    totalSessions: total,
    sessionsAttended: attended,
    sessionsMissed: missed,
    percentage,
    progressPct: percentage,
  }
}

function calculateMemberRank(progressPct) {
  if (progressPct >= 85) return { icon: '🔥', label: 'Siêu chăm', tone: 'success' }
  if (progressPct >= 65) return { icon: '⚡', label: 'Chăm chỉ', tone: 'success' }
  if (progressPct >= 45) return { icon: '😐', label: 'Bình thường', tone: 'warn' }
  return { icon: '🥶', label: 'Hay vắng', tone: 'danger' }
}

export function buildMemberMonthBalance(state, pickle, sessions, memberId, date) {
  const currentYearMonth0 = monthKey(date || new Date())
  if (isBillingModeFlexForMonth(state, currentYearMonth0)) {
    return buildMemberMonthBalanceFlex(state, pickle, sessions, memberId, date)
  }
  const members = currentGroupMembers(state).filter(isActiveMember)
  const currentYearMonth = monthKey(date || new Date())
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const fixedMembers = members.filter(member => isFixedForMonth(state, member, currentYearMonth))
  const casualMembers = members.filter(member => !isFixedForMonth(state, member, currentYearMonth))
  const fixedMemberCount = Math.max(fixedMembers.length, 1)
  const courtFeeTotal = Number(monthlyConfig?.courtFee ?? monthlyConfig?.court_fee ?? pickle?.monthlyCourtFee ?? pickle?.monthly_court_fee ?? 0)
  const configuredSessionCount = Number(monthlyConfig?.sessionsCount ?? monthlyConfig?.sessions_count ?? 0)
  const sessionsCount = Math.max(sessions.length || configuredSessionCount, 1)
  const ratePerSession = courtFeeTotal / sessionsCount / fixedMemberCount
  const casualCharges = casualMembers.map(member => {
    const vanglaiCharge = ratePerSession * attendanceByMemberId(sessions, member.id)
    return {
      memberId: member.id,
      amount: Math.round(vanglaiCharge),
    }
  })
  const rebatePerFixed = fixedMemberCount > 0 ? casualCharges.reduce((sum, row) => sum + row.amount, 0) / fixedMemberCount : 0
  const member = members.find(row => String(row.id) === String(memberId))
  const ownerPayments = currentGroupOwnerPayments(state)
  const courtConfirmed = ownerPaymentCoversItem(ownerPayments, 'next_court', currentYearMonth)
  const courtFeeShare = courtFeeTotal / fixedMemberCount
  const fixedNetCost = Math.max(courtFeeShare - rebatePerFixed, 0)
  const casualCharge = casualCharges.find(row => String(row.memberId) === String(memberId))?.amount || 0
  const courtFee = courtConfirmed
    ? (!isFixedForMonth(state, member, currentYearMonth) ? casualCharge : Math.round(fixedNetCost))
    : 0
  const waterFee = memberWaterShare(sessions, memberId, fixedMembers, casualMembers)
  const extras = memberExtrasShare(sessions, memberId, state, fixedMembers, casualMembers)
  const ticketShare = memberTeamFundTicketShare(state, memberId, date)
  const p2pBalance = memberTicketBalance(state, memberId, date)
  const netBalance = Math.round(p2pBalance - courtFee - waterFee - extras - ticketShare)
  const totalOwed = Math.max(-netBalance, 0)

  return {
    courtFee,
    waterFee,
    extras,
    ticketShare,
    p2pBalance,
    netBalance,
    totalOwed,
    total: totalOwed,
    ratePerSession: Math.round(ratePerSession),
    rebatePerFixed: Math.round(rebatePerFixed),
  }
}

export function memberWaterShare(sessions, memberId, fixedMembers = [], casualMembers = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const fixedPresentIds = effectiveSessionMemberIds(session, fixedMembers, true)
    const casualPresentIds = effectiveSessionMemberIds(session, casualMembers, false)
    const presentIds = [...new Set([...fixedPresentIds, ...casualPresentIds])]
    if (!presentIds.some(id => String(id) === String(memberId))) return sum
    const splitCount = presentIds.length + sessionGuests(session).length
    return sum + (splitCount > 0 ? Math.round(sessionWaterAmount(session) / splitCount) : 0)
  }, 0)
}

function memberTicketWaterShare(state, memberId, date) {
  return monthTicketsForState(state, date).reduce((sum, ticket) => {
    const wAmount = Number(ticket?.waterAmount ?? ticket?.water_amount ?? 0)
    if (!wAmount) return sum
    const ids = ticketMemberIds(ticket)
    if (!ids.some(id => String(id) === String(memberId))) return sum
    return sum + Math.round(wAmount / Math.max(ids.length, 1))
  }, 0)
}

function memberExtrasShare(sessions, memberId, state, fixedMembers = [], casualMembers = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const fixedPresentIds = effectiveSessionMemberIds(session, fixedMembers, true)
    const casualPresentIds = effectiveSessionMemberIds(session, casualMembers, false)
    const presentIds = [...new Set([...fixedPresentIds, ...casualPresentIds])]
    const itemShare = (state ? sessionItemsForSession(state, session) : safeArray(session?.sessionItems || session?.session_items))
      .filter(item => !isWaterSessionItem(item))
      .reduce((itemSum, item) => {
        const participantIds = item.memberIds == null && item.member_ids == null
          ? presentIds
          : safeArray(item.memberIds ?? item.member_ids)
        const applies = participantIds.some(id => String(id) === String(memberId))
        if (!applies || participantIds.length === 0) return itemSum
        return itemSum + Math.round((Number(item.amount) || 0) / participantIds.length)
      }, 0)
    const expenseShare = safeArray(session?.expenses)
      .filter(expense => !isWaterExpense(expense) && !isCourtExpense(expense))
      .reduce((expenseSum, expense) => {
        const participantIds = safeArray(expense.participants).length > 0
          ? safeArray(expense.participants)
          : presentIds
        const applies = participantIds.some(id => String(id) === String(memberId))
        if (!applies || participantIds.length === 0) return expenseSum
        return expenseSum + Math.round((Number(expense.amount) || 0) / participantIds.length)
      }, 0)
    return sum + itemShare + expenseShare
  }, 0)
}

export function attendanceByMemberId(sessions, memberId, members = [], fallback = false) {
  return safeArray(sessions).filter(session => (
    effectiveSessionMemberIds(session, members, fallback).some(id => String(id) === String(memberId))
  )).length
}

function isWaterExpense(expense) {
  return /nước|water/i.test(`${expense?.title || ''} ${expense?.cat || ''} ${expense?.category || ''}`)
}

function isCourtExpense(expense) {
  return /sân|court/i.test(`${expense?.title || ''} ${expense?.cat || ''} ${expense?.category || ''}`)
}

function memberType(member) {
  const raw = String(member?.memberType || member?.member_type || '').toLowerCase()
  return ['casual', 'guest', 'vanglai', 'vãng lai'].includes(raw) ? 'casual' : 'fixed'
}

function monthlyFixedMemberIds(state, yearMonth) {
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  return safeArray(monthlyConfig?.fixedMemberIds ?? monthlyConfig?.fixed_member_ids)
}

function isFixedForMonth(state, member, yearMonth) {
  const ids = monthlyFixedMemberIds(state, yearMonth)
  return ids.length > 0
    ? ids.some(id => String(id) === String(member?.id || member?.member_id))
    : memberType(member) === 'fixed'
}

function isActiveMember(member) {
  return member?.isActive !== false && member?.is_active !== false
}

function isExpenseActiveMember(member) {
  if (!isActiveMember(member)) return false
  if ('expenseActive' in (member || {}) || 'expense_active' in (member || {})) {
    return member?.expenseActive !== false && member?.expense_active !== false
  }
  return memberType(member) !== 'casual'
}

function currentGroup(state) {
  return safeGroup(state?.currentGroup || safeArray(state?.groups)[0])
}

function scopedPickleballState(state) {
  const group = state?.pickleballGroup || safeArray(state?.groups).find(item => String(item.id) === String(state?.pickleballGroupId || '')) || state?.currentGroup
  return {
    ...state,
    currentGroupId: group?.id || state?.pickleballGroupId || state?.currentGroupId,
    currentGroup: group || state?.currentGroup,
  }
}

function currentGroupName(state, fallback = 'Nhóm') {
  return currentGroup(state).name || fallback
}

function currentGroupMembers(state) {
  const group = currentGroup(state)
  const members = safeArray(state?.members)
  const rows = allMembersForGroup(group, members)
  return group?.id ? rows : members
}

function membersForSessionGroup(state, session) {
  const sessionGroupId = session?.groupId || session?.group_id
  const members = safeArray(state?.members)
  if (!sessionGroupId) return currentGroupMembers(state)
  const rows = members.filter(member => String(member.groupId || member.group_id || '') === String(sessionGroupId))
  return rows.length ? rows : currentGroupMembers(state)
}

function getAllSessions(state) {
  return uniqueSessions([
    ...safeArray(state?.sessions),
    ...safeArray(state?.pickle?.sessions),
    ...safeArray(state?.pickle?.upcoming),
    ...safeArray(state?._allPickle?.sessions),
  ])
}

function getStateMonthSessions(state, date) {
  const month = monthKey(date)
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  const allSessions = getAllSessions(state)
  return allSessions
    .filter(session => !isHiddenReplacementSession(session))
    .filter(session => !isOffScheduleStaleSession(state, session))
    .filter(session => !isStaleReplacementSession(session, allSessions))
    .filter(session => {
      const sessionGroupId = session?.groupId || session?.group_id
      return !groupId || !sessionGroupId || String(sessionGroupId) === String(groupId)
    })
    .filter(session => monthKey(sessionDate(session)) === month)
    .sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))
}

function buildCalendarDays(monthDate, sessionsByDay, state, ticketsByDate = new Map()) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const lastDay = new Date(year, month + 1, 0).getDate()
  const cells = Math.ceil((offset + lastDay) / 7) * 7

  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(year, month, 1 - offset + index)
    const inMonth = date.getMonth() === month
    const session = inMonth ? sessionsByDay.get(date.getDate()) : null
    const tickets = inMonth ? ticketsByDate.get(dateKey(date)) || [] : []
    const hasCurrentUserTicket = tickets.some(ticket => ticketIncludesCurrentUser(state, ticket))
    return {
      n: date.getDate(),
      date: dateKey(date),
      sessionId: session?.id,
      hasTicket: tickets.length > 0,
      hasCurrentUserTicket,
      ticketIds: tickets.map(ticket => ticket.id),
      state: inMonth ? calendarCellState(date, session, state, tickets) : 'faded',
    }
  })
}

function preferredCalendarDaySession(current, next) {
  if (!current) return next
  if (isMovedSession(current) && !isMovedSession(next)) return next
  return current
}

function isHiddenReplacementSession(session) {
  return String(session?.notes || '').includes('[hidden-replacement]')
}

function replacementOriginDate(session) {
  return String(session?.notes || '').match(/Dời từ (\d{4}-\d{2}-\d{2})/)?.[1] || ''
}

function replacementTargetDate(session) {
  const matches = [...String(session?.notes || '').matchAll(/sang (\d{4}-\d{2}-\d{2})/g)]
  return matches.at(-1)?.[1] || ''
}

function sessionMoveInfo(session) {
  const notes = String(session?.notes || '').trim()
  const fromDate = replacementOriginDate(session)
  const toDate = replacementTargetDate(session)
  const sessionKey = dateKey(sessionDate(session))
  if (fromDate && toDate && !isMovedSession(session) && toDate !== sessionKey) {
    return { fromDate: '', toDate: '', reason: '' }
  }
  const reason = notes
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^Dời từ \d{4}-\d{2}-\d{2}/.test(line) && !line.includes('[hidden-replacement]'))
    .join(' · ')
  return {
    fromDate,
    toDate,
    reason,
  }
}

function isOffScheduleStaleSession(state, session) {
  const normalizedStatus = String(session?.status || '').toLowerCase()
  if (!['scheduled', 'upcoming'].includes(normalizedStatus)) return false
  const date = parseDate(sessionDate(session))
  if (!date) return false
  // Past sessions are never hidden — may be legitimately reopened off-schedule sessions
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return false
  const originDate = replacementOriginDate(session)
  if (originDate && originDate !== dateKey(date)) return false
  const monthlyConfig = currentMonthlyPickleConfig(state, monthKey(date))
  const config = currentPickleConfig(state)
  const group = currentGroup(state)
  const weekdays = normalizeIsoWeekdays(
    monthlyConfig?.scheduleWeekdays ||
    monthlyConfig?.schedule_weekdays ||
    config?.scheduleWeekdays ||
    config?.schedule_weekdays ||
    group?.scheduleWeekdays ||
    group?.schedule_weekdays
  )
  if (weekdays.length === 0) return false
  const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
  return !weekdays.includes(isoWeekday)
}

function isStaleReplacementSession(session, sessions) {
  const originDate = replacementOriginDate(session)
  const selfDate = dateKey(sessionDate(session))
  if (!originDate || originDate === selfDate) return false
  const targetDate = replacementTargetDate(session)
  if (targetDate && targetDate !== selfDate) return true
  if (isMovedSession(session)) return true
  const groupId = session?.groupId || session?.group_id
  const originSession = safeArray(sessions).find(item => {
    const itemGroupId = item?.groupId || item?.group_id
    return dateKey(sessionDate(item)) === originDate &&
      (!groupId || !itemGroupId || String(itemGroupId) === String(groupId)) &&
      !isHiddenReplacementSession(item)
  })
  return Boolean(originSession && !isMovedSession(originSession))
}

function staleReplacementSessionsForMonth(state, date, sessions = getAllSessions(state)) {
  const month = monthKey(date)
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  return safeArray(sessions)
    .filter(session => !isHiddenReplacementSession(session))
    .filter(session => isStaleReplacementSession(session, sessions))
    .filter(session => monthKey(sessionDate(session)) === month)
    .filter(session => {
      const sessionGroupId = session?.groupId || session?.group_id
      return !groupId || !sessionGroupId || String(sessionGroupId) === String(groupId)
    })
}

function calendarCellState(date, session, state, tickets = []) {
  if (!session && tickets.length > 0) {
    return tickets.some(ticket => ticketIncludesCurrentUser(state, ticket)) ? 'ticket' : 'ticketOther'
  }
  if (!session) return isToday(date) ? 'today' : 'normal'
  const normalizedStatus = String(session?.status || '').toLowerCase()
  if (['moved', 'cancelled', 'canceled'].includes(normalizedStatus)) return 'moved'
  if (['scheduled', 'upcoming'].includes(normalizedStatus)) return 'upcoming'
  if (dateKey(date) > dateKey(new Date())) return 'upcoming'

  const groupMembers = currentGroupMembers(state).filter(isActiveMember)
  const presentIds = effectiveSessionMemberIds(session, groupMembers)
  if (!state?.currentUserId) return presentIds.length > 0 ? 'attended' : 'missed'
  return sessionIncludesCurrentUser(state, presentIds, groupMembers) ? 'attended' : 'missed'
}

function ticketIncludesCurrentUser(state, ticket) {
  const currentUserId = state?.currentUserId
  if (!currentUserId) return false
  const ticketIds = new Set(ticketMemberIds(ticket).map(String))
  if (ticketIds.has(String(currentUserId))) return true

  const allMembers = safeArray(state?.members)
  const groupMembers = currentGroupMembers(state)
  const currentProfileId = profileIdForMember(currentUserId, allMembers)
  if (memberIdsForProfile(currentProfileId, groupMembers).some(memberId => ticketIds.has(String(memberId)))) return true

  const currentMember = allMembers.find(member => String(member.id || member.member_id) === String(currentUserId))
  const currentName = currentMember?.displayName || currentMember?.name || state?.currentUserName
  if (!currentName) return false
  return groupMembers.some(member => (
    ticketIds.has(String(member.id || member.member_id)) &&
    sameName(member.displayName || member.name, currentName)
  ))
}

function toCalendarSessionDetail(state, session, allSessions, today) {
  const pickle = state?.pickle || {}
  const groupMembers = membersForSessionGroup(state, session).filter(isActiveMember)
  const sessionYearMonth = monthKey(sessionDate(session))
  const isFutureSession = dateKey(sessionDate(session) || '') > dateKey(today)
  const presentIds = effectiveSessionMemberIds(session, groupMembers, !isFutureSession)
  const presentSet = new Set(presentIds.map(String))
  const guests = sessionGuests(session)
  const attendanceMembers = groupMembers.filter(member => isFixedForMonth(state, member, sessionYearMonth))
  const attendanceNames = attendanceDisplayNames(groupMembers)
  const calExplicitPresentIds = new Set([
    ...sessionMemberIds(session).map(String),
    ...sessionAttendanceRecords(session).filter(r => r.status !== 'absent').map(r => String(r.memberId)),
  ].filter(Boolean))
  const casualAttendingMembers = groupMembers
    .filter(member => !isFixedForMonth(state, member, sessionYearMonth))
    .filter(member => calExplicitPresentIds.has(String(member.id)))
  const fixedPresentCount = attendanceMembers
    .filter(member => presentSet.has(String(member.id)))
    .length
  const attendees = [
    ...attendanceMembers.map(member => ({
      id: member.id,
      initial: initials(member),
      name: attendanceNames.get(String(member.id)) || firstName(member.displayName || member.name),
      memberType: memberType(member),
      kind: presentSet.has(String(member.id)) ? 'present' : 'absent',
    })),
    ...casualAttendingMembers.map(member => ({
      id: member.id,
      initial: initials(member),
      name: attendanceNames.get(String(member.id)) || firstName(member.displayName || member.name),
      memberType: 'casual',
      kind: 'casual',
    })),
    ...guests.map((guest, index) => ({
      id: guest.id || guest.guest_id || `guest-${index}`,
      initial: initials({ name: guestName(guest) }),
      name: guestName(guest),
      kind: 'guest',
    })),
  ]
  const members = groupMembers.map(personChip)
  const costs = sessionCostsForSession(state, session, members)
  const monthSessions = getStateMonthSessions(state, parseDate(sessionDate(session)) || today)
  const courtPerPerson = perPersonCourtFee(pickle, monthSessions)
  const casualPresentIds = Array.from(calExplicitPresentIds).filter(id => {
    const member = groupMembers.find(m => String(m.id) === String(id))
    return member && !isFixedForMonth(state, member, sessionYearMonth)
  })
  const fixedCount = Math.max(groupMembers.filter(member => isFixedForMonth(state, member, sessionYearMonth)).length, 1)
  const rebatePerFixed = casualPresentIds.length > 0 ? Math.round(casualPresentIds.length * courtPerPerson / fixedCount) : 0
  const netCourtPerPerson = Math.max(courtPerPerson - rebatePerFixed, 0)
  const fixedPresentIds = presentIds.filter(id => {
    const member = groupMembers.find(m => String(m.id) === String(id))
    return member && isFixedForMonth(state, member, sessionYearMonth)
  })
  const splitCount = fixedPresentIds.length + casualPresentIds.length + guests.length
  const waterPerPerson = splitCount > 0 ? Math.round(costs.waterAmount / splitCount) : 0
  const extrasPerPerson = costs.extras.reduce((sum, item) => {
    const count = safeArray(item.memberIds).length
    return sum + (count > 0 ? Math.round((Number(item.amount) || 0) / count) : 0)
  }, 0)
  const sessionKey = dateKey(sessionDate(session))
  const todayKey = dateKey(today)
  const completed = isDoneStatus(session?.status)
  const moved = isMovedSession(session)
  const locked = completed || moved
  const currentUserPresent = sessionIncludesCurrentUser(state, presentIds, groupMembers)
  const currentUserWaterPerPerson = currentUserPresent ? waterPerPerson : 0
  const currentUserTotal = currentUserPresent ? netCourtPerPerson + waterPerPerson + extrasPerPerson : netCourtPerPerson

  return {
    id: session.id,
    number: sessionNumber(session, allSessions),
    date: sessionKey,
    dateLabel: formatSessionDetailDate(sessionDate(session)),
    timeRange: sessionTimeRange(session),
    court: sessionCourt(session),
    status: calendarSessionStatus(session, today),
    moveInfo: sessionMoveInfo(session),
    attendance: {
      present: fixedPresentCount,
      total: attendanceMembers.length,
      guests: guests.length,
    },
    attendees,
    members,
    costs,
    costRows: [
      { label: currentUserPresent ? '🏸 Tiền sân/người' : '🏸 Tiền sân của bạn', amount: netCourtPerPerson },
      { label: currentUserPresent ? '💧 Tiền nước/người tham gia' : '💧 Tiền nước của bạn', amount: currentUserWaterPerPerson },
      ...costs.extras.map(item => {
        const count = safeArray(item.memberIds).length
        return {
          label: `⚡ ${item.note || 'Phụ phát sinh'}`,
          amount: count > 0 ? Math.round((Number(item.amount) || 0) / count) : 0,
        }
      }),
    ],
    totalPerPerson: currentUserTotal,
    totalLabel: 'TỔNG CỦA BẠN',
    currentUserPresent,
    currentUserTotal,
    personalCostNote: currentUserPresent ? 'Bạn có mặt trong buổi này' : 'Bạn vắng buổi này · tiền nước = 0đ',
    canShowCosts: sessionKey <= todayKey || isDoneStatus(session?.status),
    canComplete: !moved && sessionKey <= todayKey,
    isCompleted: locked,
    isMoved: moved,
    canReschedule: !locked,
    canRestore: moved,
  }
}

function attendanceDisplayNames(members) {
  return safeArray(members).reduce((map, member) => {
    map.set(String(member.id), compactMemberName(member))
    return map
  }, new Map())
}

function compactMemberName(member) {
  const full = String(member?.displayName || member?.name || '').trim().replace(/\s+/g, ' ')
  const parts = full.split(' ').filter(Boolean)
  return parts.length > 1 ? parts.slice(0, 2).join(' ') : (full || 'TV')
}

function calendarSessionStatus(session, today) {
  const normalizedStatus = String(session?.status || '').toLowerCase()
  if (isMovedSession(session)) return { tone: 'warn', label: 'Đã dời' }
  if (isToday(sessionDate(session))) return { tone: 'brand', label: 'Hôm nay' }
  if (isDoneStatus(normalizedStatus)) return { tone: 'success', label: 'Đã đánh' }
  return dateKey(sessionDate(session)) > dateKey(today) ? { tone: 'muted', label: 'Sắp tới' } : { tone: 'warn', label: 'Chưa chốt' }
}

function isMovedSession(session) {
  const normalizedStatus = String(session?.status || '').toLowerCase()
  return ['moved', 'cancelled', 'canceled'].includes(normalizedStatus)
}

function sessionCostsForSession(state, session, members = []) {
  const items = sessionItemsForSession(state, session)
  const waterItem = items.find(isWaterSessionItem)
  const itemExtras = items
    .filter(item => !isWaterSessionItem(item))
    .map(item => normalizeSessionCostItem(item, members))
  const expenseExtras = safeArray(session?.expenses)
    .filter(expense => expense?.source !== 'pickleball_session_items')
    .filter(expense => !isWaterExpense(expense) && !isCourtExpense(expense))
    .map(expense => normalizeExpenseCostItem(expense))

  return {
    waterAmount: waterItem ? Number(waterItem.amount) || 0 : sessionWaterAmount(session),
    extras: [...itemExtras, ...expenseExtras],
  }
}

function sessionItemsForSession(state, session) {
  const sessionId = String(session?.id || '')
  const rows = [
    ...safeArray(session?.sessionItems || session?.session_items),
    ...safeArray(state?.sessionItems || state?.session_items),
    ...safeArray(state?.pickle?.sessionItems || state?.pickle?.session_items),
    ...safeArray(state?._allPickle?.sessionItems || state?._allPickle?.session_items),
  ]
  const seen = new Set()
  return rows
    .filter(item => String(item?.sessionId || item?.session_id || '') === sessionId)
    .filter(item => {
      const key = String(item?.id || `${item?.sessionId || item?.session_id}:${item?.name}:${item?.amount}`)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function normalizeSessionCostItem(item, members) {
  const rawMemberIds = item?.memberIds ?? item?.member_ids
  const memberIds = rawMemberIds == null
    ? members.map(member => member.id).filter(Boolean)
    : safeArray(rawMemberIds)
  return {
    id: item.id,
    note: item.note || item.name || 'Phụ phát sinh',
    amount: Number(item.amount) || 0,
    memberIds,
  }
}

function normalizeExpenseCostItem(expense) {
  return {
    id: expense.id,
    note: expense.note || expense.title || expense.name || 'Phụ phát sinh',
    amount: Number(expense.amount) || 0,
    memberIds: safeArray(expense.participants),
  }
}

function isWaterSessionItem(item) {
  return String(item?.name || item?.note || '').trim().toLowerCase() === 'nước'
}

function normalizeId(value, preferredKey = 'id') {
  if (value && typeof value === 'object') {
    return value[preferredKey] ?? value.id ?? value.expenseId ?? value.memberId ?? value.toId ?? value.fromId ?? null
  }
  return value
}

function currentJoinRequests(state) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  return safeArray(state?.joinRequests)
    .filter(request => String(request?.status || 'pending').toLowerCase() === 'pending')
    .filter(request => {
      const requestGroupId = request.groupId || request.group_id
      return !groupId || !requestGroupId || String(requestGroupId) === String(groupId)
    })
}

function buildGuestRows(sessions) {
  const guests = new Map()
  safeArray(sessions).forEach(session => {
    sessionGuests(session).forEach((guest, index) => {
      const id = guest.id || guest.guest_id || `${guestName(guest)}-${index}`
      const existing = guests.get(String(id)) || {
        id,
        initial: initials({ name: guestName(guest) }),
        name: guestName(guest),
        sessions: 0,
        lastDate: null,
      }
      existing.sessions += 1
      if (!existing.lastDate || parseDateValue(sessionDate(session)) > parseDateValue(existing.lastDate)) {
        existing.lastDate = sessionDate(session)
      }
      guests.set(String(id), existing)
    })
  })

  return Array.from(guests.values()).map(guest => ({
    id: guest.id,
    initial: guest.initial,
    name: guest.name,
    sessions: guest.sessions,
    lastSeen: guest.lastDate ? `Lần cuối ${formatDayMonth(guest.lastDate)}` : 'Chưa rõ',
  }))
}

function guestName(guest) {
  return guest?.guestName || guest?.guest_name || guest?.name || 'Khách'
}

function toTicketRow(ticket, index, state) {
  const memberIds = ticketMemberIds(ticket)
  const attendees = ticketAttendees(ticket, state)
  const status = ticketStatus(ticket)
  const totalAmount = ticketTotalAmount(ticket)
  const amountPerPerson = ticketAmountPerPerson(ticket)
  const waterAmount = Number(ticket?.waterAmount ?? ticket?.water_amount ?? 0) || 0
  const advancerId = ticketAdvancerId(ticket)
  const advancerName = advancerId ? memberName(advancerId, safeArray(state?.members)) : null
  const date = ticketDate(ticket)

  return {
    id: ticket?.id || `ticket-${index}`,
    date,
    number: ticket?.number || ticket?.sessionNumber || ticket?.session_number || index + 1,
    sessionNumber: ticket?.sessionNumber || ticket?.session_number || ticket?.number || index + 1,
    dateLabel: formatSessionDetailDate(date),
    timeLabel: ticket?.timeLabel || ticket?.time || sessionTime(ticket),
    status,
    amount: totalAmount,
    totalAmount,
    waterAmount,
    amountPerPerson,
    memberIds,
    memberLabels: attendees.map(row => row.name),
    memberChips: attendees,
    advancerId,
    advancerName,
    advancer: advancerName,
    expanded: index < 2,
    expiringSoon: Boolean(ticket?.expiringSoon || ticket?.expiring_soon),
    attendees,
  }
}

function ticketStatus(ticket) {
  const normalized = String(ticket?.status || '').toLowerCase()
  const advancerId = ticketAdvancerId(ticket)
  if (normalized === 'pending' || normalized === 'pending_review') return 'pending_review'
  if (normalized === 'team' || normalized === 'team_fund' || !advancerId) return 'team_fund'
  return 'unpaid'
}

function ticketAttendees(ticket, state) {
  const members = safeArray(state?.members)
  const raw = safeArray(ticket?.attendees || ticket?.memberIds || ticket?.member_ids || ticket?.members)
  return raw.map((item, index) => {
    const id = typeof item === 'object' ? (item.memberId || item.member_id || item.id) : item
    const member = members.find(row => String(row.id) === String(id))
    const name = typeof item === 'object' ? (item.name || item.displayName || member?.name) : member?.name
    return {
      id: id || `${ticket?.id || 'ticket'}-${index}`,
      initial: initials(member || { name }),
      name: name || memberName(id, members),
    }
  })
}

function uniqueTickets(tickets) {
  const seen = new Set()
  return safeArray(tickets).filter((ticket, index) => {
    const key = String(ticket?.id || `ticket-${index}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function ticketMemberIds(ticket) {
  return safeArray(ticket?.memberIds || ticket?.member_ids || ticket?.attendees || ticket?.members)
    .map(item => typeof item === 'object' ? (item.memberId || item.member_id || item.id) : item)
    .filter(Boolean)
}

function ticketAdvancerId(ticket) {
  return ticket?.advancerId || ticket?.advancer_id || ticket?.paidBy || ticket?.paid_by || ticket?.payerId || null
}

function ticketTotalAmount(ticket) {
  return Number(ticket?.totalAmount ?? ticket?.total_amount ?? ticket?.amount ?? ticket?.total) || 0
}

function ticketAmountPerPerson(ticket) {
  const memberIds = ticketMemberIds(ticket)
  const waterAmount = Number(ticket?.waterAmount ?? ticket?.water_amount ?? 0) || 0
  const total = ticketTotalAmount(ticket) + waterAmount
  return memberIds.length > 0 ? Math.round(total / memberIds.length) : 0
}

function ticketWaterSharePerPerson(ticket) {
  const memberIds = ticketMemberIds(ticket)
  const water = Number(ticket?.waterAmount ?? ticket?.water_amount ?? 0) || 0
  return memberIds.length > 0 ? Math.round(water / memberIds.length) : 0
}

function ticketDate(ticket) {
  return ticket?.date || ticket?.sessionDate || ticket?.session_date || ticket?.createdAt || ticket?.created_at
}

function buildSessionGenerationConfig(state, yearMonth) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  const group = currentGroup(state)
  const config = currentPickleConfig(state)
  const monthlyConfig = safeArray(state?.pickle?.monthlyConfigs)
    .find(row => (
      String(row?.groupId || row?.group_id || '') === String(groupId || '') &&
      String(row?.yearMonth || row?.year_month || '') === String(yearMonth || '')
    )) || {}
  const [year, month] = String(yearMonth || '').split('-')
  const monthlyWeekdays = normalizeIsoWeekdays(
    monthlyConfig?.scheduleWeekdays ||
    monthlyConfig?.schedule_weekdays
  )
  return {
    scheduleWeekdays: monthlyWeekdays.length > 0 ? monthlyWeekdays : inferScheduleWeekdaysFromMonthSessions(state, yearMonth),
    scheduleTime: monthlyConfig?.scheduleTime || monthlyConfig?.schedule_time ||
      config?.scheduleTime || config?.schedule_time || config?.timeRange || group?.scheduleTime || group?.schedule_time || '19:00-21:00',
    startDate: monthlyConfig?.scheduleStartDay || monthlyConfig?.schedule_start_day ||
      config?.startDate || config?.start_date || `01/${month || String(new Date().getMonth() + 1).padStart(2, '0')}/${year || new Date().getFullYear()}`,
    defaultVenue: config?.defaultVenue || config?.default_venue || group?.defaultVenue || group?.default_venue || group?.name || 'CLB Pickleball',
  }
}

function inferScheduleWeekdaysFromMonthSessions(state, yearMonth) {
  const monthDate = parseDate(`${yearMonth}-01`)
  if (!monthDate) return []
  return [...new Set(getStateMonthSessions(state, monthDate)
    .map(session => parseDate(sessionDate(session)))
    .filter(Boolean)
    .map(date => date.getDay() === 0 ? 7 : date.getDay()))]
    .sort((a, b) => a - b)
}

function hasMissingGeneratedSessions(state, yearMonth, sessions, config) {
  if (String(yearMonth || '') < monthKey(new Date())) return false
  const scheduleWeekdays = safeArray(config?.scheduleWeekdays)
  if (scheduleWeekdays.length === 0) return false
  const expectedDates = generatedSessionDatesForMonth(yearMonth, config)
  if (expectedDates.length === 0) return false
  const existingDates = new Set(safeArray(sessions).map(session => dateKey(sessionDate(session))).filter(Boolean))
  return expectedDates.some(date => !existingDates.has(date))
}

function generatedSessionDatesForMonth(yearMonth, config = {}) {
  const [yearText, monthText] = String(yearMonth || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return []
  const weekdays = new Set(safeArray(config.scheduleWeekdays))
  if (weekdays.size === 0) return []
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = Math.max(1, Math.min(scheduleStartDay(config.startDate), daysInMonth))
  const mm = String(month).padStart(2, '0')
  const dates = []
  for (let day = firstDay; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day)
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
    if (weekdays.has(isoWeekday)) dates.push(`${year}-${mm}-${String(day).padStart(2, '0')}`)
  }
  return dates
}

function scheduleStartDay(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  const text = String(value || '').trim()
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return Number(iso[3])
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
  if (slash) return Number(slash[1])
  return 1
}

function normalizeIsoWeekdays(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\s]+/)
  const map = { T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6, CN: 7 }
  return list
    .map(item => {
      if (typeof item === 'number' && Number.isInteger(item)) return item === 0 ? 7 : item
      return map[toWeekdayShort(item)]
    })
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 7)
}

function currentPickleConfig(state) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  return safeArray(state?._allPickle?.configs || state?.pickleConfigs)
    .find(config => String(config?.groupId || config?.group_id || '') === String(groupId || '')) || {}
}

function currentMonthlyPickleConfig(state, yearMonth) {
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  return safeArray(state?._allPickle?.monthlyConfigs || state?.pickle?.monthlyConfigs || state?.pickleballMonthlyConfigs)
    .find(config => (
      String(config?.groupId || config?.group_id || '') === String(groupId || '') &&
      String(config?.yearMonth || config?.year_month || '') === String(yearMonth || '')
    )) || {}
}

export function isBillingModeFlexForMonth(state, yearMonth) {
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  return String(monthlyConfig?.billingMode ?? monthlyConfig?.billing_mode ?? '') === 'flex'
}

export function memberFlexTicketType(state, memberId, yearMonth) {
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  const monthlyIds = safeArray(monthlyConfig?.monthlyTicketMemberIds ?? monthlyConfig?.monthly_ticket_member_ids)
  if (monthlyIds.some(id => String(id) === String(memberId))) return 'monthly'
  const perSessionIds = safeArray(monthlyConfig?.perSessionTicketMemberIds ?? monthlyConfig?.per_session_ticket_member_ids)
  if (perSessionIds.some(id => String(id) === String(memberId))) return 'per_session'
  return null
}

export function effectiveSessionMemberIdsFlex(session) {
  return safeArray(
    session?.presentMemberIds ??
    session?.present_member_ids ??
    session?.attendeeIds ??
    session?.attendee_ids ??
    []
  ).map(String).filter(Boolean)
}

export function buildMemberMonthBalanceFlex(state, pickle, sessions, memberId, date) {
  const currentYearMonth = monthKey(date || new Date())
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const ticketType = memberFlexTicketType(state, memberId, currentYearMonth)
  const monthlyTicketPrice = Number(monthlyConfig?.monthlyTicketPrice ?? monthlyConfig?.monthly_ticket_price ?? 0)
  const perSessionTicketPrice = Number(monthlyConfig?.perSessionTicketPrice ?? monthlyConfig?.per_session_ticket_price ?? 0)
  const monthlyTicketFee = ticketType === 'monthly' ? monthlyTicketPrice : 0
  const attendedSessionsCount = safeArray(sessions).reduce((count, session) => (
    effectiveSessionMemberIdsFlex(session).some(id => String(id) === String(memberId)) ? count + 1 : count
  ), 0)
  const perSessionTicketFee = ticketType === 'per_session' ? perSessionTicketPrice * attendedSessionsCount : 0
  const waterFee = safeArray(sessions).reduce((sum, session) => {
    const presentIds = effectiveSessionMemberIdsFlex(session)
    if (!presentIds.some(id => String(id) === String(memberId))) return sum
    const splitCount = presentIds.length + sessionGuests(session).length
    return sum + (splitCount > 0 ? Math.round(sessionWaterAmount(session) / splitCount) : 0)
  }, 0)
  const monthTickets = monthTicketsForState(state, date || new Date()).filter(t => ticketStatus(t) !== 'pending_review')
  const myTickets = monthTickets.filter(t => ticketMemberIds(t).some(id => String(id) === String(memberId)))
  const ticketWaterFee = myTickets.reduce((sum, t) => sum + ticketWaterSharePerPerson(t), 0)
  const ticketAttendedCount = myTickets.length
  const ticketPerSessionFee = ticketType === 'per_session'
    ? myTickets.reduce((sum, t) => {
      const billedCount = ticketMemberIds(t).filter(id => memberFlexTicketType(state, id, currentYearMonth) === 'per_session').length
      return sum + (billedCount > 0 ? Math.round(ticketTotalAmount(t) / billedCount) : 0)
    }, 0)
    : 0
  const combinedAttendedSessionsCount = attendedSessionsCount + ticketAttendedCount
  const combinedPerSessionTicketFee = perSessionTicketFee + ticketPerSessionFee
  const combinedWaterFee = waterFee + ticketWaterFee
  const extras = memberExtrasShare(sessions, memberId, state, [], [])
  const ticketShare = memberTeamFundTicketShare(state, memberId, date)
  const p2pBalance = memberTicketBalance(state, memberId, date)
  const netBalance = Math.round(p2pBalance - monthlyTicketFee - combinedPerSessionTicketFee - combinedWaterFee - extras - ticketShare)
  const totalOwed = Math.max(-netBalance, 0)

  return {
    monthlyTicketFee,
    perSessionTicketFee: combinedPerSessionTicketFee,
    waterFee: combinedWaterFee,
    attendedSessionsCount: combinedAttendedSessionsCount,
    extras,
    ticketShare,
    p2pBalance,
    netBalance,
    totalOwed,
    total: totalOwed,
    ticketType,
  }
}

function configuredPickleScheduleTime(state, yearMonth, fallback = '') {
  const group = currentGroup(state)
  const config = currentPickleConfig(state)
  const monthlyConfig = currentMonthlyPickleConfig(state, yearMonth)
  return monthlyConfig?.scheduleTime || monthlyConfig?.schedule_time ||
    config?.scheduleTime || config?.schedule_time || config?.timeRange ||
    group?.scheduleTime || group?.schedule_time || fallback
}

function normalizeWeekdays(value) {
  if (Array.isArray(value) && value.length > 0) return value.map(toWeekdayShort).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return value.split(/[,\s]+/).map(toWeekdayShort).filter(Boolean)
  return ['T2', 'T4', 'T6']
}

function toWeekdayShort(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][value] || ''
  }
  const text = String(value || '').trim().toLowerCase()
  const map = {
    monday: 'T2',
    mon: 'T2',
    t2: 'T2',
    '2': 'T2',
    tuesday: 'T3',
    tue: 'T3',
    t3: 'T3',
    '3': 'T3',
    wednesday: 'T4',
    wed: 'T4',
    t4: 'T4',
    '4': 'T4',
    thursday: 'T5',
    thu: 'T5',
    t5: 'T5',
    '5': 'T5',
    friday: 'T6',
    fri: 'T6',
    t6: 'T6',
    '6': 'T6',
    saturday: 'T7',
    sat: 'T7',
    t7: 'T7',
    '7': 'T7',
    sunday: 'CN',
    sun: 'CN',
    cn: 'CN',
    '0': 'CN',
  }
  return map[text] || String(value || '').toUpperCase()
}

function buildNextMonthPreview(today, weekdays) {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const dates = []
  const wanted = new Set(weekdays)
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(next.getFullYear(), next.getMonth(), day)
    if (wanted.has(labels[date.getDay()])) dates.push(String(day).padStart(2, '0'))
  }

  return {
    label: `tháng ${next.getMonth() + 1}`,
    sessions: dates.length,
    startLabel: dates[0] ? `${labels[new Date(next.getFullYear(), next.getMonth(), Number(dates[0])).getDay()]} ${dates[0]}/${String(next.getMonth() + 1).padStart(2, '0')}` : 'chưa có',
    dates,
  }
}

function batchAccessories(session, members, presentIds) {
  const sessionItems = safeArray(session?.sessionItems || session?.session_items)
  if (sessionItems.length > 0) {
    return sessionItems
      .filter(item => !isWaterSessionItem(item))
      .map(item => {
        const appliesToIds = item.memberIds == null && item.member_ids == null
          ? presentIds
          : safeArray(item.memberIds ?? item.member_ids)
        return {
          name: item.name || 'Phụ phát sinh',
          amount: Number(item.amount) || 0,
          memberIds: appliesToIds,
          applies: appliesToIds.map(id => ({
            name: firstName(memberName(id, members)),
            included: true,
          })),
        }
      })
  }
  return safeArray(session?.expenses)
    .filter(expense => !/nước|water|sân|court/i.test(`${expense?.title || ''} ${expense?.cat || ''} ${expense?.category || ''}`))
    .map(expense => {
      const appliesToIds = safeArray(expense.participants).length > 0 ? expense.participants : presentIds
      return {
        name: expense.title || 'Phụ kiện',
        amount: Number(expense.amount) || 0,
        applies: appliesToIds.map(id => ({
          name: firstName(memberName(id, members)),
          included: true,
        })),
      }
    })
}

function bankData(member, primary = false) {
  const bankName = member?.bankName || member?.bank_name || ''
  const account = member?.bankAccount || member?.bank_account || ''
  const holder = member?.bankAccountName || member?.bank_account_name || member?.displayName || member?.name || ''
  const code = bankCode(bankName)
  return {
    memberId: member?.id,
    member_id: member?.id,
    name: bankName,
    number: account,
    account,
    accountRaw: account,
    holder,
    code,
    accountMasked: maskBankAccount(account),
    brandColor: bankBrandColor(code),
    primary,
  }
}

function findAdminPaymentTarget(members, state) {
  const rows = safeArray(members)
  const isMoneyManager = (member) => ['treasurer', 'admin', 'owner'].includes(String(member?.role || '').toLowerCase())
  const admin = rows.find(member => (
    isMoneyManager(member) &&
    normalizeName(member?.displayName || member?.name).includes('long') &&
    (member?.bankAccount || member?.bank_account)
  )) || rows.find(member => (
    isMoneyManager(member) &&
    (member?.bankAccount || member?.bank_account)
  )) || rows.find(member => String(member?.id || '') === String(state?.currentUserId || '')) || rows[0]
  return bankData(admin, true)
}

function findProfileMember(profileId, members) {
  return safeArray(members).find(member => String(member.profileId || member.profile_id || member.id) === String(profileId || '')) || {}
}

function bankBrandColor(code) {
  const colors = {
    VCB: 'linear-gradient(135deg,#006b3f,#00a859)',
    TCB: 'linear-gradient(135deg,#ef4444,#991b1b)',
    MB: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
    ACB: 'linear-gradient(135deg,#2563eb,#0f766e)',
    BIDV: 'linear-gradient(135deg,#0f766e,#155e75)',
    CTG: 'linear-gradient(135deg,#0066b3,#003a70)',
  }
  return colors[code] || 'linear-gradient(135deg,#6366f1,#4338ca)'
}

function buildOptimizedSettlements(group, members) {
  if (!group?.id) return []
  const balances = currentGroupMemberIds(group, members)
    .map(memberId => ({ memberId, amount: groupNet(group, memberId) }))
    .filter(row => row.amount !== 0)
  const debtors = balances
    .filter(row => row.amount < 0)
    .map(row => ({ memberId: row.memberId, amount: Math.abs(row.amount) }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = balances
    .filter(row => row.amount > 0)
    .map(row => ({ memberId: row.memberId, amount: row.amount }))
    .sort((a, b) => b.amount - a.amount)
  const settlements = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(debtor.amount, creditor.amount)
    if (amount > 0) {
      settlements.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        from: personBrief(debtor.memberId, members),
        to: personBrief(creditor.memberId, members),
        amount,
      })
    }
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount <= 0) debtorIndex += 1
    if (creditor.amount <= 0) creditorIndex += 1
  }

  return settlements
}

function currentGroupMemberIds(group, members) {
  const ids = safeArray(group?.members)
  if (ids.length > 0) return ids
  return safeArray(members).map(member => member.id).filter(Boolean)
}

function profileIdForMember(memberId, members) {
  const member = safeArray(members).find(item => String(item.id) === String(memberId))
  return member?.profileId || member?.profile_id || member?.id || memberId
}

function memberIdsForProfile(profileId, members) {
  return safeArray(members)
    .filter(member => String(member.profileId || member.profile_id || member.id) === String(profileId))
    .map(member => member.id)
    .filter(Boolean)
}

function currentProfileSourceBreakdown(sourceBalances, currentUserId, members) {
  const profileId = profileIdForMember(currentUserId, members)
  const memberIds = new Set(memberIdsForProfile(profileId, members).map(String))
  if (memberIds.size === 0 && currentUserId) memberIds.add(String(currentUserId))
  const bySource = new Map()

  safeArray(sourceBalances)
    .filter(row => memberIds.has(String(row.memberId || row.member_id || '')))
    .forEach(row => {
      const key = `${row.sourceType || row.source_type || 'group'}:${row.sourceId || row.source_id || row.sourceLabel || row.source_label || ''}`
      const existing = bySource.get(key) || {
        sourceId: row.sourceId || row.source_id,
        sourceType: row.sourceType || row.source_type || 'group',
        sourceLabel: row.sourceLabel || row.source_label || 'Nguồn tiền',
        profileId,
        memberId: row.memberId || row.member_id || currentUserId,
        amount: 0,
        monthAmounts: new Map(),
      }
      existing.amount += Number(row.amount) || 0
      safeArray(row.monthBreakdown).forEach(item => {
        const month = item.month || monthKey(item.date)
        if (!month) return
        existing.monthAmounts.set(month, (existing.monthAmounts.get(month) || 0) + (Number(item.amount) || 0))
      })
      if (!safeArray(row.monthBreakdown).length && row.month) {
        existing.monthAmounts.set(row.month, (existing.monthAmounts.get(row.month) || 0) + (Number(row.amount) || 0))
      }
      bySource.set(key, existing)
    })

  return [...bySource.values()]
    .map(row => {
      const monthBreakdown = [...row.monthAmounts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, label: sourceMonthLabel(month), amount }))
        .filter(item => item.amount !== 0)
      const { monthAmounts, ...rest } = row
      return { ...rest, monthBreakdown }
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.sourceLabel.localeCompare(b.sourceLabel, 'vi'))
}

function aggregateBalancesByProfile(sourceBalances, members) {
  const byProfile = new Map()
  safeArray(sourceBalances).forEach(row => {
    const profileId = profileIdForMember(row.memberId || row.member_id, members)
    if (!profileId) return
    if (!byProfile.has(String(profileId))) {
      const memberIds = memberIdsForProfile(profileId, members)
      const member = safeArray(members).find(item => String(item.profileId || item.profile_id || item.id) === String(profileId)) || {}
      byProfile.set(String(profileId), {
        profileId,
        memberIds,
        name: member.displayName || member.name || 'Thành viên',
        initials: initials(member),
        color: member.color || '#574EFA',
        amount: 0,
        sources: [],
      })
    }
    const item = byProfile.get(String(profileId))
    const amount = Number(row.amount) || 0
    item.amount += amount
    item.sources.push({
      sourceId: row.sourceId || row.source_id,
      sourceType: row.sourceType || row.source_type || 'group',
      sourceLabel: row.sourceLabel || row.source_label || 'Nguồn tiền',
      profileId,
      memberId: row.memberId || row.member_id || '',
      memberName: item.name,
      amount,
    })
  })
  return [...byProfile.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.name.localeCompare(b.name, 'vi'))
}

function buildProfileBillRows(sourceBalances, members) {
  return aggregateBalancesByProfile(sourceBalances, members)
    .map(bill => {
      const sourceMap = new Map()
      safeArray(bill.sources).forEach(source => {
        const key = `${source.sourceType}:${source.sourceId || source.sourceLabel}`
        const existing = sourceMap.get(key) || { ...source, amount: 0 }
        existing.amount += Number(source.amount) || 0
        sourceMap.set(key, existing)
      })
      const sources = [...sourceMap.values()]
        .filter(source => source.amount !== 0)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.sourceLabel.localeCompare(b.sourceLabel, 'vi'))
      return {
        ...bill,
        sources,
        status: bill.amount < 0 ? 'unpaid' : 'paid',
        sub: bill.amount < 0 ? `${sources.length} nguồn cần nộp` : `${sources.length} nguồn cần bù`,
      }
    })
    .filter(bill => bill.amount !== 0)
}

function buildProfileSyncData(state, me) {
  const members = safeArray(state?.members)
  const profiles = safeArray(state?.profiles)
  const currentProfileId = me?.profileId || me?.profile_id || me?.id || state?.currentUserId
  const profile = profiles.find(item => String(item.id) === String(currentProfileId)) || me || {}
  const linkedMemberships = members
    .filter(member => String(member.profileId || member.profile_id || member.id) === String(currentProfileId))
    .map(member => profileMembershipRow(member, state))
    .sort((a, b) => a.groupName.localeCompare(b.groupName, 'vi') || a.name.localeCompare(b.name, 'vi'))
  const candidates = members
    .filter(member => String(member.profileId || member.profile_id || member.id) !== String(currentProfileId))
    .map(member => profileMembershipRow(member, state))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi') || a.groupName.localeCompare(b.groupName, 'vi'))

  return {
    profileId: currentProfileId,
    name: profile.displayName || profile.name || me?.displayName || me?.name || state?.currentUserName || 'Bạn',
    bankName: profile.bankName || profile.bank_name || me?.bankName || me?.bank_name || '',
    bankAccount: profile.bankAccount || profile.bank_account || me?.bankAccount || me?.bank_account || '',
    linkedMemberships,
    candidates,
  }
}

function profileMembershipRow(member, state) {
  const groupId = member.groupId || member.group_id
  const group = safeArray(state?.groups).find(item => String(item.id) === String(groupId)) || {}
  return {
    memberId: member.id,
    profileId: member.profileId || member.profile_id || member.id,
    name: member.displayName || member.name || 'Thành viên',
    initials: initials(member),
    groupId,
    groupName: group.name || 'Nhóm',
    groupEmoji: group.emoji || '👥',
    role: member.role || 'member',
    bankName: member.bankName || member.bank_name || '',
    bankAccount: member.bankAccount || member.bank_account || '',
  }
}

function personBrief(memberId, members) {
  const member = safeArray(members).find(row => String(row.id) === String(memberId))
  return {
    initial: initials(member),
    name: member?.displayName || member?.name || 'Thành viên',
  }
}

function toNotificationItem(notification, state) {
  const type = String(notification?.type || notification?.kind || '').toLowerCase()
  const isJoinRequest = type.includes('join')
  const isPickle = type.includes('pickle')
  const isExpense = type.includes('expense') || type.includes('chi')
  const isPayment = type.includes('payment') || type.includes('settlement')
  const metadata = notification?.metadata || {}
  const paymentStatus = String(metadata.status || 'pending').toLowerCase()
  const isPendingPayment = isPayment && paymentStatus === 'pending'
  const canReviewPayment = canReviewPaymentNotifications(state)
  const isOwnPayment = isPayment && String(notification?.actorMemberId || notification?.actor_member_id || '') === String(state?.currentUserId || '')
  const paymentTitle = isOwnPayment && paymentStatus === 'confirmed'
    ? `Long đã xác nhận thanh toán <strong>${escapeHtml(fmtVNDFull(metadata.amount || 0))}</strong>`
    : isOwnPayment && paymentStatus === 'rejected'
      ? `Long chưa nhận được thanh toán <strong>${escapeHtml(fmtVNDFull(metadata.amount || 0))}</strong>`
      : notification?.titleHtml || notification?.title || notification?.message || 'Thông báo mới'
  return {
    id: notification?.id,
    unread: notification?.unread ?? notification?.read === false,
    icon: notification?.icon || (isJoinRequest ? '👤' : isPickle ? '🏓' : isPayment ? (paymentStatus === 'rejected' ? '⚠️' : '✅') : isExpense ? '💸' : '🔔'),
    iconBg: notification?.iconBg || notification?.icon_bg || (isPickle ? 'rgba(52,211,153,0.10)' : 'rgba(99,102,241,0.12)'),
    title: paymentTitle,
    sub: notification?.sub || notification?.subtitle || (isOwnPayment && paymentStatus === 'confirmed' ? 'Khoản này đã được thủ quỹ ghi nhận' : groupLabelById(state, notification?.groupId || notification?.group_id)),
    when: notification?.when || relativeTimeLabel(notification?.createdAt || notification?.created_at || notification?.date),
    date: notification?.createdAt || notification?.created_at || notification?.date,
    status: isPayment ? paymentStatus : notification?.status,
    actions: isJoinRequest ? 'joinRequest' : isPendingPayment && canReviewPayment ? 'paymentConfirmation' : notification?.actions,
  }
}

function canReviewPaymentNotifications(state) {
  const currentMember = safeArray(state?.members).find(member => String(member?.id || '') === String(state?.currentUserId || '')) || {}
  const currentName = normalizeName(currentMember?.displayName || currentMember?.name || state?.currentUserName || '')
  return ['treasurer', 'admin', 'owner'].includes(String(currentMember?.role || '').toLowerCase()) || currentName.includes('long')
}

function groupNotifications(notifications) {
  const buckets = new Map()
  safeArray(notifications).forEach(notification => {
    const label = notificationGroupLabel(notification.date)
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label).push(notification)
  })
  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }))
}

function notificationGroupLabel(value) {
  const key = dateKey(value)
  const today = dateKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === today) return 'Hôm nay'
  if (key === dateKey(yesterday)) return 'Hôm qua'
  return key ? formatDayMonth(value) : 'Sớm hơn'
}

function approvalFilters(requests, state) {
  const filters = [{ key: 'all', label: `Tất cả · ${requests.length}` }]
  const byGroup = new Map()
  requests.forEach(request => {
    const key = request.groupId || request.group_id || 'current'
    byGroup.set(key, (byGroup.get(key) || 0) + 1)
  })
  byGroup.forEach((count, groupId) => {
    filters.push({ key: String(groupId), label: `${groupLabelById(state, groupId)} · ${count}` })
  })
  return filters
}

function toApprovalRequest(request, state) {
  const members = safeArray(state?.members)
  const matched = members.find(member => sameName(member.name, request.name))
  const created = parseDate(request.createdAt || request.created_at)
  const urgent = created ? Date.now() - created.getTime() > 2 * 60 * 60 * 1000 : false
  return {
    id: request.id,
    name: request.name || 'Thành viên mới',
    initial: initials({ name: request.name }),
    avatarBg: 'linear-gradient(135deg,#6366f1,#4338ca)',
    groupLabel: groupLabelById(state, request.groupId || request.group_id),
    whenLabel: relativeTimeLabel(created),
    urgent,
    matchType: matched ? 'matched' : 'new',
    matchedName: matched?.displayName || matched?.name,
  }
}

function groupLabelById(state, groupId) {
  const group = safeArray(state?.groups).find(item => String(item.id) === String(groupId)) || currentGroup(state)
  return `${group.emoji || '👥'} ${group.name || 'Nhóm'}`
}

function periodDate(params) {
  const value = typeof params === 'object'
    ? (params?.month || params?.yearMonth || params?.year_month || params?.date || params?.periodStart || params?.period_start)
    : params
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-01T00:00:00`)
  return parseDate(value) || new Date()
}

function monthEndKey(date) {
  const d = parseDate(date) || new Date()
  return dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

function allExpenses(state) {
  const rows = [
    ...safeArray(state?.expenses),
    ...safeArray(state?.currentGroup?.expenses),
    ...safeArray(state?.groups).flatMap(group => safeArray(group?.expenses)),
  ]
  const seen = new Set()
  return rows.filter((expense, index) => {
    const key = String(expense?.id || `expense-${index}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildExpenseCategories(expenses) {
  const palette = ['#6366f1', '#34d399', '#fbbf24', '#a78bfa', '#f87171']
  const byCategory = new Map()
  safeArray(expenses).forEach(expense => {
    const key = expenseCategory(expense)
    const existing = byCategory.get(key) || { label: expenseCategoryLabel(expense), amount: 0 }
    existing.amount += Number(expense.amount) || 0
    byCategory.set(key, existing)
  })
  return Array.from(byCategory.values()).map((item, index) => ({
    ...item,
    color: palette[index % palette.length],
  }))
}

function expenseCategoryLabel(expense) {
  const category = expenseCategory(expense)
  const labels = {
    pickleball: '🏸 Pickleball',
    food: '🍜 Ăn uống',
    cafe: '☕ Cafe',
    payment: '💸 Thanh toán',
    groups: '👥 Nhóm',
    general: '🧾 Chung',
  }
  return labels[category] || `🧾 ${category}`
}

function findExpense(state, expenseId) {
  const id = normalizeId(expenseId, 'expenseId')
  return allExpenses(state).find(expense => String(expense?.id) === String(id)) || null
}

function groupForExpense(state, expense) {
  const groupId = expense?.groupId || expense?.group_id
  return safeArray(state?.groups).find(group => String(group.id) === String(groupId)) || null
}

function expenseSplits(expense, members, payer, currentUserId) {
  const amount = Number(expense?.amount) || 0
  const participants = safeArray(expense?.participants)
  const rows = safeArray(expense?.splits).length > 0
    ? safeArray(expense?.splits).map(split => ({
      memberId: split.memberId || split.member_id,
      amount: Number(split.amount ?? split.share_amount) || 0,
    }))
    : participants.map((memberId, index) => {
      const per = participants.length ? Math.round(amount / participants.length) : 0
      return {
        memberId,
        amount: index === participants.length - 1 ? amount - per * (participants.length - 1) : per,
      }
    })

  return rows.map(split => {
    const member = members.find(row => String(row.id) === String(split.memberId))
    const isPayer = String(split.memberId) === String(payer?.id)
    const isMe = String(split.memberId) === String(currentUserId)
    const settled = String(expense?.status || '').toLowerCase() === 'settled'
    return {
      initial: initials(member),
      name: member?.displayName || member?.name || 'Thành viên',
      isMe,
      sub: isPayer ? 'Người ứng tiền' : `Còn nợ ${firstName(payer?.name)}`,
      amount: isPayer ? Math.abs(split.amount) : -Math.abs(split.amount),
      tag: isPayer ? 'mine' : settled ? 'paid' : 'owe',
    }
  })
}

function fullExpenseDate(value) {
  const date = parseDate(value)
  if (!date) return ''
  return `${WEEKDAYS[date.getDay()]} · ${formatDayMonth(date)}/${date.getFullYear()}`
}

function monthYearLabel(value) {
  const date = parseDate(value)
  if (!date) return 'gần đây'
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function relativeTimeLabel(value) {
  const date = parseDate(value)
  if (!date) return 'vừa xong'
  const diff = Date.now() - date.getTime()
  if (diff < 60 * 1000) return 'vừa xong'
  if (diff < 60 * 60 * 1000) return `${Math.max(Math.round(diff / 60000), 1)} phút trước`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.max(Math.round(diff / 3600000), 1)} giờ trước`
  return relativeDateLabel(date)
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeGroup(group) {
  return {
    ...(group || {}),
    members: safeArray(group?.members),
    expenses: safeArray(group?.expenses).map(normalizeExpenseForBalance),
    settlements: safeArray(group?.settlements),
    settlementPeriods: safeArray(group?.settlementPeriods),
  }
}

function normalizeExpenseForBalance(expense) {
  return {
    ...(expense || {}),
    paidBy: expense?.paidBy || expense?.paid_by_member_id || expense?.payerId || expense?.payer_id || '',
    participants: safeArray(expense?.participants),
    splits: safeArray(expense?.splits).map(split => ({
      ...split,
      memberId: split?.memberId || split?.member_id || '',
      amount: Number(split?.amount) || 0,
    })).filter(split => split.memberId),
    date: expense?.date || expense?.expense_date || '',
  }
}

function firstName(name) {
  return String(name || 'Bạn').trim().split(/\s+/)[0] || 'Bạn'
}

function initials(member) {
  const existing = member?.initials || member?.initial
  if (existing) return String(existing).slice(0, 2).toUpperCase()
  const words = String(member?.displayName || member?.name || '?').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words.map(word => word[0]).join('').slice(0, 2).toUpperCase()
}

function memberName(memberId, members) {
  const member = safeArray(members).find(m => String(m.id) === String(memberId))
  return member?.displayName || member?.name || 'Ai đó'
}

function membersForGroup(group, members) {
  return allMembersForGroup(group, members)
    .filter(isExpenseActiveMember)
}

function allMembersForGroup(group, members) {
  const ids = new Set(safeArray(group?.members).map(String))
  const groupId = group?.id
  return safeArray(members).filter(member => {
    const memberGroupId = member.groupId || member.group_id || ''
    if (groupId && memberGroupId) return String(memberGroupId) === String(groupId)
    return ids.has(String(member.id))
  })
}

function memberIdForGroup(group, currentUserId, members, currentUserName) {
  if (!group) return currentUserId
  const groupMemberIds = new Set(safeArray(group.members).map(String))
  if (groupMemberIds.has(String(currentUserId))) return currentUserId

  const currentMember = safeArray(members).find(m => String(m.id) === String(currentUserId))
  const currentName = currentUserName || currentMember?.name
  const match = allMembersForGroup(group, members).filter(isActiveMember).find(member => sameName(member.name, currentName))
  return match?.id || currentUserId
}

function groupNetForMember(group, currentUserId, members, currentUserName) {
  if (!group?.id) return 0
  return groupNet(group, memberIdForGroup(group, currentUserId, members, currentUserName))
}

function groupBalanceForMember(group, currentUserId, members, currentUserName) {
  if (!group?.id) return {}
  return groupBalance(group, memberIdForGroup(group, currentUserId, members, currentUserName))
}

function sameName(a, b) {
  return normalizeName(a) === normalizeName(b)
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function groupKind(group) {
  if (group?.linkedPickleballGroupId || group?.linked_pickleball_group_id) return 'groups'
  const explicit = String(group?.type || group?.kind || group?.groupType || group?.group_type || '').toLowerCase()
  if (explicit === 'pickleball') return 'pickleball'
  if (explicit === 'expense') return 'groups'
  const text = `${group?.name || ''} ${group?.emoji || ''}`.toLowerCase()
  if (text.includes('pickle') || text.includes('🏓') || text.includes('🏸')) return 'pickleball'
  if (text.includes('cafe') || text.includes('cà phê') || text.includes('☕')) return 'cafe'
  if (text.includes('ăn') || text.includes('trưa') || text.includes('food') || text.includes('🍜')) return 'food'
  if (text.includes('du lịch') || text.includes('trip')) return 'trip'
  return 'groups'
}

function groupTypeLabel(group) {
  const emoji = String(group?.emoji || '')
  const byEmoji = GROUP_TYPE_LABELS.find(type => type.emojis.includes(emoji))
  if (byEmoji) return byEmoji.label
  const explicit = String(group?.groupType || group?.group_type || group?.type || group?.kind || '').toLowerCase()
  const byKey = GROUP_TYPE_LABELS.find(type => type.key === explicit)
  if (byKey) return byKey.label
  return groupKind(group) === 'pickleball' ? 'Pickleball' : 'Chi tiêu'
}

function expenseCategory(expense) {
  if (expense?.pickleSessionId || expense?.pickle_session_id) return 'pickleball'
  const cat = String(expense?.cat || expense?.category || '').toLowerCase()
  if (cat.includes('pickle')) return 'pickleball'
  if (cat.includes('cafe') || cat.includes('coffee')) return 'groups'
  if (cat.includes('payment') || cat.includes('settlement')) return 'payment'
  return cat || 'groups'
}

function expenseIcon(expense) {
  const category = expenseCategory(expense)
  if (category === 'pickleball') return '🏸'
  if (category === 'payment') return '💸'
  if (category === 'cafe') return '☕'
  if (category === 'veg') return '🥗'
  return '🍜'
}

function expenseImpact(expense, currentUserId) {
  const amount = Number(expense?.amount) || 0
  const splits = safeArray(expense?.splits)
  const participants = safeArray(expense?.participants)
  const mySplit = splits.find(split => String(split.memberId) === String(currentUserId))
  const share = Number(mySplit?.amount) || (participants.includes(currentUserId) && participants.length > 0
    ? Math.round(amount / participants.length)
    : 0)

  if (String(expense?.paidBy) === String(currentUserId)) return amount - share
  if (share > 0) return -share
  return 0
}

function statusBadge(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'approved' || normalized === 'settled' || normalized === 'done') {
    return { tone: 'success', label: '✓ Đã chia' }
  }
  if (normalized === 'declined' || normalized === 'rejected') {
    return { tone: 'danger', label: '✕ Từ chối' }
  }
  return { tone: 'warn', label: '⏳ Đang chờ' }
}

function buildBalanceLabel(balanceMap, balance, members) {
  if (balance === 0) return 'Cân bằng'
  const entries = Object.entries(balanceMap).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  const [memberId, amount] = entries[0] || []
  if (balance < 0) return `Nợ ${memberName(memberId, members)} ${fmtVNDFull(Math.abs(amount || balance))}`
  return `${memberName(memberId, members)} còn nợ bạn ${fmtVNDFull(Math.abs(amount || balance))}`
}

function uniqueSessions(sessions) {
  const seen = new Set()
  return safeArray(sessions).filter((session, index) => {
    const key = String(session?.id || session?.date || session?.session_date || `row-${index}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getMonthSessions(pickle, date) {
  const month = monthKey(date)
  return uniqueSessions([...safeArray(pickle?.sessions), ...safeArray(pickle?.upcoming)])
    .filter(session => monthKey(sessionDate(session)) === month)
    .sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))
}

function findNearestOpenSession(pickle, referenceDate) {
  const todayKey = dateKey(referenceDate)
  const fixedCount = safeArray(pickle?.fixedMembers).length
  return uniqueSessions([...safeArray(pickle?.upcoming), ...safeArray(pickle?.sessions)])
    .filter(session => {
      const key = dateKey(sessionDate(session))
      if (!key || key < todayKey) return false
      const present = sessionMemberIds(session).length
      const total = fixedCount || present
      return total === 0 || present < total || !isDoneStatus(session?.status)
    })
    .sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))[0] || null
}

function toTodaySessionCard(session, pickle, members) {
  return {
    id: session.id,
    number: sessionNumber(session, uniqueSessions([...safeArray(pickle?.sessions), ...safeArray(pickle?.upcoming)])),
    timeLabel: `${isToday(sessionDate(session)) ? 'Hôm nay' : formatDayMonth(sessionDate(session))} · ${sessionTime(session)}`,
    dateLabel: formatDayMonth(sessionDate(session)),
    venue: sessionCourt(session),
    present: sessionMemberIds(session).length,
    total: safeArray(pickle?.fixedMembers).length || members.length,
  }
}

function toOverviewSessionCard(session, pickle, members, scheduleTime = '', monthSessions = null, groupName = '') {
  const sessionList = monthSessions || uniqueSessions([...safeArray(pickle?.sessions), ...safeArray(pickle?.upcoming)])
  const sorted = safeArray(sessionList).slice().sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))
  const sessionDateStr = dateKey(sessionDate(session))
  let idx = session?.id ? sorted.findIndex(s => String(s.id) === String(session.id)) : -1
  if (idx < 0 && sessionDateStr) idx = sorted.findIndex(s => dateKey(sessionDate(s)) === sessionDateStr)
  const monthNumber = idx >= 0 ? idx + 1 : (session?.number || 1)
  return {
    id: session.id,
    number: monthNumber,
    statusLabel: isToday(sessionDate(session)) ? 'Hôm nay' : 'Buổi tới',
    timeRange: scheduleTime || sessionTimeRange(session),
    dateLabel: formatDayMonth(sessionDate(session)),
    venue: groupName || sessionCourt(session),
    present: sessionMemberIds(session).length,
    total: safeArray(pickle?.fixedMembers).length || members.length,
  }
}

function sessionNumber(session, sessions) {
  if (session?.number) return session.number
  const sorted = safeArray(sessions).slice().sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))
  let index = session?.id ? sorted.findIndex(item => String(item.id) === String(session.id)) : -1
  if (index < 0) {
    const dateStr = dateKey(sessionDate(session))
    index = dateStr ? sorted.findIndex(item => dateKey(sessionDate(item)) === dateStr) : -1
  }
  return index >= 0 ? index + 1 : 1
}

function sessionMemberIds(session) {
  return safeArray(session?.attendees || session?.attended || session?.attendance)
    .map(item => typeof item === 'object' ? (item.memberId || item.member_id || item.id) : item)
    .filter(Boolean)
}

function sessionAttendanceRecords(session) {
  return safeArray(session?.attendanceRecords || session?.attendance_records)
    .map(record => ({
      memberId: record?.memberId || record?.member_id || record?.id,
      status: String(record?.status || record?.rsvp_status || '').toLowerCase() === 'absent' ||
        String(record?.status || record?.rsvp_status || '').toLowerCase() === 'not_going' ||
        record?.attended === false
        ? 'absent'
        : 'present',
    }))
    .filter(record => record.memberId)
}

export function effectiveSessionMemberIds(session, members = [], fallbackPresentMembers = true) {
  const memberIds = safeArray(members).map(member => member?.id || member?.member_id).filter(Boolean)
  const records = sessionAttendanceRecords(session)
  const sessionIds = sessionMemberIds(session)
  if (records.length === 0) return sessionIds.length > 0 ? sessionIds : isDoneStatus(session?.status) ? memberIds : []

  const absentIds = new Set(records.filter(record => record.status === 'absent').map(record => String(record.memberId)))
  const presentIds = new Set([
    ...sessionIds,
    ...records.filter(record => record.status !== 'absent').map(record => record.memberId),
  ].map(String))

  if (fallbackPresentMembers) {
    safeArray(members).forEach(member => {
      const memberId = member?.id || member?.member_id
      if (!memberId) return
      const memberType = member?.member_type || member?.memberType
      if (memberType === 'casual') return
      if (!absentIds.has(String(memberId))) presentIds.add(String(memberId))
    })
  }
  absentIds.forEach(memberId => presentIds.delete(memberId))
  return Array.from(presentIds)
}

function sessionIncludesCurrentUser(state, memberIds, members = currentGroupMembers(state)) {
  const currentUserId = state?.currentUserId
  if (!currentUserId) return false
  const presentIds = new Set(safeArray(memberIds).map(String))
  if (presentIds.has(String(currentUserId))) return true
  const currentProfileId = profileIdForMember(currentUserId, members)
  if (memberIdsForProfile(currentProfileId, members).some(memberId => presentIds.has(String(memberId)))) return true
  const currentMember = safeArray(members).find(member => String(member.id) === String(currentUserId))
  const currentName = currentMember?.displayName || currentMember?.name || state?.currentUserName
  if (!currentName) return false
  return safeArray(members).some(member => (
    presentIds.has(String(member.id || member.member_id)) &&
    sameName(member.displayName || member.name, currentName)
  ))
}

function sessionGuests(session) {
  return safeArray(session?.guests)
}

function membersForCurrentPickle(state, members, fixedMembers) {
  const fixedSet = new Set(safeArray(fixedMembers).map(String))
  const groupId = state?.currentGroupId || state?.currentGroup?.id
  const groupMembers = safeArray(members).filter(member => (
    (fixedSet.size > 0 && fixedSet.has(String(member.id))) ||
    String(member.groupId || member.group_id || '') === String(groupId || '')
  ))
  return groupMembers.length > 0 ? groupMembers : safeArray(members)
}

function personChip(member) {
  return {
    id: member.id,
    name: member.displayName || member.name || member.short,
    initial: initials(member),
    memberType: memberType(member),
  }
}

function sessionWaterAmount(session) {
  const direct = Number(session?.water_amount ?? session?.waterAmount ?? session?.water)
  if (Number.isFinite(direct) && direct > 0) return direct
  const waterItem = safeArray(session?.sessionItems || session?.session_items).find(isWaterSessionItem)
  if (waterItem) return Number(waterItem.amount) || 0
  return safeArray(session?.expenses)
    .filter(expense => /nước|water/i.test(`${expense?.title || ''} ${expense?.cat || ''} ${expense?.category || ''}`))
    .reduce((sum, expense) => sum + (Number(expense?.amount) || 0), 0)
}

function sessionAccessories(session, members, presentIds) {
  const sessionItems = safeArray(session?.sessionItems || session?.session_items)
  if (sessionItems.length > 0) {
    return sessionItems
      .filter(item => !isWaterSessionItem(item))
      .map(item => {
        const appliesToIds = item.memberIds == null && item.member_ids == null
          ? presentIds
          : safeArray(item.memberIds ?? item.member_ids)
        return {
          icon: '⚡',
          name: item.name || 'Khoản phụ',
          total: Number(item.amount) || 0,
          appliesTo: appliesToIds.map(id => firstName(memberName(id, members))),
        }
      })
  }
  return safeArray(session?.expenses)
    .filter(expense => !/nước|water|sân|court/i.test(`${expense?.title || ''} ${expense?.cat || ''} ${expense?.category || ''}`))
    .map(expense => {
      const appliesToIds = safeArray(expense.participants).length > 0 ? expense.participants : presentIds
      return {
        icon: '📦',
        name: expense.title || 'Khoản phụ',
        total: Number(expense.amount) || 0,
        appliesTo: appliesToIds.map(id => firstName(memberName(id, members))),
      }
    })
}

function perPersonCourtFee(pickle, monthSessions) {
  const fixedCount = safeArray(pickle?.fixedMembers).length
  const ym = String(sessionDate(monthSessions[0]) || '').slice(0, 7)
  const monthlyConfig = safeArray(pickle?.monthlyConfigs).find(c => (
    c?.yearMonth === ym || c?.year_month === ym
  ))
  const perMonthFixedIds = safeArray(monthlyConfig?.fixed_member_ids ?? monthlyConfig?.fixedMemberIds)
  const memberCount = perMonthFixedIds.length > 0 ? perMonthFixedIds.length : fixedCount
  const courtFee = Number(monthlyConfig ? (monthlyConfig.courtFee ?? monthlyConfig.court_fee) : pickle?.monthlyCourtFee) || 0
  if (!memberCount || !monthSessions.length || !courtFee) return 0
  return Math.round(courtFee / monthSessions.length / memberCount)
}

function memberTicketBalance(state, memberId, date) {
  return monthTicketsForState(state, date || new Date()).reduce((sum, ticket) => {
    if (ticketStatus(ticket) !== 'unpaid') return sum
    const memberIds = ticketMemberIds(ticket)
    if (!memberIds.some(id => String(id) === String(memberId))) {
      return String(ticketAdvancerId(ticket)) === String(memberId)
        ? sum + ticketAmountPerPerson(ticket) * memberIds.length
        : sum
    }
    const advancerId = ticketAdvancerId(ticket)
    if (!advancerId) return sum
    const amountPerPerson = ticketAmountPerPerson(ticket)
    if (String(advancerId) === String(memberId)) {
      return sum + amountPerPerson * memberIds.filter(id => String(id) !== String(memberId)).length
    }
    return sum - amountPerPerson
  }, 0)
}

function memberTeamFundTicketShare(state, memberId, date) {
  return monthTicketsForState(state, date || new Date()).reduce((sum, ticket) => {
    if (ticketStatus(ticket) !== 'team_fund') return sum
    const memberIds = ticketMemberIds(ticket)
    if (!memberIds.some(id => String(id) === String(memberId))) return sum
    return sum + ticketAmountPerPerson(ticket)
  }, 0)
}

function currentMonthTicketsForState(state) {
  return monthTicketsForState(state, new Date())
}

function monthTicketsForState(state, date) {
  const currentMonth = monthKey(date)
  const currentGroupId = state?.currentGroupId || state?.currentGroup?.id
  return uniqueTickets([
    ...safeArray(state?.pickle?.externalTickets),
    ...safeArray(state?._allPickle?.externalTickets),
    ...safeArray(state?.tickets),
  ]).filter(ticket => {
    const groupId = ticket?.groupId || ticket?.group_id
    const yearMonth = ticket?.yearMonth || ticket?.year_month || monthKey(ticketDate(ticket))
    return (!groupId || !currentGroupId || String(groupId) === String(currentGroupId)) &&
      (!yearMonth || yearMonth === currentMonth)
  })
}

function buildTicketMonthStats(state, date) {
  const rows = monthTicketsForState(state, date || new Date()).map((ticket, index) => toTicketRow(ticket, index, state))
  const approvedRows = rows.filter(ticket => ticket.status !== 'pending_review')
  const unpaid = rows.filter(ticket => ticket.status === 'unpaid')
  const pending = rows.filter(ticket => ticket.status === 'pending_review')
  const teamFund = rows.filter(ticket => ticket.status === 'team_fund')
  return {
    sessionCount: approvedRows.length,
    participantCount: approvedRows.reduce((sum, ticket) => sum + safeArray(ticket.memberIds).length, 0),
    totalAttendances: approvedRows.reduce((sum, ticket) => sum + safeArray(ticket.memberIds).length, 0),
    totalAmount: approvedRows.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0),
    pendingCount: pending.length,
    unpaidCount: unpaid.length,
    teamFundCount: teamFund.length,
  }
}

function ticketBalanceForMember(tickets, currentUserId) {
  return safeArray(tickets).reduce((sum, ticket) => {
    const attendees = safeArray(ticket.attendees || ticket.memberIds || ticket.member_ids)
    const includesMe = attendees.some(item => String(typeof item === 'object' ? item.id : item) === String(currentUserId))
    if (!includesMe || ticketStatus(ticket) !== 'unpaid') return sum
    const per = Number(ticket.perPerson || ticket.per_person) || (
      attendees.length ? Math.round((Number(ticket.amount) || 0) / attendees.length) : 0
    )
    return sum - per
  }, 0)
}

function profileColorIndex(color) {
  const value = String(color || '')
  if (!value) return 0
  return Array.from(value).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 6
}

function bankCode(bankName) {
  const clean = String(bankName || '').trim()
  if (!clean) return '--'
  const known = {
    vietcombank: 'VCB',
    techcombank: 'TCB',
    mbbank: 'MB',
    mb: 'MB',
    acb: 'ACB',
    bidv: 'BIDV',
    vietinbank: 'CTG',
  }
  const key = clean.toLowerCase().replace(/\s+/g, '')
  return known[key] || clean.split(/\s+/).map(part => part[0]).join('').slice(0, 4).toUpperCase()
}

function maskBankAccount(value) {
  const digits = String(value || '').replace(/\s+/g, '')
  if (!digits) return ''
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ••••`.trim()
}

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const text = String(value)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00`) : new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDateValue(value) {
  return parseDate(value)?.getTime() || 0
}

function sessionDate(session) {
  return session?.date || session?.sessionDate || session?.session_date
}

function dateKey(value) {
  const date = parseDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthKey(value) {
  const date = parseDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateFromYearMonth(yearMonth) {
  const [year, month] = String(yearMonth || monthKey(new Date())).split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return new Date()
  return new Date(year, month - 1, 1)
}

function formatFullDate(value) {
  const date = parseDate(value) || new Date()
  return `${WEEKDAYS[date.getDay()]} · ${formatDayMonth(date)}/${date.getFullYear()}`
}

function formatMonthLabel(value) {
  const date = parseDate(value) || new Date()
  return `Tháng ${date.getMonth() + 1} · ${date.getFullYear()}`
}

function formatDayMonth(value) {
  const date = parseDate(value)
  if (!date) return ''
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatSessionDetailDate(value) {
  const date = parseDate(value)
  if (!date) return ''
  return `${WEEKDAYS_SHORT[date.getDay()]} ${formatDayMonth(date)}`
}

function relativeDateLabel(value) {
  const key = dateKey(value)
  const today = new Date()
  const todayKey = dateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (key === todayKey) return 'Hôm nay'
  if (key === dateKey(yesterday)) return 'Hôm qua'
  return formatDayMonth(value)
}

function isToday(value) {
  return dateKey(value) === dateKey(new Date())
}

function sessionTime(session) {
  return session?.time || session?.startTime || session?.start_time || '19:00'
}

function sessionTimeRange(session, withToday = false) {
  const range = session?.timeRange || session?.time_range || (
    session?.endTime || session?.end_time
      ? `${sessionTime(session)} – ${session.endTime || session.end_time}`
      : `${sessionTime(session)} – 21:00`
  )
  return withToday && isToday(sessionDate(session)) ? `HÔM NAY · ${range}` : range
}

function sessionCourt(session) {
  return session?.venue || session?.courtName || session?.court_name || session?.court || 'CLB Pickleball'
}

function sessionAddress(session) {
  return session?.address || session?.courtAddress || session?.court_address || session?.notes || ''
}

function isDoneStatus(status) {
  return ['done', 'completed', 'closed'].includes(String(status || '').toLowerCase())
}

function sessionStatusLabel(session) {
  if (isToday(sessionDate(session))) return 'Hôm nay'
  if (isDoneStatus(session?.status)) return 'Đã hoàn tất'
  return 'Sắp diễn ra'
}
