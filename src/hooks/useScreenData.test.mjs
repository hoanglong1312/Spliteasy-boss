import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./useScreenData.js', import.meta.url), 'utf8')
const coreDataSource = readFileSync(new URL('../data.jsx', import.meta.url), 'utf8')

function loadScreenDataBuilders() {
  const source = dataSource
    .replace(/import \{ useEffect, useMemo, useRef \} from 'react'\n/, '')
    .replace(/import \{ useApp \} from '\.\.\/store\.jsx'\n/, '')
    .replace(/import \{[\s\S]*?\} from '\.\.\/data\.jsx'\n/, '')
    .replace('export function useScreenData', 'function useScreenData')

  const context = {
    Date,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${value}`,
    groupBalance,
    groupNet,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: () => [],
  }
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildAddExpenseData, buildGroupDetailData, buildGroupMemberCandidates, buildGroupsListData, buildHomeData, buildNewGroupData, buildPickleballCalendarData, buildPickleballMembersData, buildPickleballOverviewData, buildPickleballTeamFundData }`, context)
  return context.__builders
}

function splitEqual(amount, ids) {
  const per = Math.round(amount / ids.length)
  return ids.map((id, index) => ({
    memberId: id,
    amount: index === ids.length - 1 ? amount - per * (ids.length - 1) : per,
  }))
}

function getShareMap(expense) {
  if (expense.splits && expense.splits.length > 0) {
    return Object.fromEntries(expense.splits.map(split => [split.memberId, split.amount]))
  }
  const splits = splitEqual(expense.amount, expense.participants)
  return Object.fromEntries(splits.map(split => [split.memberId, split.amount]))
}

function groupBalance(group, memberId) {
  const balances = {}
  group.members.forEach(id => {
    if (id !== memberId) balances[id] = 0
  })
  const approvedExpenses = (group.expenses || []).filter(expense => expense.status === 'approved')
  for (const expense of approvedExpenses) {
    if (!expense.participants || expense.participants.length === 0) continue
    const share = getShareMap(expense)
    if (expense.paidBy === memberId) {
      for (const id of expense.participants) {
        if (id !== memberId) balances[id] = (balances[id] || 0) + (share[id] || 0)
      }
    } else if (expense.participants.includes(memberId) && group.members.includes(expense.paidBy)) {
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) - (share[memberId] || 0)
    }
  }
  return balances
}

function groupNet(group, memberId) {
  return Object.values(groupBalance(group, memberId)).reduce((sum, amount) => sum + amount, 0)
}

test('group member candidates dedup inactive current members against directory rows by name', () => {
  const { buildGroupMemberCandidates } = loadScreenDataBuilders()
  const group = { id: 'pickle-1', groupType: 'pickleball', members: ['pickle-hoang'] }
  const members = [
    { id: 'pickle-hoang', groupId: 'pickle-1', name: 'Hoàng Em', memberType: 'fixed', isActive: false, profileId: null },
    { id: 'expense-hoang', groupId: 'expense-1', name: 'Hoàng Em', memberType: 'fixed', profileId: null },
  ]

  const candidates = buildGroupMemberCandidates(group, members)

  assert.deepEqual(candidates.map(member => member.name), ['Hoàng Em'])
  assert.equal(candidates[0].memberId, 'pickle-hoang')
})

test('group member candidates collapse duplicate inactive current rows by name', () => {
  const { buildGroupMemberCandidates } = loadScreenDataBuilders()
  const group = { id: 'pickle-1', groupType: 'pickleball', members: ['pickle-tuan-old', 'pickle-tuan-new'] }
  const members = [
    { id: 'pickle-tuan-old', groupId: 'pickle-1', name: 'Tuấn', memberType: 'fixed', isActive: false, profileId: 'profile-tuan' },
    { id: 'pickle-tuan-new', groupId: 'pickle-1', name: 'Tuấn', memberType: 'casual', isActive: false, profileId: 'profile-tuan' },
    { id: 'pickle-hoang-em', groupId: 'pickle-1', name: 'Hoàng Em', memberType: 'casual', isActive: false, profileId: 'profile-hoang-em' },
  ]

  const candidates = buildGroupMemberCandidates(group, members)

  assert.deepEqual(candidates.map(member => member.name), ['Tuấn', 'Hoàng Em'])
  assert.equal(candidates[0].memberId, 'pickle-tuan-old')
})

test('group member candidates exclude active current members by name', () => {
  const { buildGroupMemberCandidates } = loadScreenDataBuilders()
  const group = { id: 'expense-1', groupType: 'expense', members: ['group-cuong', 'group-minh'] }
  const members = [
    { id: 'group-cuong', groupId: 'expense-1', name: 'Cường', memberType: 'fixed', isActive: true },
    { id: 'group-minh', groupId: 'expense-1', name: 'Minh', memberType: 'fixed', isActive: true },
    { id: 'pickle-cuong', groupId: 'pickle-1', name: 'Cường', memberType: 'fixed', isActive: true },
    { id: 'pickle-an', groupId: 'pickle-1', name: 'An', memberType: 'fixed', isActive: true },
  ]

  const candidates = buildGroupMemberCandidates(group, members)

  assert.deepEqual(candidates.map(member => member.name), ['An'])
})

test('expense group member candidates include active casual rows from the same linked pickleball group', () => {
  const { buildGroupMemberCandidates } = loadScreenDataBuilders()
  const group = { id: 'shared-1', groupType: 'expense', members: ['expense-long', 'pickle-hoang-em'] }
  const members = [
    { id: 'expense-long', groupId: 'shared-1', profileId: 'profile-long', name: 'Long', memberType: 'fixed', isActive: true },
    { id: 'pickle-hoang-em', groupId: 'shared-1', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'casual', isActive: true },
  ]

  const candidates = buildGroupMemberCandidates(group, members)

  assert.deepEqual(candidates.map(member => member.name), ['Hoàng Em'])
  assert.equal(candidates[0].memberId, 'pickle-hoang-em')
  assert.equal(candidates[0].profileId, 'profile-hoang-em')
})

test('group detail member candidates use expense add-member rules for pickleball-linked expense screens', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = { id: 'shared-1', type: 'pickleball', name: 'Virgo Pickleball 246', members: ['expense-long', 'pickle-hoang-em'], expenses: [] }
  const members = [
    { id: 'expense-long', groupId: 'shared-1', profileId: 'profile-long', name: 'Long', memberType: 'fixed', isActive: true },
    { id: 'pickle-hoang-em', groupId: 'shared-1', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'casual', isActive: true },
  ]

  const detail = buildGroupDetailData(group, 'expense-long', members, 'Long', '2026-05')

  assert.deepEqual(detail.memberCandidates.map(member => member.name), ['Hoàng Em'])
})

