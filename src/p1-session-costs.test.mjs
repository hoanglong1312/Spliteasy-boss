import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const calendarSource = readFileSync(new URL('./screens/PickleballCalendar.jsx', import.meta.url), 'utf8')
const batchSource = readFileSync(new URL('./screens/BatchEntry.jsx', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/PickleballSettings.jsx', import.meta.url), 'utf8')
const overviewSource = readFileSync(new URL('./screens/PickleballOverview.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')

function loadScreenDataBuilders() {
  const fixedNow = new Date('2026-05-20T12:00:00')
  class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(fixedNow)
      else super(...args)
    }

    static now() {
      return fixedNow.getTime()
    }
  }

  const source = dataSource
    .replace(/import \{ useEffect, useMemo, useRef \} from 'react'\n/, '')
    .replace(/import \{ useApp \} from '\.\.\/store\.jsx'\n/, '')
    .replace(/import \{[\s\S]*?\} from '\.\.\/data\.jsx'\n/, '')
    .replace('export function useScreenData', 'function useScreenData')

  const context = {
    Date: FixedDate,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${value}`,
    groupBalance: () => ({}),
    groupNet: () => 0,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: () => [],
  }
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildPickleballCalendarData }`, context)
  return context.__builders
}

test('calendar selected session exposes water and extra costs from pickleball session items', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', role: 'treasurer', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Long', role: 'member', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', startTime: '19:00', status: 'completed', attendees: ['m1', 'm2'] },
      ],
      monthlyConfigs: [],
      fixedMembers: ['m1', 'm2'],
    },
    _allPickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', startTime: '19:00', status: 'completed', attendees: ['m1', 'm2'] },
      ],
      sessionItems: [
        { id: 'w1', sessionId: 's1', session_id: 's1', name: 'Nước', amount: 45000, memberIds: null, member_ids: null },
        { id: 'x1', sessionId: 's1', session_id: 's1', name: 'Bóng thi đấu', amount: 90000, memberIds: ['m1'], member_ids: ['m1'] },
      ],
      monthlyConfigs: [],
    },
  }

  const data = buildPickleballCalendarData(state)

  assert.equal(data.selectedSession.id, 's1')
  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.costs)), {
    waterAmount: 45000,
    extras: [
      { id: 'x1', note: 'Bóng thi đấu', amount: 90000, memberIds: ['m1'] },
    ],
  })
  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.members.map(member => member.id))), ['m1', 'm2'])
})

test('calendar session-cost member chips prefer real names over numeric short aliases', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'Anh Hoàng', short: '92', initials: 'H9', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Tuấn', short: 'Tuấn', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', status: 'completed', attendees: ['m1', 'm2'] },
      ],
      monthlyConfigs: [],
      fixedMembers: ['m1', 'm2'],
    },
    _allPickle: { sessions: [], sessionItems: [], monthlyConfigs: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.members.map(member => member.name))), ['Anh Hoàng', 'Tuấn'])
})

test('calendar selected session exposes extra costs from linked pickleball expenses', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'Anh Hoàng', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Tuấn', memberType: 'fixed' },
      { id: 'm3', groupId: 'g1', name: 'Long', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        {
          id: 's1',
          sourceTable: 'pickle_sessions',
          groupId: 'g1',
          date: '2026-05-20',
          status: 'completed',
          attendees: ['m1', 'm2', 'm3'],
          expenses: [
            { id: 'e1', pickleSessionId: 's1', title: 'Test', category: 'pickleball_extra', amount: 10000, participants: ['m1', 'm2'] },
          ],
        },
      ],
      monthlyConfigs: [],
      fixedMembers: ['m1', 'm2', 'm3'],
    },
    _allPickle: { sessions: [], sessionItems: [], monthlyConfigs: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.costs.extras)), [
    { id: 'e1', note: 'Test', amount: 10000, memberIds: ['m1', 'm2'] },
  ])
  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.costRows.at(-1))), {
    label: '⚡ Test',
    amount: 5000,
  })
})

test('calendar court cost uses monthly config for the selected session month', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Long', memberType: 'fixed' },
      { id: 'm3', groupId: 'g1', name: 'Chi', memberType: 'fixed' },
    ],
    pickle: {
      monthlyCourtFee: 2000000,
      fixedMembers: ['m1', 'm2'],
      monthlyConfigs: [
        {
          groupId: 'g1',
          year_month: '2026-05',
          court_fee: 390000,
          active_member_ids: ['m1', 'm2', 'm3'],
        },
      ],
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-06', status: 'completed', attendees: ['m1', 'm2', 'm3'] },
        { id: 's2', groupId: 'g1', date: '2026-05-13', status: 'completed', attendees: ['m1', 'm2', 'm3'] },
        { id: 's3', groupId: 'g1', date: '2026-05-20', status: 'completed', attendees: ['m1', 'm2', 'm3'] },
      ],
    },
    _allPickle: { sessions: [], sessionItems: [], monthlyConfigs: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.equal(data.selectedSession.id, 's3')
  assert.equal(data.selectedSession.costRows[0].amount, 43333)
  assert.equal(data.selectedSession.totalPerPerson, 43333)
})

