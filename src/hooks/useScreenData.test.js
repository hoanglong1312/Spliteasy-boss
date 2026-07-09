import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  attendanceByMemberId,
  buildMemberMonthBalance,
  buildMemberMonthBalanceFlex,
  buildPickleballOverviewData,
  buildPickleballTeamFundData,
  buildPickleballSettingsData,
  buildHomeData,
  buildGroupDetailData,
  buildGroupsListData,
  buildPaymentProgressRows,
  buildPickleballCalendarData,
  buildPickleballTicketsData,
  buildPrevMonthUnpaid,
  buildAllExpensesData,
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

describe('buildGroupsListData', () => {
  test('hides archived groups from the active list while keeping them reviewable with balances', () => {
    const members = [
      { id: 'member-1', name: 'Member One', group_id: 'active-group' },
      { id: 'payer-1', name: 'Payer One', group_id: 'active-group' },
      { id: 'member-archived', name: 'Member One', profile_id: 'profile-1', group_id: 'archived-group' },
      { id: 'payer-archived', name: 'Payer One', group_id: 'archived-group' },
    ]
    const groups = [
      {
        id: 'active-group',
        name: 'Nhóm đang chạy',
        emoji: '🍜',
        members: ['member-1', 'payer-1'],
        expenses: [],
      },
      {
        id: 'archived-group',
        name: 'Hạ Long thả gió',
        emoji: '🏖️',
        archived_at: '2026-07-08T10:00:00.000Z',
        members: ['member-archived', 'payer-archived'],
        expenses: [{
          id: 'expense-1',
          amount: 200000,
          expense_date: '2026-05-10',
          paid_by_member_id: 'payer-archived',
          participants: ['member-archived', 'payer-archived'],
        }],
      },
    ]

    const result = buildGroupsListData(groups, 'member-archived', members, 'Member One', '2026-05')

    expect(result.groups.map(group => group.id)).toEqual(['active-group'])
    expect(result.archived.map(group => group.id)).toEqual(['archived-group'])
    expect(result.activeCount).toBe(1)
    expect(result.archivedCount).toBe(1)
    expect(result.archived[0]).toMatchObject({
      name: 'Hạ Long thả gió',
      balance: -100000,
    })
  })
})

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

