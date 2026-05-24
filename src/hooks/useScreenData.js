import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '../store.jsx'
import {
  fmtVNDFull,
  groupBalance,
  groupNet,
  pickleSummary,
  recentActivity,
} from '../data.jsx'

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function profilePhotoStorageKey(memberId) {
  return `spliteasy_profile_photo_${memberId || 'me'}`
}

function loadStoredProfilePhoto(memberId) {
  if (!memberId || typeof localStorage === 'undefined') return ''
  return localStorage.getItem(profilePhotoStorageKey(memberId)) || ''
}

export function useScreenData() {
  const { state, dispatch } = useApp()
  const autoGenerateRef = useRef('')
  const staleCleanupRef = useRef('')
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
  const isTreasurer = me?.role === 'treasurer'
  const pickleballGroup = state?.pickleballGroup || safeArray(groups).find(group => String(group.id) === String(state?.pickleballGroupId || ''))
  const pickleballMe = membersForGroup(pickleballGroup, members).find(member => (
    String(member.id) === String(currentUserId) ||
    sameName(member.name, currentUserName || me?.name)
  ))
  const isPickleballTreasurer = pickleballMe?.role === 'treasurer'

  const screenData = useMemo(() => {
    const pickleballState = scopedPickleballState(state)
    const homeData = buildHomeData(state, currentUserId, members, groups, pickle, pickleballState, selectedYearMonth)
    const groupsListData = buildGroupsListData(groups, currentUserId, members, currentUserName, selectedYearMonth)
    const groupDetailData = buildGroupDetailData(currentGroup, currentUserId, members, currentUserName, selectedYearMonth, state?.profiles)
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
        return buildGroupDetailData(group, currentUserId, members, currentUserName, selectedYearMonth, state?.profiles)
      },
      getSessionDetailData: (sessionId) => buildSessionDetailData(pickleballState, pickle, sessionId, currentUserId, members),
      getPickleballCalendarData: (params) => buildPickleballCalendarData(pickleballState, { yearMonth: selectedYearMonth, ...params }),
      getPickleballMembersData: () => buildPickleballMembersData(pickleballState, selectedYearMonth),
      getMemberDetailData: (memberId) => buildMemberDetailData(pickleballState, memberId, selectedYearMonth),
      getPickleballTicketsData: () => buildPickleballTicketsData(pickleballState),
      getPickleballSettingsData: () => buildPickleballSettingsData(pickleballState),
      getPickleballTeamFundData: () => buildPickleballTeamFundData(pickleballState),
      getBatchEntryData: () => buildBatchEntryData(pickleballState),
      getPaymentFlowData: (memberId) => buildPaymentFlowData(pickleballState, memberId),
      getJoinGroupData: () => buildJoinGroupData(state),
      getAddExpenseData: (params) => buildAddExpenseData(state, params),
      getSettleAllData: () => buildSettleAllData(state),
      getSettlementPeriodData: (params) => buildSettlementPeriodData(state, params),
      getExpenseDetailData: (params) => buildExpenseDetailData(state, params),
      dispatch,
    }
  }, [state, currentUserId, currentUserName, currentGroup, members, groups, pickle, _allPickle, selectedYearMonth, me, isTreasurer, isPickleballTreasurer, dispatch])

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

function buildHomeData(state, currentUserId, members, groups, pickle, pickleballState = state, selectedYearMonth = monthKey(new Date())) {
  const today = dateFromYearMonth(selectedYearMonth)
  const safeGroups = safeArray(groups).map(safeGroup)
  const expenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, today))
  const expenseBalance = expenseGroups.reduce((sum, group) => (
    sum + groupNetForMember(group, currentUserId, members, state?.currentUserName)
  ), 0)
  const monthSessions = getStateMonthSessions(pickleballState, today)
  const summary = pickleSummary(pickle || {})
  const session = findNearestOpenSession(pickle, today)
  const pickleballMemberId = memberIdForGroup(pickleballState?.currentGroup, currentUserId, members, state?.currentUserName)
  const pickleballBalance = buildMemberMonthBalance(pickleballState, pickle, monthSessions, pickleballMemberId).netBalance || 0
  const totalBalance = expenseBalance + pickleballBalance
  const sourceBalances = buildHomeSourceBalances(state, expenseGroups, pickleballState, pickle, monthSessions, members, today)

  return {
    user: {
      firstName: firstName(state?.currentUserName),
      dateLabel: formatFullDate(today),
      hasNotifications: safeArray(state?.notifications).length > 0,
    },
    monthLabel: formatMonthLabel(today),
    totalBalance,
    owedTo: expenseGroups.filter(group => groupNetForMember(group, currentUserId, members, state?.currentUserName) < 0).length + (pickleballBalance < 0 ? 1 : 0),
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
    currentProfileId: profileIdForMember(currentUserId, members),
    expenses: buildHomeExpenses(expenseGroups, currentUserId, members, state?.currentUserName, today),
    memberBalances: buildHomeMemberBalances(pickleballState, pickle, today),
    transactions: buildTransactions(expenseGroups, currentUserId, members, state?.currentUserName),
    sourceBreakdown: currentProfileSourceBreakdown(sourceBalances, currentUserId, members),
    profileBreakdown: aggregateBalancesByProfile(sourceBalances, members),
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
      amount: buildMemberMonthBalance(pickleballState, pickle, monthSessions, member.id).netBalance || 0,
      month: monthKey(monthDate),
    }))
  return [...expenseRows, ...pickleRows].filter(row => row.memberId && row.amount !== 0)
}

