import { describe, expect, test } from 'vitest'
import {
  applyOwnerPaidFifoToWaterDays,
  formatWaterDayExportText,
  formatWaterItemsDetail,
  mergeWaterDayRow,
} from './waterDayExport.js'

describe('waterDayExport', () => {
  test('formats itemized drink detail', () => {
    expect(formatWaterItemsDetail({ aquafina: 3, revive: 4, quang_hanh: 0 })).toBe(
      'aqa x3, revi x4'
    )
  })

  test('formats copy text with daily totals and optional item lines', () => {
    const text = formatWaterDayExportText({
      clubName: 'Virgo Pickleball',
      monthLabel: 'Tháng 9 · 2026',
      rows: [
        { date: '2026-09-03', dateLabel: '03/09', amount: 61000, waterItems: { aquafina: 3, revive: 4, quang_hanh: 0 } },
        { date: '2026-09-05', dateLabel: '05/09', amount: 14000 },
      ],
    })
    expect(text).toContain('Tiền nước · Tháng 9 · 2026 · Virgo Pickleball')
    expect(text).toContain('03/09 · 61.000 đ')
    expect(text).toContain('aqa x3, revi x4')
    expect(text).toContain('05/09 · 14.000 đ')
    expect(text).toContain('Tổng còn: 75.000 đ (2 ngày)')
  })

  test('merges same-day rows and sums drink quantities', () => {
    const merged = mergeWaterDayRow(
      { date: '2026-09-03', dateLabel: '03/09', amount: 21000, waterItems: { aquafina: 3 } },
      { date: '2026-09-03', dateLabel: '03/09', amount: 10000, waterItems: { revive: 1 } },
    )
    expect(merged.amount).toBe(31000)
    expect(merged.waterItems).toEqual({ aquafina: 3, revive: 1, quang_hanh: 0 })
    expect(merged.itemsDetail).toContain('aqa x3')
  })

  test('FIFO-skips days already covered by owner water payment', () => {
    const rows = [
      { date: '2026-08-03', dateLabel: '03/08', amount: 130000 },
      { date: '2026-08-05', dateLabel: '05/08', amount: 78000 },
      { date: '2026-08-07', dateLabel: '07/08', amount: 48000 },
      { date: '2026-08-10', dateLabel: '10/08', amount: 123000 },
      { date: '2026-08-12', dateLabel: '12/08', amount: 70000 },
      { date: '2026-08-14', dateLabel: '14/08', amount: 55000 },
      { date: '2026-08-19', dateLabel: '19/08', amount: 65000 },
    ]
    const unpaid = applyOwnerPaidFifoToWaterDays(rows, 449000)
    expect(unpaid.map(r => ({ date: r.date, amount: r.amount }))).toEqual([
      { date: '2026-08-14', amount: 55000 },
      { date: '2026-08-19', amount: 65000 },
    ])
    const text = formatWaterDayExportText({
      clubName: 'Virgo',
      monthLabel: 'Tháng 8 · 2026',
      rows: unpaid,
    })
    expect(text).toContain('Tổng còn: 120.000 đ (2 ngày)')
    expect(text).not.toContain('03/08')
    expect(text).toContain('14/08 · 55.000 đ')
  })
})