test('expense membership state is independent from pickleball active state', () => {
  const { buildGroupDetailData, buildPickleballMembersData } = loadScreenDataBuilders()
  const group = { id: 'shared-1', type: 'pickleball', name: 'Virgo Pickleball 246', members: ['long', 'tien'], expenses: [] }
  const members = [
    { id: 'long', groupId: 'shared-1', profileId: 'profile-long', name: 'Long', memberType: 'fixed', isActive: true, expenseActive: true },
    { id: 'tien', groupId: 'shared-1', profileId: 'profile-tien', name: 'Tiến Anh', memberType: 'fixed', isActive: true, expenseActive: false },
  ]

  const expenseDetail = buildGroupDetailData(group, 'long', members, 'Long', '2026-05')
  const pickleballData = buildPickleballMembersData({
    currentGroupId: 'shared-1',
    currentGroup: group,
    members,
    sessions: [],
    pickle: {},
  }, '2026-05')

  assert.deepEqual(expenseDetail.members.map(member => member.name), ['Long'])
  assert.deepEqual(expenseDetail.memberCandidates.map(member => member.name), ['Tiến Anh'])
  assert.equal(expenseDetail.memberCandidates[0].isInactive, true)
  assert.deepEqual(pickleballData.fixedMembers.map(member => member.name), ['Long', 'Tiến Anh'])
})

test('pickleball members do not render one active profile in both fixed and casual sections', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'club',
    currentGroup: { id: 'club', name: 'CLB', type: 'pickleball' },
    members: [
      { id: 'hoang-em-fixed', groupId: 'club', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'fixed', isActive: true },
      { id: 'hoang-em-casual', groupId: 'club', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'casual', isActive: true },
    ],
    pickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state)

  assert.deepEqual([...data.fixedMembers, ...data.casualMembers].map(member => member.name), ['Hoàng Em'])
  assert.equal(data.stats.total, 1)
})

test('pickleball overview data includes schedule config for inline treasurer settings', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'club',
    currentGroup: { id: 'club', name: 'CLB', type: 'pickleball' },
    members: [{ id: 'a', groupId: 'club', name: 'An', memberType: 'fixed', isActive: true }],
    _allPickle: {
      configs: [{ groupId: 'club', clubName: 'Default Club', scheduleWeekdays: ['T2'], scheduleTime: '18:00 – 20:00', startDate: '01/05/2026', autoGenerate: false }],
      monthlyConfigs: [{ groupId: 'club', yearMonth: '2026-06', scheduleWeekdays: ['T3', 'T5'], scheduleTime: '19:00 – 21:00', scheduleStartDay: '03/06/2026' }],
    },
    pickle: { sessions: [], monthlyConfigs: [{ groupId: 'club', yearMonth: '2026-06' }] },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'a', state.members, '2026-06')

  assert.equal(data.currentYearMonth, '2026-06')
  assert.equal(data.scheduleConfig.clubName, 'Default Club')
  assert.deepEqual([...data.scheduleConfig.weekdays], ['T3', 'T5'])
  assert.equal(data.scheduleConfig.timeRange, '19:00 – 21:00')
  assert.equal(data.scheduleConfig.startDate, '03/06/2026')
  assert.equal(data.scheduleConfig.autoGenerate, false)
})

test('pickleball member candidates exclude inactive duplicates when the profile is already casual', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'club',
    currentGroup: { id: 'club', name: 'CLB', type: 'pickleball' },
    members: [
      { id: 'hoang-em-fixed', groupId: 'club', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'fixed', isActive: false },
      { id: 'hoang-em-casual', groupId: 'club', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'casual', isActive: true },
    ],
    pickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state)

  assert.deepEqual(data.memberCandidates.map(member => member.name), [])
})

