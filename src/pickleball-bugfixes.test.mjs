import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const calendarSource = readFileSync(new URL('./screens/PickleballCalendar.jsx', import.meta.url), 'utf8')
const ticketsSource = readFileSync(new URL('./screens/PickleballTickets.jsx', import.meta.url), 'utf8')
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
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildPickleballCalendarData, buildPickleballSettingsData }`, context)
  return context.__builders
}

test('store loads legacy pickleball_sessions and pickleball_attendance for calendar display', () => {
  assert.match(storeSource, /pbsR/)
  assert.match(storeSource, /pbaR/)
  assert.match(storeSource, /sb\.from\('pickleball_sessions'\)\.select\('\*'\)\.order\('date', \{ ascending: false \}\)/)
  assert.match(storeSource, /sb\.from\('pickleball_attendance'\)\.select\('\*'\)/)
  assert.match(storeSource, /pickleballSessions:\s*pbsR\.data \|\| \[\]/)
  assert.match(storeSource, /pickleballAttendance:\s*pbaR\.data \|\| \[\]/)
  assert.match(storeSource, /const normalLegacySessions = safeArray\(pickleballSessions\)\.map\(s => \{/)
  assert.match(storeSource, /\.\.\.normalLegacySessions,\s*\.\.\.normalSessions/)
})

test('calendar defaults old sessions with no attendance rows to all active members present', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        {
          id: 'old-1',
          sourceTable: 'pickleball_sessions',
          groupId: 'g1',
          date: '2026-05-19',
          status: 'completed',
          attendees: [],
          attendanceRecords: [],
        },
      ],
      fixedMembers: ['m1', 'm2'],
      monthlyConfigs: [],
    },
    _allPickle: { sessions: [], sessionItems: [] },
  }

  const data = buildPickleballCalendarData(state)
  const session = data.sessions.find(row => row.id === 'old-1')

  assert.equal(session.dateLabel, 'T3 19/05')
  assert.equal(session.attendance.present, 2)
  assert.deepEqual(JSON.parse(JSON.stringify(session.attendees.map(row => [row.id, row.kind]))), [
    ['m1', 'present'],
    ['m2', 'present'],
  ])
})

test('calendar marks only explicit absent members absent on legacy attendance rows', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        {
          id: 'old-2',
          sourceTable: 'pickleball_sessions',
          groupId: 'g1',
          date: '2026-05-20',
          status: 'completed',
          attendees: [],
          attendanceRecords: [{ sessionId: 'old-2', memberId: 'm2', status: 'absent' }],
        },
      ],
      fixedMembers: ['m1', 'm2'],
      monthlyConfigs: [],
    },
    _allPickle: { sessions: [], sessionItems: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.equal(data.selectedSession.attendance.present, 1)
  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.attendees.map(row => [row.id, row.kind]))), [
    ['m1', 'present'],
    ['m2', 'absent'],
  ])
})

test('settings maps ISO schedule weekdays from config to Vietnamese weekday labels', () => {
  const { buildPickleballSettingsData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [{ id: 'm1', groupId: 'g1', name: 'An', role: 'treasurer' }],
    pickle: { sessions: [], monthlyConfigs: [] },
    _allPickle: {
      configs: [{ groupId: 'g1', schedule_weekdays: [1, 3, 5] }],
      monthlyConfigs: [],
      sessions: [],
    },
  }

  const data = buildPickleballSettingsData(state)

  assert.deepEqual(JSON.parse(JSON.stringify(data.weekdays)), ['T2', 'T4', 'T6'])
})

test('calendar attendance chips call markAttendance and detail has one save path', () => {
  assert.match(calendarSource, /onAction\?\.\('markAttendance', \{\s*sessionId: session\.id,\s*memberId: a\.id,\s*status: a\.kind === 'present' \? 'absent' : 'present'/)
  assert.match(calendarSource, />\s*Lưu\s*<\/Button>/)
  assert.doesNotMatch(calendarSource, /onAction\?\.\('togglePresence'/)
  assert.doesNotMatch(calendarSource, /onAction\?\.\('reschedule'/)
  assert.doesNotMatch(calendarSource, /onAction\?\.\('complete'/)
  assert.doesNotMatch(calendarSource, />\s*Lưu chi phí\s*<\/Button>/)
})

test('ticket form validates visible errors and saves normalized addTicket fields', () => {
  assert.match(ticketsSource, /const \[error, setError\] = useState\(''\)/)
  assert.match(ticketsSource, /function ticketValidationError\(/)
  assert.match(ticketsSource, /setError\(validationError\)/)
  assert.match(ticketsSource, /session_date: dateToIso\(date\)/)
  assert.match(ticketsSource, /member_ids: memberIds/)
  assert.match(ticketsSource, /total_amount: totalAmountToSave/)
  assert.match(ticketsSource, /paymentMode/)
  assert.doesNotMatch(ticketsSource, /disabled=\{!canSave\}/)
})

test('app-v2 handles markAttendance and validates addTicket payloads before insert', () => {
  assert.match(appSource, /if \(type === 'markAttendance'\)/)
  assert.match(appSource, /type: 'MARK_PICKLEBALL_ATTENDANCE'/)
  assert.match(appSource, /const sessionDate = payload\?\.session_date \|\| payload\?\.date/)
  assert.match(appSource, /const memberIds = safeArray\(payload\?\.member_ids \|\| payload\?\.memberIds\)/)
  assert.match(appSource, /const isAdvancerMode = payload\?\.paymentMode === 'advancer'/)
  assert.match(appSource, /const isTeamFund = payload\?\.paymentMode === 'team_fund' \|\| payload\?\.teamFund === true \|\| payload\?\.status === 'team_fund' \|\| \(!isAdvancerMode && !advancerId\)/)
  assert.match(appSource, /if \(!sessionDate\) throw new Error\('ticket_session_date_required'\)/)
  assert.match(appSource, /if \(memberIds\.length === 0\) throw new Error\('ticket_members_required'\)/)
  assert.match(appSource, /if \(totalAmount <= 0\) throw new Error\('ticket_total_amount_required'\)/)
  assert.match(appSource, /session_date: sessionDate/)
  assert.match(appSource, /member_ids: memberIds/)
})
