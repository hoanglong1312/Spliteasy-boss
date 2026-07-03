import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  attendanceByMemberId,
  buildMemberMonthBalance,
  buildMemberMonthBalanceFlex,
  buildPickleballSettingsData,
  buildHomeData,
  buildPaymentProgressRows,
  buildPickleballCalendarData,
  buildPickleballTicketsData,
  buildPrevMonthUnpaid,
  buildPersonalPickleSummaryCards,
  buildPersonalWaterSessionRows,
  effectiveSessionMemberIds,
  isBillingModeFlexForMonth,
  memberFlexTicketType,
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

function makeFlexState(monthlyConfig = {}) {
  return {
    currentGroupId: 'group-1',
    currentGroup: { id: 'group-1', members: ['member-1', 'member-2', 'member-3'] },
    members: [
      { id: 'member-1', group_id: 'group-1', name: 'Member One' },
      { id: 'member-2', group_id: 'group-1', name: 'Member Two' },
      { id: 'member-3', group_id: 'group-1', name: 'Member Three', member_type: 'casual' },
    ],
    pickle: {
      monthlyConfigs: [
        {
          group_id: 'group-1',
          year_month: '2026-07',
          ...monthlyConfig,
        },
      ],
      ownerPayments: [],
      externalTickets: [],
    },
    _allPickle: { externalTickets: [], ownerPayments: [] },
    tickets: [],
  }
}