function buildHomeMemberBalances(state, pickle, monthDate) {
  const monthSessions = getStateMonthSessions(state, monthDate)
  return currentGroupMembers(state)
    .filter(isActiveMember)
    .map(member => {
      const balance = buildMemberMonthBalance(state, pickle, monthSessions, member.id)
      return {
        memberId: member.id,
        id: member.id,
        name: member.displayName || member.name || 'Thành viên',
        initial: initials(member),
        initials: initials(member),
        type: memberType(member),
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
  const requestedGroup = requestedGroupId ? safeArray(state?.groups).find(item => String(item.id) === String(requestedGroupId)) : null
  const group = expense ? groupForExpense(state, expense) || requestedGroup || currentGroup(state) : requestedGroup || currentGroup(state)
  const currentMember = safeArray(state?.members).find(member => String(member.id) === String(state?.currentUserId))
  const members = currentGroupMembers({ ...state, currentGroup: group, currentGroupId: group?.id || state?.currentGroupId })
    .map(member => ({
      id: member.id,
      name: member.displayName || member.name,
      initial: member.initial || member.initials || initials(member),
    }))

  return {
    groupId: group?.id || state?.currentGroupId,
    groupName: group?.name || 'Nhóm',
    groupEmoji: group?.emoji || '👥',
    memberCount: members.length,
    currentMemberId: state?.currentUserId,
    currentMemberName: currentMember?.displayName || currentMember?.name || state?.currentUserName,
    members,
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
    } : null,
  }
}

function buildGroupsListData(groups, currentUserId, members, currentUserName, selectedYearMonth) {
  const monthDate = dateFromYearMonth(selectedYearMonth)
  const pickleballGroup = safeArray(groups).find(group => groupKind(group) === 'pickleball')
  const rows = safeArray(groups).map(safeGroup).map(group => {
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
      isLinkedPickleballExpenseGroup: Boolean(linkedPickleballGroupId),
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
      { key: 'balanced', label: `Cân bằng · ${balanced}` },
      { key: 'closed', label: 'Đã chốt' },
    ],
    groups: rows,
    archived: [],
  }
}

function buildGroupDetailData(group, currentUserId, members, currentUserName, selectedYearMonth, profiles = []) {
  const g = safeGroup(group)
  const monthDate = dateFromYearMonth(selectedYearMonth)
  const monthlyGroup = groupWithMonthExpenses(g, monthDate)
  const groupMembers = membersForGroup(g, members)
  const currentGroupMember = groupMembers.find(member => String(member.id) === String(memberIdForGroup(g, currentUserId, members, currentUserName)))
  const currentMember = safeArray(members).find(member => String(member.id) === String(currentUserId))
  const groupCreatorId = g.createdBy || g.created_by || ''
  const isGroupCreator = Boolean(groupCreatorId) && (
    String(groupCreatorId) === String(currentGroupMember?.id || '') ||
    String(groupCreatorId) === String(currentGroupMember?.profileId || currentGroupMember?.profile_id || '') ||
    String(groupCreatorId) === String(currentMember?.profileId || currentMember?.profile_id || '')
  )
  const isSoloExpenseGroup = groupMembers.length === 1 && groupKind(g) !== 'pickleball'
  const isGroupTreasurer = currentGroupMember?.role === 'treasurer' || String(g.createdBy || g.created_by || '') === String(currentGroupMember?.id || '') || (Boolean(currentGroupMember) && isSoloExpenseGroup)
  const balanceMap = groupBalanceForMember(monthlyGroup, currentUserId, members, currentUserName)
  const balance = groupNetForMember(monthlyGroup, currentUserId, members, currentUserName)
  const memberBalanceMap = Object.fromEntries(
    groupMembers.map(member => [member.id, groupNet(monthlyGroup, member.id)])
  )
  const activities = safeArray(monthlyGroup.expenses)
    .slice()
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .slice(0, 20)
    .map(expense => toActivity(expense, members))
  const pendingExpenses = safeArray(monthlyGroup.expenses)
    .filter(expense => expense.status === 'pending')
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .map(expense => toActivity(expense, members))

  return {
    group: {
      id: g.id,
      name: g.name || 'Nhóm',
      emoji: g.emoji || '👥',
      color: g.color || '#574EFA',
    },
    id: g.id,
    name: g.name || 'Nhóm',
    emoji: g.emoji || '👥',
    color: g.color || '#574EFA',
    createdBy: g.createdBy || g.created_by || null,
    isPickleball: groupKind(g) === 'pickleball',
    isGroupCreator,
    isTreasurer: isGroupTreasurer,
    memberCount: groupMembers.length,
    balance,
    balanceLabel: buildBalanceLabel(balanceMap, balance, members),
    currentMemberId: currentGroupMember?.id || null,
    pendingExpenses,
    activities,
    activitiesByWeek: activities.length > 0 ? [{ label: 'Hoạt động gần đây', items: activities }] : [],
    memberCandidates: buildGroupMemberCandidates(g, members, profiles),
    members: groupMembers.map(member => ({
      id: member.id,
      name: member.displayName || member.name,
      initials: initials(member),
      color: member.color || '#6366f1',
      role: member.role,
      bankName: member.bankName || member.bank_name || '',
      bankAccount: member.bankAccount || member.bank_account || '',
      bankAccountName: member.bankAccountName || member.bank_account_name || '',
      joinDate: fullExpenseDate(member.createdAt || member.created_at),
      balance: memberBalanceMap[member.id] || 0,
      isCurrentUser: String(member.id) === String(currentGroupMember?.id || ''),
      payerTransactions: buildMemberPayerTransactions(g, member.id, selectedYearMonth),
    })),
    balanceRows: groupMembers
      .map(member => ({
        id: member.id,
        name: member.displayName || member.name,
        initials: initials(member),
        color: member.color || '#6366f1',
        role: member.role,
        amount: memberBalanceMap[member.id] || 0,
      }))
      .filter(row => row.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
  }
}

function buildGroupMemberCandidates(group, members, profiles = []) {
  const currentMembers = allMembersForGroup(group, members)
  const currentIds = new Set(currentMembers.map(member => String(member.id)))
  const currentProfileIds = new Set(currentMembers.map(member => String(member.profileId || member.profile_id || member.id)))
  const seenProfileIds = new Set()
  const isPickleballGroup = groupKind(group) === 'pickleball'
  const casualCurrentMembers = currentMembers.filter(member => (
    isPickleballGroup ? memberType(member) === 'casual' : !isActiveMember(member)
  ))
    .map(member => ({
      id: member.id,
      memberId: member.id,
      profileId: member.profileId || member.profile_id || '',
      name: member.displayName || member.name || '',
      bankName: member.bankName || member.bank_name || '',
      bankAccount: member.bankAccount || member.bank_account || '',
      bankAccountName: member.bankAccountName || member.bank_account_name || '',
      isInactive: !isActiveMember(member) || (isPickleballGroup && memberType(member) === 'casual'),
      memberType: memberType(member),
    }))
  const casualNames = new Set(
    casualCurrentMembers.map(member => (member.name || '').toLowerCase().trim()).filter(Boolean)
  )
  const allCurrentMemberNames = new Set(
    currentMembers.map(member => (member.displayName || member.name || '').toLowerCase().trim()).filter(Boolean)
  )
  const outsideGroupCandidates = candidateProfilesFromDirectory(members, profiles)
    .filter(member => {
      const nameKey = (member.name || member.displayName || '').toLowerCase().trim()
      if (nameKey && allCurrentMemberNames.has(nameKey)) return false
      if (nameKey && casualNames.has(nameKey)) return false
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
    }))
    .filter(member => {
      const key = String(member.profileId || member.id || '')
      if (!key || seenProfileIds.has(key)) return false
      seenProfileIds.add(key)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  return casualCurrentMembers.concat(outsideGroupCandidates)
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
    const hasInactiveRows = memberRows.some(member => !isActiveMember(member))
    if (!activeMember && hasInactiveRows) return null
    return {
      id: activeMember?.id || profile.id,
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

function buildMemberPayerTransactions(group, memberId, selectedYearMonth) {
  const monthDate = dateFromYearMonth(selectedYearMonth)
  return safeArray(group?.expenses)
    .filter(expense => isSameExpenseMonth(expense, monthDate))
    .filter(expense => String(expense.paidBy || expense.paid_by_member_id || '') === String(memberId))
    .sort((a, b) => parseDateValue(b.date || b.expense_date) - parseDateValue(a.date || a.expense_date))
    .map(expense => ({
      id: expense.id,
      date: formatDayMonth(expense.date || expense.expense_date),
      title: expense.title || 'Chi tiêu',
      source: group?.name || 'Nhóm',
      amount: Number(expense.amount) || 0,
      status: expense.status || 'approved',
    }))
}

function buildPickleballOverviewData(state, pickle, _allPickle, currentUserId, members, selectedYearMonth) {
  const today = dateFromYearMonth(selectedYearMonth)
  const currentYearMonth = monthKey(today)
  const currentMonthConfig = safeArray(pickle?.monthlyConfigs).find(
    c => c.yearMonth === currentYearMonth
  )
  const monthSessions = getStateMonthSessions(state, today)
  const autoGenerateConfig = buildSessionGenerationConfig(state, currentYearMonth)
  const shouldAutoGenerate = !state?._pickleRegenInProgress && hasMissingGeneratedSessions(state, currentYearMonth, monthSessions, autoGenerateConfig)
  const completedSessions = monthSessions.filter(s => isDoneStatus(s?.status)).length
  const summary = pickleSummary(pickle || {})
  const todaySession = findNearestOpenSession(pickle, today)
  const water = monthSessions.reduce((sum, session) => sum + sessionWaterAmount(session), 0)
  const courtFee = Number(currentMonthConfig?.courtFee ?? pickle?.monthlyCourtFee ?? 0)
  const currentFixedMembers = currentGroupMembers(state).filter(member => isActiveMember(member) && memberType(member) === 'fixed')
  const activeMemberIds = currentFixedMembers.map(member => member.id || member.member_id).filter(Boolean)
  const p2pTicketBalance = memberTicketBalance(state, currentUserId)
  const teamFundTicketShare = memberTeamFundTicketShare(state, currentUserId)
  const ticketAmount = p2pTicketBalance - teamFundTicketShare
  const ticketStats = buildTicketMonthStats(state)
  const ticketFund = buildTicketFundSummary(state)
  const teamFundOverview = buildPickleballTeamFundData(state)
  const memberBalance = buildMemberMonthBalance(state, pickle, monthSessions, currentUserId)
  const breakdown = buildPickleBreakdown(pickle, monthSessions, currentUserId, summary, ticketAmount, memberBalance)
  const currentMember = members.find(member => String(member.id || member.member_id) === String(currentUserId))
  const ticketAdjustment = -ticketAmount

  return {
    clubName: state?.currentGroup?.name || 'CLB Pickleball',
    monthLabel: formatMonthLabel(today),
    memberCount: activeMemberIds.length,
    todaySession: todaySession ? toOverviewSessionCard(todaySession, pickle, members) : null,
    progress: {
      attended: completedSessions,
      total: monthSessions.length || 1,
      actualTotal: monthSessions.length,
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
      summaryCards: buildPersonalPickleSummaryCards(monthSessions, memberBalance, ticketAdjustment),
      breakdown,
    },
    yourTickets: buildPersonalTicketOverview(state, currentUserId),
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

function buildPickleballTeamFundData(state) {
  const today = new Date()
  const currentYearMonth = monthKey(today)
  const nextYearMonth = shiftMonthKey(currentYearMonth, 1)
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const nextMonthlyConfig = currentMonthlyPickleConfig(state, nextYearMonth)
  const monthSessions = getStateMonthSessions(state, today)
  const ticketStats = buildTicketMonthStats(state)
  const ticketFund = buildTicketFundSummary(state)
  const teamFundDirectTotal = ticketFund.teamFundTotal || 0
  const ticketRows = buildTeamFundTicketRows(state)
  const ticketParticipantRows = buildTeamFundTicketParticipantRows(state)
  const currentFixedMembers = currentGroupMembers(state)
    .filter(member => isActiveMember(member) && memberType(member) === 'fixed')
  const courtFeeTotal = Number(monthlyConfig?.courtFee ?? monthlyConfig?.court_fee ?? state?.pickle?.monthlyCourtFee ?? 0) || 0
  const nextCourtFeeTotal = Number(nextMonthlyConfig?.courtFee ?? nextMonthlyConfig?.court_fee ?? courtFeeTotal) || 0
  const ticketPrice = Number(monthlyConfig?.ticketPrice ?? monthlyConfig?.ticket_price ?? 50000) || 50000
  const waterTotal = monthSessions.reduce((sum, session) => sum + sessionWaterAmount(session), 0)
  const extrasTotal = monthSessions.reduce((sum, session) => {
    return sum + sessionCostsForSession(state, session, currentFixedMembers).extras
      .reduce((extraSum, item) => extraSum + (Number(item.amount) || 0), 0)
  }, 0)
  const ownerPayments = currentGroupOwnerPayments(state)
  const venueBank = venueBankForCurrentGroup(state)
  const paymentDraftItems = [
    { key: 'water', label: 'Tiền nước', yearMonth: currentYearMonth, amount: waterTotal },
    { key: 'extras', label: 'Phát sinh', yearMonth: currentYearMonth, amount: extrasTotal },
    { key: 'tickets', label: 'Vé lẻ team', yearMonth: currentYearMonth, amount: teamFundDirectTotal },
    { key: 'next_court', label: 'Tiền sân tháng sau', yearMonth: nextYearMonth, amount: nextCourtFeeTotal },
  ].map(item => ({
    ...item,
    paid: ownerPaymentCoversItem(ownerPayments, item.key, item.yearMonth),
  }))

  return {
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(today),
    currentYearMonth,
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
    costRows: [
      {
        key: 'court',
        label: 'Tiền sân',
        amount: courtFeeTotal,
        paidToOwner: isPaidToOwner(monthlyConfig) || ownerPaymentCoversItem(ownerPayments, 'court', currentYearMonth),
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
    ],
  }
}

function buildTeamFundTicketRows(state) {
  return currentMonthTicketsForState(state)
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

function buildTeamFundTicketParticipantRows(state) {
  const memberMap = new Map()
  currentMonthTicketsForState(state)
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
      name: me?.displayName || me?.name || state?.currentUserName || 'Bạn',
      email: '',
      initial: initials(me || { name: state?.currentUserName }).slice(0, 2),
      club: state?.currentGroup?.name || 'Spliteasy',
      photoUrl: loadStoredProfilePhoto(currentUserId),
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
      name: bankName || 'Chưa cập nhật',
      code: bankCode(bankName),
      maskedAccount: maskBankAccount(bankAccount),
      owner: bankAccountName || 'Chưa cập nhật',
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
      perPerson: courtPerPerson,
      sub: `${Math.round((Number(pickle?.monthlyCourtFee) || 0) / Math.max(monthSessions.length, 1)).toLocaleString('vi-VN')} đ/buổi ÷ ${Math.max(fixedMembers.length, groupMembers.length, 1)} TV`,
    },
    waterFee: {
      perPerson: waterPerPerson,
      total: waterTotal,
      sub: `${waterTotal.toLocaleString('vi-VN')} đ ÷ ${Math.max(splitCount, 1)} người`,
    },
    accessories,
    totalPerPerson: courtPerPerson + waterPerPerson + accessoriesPerPerson,
    currentUserId,
  }
}

function buildPickleballCalendarData(state, params = {}) {
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
    .filter(member => memberType(member) === 'casual')
    .map(member => ({
      id: member.id,
      name: member.displayName || member.name || '',
    }))
    .filter(member => member.id && member.name)

  return {
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(monthDate),
    selectedSessionDay: selectedSession ? Number(String(selectedSession.date).slice(-2)) : Number(String(selectedDate).slice(-2)) || (isCurrentMonth ? today.getDate() : 1),
    selectedSessionDate: selectedDate,
    days: buildCalendarDays(monthDate, sessionsByDay, state, ticketsByDate),
    sessions: calendarSessions,
    selectedSession,
    tickets: ticketRows,
    selectedTickets: ticketsByDate.get(selectedDate) || [],
    ticketMembers: currentGroupMembers(state)
      .filter(isActiveMember)
      .map(member => ({
        id: member.id,
        name: member.displayName || member.name || 'Thành viên',
        initial: initials(member),
        color: member.color,
      })),
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
  const allMemberRows = currentGroupMembers(state).map(member => ({
    id: member.id,
    name: member.displayName || member.name || '',
    displayName: member.displayName || member.name || '',
    isActive: isActiveMember(member),
    is_active: member.is_active,
  }))
  const activeMembers = currentGroupMembers(state).filter(isActiveMember)
  const sessions = getStateMonthSessions(state, today)
  const joinRequests = currentJoinRequests(state)
  const totalSessions = sessions.length || 1
  const fixedMembers = activeMembers.filter(member => memberType(member) === 'fixed')
  const casualMembers = activeMembers.filter(member => memberType(member) === 'casual')
  const joinRequestRows = joinRequests.map(request => {
    const created = parseDate(request.createdAt || request.created_at)
    return {
      id: request.id,
      initial: initials({ name: request.name }),
      name: request.name || 'Thành viên mới',
      sentLabel: relativeTimeLabel(created),
    }
  })

  const fixedRows = fixedMembers.map(member => toPickleballMemberRow(member, sessions, totalSessions, fixedMembers))
  const casualRows = casualMembers.map(member => toPickleballMemberRow(member, sessions, totalSessions, fixedMembers))

  return {
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(today),
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
    memberCandidates: buildGroupMemberCandidates(currentGroup(state), state?.members, state?.profiles),
    legacyGuests: buildGuestRows(sessions),
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
    clubName: currentGroupName(state, 'CLB Pickleball'),
    monthLabel: formatMonthLabel(monthDate),
    id: member.id,
    name: member.displayName || member.name || 'Thành viên',
    initial: initials(member),
    initials: initials(member),
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
    payerTransactions: buildMemberPayerTransactions(currentGroup(state), member.id, selectedYearMonth),
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

function buildPickleballTicketsData(state) {
  const today = new Date()
  const currentMonth = monthKey(today)
  const monthlyConfig = currentMonthlyPickleConfig(state, currentMonth)
  const ticketPrice = Number(monthlyConfig?.ticketPrice ?? monthlyConfig?.ticket_price ?? 50000) || 50000
  const monthTickets = monthTicketsForState(state, today)
    .sort((a, b) => parseDateValue(ticketDate(a)) - parseDateValue(ticketDate(b)))
  const tickets = monthTickets.map((ticket, index) => toTicketRow(ticket, index, state)).reverse()
  const unpaid = tickets.filter(ticket => ticket.status === 'unpaid')
  const pending = tickets.filter(ticket => ticket.status === 'pending_review')
  const teamFund = tickets.filter(ticket => ticket.status === 'team_fund')
  const approvedTickets = tickets.filter(ticket => ticket.status !== 'pending_review')
  const totalAmount = approvedTickets.reduce((sum, ticket) => sum + (Number(ticket.totalAmount) || 0), 0)
  const members = currentGroupMembers(state)
    .filter(isActiveMember)
    .map(member => ({
      id: member.id,
      name: member.displayName || member.name || 'Thành viên',
      initial: initials(member),
      color: member.color,
    }))

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

function buildPickleballSettingsData(state) {
  const today = new Date()
  const currentYearMonth = monthKey(today)
  const group = currentGroup(state)
  const config = currentPickleConfig(state)
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
  const sessions = getStateMonthSessions(state, today)
  const members = currentGroupMembers(state).filter(isActiveMember)
  const fixedMembers = members.filter(member => memberType(member) === 'fixed')
  const billingMembers = fixedMembers.length > 0 ? fixedMembers : members
  const weekdays = normalizeWeekdays(
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
  const courtFeeTotal = Number(monthlyConfig?.courtFee ?? monthlyConfig?.court_fee ?? config?.monthlyCourtFee ?? config?.monthly_court_fee ?? group?.monthlyCourtFee ?? 0)
  const ticketPrice = Number(monthlyConfig?.ticketPrice ?? monthlyConfig?.ticket_price ?? 50000) || 50000
  const WEEK_LABELS_LOCAL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const wantedDays = new Set(weekdays)
  const daysInCurMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  let calcSessions = 0
  for (let dayNum = 1; dayNum <= daysInCurMonth; dayNum++) {
    const dt = new Date(today.getFullYear(), today.getMonth(), dayNum)
    if (wantedDays.has(WEEK_LABELS_LOCAL[dt.getDay()])) calcSessions++
  }
  const sessionsCount = calcSessions > 0 ? calcSessions : Math.max(sessions.length, 1)
  const scheduleTime = monthlyConfig?.scheduleTime || monthlyConfig?.schedule_time ||
    config?.scheduleTime || config?.schedule_time || config?.timeRange || group?.scheduleTime || '19:00 – 21:00'
  const currentMember = safeArray(state?.members).find(m => String(m.id) === String(state?.currentUserId))
  const memberIds = billingMembers.map(m => m.id || m.member_id).filter(Boolean)
  const activeMonthlyMemberIds = memberIds

  return {
    clubName: group.name || 'CLB Pickleball',
    currentYearMonth,
    currentRole: currentMember?.role,
    activeMonthlyMemberIds,
    courtFeePerSession: Math.round(courtFeeTotal / Math.max(sessionsCount, 1)),
    scheduleDay: weekdays.join(', '),
    scheduleTime,
    maxMembers: Number(config?.maxMembers ?? config?.max_members ?? members.length) || members.length || 12,
    requireApproval: config?.requireApproval ?? config?.require_approval ?? group?.requiresApproval ?? true,
    courtFeeTotal,
    ticketPrice,
    sessionsCount,
    memberCount: billingMembers.length || 1,
    members: members.map(m => ({
      id: m.id || m.member_id,
      name: m.name || m.member_name,
      initial: initials(m),
      activeThisMonth: activeMonthlyMemberIds.some(id => String(id) === String(m.id || m.member_id)),
    })),
    weekdays,
    timeRange: scheduleTime,
    startDate: monthlyConfig?.scheduleStartDay || monthlyConfig?.schedule_start_day || config?.startDate || config?.start_date || '01/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear(),
    autoGenerate: config?.autoGenerate ?? config?.auto_generate ?? true,
    nextMonthPreview: buildNextMonthPreview(today, weekdays),
  }
}

function buildBatchEntryData(state) {
  const today = new Date()
  const members = currentGroupMembers(state)
  const sessions = getStateMonthSessions(state, today)
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
      }
    })
  const completedCount = sessions.filter(session => session.status === 'done').length
  const pendingCount = sessions.length - completedCount

  return {
    monthLabel: formatMonthLabel(today),
    completedCount,
    pendingCount,
    sessions,
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
  const members = currentGroupMembers(state)
  const treasurer = members.find(member => member.role === 'treasurer') || members[0]
  const existingNames = members.map(member => member.displayName || member.name).filter(Boolean)

  return {
    code: group.inviteCode || group.invite_code || '',
    group: {
      emoji: group.emoji || '👥',
      name: group.name || 'Nhóm Spliteasy',
      treasurer: treasurer?.displayName || treasurer?.name || 'Thủ quỹ',
      foundedLabel: monthYearLabel(group.createdAt || group.created_at),
      activeCount: members.length,
      memberCount: members.length,
      memberAvatars: members.slice(0, 6).map(member => initials(member)),
      extraMembers: Math.max(members.length - 6, 0),
    },
    existingNames,
    suggestedName: '',
    selectedName: '',
  }
}

function buildNewGroupData(state = {}) {
  return {
    name: '',
    emoji: '🏸',
    description: '',
    requiresApproval: true,
    emojiOptions: ['🏸', '🏓', '⚽', '🏀', '🎯', '🎲', '💰', '👥'],
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
  const byProfile = new Map()
  const profilesById = new Map(safeArray(profiles).map(profile => [String(profile.id), profile]))
  safeArray(members).filter(isActiveMember).forEach(member => {
    const key = String(member.profileId || member.profile_id || member.id || '')
    if (!key || byProfile.has(key)) return
    const profile = profilesById.get(key) || {}
    byProfile.set(key, {
      id: member.profileId || member.profile_id || member.id,
      name: profile.name || member.displayName || member.name,
      initials: initials(profile.name ? profile : member),
      color: profile.color || member.color,
      bankName: profile.bankName || profile.bank_name || member.bankName || member.bank_name,
      bankAccount: profile.bankAccount || profile.bank_account || member.bankAccount || member.bank_account,
      bankAccountName: profile.bankAccountName || profile.bank_account_name || member.bankAccountName || member.bank_account_name,
    })
  })
  return [...byProfile.values()]
}

function buildSettleAllData(state) {
  const group = currentGroup(state)
  const members = currentGroupMembers(state)
  const balanceMap = groupBalanceForMember(group, state?.currentUserId, safeArray(state?.members), state?.currentUserName)
  const me = safeArray(state?.members).find(member => String(member.id) === String(state?.currentUserId))
  const debts = []
  const credits = []

  Object.entries(balanceMap).forEach(([memberId, rawAmount]) => {
    const amount = Number(rawAmount) || 0
    if (!amount) return
    const member = members.find(item => String(item.id) === String(memberId)) || { id: memberId, name: memberName(memberId, members) }
    const row = {
      id: memberId,
      initial: initials(member),
      name: member.displayName || member.name || 'Thành viên',
      sub: amount < 0 ? 'Cần thanh toán' : 'Cần thu',
      amount: Math.abs(amount),
    }
    if (amount < 0) debts.push(row)
    else credits.push(row)
  })

  return {
    groupName: group.name || 'Nhóm',
    netBalance: groupNetForMember(group, state?.currentUserId, safeArray(state?.members), state?.currentUserName),
    debts,
    credits,
    isTreasurer: me?.role === 'treasurer',
    settlements: buildOptimizedSettlements(group, members),
  }
}

function buildNotificationsData(state) {
  const notifications = safeArray(state?.notifications).map(notification => toNotificationItem(notification, state))
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
  const canEdit = role === 'treasurer' || (String(expense.submitted_by_member_id || '') === String(currentUserId) && String(expense.status || '').toLowerCase() === 'pending')
  const payer = members.find(member => String(member.id) === String(expense.paidBy || expense.paid_by_member_id))
  const splits = expenseSplits(expense, members, payer, currentUserId)

  return {
    id: expense.id,
    expenseId: expense.id,
    groupName: group.name || 'Nhóm',
    category: {
      icon: expenseIcon(expense),
      label: expenseCategoryLabel(expense),
    },
    title: expense.title || 'Chi tiêu',
    amount: Number(expense.amount) || 0,
    status: isDoneStatus(expense.status) || String(expense.status || '').toLowerCase() === 'approved' ? 'settled' : 'pending',
    dateLabel: fullExpenseDate(expense.date || expense.expense_date),
    payer: {
      id: payer?.id || expense.paidBy || expense.paid_by_member_id,
      initial: initials(payer),
      name: payer?.displayName || payer?.name || 'Người trả',
    },
    splits,
    note: expense.note || expense.description || expense.declineReason || '',
    canEdit,
    canDelete: role === 'treasurer',
    expense,
  }
}

function buildTransactions(groups, currentUserId, members, currentUserName) {
  return recentActivity(groups, 24)
    .slice()
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    .slice(0, 4)
    .map(expense => {
      const group = groups.find(g => g.id === expense.groupId)
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
        icon: expenseIcon(expense),
        category: expenseCategory(expense),
        title: expense.title || 'Chi tiêu',
        subtitle: expense.groupName || memberName(expense.paidBy, members),
        dateLabel: relativeDateLabel(expense.date),
        amount,
        status: expense.status,
        paidBy,
        participants,
        splits,
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

function buildPersonalPickleSummaryCards(monthSessions, memberBalance, ticketAdjustment) {
  const waterSessions = monthSessions.filter(s => sessionWaterAmount(s) > 0).length
  return [
    { icon: '🏸', label: 'Sân của bạn', amount: memberBalance.courtFee, sub: 'Phần của bạn' },
    { icon: '💧', label: 'Nước của bạn', amount: memberBalance.waterFee, sub: `${waterSessions} buổi có nước` },
    { icon: '🎟️', label: 'Vé lẻ qua quỹ', amount: ticketAdjustment, sub: 'Qua quỹ team' },
  ]
}

function buildPersonalTicketOverview(state, memberId) {
  const rows = currentMonthTicketsForState(state)
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

function buildTicketFundSummary(state) {
  const rows = currentGroupMembers(state)
    .filter(isActiveMember)
    .map(member => {
      const ticketNet = memberTicketBalance(state, member.id) - memberTeamFundTicketShare(state, member.id)
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

  const tickets = currentMonthTicketsForState(state)
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
  const sessionsAttended = attendanceByMemberId(sessions, member.id, members)
  const sessionsTotal = totalSessions || sessions.length
  const progressPct = sessionsTotal > 0 ? Math.round((sessionsAttended / sessionsTotal) * 100) : 0
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
  }
}

function buildMemberAttendance(sessions, memberId, members = []) {
  const total = sessions.length
  const attended = attendanceByMemberId(sessions, memberId, members)
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

function buildMemberMonthBalance(state, pickle, sessions, memberId) {
  const members = currentGroupMembers(state).filter(isActiveMember)
  const fixedMembers = members.filter(member => memberType(member) === 'fixed')
  const casualMembers = members.filter(member => memberType(member) === 'casual')
  const fixedMemberCount = Math.max(fixedMembers.length, 1)
  const currentYearMonth = monthKey(new Date())
  const monthlyConfig = currentMonthlyPickleConfig(state, currentYearMonth)
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
  const courtFeeShare = courtFeeTotal / fixedMemberCount
  const fixedNetCost = Math.max(courtFeeShare - rebatePerFixed, 0)
  const casualCharge = casualCharges.find(row => String(row.memberId) === String(memberId))?.amount || 0
  const courtFee = memberType(member) === 'casual' ? casualCharge : Math.round(fixedNetCost)
  const waterFee = memberWaterShare(sessions, memberId, members)
  const extras = memberExtrasShare(sessions, memberId, state, members)
  const ticketShare = memberTeamFundTicketShare(state, memberId)
  const p2pBalance = memberTicketBalance(state, memberId)
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

function memberWaterShare(sessions, memberId, members = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const presentIds = effectiveSessionMemberIds(session, members)
    if (!presentIds.some(id => String(id) === String(memberId))) return sum
    const splitCount = presentIds.length + sessionGuests(session).length
    return sum + (splitCount > 0 ? Math.round(sessionWaterAmount(session) / splitCount) : 0)
  }, 0)
}

function memberExtrasShare(sessions, memberId, state, members = []) {
  return safeArray(sessions).reduce((sum, session) => {
    const presentIds = effectiveSessionMemberIds(session, members)
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

function attendanceByMemberId(sessions, memberId, members = []) {
  return safeArray(sessions).filter(session => (
    effectiveSessionMemberIds(session, members).some(id => String(id) === String(memberId))
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

function isActiveMember(member) {
  return member?.isActive !== false && member?.is_active !== false
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
  return rows.length > 0 ? rows : members
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
    return {
      n: date.getDate(),
      date: dateKey(date),
      sessionId: session?.id,
      hasTicket: tickets.length > 0,
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
  if (!session && tickets.length > 0) return 'ticket'
  if (!session) return isToday(date) ? 'today' : 'normal'
  const normalizedStatus = String(session?.status || '').toLowerCase()
  if (['moved', 'cancelled', 'canceled'].includes(normalizedStatus)) return 'moved'
  if (['scheduled', 'upcoming'].includes(normalizedStatus)) return 'upcoming'
  if (dateKey(date) > dateKey(new Date())) return 'upcoming'

  const presentIds = effectiveSessionMemberIds(session, currentGroupMembers(state).filter(isActiveMember))
  if (!state?.currentUserId) return presentIds.length > 0 ? 'attended' : 'missed'
  return presentIds.some(id => String(id) === String(state.currentUserId)) ? 'attended' : 'missed'
}

function toCalendarSessionDetail(state, session, allSessions, today) {
  const pickle = state?.pickle || {}
  const groupMembers = currentGroupMembers(state).filter(isActiveMember)
  const presentIds = effectiveSessionMemberIds(session, groupMembers)
  const presentSet = new Set(presentIds.map(String))
  const guests = sessionGuests(session)
  const attendanceMembers = groupMembers.filter(member => memberType(member) === 'fixed')
  const attendanceNames = attendanceDisplayNames(attendanceMembers)
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
  const splitCount = presentIds.length + guests.length
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
  const currentUserPresent = presentSet.has(String(state?.currentUserId || ''))
  const currentUserTotal = currentUserPresent ? courtPerPerson + waterPerPerson + extrasPerPerson : 0

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
      { label: '🏸 Tiền sân/người', amount: courtPerPerson },
      { label: '💧 Tiền nước/người tham gia', amount: waterPerPerson },
      ...costs.extras.map(item => {
        const count = safeArray(item.memberIds).length
        return {
          label: `⚡ ${item.note || 'Phụ phát sinh'}`,
          amount: count > 0 ? Math.round((Number(item.amount) || 0) / count) : 0,
        }
      }),
    ],
    totalPerPerson: courtPerPerson + waterPerPerson + extrasPerPerson,
    currentUserPresent,
    currentUserTotal,
    personalCostNote: currentUserPresent ? 'Bạn có mặt trong buổi này' : 'Bạn vắng buổi này · không tính chi phí',
    canShowCosts: sessionKey <= todayKey || isDoneStatus(session?.status),
    canComplete: !moved && sessionKey <= todayKey,
    isCompleted: locked,
    isMoved: moved,
    canReschedule: !locked,
    canRestore: moved,
  }
}

function attendanceDisplayNames(members) {
  const baseNames = safeArray(members).map(member => ({
    id: String(member.id),
    base: firstName(member.displayName || member.name),
    full: compactMemberName(member),
  }))
  const counts = baseNames.reduce((map, item) => {
    map.set(item.base, (map.get(item.base) || 0) + 1)
    return map
  }, new Map())
  return baseNames.reduce((map, item) => {
    map.set(item.id, counts.get(item.base) > 1 ? item.full : item.base)
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
  const explicit = Number(ticket?.amountPerPerson ?? ticket?.amount_per_person ?? ticket?.perPerson ?? ticket?.per_person ?? ticket?.price) || 0
  if (explicit > 0) return explicit
  return memberIds.length > 0 ? Math.round(ticketTotalAmount(ticket) / memberIds.length) : 0
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
  const bankName = member?.bankName || member?.bank_name || 'Chưa cập nhật'
  const account = member?.bankAccount || member?.bank_account || ''
  const holder = member?.bankAccountName || member?.bank_account_name || member?.displayName || member?.name || ''
  const code = bankCode(bankName)
  return {
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
        amount: 0,
      }
      existing.amount += Number(row.amount) || 0
      bySource.set(key, existing)
    })

  return [...bySource.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.sourceLabel.localeCompare(b.sourceLabel, 'vi'))
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
  return {
    id: notification?.id,
    unread: notification?.unread ?? notification?.read === false,
    icon: notification?.icon || (isJoinRequest ? '👤' : isPickle ? '🏓' : isExpense ? '💸' : '🔔'),
    iconBg: notification?.iconBg || notification?.icon_bg || (isPickle ? 'rgba(52,211,153,0.10)' : 'rgba(99,102,241,0.12)'),
    title: notification?.titleHtml || notification?.title || 'Thông báo mới',
    sub: notification?.sub || notification?.subtitle || groupLabelById(state, notification?.groupId || notification?.group_id),
    when: notification?.when || relativeTimeLabel(notification?.createdAt || notification?.created_at || notification?.date),
    date: notification?.createdAt || notification?.created_at || notification?.date,
    actions: isJoinRequest ? 'joinRequest' : notification?.actions,
  }
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

function safeGroup(group) {
  return {
    ...(group || {}),
    members: safeArray(group?.members),
    expenses: safeArray(group?.expenses),
    settlements: safeArray(group?.settlements),
    settlementPeriods: safeArray(group?.settlementPeriods),
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
    .filter(isActiveMember)
    .filter(member => memberType(member) !== 'casual')
}

function allMembersForGroup(group, members) {
  const ids = new Set(safeArray(group?.members).map(String))
  return safeArray(members).filter(member => (
    ids.has(String(member.id)) || String(member.groupId || member.group_id || '') === String(group?.id || '')
  ))
}

function memberIdForGroup(group, currentUserId, members, currentUserName) {
  if (!group) return currentUserId
  const groupMemberIds = new Set(safeArray(group.members).map(String))
  if (groupMemberIds.has(String(currentUserId))) return currentUserId

  const currentMember = safeArray(members).find(m => String(m.id) === String(currentUserId))
  const currentName = currentUserName || currentMember?.name
  const match = membersForGroup(group, members).find(member => sameName(member.name, currentName))
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

function toOverviewSessionCard(session, pickle, members) {
  return {
    id: session.id,
    number: sessionNumber(session, uniqueSessions([...safeArray(pickle?.sessions), ...safeArray(pickle?.upcoming)])),
    statusLabel: isToday(sessionDate(session)) ? 'Hôm nay' : 'Buổi tới',
    timeRange: sessionTimeRange(session),
    dateLabel: formatDayMonth(sessionDate(session)),
    venue: sessionCourt(session),
    present: sessionMemberIds(session).length,
    total: safeArray(pickle?.fixedMembers).length || members.length,
  }
}

function sessionNumber(session, sessions) {
  if (session?.number) return session.number
  const sorted = safeArray(sessions).slice().sort((a, b) => parseDateValue(sessionDate(a)) - parseDateValue(sessionDate(b)))
  const index = sorted.findIndex(item => String(item.id) === String(session?.id))
  return index >= 0 ? index + 1 : 1
}

function sessionMemberIds(session) {
  return safeArray(session?.attendees || session?.attended)
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

function effectiveSessionMemberIds(session, members = []) {
  const memberIds = safeArray(members).map(member => member?.id || member?.member_id).filter(Boolean)
  const records = sessionAttendanceRecords(session)
  if (records.length === 0 && memberIds.length > 0) return memberIds

  const absentIds = new Set(records.filter(record => record.status === 'absent').map(record => String(record.memberId)))
  const presentIds = new Set([
    ...sessionMemberIds(session),
    ...records.filter(record => record.status !== 'absent').map(record => record.memberId),
  ].map(String))

  if (records.length > 0) {
    memberIds.forEach(memberId => {
      if (!absentIds.has(String(memberId))) presentIds.add(String(memberId))
    })
  }
  absentIds.forEach(memberId => presentIds.delete(memberId))
  return Array.from(presentIds)
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
  const activeCount = safeArray(monthlyConfig?.active_member_ids ?? monthlyConfig?.activeMemberIds).length
  const memberCount = monthlyConfig ? (activeCount || fixedCount) : fixedCount
  const courtFee = Number(monthlyConfig ? (monthlyConfig.courtFee ?? monthlyConfig.court_fee) : pickle?.monthlyCourtFee) || 0
  if (!memberCount || !monthSessions.length || !courtFee) return 0
  return Math.round(courtFee / monthSessions.length / memberCount)
}

function memberTicketBalance(state, memberId) {
  return currentMonthTicketsForState(state).reduce((sum, ticket) => {
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

function memberTeamFundTicketShare(state, memberId) {
  return currentMonthTicketsForState(state).reduce((sum, ticket) => {
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

function buildTicketMonthStats(state) {
  const rows = currentMonthTicketsForState(state).map((ticket, index) => toTicketRow(ticket, index, state))
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
  if (!digits) return 'Chưa cập nhật'
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
