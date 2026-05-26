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
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildAddExpenseData, buildGroupDetailData, buildGroupMemberCandidates, buildGroupsListData, buildNewGroupData, buildPickleballMembersData }`, context)
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
    { id: 'expense-1', groupType: 'expense', linkedPickleballGroupId: 'pickle-1', name: 'Chi tiêu Virgo 246', members: ['expense-long'] },
  ]
  const members = [
    { id: 'pickle-long', groupId: 'pickle-1', name: 'Long', isActive: true, expenseActive: true },
    { id: 'expense-long', groupId: 'expense-1', name: 'Long', isActive: true, expenseActive: true },
  ]

  const data = buildGroupsListData(groups, 'expense-long', members, 'Long', '2026-05')

  assert.deepEqual(data.groups.map(group => group.name), ['Chi tiêu Virgo 246'])
  assert.equal(data.activeCount, 1)
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
  assert.match(dataSource, /function memberTicketBalance\(state, memberId\) \{/)
  assert.match(dataSource, /function memberTeamFundTicketShare\(state, memberId\) \{/)
  assert.match(dataSource, /const p2pTicketBalance = memberTicketBalance\(state, currentUserId\)/)
  assert.match(dataSource, /const teamFundTicketShare = memberTeamFundTicketShare\(state, currentUserId\)/)
  assert.match(dataSource, /const ticketAmount = p2pTicketBalance - teamFundTicketShare/)
  assert.match(dataSource, /const ticketStats = buildTicketMonthStats\(state\)/)
  assert.match(dataSource, /ticketStats,\s*\n\s*ticketFund,/)
  assert.match(dataSource, /ticketSessions: ticketStats\.sessionCount/)
  assert.match(dataSource, /ticketTotal: ticketStats\.totalAmount/)
  assert.match(dataSource, /summaryCards: buildPersonalPickleSummaryCards\(/)
  assert.match(dataSource, /yourTickets: buildPersonalTicketOverview\(state, currentUserId\)/)
  assert.match(dataSource, /memberBalance\.courtFee/)
  assert.match(dataSource, /memberBalance\.waterFee/)
  assert.match(dataSource, /ticketAdjustment/)
  assert.match(dataSource, /const ticketShare = memberTeamFundTicketShare\(state, memberId\)/)
  assert.match(dataSource, /const p2pBalance = memberTicketBalance\(state, memberId\)/)
  assert.match(dataSource, /ticketShare/)
  assert.match(dataSource, /p2pBalance/)
})