test('add expense data does not fall back to pickleball members for an empty expense group', () => {
  const { buildAddExpenseData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'expense-owner',
    currentGroupId: 'expense-1',
    currentGroup: { id: 'expense-1', groupType: 'expense', name: 'Ăn uống', members: [] },
    groups: [
      { id: 'expense-1', groupType: 'expense', name: 'Ăn uống', members: [] },
      { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball', members: ['pickle-minh-anh'] },
    ],
    members: [
      { id: 'pickle-minh-anh', groupId: 'pickle-1', profileId: 'profile-minh-anh', name: 'Minh Anh', memberType: 'fixed', isActive: true },
    ],
  }

  const data = buildAddExpenseData(state, { groupId: 'expense-1' })

  assert.deepEqual(data.members, [])
  assert.equal(data.memberCount, 0)
})

test('add expense data uses active expense-group members like group detail', () => {
  const { buildAddExpenseData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'long',
    currentGroupId: 'expense-1',
    currentGroup: {
      id: 'expense-1',
      groupType: 'expense',
      name: 'Ăn uống',
      members: ['long', 'minh-anh', 'hoang-em-inactive'],
      expenses: [],
    },
    groups: [],
    members: [
      { id: 'long', groupId: 'expense-1', name: 'Long', isActive: true, expenseActive: true },
      { id: 'minh-anh', groupId: 'expense-1', name: 'Minh Anh', isActive: true, expenseActive: true },
      { id: 'hoang-em-inactive', groupId: 'expense-1', name: 'Hoàng Em', isActive: true, expenseActive: false },
      { id: 'cuong-inactive', groupId: 'expense-1', name: 'Cường', isActive: false, expenseActive: true },
    ],
  }

  const data = buildAddExpenseData(state, { groupId: 'expense-1' })

  assert.deepEqual(data.members.map(member => member.name), ['Long', 'Minh Anh'])
  assert.equal(data.memberCount, 2)
})

test('add expense data resolves a pickleball context to its linked expense group', () => {
  const { buildAddExpenseData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'pickle-long',
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball 246', members: ['pickle-long'] },
    groups: [
      { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball 246', members: ['pickle-long'] },
      { id: 'expense-1', groupType: 'expense', linkedPickleballGroupId: 'pickle-1', name: 'Chi tiêu Virgo 246', members: ['expense-long', 'expense-minh'] },
    ],
    members: [
      { id: 'pickle-long', groupId: 'pickle-1', profileId: 'profile-long', name: 'Long', isActive: true, expenseActive: true },
      { id: 'expense-long', groupId: 'expense-1', profileId: 'profile-long', name: 'Long', isActive: true, expenseActive: true },
      { id: 'expense-minh', groupId: 'expense-1', profileId: 'profile-minh', name: 'Minh', isActive: true, expenseActive: true },
    ],
  }

  const data = buildAddExpenseData(state, { groupId: 'pickle-1' })

  assert.equal(data.groupId, 'expense-1')
  assert.equal(data.groupName, 'Chi tiêu Virgo 246')
  assert.deepEqual(data.members.map(member => member.id), ['expense-long', 'expense-minh'])
})

test('groups list shows expense groups instead of opening pickleball as an expense group', () => {
  const { buildGroupsListData } = loadScreenDataBuilders()
  const groups = [
    { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball 246', emoji: '🏸', members: ['pickle-long'] },
    { id: 'expense-1', groupType: 'expense', linkedPickleballGroupId: 'pickle-1', name: 'Chi tiêu Virgo 246', emoji: '✈️', description: 'Quỹ ăn uống sau buổi đánh', members: ['expense-long'] },
  ]
  const members = [
    { id: 'pickle-long', groupId: 'pickle-1', name: 'Long', isActive: true, expenseActive: true },
    { id: 'expense-long', groupId: 'expense-1', name: 'Long', isActive: true, expenseActive: true },
  ]

  const data = buildGroupsListData(groups, 'expense-long', members, 'Long', '2026-05')

  assert.deepEqual(data.groups.map(group => group.name), ['Chi tiêu Virgo 246'])
  assert.equal(data.groups[0].groupTypeLabel, 'Du lịch')
  assert.equal(data.groups[0].description, 'Quỹ ăn uống sau buổi đánh')
  assert.equal(data.groups[0].linkedPickleballLabel, 'Liên kết Pickleball')
  assert.equal(data.activeCount, 1)
})

test('linked pickleball expense groups stay visible after choosing a sport icon', () => {
  const { buildGroupsListData } = loadScreenDataBuilders()
  const groups = [
    { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball 246', emoji: '🏸', members: ['pickle-long'] },
    { id: 'expense-1', linkedPickleballGroupId: 'pickle-1', name: 'Chi tiêu Virgo 246', emoji: '🏸', members: ['expense-long'] },
  ]
  const members = [
    { id: 'expense-long', groupId: 'expense-1', name: 'Long', isActive: true, expenseActive: true },
  ]

  const data = buildGroupsListData(groups, 'expense-long', members, 'Long', '2026-05')

  assert.deepEqual(data.groups.map(group => group.id), ['expense-1'])
  assert.equal(data.groups[0].isLinkedPickleballExpenseGroup, true)
})

test('team fund uses next_court payments for current court fee rows', () => {
  const { buildPickleballTeamFundData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball', members: ['long', 'minh'] },
    members: [
      { id: 'long', groupId: 'pickle-1', name: 'Long', memberType: 'fixed', isActive: true },
      { id: 'minh', groupId: 'pickle-1', name: 'Minh', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      monthlyCourtFee: 1200000,
      monthlyConfigs: [{ yearMonth: '2026-06', courtFee: 1200000, sessionsCount: 4 }],
      sessions: [],
      ownerPayments: [{ groupId: 'pickle-1', items: [{ key: 'next_court', yearMonth: '2026-06', amount: 1200000 }] }],
    },
  }

  const data = buildPickleballTeamFundData(state, '2026-06')
  const courtRow = data.costRows.find(row => row.key === 'court')

  assert.equal(courtRow.paidToOwner, true)
})

test('team fund payment draft labels current month court fee', () => {
  const { buildPickleballTeamFundData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball', members: ['long'] },
    members: [{ id: 'long', groupId: 'pickle-1', name: 'Long', memberType: 'fixed', isActive: true }],
    pickle: {
      monthlyCourtFee: 1200000,
      monthlyConfigs: [
        { yearMonth: '2026-06', courtFee: 1200000, sessionsCount: 4 },
        { yearMonth: '2026-07', courtFee: 1500000, sessionsCount: 4 },
      ],
      sessions: [],
    },
  }

  const data = buildPickleballTeamFundData(state, '2026-06')
  const courtItem = data.paymentDraft.items.find(item => item.key === 'next_court')

  assert.equal(courtItem.label, 'Tiền sân tháng này')
  assert.equal(courtItem.yearMonth, '2026-06')
  assert.equal(courtItem.amount, 1200000)
})

test('pickleball overview ticket totals follow selected month', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'long',
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', groupType: 'pickleball', name: 'Virgo Pickleball', members: ['long', 'minh'] },
    members: [
      { id: 'long', groupId: 'pickle-1', name: 'Long', memberType: 'fixed', isActive: true },
      { id: 'minh', groupId: 'pickle-1', name: 'Minh', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      monthlyCourtFee: 0,
      monthlyConfigs: [{ yearMonth: '2026-05', courtFee: 0, sessionsCount: 1 }],
      sessions: [],
      externalTickets: [
        { id: 'may-ticket', groupId: 'pickle-1', date: '2026-05-15', status: 'team_fund', totalAmount: 100000, memberIds: ['long', 'minh'] },
        { id: 'jun-ticket', groupId: 'pickle-1', date: '2026-06-15', status: 'team_fund', totalAmount: 300000, memberIds: ['long', 'minh'] },
      ],
    },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state.pickle, 'long', state.members, '2026-05')

  assert.equal(data.ticketStats.totalAmount, 100000)
  assert.equal(data.ticketFund.teamFundTotal, 100000)
  assert.equal(data.yourBalance.ticketAdjustment, 50000)
})

test('edit expense data keeps saved receipt images for update forms', () => {
  const { buildAddExpenseData } = loadScreenDataBuilders()
  const receiptImages = [
    { id: 'receipt-1', name: 'hoa-don.jpg', url: 'data:image/jpeg;base64,abc123' },
  ]
  const state = {
    currentUserId: 'long',
    currentGroupId: 'expense-1',
    currentGroup: {
      id: 'expense-1',
      groupType: 'expense',
      name: 'Ăn uống',
      members: ['long', 'minh-anh'],
      expenses: [{
        id: 'expense-1',
        groupId: 'expense-1',
        title: 'Ăn tối',
        amount: 240000,
        paidBy: 'long',
        participants: ['long', 'minh-anh'],
        receiptImages,
        status: 'approved',
        date: '2026-05-26',
      }],
    },
    groups: [],
    members: [
      { id: 'long', groupId: 'expense-1', name: 'Long', isActive: true },
      { id: 'minh-anh', groupId: 'expense-1', name: 'Minh Anh', isActive: true },
    ],
  }

  const data = buildAddExpenseData(state, { expenseId: 'expense-1' })

  assert.deepEqual(data.editExpense.receiptImages, receiptImages)
})

test('new group profile options collapse duplicate member identities by normalized name', () => {
  const { buildNewGroupData } = loadScreenDataBuilders()
  const state = {
    profiles: [
      { id: 'profile-minh-anh-a', name: 'Minh Anh' },
      { id: 'profile-minh-anh-b', name: 'Minh Anh' },
      { id: 'profile-tuan-a', name: 'Tuấn' },
      { id: 'profile-tuan-b', name: 'Tuấn' },
    ],
    members: [
      { id: 'member-minh-anh-a', profileId: 'profile-minh-anh-a', name: 'Minh Anh', isActive: true },
      { id: 'member-minh-anh-b', profileId: 'profile-minh-anh-b', name: 'Minh Anh', isActive: true },
      { id: 'member-tuan-a', profileId: 'profile-tuan-a', name: 'Tuấn', isActive: true },
      { id: 'member-tuan-b', profileId: 'profile-tuan-b', name: 'Tuấn', isActive: true },
      { id: 'member-viet-anh', profileId: 'profile-viet-anh', name: 'Việt Anh', isActive: true },
    ],
  }

  const data = buildNewGroupData(state)

  assert.deepEqual(Array.from(data.profileOptions, profile => profile.name), ['Minh Anh', 'Tuấn', 'Việt Anh'])
})

test('group detail member balances use payer positive and debtors negative signs', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    members: ['minh-em', 'cuong', 'minh-anh'],
    expenses: [
      {
        id: 'expense-1',
        groupId: 'expense-1',
        title: 'Sân',
        amount: 90000,
        paidBy: 'minh-em',
        participants: ['minh-em', 'cuong', 'minh-anh'],
        status: 'approved',
        date: '2026-05-24',
      },
    ],
  }
  const members = [
    { id: 'minh-em', groupId: 'expense-1', name: 'Minh Em', isActive: true, memberType: 'fixed' },
    { id: 'cuong', groupId: 'expense-1', name: 'Cường', isActive: true, memberType: 'fixed' },
    { id: 'minh-anh', groupId: 'expense-1', name: 'Minh Anh', isActive: true, memberType: 'fixed' },
  ]

  const detail = buildGroupDetailData(group, 'minh-em', members, 'Minh Em', '2026-05')
  const balances = Object.fromEntries(detail.members.map(member => [member.id, member.balance]))

  assert.equal(detail.balance, 60000)
  assert.deepEqual(balances, {
    'minh-em': 60000,
    cuong: -30000,
    'minh-anh': -30000,
  })
})

test('home source balances normalize Supabase expense payer aliases', () => {
  const { buildHomeData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'dai-member',
    currentUserName: 'Đại',
    members: [
      { id: 'dai-member', groupId: 'g1', profileId: 'dai-profile', name: 'Đại' },
      ...Array.from({ length: 9 }, (_, index) => ({ id: `m${index}`, groupId: 'g1', name: `Member ${index}` })),
    ],
    groups: [
      {
        id: 'g1',
        name: 'Lấy vk để trưởng thành',
        members: ['dai-member', ...Array.from({ length: 9 }, (_, index) => `m${index}`)],
        expenses: [
          {
            id: 'expense-1',
            title: 'sn',
            amount: 200000,
            paid_by_member_id: 'dai-member',
            participants: ['dai-member', ...Array.from({ length: 9 }, (_, index) => `m${index}`)],
            expense_date: '2026-05-29',
            status: 'approved',
          },
        ],
      },
    ],
    notifications: [],
    pickle: { sessions: [] },
    _allPickle: { sessions: [] },
  }

  const data = buildHomeData(state, 'dai-member', state.members, state.groups, state.pickle, state, '2026-05')

  assert.equal(data.totalBalance, 180000)
  assert.equal(data.sourceBreakdown[0].amount, 180000)
})

test('home pending tickets include expandable ticket item details', () => {
  const { buildHomeData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'long',
    currentUserName: 'Long',
    members: [
      { id: 'long', name: 'Long' },
      { id: 'duy', name: 'Duy' },
      { id: 'myt', name: 'Mýt' },
    ],
    groups: [],
    pickle: {
      sessions: [],
      externalTickets: [
        {
          id: 'ticket-1',
          status: 'pending_review',
          session_date: '2026-05-24',
          session_time: '19:30',
          member_ids: ['long', 'duy'],
          total_amount: 100000,
          advancer_id: 'duy',
        },
      ],
    },
    _allPickle: {
      sessions: [],
      externalTickets: [
        {
          id: 'ticket-2',
          status: 'PENDING_REVIEW',
          sessionDate: '2026-05-25',
          time: '20:00',
          memberIds: ['myt'],
          totalAmount: 50000,
        },
        { id: 'approved-ticket', status: 'team_fund', totalAmount: 90000 },
      ],
    },
    notifications: [],
  }

  const data = buildHomeData(state, 'long', state.members, state.groups, state.pickle, state, '2026-05')

  assert.equal(data.pendingTickets.count, 2)
  assert.equal(data.pendingTickets.totalAmount, 150000)
  assert.deepEqual(Array.from(data.pendingTickets.items.map(ticket => ticket.id)), ['ticket-1', 'ticket-2'])
  assert.deepEqual({ ...data.pendingTickets.items[0], memberIds: Array.from(data.pendingTickets.items[0].memberIds) }, {
    id: 'ticket-1',
    date: '2026-05-24',
    dateLabel: 'CN 24/05',
    time: '19:30',
    memberIds: ['long', 'duy'],
    memberLabel: 'Long, Duy',
    totalAmount: 100000,
    amountPerPerson: 50000,
    advancerId: 'duy',
    advancerName: 'Duy',
    approveStatus: 'unpaid',
  })
  assert.equal(data.pendingTickets.items[1].dateLabel, 'T2 25/05')
  assert.equal(data.pendingTickets.items[1].advancerName, null)
  assert.equal(data.pendingTickets.items[1].approveStatus, 'team_fund')
})

test('group detail exposes monthly total spent and expense count for the summary card', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    members: ['long', 'myt'],
    expenses: [
      { id: 'may-1', groupId: 'expense-1', title: 'Ăn tối', amount: 100000, paidBy: 'long', participants: ['long', 'myt'], status: 'approved', date: '2026-05-04' },
      { id: 'may-2', groupId: 'expense-1', title: 'Cafe', amount: 50000, paidBy: 'myt', participants: ['long', 'myt'], status: 'pending', date: '2026-05-20' },
      { id: 'june-1', groupId: 'expense-1', title: 'Tháng sau', amount: 900000, paidBy: 'long', participants: ['long'], status: 'approved', date: '2026-06-01' },
    ],
  }
  const members = [
    { id: 'long', groupId: 'expense-1', name: 'Long', isActive: true },
    { id: 'myt', groupId: 'expense-1', name: 'Mýt', isActive: true },
  ]

  const detail = buildGroupDetailData(group, 'long', members, 'Long', '2026-05')

  assert.equal(detail.totalSpent, 150000)
  assert.equal(detail.expenseCount, 2)
})

