import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  attendanceByMemberId,
  buildHomeData,
  buildPaymentProgressRows,
  buildPickleballCalendarData,
  buildPrevMonthUnpaid,
  buildPersonalWaterSessionRows,
  effectiveSessionMemberIds,
  memberWaterShare,
} from './useScreenData.js'

const fixedMembers = [
  { id: 'fixed-1', name: 'Fixed One' },
  { id: 'fixed-2', name: 'Fixed Two' },
]

const casualMembers = [
  { id: 'casual-1', name: 'Casual One', memberType: 'casual' },
]

describe('effectiveSessionMemberIds', () => {
  test('counts member without a record as present when session has records and fallback is enabled', () => {
    const session = {
      attendance_records: [
        { member_id: 'fixed-1', status: 'present' },
      ],
    }

    expect(effectiveSessionMemberIds(session, fixedMembers, true)).toEqual(['fixed-1', 'fixed-2'])
  })

  test('does not count casual member without explicit attendance when fallback is enabled', () => {
    const session = {
      attendance_records: [
        { member_id: 'fixed-1', status: 'present' },
      ],
    }

    expect(effectiveSessionMemberIds(session, [...fixedMembers, ...casualMembers], true)).toEqual(['fixed-1', 'fixed-2'])
  })

  test('counts fixed member without explicit attendance when fallback is enabled', () => {
    const session = {
      attendance_records: [
        { member_id: 'fixed-1', status: 'present' },
      ],
    }

    expect(effectiveSessionMemberIds(session, [...fixedMembers, ...casualMembers], true)).toContain('fixed-2')
  })

  test('does not count member marked absent when session has records and fallback is enabled', () => {
    const session = {
      attendance_records: [
        { member_id: 'fixed-1', status: 'present' },
        { member_id: 'fixed-2', status: 'absent' },
      ],
    }

    expect(effectiveSessionMemberIds(session, fixedMembers, true)).toEqual(['fixed-1'])
  })

  test('returns member ids for done session with no attendance records', () => {
    const session = {
      status: 'done',
    }

    expect(effectiveSessionMemberIds(session, fixedMembers)).toEqual(['fixed-1', 'fixed-2'])
  })
})

describe('attendanceByMemberId', () => {
  test('counts member present for 3 of 5 sessions when missing records fall back to present', () => {
    const sessions = [
      { attendance_records: [{ member_id: 'fixed-2', status: 'present' }] },
      { attendance_records: [{ member_id: 'fixed-1', status: 'absent' }] },
      { attendance_records: [{ member_id: 'fixed-1', status: 'present' }] },
      { attendance_records: [{ member_id: 'fixed-1', status: 'absent' }] },
      { status: 'done' },
    ]

    expect(attendanceByMemberId(sessions, 'fixed-1', fixedMembers, true)).toBe(3)
  })

  test('returns 0 when member is marked absent for every session', () => {
    const sessions = [
      { attendance_records: [{ member_id: 'fixed-1', status: 'absent' }] },
      { attendance_records: [{ member_id: 'fixed-1', status: 'absent' }] },
      { attendance_records: [{ member_id: 'fixed-1', attended: false }] },
    ]

    expect(attendanceByMemberId(sessions, 'fixed-1', fixedMembers, true)).toBe(0)
  })

  test('returns 0 for empty sessions', () => {
    expect(attendanceByMemberId([], 'fixed-1', fixedMembers, true)).toBe(0)
  })
})

