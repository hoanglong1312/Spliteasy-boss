import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/PickleballSettings.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')

function extractFunction(source, name) {
  const marker = new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`)
  const match = marker.exec(source)
  assert.ok(match, `${name} function is defined`)
  const start = match.index
  const bodyStart = source.indexOf('{', match.index)
  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) {
      return source.slice(start, index + 1).replace(/^export\s+/, '')
    }
  }
  throw new Error(`Could not extract ${name}`)
}

function loadGenerateMonthSessions() {
  const start = storeSource.search(/export function generateMonthSessions\s*\(/)
  assert.ok(start >= 0, 'generateMonthSessions function is defined')
  const end = storeSource.indexOf('\nfunction normalizeScheduleWeekdays', start)
  assert.ok(end > start, 'generateMonthSessions function body is bounded')
  const functionSource = storeSource.slice(start, end).replace(/^export\s+/, '')
  const source = `${functionSource}\nglobalThis.generateMonthSessions = generateMonthSessions`
  const context = {}
  vm.runInNewContext(source, context)
  return context.generateMonthSessions
}

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
    .replace(/import \{ useMemo \} from 'react'\n/, '')
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

test('generateMonthSessions creates scheduled sessions from the configured start date and ISO weekdays', () => {
  const generateMonthSessions = loadGenerateMonthSessions()

  const sessions = generateMonthSessions('2026-05', {
    scheduleWeekdays: [1, 3, 5],
    scheduleTime: '19:00-21:00',
    startDate: '05/05',
    defaultVenue: 'Sân ABC',
  })

  assert.deepEqual(JSON.parse(JSON.stringify(sessions.map(session => session.date))), [
    '2026-05-06',
    '2026-05-08',
    '2026-05-11',
    '2026-05-13',
    '2026-05-15',
    '2026-05-18',
    '2026-05-20',
    '2026-05-22',
    '2026-05-25',
    '2026-05-27',
    '2026-05-29',
  ])
  assert.deepEqual(JSON.parse(JSON.stringify(sessions[0])), {
    date: '2026-05-06',
    startTime: '19:00',
    endTime: '21:00',
    court: 'Sân ABC',
    status: 'scheduled',
    sessionNumber: 1,
  })
  assert.equal(sessions.at(-1).sessionNumber, 11)
})

test('store auto-generates sessions with Supabase upsert do nothing on duplicate dates', () => {
  assert.match(storeSource, /case 'AUTO_GENERATE_SESSIONS':\s*\{/)
  assert.match(storeSource, /\.from\('pickle_sessions'\)[\s\S]*?\.upsert\([\s\S]*?onConflict: 'group_id,session_date'[\s\S]*?ignoreDuplicates: true/)
  assert.match(storeSource, /await refresh\(\)/)
})

test('pickleball calendar maps current month session rows to day states and exposes auto-generate flag', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const baseState = {
    currentUserId: 'u1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [],
    pickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-04', status: 'completed', attendees: ['u1'] },
        { id: 's2', groupId: 'g1', date: '2026-05-06', status: 'completed', attendees: ['u2'] },
        { id: 's3', groupId: 'g1', date: '2026-05-08', status: 'cancelled', attendees: [] },
        { id: 's4', groupId: 'g1', date: '2026-05-18', status: 'scheduled', attendees: [] },
        { id: 's5', groupId: 'g1', date: '2026-05-22', status: 'scheduled', attendees: [] },
      ],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', scheduleWeekdays: [1, 3] }],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballCalendarData(baseState)
  const byDate = new Map(data.days.map(day => [day.date, day]))

  assert.equal(byDate.get('2026-05-04').state, 'attended')
  assert.equal(byDate.get('2026-05-06').state, 'missed')
  assert.equal(byDate.get('2026-05-08').state, 'moved')
  assert.equal(byDate.get('2026-05-18').state, 'upcoming')
  assert.equal(byDate.get('2026-05-22').state, 'upcoming')

  const emptyData = buildPickleballCalendarData({
    ...baseState,
    pickle: {
      sessions: [],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', scheduleWeekdays: [1] }],
    },
  })
  assert.equal(emptyData.shouldAutoGenerate, true)
})

test('overview data triggers AUTO_GENERATE_SESSIONS when the current configured month is empty', () => {
  assert.match(dataSource, /shouldAutoGenerate/)
  assert.match(dataSource, /type: 'AUTO_GENERATE_SESSIONS'/)
  assert.match(dataSource, /yearMonth: currentYearMonth/)
})

test('treasurer settings exposes regenerate sessions action and app deletes empty scheduled sessions before regenerating', () => {
  assert.match(settingsSource, /Tạo lại lịch tháng này/)
  assert.match(settingsSource, /window\.confirm\('Tạo lại sẽ xoá các buổi chưa có dữ liệu\. Tiếp tục\?'\)/)
  assert.match(settingsSource, /onAction\?\.\('regenerateSessions', \{ yearMonth: d\.currentYearMonth \}\)/)
  assert.match(appSource, /type === 'regenerateSessions'/)
  assert.match(appSource, /\.from\('pickle_attendees'\)/)
  assert.match(appSource, /\.from\('expenses'\)/)
  assert.match(appSource, /\.from\('pickle_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('status', 'scheduled'\)/)
  assert.match(appSource, /type: 'AUTO_GENERATE_SESSIONS'/)
})
