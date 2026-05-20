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
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildHomeData, buildPickleballCalendarData, buildPickleballSettingsData }`, context)
  return context.__builders
}

test('home data exposes active monthly member balances including session items and casual members', () => {
  const { buildHomeData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentUserName: 'An',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'fixed' },
      { id: 'm3', groupId: 'g1', name: 'Chi', memberType: 'casual' },
      { id: 'm4', groupId: 'g1', name: 'Dung', memberType: 'casual', isActive: false },
    ],
    pickle: {
      fixedMembers: ['m1', 'm2'],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', courtFee: 300000 }],
      sessions: [
        {
          id: 's1',
          groupId: 'g1',
          date: '2026-05-12',
          status: 'completed',
          attendees: ['m1', 'm2', 'm3'],
          sessionItems: [
            { id: 'w1', sessionId: 's1', name: 'Nước', amount: 90000 },
            { id: 'e1', sessionId: 's1', name: 'Bóng', amount: 60000, memberIds: ['m1', 'm3'] },
          ],
        },
      ],
      externalTickets: [
        { id: 't1', groupId: 'g1', yearMonth: '2026-05', status: 'team_fund', totalAmount: 30000, memberIds: ['m2', 'm3'] },
      ],
    },
    _allPickle: { sessions: [], sessionItems: [], externalTickets: [] },
  }

  const data = buildHomeData(state, 'm1', state.members, [], state.pickle)

  assert.deepEqual(JSON.parse(JSON.stringify(data.memberBalances.map(row => [row.memberId, row.type, row.owed]))), [
    ['m3', 'casual', 225000],
    ['m1', 'fixed', 135000],
    ['m2', 'fixed', 120000],
  ])
})

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

test('calendar attendance list includes absent casual members alongside fixed members', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'fixed' },
      { id: 'm3', groupId: 'g1', name: 'Chi', memberType: 'casual' },
    ],
    pickle: {
      sessions: [
        {
          id: 'old-3',
          sourceTable: 'pickleball_sessions',
          groupId: 'g1',
          date: '2026-05-20',
          status: 'completed',
          attendees: [],
          attendanceRecords: [
            { sessionId: 'old-3', memberId: 'm2', status: 'absent' },
            { sessionId: 'old-3', memberId: 'm3', status: 'absent' },
          ],
        },
      ],
      fixedMembers: ['m1', 'm2'],
      monthlyConfigs: [],
    },
    _allPickle: { sessions: [], sessionItems: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.attendees.map(row => [row.id, row.kind, row.memberType]))), [
    ['m1', 'present', 'fixed'],
    ['m2', 'absent', 'fixed'],
    ['m3', 'absent', 'casual'],
  ])
  assert.equal(data.selectedSession.attendance.total, 3)
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

test('calendar attendance chips use compact 34px avatar-style green and grey states', () => {
  assert.match(calendarSource, /const ATTENDANCE_CHIP_SIZE = 34/)
  assert.match(calendarSource, /Điểm danh · \{session\.attendance\.present\}\/\{session\.attendance\.total\} tham gia/)
  assert.match(calendarSource, /background: a\.kind === 'present' \? colors\.pickleball : 'rgba\(255,255,255,0\.06\)'/)
  assert.match(calendarSource, /width: ATTENDANCE_CHIP_SIZE/)
  assert.match(calendarSource, /height: ATTENDANCE_CHIP_SIZE/)
  assert.doesNotMatch(calendarSource, /memberType: a\.memberType/)
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
