import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/PickleballSettings.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')

function extractSaveSettingsBlock() {
  const start = appSource.indexOf("if (type === 'saveSettings'")
  const end = appSource.indexOf("\n    if (type === 'AUTO_GENERATE_SESSIONS')", start)
  assert.ok(start >= 0 && end > start, 'saveSettings handler block is available')
  return appSource.slice(start, end)
}

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
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildPickleballCalendarData, buildPickleballOverviewData }`, context)
  return context.__builders
}

function loadScreenDataGenerationBuilder() {
  return loadScreenDataBuilders().buildPickleballCalendarData
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

test('store auto-generates sessions with plain Supabase insert after scheduled rows were deleted', () => {
  assert.match(storeSource, /case 'AUTO_GENERATE_SESSIONS':\s*\{/)
  assert.match(storeSource, /const scheduleWeekdays = normalizeScheduleWeekdays/)
  assert.match(storeSource, /console\.warn\('\[store\] AUTO_GENERATE_SESSIONS: missing schedule weekdays'/)
  assert.match(storeSource, /const validSessions = sessions\.filter\(session => scheduleWeekdaySet\.has\(isoWeekdayFromDate\(session\.date\)\)\)/)
  const autoGenerateBlock = storeSource.match(/case 'AUTO_GENERATE_SESSIONS':\s*\{[\s\S]*?return validSessions\s*\n\s*\}/)?.[0] || ''
  assert.match(autoGenerateBlock, /\.from\('pickle_sessions'\)[\s\S]*?\.insert\(rows\)/)
  assert.doesNotMatch(autoGenerateBlock, /\.upsert\(/)
  assert.doesNotMatch(autoGenerateBlock, /\.from\('pickleball_sessions'\)[\s\S]*?\.insert\(rows\)/)
  assert.match(storeSource, /await refresh\(\)/)
})

test('store generation config reads schedule weekdays only from current monthly config', () => {
  const match = storeSource.match(/function generationConfigFromState[\s\S]*?\n}\n\nfunction isUuid/)
  assert.ok(match, 'generationConfigFromState source is available')
  const source = match[0]

  assert.match(source, /state\?\.pickle\?\.monthlyConfigs/)
  assert.doesNotMatch(source, /config\.scheduleWeekdays/)
  assert.doesNotMatch(source, /config\.schedule_weekdays/)
  assert.doesNotMatch(source, /group\.scheduleWeekdays/)
  assert.doesNotMatch(source, /group\.schedule_weekdays/)
  assert.doesNotMatch(source, /group\.scheduleDays/)
})

test('calendar auto-generation request uses loaded monthly config weekdays, not group fallback', () => {
  const buildPickleballCalendarData = loadScreenDataGenerationBuilder()
  const state = {
    currentUserId: 'u1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', scheduleWeekdays: [1, 3, 5] },
    members: [],
    pickle: {
      sessions: [],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', scheduleWeekdays: [2, 4] }],
    },
    _allPickle: {
      sessions: [],
      configs: [{ groupId: 'g1', scheduleWeekdays: [1, 3, 5] }],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', scheduleWeekdays: [2, 4] }],
    },
  }

  const data = buildPickleballCalendarData(state)

  assert.equal(data.shouldAutoGenerate, true)
  assert.deepEqual(JSON.parse(JSON.stringify(data.autoGenerateRequest)), {
    yearMonth: '2026-05',
    config: {
      scheduleWeekdays: [2, 4],
      scheduleTime: '19:00-21:00',
      startDate: '01/05/2026',
      defaultVenue: 'CLB',
    },
  })

  const withoutMonthlyWeekdays = buildPickleballCalendarData({
    ...state,
    pickle: { sessions: [], monthlyConfigs: [] },
    _allPickle: {
      sessions: [],
      configs: [{ groupId: 'g1', scheduleWeekdays: [1, 3, 5] }],
      monthlyConfigs: [],
    },
  })
  assert.equal(withoutMonthlyWeekdays.shouldAutoGenerate, false)
  assert.equal(withoutMonthlyWeekdays.autoGenerateRequest, null)
})

test('calendar and overview suppress auto-generation while manual regeneration is in progress', () => {
  const { buildPickleballCalendarData, buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'u1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [],
    pickle: {
      sessions: [],
      fixedMembers: ['u1'],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', scheduleWeekdays: [1, 3] }],
    },
    _allPickle: {
      sessions: [],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', scheduleWeekdays: [1, 3] }],
    },
    _pickleRegenInProgress: true,
  }

  const calendarData = buildPickleballCalendarData(state)
  const overviewData = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'u1', [])

  assert.equal(calendarData.shouldAutoGenerate, false)
  assert.equal(calendarData.autoGenerateRequest, null)
  assert.equal(calendarData.autoGenerateKey, '')
  assert.equal(overviewData.shouldAutoGenerate, false)
  assert.equal(overviewData.autoGenerateRequest, null)
  assert.equal(overviewData.autoGenerateKey, '')
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

test('settings save deletes scheduled sessions and regenerates when schedule weekdays change', () => {
  assert.doesNotMatch(settingsSource, /Tạo lại lịch tháng này/)
  assert.doesNotMatch(settingsSource, /onAction\?\.\('regenerateSessions'/)
  assert.match(settingsSource, /onAction\?\.\('save', \{/)
  assert.doesNotMatch(appSource, /type === 'regenerateSessions'/)
  assert.match(appSource, /const oldMonthlyConfig = findMonthlyPickleConfig\(state, groupId, yearMonth\)/)
  assert.match(appSource, /await dispatch\(action\)/)
  assert.match(appSource, /const shouldRegenerateSchedule = !sameScheduleWeekdays\(oldWeekdays, newWeekdays\) \|\| hasScheduledSessionsWithOldDays/)
  const saveBlock = extractSaveSettingsBlock()
  assert.match(saveBlock, /Promise\.all\(\[/)
  assert.match(saveBlock, /\.from\('pickle_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('group_id', groupId\)[\s\S]*?\.eq\('status', 'scheduled'\)[\s\S]*?\.gte\('session_date', `\$\{yearMonth\}-01`\)[\s\S]*?\.lte\('session_date', `\$\{yearMonth\}-31`\)/)
  assert.match(saveBlock, /\.from\('pickleball_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('group_id', groupId\)[\s\S]*?\.gte\('date', `\$\{yearMonth\}-01`\)[\s\S]*?\.lte\('date', `\$\{yearMonth\}-31`\)/)
  const legacyDeleteStart = saveBlock.indexOf(".from('pickleball_sessions')")
  const legacyDeleteEnd = saveBlock.indexOf('])', legacyDeleteStart)
  assert.ok(legacyDeleteStart >= 0 && legacyDeleteEnd > legacyDeleteStart, 'legacy session delete block is available')
  const legacyDeleteBlock = saveBlock.slice(legacyDeleteStart, legacyDeleteEnd)
  assert.doesNotMatch(legacyDeleteBlock, /\.eq\('status'/)
  assert.doesNotMatch(legacyDeleteBlock, /session_date/)
  assert.match(saveBlock, /if \(deleteResult1\.error\) throw deleteResult1\.error/)
  assert.match(saveBlock, /if \(deleteResult2\.error\) throw deleteResult2\.error/)
  assert.match(appSource, /type: 'AUTO_GENERATE_SESSIONS'/)
  assert.match(appSource, /config: generationConfig/)
})

test('settings save clears in-memory scheduled sessions before regenerating', () => {
  const saveBlock = extractSaveSettingsBlock()
  assert.match(saveBlock, /type: 'CLEAR_SCHEDULED_SESSIONS'/)
  assert.match(storeSource, /case 'CLEAR_SCHEDULED_SESSIONS':\s*\{/)
  assert.match(storeSource, /removeScheduledSessionsForMonthFromState\(stateRef\.current, groupId, yearMonth\)/)
  assert.ok(
    saveBlock.indexOf("type: 'CLEAR_SCHEDULED_SESSIONS'") < saveBlock.indexOf("type: 'AUTO_GENERATE_SESSIONS'"),
    'clear action runs before auto-generation',
  )
})

test('settings save suppresses app auto-generation while manually regenerating', () => {
  const saveBlock = extractSaveSettingsBlock()

  assert.match(saveBlock, /type: 'SET_PICKLE_REGEN'[\s\S]*value: true/)
  assert.match(saveBlock, /try\s*\{[\s\S]*type: 'CLEAR_SCHEDULED_SESSIONS'[\s\S]*type: 'AUTO_GENERATE_SESSIONS'[\s\S]*force: true[\s\S]*\}\s*finally\s*\{[\s\S]*type: 'SET_PICKLE_REGEN'[\s\S]*value: false/)

  const enableIndex = saveBlock.indexOf("type: 'SET_PICKLE_REGEN'")
  const clearIndex = saveBlock.indexOf("type: 'CLEAR_SCHEDULED_SESSIONS'")
  const generateIndex = saveBlock.indexOf("type: 'AUTO_GENERATE_SESSIONS'")
  const disableIndex = saveBlock.lastIndexOf("type: 'SET_PICKLE_REGEN'")

  assert.ok(enableIndex >= 0 && enableIndex < clearIndex, 'regen flag is enabled before local clear')
  assert.ok(clearIndex >= 0 && clearIndex < generateIndex, 'local clear runs before manual generation')
  assert.ok(generateIndex >= 0 && generateIndex < disableIndex, 'regen flag is disabled after manual generation')
})

test('store auto-generation skips existing scheduled sessions unless forced', () => {
  assert.match(storeSource, /_pickleRegenInProgress: false/)
  assert.match(storeSource, /case 'SET_PICKLE_REGEN':\s*\{/)

  const autoGenerateBlock = storeSource.match(/case 'AUTO_GENERATE_SESSIONS':\s*\{[\s\S]*?return validSessions\s*\n\s*\}/)?.[0] || ''
  assert.match(autoGenerateBlock, /if \(!action\.force\) \{[\s\S]*const \{ data: existingRows[\s\S]*\.from\('pickle_sessions'\)[\s\S]*\.select\('id'\)[\s\S]*\.eq\('group_id', groupId\)[\s\S]*\.eq\('status', 'scheduled'\)[\s\S]*\.like\('session_date', `\$\{yearMonth\}%`\)[\s\S]*\.limit\(1\)[\s\S]*if \(existingRows\?\.length > 0\) \{[\s\S]*await refresh\(\)[\s\S]*return \[\][\s\S]*\}/)
  assert.match(autoGenerateBlock, /if \(existingRows\?\.length > 0\)/)
})

test('scheduled session clear removes normalized primary and missing-status legacy rows', () => {
  const start = storeSource.indexOf('function safeArray')
  const end = storeSource.indexOf('\nfunction removeSessionGuestFromState', start)
  assert.ok(start >= 0 && end > start, 'scheduled clear helpers are available')
  const source = `${storeSource.slice(start, end).replace(/\bexport\s+/g, '')}\nglobalThis.removeScheduledSessionsForMonthFromState = removeScheduledSessionsForMonthFromState`
  const context = {}
  vm.runInNewContext(source, context)

  const next = context.removeScheduledSessionsForMonthFromState({
    _allPickle: {
      sessions: [
        { id: 'primary-scheduled', sourceTable: 'pickle_sessions', groupId: 'g1', sessionDate: '2026-05-06', status: 'scheduled' },
        { id: 'legacy-scheduled', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-08', status: 'scheduled' },
        { id: 'legacy-missing-status', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-09' },
        { id: 'legacy-null-status', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-11', status: null },
        { id: 'legacy-completed', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-10', status: 'completed' },
        { id: 'other-month', sourceTable: 'pickle_sessions', groupId: 'g1', sessionDate: '2026-06-01', status: 'scheduled' },
        { id: 'other-group', sourceTable: 'pickle_sessions', groupId: 'g2', sessionDate: '2026-05-01', status: 'scheduled' },
        { id: 'other-month-legacy-missing-status', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-06-02' },
      ],
    },
    pickle: {
      sessions: [
        { id: 'primary-scheduled', sourceTable: 'pickle_sessions', groupId: 'g1', sessionDate: '2026-05-06', status: 'scheduled' },
        { id: 'legacy-scheduled', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-08', status: 'scheduled' },
        { id: 'legacy-missing-status', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-09' },
        { id: 'legacy-null-status', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-11', status: null },
        { id: 'legacy-completed', sourceTable: 'pickleball_sessions', groupId: 'g1', date: '2026-05-10', status: 'completed' },
      ],
    },
  }, 'g1', '2026-05')

  assert.deepEqual(next._allPickle.sessions.map(session => session.id), [
    'legacy-completed',
    'other-month',
    'other-group',
    'other-month-legacy-missing-status',
  ])
  assert.deepEqual(next.pickle.sessions.map(session => session.id), [
    'legacy-completed',
  ])
})