test('group detail assigns stable distinct fallback avatar colors when members have no color', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    members: ['long', 'myt', 'cuong'],
    expenses: [],
  }
  const members = [
    { id: 'long', profileId: 'profile-long', groupId: 'expense-1', name: 'Long', isActive: true },
    { id: 'myt', profileId: 'profile-myt', groupId: 'expense-1', name: 'Mýt', isActive: true },
    { id: 'cuong', profileId: 'profile-cuong', groupId: 'expense-1', name: 'Cường', isActive: true },
  ]

  const first = buildGroupDetailData(group, 'long', members, 'Long', '2026-05')
  const second = buildGroupDetailData(group, 'long', members, 'Long', '2026-05')
  const colors = first.members.map(member => member.color)

  assert.deepEqual(colors, second.members.map(member => member.color))
  assert.equal(new Set(colors).size, 3)
  assert.ok(colors.every(color => color.startsWith('linear-gradient(')))
})

test('group detail exposes pending expenses for treasurer approval', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    members: ['treasurer', 'member-1'],
    expenses: [
      {
        id: 'pending-1',
        groupId: 'expense-1',
        title: 'Sân chờ duyệt',
        amount: 120000,
        paidBy: 'member-1',
        submittedBy: 'member-1',
        participants: ['treasurer', 'member-1'],
        status: 'pending',
        date: '2026-05-24',
      },
      {
        id: 'approved-1',
        groupId: 'expense-1',
        title: 'Sân đã duyệt',
        amount: 90000,
        paidBy: 'treasurer',
        submittedBy: 'treasurer',
        participants: ['treasurer', 'member-1'],
        status: 'approved',
        date: '2026-05-23',
      },
    ],
  }
  const members = [
    { id: 'treasurer', groupId: 'expense-1', name: 'Thủ quỹ', role: 'treasurer', isActive: true },
    { id: 'member-1', groupId: 'expense-1', name: 'Minh', role: 'member', isActive: true },
  ]

  const detail = buildGroupDetailData(group, 'treasurer', members, 'Thủ quỹ', '2026-05')

  assert.equal(detail.currentMemberId, 'treasurer')
  assert.equal(detail.pendingExpenses.length, 1)
  assert.equal(detail.pendingExpenses[0].id, 'pending-1')
  assert.equal(detail.pendingExpenses[0].submittedBy, 'member-1')
})

