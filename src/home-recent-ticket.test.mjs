import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./screens/Home.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')

function loadBuildHomeData() {
  const source = dataSource
    .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
    .replace(/^export /gm, '')
  const context = {
    Date,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${value}`,
    groupBalance: () => ({}),
    groupNet: () => 0,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: () => [],
    getRecentInvites: () => [],
  }
  vm.runInNewContext(`${source}\nglobalThis.__buildHomeData = buildHomeData`, context)
  return context.__buildHomeData
}

test('home recent transactions include approved pickleball ticket payments for selected month', () => {
  const buildHomeData = loadBuildHomeData()
  const state = {
    currentUserId: 'm1',
    currentUserName: 'An',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'Virgo Pickleball 246' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed', isActive: true },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      fixedMembers: ['m1', 'm2'],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-07', courtFee: 0 }],
      sessions: [],
      externalTickets: [
        { id: 'ticket-1', groupId: 'g1', yearMonth: '2026-07', date: '2026-07-01', status: 'team_fund', totalAmount: 120000, memberIds: ['m1', 'm2'] },
      ],
    },
    _allPickle: { sessions: [], sessionItems: [], externalTickets: [] },
  }

  const data = buildHomeData(state, 'm1', state.members, [], state.pickle, state, '2026-07')

  assert.deepEqual(JSON.parse(JSON.stringify(data.transactions.map(row => [row.id, row.type, row.title, row.amount, row.isMine]))), [
    ['ticket:ticket-1', 'pickleball_ticket', 'Trả tiền sân theo xé vé tháng', -60000, true],
  ])
})

test('home opens pickleball transactions as transaction details', () => {
  assert.doesNotMatch(homeSource, /tx\.type === 'pickleball_ticket'/)
  assert.match(homeSource, /onAction\?\.\('viewExpense', \{ expenseId: tx\.id \}\)/)
})

test('home recent transactions include every selected-month group debt for current profile', () => {
  const buildHomeData = loadBuildHomeData()
  const members = [
    { id: 'pb-tuan', groupId: 'pickle', name: 'Lê Tuấn', profileId: 'profile-tuan', memberType: 'fixed', isActive: true },
    { id: 'virgo-tuan', groupId: 'virgo-expense', name: 'Lê Tuấn', profileId: 'profile-tuan', isActive: true },
    { id: 'lvk-tuan', groupId: 'lay-vk', name: 'Lê Tuấn', profileId: 'profile-tuan', isActive: true },
    { id: 'virgo-payer', groupId: 'virgo-expense', name: 'Long', profileId: 'profile-long', isActive: true },
    { id: 'lvk-payer', groupId: 'lay-vk', name: 'Long', profileId: 'profile-long', isActive: true },
  ]
  const state = {
    currentUserId: 'pb-tuan',
    currentProfileId: 'profile-tuan',
    currentUserName: 'Lê Tuấn',
    currentGroupId: 'pickle',
    currentGroup: { id: 'pickle', name: 'Virgo Pickleball 246' },
    selectedYearMonth: '2026-05',
    members,
    expenses: [
      {
        id: 'thang-5-lay-vk',
        groupId: 'lay-vk',
        title: 'Tháng 5 Lấy vk',
        amount: 100000,
        paidBy: 'lvk-payer',
        participants: ['lvk-tuan'],
        splits: [{ memberId: 'lvk-tuan', amount: 100000 }],
        date: '2026-05-20',
        status: 'approved',
      },
    ],
    groups: [
      {
        id: 'virgo-expense',
        name: 'Chi tiêu Virgo 246',
        members: ['virgo-tuan', 'virgo-payer'],
        expenses: [
          {
            id: 'bia-hoi',
            title: 'Bia Hơi',
            amount: 400000,
            paidBy: 'virgo-payer',
            participants: ['virgo-tuan'],
            splits: [{ memberId: 'virgo-tuan', amount: 400000 }],
            date: '2026-05-31',
            status: 'approved',
          },
        ],
      },
      {
        id: 'lay-vk',
        name: 'Lấy vk để trưởng thành',
        members: ['lvk-tuan', 'lvk-payer'],
        expenses: [],
      },
    ],
    pickle: {
      currentGroup: { id: 'pickle', name: 'Virgo Pickleball 246' },
      currentGroupId: 'pickle',
      fixedMembers: ['pb-tuan'],
      monthlyConfigs: [{ groupId: 'pickle', yearMonth: '2026-05', courtFee: 0 }],
      sessions: [],
      externalTickets: [],
    },
    _allPickle: { sessions: [], sessionItems: [], externalTickets: [] },
  }

  const data = buildHomeData(state, 'pb-tuan', members, state.groups, state.pickle, state, '2026-05')
  const rows = data.transactions.map(row => [row.id, row.subtitle, row.amount, row.isMine])
  const layVkSource = data.sourceBreakdown.find(row => row.sourceId === 'lay-vk')

  assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
    ['bia-hoi', 'Chi tiêu Virgo 246', -400000, true],
    ['thang-5-lay-vk', 'Lấy vk để trưởng thành', -100000, true],
  ])
  assert.deepEqual(JSON.parse(JSON.stringify(layVkSource.monthBreakdown[0].items)), [
    { id: 'thang-5-lay-vk', label: 'Tháng 5 Lấy vk', date: '2026-05-20', amount: -100000 },
  ])
})

test('home recent transaction data is not sliced before Home applies mine filter', () => {
  const buildHomeData = loadBuildHomeData()
  const members = [
    { id: 'me', groupId: 'g1', name: 'Lê Tuấn', profileId: 'profile-tuan', isActive: true },
    { id: 'other', groupId: 'g1', name: 'Người khác', profileId: 'profile-other', isActive: true },
    { id: 'payer', groupId: 'g1', name: 'Long', profileId: 'profile-long', isActive: true },
  ]
  const expenses = Array.from({ length: 9 }, (_, index) => ({
    id: `other-${index}`,
    title: `Khoản khác ${index}`,
    amount: 1000,
    paidBy: 'payer',
    participants: ['other'],
    splits: [{ memberId: 'other', amount: 1000 }],
    date: `2026-05-${String(31 - index).padStart(2, '0')}`,
    status: 'approved',
  })).concat({
    id: 'mine-old',
    title: 'Khoản của Tuấn',
    amount: 100000,
    paidBy: 'payer',
    participants: ['me'],
    splits: [{ memberId: 'me', amount: 100000 }],
    date: '2026-05-20',
    status: 'approved',
  })
  const state = {
    currentUserId: 'me',
    currentProfileId: 'profile-tuan',
    currentUserName: 'Lê Tuấn',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'Chi tiêu Virgo 246' },
    selectedYearMonth: '2026-05',
    members,
    groups: [{ id: 'g1', name: 'Chi tiêu Virgo 246', members: ['me', 'other', 'payer'], expenses }],
    pickle: { currentGroup: { id: 'pickle', name: 'Virgo Pickleball 246' }, currentGroupId: 'pickle', sessions: [], externalTickets: [] },
    _allPickle: { sessions: [], sessionItems: [], externalTickets: [] },
  }

  const data = buildHomeData(state, 'me', members, state.groups, state.pickle, state, '2026-05')

  assert.ok(data.transactions.some(row => row.id === 'mine-old' && row.isMine === true))
})

test('home monthly source rows render view action for current month too', () => {
  assert.match(homeSource, /const canViewMonth = Boolean\(row\.month\)/)
  assert.doesNotMatch(homeSource, /monthItems\.map\(\(item, itemIndex\) =>/)
  assert.match(homeSource, /if \(nextOpen\) setOpenSourceKeys\(new Set\(sourceKeys\)\)/)
  assert.match(homeSource, /canViewMonth && \(/)
  assert.match(homeSource, /onViewMonth\?\.\(row\.month, source\)/)
  assert.match(homeSource, /screen: 'group-detail'/)
  assert.match(homeSource, /groupId: source\.sourceId/)
  assert.match(homeSource, /focusMemberId: source\.memberId \|\| source\.member_id \|\| ''/)
  assert.match(homeSource, /focusProfileId: source\.profileId \|\| source\.profile_id \|\| ''/)
  assert.match(homeSource, /focusMonth: ym/)
  assert.match(homeSource, /screen: 'pickleball-overview', params: \{ yearMonth: ym \}/)
  assert.match(appSource, /case 'pickleball-overview': return <PickleballOverview data=\{pickleballOverviewData\}/)
})

test('pickleball stack pushes keep pickleball as the active tab parent', () => {
  assert.match(appSource, /const isPickleballRoute = route\.screen && String\(route\.screen\)\.startsWith\('pickleball-'\)/)
  assert.match(appSource, /if \(isPickleballRoute\) setActiveTab\('pickleball'\)/)
})

test('home recent transactions fall back to selected-month expenses when source has no month breakdown', () => {
  assert.match(dataSource, /const hasUnpaidSource = source && Number\(source\.amount\) !== 0/)
  assert.match(dataSource, /expenseMonth === selectedYearMonth && expenseImpact\(expense, groupMemberId\) !== 0/)
})

test('home source month view opens the focused member detail in the group', () => {
  assert.match(appSource, /focusMemberId: route\.params\?\.focusMemberId \|\| ''/)
  assert.match(appSource, /focusProfileId: route\.params\?\.focusProfileId \|\| ''/)
  assert.match(appSource, /focusMonth: route\.params\?\.focusMonth \|\| ''/)
  assert.match(groupDetailSource, /const focusMemberId = d\.focusMemberId \|\| d\.focus_member_id \|\| ''/)
  assert.match(groupDetailSource, /const focusProfileId = d\.focusProfileId \|\| d\.focus_profile_id \|\| ''/)
  assert.match(groupDetailSource, /setActiveTab\('members'\)/)
  assert.match(groupDetailSource, /setSelectedMember\(member\)/)
  assert.match(dataSource, /profileId: member\.profileId \|\| member\.profile_id \|\| ''/)
})
