import { describe, expect, test } from 'vitest'
import {
  attendanceByMemberId,
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
