import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const source = readFileSync(new URL('./PickleballCalendar.jsx', import.meta.url), 'utf8')
const groupFunctions = source.slice(
  source.indexOf('function ticketMembers'),
  source.indexOf('function ticketMemberSummary'),
)
const ticketMemberGroups = new Function(`${groupFunctions}; return ticketMemberGroups;`)()

describe('ticketMemberGroups', () => {
  test('labels every explicitly monthly member as monthly', () => {
    const groups = ticketMemberGroups({
      memberChips: [
        { id: 'member-1', name: 'One' },
        { id: 'member-2', name: 'Two' },
      ],
      billedMemberIds: [],
      monthlyMemberIds: ['member-1', 'member-2'],
    })

    expect(groups).toEqual([{
      key: 'monthly',
      label: 'Vé tháng',
      members: [
        { id: 'member-1', name: 'One' },
        { id: 'member-2', name: 'Two' },
      ],
    }])
  })

  test('treats explicit empty flex groups as per-session', () => {
    const groups = ticketMemberGroups({
      memberChips: [{ id: 'member-1', name: 'One' }],
      billedMemberIds: [],
      monthlyMemberIds: [],
      totalAmount: 0,
      waterAmount: 30000,
    })

    expect(groups[0]).toMatchObject({
      key: 'per_session',
      label: 'Vé ngày',
    })
  })

  test('keeps water-only legacy tickets in monthly fallback', () => {
    const groups = ticketMemberGroups({
      memberChips: [{ id: 'member-1', name: 'One' }],
      totalAmount: 0,
      waterAmount: 30000,
    })

    expect(groups[0]).toMatchObject({
      key: 'monthly',
      label: 'Vé tháng',
    })
  })
})