function addJulyFlexTickets(state) {
  state.pickle.externalTickets = [
    {
      id: 'ticket-1',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-01',
      status: 'team_fund',
      total_amount: 350000,
      water_amount: 75000,
      member_ids: ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    },
    {
      id: 'ticket-2',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-03',
      status: 'team_fund',
      total_amount: 250000,
      water_amount: 0,
      member_ids: ['member-1', 'member-2', 'member-3', 'member-4', 'member-5'],
    },
  ]
  state.members = [
    { id: 'member-1', group_id: 'group-1', name: 'Member One' },
    { id: 'member-2', group_id: 'group-1', name: 'Member Two' },
    { id: 'member-3', group_id: 'group-1', name: 'Member Three' },
    { id: 'member-4', group_id: 'group-1', name: 'Member Four' },
    { id: 'member-5', group_id: 'group-1', name: 'Member Five' },
    { id: 'member-6', group_id: 'group-1', name: 'Member Six' },
    { id: 'member-7', group_id: 'group-1', name: 'Member Seven' },
  ]
  return state
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

  test('buildHomeData shows monthly ticket price in recent transactions for monthly members', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 550000,
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }))
    state.currentUserId = 'member-1'
    state.currentUserName = 'Member One'
    state.groups = [{ id: 'group-1', name: 'Virgo Pickleball 246', kind: 'pickleball', members: state.members.map(member => member.id) }]
    state.currentGroup = state.groups[0]

    const result = buildHomeData(state, 'member-1', state.members, state.groups, {}, state, '2026-07')
    const transaction = result.transactions.find(row => row.type === 'pickleball_monthly_ticket')

    expect(transaction).toMatchObject({
      title: 'Trả tiền sân theo xé vé tháng',
      amount: -550000,
    })
  })

  test('buildHomeData uses app monthly config when pickleball state omits it', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 550000,
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }))
    state.currentUserId = 'member-1'
    state.currentUserName = 'Member One'
    state.groups = [{ id: 'group-1', name: 'Virgo Pickleball 246', kind: 'pickleball', members: state.members.map(member => member.id) }]
    state.currentGroup = state.groups[0]
    const pickleballState = {
      currentGroupId: 'group-1',
      currentGroup: state.currentGroup,
      members: state.members,
      groups: state.groups,
      _allPickle: { externalTickets: state.pickle.externalTickets },
    }

    const result = buildHomeData(state, 'member-1', state.members, state.groups, {}, pickleballState, '2026-07')
    const transaction = result.transactions.find(row => row.type === 'pickleball_monthly_ticket')

    expect(transaction.amount).toBe(-550000)
  })

  test('buildHomeData maps logged-in user to pickleball member id for monthly ticket transactions', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 550000,
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }))
    state.currentUserId = 'user-pham-tien'
    state.currentUserName = 'Phạm Tiến'
    state.members = state.members.map(member => {
      if (member.id === 'member-1') return { ...member, name: 'Phạm Tiến' }
      return member
    })
    state.groups = [{ id: 'group-1', name: 'Virgo Pickleball 246', kind: 'pickleball', members: state.members.map(member => member.id) }]
    state.currentGroup = state.groups[0]

    const result = buildHomeData(state, state.currentUserId, state.members, state.groups, {}, state, '2026-07')
    const transaction = result.transactions.find(row => row.type === 'pickleball_monthly_ticket')

    expect(transaction).toMatchObject({
      amount: -550000,
      currentMemberId: 'member-1',
    })
  })

  test('buildAllExpensesData includes monthly ticket and ticket water for mapped pickleball member', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 550000,
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }))
    state.selectedYearMonth = '2026-07'
    state.currentUserId = 'user-pham-tien'
    state.currentUserName = 'Phạm Tiến'
    state.members = state.members.map(member => {
      if (member.id === 'member-1') return { ...member, name: 'Phạm Tiến' }
      return member
    })
    state.groups = [{ id: 'group-1', name: 'Virgo Pickleball 246', kind: 'pickleball', members: state.members.map(member => member.id) }]
    state.currentGroup = state.groups[0]

    const result = buildAllExpensesData(state, state.currentUserId, state.members, state.currentUserName)
    const monthlyTicket = result.transactions.find(row => row.type === 'pickleball_monthly_ticket')
    const water = result.transactions.find(row => row.type === 'pickleball_ticket_water')

    expect(monthlyTicket).toMatchObject({
      amount: -550000,
      currentMemberId: 'member-1',
      yearMonth: '2026-07',
    })
    expect(water).toMatchObject({
      amount: -10714,
      currentMemberId: 'member-1',
      yearMonth: '2026-07',
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

  test('buildMemberMonthBalanceFlex adds ticket water and attendance for monthly member', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 700000,
      monthly_ticket_member_ids: ['member-1', 'member-4'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-5', 'member-6', 'member-7'],
    }))

    const result = buildMemberMonthBalanceFlex(state, {}, [], 'member-1', new Date('2026-07-10'))

    expect(result.ticketType).toBe('monthly')
    expect(result.monthlyTicketFee).toBe(700000)
    expect(result.perSessionTicketFee).toBe(0)
    expect(result.waterFee).toBe(10714)
    expect(result.attendedSessionsCount).toBe(2)
  })

  test('buildMemberMonthBalanceFlex charges configured ticket price for flex ticket attendance', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      per_session_ticket_price: 50000,
      monthly_ticket_member_ids: ['member-1', 'member-4'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-5', 'member-6', 'member-7'],
    }))

    const result = buildMemberMonthBalanceFlex(state, {}, [], 'member-2', new Date('2026-07-10'))

    expect(result.ticketType).toBe('per_session')
    expect(result.attendedSessionsCount).toBe(2)
    expect(result.perSessionTicketFee).toBe(100000)
    expect(result.waterFee).toBe(10714)
  })

  test('buildMemberMonthBalanceFlex does not double charge team-fund ticket share for per-session member', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      per_session_ticket_price: 50000,
      per_session_ticket_member_ids: ['member-2'],
    })
    state.pickle.externalTickets = [{
      id: 'ticket-dang-viet',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-06',
      status: 'team_fund',
      total_amount: 100000,
      water_amount: 0,
      member_ids: ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }]

    const result = buildMemberMonthBalanceFlex(state, {}, [], 'member-2', new Date('2026-07-10'))

    expect(result).toMatchObject({
      ticketType: 'per_session',
      attendedSessionsCount: 1,
      perSessionTicketFee: 50000,
      waterFee: 0,
      ticketShare: 0,
      netBalance: -50000,
      totalOwed: 50000,
    })
  })

  test('buildMemberMonthBalanceFlex never splits team-fund ticket total in flex mode', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      per_session_ticket_price: 50000,
    })
    state.pickle.externalTickets = [{
      id: 'ticket-flex-team-fund',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-06',
      status: 'team_fund',
      total_amount: 350000,
      water_amount: 70000,
      member_ids: ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }]

    const result = buildMemberMonthBalanceFlex(state, {}, [], 'member-2', new Date('2026-07-10'))

    expect(result).toMatchObject({
      ticketType: null,
      perSessionTicketFee: 0,
      waterFee: 10000,
      ticketShare: 0,
      netBalance: -10000,
      totalOwed: 10000,
    })
  })

  test('buildMemberMonthBalance uses configured ticket price for normal team-fund tickets', () => {
    const state = makeFlexState({
      ticket_price: 50000,
      fixed_member_ids: ['member-1'],
    })
    state.pickle.externalTickets = [{
      id: 'ticket-normal-fixed',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-06',
      status: 'team_fund',
      total_amount: 100000,
      water_amount: 0,
      member_ids: ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }]

    const result = buildMemberMonthBalance(state, {}, [], 'member-2', new Date('2026-07-10'))

    expect(result).toMatchObject({
      ticketShare: 50000,
      netBalance: -50000,
      totalOwed: 50000,
    })
  })

  test('buildMemberMonthBalance only divides water for normal team-fund tickets', () => {
    const state = makeFlexState({
      ticket_price: 50000,
      fixed_member_ids: ['member-1'],
    })
    state.pickle.externalTickets = [{
      id: 'ticket-normal-water',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-06',
      status: 'team_fund',
      total_amount: 100000,
      water_amount: 70000,
      member_ids: ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7'],
    }]

    const result = buildMemberMonthBalance(state, {}, [], 'member-2', new Date('2026-07-10'))

    expect(result).toMatchObject({
      ticketShare: 60000,
      netBalance: -60000,
      totalOwed: 60000,
    })
  })

  test('buildMemberMonthBalance prices normal team-fund tickets from monthly court rate', () => {
    const fixedMemberIds = ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7']
    const state = makeFlexState({
      court_fee: 4550000,
      sessions_count: 13,
      fixed_member_ids: fixedMemberIds,
    })
    state.currentGroup.members = fixedMemberIds
    state.members = fixedMemberIds.map(id => ({ id, group_id: 'group-1', name: id }))
    state.pickle.externalTickets = [{
      id: 'ticket-normal-court-rate',
      group_id: 'group-1',
      year_month: '2026-07',
      session_date: '2026-07-06',
      status: 'team_fund',
      total_amount: 770000,
      water_amount: 0,
      member_ids: fixedMemberIds,
    }]

    const result = buildMemberMonthBalance(state, {}, [], 'member-2', new Date('2026-07-10'))

    expect(result).toMatchObject({
      ticketShare: 50000,
      netBalance: -50000,
      totalOwed: 50000,
    })
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

  test('buildPickleballTeamFundData uses flex tickets for owner payment draft', () => {
    const state = makeFlexState({
      billing_mode: 'flex',
      court_fee: 9_999_999,
      ticket_price: 123_456,
      monthly_ticket_price: 700_000,
      per_session_ticket_price: 120_000,
      monthly_ticket_member_ids: ['member-1'],
      per_session_ticket_member_ids: ['member-2'],
    })
    state.pickle.sessions = [
      {
        id: 's1',
        group_id: 'group-1',
        date: '2026-07-05',
        present_member_ids: ['member-1', 'member-2'],
        water_amount: 60_000,
      },
      {
        id: 's2',
        group_id: 'group-1',
        date: '2026-07-12',
        presentMemberIds: ['member-2'],
      },
      {
        id: 's3',
        group_id: 'group-1',
        date: '2026-07-19',
        present_member_ids: ['member-1'],
      },
    ]
    state.pickle.sessionItems = [
      { id: 'extra-1', session_id: 's1', name: 'Bóng', amount: 80_000 },
    ]
    state.pickle.ownerPayments = [
      {
        group_id: 'group-1',
        year_month: '2026-07',
        items: [{ key: 'flex_per_session', year_month: '2026-07' }],
      },
    ]

    const data = buildPickleballTeamFundData(state, '2026-07')

    expect(data).toMatchObject({
      isFlexBilling: true,
      flexMonthlyTicketPrice: 700_000,
      flexPerSessionTicketPrice: 120_000,
      flexMonthlyMemberCount: 1,
      flexPerSessionMemberCount: 1,
      flexMonthlyRevenue: 700_000,
      flexPerSessionRevenue: 240_000,
      flexTotalDue: 940_000,
    })
    expect(data.paymentDraft.items.map(item => [item.key, item.label, item.amount, item.paid])).toEqual([
      ['water', 'Tiền nước', 60_000, false],
      ['extras', 'Phát sinh', 80_000, false],
      ['flex_monthly', 'Vé tháng thu về', 700_000, false],
      ['flex_per_session', 'Vé lẻ thu về', 240_000, true],
    ])
    expect(data.costRows.map(row => [row.key, row.label, row.amount, row.paidToOwner])).toEqual([
      ['water', 'Tiền nước', 60_000, false],
      ['extras', 'Phát sinh', 80_000, false],
      ['flex_monthly', 'Vé tháng thu về', 700_000, false],
      ['flex_per_session', 'Vé lẻ thu về', 240_000, true],
    ])
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

  test('ticket rows show configured per-session price in flex mode', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      per_session_ticket_price: 50000,
      monthly_ticket_member_ids: ['member-1', 'member-4'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-5', 'member-6', 'member-7'],
    }))

    const data = buildPickleballCalendarData(state, { yearMonth: '2026-07', selectedDate: '2026-07-01' })
    const ticket = data.selectedTickets.find(row => row.id === 'ticket-1')

    expect(ticket.displayAmountPerPerson).toBe(50000)
    expect(ticket.displayAmountLabel).toBe('vé lượt')
    expect(ticket.billedMemberCount).toBe(5)
    expect(ticket.waterAmountPerPerson).toBe(10714)
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
    expect(result.map(card => card.label)).not.toContain('Vé lẻ qua quỹ')
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

  test('counts ticket water rows for flex summary cards', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_member_ids: ['member-1'],
    }))

    const result = buildPersonalPickleSummaryCards([], {
      ticketType: 'monthly',
      monthlyTicketFee: 700000,
      waterFee: 10714,
    }, 0, 'member-1', state.members, true, state, new Date('2026-07-10'))

    expect(result[1]).toMatchObject({
      label: 'Nước của bạn',
      amount: -10714,
      sub: '1 buổi có nước',
    })
    expect(result[1].rows).toHaveLength(1)
    expect(result[1].rows[0]).toMatchObject({
      label: 'Vé lẻ · 01/07',
      amount: 10714,
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

  test('uses flex attendance without fixed-member fallback when requested', () => {
    const sessions = [
      {
        id: '1',
        date: '2026-07-02',
        water_amount: 100000,
        attendance_records: [
          { member_id: 'member-2', status: 'present' },
        ],
      },
    ]
    const members = [
      { id: 'member-1', name: 'Member One' },
      { id: 'member-2', name: 'Member Two' },
    ]

    expect(buildPersonalWaterSessionRows(sessions, 'member-1', members)).toHaveLength(1)
    expect(buildPersonalWaterSessionRows(sessions, 'member-1', members, true)).toEqual([])
  })

  test('appends ticket water rows when state is provided', () => {
    const state = addJulyFlexTickets(makeFlexState({ billing_mode: 'flex' }))

    const result = buildPersonalWaterSessionRows([], 'member-1', state.members, true, state, new Date('2026-07-10'))

    expect(result).toEqual([
      { label: 'Vé lẻ · 01/07', amount: 10714 },
    ])
  })
})

describe('buildPickleballOverviewData flex attendance', () => {
  test('uses flex tickets for personal progress and water summary', () => {
    const state = addJulyFlexTickets(makeFlexState({
      billing_mode: 'flex',
      monthly_ticket_price: 700000,
      monthly_ticket_member_ids: ['member-1', 'member-4'],
      per_session_ticket_member_ids: ['member-2', 'member-3', 'member-5', 'member-6', 'member-7'],
    }))
    state.currentUserId = 'member-1'
    state.currentGroup.name = 'Flex Club'

    const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'member-1', state.members, '2026-07')

    expect(data.isFlexBilling).toBe(true)
    expect(data.progress.attended).toBe(2)
    expect(data.progress.ticketDatesInMonth).toBe(2)
    expect(data.yourBalance.ticketType).toBe('monthly')
    expect(data.yourBalance.summaryCards[1]).toMatchObject({
      label: 'Nước của bạn',
      amount: -10714,
      sub: '1 buổi có nước',
    })
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

  test('ignores confirmed payment_submitted notices because checkpoint cutoff owns confirmed debt', () => {
    const rows = buildPaymentProgressRows(
      [],
      [{ id: 'member-1', profile_id: 'profile-1', name: 'Lê Tuấn' }],
      {
        notifications: [{
          id: 'notice-1',
          type: 'payment_submitted',
          actor_member_id: 'member-1',
          metadata: { status: 'confirmed', amount: 894590, monthLabel: 'Tháng 5 · 2026' },
          created_at: '2026-07-05T05:11:13.000Z',
        }],
      },
      'Tháng 7 · 2026',
      [],
      '2026-07',
    )

    expect(rows).toEqual([])
  })

  test('splits treasurer payment items by source month and defaults current month only', () => {
    const rows = buildPaymentProgressRows(
      [{
        profileId: 'profile-tuan',
        memberIds: ['pickle-tuan', 'life-tuan'],
        memberId: 'pickle-tuan',
        name: 'Lê Tuấn',
        amount: -300000,
        sources: [{
          sourceType: 'group',
          sourceId: 'life-1',
          sourceLabel: 'Lấy vk để trưởng thành',
          profileId: 'profile-tuan',
          memberId: 'life-tuan',
          amount: -300000,
          monthBreakdown: [
            { month: '2026-06', label: 'Tháng 6', amount: -100000 },
            { month: '2026-07', label: 'Tháng 7', amount: -200000 },
          ],
        }],
      }],
      [
        { id: 'pickle-tuan', profile_id: 'profile-tuan', name: 'Lê Tuấn' },
        { id: 'life-tuan', profile_id: 'profile-tuan', name: 'Lê Tuấn' },
      ],
      { notifications: [] },
      'Tháng 7 · 2026',
      [],
      '2026-07',
    )

    expect(rows[0].paymentItems).toHaveLength(2)
    expect(rows[0].defaultPaymentItemKeys).toEqual([rows[0].paymentItems[1].key])
    expect(rows[0].payableAmount).toBe(200000)
    expect(rows[0].payableSources).toMatchObject([{
      sourceId: 'life-1',
      sourceLabel: 'Lấy vk để trưởng thành',
      memberId: 'life-tuan',
      month: '2026-07',
      amount: -200000,
    }])
    expect(rows[0].paymentItems[0]).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      month: '2026-06',
      amount: -100000,
      defaultSelected: false,
    })
    expect(rows[0].paymentItems[1]).toMatchObject({
      month: '2026-07',
      amount: -200000,
      defaultSelected: true,
    })
  })

  test('keeps positive month offsets in treasurer payment items', () => {
    const rows = buildPaymentProgressRows(
      [{
        profileId: 'profile-hung',
        memberIds: ['hung-life'],
        memberId: 'hung-life',
        name: 'Mạnh Hùng',
        amount: -425816,
        sources: [{
          sourceType: 'group',
          sourceId: 'life-1',
          sourceLabel: 'Lấy vk để trưởng thành',
          profileId: 'profile-hung',
          memberId: 'hung-life',
          amount: -425816,
          monthBreakdown: [
            { month: '2026-06', label: 'Tháng 6', amount: -658166 },
            { month: '2026-07', label: 'Tháng 7', amount: 232350 },
          ],
        }],
      }],
      [{ id: 'hung-life', profile_id: 'profile-hung', name: 'Mạnh Hùng' }],
      { notifications: [] },
      'Tháng 6 · 2026',
      [],
      '2026-06',
    )

    expect(rows[0].amount).toBe(425816)
    expect(rows[0].paymentItems).toMatchObject([
      { month: '2026-06', amount: -658166 },
      { month: '2026-07', amount: 232350 },
    ])
  })
})