test('home pending approvals include only groups the current user can review', () => {
  const { buildHomeData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'cuong-expense',
    currentUserName: 'Cường',
    groups: [
      {
        id: 'member-group',
        name: 'Nhóm thường',
        groupType: 'expense',
        members: ['cuong-expense', 'long-expense'],
        expenses: [
          { id: 'pending-member', title: 'Member gửi', amount: 100000, status: 'pending', date: '2026-05-20', submittedBy: 'cuong-expense' },
        ],
      },
      {
        id: 'treasurer-group',
        name: 'Nhóm thủ quỹ',
        groupType: 'expense',
        members: ['cuong-treasurer', 'long-treasurer'],
        expenses: [
          { id: 'pending-reviewable', title: 'Cần duyệt', amount: 200000, status: 'pending', date: '2026-05-21', submittedBy: 'long-treasurer' },
        ],
      },
    ],
    members: [
      { id: 'cuong-expense', groupId: 'member-group', name: 'Cường', role: 'member', isActive: true, profileId: 'profile-cuong' },
      { id: 'long-expense', groupId: 'member-group', name: 'Long', role: 'treasurer', isActive: true, profileId: 'profile-long' },
      { id: 'cuong-treasurer', groupId: 'treasurer-group', name: 'Cường', role: 'treasurer', isActive: true, profileId: 'profile-cuong' },
      { id: 'long-treasurer', groupId: 'treasurer-group', name: 'Long', role: 'member', isActive: true, profileId: 'profile-long' },
    ],
    currentGroup: null,
  }

  const home = buildHomeData(state, state.currentUserId, state.members, state.groups, {}, state, '2026-05')

  assert.deepEqual(home.pendingExpenses.map(expense => expense.id), ['pending-reviewable'])
})

test('group detail member transactions include participant shares and payer advances for the selected month', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    name: 'Ăn uống',
    members: ['minh', 'tuan', 'an'],
    expenses: [
      {
        id: 'dinner',
        groupId: 'expense-1',
        title: 'Ăn tối',
        category: 'food',
        amount: 90000,
        paidBy: 'minh',
        participants: ['minh', 'tuan', 'an'],
        splits: [
          { memberId: 'minh', amount: 30000 },
          { memberId: 'tuan', amount: 30000 },
          { memberId: 'an', amount: 30000 },
        ],
        status: 'approved',
        date: '2026-05-12',
      },
      {
        id: 'coffee',
        groupId: 'expense-1',
        title: 'Cafe',
        category: 'cafe',
        amount: 60000,
        paidBy: 'tuan',
        participants: ['minh', 'tuan'],
        status: 'approved',
        date: '2026-05-13',
      },
      {
        id: 'old-month',
        groupId: 'expense-1',
        title: 'Tháng cũ',
        amount: 60000,
        paidBy: 'minh',
        participants: ['minh', 'tuan'],
        status: 'approved',
        date: '2026-04-20',
      },
    ],
  }
  const members = [
    { id: 'minh', groupId: 'expense-1', name: 'Minh', role: 'treasurer', isActive: true },
    { id: 'tuan', groupId: 'expense-1', name: 'Tuấn', isActive: true },
    { id: 'an', groupId: 'expense-1', name: 'An', isActive: true },
  ]

  const detail = buildGroupDetailData(group, 'minh', members, 'Minh', '2026-05')
  const minh = detail.members.find(member => member.id === 'minh')
  const tuan = detail.members.find(member => member.id === 'tuan')

  assert.equal(minh.memberTransactionSummary.owes, 30000)
  assert.equal(minh.memberTransactionSummary.advanced, 60000)
  assert.equal(minh.memberTransactionSummary.net, 30000)
  assert.deepEqual(minh.memberTransactions.map(row => [row.id, row.role, row.paidAmount, row.shareAmount, row.netAmount]), [
    ['coffee', 'participant', 0, 30000, -30000],
    ['dinner', 'payer', 90000, 30000, 60000],
  ])
  assert.equal(tuan.memberTransactionSummary.owes, 30000)
  assert.equal(tuan.memberTransactionSummary.advanced, 30000)
  assert.equal(tuan.memberTransactionSummary.net, 0)
  assert.deepEqual(tuan.memberTransactions.map(row => [row.id, row.role, row.paidAmount, row.shareAmount, row.netAmount]), [
    ['coffee', 'payer', 60000, 30000, 30000],
    ['dinner', 'participant', 0, 30000, -30000],
  ])
})