test('calendar detail panel contains the P1 session-cost editor contract', () => {
  assert.match(calendarSource, /Chi phí buổi này/)
  assert.match(calendarSource, /Phụ phát sinh/)
  assert.match(calendarSource, /\+ Thêm phát sinh/)
  assert.match(calendarSource, /onAction\?\.\('saveSessionCost'/)
  assert.match(calendarSource, /memberIds/)
})

test('calendar session-cost status toggle awaits save action and shows save feedback', () => {
  assert.match(calendarSource, /const \[savingSessionToggle, setSavingSessionToggle\] = useState\(false\)/)
  assert.match(calendarSource, /await onAction\?\.\('saveSessionCost'/)
  assert.match(calendarSource, /await onAction\?\.\('completeSession'/)
  assert.match(calendarSource, /setCostSaveState\('saved'\)/)
  assert.match(calendarSource, /setCostSaveState\('error'\)/)
  assert.match(calendarSource, /disabled=\{savingSessionToggle\}/)
  assert.doesNotMatch(calendarSource, />\s*Lưu\s*<\/Button>/)
})

test('calendar session-cost editor keeps water input collapsed until opened', () => {
  assert.match(calendarSource, /const \[waterOpen, setWaterOpen\] = useState\(false\)/)
  assert.match(calendarSource, /setWaterOpen\(false\)/)
  assert.match(calendarSource, /onClick=\{\(\) => setWaterOpen\(open => !open\)\}/)
  assert.match(calendarSource, /\{waterOpen \? '▼' : '▶'\}/)
  assert.match(calendarSource, /\{waterOpen && \(/)
})

test('calendar guest form disables duplicate submissions while addGuest is pending', () => {
  assert.match(calendarSource, /const \[submittingGuest, setSubmittingGuest\] = useState\(false\)/)
  assert.match(calendarSource, /if \(!name \|\| submittingGuest\) return/)
  assert.match(calendarSource, /setSubmittingGuest\(true\)/)
  assert.match(calendarSource, /finally \{\s*setSubmittingGuest\(false\);\s*\}/)
  assert.match(calendarSource, /<Button type="submit"[^>]*disabled=\{submittingGuest\}/)
})

test('batch entry sends batch water saves and can cancel back', () => {
  assert.match(batchSource, /onAction\?\.\('saveBatchCosts'/)
  assert.match(batchSource, /parseMonthlyWaterInput\(bulkInput, sessions\)/)
  assert.match(batchSource, /sessions:\s*parsedRows\.map/)
  assert.match(batchSource, /textarea/)
  assert.match(batchSource, /Dán tiền nước/)
  assert.match(batchSource, /onAction\?\.\('back'\)/)
  assert.match(batchSource, /Tổng nước tháng/)
  assert.match(batchSource, /position:\s*'sticky'[\s\S]*bottom:\s*0[\s\S]*background:\s*colors\.pageBg[\s\S]*zIndex:\s*10/)
  assert.doesNotMatch(batchSource, /openExtraSheet/)
  assert.doesNotMatch(batchSource, /ExtraBottomSheet/)
})

test('batch entry supports amount-per-line and date-prefixed monthly water formats', () => {
  assert.match(batchSource, /function parseMonthlyWaterInput\(input, sessions\)/)
  assert.match(batchSource, /const dateMatch = line\.match/)
  assert.match(batchSource, /const hasAmountDigits = \/\\d\/\.test\(amountText\)/)
  assert.match(batchSource, /findSessionByInputDate\(sessions, dateMatch/)
  assert.match(batchSource, /: sessions\[sequentialIndex\]/)
  assert.match(batchSource, /formatAmountInput\(amount\)/)
})

test('app handlers persist session water and extras through pickleball_session_items', () => {
  assert.match(appSource, /type === 'saveSessionCost'/)
  assert.match(appSource, /\.from\('pickleball_session_items'\)[\s\S]*?\.upsert\(/)
  assert.match(appSource, /name: 'Nước'/)
  assert.match(appSource, /\.delete\(\)[\s\S]*?\.eq\('session_id', sessionId\)[\s\S]*?\.neq\('name', 'Nước'\)/)
  assert.match(appSource, /\.insert\([\s\S]*?member_ids/)
  assert.match(appSource, /type === 'saveBatchCosts'/)
})

test('saveSessionCost saves water for primary pickle_sessions through linked expenses', () => {
  const handlerSource = appSource.match(/if \(type === 'saveSessionCost'\) \{[\s\S]*?\n    if \(type === 'saveBatchCosts'\)/)?.[0] || ''

  assert.match(handlerSource, /findSessionInPickleState\(state, sessionId\)/)
  assert.match(handlerSource, /sourceTable === 'pickle_sessions'/)
  assert.match(handlerSource, /\.from\('expenses'\)[\s\S]*?\.select\('id'\)[\s\S]*?\.eq\('pickle_session_id', sessionId\)[\s\S]*?\.eq\('category', 'water'\)/)
  assert.match(handlerSource, /\.from\('expenses'\)[\s\S]*?\.update\(\{[\s\S]*?amount: waterAmount/)
  assert.match(handlerSource, /\.from\('expenses'\)[\s\S]*?\.insert\(\{[\s\S]*?pickle_session_id: sessionId[\s\S]*?category: 'water'/)
})

test('saveBatchCosts routes primary pickle_sessions water through expenses', () => {
  const handlerSource = appSource.match(/if \(type === 'saveBatchCosts'\) \{[\s\S]*?\n    if \(type === 'togglePresence'\)/)?.[0] || ''

  assert.match(handlerSource, /findSessionInPickleState\(state, row\.sessionId\)/)
  assert.match(handlerSource, /sourceTable === 'pickle_sessions'/)
  assert.match(handlerSource, /savePickleSessionWaterExpense\(sb, state, session, row\.sessionId, row\.waterAmount\)/)
  assert.match(appSource, /async function savePickleSessionWaterExpense\(/)
  assert.match(appSource, /\.from\('expenses'\)[\s\S]*?\.eq\('pickle_session_id', sessionId\)[\s\S]*?\.eq\('category', 'water'\)/)
  assert.match(appSource, /if \(waterAmount <= 0\) \{[\s\S]*?\.from\('expenses'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('id', existingWater\.id\)/)
})

test('saveSessionCost saves extras for primary pickle_sessions through expenses and participants', () => {
  const handlerSource = appSource.match(/if \(type === 'saveSessionCost'\) \{[\s\S]*?\n    if \(type === 'saveBatchCosts'\)/)?.[0] || ''

  assert.match(handlerSource, /\.from\('expenses'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('pickle_session_id', sessionId\)[\s\S]*?\.eq\('category', 'pickleball_extra'\)/)
  assert.match(handlerSource, /const extras = \(payload\?\.extras \|\| \[\]\)[\s\S]*?category: 'pickleball_extra'/)
  assert.match(handlerSource, /\.from\('expenses'\)[\s\S]*?\.insert\(\{[\s\S]*?pickle_session_id: sessionId[\s\S]*?title: extra\.title[\s\S]*?category: 'pickleball_extra'/)
  assert.match(handlerSource, /\.from\('expense_participants'\)[\s\S]*?\.insert\(/)
})

test('saveSessionCost writes empty member arrays for all session item upserts', () => {
  const handlerSource = appSource.match(/if \(type === 'saveSessionCost'\) \{[\s\S]*?\n    if \(type === 'saveBatchCosts'\)/)?.[0] || ''

  assert.match(handlerSource, /member_ids: \[\],[\s\S]*created_by: state\.currentUserId \|\| null/)
  assert.match(handlerSource, /member_ids: Array\.isArray\(extra\?\.memberIds\) \? extra\.memberIds : \[\]/)
  assert.doesNotMatch(handlerSource, /member_ids: null/)
  assert.doesNotMatch(handlerSource, /memberIds\) \? extra\.memberIds : null/)
})

test('store loads pickleball_session_items into normalized pickle state', () => {
  assert.match(storeSource, /sb\.from\('pickleball_session_items'\)\.select\('\*'\)/)
  assert.match(storeSource, /pickleballSessionItems/)
  assert.match(storeSource, /sessionItems/)
})

test('quick monthly water entry moved from settings to overview', () => {
  assert.doesNotMatch(settingsSource, /📋 Nhập nhanh chi phí tháng này/)
  assert.doesNotMatch(settingsSource, /onAction\?\.\('batchEntry'\)/)
  assert.match(overviewSource, /📋 Nhập nhanh tiền nước/)
  assert.match(overviewSource, /onAction\?\.\('batchEntry'\)/)
})
