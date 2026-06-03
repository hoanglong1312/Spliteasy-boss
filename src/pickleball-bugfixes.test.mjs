import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const calendarSource = readFileSync(new URL('./screens/PickleballCalendar.jsx', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/PickleballSettings.jsx', import.meta.url), 'utf8')
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
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildHomeData, buildPickleballCalendarData, buildPickleballMembersData, buildPickleballSettingsData }`, context)
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

test('calendar attendance count follows fixed members and ignores casual attendance', () => {
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
            { sessionId: 'old-3', memberId: 'm3', status: 'present' },
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
    ['m2', 'present', 'fixed'],
  ])
  assert.equal(data.selectedSession.attendance.present, 2)
  assert.equal(data.selectedSession.attendance.total, 2)
})

test('calendar current-user status follows shared profile identity across member rows', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'profile-cuong',
    currentUserName: 'Cường',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm-cuong', profileId: 'profile-cuong', groupId: 'g1', name: 'Cường', memberType: 'fixed' },
      { id: 'm-long', profileId: 'profile-long', groupId: 'g1', name: 'Long', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        {
          id: 's-profile',
          sourceTable: 'pickle_sessions',
          groupId: 'g1',
          date: '2026-05-20',
          status: 'completed',
          attendanceRecords: [
            { sessionId: 's-profile', memberId: 'm-cuong', status: 'present' },
            { sessionId: 's-profile', memberId: 'm-long', status: 'absent' },
          ],
        },
      ],
      fixedMembers: ['m-cuong', 'm-long'],
      monthlyConfigs: [],
    },
    _allPickle: { sessions: [], sessionItems: [] },
  }

  const data = buildPickleballCalendarData(state)
  const day = data.days.find(row => row.date === '2026-05-20')

  assert.equal(day.state, 'attended')
  assert.equal(data.selectedSession.currentUserPresent, true)
  assert.equal(data.selectedSession.personalCostNote, 'Bạn có mặt trong buổi này')
})

test('calendar current-user status falls back to matching current name when profile id is missing', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'expense-cuong',
    currentUserName: 'Cường',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm-cuong', groupId: 'g1', name: 'Cường', memberType: 'fixed' },
      { id: 'm-long', groupId: 'g1', name: 'Long', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        {
          id: 's-name',
          sourceTable: 'pickle_sessions',
          groupId: 'g1',
          date: '2026-05-20',
          status: 'completed',
          attendanceRecords: [
            { sessionId: 's-name', memberId: 'm-cuong', status: 'present' },
            { sessionId: 's-name', memberId: 'm-long', status: 'absent' },
          ],
        },
      ],
      fixedMembers: ['m-cuong', 'm-long'],
      monthlyConfigs: [],
    },
    _allPickle: { sessions: [], sessionItems: [] },
  }

  const data = buildPickleballCalendarData(state)
  const day = data.days.find(row => row.date === '2026-05-20')

  assert.equal(day.state, 'attended')
  assert.equal(data.selectedSession.currentUserPresent, true)
  assert.equal(data.selectedSession.personalCostNote, 'Bạn có mặt trong buổi này')
})

test('calendar marks ticket-only days lighter when current member is not in the ticket', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'cuong-expense',
    currentUserName: 'Cường',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'cuong-expense', groupId: 'expense-1', name: 'Cường', profileId: 'profile-cuong', memberType: 'fixed' },
      { id: 'cuong-pickle', groupId: 'g1', name: 'Cường', profileId: 'profile-cuong', memberType: 'fixed' },
      { id: 'long-pickle', groupId: 'g1', name: 'Long', profileId: 'profile-long', memberType: 'fixed' },
      { id: 'minh-pickle', groupId: 'g1', name: 'Minh Em', profileId: 'profile-minh', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [],
      externalTickets: [
        { id: 'mine', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-16', status: 'unpaid', totalAmount: 100000, memberIds: ['cuong-pickle', 'minh-pickle'], advancerId: 'minh-pickle' },
        { id: 'other', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-17', status: 'team_fund', totalAmount: 100000, memberIds: ['long-pickle', 'minh-pickle'] },
      ],
      monthlyConfigs: [],
    },
    _allPickle: { sessions: [], sessionItems: [], externalTickets: [] },
  }

  const data = buildPickleballCalendarData(state, { yearMonth: '2026-05' })
  const mineDay = data.days.find(day => day.date === '2026-05-16')
  const otherDay = data.days.find(day => day.date === '2026-05-17')

  assert.equal(mineDay.state, 'ticket')
  assert.equal(mineDay.hasCurrentUserTicket, true)
  assert.equal(otherDay.state, 'ticketOther')
  assert.equal(otherDay.hasCurrentUserTicket, false)
})

test('calendar data exposes active casual members for guest quick-select', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'casual' },
      { id: 'm3', groupId: 'g1', name: 'Chi', memberType: 'casual', isActive: false },
      { id: 'm4', groupId: 'g2', name: 'Dung', memberType: 'casual' },
    ],
    pickle: { sessions: [], monthlyConfigs: [] },
    _allPickle: { sessions: [], sessionItems: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.deepEqual(JSON.parse(JSON.stringify(data.casualMembers)), [
    { id: 'm2', name: 'Binh' },
  ])
})

test('calendar guest form can select existing casual members', () => {
  assert.match(calendarSource, /casualMembers=\{d\.casualMembers \|\| \[\]\}/)
  assert.match(calendarSource, /function SessionDetailPanel\(\{ session, casualMembers = \[\], isTreasurer, onAction \}\)/)
  assert.match(calendarSource, /casualMembers\.map\(member => \(/)
  assert.match(calendarSource, /setGuestName\(member\.name\)/)
  assert.match(calendarSource, /Tên khách mới hoặc vãng lai/)
})

test('addGuest syncs new guest names into casual members', () => {
  assert.match(appSource, /const existingMember = await findCasualMemberByName\(sb, groupId, guestName\)/)
  assert.match(appSource, /\.from\('members'\)[\s\S]*?\.select\('id'\)[\s\S]*?\.eq\('group_id', groupId\)[\s\S]*?\.eq\('member_type', 'casual'\)[\s\S]*?\.ilike\('name', name\)[\s\S]*?\.maybeSingle\(\)/)
  assert.match(appSource, /\.from\('members'\)[\s\S]*?\.insert\(\{[\s\S]*?group_id: groupId[\s\S]*?name: guestName[\s\S]*?member_type: 'casual'[\s\S]*?is_active: true/)
  assert.match(appSource, /await dispatch\(\{ type: 'REFRESH' \}\)/)
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

test('settings calculates session count from configured weekdays in the current month', () => {
  const { buildPickleballSettingsData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [{ id: 'm1', groupId: 'g1', name: 'An', role: 'treasurer' }],
    pickle: { sessions: [], monthlyConfigs: [] },
    _allPickle: {
      configs: [{ groupId: 'g1', schedule_weekdays: [1, 3, 5], sessionsCount: 99 }],
      monthlyConfigs: [],
      sessions: [],
    },
  }

  const data = buildPickleballSettingsData(state)

  assert.equal(data.sessionsCount, 13)
})

test('settings reads monthly schedule time before group default time', () => {
  const { buildPickleballSettingsData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', scheduleTime: '19:00 – 21:00' },
    members: [{ id: 'm1', groupId: 'g1', name: 'An', role: 'treasurer' }],
    pickle: {
      sessions: [],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', schedule_time: '19:00 – 22:00' }],
    },
    _allPickle: {
      configs: [{ groupId: 'g1', schedule_time: '19:00 – 21:00' }],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', schedule_time: '19:00 – 22:00' }],
      sessions: [],
    },
  }

  const data = buildPickleballSettingsData(state)

  assert.equal(data.timeRange, '19:00 – 22:00')
})

test('settings member count follows active fixed members from members tab and does not expose venue', () => {
  const { buildPickleballMembersData, buildPickleballSettingsData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', defaultVenue: 'Sân cũ' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', role: 'treasurer' },
      { id: 'm2', groupId: 'g1', name: 'Binh' },
      { id: 'm3', groupId: 'g1', name: 'Chi' },
      { id: 'm4', groupId: 'g1', name: 'Dung', memberType: 'casual' },
      { id: 'm5', groupId: 'g1', name: 'Em', isActive: false },
    ],
    pickle: {
      fixedMembers: ['m1', 'm2', 'm3', 'm5'],
      sessions: [],
      monthlyConfigs: [
        {
          groupId: 'g1',
          yearMonth: '2026-05',
          active_member_ids: ['m1'],
        },
      ],
    },
    _allPickle: {
      configs: [{ groupId: 'g1', defaultVenue: 'Sân fallback' }],
      monthlyConfigs: [
        {
          groupId: 'g1',
          yearMonth: '2026-05',
          active_member_ids: ['m1'],
        },
      ],
      sessions: [],
    },
  }

  const membersData = buildPickleballMembersData(state)
  const data = buildPickleballSettingsData(state)

  assert.equal(membersData.stats.fixed, 3)
  assert.equal(data.memberCount, membersData.stats.fixed)
  assert.equal(Object.hasOwn(data, 'defaultVenue'), false)
})

test('members progress follows calendar attendance records', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'Long', memberType: 'fixed', isActive: true },
      { id: 'm2', groupId: 'g1', name: 'Tuấn', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      sessions: [
        {
          id: 's1',
          groupId: 'g1',
          date: '2026-05-07',
          status: 'completed',
          attendanceRecords: [{ memberId: 'm2', status: 'absent' }],
        },
        {
          id: 's2',
          groupId: 'g1',
          date: '2026-05-09',
          status: 'completed',
          attendanceRecords: [{ memberId: 'm1', status: 'present' }, { memberId: 'm2', status: 'present' }],
        },
      ],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state)
  const rows = Object.fromEntries(data.members.map(member => [member.id, member]))

  assert.equal(rows.m1.sessionsAttended, 2)
  assert.equal(rows.m1.progressPct, 100)
  assert.equal(rows.m2.sessionsAttended, 1)
  assert.equal(rows.m2.progressPct, 50)
})

test('pickleball members progress counts only done sessions as denominator', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', type: 'pickleball' },
    groups: [{ id: 'g1', name: 'CLB', type: 'pickleball' }],
    members: [{ id: 'm1', group_id: 'g1', name: 'An', member_type: 'fixed', is_active: true }],
    pickle: {
      monthlyConfigs: [{ group_id: 'g1', year_month: '2026-06', schedule_weekdays: [1, 3], schedule_start_day: '01/06/2026' }],
      sessions: [
        { id: 's1', group_id: 'g1', session_date: '2026-06-01', status: 'done', attendance: ['m1'] },
        { id: 's2', group_id: 'g1', session_date: '2026-06-03', status: 'scheduled', attendance: [] },
      ],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state, '2026-06')
  const member = data.members.find(row => row.id === 'm1')

  assert.equal(member.sessionsAttended, 1)
  assert.equal(member.sessionsTotal, 1)
  assert.equal(member.progressPct, 100)
})

test('pickleball members progress only counts confirmed sessions as denominator', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', type: 'pickleball' },
    groups: [{ id: 'g1', name: 'CLB', type: 'pickleball' }],
    members: [{ id: 'm1', group_id: 'g1', name: 'An', member_type: 'fixed', is_active: true }],
    pickle: {
      monthlyConfigs: [{ group_id: 'g1', year_month: '2026-06', sessions_count: 9 }],
      sessions: [
        { id: 's1', group_id: 'g1', session_date: '2026-06-01', status: 'done', attendance: ['m1'] },
        { id: 's2', group_id: 'g1', session_date: '2026-06-08', status: 'scheduled', attendance: [] },
      ],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state, '2026-06')
  const member = data.members.find(row => row.id === 'm1')

  assert.equal(member.sessionsAttended, 1)
  assert.equal(member.sessionsTotal, 1)
  assert.equal(member.progressPct, 100)
})

test('pickleball members progress is zero when selected month has no expected sessions', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', type: 'pickleball' },
    groups: [{ id: 'g1', name: 'CLB', type: 'pickleball' }],
    members: [{ id: 'm1', group_id: 'g1', name: 'An', member_type: 'fixed', is_active: true }],
    pickle: {
      monthlyConfigs: [{ group_id: 'g1', year_month: '2026-06' }],
      sessions: [],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state, '2026-06')
  const member = data.members.find(row => row.id === 'm1')

  assert.equal(member.sessionsAttended, 0)
  assert.equal(member.sessionsTotal, 0)
  assert.equal(member.progressPct, 0)
})

test('pickleball members progress ignores scheduled empty sessions and caps moved overages', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB', type: 'pickleball' },
    groups: [{ id: 'g1', name: 'CLB', type: 'pickleball' }],
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', memberType: 'fixed', isActive: true },
      { id: 'm2', groupId: 'g1', name: 'Binh', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-06', scheduleWeekdays: [1], scheduleStartDay: '01/06/2026' }],
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-06-01', status: 'completed', attendanceRecords: [{ memberId: 'm1', status: 'present' }] },
        { id: 's2', groupId: 'g1', date: '2026-06-08', status: 'scheduled', attendanceRecords: [] },
        { id: 's3', groupId: 'g1', date: '2026-06-15', status: 'moved', attendanceRecords: [{ memberId: 'm1', status: 'present' }, { memberId: 'm2', status: 'present' }] },
        { id: 's4', groupId: 'g1', date: '2026-06-22', status: 'completed', attendanceRecords: [{ memberId: 'm1', status: 'present' }] },
        { id: 's5', groupId: 'g1', date: '2026-06-29', status: 'completed', attendanceRecords: [{ memberId: 'm1', status: 'present' }] },
        { id: 's6', groupId: 'g1', date: '2026-06-30', status: 'completed', attendanceRecords: [{ memberId: 'm1', status: 'present' }] },
        { id: 's7', groupId: 'g1', date: '2026-06-30', status: 'completed', attendanceRecords: [{ memberId: 'm1', status: 'present' }] },
      ],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state, '2026-06')
  const rows = Object.fromEntries(data.members.map(member => [member.id, member]))

  assert.equal(rows.m1.sessionsAttended, 5)
  assert.equal(rows.m1.sessionsTotal, 5)
  assert.equal(rows.m1.progressPct, 100)
  assert.equal(rows.m2.sessionsAttended, 0)
  assert.equal(rows.m2.progressPct, 0)
})

test('pickleball members data exposes existing profile candidates outside the club', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'club',
    currentGroup: { id: 'club', name: 'CLB', type: 'pickleball' },
    profiles: [
      { id: 'p1', name: 'Long' },
      { id: 'p2', name: 'Tiến' },
      { id: 'p3', name: 'Lê Chi' },
    ],
    members: [
      { id: 'm1', groupId: 'club', profileId: 'p1', name: 'Long', memberType: 'fixed', isActive: true },
      { id: 'm2', groupId: 'travel', profileId: 'p2', name: 'Tiến', memberType: 'fixed', isActive: true },
      { id: 'm3', groupId: 'old', profileId: 'p3', name: 'Lê Chi', memberType: 'fixed', isActive: false },
    ],
    pickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state)

  assert.deepEqual(data.memberCandidates.map(member => member.name), ['Tiến'])
})

test('pickleball members data ignores stale member ids from other groups', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'club',
    currentGroup: { id: 'club', name: 'CLB', members: ['expense-minh-anh'] },
    members: [
      { id: 'expense-minh-anh', groupId: 'food', profileId: 'p1', name: 'Minh Anh', memberType: 'fixed', isActive: true },
      { id: 'pickle-minh-anh', groupId: 'club', profileId: 'p1', name: 'Minh Anh', memberType: 'fixed', isActive: true },
    ],
    pickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state)

  assert.deepEqual(data.members.map(member => member.id), ['pickle-minh-anh'])
  assert.deepEqual(data.allMembers.map(member => member.id), ['pickle-minh-anh'])
})

test('pickleball member candidates include inactive rows instead of active casual rows', () => {
  const { buildPickleballMembersData } = loadScreenDataBuilders()
  const state = {
    currentGroupId: 'club',
    currentGroup: { id: 'club', name: 'CLB', type: 'pickleball' },
    members: [
      { id: 'fixed-active', groupId: 'club', profileId: 'p1', name: 'Cố Định', memberType: 'fixed', isActive: true },
      { id: 'casual-active', groupId: 'club', profileId: 'p2', name: 'Vãng Lai', memberType: 'casual', isActive: true },
      { id: 'fixed-inactive', groupId: 'club', profileId: 'p3', name: 'Đã Xóa', memberType: 'fixed', isActive: false },
      { id: 'casual-inactive', groupId: 'club', profileId: 'p4', name: 'Đã Ẩn', memberType: 'casual', isActive: false },
    ],
    pickle: { sessions: [] },
  }

  const data = buildPickleballMembersData(state)

  assert.deepEqual(data.memberCandidates.map(member => member.id), ['fixed-inactive', 'casual-inactive'])
  assert.deepEqual(data.memberCandidates.map(member => member.isInactive), [true, true])
})

test('settings screen no longer renders venue selection', () => {
  assert.doesNotMatch(settingsSource, /<FieldLabel>Địa điểm<\/FieldLabel>/)
  assert.doesNotMatch(settingsSource, /d\.defaultVenue/)
  assert.doesNotMatch(settingsSource, /defaultVenue:/)
})

test('calendar attendance chips call markAttendance and detail uses the status toggle as save path', () => {
  assert.match(calendarSource, /onAction\?\.\('markAttendance', \{\s*sessionId: session\.id,\s*memberId: a\.id,\s*status: a\.kind === 'present' \? 'absent' : 'present'/)
  assert.match(calendarSource, /onAction\?\.\('saveSessionCost'/)
  assert.match(calendarSource, /toggleSessionCompletion/)
  assert.doesNotMatch(calendarSource, /\{savingCost \? 'Đang lưu\.\.\.' : 'Lưu'\}/)
  assert.doesNotMatch(calendarSource, /onAction\?\.\('togglePresence'/)
  assert.doesNotMatch(calendarSource, /onAction\?\.\('reschedule'/)
  assert.doesNotMatch(calendarSource, /onAction\?\.\('complete'/)
  assert.doesNotMatch(calendarSource, />\s*Lưu\s*<\/Button>/)
  assert.doesNotMatch(calendarSource, />\s*Lưu chi phí\s*<\/Button>/)
})

test('treasurer can explicitly complete a session before calendar marks it attended', () => {
  assert.match(calendarSource, /session\.canComplete/)
  assert.match(calendarSource, /session\.isCompleted/)
  assert.match(calendarSource, /aria-pressed=\{session\.isCompleted\}/)
  assert.match(calendarSource, /await saveSessionCosts\(\)/)
  assert.match(calendarSource, /onAction\?\.\('completeSession', session\.id\)/)
  assert.match(calendarSource, /onAction\?\.\('reopenSession', session\.id\)/)
  assert.match(appSource, /if \(type === 'completeSession'\)/)
  assert.match(appSource, /if \(type === 'reopenSession'\)/)
  assert.match(appSource, /type: 'COMPLETE_PICKLEBALL_SESSION'/)
  assert.match(appSource, /type: 'REOPEN_PICKLEBALL_SESSION'/)
  assert.match(storeSource, /case 'COMPLETE_PICKLEBALL_SESSION':/)
  assert.match(storeSource, /case 'REOPEN_PICKLEBALL_SESSION':/)
  assert.match(storeSource, /\.update\(\{ status: 'completed' \}\)/)
  assert.match(storeSource, /\.update\(\{ status: 'scheduled', notes: null \}\)/)
})

test('calendar attendance chips use compact 34px avatar-style green and grey states', () => {
  assert.match(calendarSource, /const ATTENDANCE_CHIP_SIZE = 34/)
  assert.match(calendarSource, /Điểm danh · \{session\.attendance\.present\}\/\{session\.attendance\.total\} tham gia/)
  assert.match(calendarSource, /background: a\.kind === 'present' \? colors\.pickleball : 'rgba\(255,255,255,0\.06\)'/)
  assert.match(calendarSource, /width: ATTENDANCE_CHIP_SIZE/)
  assert.match(calendarSource, /height: ATTENDANCE_CHIP_SIZE/)
  assert.doesNotMatch(calendarSource, /memberType: a\.memberType/)
})

test('calendar attendance chips show full member names under compact avatars', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'Đỗ Hoàng', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Long Nguyễn', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', status: 'scheduled', attendees: ['m1'] },
      ],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballCalendarData(state)

  assert.deepEqual(Array.from(data.selectedSession.attendees, member => member.name), ['Đỗ Hoàng', 'Long Nguyễn'])
  assert.match(calendarSource, /const ATTENDANCE_NAME_WIDTH = 44/)
  assert.doesNotMatch(calendarSource, /const ATTENDANCE_NAME_WIDTH = 64/)
})

test('calendar legend and ticket styles distinguish my tickets from other tickets', () => {
  assert.match(calendarSource, /ticket:\s+\{ bg: 'rgba\(251,191,36,0\.12\)'/)
  assert.match(calendarSource, /ticketOther:\s+\{ bg: 'rgba\(255,255,255,0\.02\)'[\s\S]*?dashed: true[\s\S]*?color: '#fcd34d'/)
  assert.match(calendarSource, /label="Vé của tôi"/)
  assert.match(calendarSource, /borderColor="rgba\(251,191,36,0\.75\)" label="Vé khác"/)
})

test('calendar disambiguates attendance chips when fixed members share a first name', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'Hoàng Anh', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Hoàng Em', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', status: 'scheduled', attendees: ['m1'] },
      ],
    },
    _allPickle: { sessions: [] },
  }

  const data = buildPickleballCalendarData(state)
  assert.deepEqual(Array.from(data.selectedSession.attendees, member => member.name), ['Hoàng Anh', 'Hoàng Em'])
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
  assert.match(appSource, /const sessionDate = normalizeTicketDate\(payload\?\.session_date \|\| payload\?\.date\)/)
  assert.match(appSource, /const memberIds = normalizeTicketMemberIds\(payload\?\.member_ids \|\| payload\?\.memberIds, state\)/)
  assert.match(appSource, /const isAdvancerMode = payload\?\.paymentMode === 'advancer'/)
  assert.match(appSource, /const wantsTeamFund = payload\?\.paymentMode === 'team_fund' \|\| payload\?\.teamFund === true \|\| payload\?\.status === 'team_fund'/)
  assert.match(appSource, /const advancerId = wantsTeamFund \? null : rawAdvancerId/)
  assert.match(appSource, /const isTeamFund = wantsTeamFund \|\| \(!isAdvancerMode && !advancerId\)/)
  assert.match(appSource, /const ticketStatus = isPickleballTreasurer \? \(advancerId \? 'unpaid' : 'team_fund'\) : 'pending_review'/)
  assert.match(appSource, /if \(!sessionDate\) throw new Error\('ticket_session_date_required'\)/)
  assert.match(appSource, /if \(memberIds\.length === 0\) throw new Error\('ticket_members_required'\)/)
  assert.match(appSource, /if \(totalAmount <= 0\) throw new Error\('ticket_total_amount_required'\)/)
  assert.match(appSource, /session_date: sessionDate/)
  assert.match(appSource, /member_ids: memberIds/)
})

test('calendar guest chips expose treasurer-only delete without changing member toggle behavior', () => {
  assert.match(calendarSource, /onToggle=\{canManageSession && a\.kind !== 'guest' \? \(\) => onAction\?\.\('markAttendance'/)
  assert.match(calendarSource, /isTreasurer=\{canManageSession\}/)
  assert.match(calendarSource, /sessionId=\{session\.id\}/)
  assert.match(calendarSource, /function AttendChip\(\{ a, onToggle, isTreasurer, sessionId, onAction \}\)/)
  assert.match(calendarSource, /if \(a\.kind === 'guest'\) \{[\s\S]*?\{isTreasurer && \(/)
  assert.match(calendarSource, /onAction\?\.\('removeGuest', \{ sessionId, attendeeId: a\.id \}\)/)
  assert.match(calendarSource, /aria-label=\{`Xóa \$\{a\.name\}`\}/)
})

test('removeGuest deletes pickle attendee rows and updates session state', () => {
  assert.match(appSource, /if \(type === 'removeGuest'\) \{[\s\S]*?if \(!isPickleballTreasurer\) return[\s\S]*?const attendeeId = payload\?\.attendeeId[\s\S]*?const sessionId = payload\?\.sessionId/)
  assert.match(appSource, /\.from\('pickle_attendees'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('id', attendeeId\)/)
  assert.match(appSource, /dispatch\(\{ type: 'REMOVE_SESSION_GUEST', attendeeId, sessionId \}\)/)
  const inertBlock = appSource.match(/if \(\[[\s\S]*?\]\.includes\(type\)\) \{/)?.[0] || ''
  assert.doesNotMatch(inertBlock, /'removeGuest'/)

  assert.match(storeSource, /case 'REMOVE_SESSION_GUEST':\s*\{/)
  assert.match(storeSource, /removeSessionGuestFromState\(stateRef\.current, sessionId, attendeeId\)/)
})