test('group detail applies confirmed payment coverage but ignores deleted payment notices', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    name: 'Ăn uống',
    members: ['dai', 'long'],
    expenses: [
      {
        id: 'dinner',
        groupId: 'expense-1',
        title: 'Ăn tối',
        amount: 1600000,
        paidBy: 'long',
        participants: ['dai', 'long'],
        splits: [
          { memberId: 'dai', amount: 800000 },
          { memberId: 'long', amount: 800000 },
        ],
        status: 'approved',
        date: '2026-05-12',
      },
    ],
  }
  const members = [
    { id: 'dai', groupId: 'expense-1', profileId: 'dai-profile', name: 'Đại', isActive: true },
    { id: 'long', groupId: 'expense-1', profileId: 'long-profile', name: 'Long', role: 'treasurer', isActive: true },
  ]
  const appState = {
    currentUserId: 'dai',
    currentUserName: 'Đại',
    members,
    notifications: [
      {
        id: 'pay-1',
        type: 'payment_submitted',
        actorMemberId: 'dai',
        createdAt: '2026-05-28T12:00:00Z',
        metadata: {
          status: 'deleted',
          amount: 700000,
          monthLabel: 'Tháng 5 · 2026',
          coveredSources: [
            { sourceId: 'expense-1', sourceType: 'group', sourceLabel: 'Ăn uống', amount: -700000 },
          ],
        },
      },
    ],
  }

  const confirmedDetail = buildGroupDetailData(group, 'dai', members, 'Đại', '2026-05', [], {
    ...appState,
    notifications: [
      {
        ...appState.notifications[0],
        metadata: { ...appState.notifications[0].metadata, status: 'confirmed' },
      },
    ],
  })
  const deletedDetail = buildGroupDetailData(group, 'dai', members, 'Đại', '2026-05', [], appState)

  assert.equal(confirmedDetail.balance, -100000)
  assert.equal(deletedDetail.balance, -800000)
})

test('group detail ignores unscoped payer coverage for members paid for by someone else', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    name: 'Ăn uống',
    members: ['dai', 'cuong', 'long'],
    expenses: [
      {
        id: 'old-debt',
        title: 'Khoản cũ',
        amount: 774479,
        paidBy: 'cuong',
        participants: ['dai'],
        splits: [{ memberId: 'dai', amount: 774479 }],
        status: 'approved',
        date: '2026-05-26',
      },
      {
        id: 'new-advance',
        title: 'sn',
        amount: 200000,
        paid_by_member_id: 'dai',
        participants: ['dai', 'cuong', 'long'],
        status: 'approved',
        expense_date: '2026-05-29',
      },
    ],
  }
  const members = [
    { id: 'dai', groupId: 'expense-1', profileId: 'dai-profile', name: 'Đại', isActive: true },
    { id: 'cuong', groupId: 'expense-1', profileId: 'cuong-profile', name: 'Cường', isActive: true },
    { id: 'long', groupId: 'expense-1', profileId: 'long-profile', name: 'Long', role: 'treasurer', isActive: true },
  ]
  const appState = {
    currentUserId: 'dai',
    currentUserName: 'Đại',
    members,
    notifications: [
      {
        id: 'pay-1',
        type: 'payment_submitted',
        actorMemberId: 'cuong',
        createdAt: '2026-05-28T12:00:00Z',
        metadata: {
          status: 'confirmed',
          amount: 1374479,
          memberName: 'Cường',
          coveredMembers: [{ profileId: 'dai-profile', memberIds: ['dai'], name: 'Đại', amount: -774479 }],
          monthLabel: 'Tháng 5 · 2026',
          coveredSources: [
            { sourceId: 'expense-1', sourceType: 'group', sourceLabel: 'Ăn uống', amount: -600000 },
            { sourceId: 'expense-1', sourceType: 'group', sourceLabel: 'Ăn uống', amount: -774479, profileId: 'dai-profile', memberName: 'Đại' },
          ],
        },
      },
    ],
  }

  const detail = buildGroupDetailData(group, 'dai', members, 'Đại', '2026-05', [], appState)
  const dai = detail.members.find(member => member.id === 'dai')

  assert.equal(dai.balance, 133333)
})

test('group detail exposes treasurer payment target for member bill QR', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-1',
    groupType: 'expense',
    name: 'Ăn uống',
    members: ['minh', 'tuan'],
    expenses: [],
  }
  const members = [
    { id: 'minh', groupId: 'expense-1', name: 'Minh', role: 'treasurer', bankName: 'VCB', bankAccount: '123', bankAccountName: 'MINH', isActive: true },
    { id: 'tuan', groupId: 'expense-1', name: 'Tuấn', isActive: true },
  ]

  const detail = buildGroupDetailData(group, 'minh', members, 'Minh', '2026-05')

  assert.equal(detail.paymentTarget.memberId, 'minh')
  assert.equal(detail.paymentTarget.name, 'Minh')
  assert.equal(detail.paymentTarget.bankName, 'VCB')
  assert.equal(detail.paymentTarget.bankAccount, '123')
  assert.equal(detail.paymentTarget.bankAccountName, 'MINH')
  assert.equal(detail.members.find(member => member.id === 'tuan').paymentTarget.bankAccount, '123')
})

test('group detail marks current user as creator when created_by matches profile id', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const group = {
    id: 'expense-creator',
    groupType: 'expense',
    created_by: 'profile-owner',
    members: ['member-owner', 'member-friend'],
    expenses: [],
  }
  const members = [
    { id: 'member-owner', profileId: 'profile-owner', groupId: 'expense-creator', name: 'Owner', role: 'member', isActive: true },
    { id: 'member-friend', profileId: 'profile-friend', groupId: 'expense-creator', name: 'Friend', role: 'member', isActive: true },
  ]

  const detail = buildGroupDetailData(group, 'member-owner', members, 'Owner', '2026-05')

  assert.equal(detail.isTreasurer, true)
  assert.equal(detail.isGroupCreator, true)
})