describe('flex billing helpers', () => {
  test('isBillingModeFlexForMonth returns true only for flex config', () => {
    expect(isBillingModeFlexForMonth(makeFlexState({ billing_mode: 'flex' }), '2026-07')).toBe(true)
    expect(isBillingModeFlexForMonth(makeFlexState({ billingMode: 'fixed' }), '2026-07')).toBe(false)
    expect(isBillingModeFlexForMonth(makeFlexState(), '2026-07')).toBe(false)
  })

  test('memberFlexTicketType returns monthly, per_session, or null', () => {
    const state = makeFlexState({
      monthlyTicketMemberIds: ['member-1'],
      per_session_ticket_member_ids: ['member-2'],
    })

    expect(memberFlexTicketType(state, 'member-1', '2026-07')).toBe('monthly')
    expect(memberFlexTicketType(state, 'member-2', '2026-07')).toBe('per_session')
    expect(memberFlexTicketType(state, 'member-3', '2026-07')).toBeNull()
  })

  test('buildMemberMonthBalanceFlex charges monthly ticket for monthly member with no sessions', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 700000,
      monthly_ticket_member_ids: ['member-1'],
    })

    const result = buildMemberMonthBalanceFlex(state, {}, [], 'member-1', new Date('2026-07-10'))

    expect(result).toMatchObject({
      monthlyTicketFee: 700000,
      perSessionTicketFee: 0,
      waterFee: 0,
      ticketType: 'monthly',
      netBalance: -700000,
      totalOwed: 700000,
      total: 700000,
    })
  })

  test('buildMemberMonthBalanceFlex charges per-session ticket by attendance count', () => {
    const state = makeFlexState({
      billingMode: 'flex',
      perSessionTicketPrice: 120000,
      perSessionTicketMemberIds: ['member-2'],
    })
    const sessions = [
      { presentMemberIds: ['member-2', 'member-1'] },
      { present_member_ids: ['member-2'] },
      { attendeeIds: ['member-1'] },
    ]

    const result = buildMemberMonthBalanceFlex(state, {}, sessions, 'member-2', new Date('2026-07-10'))

    expect(result).toMatchObject({
      monthlyTicketFee: 0,
      perSessionTicketFee: 240000,
      ticketType: 'per_session',
    })
  })

  test('buildMemberMonthBalanceFlex calculates water fee from flex attendance plus guests', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      per_session_ticket_member_ids: ['member-2'],
    })
    const sessions = [
      {
        presentMemberIds: ['member-2', 'member-1'],
        water_amount: 90000,
      },
      {
        attendee_ids: ['member-2'],
        waterAmount: 80000,
        guests: [{ name: 'Guest One' }],
      },
      {
        present_member_ids: ['member-1'],
        water_amount: 100000,
      },
    ]

    const result = buildMemberMonthBalanceFlex(state, {}, sessions, 'member-2', new Date('2026-07-10'))

    expect(result.waterFee).toBe(85000)
  })

  test('buildMemberMonthBalance delegates to flex mode', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 500000,
      monthly_ticket_member_ids: ['member-1'],
    })

    const result = buildMemberMonthBalance(state, {}, [], 'member-1', new Date('2026-07-10'))

    expect(result).toMatchObject({
      monthlyTicketFee: 500000,
      ticketType: 'monthly',
      totalOwed: 500000,
    })
  })

  test('buildMemberMonthBalance keeps fixed-mode result when billing mode is fixed or missing', () => {
    const sessions = [
      { attendance_records: [{ member_id: 'member-3', status: 'present' }] },
      { attendance_records: [{ member_id: 'member-3', status: 'absent' }] },
    ]
    const state = makeFlexState({
      court_fee: 100000,
      fixed_member_ids: ['member-1'],
    })
    state.pickle.ownerPayments = [{
      group_id: 'group-1',
      year_month: '2026-07',
      items: [{ key: 'next_court', year_month: '2026-07' }],
    }]

    const fixedResult = buildMemberMonthBalance(
      { ...state, pickle: { ...state.pickle, monthlyConfigs: [{ ...state.pickle.monthlyConfigs[0], billing_mode: 'fixed' }] } },
      {},
      sessions,
      'member-1',
      new Date('2026-07-10'),
    )
    const missingFieldResult = buildMemberMonthBalance(
      { ...state, pickle: { ...state.pickle, monthlyConfigs: [{ group_id: 'group-1', year_month: '2026-07', court_fee: 100000, fixed_member_ids: ['member-1'] }] } },
      {},
      sessions,
      'member-1',
      new Date('2026-07-10'),
    )

    expect(fixedResult).toMatchObject({
      courtFee: 50000,
      waterFee: 0,
      extras: 0,
      ticketShare: 0,
      p2pBalance: 0,
      netBalance: -50000,
      totalOwed: 50000,
      total: 50000,
      ratePerSession: 50000,
      rebatePerFixed: 50000,
    })
    expect(missingFieldResult).toEqual(fixedResult)
  })

  test('buildPickleballSettingsData reads config aliases and only returns active current-group members', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      court_fee: 123000,
      fixed_member_ids: ['member-1'],
      monthly_ticket_price: 700000,
      perSessionTicketPrice: 120000,
      monthlyTicketMemberIds: ['member-1'],
      per_session_ticket_member_ids: ['member-2'],
    })
    state.members.push(
      { id: 'member-4', group_id: 'group-1', name: 'Inactive', is_active: false },
      { id: 'member-5', group_id: 'group-2', name: 'Other Group' },
    )

    const result = buildPickleballSettingsData(state, '2026-07')

    expect(result).toMatchObject({
      yearMonth: '2026-07',
      billingMode: 'flex',
      courtFee: 123000,
      fixedMemberIds: ['member-1'],
      monthlyTicketPrice: 700000,
      perSessionTicketPrice: 120000,
      monthlyTicketMemberIds: ['member-1'],
      perSessionTicketMemberIds: ['member-2'],
      groupId: 'group-1',
    })
    expect(result.members.map(member => member.id)).toEqual(['member-1', 'member-3', 'member-2'])
  })
})

