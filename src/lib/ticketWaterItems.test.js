import { describe, expect, test } from 'vitest'
import {
  emptyWaterItems,
  hasWaterItemQuantities,
  normalizeWaterItems,
  resolveTicketWaterAmount,
  waterItemsTotal,
} from './ticketWaterItems.js'

describe('ticketWaterItems', () => {
  test('totals known drink prices', () => {
    expect(waterItemsTotal({ aquafina: 2, revive: 1, quang_hanh: 1 })).toBe(2 * 7000 + 10000 + 7000)
  })

  test('normalizes invalid values to zero counts', () => {
    expect(normalizeWaterItems({ aquafina: -2, revive: '3', junk: 9 })).toEqual({
      aquafina: 0,
      revive: 3,
      quang_hanh: 0,
    })
    expect(normalizeWaterItems(null)).toEqual(emptyWaterItems())
  })

  test('resolve prefers itemized total over legacy amount', () => {
    expect(resolveTicketWaterAmount({ aquafina: 1 }, 50000)).toBe(7000)
    expect(resolveTicketWaterAmount(emptyWaterItems(), 32000)).toBe(32000)
    expect(hasWaterItemQuantities({ revive: 2 })).toBe(true)
  })
})