test('group detail exposes pickleball classification from name and emoji', () => {
  const { buildGroupDetailData } = loadScreenDataBuilders()
  const members = [
    { id: 'member-1', groupId: 'pickle-1', name: 'Minh', isActive: true, memberType: 'fixed' },
    { id: 'member-2', groupId: 'expense-1', name: 'An', isActive: true, memberType: 'fixed' },
  ]

  const pickleballDetail = buildGroupDetailData(
    { id: 'pickle-1', name: 'Sunday Pickle Club', emoji: '👥', members: ['member-1'], expenses: [] },
    'member-1',
    members,
    'Minh',
    '2026-05'
  )
  const emojiDetail = buildGroupDetailData(
    { id: 'expense-1', name: 'Nhóm sân', emoji: '🏸', members: ['member-2'], expenses: [] },
    'member-2',
    members,
    'An',
    '2026-05'
  )
  const expenseDetail = buildGroupDetailData(
    { id: 'expense-1', name: 'Nhóm ăn tối', emoji: '🍜', members: ['member-2'], expenses: [] },
    'member-2',
    members,
    'An',
    '2026-05'
  )

  assert.equal(pickleballDetail.isPickleball, true)
  assert.equal(emojiDetail.isPickleball, true)
  assert.equal(expenseDetail.isPickleball, false)
})

test('core balances treat missing legacy status as approved and ignore pending or rejected', () => {
  assert.match(coreDataSource, /const approvedExpenses = \(g\.expenses \|\| \[\]\)\.filter\(e => !e\.status \|\| e\.status === 'approved'\)/)
})

test('expense group member candidates use inactive expense rows and active casual rows as pending rows', () => {
  const { buildGroupMemberCandidates } = loadScreenDataBuilders()
  const group = { id: 'expense-1', groupType: 'expense', members: ['inactive-an', 'active-binh'] }
  const members = [
    { id: 'inactive-an', groupId: 'expense-1', name: 'An', memberType: 'fixed', isActive: true, expenseActive: false },
    { id: 'active-binh', groupId: 'expense-1', name: 'Binh', memberType: 'casual', isActive: true, expenseActive: false },
  ]

  const candidates = buildGroupMemberCandidates(group, members)

  assert.deepEqual(candidates.map(member => member.name), ['An', 'Binh'])
  assert.equal(candidates[0].memberId, 'inactive-an')
  assert.equal(candidates[0].isInactive, true)
  assert.equal(candidates[1].memberId, 'active-binh')
  assert.equal(candidates[1].isInactive, true)
})

test('expense group member candidates include active casual pickleball profiles outside the expense group', () => {
  const { buildGroupMemberCandidates } = loadScreenDataBuilders()
  const group = { id: 'expense-1', groupType: 'expense', members: ['expense-long'] }
  const members = [
    { id: 'expense-long', groupId: 'expense-1', profileId: 'profile-long', name: 'Long', memberType: 'fixed', isActive: true },
    { id: 'pickle-hoang-em', groupId: 'pickle-1', profileId: 'profile-hoang-em', name: 'Hoàng Em', memberType: 'casual', isActive: true },
  ]

  const candidates = buildGroupMemberCandidates(group, members)

  assert.deepEqual(candidates.map(member => member.name), ['Hoàng Em'])
  assert.equal(candidates[0].memberId, 'pickle-hoang-em')
  assert.equal(candidates[0].profileId, 'profile-hoang-em')
})

test('Pickleball overview reads current-month court fee and current fixed members', () => {
  const overviewMatch = dataSource.match(/function buildPickleballOverviewData[\s\S]*?\n}\n\nfunction buildProfileData/)
  assert.ok(overviewMatch)

  const overviewSource = overviewMatch[0]
  assert.match(overviewSource, /const currentYearMonth = monthKey\(today\)/)
  assert.match(overviewSource, /const currentMonthConfig = safeArray\(pickle\?\.monthlyConfigs\)\.find\([\s\S]*?c => c\.yearMonth === currentYearMonth[\s\S]*?\)/)
  assert.match(overviewSource, /const monthSessions = getStateMonthSessions\(state, today\)/)
  assert.match(overviewSource, /const courtFee = Number\(currentMonthConfig\?\.courtFee \?\? pickle\?\.monthlyCourtFee \?\? 0\)/)
  assert.match(overviewSource, /const currentFixedMembers = currentGroupMembers\(state\)\.filter\(member => isActiveMember\(member\) && memberType\(member\) === 'fixed'\)/)
  assert.match(overviewSource, /const activeMemberIds = currentFixedMembers\.map/)
  assert.match(overviewSource, /memberCount: activeMemberIds\.length/)
  assert.match(overviewSource, /courtSub: `\$\{activeMemberIds\.length\} thành viên cố định`/)
})

test('calendar session detail excludes casual members without explicit attendance records', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', name: 'Virgo Pickleball 246', members: ['fixed-minh', 'casual-hoang'] },
    members: [
      { id: 'fixed-minh', groupId: 'pickle-1', name: 'Minh', memberType: 'fixed', isActive: true },
      { id: 'casual-hoang', groupId: 'pickle-1', name: 'Hoàng Em', memberType: 'casual', isActive: true },
    ],
    pickle: {
      monthlyConfigs: [{ groupId: 'pickle-1', yearMonth: '2026-06', fixedMemberIds: ['fixed-minh'] }],
      sessions: [{
        id: 'session-1',
        groupId: 'pickle-1',
        date: '2026-06-01',
        status: 'completed',
        attendanceRecords: [{ memberId: 'fixed-minh', status: 'present' }],
      }],
    },
  }

  const data = buildPickleballCalendarData(state, { yearMonth: '2026-06', selectedDate: '2026-06-01' })

  assert.equal(data.selectedSession.attendees.map(member => member.name).join(','), 'Minh')
})

test('Screen data scopes pickleball builders to pickleballGroupId instead of the opened expense group', () => {
  assert.match(dataSource, /const pickleballState = scopedPickleballState\(state\)/)
  assert.match(dataSource, /buildPickleballOverviewData\(pickleballState, pickle, _allPickle, currentUserId, members, selectedYearMonth\)/)
  assert.match(dataSource, /buildPickleballCalendarData\(pickleballState, \{ yearMonth: selectedYearMonth \}\)/)
  assert.match(dataSource, /getPickleballSettingsData: \(\) => buildPickleballSettingsData\(pickleballState\)/)
  assert.match(dataSource, /function scopedPickleballState\(state\) \{/)
  assert.match(dataSource, /currentGroupId: group\?\.id \|\| state\?\.pickleballGroupId \|\| state\?\.currentGroupId/)
})

test('Pickleball members data exposes fixed/casual rows with rank metadata', () => {
  const membersMatch = dataSource.match(/function buildPickleballMembersData[\s\S]*?\n}\n\nfunction buildPickleballTicketsData/)
  assert.ok(membersMatch)

  const membersSource = membersMatch[0]
  assert.match(membersSource, /const fixedMembers = activeMembers\.filter\(member => memberType\(member\) === 'fixed'\)/)
  assert.match(membersSource, /const casualMembers = dedupeMemberRowsByProfileOrName\(activeMembers\.filter\(member => memberType\(member\) === 'casual'\)\)/)
  assert.match(membersSource, /type: memberType\(member\)/)
  assert.match(membersSource, /fixedMembers: fixedRows/)
  assert.match(membersSource, /casualMembers: casualRows/)
  assert.match(dataSource, /progressPct/)
  assert.match(dataSource, /rank: calculateMemberRank\(progressPct\)/)
})