describe('buildPickleballCalendarData', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  test('ticket picker members include flex ticket type and sort by 3-month attendance', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2'],
    })
    state.pickle.sessions = [
      { date: '2026-05-12', attendance_records: [{ member_id: 'member-1', status: 'present' }, { member_id: 'member-2', status: 'absent' }] },
      { date: '2026-06-10', attendance_records: [{ member_id: 'member-1', status: 'present' }, { member_id: 'member-2', status: 'absent' }] },
      { date: '2026-07-02', attendance_records: [{ member_id: 'member-1', status: 'absent' }, { member_id: 'member-2', status: 'present' }] },
      { date: '2026-07-09', attendance_records: [{ member_id: 'member-1', status: 'absent' }, { member_id: 'member-2', status: 'present' }] },
      { date: '2026-07-16', attendance_records: [{ member_id: 'member-1', status: 'present' }, { member_id: 'member-2', status: 'absent' }] },
    ]

    const data = buildPickleballCalendarData(state, { yearMonth: '2026-07' })

    expect(data.ticketMembers.map(member => ({
      id: member.id,
      ticketType: member.ticketType,
      sessionsAttended: member.sessionsAttended,
    }))).toEqual([
      { id: 'member-1', ticketType: 'monthly', sessionsAttended: 3 },
      { id: 'member-2', ticketType: 'per_session', sessionsAttended: 2 },
      { id: 'member-3', ticketType: null, sessionsAttended: 0 },
    ])
  })

  test('ticket picker members keep fixed mode ticket types null', () => {
    const state = makeFlexState({
      billing_mode: 'fixed',
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2'],
    })

    const data = buildPickleballCalendarData(state, { yearMonth: '2026-07' })

    expect(data.ticketMembers.map(member => member.ticketType)).toEqual([null, null, null])
  })

  test('does not request auto-generation for elapsed months with missing sessions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02'))
    const state = makeFlexState({
      schedule_weekdays: [1],
      schedule_start_day: '01/06/2026',
    })
    state.pickle.monthlyConfigs.push({
      group_id: 'group-1',
      year_month: '2026-06',
      schedule_weekdays: [1],
      schedule_start_day: '01/06/2026',
    })
    state.pickle.sessions = []

    const data = buildPickleballCalendarData(state, { yearMonth: '2026-06' })

    expect(data.shouldAutoGenerate).toBe(false)
    expect(data.autoGenerateRequest).toBeNull()
  })
})

describe('buildPersonalPickleSummaryCards', () => {
  test('uses flex monthly ticket cost instead of missing court fee', () => {
    const result = buildPersonalPickleSummaryCards([], {
      ticketType: 'monthly',
      monthlyTicketFee: 700000,
      perSessionTicketFee: 0,
      waterFee: 0,
    }, 0, 'member-1', [])

    expect(result[0]).toMatchObject({
      label: 'Vé tháng của bạn',
      amount: -700000,
      sub: 'Vé tháng cố định',
    })
    expect(Number.isNaN(result[0].amount)).toBe(false)
    expect(result.map(card => card.label)).toContain('Vé lẻ qua quỹ')
  })

  test('uses flex per-session ticket cost and unassigned fallback', () => {
    const perSession = buildPersonalPickleSummaryCards([], {
      ticketType: 'per_session',
      monthlyTicketFee: 0,
      perSessionTicketFee: 240000,
      waterFee: 0,
    }, 0, 'member-1', [])
    const unassigned = buildPersonalPickleSummaryCards([], {
      ticketType: null,
      monthlyTicketFee: 0,
      perSessionTicketFee: 0,
      waterFee: 0,
    }, 0, 'member-1', [])

    expect(perSession[0]).toMatchObject({
      label: 'Vé lượt của bạn',
      amount: -240000,
      sub: 'Theo buổi tham gia',
    })
    expect(unassigned[0]).toMatchObject({
      label: 'Chưa phân nhóm vé',
      amount: 0,
      sub: 'Vào Thành viên để chọn vé tháng/lượt',
    })
  })
})

describe('buildPickleballTicketsData', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('members include flex ticket type and sort by 3-month attendance', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-20'))
    const state = makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2'],
    })
    state.pickle.sessions = [
      { date: '2026-05-12', attendance_records: [{ member_id: 'member-1', status: 'present' }, { member_id: 'member-2', status: 'absent' }] },
      { date: '2026-06-10', attendance_records: [{ member_id: 'member-1', status: 'present' }, { member_id: 'member-2', status: 'absent' }] },
      { date: '2026-07-02', attendance_records: [{ member_id: 'member-1', status: 'absent' }, { member_id: 'member-2', status: 'present' }] },
      { date: '2026-07-09', attendance_records: [{ member_id: 'member-1', status: 'absent' }, { member_id: 'member-2', status: 'present' }] },
      { date: '2026-07-16', attendance_records: [{ member_id: 'member-1', status: 'present' }, { member_id: 'member-2', status: 'absent' }] },
    ]

    const data = buildPickleballTicketsData(state)

    expect(data.members.map(member => ({
      id: member.id,
      ticketType: member.ticketType,
      sessionsAttended: member.sessionsAttended,
    }))).toEqual([
      { id: 'member-1', ticketType: 'monthly', sessionsAttended: 3 },
      { id: 'member-2', ticketType: 'per_session', sessionsAttended: 2 },
      { id: 'member-3', ticketType: null, sessionsAttended: 0 },
    ])
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