describe('memberWaterShare', () => {
  test('calculates casual member water share from attended sessions', () => {
    const sessions = [
      {
        water_amount: 90_000,
        attendance_records: [
          { member_id: 'fixed-1', status: 'present' },
          { member_id: 'fixed-2', status: 'present' },
          { member_id: 'casual-1', status: 'present' },
        ],
      },
      {
        water_amount: 80_000,
        attendance_records: [
          { member_id: 'fixed-1', status: 'present' },
          { member_id: 'fixed-2', status: 'present' },
          { member_id: 'casual-1', status: 'absent' },
        ],
      },
    ]

    expect(memberWaterShare(sessions, 'casual-1', fixedMembers, casualMembers)).toBe(30_000)
  })

  test('calculates fixed member water share across fixed fallback and casual attendance records', () => {
    const sessions = [
      {
        water_amount: 90_000,
        attendance_records: [
          { member_id: 'fixed-1', status: 'present' },
          { member_id: 'casual-1', status: 'present' },
        ],
      },
      {
        water_amount: 100_000,
        attendance_records: [
          { member_id: 'fixed-2', status: 'present' },
          { member_id: 'casual-1', status: 'absent' },
        ],
        guests: [{ name: 'Guest One' }],
      },
    ]

    expect(memberWaterShare(sessions, 'fixed-1', fixedMembers, casualMembers)).toBe(63_333)
  })

  test('returns 0 when there is no water expense', () => {
    const sessions = [
      {
        attendance_records: [
          { member_id: 'fixed-1', status: 'present' },
          { member_id: 'casual-1', status: 'present' },
        ],
      },
    ]

    expect(memberWaterShare(sessions, 'fixed-1', fixedMembers, casualMembers)).toBe(0)
  })
})

describe('buildPickleballCalendarData', () => {
  test('uses session group members for explicit attendees', () => {
    const state = {
      currentUserId: 'm-current',
      currentGroupId: 'pickle-group',
      currentGroup: { id: 'expense-group', name: 'Expense' },
      members: [
        { id: 'm-current', groupId: 'expense-group', name: 'Current', memberType: 'fixed' },
        { id: 'm-anh-quan', groupId: 'pickle-group', name: 'Anh Quân', memberType: 'casual' },
      ],
      pickle: {
        sessions: [
          {
            id: 'session-2406',
            group_id: 'pickle-group',
            date: '2026-05-20',
            status: 'scheduled',
            attendees: [],
            attendanceRecords: [
              { sessionId: 'session-2406', memberId: 'm-anh-quan', status: 'present', attendeeType: 'member' },
            ],
          },
        ],
        fixedMembers: [],
        monthlyConfigs: [],
      },
      _allPickle: { sessions: [], sessionItems: [] },
    }

    const data = buildPickleballCalendarData(state, { yearMonth: '2026-05' })

    expect(data.selectedSession.attendees.map(member => member.name)).toEqual(['Anh Quân'])
  })
})
describe('buildPersonalWaterSessionRows', () => {
  test('returns empty array when member not present in water sessions', () => {
    const sessions = [
      {
        id: '1',
        date: '2026-05-10',
        water_amount: 100000,
        attendance_records: [
          { member_id: 'member-1', status: 'absent' },
          { member_id: 'other-1', status: 'present' },
        ],
      },
    ]
    const members = [
      { id: 'member-1', name: 'Member One' },
      { id: 'other-1', name: 'Other One' },
    ]
    
    const result = buildPersonalWaterSessionRows(sessions, 'member-1', members)
    expect(result).toEqual([])
  })

  test('calculates per-session water share for member', () => {
    const sessions = [
      {
        id: '1',
        date: '2026-05-10',
        number: 1,
        water_amount: 120000,
        attendance_records: [
          { member_id: 'member-1', status: 'present' },
          { member_id: 'member-2', status: 'present' },
        ],
      },
    ]
    const members = [
      { id: 'member-1', name: 'Member One' },
      { id: 'member-2', name: 'Member Two' },
    ]
    
    const result = buildPersonalWaterSessionRows(sessions, 'member-1', members)
    expect(result.length).toBe(1)
    expect(result[0].amount).toBe(60000) // 120000 / 2
  })

  test('filters out sessions with no water amount', () => {
    const sessions = [
      {
        id: '1',
        date: '2026-05-10',
        number: 1,
        water_amount: 100000,
        attendance_records: [
          { member_id: 'member-1', status: 'present' },
        ],
      },
      {
        id: '2',
        date: '2026-05-11',
        number: 2,
        water_amount: 0,
        attendance_records: [
          { member_id: 'member-1', status: 'present' },
        ],
      },
    ]
    const members = [
      { id: 'member-1', name: 'Member One' },
    ]
    
    const result = buildPersonalWaterSessionRows(sessions, 'member-1', members)
    expect(result.length).toBe(1)
  })
})