test('Pickleball members data collapses duplicate casual rows by shared profile', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'pickle-1',
    currentGroup: { id: 'pickle-1', name: 'Virgo Pickleball 246', members: ['fixed-minh', 'casual-tuan-old', 'casual-tuan-new', 'casual-hoang'] },
    groups: [{ id: 'pickle-1', name: 'Virgo Pickleball 246', members: ['fixed-minh', 'casual-tuan-old', 'casual-tuan-new', 'casual-hoang'] }],
    members: [
      { id: 'fixed-minh', groupId: 'pickle-1', name: 'Minh', memberType: 'fixed', isActive: true },
      { id: 'casual-tuan-old', groupId: 'pickle-1', name: 'Tuấn', memberType: 'casual', profileId: 'profile-tuan', isActive: true },
      { id: 'casual-tuan-new', groupId: 'pickle-1', name: 'Tuấn', memberType: 'casual', profileId: 'profile-tuan', isActive: true },
      { id: 'casual-hoang', groupId: 'pickle-1', name: 'Hoàng Em', memberType: 'casual', profileId: 'profile-hoang', isActive: true },
    ],
    sessions: [],
  }

  const data = buildPickleballMembersData(state, '2026-05')

  assert.deepEqual(data.guests.map(member => member.name), ['Tuấn', 'Hoàng Em'])
  assert.equal(data.stats.guests, 2)
})

test('Member detail data includes attendance rank and casual court-fee logic', () => {
  assert.match(dataSource, /getMemberDetailData: \(memberId\) => buildMemberDetailData\(pickleballState, memberId, selectedYearMonth\)/)

  const detailMatch = dataSource.match(/function buildMemberDetailData[\s\S]*?\n}\n\nfunction buildPickleballTicketsData/)
  assert.ok(detailMatch)
  const detailSource = detailMatch[0]

  assert.match(detailSource, /const balance = buildMemberMonthBalance\(state, pickle, sessions, member\.id\)/)
  assert.match(detailSource, /rank: calculateMemberRank\(attendance\.percentage\)/)
  assert.match(detailSource, /bankAccount: member\?\.bankAccount \|\| member\?\.bank_account \|\| ''/)
  assert.match(dataSource, /const ratePerSession = courtFeeTotal \/ sessionsCount \/ fixedMemberCount/)
  assert.match(dataSource, /const vanglaiCharge = ratePerSession \* attendanceByMemberId\(sessions, member\.id\)/)
  assert.match(dataSource, /const rebatePerFixed = fixedMemberCount > 0 \? casualCharges\.reduce/)
})

test('Pickleball tickets data exposes individual-ticket table rows and team-fund filter', () => {
  const ticketsMatch = dataSource.match(/function buildPickleballTicketsData[\s\S]*?\n}\n\nfunction buildPickleballSettingsData/)
  assert.ok(ticketsMatch)
  const ticketsSource = ticketsMatch[0]

  assert.match(ticketsSource, /monthTicketsForState\(state, today\)/)
  assert.match(dataSource, /state\?\._allPickle\?\.externalTickets/)
  assert.match(dataSource, /state\?\.pickle\?\.externalTickets/)
  assert.match(ticketsSource, /monthLabel: formatMonthLabel\(today\)/)
  assert.match(ticketsSource, /const approvedTickets = tickets\.filter\(ticket => ticket\.status !== 'pending_review'\)/)
  assert.match(ticketsSource, /totalAttendances: approvedTickets\.reduce\([\s\S]*?safeArray\(ticket\.memberIds\)\.length/)
  assert.match(dataSource, /amountPerPerson/)
  assert.match(dataSource, /memberLabels/)
  assert.match(dataSource, /advancerName/)
  assert.match(ticketsSource, /status: 'team_fund'/)
  assert.match(ticketsSource, /\{ key: 'pending', label: `🕓 Chờ duyệt · \$\{pending\.length\}` \}/)
  assert.match(ticketsSource, /\{ key: 'team', label: `🏦 Quỹ team · \$\{teamFund\.length\}` \}/)
})

test('Pickleball overview and member detail include individual-ticket balances', () => {
  assert.match(dataSource, /function memberTicketBalance\(state, memberId, date\) \{/)
  assert.match(dataSource, /function memberTeamFundTicketShare\(state, memberId, date\) \{/)
  assert.match(dataSource, /const currentPickleballMemberId = memberIdForGroup\(state\?\.currentGroup, currentUserId, members, state\?\.currentUserName\)/)
  assert.match(dataSource, /const p2pTicketBalance = memberTicketBalance\(state, currentPickleballMemberId, today\)/)
  assert.match(dataSource, /const teamFundTicketShare = memberTeamFundTicketShare\(state, currentPickleballMemberId, today\)/)
  assert.match(dataSource, /const ticketAmount = p2pTicketBalance - teamFundTicketShare/)
  assert.match(dataSource, /const ticketStats = buildTicketMonthStats\(state, today\)/)
  assert.match(dataSource, /ticketStats,\s*\n\s*ticketFund,/)
  assert.match(dataSource, /ticketSessions: ticketStats\.sessionCount/)
  assert.match(dataSource, /ticketTotal: ticketStats\.totalAmount/)
  assert.match(dataSource, /summaryCards: buildPersonalPickleSummaryCards\(/)
  assert.match(dataSource, /yourTickets: buildPersonalTicketOverview\(state, currentPickleballMemberId\)/)
  assert.match(dataSource, /memberBalance\.courtFee/)
  assert.match(dataSource, /memberBalance\.waterFee/)
  assert.match(dataSource, /ticketAdjustment/)
  assert.match(dataSource, /const ticketShare = memberTeamFundTicketShare\(state, memberId, date\)/)
  assert.match(dataSource, /const p2pBalance = memberTicketBalance\(state, memberId, date\)/)
  assert.match(dataSource, /ticketShare/)
  assert.match(dataSource, /p2pBalance/)
})
