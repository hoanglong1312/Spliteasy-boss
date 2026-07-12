import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import PickleballOverview from './PickleballOverview.jsx'

const baseData = {
  clubName: 'Flex Club',
  monthLabel: 'Tháng 7 · 2026',
  currentYearMonth: '2026-07',
  memberCount: 2,
  scheduleConfig: {
    clubName: 'Flex Club',
    weekdays: ['T2'],
    timeRange: '19:00 – 21:00',
    startDate: '01/07/2026',
    autoGenerate: true,
  },
  todaySession: null,
  progress: { attended: 2, completed: 0, total: 10, ticketDatesInMonth: 3 },
  monthCosts: {},
  yourBalance: {
    total: -240000,
    name: 'Member One',
    initial: 'MO',
    statusLabel: 'Cần nộp',
    ticketType: 'per_session',
    summaryCards: [
      { icon: '🏸', label: 'Vé lượt của bạn', amount: -240000, sub: 'Theo buổi tham gia' },
      { icon: '💧', label: 'Nước của bạn', amount: 0, sub: '0 buổi có nước', key: 'water', rows: [] },
    ],
    breakdown: [],
  },
  yourTickets: { summary: { sessionCount: 1, totalAdjustment: 50000, displayAdjustment: -50000 }, rows: [] },
  teamFundOverview: { costRows: [] },
}

describe('PickleballOverview flex billing', () => {
  test('hides fixed-mode ticket and schedule controls in flex mode', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballOverview, {
      data: { ...baseData, isFlexBilling: true },
      isTreasurer: true,
    }))

    expect(markup).not.toContain('Vé lẻ trong tháng')
    expect(markup).not.toContain('Nhập nhanh tiền nước')
    expect(markup).not.toContain('Cài đặt lịch')
    expect(markup).toContain('Quỹ team tháng này')
  })

  test('keeps fixed-mode ticket and schedule controls visible', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballOverview, {
      data: { ...baseData, isFlexBilling: false },
      isTreasurer: true,
    }))

    expect(markup).toContain('Vé lẻ trong tháng')
    expect(markup).toContain('Nhập nhanh tiền nước')
    expect(markup).toContain('Cài đặt lịch')
  })

  test('renders monthly ticket progress without donut', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballOverview, {
      data: {
        ...baseData,
        isFlexBilling: true,
        progress: { attended: 3, completed: 2, total: 10 },
        yourBalance: {
          ...baseData.yourBalance,
          ticketType: 'monthly',
          summaryCards: [
            { icon: '🏸', label: 'Vé tháng của bạn', amount: -700000, sub: 'Vé tháng cố định' },
            ...baseData.yourBalance.summaryCards.slice(1),
          ],
        },
      },
      isTreasurer: true,
    }))

    expect(markup).toContain('Bạn đã đánh')
    expect(markup).toContain('Vé tháng — không tính theo buổi')
  })

  test('renders per-session ticket progress against ticket dates', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballOverview, {
      data: {
        ...baseData,
        isFlexBilling: true,
        progress: { attended: 2, completed: 4, total: 10, ticketDatesInMonth: 3 },
      },
      isTreasurer: true,
    }))

    expect(markup).toContain('50%')
    expect(markup).toContain('Tỷ lệ tham gia')
    expect(markup).toContain('240.000')
    expect(markup).toContain('vé lẻ tháng này')
  })

  test('shows completed group sessions in the overview progress card', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballOverview, {
      data: {
        ...baseData,
        isFlexBilling: true,
        progress: { attended: 3, completed: 2, total: 10, ticketDatesInMonth: 3 },
      },
      isTreasurer: true,
    }))

    expect(markup).toContain('Buổi CLB đã hoàn thành')
    expect(markup).toContain('2 buổi')
    expect(markup).not.toContain('2/10 buổi')
  })
})