describe('buildPrevMonthUnpaid', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns null when selectedYearMonth is not current month', () => {
    const result = buildPrevMonthUnpaid({}, 'user-1', [], [], null, {}, null, '2025-01')
    expect(result).toBeNull()
  })

  test('returns null when prev month balance is zero (no expenses, no pickle)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14'))
    const members = [{ id: 'user-1', profile_id: 'profile-1', name: 'Test' }]
    const result = buildPrevMonthUnpaid(
      { notifications: [], groups: [], members },
      'user-1',
      members,
      [],
      null,
      { currentGroup: null, sessions: [], configs: [] },
      null,
      '2026-06',
    )
    expect(result).toBeNull()
  })

  test('returns null when previous month balance has been settled', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14'))
    const members = [
      { id: 'user-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Test' },
      { id: 'payer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Payer' },
    ]
    const safeGroups = [{
      id: 'group-1',
      name: 'Group',
      members,
      expenses: [{
        id: 'expense-1',
        amount: 100000,
        expenseDate: '2026-05-10',
        paidBy: 'payer-1',
        participants: ['user-1', 'payer-1'],
      }],
    }]
    const state = {
      currentUserId: 'user-1',
      currentUserName: 'Test',
      notifications: [],
      monthSettlements: [{ id: 'settlement-1', member_id: 'user-1', group_id: 'group-1', month: '2026-05' }],
    }

    const result = buildPrevMonthUnpaid(
      state,
      'user-1',
      members,
      safeGroups,
      null,
      { currentGroup: null, sessions: [], configs: [] },
      null,
      '2026-06',
    )

    expect(result).toBeNull()
  })

  // TODO: add integration test for payment-adjusted balance
  // Scenario: gross = -789852, confirmed payment = 752866 → net = -36986
  // Requires full mock of expense groups + state.notifications format
})

describe('buildPaymentProgressRows', () => {
  test('marks rows settled for previous month with settlement id', () => {
    const rows = buildPaymentProgressRows(
      [{ profileId: 'profile-1', memberIds: ['member-1'], name: 'Member One', amount: -100000, sources: [] }],
      [{ id: 'member-1', profile_id: 'profile-1', name: 'Member One' }],
      { notifications: [] },
      'Tháng 6',
      [{ id: 'settlement-1', member_id: 'member-1', month: '2026-05', expense_id: 'expense-1' }],
      '2026-06',
    )

    expect(rows[0]).toMatchObject({
      prevMonthSettled: true,
      settlementId: 'settlement-1',
      settlementExpenseId: 'expense-1',
    })
  })

  test('uses previous month unpaid residual when no settlement exists', () => {
    const rows = buildPaymentProgressRows(
      [{ profileId: 'profile-1', memberIds: ['member-1'], name: 'Member One', amount: -100000, sources: [] }],
      [{ id: 'member-1', profile_id: 'profile-1', name: 'Member One' }],
      { notifications: [], prevMonthResidualByMember: { 'member-1': 50000 } },
      'Tháng 6',
      [],
      '2026-06',
    )

    expect(rows[0]).toMatchObject({
      prevMonthResidual: 50000,
      prevMonthSettled: false,
      settlementId: null,
      settlementExpenseId: null,
    })
  })
})

describe('buildHomeData', () => {
  test('returns current month residual for confirmed members who still owe after payment', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'payer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Payer One' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'payer-1'],
      expenses: [{
        id: 'expense-1',
        amount: 100000,
        expense_date: '2026-06-10',
        paid_by_member_id: 'payer-1',
        participants: ['member-1', 'payer-1'],
      }],
    }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'notice-1',
        type: 'payment',
        actorMemberId: 'member-1',
        metadata: {
          status: 'confirmed',
          amount: 30000,
          memberName: 'Member One',
          monthLabel: 'Tháng 6 · 2026',
          coveredMembers: [{ profileId: 'profile-1', memberId: 'member-1', amount: 30000 }],
        },
      }],
      monthSettlements: [{ id: 'old-settlement', member_id: 'member-1', group_id: 'group-1', month: '2026-05' }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')

    expect(result.currentMonthResidualByMember).toEqual({ 'member-1': 20000 })
    expect(result.prevMonthUnpaidByMember).toBeUndefined()
  })
})