describe('buildHomeData', () => {
  test('includes recent transactions from other groups matched by profile id', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Tuấn Lê' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['expense-tuan', 'long-life'],
      expenses: [{
        id: 'life-july-expense',
        title: 'Chi tiêu nhóm',
        amount: 200000,
        date: '2026-07-03',
        expense_date: '2026-07-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['expense-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const transaction = result.transactions.find(row => row.id === 'life-july-expense')

    expect(transaction).toMatchObject({
      id: 'life-july-expense',
      groupId: 'life-1',
      currentMemberId: 'expense-tuan',
      isMine: true,
      amount: -100000,
    })
  })

  test('shows only selected month transactions in recent list', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['expense-tuan', 'long-life'],
      expenses: [{
        id: 'life-may-expense',
        title: 'Chi tiêu tháng 5',
        amount: 200000,
        date: '2026-05-03',
        expense_date: '2026-05-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['expense-tuan', 'long-life'],
      }, {
        id: 'life-june-expense',
        title: 'Chi tiêu tháng 6',
        amount: 200000,
        date: '2026-06-03',
        expense_date: '2026-06-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['expense-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-05')

    expect(result.transactions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'life-may-expense',
        groupId: 'life-1',
        currentMemberId: 'expense-tuan',
        isMine: true,
        amount: -100000,
      }),
    ]))
    expect(result.transactions.some(row => row.id === 'life-june-expense')).toBe(false)
  })

  test('includes source breakdown from other groups matched by profile id', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Tuấn Lê' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['expense-tuan', 'long-life'],
      expenses: [{
        id: 'life-may-expense',
        title: 'Chi tiêu tháng 5',
        amount: 200000,
        date: '2026-05-03',
        expense_date: '2026-05-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['expense-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'life-1')
    const cappedSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(source).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      memberId: 'expense-tuan',
      amount: -100000,
      monthBreakdown: [{ month: '2026-05', label: 'Tháng 5', amount: -100000 }],
    })
    expect(cappedSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: -100000,
      monthBreakdown: [{ month: '2026-05', label: 'Tháng 5', amount: -100000 }],
    })
  })

  test('uses profile id, not login member id, for member home source totals', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'expense-1', name: 'Lê Tuấn' },
      { id: 'long-pickle', profile_id: 'profile-long', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long', role: 'treasurer' },
      { id: 'long-expense', profile_id: 'profile-long', group_id: 'expense-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan', 'long-pickle'],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-may',
        title: 'Lấy vk tháng 5',
        amount: 200000,
        date: '2026-05-05',
        expense_date: '2026-05-05',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      members: ['expense-tuan', 'long-expense'],
      expenses: [{
        id: 'expense-may',
        title: 'Nước tháng 5',
        amount: 825000,
        date: '2026-05-06',
        expense_date: '2026-05-06',
        paidBy: 'long-expense',
        paid_by_member_id: 'long-expense',
        participants: ['expense-tuan', 'long-expense'],
      }],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [{
          id: 'pickle-may',
          group_id: 'pickle-1',
          year_month: '2026-05',
          session_date: '2026-05-07',
          total_amount: 1589180,
          member_ids: ['pickle-tuan', 'long-pickle'],
          status: 'team_fund',
        }],
      },
    }
    const state = {
      currentUserId: 'stale-login-member',
      currentProfileId: 'profile-tuan',
      currentUserName: '',
      currentGroupId: 'life-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'stale-login-member', members, groups, {}, pickleballState, '2026-05')

    expect(result.cappedTotalBalance).toBe(-1307090)
    expect(result.cappedSourceBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: 'pickle-1', sourceType: 'pickleball', amount: -794590 }),
      expect.objectContaining({ sourceId: 'life-1', amount: -100000 }),
      expect.objectContaining({ sourceId: 'expense-1', amount: -412500 }),
    ]))
    expect(result.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-tuan')).toMatchObject({
      amount: 1307090,
      sourceSummary: '3 nguồn tiền',
    })
  })

  test('does not let linked expense month settlement hide pickleball month debt', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'expense-1', name: 'Lê Tuấn' },
      { id: 'long-pickle', profile_id: 'profile-long', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
      { id: 'long-expense', profile_id: 'profile-long', group_id: 'expense-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan', 'long-pickle'],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      linked_pickleball_group_id: 'pickle-1',
      members: ['expense-tuan', 'long-expense'],
      expenses: [{
        id: 'expense-may',
        title: 'Nước tháng 5',
        amount: 825000,
        date: '2026-05-06',
        expense_date: '2026-05-06',
        paidBy: 'long-expense',
        paid_by_member_id: 'long-expense',
        participants: ['expense-tuan', 'long-expense'],
      }],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [{
          id: 'pickle-may',
          group_id: 'pickle-1',
          year_month: '2026-05',
          session_date: '2026-05-07',
          total_amount: 1589180,
          member_ids: ['pickle-tuan', 'long-pickle'],
          status: 'team_fund',
        }],
      },
    }
    const state = {
      currentUserId: 'pickle-tuan',
      currentProfileId: 'profile-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'expense-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
      monthSettlements: [{
        id: 'expense-settled-may',
        member_id: 'expense-tuan',
        group_id: 'expense-1',
        month: '2026-05',
        expense_id: 'expense-may',
      }],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, pickleballState, '2026-05')

    expect(result.cappedSourceBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: 'pickle-1', sourceType: 'pickleball', amount: -794590 }),
    ]))
  })

  test('dedupes identical confirmed treasurer payments by member source month amount', () => {
    const members = [
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long', role: 'treasurer' },
      { id: 'phuong-life', profile_id: 'profile-phuong', group_id: 'life-1', name: 'Phương Thảo' },
    ]
    const groups = [{
      id: 'life-1',
      name: 'Hạ Long Thả Gió',
      members: ['long-life', 'phuong-life'],
      expenses: [{
        id: 'halong-june-expense',
        title: 'Hạ Long',
        amount: 200000,
        date: '2026-06-03',
        expense_date: '2026-06-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['long-life', 'phuong-life'],
      }],
    }, {
      id: 'life-2',
      name: 'Hạ Long Thả Gió',
      members: ['long-life', 'phuong-life'],
      expenses: [],
    }]
    const coveredSource = {
      sourceType: 'group',
      sourceId: 'life-1',
      sourceLabel: 'Hạ Long Thả Gió',
      memberId: 'phuong-life',
      profileId: 'profile-phuong',
      month: '2026-06',
      monthLabel: 'Tháng 6 · 2026',
      amount: -100000,
    }
    const state = {
      currentUserId: 'long-life',
      currentUserName: 'Hoàng Long',
      currentGroupId: 'life-1',
      members,
      groups,
      notifications: ['notice-1', 'notice-2'].map((id, index) => ({
        id,
        type: 'payment_submitted',
        actor_member_id: index === 0 ? 'phuong-life' : 'phuong-life-duplicate',
        group_id: index === 0 ? 'life-1' : 'life-2',
        created_at: `2026-06-10T10:00:0${index}.000Z`,
        metadata: {
          status: 'confirmed',
          amount: 100000,
          memberName: 'Phương Thảo',
          monthLabel: 'Tháng 6 · 2026',
          coveredSources: [coveredSource],
        },
      })),
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'long-life', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')

    expect(result.paymentRecords).toHaveLength(1)
    expect(result.paymentRecords[0]).toMatchObject({
      memberName: 'Phương Thảo',
      amount: 100000,
      sourceSummary: 'Hạ Long Thả Gió · Tháng 6 · 2026',
    })
    expect(result.paymentSummary.paidAmount).toBe(0)
    const phuongRow = result.paymentSummary.paymentProgress.find(row => row.name === 'Phương Thảo')
    expect(phuongRow).toBeUndefined()
  })

  test('includes source breakdown from legacy groups matched by member name', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'legacy-tuan', profile_id: 'legacy-profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['legacy-tuan', 'long-life'],
      expenses: [{
        id: 'life-july-expense',
        title: 'Chi tiêu tháng 7',
        amount: 200000,
        date: '2026-07-03',
        expense_date: '2026-07-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['legacy-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'life-1')
    const cappedSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(source).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      memberId: 'legacy-tuan',
      amount: -100000,
      monthBreakdown: [{ month: '2026-07', label: 'Tháng 7', amount: -100000 }],
    })
    expect(cappedSource).toMatchObject({ amount: -100000 })
  })

  test('keeps paid cross-group source visible with zero balance', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'expense-1', name: 'Lê Tuấn' },
      { id: 'long-expense', profile_id: 'profile-long', group_id: 'expense-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Chi tiêu tháng 6',
        amount: 200000,
        date: '2026-06-03',
        expense_date: '2026-06-03',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      members: ['expense-tuan', 'long-expense'],
      expenses: [{
        id: 'expense-july',
        title: 'Chi tiêu tháng 7',
        amount: 100000,
        date: '2026-07-01',
        expense_date: '2026-07-01',
        paidBy: 'long-expense',
        paid_by_member_id: 'long-expense',
        participants: ['expense-tuan', 'long-expense'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'life-paid',
        type: 'payment_submitted',
        actor_member_id: 'life-tuan',
        member_id: 'life-tuan',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 6 · 2026',
          amount: 100000,
          coveredSources: [{ sourceId: 'life-1', sourceType: 'group', sourceLabel: 'Lấy vk để trưởng thành', memberId: 'life-tuan', amount: -100000 }],
        },
        created_at: '2026-07-01T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const paidSource = result.sourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(result.totalBalance).toBe(-50000)
    expect(paidSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: 0,
      paidAmount: 100000,
    })
    expect(result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')).toMatchObject({ amount: 0 })
  })

  test('keeps paid-only cross-group source visible without current debt row', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'expense-1', name: 'Lê Tuấn' },
      { id: 'long-expense', profile_id: 'profile-long', group_id: 'expense-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan'],
      expenses: [],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      members: ['expense-tuan', 'long-expense'],
      expenses: [{
        id: 'expense-july',
        title: 'Chi tiêu tháng 7',
        amount: 100000,
        date: '2026-07-01',
        expense_date: '2026-07-01',
        paidBy: 'long-expense',
        paid_by_member_id: 'long-expense',
        participants: ['expense-tuan', 'long-expense'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'life-paid',
        type: 'payment_submitted',
        actor_member_id: 'life-tuan',
        member_id: 'life-tuan',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 7 · 2026',
          amount: 100000,
          coveredSources: [{ sourceId: 'life-1', sourceType: 'group', sourceLabel: 'Lấy vk để trưởng thành', memberId: 'life-tuan', amount: -100000 }],
        },
        created_at: '2026-07-01T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const paidSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(result.totalBalance).toBe(-50000)
    expect(paidSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: 0,
      paidAmount: 100000,
    })
  })

  test('shows zero-balance cross-group membership as source', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'expense-tuan', profile_id: 'profile-tuan', group_id: 'expense-1', name: 'Lê Tuấn' },
      { id: 'long-expense', profile_id: 'profile-long', group_id: 'expense-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan'],
      expenses: [],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      members: ['expense-tuan', 'long-expense'],
      expenses: [{
        id: 'expense-july',
        title: 'Chi tiêu tháng 7',
        amount: 100000,
        date: '2026-07-01',
        expense_date: '2026-07-01',
        paidBy: 'long-expense',
        paid_by_member_id: 'long-expense',
        participants: ['expense-tuan', 'long-expense'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')

    expect(result.totalBalance).toBe(-50000)
    const lifeSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(result.cappedSourceBreakdown.map(row => row.sourceId)).toContain('life-1')
    expect(lifeSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: 0,
    })
  })

  test('does not apply legacy name payment to other June sources', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Viếng đám bố Hưng',
        amount: 400000,
        date: '2026-06-21',
        expense_date: '2026-06-21',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'pickle-paid-june',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 6 · 2026', memberName: 'Lê Tuấn', amount: 200000 },
        created_at: '2026-06-30T12:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')
    const source = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')
    const transaction = result.transactions.find(row => row.id === 'life-june-expense')

    expect(source).toMatchObject({ sourceLabel: 'Lấy vk để trưởng thành', amount: -200000 })
    expect(transaction).toMatchObject({ title: 'Viếng đám bố Hưng', amount: -200000 })
  })

  test('carries unpaid cross-group June debt into July when only pickleball was paid', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Viếng đám bố Hưng',
        amount: 1012500,
        date: '2026-06-21',
        expense_date: '2026-06-21',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'pickle-paid-june',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'pickle-tuan',
        member_id: 'pickle-tuan',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 6 · 2026', memberName: 'Lê Tuấn', amount: 668082 },
        created_at: '2026-07-01T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
      monthSettlements: [{
        id: 'pickle-june-settlement',
        group_id: 'pickle-1',
        member_id: 'pickle-tuan',
        month: '2026-06',
        amount: 668082,
      }],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const lifeSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(lifeSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      memberId: 'life-tuan',
      amount: -506250,
      monthBreakdown: [{ month: '2026-06', label: 'Tháng 6', amount: -506250 }],
    })
  })

  test('does not turn a zero confirmed group notice into a settlement cutoff', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Viếng đám bố Hưng',
        amount: 1012500,
        date: '2026-06-21',
        expense_date: '2026-06-21',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'life-empty-confirmed',
        type: 'payment_submitted',
        group_id: 'life-1',
        actor_member_id: 'life-tuan',
        member_id: 'life-tuan',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 6 · 2026', memberName: 'Lê Tuấn', amount: 0 },
        created_at: '2026-07-01T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const lifeSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(lifeSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: -506250,
      monthBreakdown: [{ month: '2026-06', label: 'Tháng 6', amount: -506250 }],
    })
  })

  test('does not turn a confirmed group notice without covered sources into a settlement cutoff', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Viếng đám bố Hưng',
        amount: 1012500,
        date: '2026-06-21',
        expense_date: '2026-06-21',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'life-confirmed-without-sources',
        type: 'payment_submitted',
        group_id: 'life-1',
        actor_member_id: 'life-tuan',
        member_id: 'life-tuan',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 7 · 2026', memberName: 'Lê Tuấn', amount: 506250 },
        created_at: '2026-07-02T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const lifeSource = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(lifeSource).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: -506250,
      monthBreakdown: [{ month: '2026-06', label: 'Tháng 6', amount: -506250 }],
    })
  })

  test('counts cross-group source when participants are Supabase rows', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Viếng đám bố Hưng',
        amount: 400000,
        date: '2026-06-21',
        expense_date: '2026-06-21',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: [
          { expense_id: 'life-june-expense', member_id: 'life-tuan' },
          { expense_id: 'life-june-expense', member_id: 'long-life' },
        ],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')
    const source = result.cappedSourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(source).toMatchObject({ sourceLabel: 'Lấy vk để trưởng thành', amount: -200000 })
  })

  test('counts cross-group expense source when payer is outside group members', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-outside', profile_id: 'profile-long', group_id: 'other-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan'],
      expenses: [{
        id: 'life-june-expense',
        title: 'Viếng đám bố Hưng',
        amount: 200000,
        date: '2026-06-21',
        expense_date: '2026-06-21',
        paidBy: 'long-outside',
        paid_by_member_id: 'long-outside',
        participants: ['life-tuan'],
        splits: [{ memberId: 'life-tuan', amount: 200000 }],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'life-1')
    const transaction = result.transactions.find(row => row.id === 'life-june-expense')

    expect(source).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: -200000,
      monthBreakdown: [{ month: '2026-06', label: 'Tháng 6', amount: -200000 }],
    })
    expect(transaction).toBeUndefined()
  })

  test('scopes explicit covered source payment to notice month', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn' },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [
        {
          id: 'life-may-expense',
          title: 'Chi tiêu tháng 5',
          amount: 200000,
          date: '2026-05-20',
          expense_date: '2026-05-20',
          paidBy: 'long-life',
          paid_by_member_id: 'long-life',
          participants: ['life-tuan', 'long-life'],
        },
        {
          id: 'life-july-expense',
          title: 'Chi tiêu tháng 7',
          amount: 100000,
          date: '2026-07-02',
          expense_date: '2026-07-02',
          paidBy: 'long-life',
          paid_by_member_id: 'long-life',
          participants: ['life-tuan', 'long-life'],
        },
      ],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [{
        id: 'life-paid-may',
        type: 'payment_submitted',
        actor_member_id: 'life-tuan',
        member_id: 'life-tuan',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 5 · 2026',
          amount: 100000,
          coveredSources: [{ sourceId: 'life-1', sourceType: 'group', sourceLabel: 'Lấy vk để trưởng thành', memberId: 'life-tuan', amount: -100000 }],
        },
        created_at: '2026-05-31T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'life-1')

    expect(source).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      amount: -50000,
      paidAmount: 100000,
      monthBreakdown: [{ month: '2026-07', label: 'Tháng 7', amount: -50000 }],
    })
  })

  test('keeps source balance for profile member disabled from new expenses', () => {
    const members = [
      { id: 'pickle-tuan', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'life-tuan', profile_id: 'profile-tuan', group_id: 'life-1', name: 'Lê Tuấn', expense_active: false },
      { id: 'long-life', profile_id: 'profile-long', group_id: 'life-1', name: 'Hoàng Long' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['pickle-tuan'],
      expenses: [],
    }, {
      id: 'life-1',
      name: 'Lấy vk để trưởng thành',
      members: ['life-tuan', 'long-life'],
      expenses: [{
        id: 'life-july-expense',
        title: 'Chi tiêu tháng 7',
        amount: 100000,
        date: '2026-07-02',
        expense_date: '2026-07-02',
        paidBy: 'long-life',
        paid_by_member_id: 'long-life',
        participants: ['life-tuan', 'long-life'],
      }],
    }]
    const state = {
      currentUserId: 'pickle-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'pickle-tuan', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'life-1')
    const transaction = result.transactions.find(row => row.id === 'life-july-expense')

    expect(transaction).toMatchObject({ amount: -50000, currentMemberId: 'life-tuan', isMine: true })
    expect(source).toMatchObject({
      sourceLabel: 'Lấy vk để trưởng thành',
      memberId: 'life-tuan',
      amount: -50000,
      monthBreakdown: [{ month: '2026-07', label: 'Tháng 7', amount: -50000 }],
    })
  })

  test('uses last confirmed checkpoint as payment balance start', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'payer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Payer One' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'payer-1'],
      expenses: [
        {
          id: 'old-expense',
          amount: 100000,
          expense_date: '2026-06-20',
          paid_by_member_id: 'payer-1',
          participants: ['member-1', 'payer-1'],
        },
        {
          id: 'new-expense',
          amount: 80000,
          expense_date: '2026-07-02',
          paid_by_member_id: 'payer-1',
          participants: ['member-1', 'payer-1'],
        },
      ],
    }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [{
        id: 'checkpoint-1',
        group_id: 'group-1',
        member_id: 'member-1',
        period_end: '2026-07-01T00:00:00.000Z',
        confirmed_at: '2026-07-01T00:05:00.000Z',
        status: 'confirmed',
      }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-08')

    expect(result.totalBalance).toBe(-40000)
    expect(result.paymentSummary.netBalance).toBe(-40000)
    expect(result.prevMonthUnpaid).toMatchObject({ label: 'Còn nợ từ 01/07/2026' })
  })

  test('uses checkpoint cutoff per group member for same profile', () => {
    const members = [
      { id: 'member-food', profile_id: 'profile-1', group_id: 'food-group', name: 'Lê Tuấn' },
      { id: 'payer-food', profile_id: 'profile-2', group_id: 'food-group', name: 'Payer Food' },
      { id: 'member-trip', profile_id: 'profile-1', group_id: 'trip-group', name: 'Lê Tuấn' },
      { id: 'payer-trip', profile_id: 'profile-3', group_id: 'trip-group', name: 'Payer Trip' },
    ]
    const groups = [
      {
        id: 'food-group',
        name: 'Food',
        members: ['member-food', 'payer-food'],
        expenses: [
          {
            id: 'food-old',
            amount: 100000,
            expense_date: '2026-06-20',
            paid_by_member_id: 'payer-food',
            participants: ['member-food', 'payer-food'],
          },
          {
            id: 'food-new',
            amount: 80000,
            expense_date: '2026-07-02',
            paid_by_member_id: 'payer-food',
            participants: ['member-food', 'payer-food'],
          },
        ],
      },
      {
        id: 'trip-group',
        name: 'Trip',
        members: ['member-trip', 'payer-trip'],
        expenses: [{
          id: 'trip-old',
          amount: 60000,
          expense_date: '2026-06-25',
          paid_by_member_id: 'payer-trip',
          participants: ['member-trip', 'payer-trip'],
        }],
      },
    ]
    const state = {
      currentUserId: 'member-food',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'food-group',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [{
        id: 'checkpoint-food',
        group_id: 'food-group',
        member_id: 'member-food',
        period_end: '2026-07-01T00:00:00.000Z',
        confirmed_at: '2026-07-01T00:05:00.000Z',
        status: 'confirmed',
      }],
    }

    const result = buildHomeData(state, 'member-food', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-08')

    expect(result.totalBalance).toBe(-70000)
    expect(result.sourceBreakdown).toEqual([
      expect.objectContaining({ sourceId: 'food-group', memberId: 'member-food', amount: -40000 }),
      expect.objectContaining({ sourceId: 'trip-group', memberId: 'member-trip', amount: -30000 }),
    ])
  })

  test('does not apply same-name checkpoint from another profile to pickleball debt', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'legacy-member-1', profile_id: 'legacy-profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'legacy-member-1', 'treasurer-1'],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [{
          id: 'ticket-1',
          group_id: 'pickle-1',
          year_month: '2026-05',
          session_date: '2026-05-10',
          total_amount: 100000,
          member_ids: ['member-1', 'treasurer-1'],
          status: 'team_fund',
        }],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentProfileId: 'profile-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [{
        id: 'legacy-checkpoint',
        group_id: 'pickle-1',
        member_id: 'legacy-member-1',
        period_end: '2026-05-31T23:59:59.999Z',
        confirmed_at: '2026-05-31T23:59:59.999Z',
        status: 'confirmed',
      }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-05')

    expect(result.cappedSourceBreakdown).toEqual([
      expect.objectContaining({
        sourceId: 'pickle-1',
        sourceType: 'pickleball',
        amount: -50000,
      }),
    ])
  })

  test('adds source month breakdown without changing total amount', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'payer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Payer One' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'payer-1'],
      expenses: [
        {
          id: 'may-expense',
          amount: 100000,
          expense_date: '2026-05-20',
          paid_by_member_id: 'payer-1',
          participants: ['member-1', 'payer-1'],
        },
        {
          id: 'june-expense',
          amount: 60000,
          expense_date: '2026-06-20',
          paid_by_member_id: 'payer-1',
          participants: ['member-1', 'payer-1'],
        },
      ],
    }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'group-1')

    expect(source.amount).toBe(-80000)
    expect(source.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -50000 },
      { month: '2026-06', label: 'Tháng 6', amount: -30000 },
    ])
    expect(source.monthBreakdown.reduce((sum, row) => sum + row.amount, 0)).toBe(source.amount)
  })

  test('caps member home hero balance to viewed month while payment sheet keeps full debt', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'june-expense',
          amount: 100000,
          expense_date: '2026-06-20',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'july-expense',
          amount: 60000,
          expense_date: '2026-07-02',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const june = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')
    const july = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')

    expect(june.cappedTotalBalance).toBe(-50000)
    expect(june.totalBalance).toBe(-80000)
    expect(june.paymentSummary.netBalance).toBe(-80000)
    expect(june.cappedSourceBreakdown.find(row => row.sourceId === 'group-1')).toMatchObject({
      amount: -50000,
      monthBreakdown: [{ month: '2026-06', label: 'Tháng 6', amount: -50000 }],
    })
    expect(june.sourceBreakdown.find(row => row.sourceId === 'group-1')).toMatchObject({
      amount: -80000,
      monthBreakdown: [
        { month: '2026-06', label: 'Tháng 6', amount: -50000 },
        { month: '2026-07', label: 'Tháng 7', amount: -30000 },
      ],
    })
    expect(july.cappedTotalBalance).toBe(-80000)
    expect(july.totalBalance).toBe(-80000)
    expect(july.paymentSummary.netBalance).toBe(-80000)
    expect(july.cappedSourceBreakdown.find(row => row.sourceId === 'group-1')).toMatchObject({
      amount: -80000,
      monthBreakdown: [
        { month: '2026-06', label: 'Tháng 6', amount: -50000 },
        { month: '2026-07', label: 'Tháng 7', amount: -30000 },
      ],
    })
    expect(june.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-1')).toMatchObject({ amount: 50000, status: 'unpaid' })
  })

  test('uses explicit confirmed payment coverage across later months', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'june-expense',
          amount: 100000,
          expense_date: '2026-06-20T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'july-expense',
          amount: 60000,
          expense_date: '2026-07-02T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-june',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 6 · 2026',
          amount: 50000,
          coveredSources: [{ sourceId: 'group-1', memberId: 'member-1', amount: -50000, month: '2026-06' }],
        },
        created_at: '2026-06-30T12:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceId === 'group-1')
    const progressRow = result.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-1')

    expect(result.totalBalance).toBe(-30000)
    expect(source).toMatchObject({ amount: -30000 })
    expect(progressRow).toMatchObject({ amount: 30000, status: 'unpaid' })
  })

  test('clears confirmed mixed debt and credit month rows by signed coverage', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'member-2', profile_id: 'profile-2', group_id: 'group-1', name: 'Member Two' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'member-2'],
      expenses: [
        {
          id: 'june-expense',
          amount: 1316332,
          expense_date: '2026-06-20T12:00:00.000Z',
          paid_by_member_id: 'member-2',
          participants: ['member-1', 'member-2'],
        },
        {
          id: 'july-credit',
          amount: 464700,
          expense_date: '2026-07-02T12:00:00.000Z',
          paid_by_member_id: 'member-1',
          participants: ['member-1', 'member-2'],
        },
      ],
    }]
    const baseState = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const open = buildHomeData(baseState, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    expect(open.totalBalance).toBe(-425816)
    expect(open.sourceBreakdown.find(row => row.sourceId === 'group-1')).toMatchObject({
      amount: -425816,
      monthBreakdown: [
        { month: '2026-06', label: 'Tháng 6', amount: -658166 },
        { month: '2026-07', label: 'Tháng 7', amount: 232350 },
      ],
    })

    const confirmed = buildHomeData({
      ...baseState,
      notifications: [{
        id: 'payment-confirmed-mixed',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 6, Tháng 7',
          amount: 425816,
          coveredSources: [
            { sourceId: 'group-1', memberId: 'member-1', profileId: 'profile-1', month: '2026-06', amount: -658166 },
            { sourceId: 'group-1', memberId: 'member-1', profileId: 'profile-1', month: '2026-07', amount: 232350 },
          ],
        },
        created_at: '2026-07-05T12:00:00.000Z',
      }],
    }, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const progressRow = confirmed.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-1')

    expect(confirmed.totalBalance).toBe(0)
    expect(confirmed.sourceBreakdown.find(row => row.sourceId === 'group-1')).toMatchObject({ amount: 0 })
    expect(progressRow).toBeUndefined()
  })

  test('keeps treasurer outstanding stable across month views after explicit confirmed payment', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'settled-july-expense',
          amount: 100000,
          expense_date: '2026-07-02T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'remaining-july-expense',
          amount: 40000,
          expense_date: '2026-07-20T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }]
    const state = {
      currentUserId: 'treasurer-1',
      currentUserName: 'Treasurer One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-july',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 7 · 2026',
          amount: 50000,
          coveredSources: [{ sourceId: 'group-1', memberId: 'member-1', amount: -50000, month: '2026-07' }],
        },
        created_at: '2026-07-10T12:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const july = buildHomeData(state, 'treasurer-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const august = buildHomeData(state, 'treasurer-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-08')
    const outstanding = rows => rows
      .filter(row => ['pending', 'unpaid'].includes(String(row.status).toLowerCase()))
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0)

    expect(outstanding(july.paymentSummary.paymentProgress)).toBe(20000)
    expect(outstanding(august.paymentSummary.paymentProgress)).toBe(20000)
    expect(july.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-1')).toMatchObject({ amount: 20000, status: 'unpaid' })
    expect(august.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-1')).toMatchObject({ amount: 20000, status: 'unpaid' })
  })

  test('shows only post-confirmation debt after explicit confirmed payment', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'confirmed-may-expense',
          amount: 1789180,
          expense_date: '2026-05-20T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'post-confirm-expense',
          amount: 200000,
          expense_date: '2026-07-05T06:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }]
    const state = {
      currentUserId: 'treasurer-1',
      currentUserName: 'Treasurer One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-may',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 5 · 2026',
          amount: 894590,
          coveredSources: [{ sourceId: 'group-1', memberId: 'member-1', amount: -894590, month: '2026-05' }],
        },
        created_at: '2026-07-05T05:11:13.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'treasurer-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')
    const progressRow = result.paymentSummary.paymentProgress.find(row => row.profileId === 'profile-1')

    expect(progressRow).toMatchObject({ amount: 100000, status: 'unpaid' })
    expect(progressRow.amount).not.toBe(994590)
  })

  test('pay-for rows hide settled months the target profile no longer owes', () => {
    const members = [
      { id: 'tuan-pickle', profile_id: 'profile-tuan', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'myt-pickle', profile_id: 'profile-myt', group_id: 'pickle-1', name: 'Mýt' },
      { id: 'treasurer-pickle', profile_id: 'profile-treasurer', group_id: 'pickle-1', name: 'Thủ quỹ', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['tuan-pickle', 'myt-pickle', 'treasurer-pickle'],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'myt-may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 600000, member_ids: ['myt-pickle', 'treasurer-pickle', 'tuan-pickle'], advancer_id: 'treasurer-pickle', status: 'unpaid' },
          { id: 'myt-june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 600000, member_ids: ['myt-pickle', 'treasurer-pickle', 'tuan-pickle'], advancer_id: 'treasurer-pickle', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'tuan-pickle',
      currentProfileId: 'profile-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
      monthSettlements: [{
        id: 'myt-settled-may',
        member_id: 'myt-pickle',
        group_id: 'pickle-1',
        month: '2026-05',
        expense_id: 'myt-may-settlement',
        expenses: { amount: 200000 },
      }],
    }

    const tuanHome = buildHomeData(state, 'tuan-pickle', members, groups, {}, pickleballState, '2026-06')
    const mytHome = buildHomeData({ ...state, currentUserId: 'myt-pickle', currentProfileId: 'profile-myt', currentUserName: 'Mýt' }, 'myt-pickle', members, groups, {}, pickleballState, '2026-06')
    const mytPayFor = tuanHome.paymentSummary.payForRows.find(row => row.profileId === 'profile-myt')

    expect(mytHome.sourceBreakdown.find(row => row.sourceType === 'pickleball').monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -200000 },
    ])
    expect(mytPayFor.amount).toBe(-200000)
    expect(mytPayFor.sources.find(row => row.sourceType === 'pickleball').monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -200000 },
    ])
  })

  test('pay-for rows hide settled group months the target profile no longer owes', () => {
    const members = [
      { id: 'tuan-halong', profile_id: 'profile-tuan', group_id: 'halong-1', name: 'Lê Tuấn' },
      { id: 'myt-halong', profile_id: 'profile-myt', group_id: 'halong-1', name: 'Mýt' },
      { id: 'payer-halong', profile_id: 'profile-payer', group_id: 'halong-1', name: 'Người ứng' },
    ]
    const groups = [{
      id: 'halong-1',
      name: 'Hạ Long thả gió',
      members: ['tuan-halong', 'myt-halong', 'payer-halong'],
      expenses: [
        { id: 'myt-may', amount: 200000, expense_date: '2026-05-10', paid_by_member_id: 'payer-halong', participants: ['myt-halong', 'payer-halong'] },
        { id: 'myt-june', amount: 200000, expense_date: '2026-06-10', paid_by_member_id: 'payer-halong', participants: ['myt-halong', 'payer-halong'] },
      ],
    }]
    const state = {
      currentUserId: 'tuan-halong',
      currentProfileId: 'profile-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'halong-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
      monthSettlements: [{
        id: 'myt-halong-may-settled',
        member_id: 'myt-halong',
        group_id: 'halong-1',
        month: '2026-05',
        expense_id: 'myt-halong-may-settlement',
        expenses: { amount: 100000 },
      }],
    }

    const tuanHome = buildHomeData(state, 'tuan-halong', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')
    const mytPayFor = tuanHome.paymentSummary.payForRows.find(row => row.profileId === 'profile-myt')

    expect(mytPayFor.amount).toBe(-100000)
    expect(mytPayFor.sources.find(row => row.sourceType === 'group').monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -100000 },
    ])
  })

  test('pay-for rows hide confirmed proxy-paid source months without source member id', () => {
    const members = [
      { id: 'tuan-halong', profile_id: 'profile-tuan', group_id: 'halong-1', name: 'Lê Tuấn' },
      { id: 'myt-halong', profile_id: 'profile-myt', group_id: 'halong-1', name: 'Mýt' },
      { id: 'payer-halong', profile_id: 'profile-payer', group_id: 'halong-1', name: 'Người ứng' },
    ]
    const groups = [{
      id: 'halong-1',
      name: 'Hạ Long thả gió',
      members: ['tuan-halong', 'myt-halong', 'payer-halong'],
      expenses: [
        { id: 'myt-may', amount: 200000, expense_date: '2026-05-10', paid_by_member_id: 'payer-halong', participants: ['myt-halong', 'payer-halong'] },
        { id: 'myt-june', amount: 200000, expense_date: '2026-06-10', paid_by_member_id: 'payer-halong', participants: ['myt-halong', 'payer-halong'] },
      ],
    }]
    const state = {
      currentUserId: 'tuan-halong',
      currentProfileId: 'profile-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'halong-1',
      members,
      groups,
      notifications: [{
        id: 'tuan-paid-for-myt-may',
        type: 'payment_submitted',
        actor_member_id: 'tuan-halong',
        member_id: 'payer-halong',
        group_id: 'halong-1',
        metadata: {
          status: 'confirmed',
          amount: 100000,
          memberName: 'Lê Tuấn',
          coveredMembers: [{ profileId: 'profile-myt', memberId: 'myt-halong', name: 'Mýt', amount: 100000 }],
          coveredSources: [{ sourceId: 'halong-1', sourceType: 'group', sourceLabel: 'Hạ Long thả gió', month: '2026-05', amount: -100000 }],
          monthLabel: 'Tháng 5 · 2026',
        },
      }],
      settlementCheckpoints: [],
      monthSettlements: [],
    }

    const tuanHome = buildHomeData(state, 'tuan-halong', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')
    const mytPayFor = tuanHome.paymentSummary.payForRows.find(row => row.profileId === 'profile-myt')

    expect(mytPayFor.amount).toBe(-100000)
    expect(mytPayFor.sources.find(row => row.sourceType === 'group').monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -100000 },
    ])
  })

  test('pay-for rows hide treasurer-confirmed target member source months', () => {
    const members = [
      { id: 'tuan-halong', profile_id: 'profile-tuan', group_id: 'halong-1', name: 'Lê Tuấn' },
      { id: 'myt-halong', profile_id: 'profile-myt', group_id: 'halong-1', name: 'Mýt' },
      { id: 'treasurer-halong', profile_id: 'profile-treasurer', group_id: 'halong-1', name: 'Thủ quỹ', role: 'treasurer' },
    ]
    const groups = [{
      id: 'halong-1',
      name: 'Hạ Long thả gió',
      members: ['tuan-halong', 'myt-halong', 'treasurer-halong'],
      expenses: [
        { id: 'myt-may', amount: 200000, expense_date: '2026-05-10', paid_by_member_id: 'treasurer-halong', participants: ['myt-halong', 'treasurer-halong'] },
        { id: 'myt-june', amount: 200000, expense_date: '2026-06-10', paid_by_member_id: 'treasurer-halong', participants: ['myt-halong', 'treasurer-halong'] },
      ],
    }]
    const state = {
      currentUserId: 'tuan-halong',
      currentProfileId: 'profile-tuan',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'halong-1',
      members,
      groups,
      notifications: [{
        id: 'treasurer-confirmed-myt-may',
        type: 'payment_confirmed',
        actor_member_id: 'treasurer-halong',
        member_id: 'myt-halong',
        group_id: 'halong-1',
        metadata: {
          status: 'confirmed',
          amount: 100000,
          memberName: 'Mýt',
          coveredSources: [{ sourceId: 'halong-1', sourceType: 'group', sourceLabel: 'Hạ Long thả gió', month: '2026-05', amount: -100000 }],
          monthLabel: 'Tháng 5 · 2026',
        },
      }],
      settlementCheckpoints: [],
      monthSettlements: [],
    }

    const tuanHome = buildHomeData(state, 'tuan-halong', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')
    const mytPayFor = tuanHome.paymentSummary.payForRows.find(row => row.profileId === 'profile-myt')

    expect(mytPayFor.amount).toBe(-100000)
    expect(mytPayFor.sources.find(row => row.sourceType === 'group').monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -100000 },
    ])
  })

  test('keeps pickleball month residual after partial confirmed payment', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Phạm Tiến' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1628676, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1305128, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1242856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Phạm Tiến',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-may',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 7 · 2026',
          amount: 777352,
          coveredSources: [{ sourceId: 'pickle-1', sourceType: 'pickleball', sourceLabel: 'Virgo Pickleball 246', memberId: 'member-1', amount: -777352 }],
        },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')

    expect(source.amount).toBe(-1310978)
    expect(source.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -36986 },
      { month: '2026-06', label: 'Tháng 6', amount: -652564 },
      { month: '2026-07', label: 'Tháng 7', amount: -621428 },
    ])
    expect(result.cappedSourceBreakdown.find(row => row.sourceType === 'pickleball').monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -36986 },
      { month: '2026-06', label: 'Tháng 6', amount: -652564 },
      { month: '2026-07', label: 'Tháng 7', amount: -621428 },
    ])
  })

  test('keeps pickleball residual separate from linked expense month settlement', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Phạm Tiến' },
      { id: 'expense-member-1', profile_id: 'profile-1', group_id: 'expense-1', name: 'Phạm Tiến' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Treasurer One', role: 'treasurer' },
      { id: 'expense-treasurer-1', profile_id: 'profile-2', group_id: 'expense-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      linked_pickleball_group_id: 'pickle-1',
      members: ['expense-member-1', 'expense-treasurer-1'],
      expenses: [{
        id: 'carry-expense-1',
        amount: 36986,
        expense_date: '2026-06-01T00:00:00.000Z',
        paid_by_member_id: 'expense-treasurer-1',
        participants: ['expense-member-1'],
      }],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1628676, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1305128, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1242856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Phạm Tiến',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-may',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 7 · 2026',
          amount: 777352,
          coveredSources: [{ sourceId: 'pickle-1', sourceType: 'pickleball', sourceLabel: 'Virgo Pickleball 246', memberId: 'member-1', amount: -777352 }],
        },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
      monthSettlements: [{
        id: 'settled-may',
        member_id: 'member-1',
        group_id: 'expense-1',
        month: '2026-05',
        expense_id: 'carry-expense-1',
        expenses: { amount: 36986 },
      }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')
    const expenseSource = result.sourceBreakdown.find(row => row.sourceId === 'expense-1')

    expect(pickleballSource.amount).toBe(-1310978)
    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -36986 },
      { month: '2026-06', label: 'Tháng 6', amount: -652564 },
      { month: '2026-07', label: 'Tháng 7', amount: -621428 },
    ])
    expect(expenseSource.monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -36986 },
    ])
  })

  test('does not settle pickleball debt from linked group month settlement', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Tuấn' },
      { id: 'expense-member-1', profile_id: 'profile-1', group_id: 'expense-1', name: 'Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Treasurer One', role: 'treasurer' },
      { id: 'expense-treasurer-1', profile_id: 'profile-2', group_id: 'expense-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }, {
      id: 'expense-1',
      name: 'Chi tiêu Virgo 246',
      linked_pickleball_group_id: 'pickle-1',
      members: ['expense-member-1', 'expense-treasurer-1'],
      expenses: [{
        id: 'carry-expense-1',
        amount: 36986,
        expense_date: '2026-06-01T00:00:00.000Z',
        paid_by_member_id: 'expense-treasurer-1',
        participants: ['expense-member-1'],
      }],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1628676, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1305128, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
      monthSettlements: [{
        id: 'settled-may',
        member_id: 'expense-member-1',
        group_id: 'expense-1',
        month: '2026-05',
        expense_id: 'carry-expense-1',
        expenses: { amount: 36986 },
      }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')
    const expenseSource = result.sourceBreakdown.find(row => row.sourceId === 'expense-1')

    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -814338 },
      { month: '2026-06', label: 'Tháng 6', amount: -652564 },
    ])
    expect(expenseSource.monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -36986 },
    ])
  })

  test('keeps treasurer-confirmed pickleball payment without explicit sources unpaid', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Phạm Tiến' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1554704, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1305128, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1242856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Phạm Tiến',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'treasurer-confirmed-may',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'treasurer-1',
        member_id: 'member-1',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 5 · 2026', amount: 777352, memberName: 'Phạm Tiến' },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')

    expect(source.amount).toBe(-2051344)
    expect(source.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -777352 },
      { month: '2026-06', label: 'Tháng 6', amount: -652564 },
      { month: '2026-07', label: 'Tháng 7', amount: -621428 },
    ])
  })

  test('matches legacy confirmed pickleball source without source type', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1554704, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1305128, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1242856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'legacy-confirmed-may',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 5 · 2026',
          amount: 777352,
          coveredSources: [{ sourceId: 'pickle-1', sourceLabel: 'Virgo Pickleball 246', memberId: 'member-1', amount: -777352, month: '2026-05' }],
        },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const source = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')

    expect(source.amount).toBe(-1273992)
    expect(source.monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -652564 },
      { month: '2026-07', label: 'Tháng 7', amount: -621428 },
    ])
  })

  test('matches legacy confirmed source by month amount when source identity is missing', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }, {
      id: 'group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['member-1', 'treasurer-1'],
      expenses: [{
        id: 'may-group-expense',
        amount: 200000,
        expense_date: '2026-05-15T12:00:00.000Z',
        paid_by_member_id: 'treasurer-1',
        participants: ['member-1', 'treasurer-1'],
      }],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1589180, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1336164, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1092856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'identity-missing-confirmed-may',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'treasurer-1',
        member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 5 · 2026',
          amount: 794590,
          coveredSources: [{ memberId: 'member-1', amount: -794590 }],
        },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')

    expect(pickleballSource.amount).toBe(-1214510)
    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -668082 },
      { month: '2026-07', label: 'Tháng 7', amount: -546428 },
    ])
    expect(pickleballSource.monthBreakdown.some(row => row.month === '2026-05')).toBe(false)
  })

  test('keeps pickleball debt when confirmed checkpoint only matches another profile name', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'legacy-member-1', profile_id: 'legacy-profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'legacy-member-1', 'treasurer-1'],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1589180, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1336164, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1092856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [{
        id: 'legacy-checkpoint-may',
        group_id: 'pickle-1',
        member_id: 'legacy-member-1',
        period_end: '2026-05-31T23:59:59.999Z',
        confirmed_at: '2026-07-01T00:05:00.000Z',
        amount: 794590,
        status: 'confirmed',
      }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')
    expect(pickleballSource.amount).toBe(-2009100)
    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -794590 },
      { month: '2026-06', label: 'Tháng 6', amount: -668082 },
      { month: '2026-07', label: 'Tháng 7', amount: -546428 },
    ])
  })

  test('keeps confirmed pickleball payment without explicit coverage unpaid when paid member id differs but name matches', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'legacy-member-1', profile_id: 'legacy-profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'legacy-member-1', 'treasurer-1'],
    }, {
      id: 'group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['member-1', 'treasurer-1'],
      expenses: [{
        id: 'may-group-expense',
        amount: 200000,
        expense_date: '2026-05-15T12:00:00.000Z',
        paid_by_member_id: 'treasurer-1',
        participants: ['member-1', 'treasurer-1'],
      }],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1589180, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1336164, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1092856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'treasurer-confirmed-may-legacy-member',
        type: 'payment_submitted',
        group_id: 'pickle-1',
        actor_member_id: 'legacy-member-1',
        member_id: 'legacy-member-1',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 5 · 2026', amount: 794590, memberName: 'Lê Tuấn' },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')
    expect(pickleballSource.amount).toBe(-2009100)
    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -794590 },
      { month: '2026-06', label: 'Tháng 6', amount: -668082 },
      { month: '2026-07', label: 'Tháng 7', amount: -546428 },
    ])
  })

  test('keeps legacy cross-group pickleball payment without explicit coverage unpaid', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'legacy-member-1', profile_id: 'legacy-profile-1', group_id: 'legacy-group-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }, {
      id: 'legacy-group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['legacy-member-1', 'treasurer-1'],
      expenses: [],
    }]
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1589180, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1336164, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1092856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [{
        id: 'live-confirmed-may-cross-group',
        type: 'payment_submitted',
        group_id: 'legacy-group-1',
        actor_member_id: 'legacy-member-1',
        member_id: 'legacy-member-1',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 5 · 2026', amount: 1266144, memberName: 'Lê Tuấn' },
        created_at: '2026-07-01T00:05:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')
    expect(pickleballSource.amount).toBe(-2009100)
    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -794590 },
      { month: '2026-06', label: 'Tháng 6', amount: -668082 },
      { month: '2026-07', label: 'Tháng 7', amount: -546428 },
    ])
  })

  test('keeps legacy cross-group pickleball state notice without explicit coverage unpaid', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'pickle-1', name: 'Lê Tuấn' },
      { id: 'legacy-member-1', profile_id: 'legacy-profile-1', group_id: 'legacy-group-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'pickle-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'pickle-1',
      name: 'Virgo Pickleball 246',
      kind: 'pickleball',
      members: ['member-1', 'treasurer-1'],
    }, {
      id: 'legacy-group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['legacy-member-1', 'treasurer-1'],
      expenses: [],
    }]
    const notification = {
      id: 'live-confirmed-may-cross-group',
      type: 'payment_submitted',
      group_id: 'legacy-group-1',
      actor_member_id: 'legacy-member-1',
      member_id: 'legacy-member-1',
      metadata: { status: 'confirmed', monthLabel: 'Tháng 5 · 2026', amount: 1266144, memberName: 'Lê Tuấn' },
      created_at: '2026-07-01T00:05:00.000Z',
    }
    const pickleballState = {
      currentGroupId: 'pickle-1',
      currentGroup: groups[0],
      members,
      groups,
      notifications: [notification],
      _allPickle: {
        externalTickets: [
          { id: 'may-ticket', group_id: 'pickle-1', year_month: '2026-05', session_date: '2026-05-20', total_amount: 1589180, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'june-ticket', group_id: 'pickle-1', year_month: '2026-06', session_date: '2026-06-20', total_amount: 1336164, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
          { id: 'july-ticket', group_id: 'pickle-1', year_month: '2026-07', session_date: '2026-07-20', total_amount: 1092856, member_ids: ['member-1', 'treasurer-1'], advancer_id: 'treasurer-1', status: 'unpaid' },
        ],
      },
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'pickle-1',
      pickleballGroupId: 'pickle-1',
      pickleballGroup: groups[0],
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, pickleballState, '2026-07')
    const pickleballSource = result.sourceBreakdown.find(row => row.sourceType === 'pickleball')
    expect(pickleballSource.amount).toBe(-2009100)
    expect(pickleballSource.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -794590 },
      { month: '2026-06', label: 'Tháng 6', amount: -668082 },
      { month: '2026-07', label: 'Tháng 7', amount: -546428 },
    ])
  })

  test('labels confirmed payment records with group name and month', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['member-1', 'treasurer-1'],
      expenses: [],
    }]
    const state = {
      currentUserId: 'treasurer-1',
      currentUserName: 'Hoàng Long',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-may',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: { status: 'confirmed', monthLabel: 'Tháng 5 · 2026', amount: 894590 },
        created_at: '2026-07-05T05:11:13.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'treasurer-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-05')

    expect(result.paymentRecords[0].sourceSummary).toBe('Lấy vk để trưởng thành · Tháng 5 · 2026')
    expect(result.paymentRecords[0].sourceSummary).not.toBe('Chưa rõ nguồn')
  })

  test('payment records follow covered source month instead of broad notice label', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['member-1', 'treasurer-1'],
      expenses: [],
    }]
    const state = {
      currentUserId: 'treasurer-1',
      currentUserName: 'Hoàng Long',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'payment-confirmed-may',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'confirmed',
          monthLabel: 'Tháng 6 · 2026',
          amount: 794590,
          memberName: 'Lê Tuấn',
          coveredSources: [{
            sourceId: 'group-1',
            sourceLabel: 'Lấy vk để trưởng thành',
            memberId: 'member-1',
            profileId: 'profile-1',
            month: '2026-05',
            amount: -794590,
          }],
        },
        created_at: '2026-07-05T05:11:13.000Z',
      }],
      settlementCheckpoints: [],
    }

    const mayResult = buildHomeData(state, 'treasurer-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-05')
    const juneResult = buildHomeData(state, 'treasurer-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')

    expect(mayResult.paymentRecords).toHaveLength(1)
    expect(mayResult.paymentRecords[0]).toMatchObject({ memberName: 'Lê Tuấn', status: 'confirmed' })
    expect(juneResult.paymentRecords).toHaveLength(0)
  })

  test('ignores pending payment notices whose covered source month differs from selected month', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Lê Tuấn' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Hoàng Long', role: 'treasurer' },
    ]
    const groups = [{
      id: 'group-1',
      name: 'Lấy vk để trưởng thành',
      members: ['member-1', 'treasurer-1'],
      expenses: [{
        id: 'may-expense',
        title: 'Tháng 5',
        amount: 200000,
        date: '2026-05-15',
        expense_date: '2026-05-15',
        paidBy: 'treasurer-1',
        paid_by_member_id: 'treasurer-1',
        participants: ['member-1', 'treasurer-1'],
      }, {
        id: 'june-expense',
        title: 'Tháng 6',
        amount: 200000,
        date: '2026-06-15',
        expense_date: '2026-06-15',
        paidBy: 'treasurer-1',
        paid_by_member_id: 'treasurer-1',
        participants: ['member-1', 'treasurer-1'],
      }],
    }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Lê Tuấn',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [{
        id: 'pending-may-mislabeled-june',
        type: 'payment_submitted',
        group_id: 'group-1',
        actor_member_id: 'member-1',
        metadata: {
          status: 'pending',
          monthLabel: 'Tháng 6 · 2026',
          amount: 100000,
          coveredSources: [{
            sourceType: 'group',
            sourceId: 'group-1',
            sourceLabel: 'Lấy vk để trưởng thành',
            memberId: 'member-1',
            profileId: 'profile-1',
            month: '2026-05',
            amount: -100000,
          }],
        },
        created_at: '2026-06-20T00:00:00.000Z',
      }],
      settlementCheckpoints: [],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-06')

    expect(result.paymentSummary.paymentStatus).toBe('')
    expect(result.paymentSummary.pendingAmount).toBe(0)
  })

  test('exposes pending settlement checkpoint state for member and treasurer', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const groups = [{ id: 'group-1', name: 'Group', members: ['member-1', 'treasurer-1'], expenses: [] }]
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups,
      notifications: [],
      settlementCheckpoints: [{
        id: 'checkpoint-1',
        group_id: 'group-1',
        member_id: 'member-1',
        amount: 40000,
        status: 'pending',
        period_start: '2026-07-01T00:00:00.000Z',
        period_end: '2026-07-02T00:00:00.000Z',
        created_at: '2026-07-02T00:00:00.000Z',
      }],
    }

    const result = buildHomeData(state, 'member-1', members, groups, {}, { currentGroup: null, sessions: [], configs: [] }, '2026-07')

    expect(result.pendingSettlementCheckpoint).toMatchObject({ id: 'checkpoint-1', amount: 40000, status: 'pending' })
    expect(result.pendingSettlementCheckpoints).toEqual([
      expect.objectContaining({ id: 'checkpoint-1', amount: 40000, status: 'pending' }),
    ])
    expect(result.pendingCheckpointsForTreasurer).toEqual([
      expect.objectContaining({ id: 'checkpoint-1', memberName: 'Member One', amount: 40000 }),
    ])
  })

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

