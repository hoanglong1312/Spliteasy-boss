import { describe, expect, test } from 'vitest'
import {
  attendanceByMemberId,
  effectiveSessionMemberIds,
  memberWaterShare,
  buildPersonalWaterSessionRows,
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
