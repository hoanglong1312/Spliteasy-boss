import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./screens/Home.jsx', import.meta.url), 'utf8')

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

test('home monthly source rows render view action for current month too', () => {
  assert.match(homeSource, /const canViewMonth = Boolean\(row\.month\)/)
  assert.match(homeSource, /canViewMonth && \(/)
  assert.match(homeSource, /onViewMonth\?\.\(row\.month, source\)/)
  assert.match(homeSource, /onAction\?\.\('open', source\.sourceId\)/)
  assert.match(homeSource, /screen: 'pickleball-calendar', params: \{ yearMonth: ym \}/)
})