describe('buildGroupDetailData', () => {
  test('uses checkpoint cutoff through viewed month for member balances', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const group = {
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'april-settled',
          amount: 100000,
          expense_date: '2026-04-20T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'june-open',
          amount: 200000,
          expense_date: '2026-06-10T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups: [group],
      notifications: [],
      settlementCheckpoints: [{
        id: 'checkpoint-1',
        group_id: 'group-1',
        member_id: 'member-1',
        status: 'confirmed',
        period_end: '2026-05-01T00:00:00.000Z',
        confirmed_at: '2026-05-01T00:05:00.000Z',
      }],
    }

    const may = buildGroupDetailData(group, 'member-1', members, 'Member One', '2026-05', [], state)
    const june = buildGroupDetailData(group, 'member-1', members, 'Member One', '2026-06', [], state)

    expect(may.balance).toBe(0)
    expect(may.members.find(member => member.id === 'member-1')).toMatchObject({
      balance: 0,
      monthBreakdown: [],
    })
    expect(june.balance).toBe(-100000)
    expect(june.members.find(member => member.id === 'member-1')).toMatchObject({
      balance: -100000,
      monthBreakdown: [{ month: '2026-06', label: 'Tháng 6', amount: -100000 }],
    })
  })

  test('accumulates prior unconfirmed months and exposes month breakdown', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const group = {
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'may-open',
          amount: 100000,
          expense_date: '2026-05-20T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'june-open',
          amount: 60000,
          expense_date: '2026-06-10T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups: [group],
      notifications: [],
      settlementCheckpoints: [],
    }

    const result = buildGroupDetailData(group, 'member-1', members, 'Member One', '2026-06', [], state)
    const member = result.members.find(row => row.id === 'member-1')

    expect(result.balance).toBe(-80000)
    expect(member.balance).toBe(-80000)
    expect(member.monthBreakdown).toEqual([
      { month: '2026-05', label: 'Tháng 5', amount: -50000 },
      { month: '2026-06', label: 'Tháng 6', amount: -30000 },
    ])
  })

  test('hides settled source months from group detail balances', () => {
    const members = [
      { id: 'member-1', profile_id: 'profile-1', group_id: 'group-1', name: 'Member One' },
      { id: 'treasurer-1', profile_id: 'profile-2', group_id: 'group-1', name: 'Treasurer One', role: 'treasurer' },
    ]
    const group = {
      id: 'group-1',
      name: 'Group',
      members: ['member-1', 'treasurer-1'],
      expenses: [
        {
          id: 'may-settled',
          amount: 100000,
          expense_date: '2026-05-20T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
        {
          id: 'june-open',
          amount: 60000,
          expense_date: '2026-06-10T12:00:00.000Z',
          paid_by_member_id: 'treasurer-1',
          participants: ['member-1', 'treasurer-1'],
        },
      ],
    }
    const state = {
      currentUserId: 'member-1',
      currentUserName: 'Member One',
      currentGroupId: 'group-1',
      members,
      groups: [group],
      notifications: [],
      settlementCheckpoints: [],
      monthSettlements: [{ id: 'settlement-1', member_id: 'member-1', group_id: 'group-1', month: '2026-05' }],
    }

    const result = buildGroupDetailData(group, 'member-1', members, 'Member One', '2026-06', [], state)
    const member = result.members.find(row => row.id === 'member-1')

    expect(result.balance).toBe(-30000)
    expect(member.balance).toBe(-30000)
    expect(member.monthBreakdown).toEqual([
      { month: '2026-06', label: 'Tháng 6', amount: -30000 },
    ])
  })
})
