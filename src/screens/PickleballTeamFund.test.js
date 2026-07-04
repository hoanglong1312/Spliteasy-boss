import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import PickleballTeamFund from './PickleballTeamFund.jsx'

const baseData = {
  clubName: 'Flex Club',
  monthLabel: 'Tháng 7/2026',
  currentYearMonth: '2026-07',
  courtFeeTotal: 9_999_999,
  ticketPrice: 123_456,
  sessionsCount: 3,
  memberCount: 1,
  ticketFund: {},
  ticketStats: { sessionCount: 2, totalAmount: 240_000, participantCount: 2 },
  teamFundDirectTotal: 777_000,
  ticketRows: [{ id: 'ticket-1', memberLabels: [], ledgerRows: [], totalAmount: 777_000 }],
  ticketParticipantRows: [{ memberId: 'member-2', name: 'Member Two', sessions: 2, amount: -240_000 }],
  venueBank: {},
  paymentDraft: {
    items: [
      { key: 'water', label: 'Tiền nước', yearMonth: '2026-07', amount: 60_000, paid: false },
      { key: 'flex_monthly', label: 'Vé tháng thu về', yearMonth: '2026-07', amount: 700_000, paid: false },
      { key: 'flex_per_session', label: 'Vé lẻ thu về', yearMonth: '2026-07', amount: 240_000, paid: false },
    ],
    totalAmount: 1_000_000,
  },
  ownerPayments: [],
}

describe('PickleballTeamFund flex billing', () => {
  test('renders flex config read-only and hides fixed-mode ticket card', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballTeamFund, {
      data: {
        ...baseData,
        isFlexBilling: true,
        flexMonthlyTicketPrice: 700_000,
        flexPerSessionTicketPrice: 120_000,
        flexMonthlyMemberCount: 1,
        flexPerSessionMemberCount: 1,
      },
      isTreasurer: true,
    }))

    expect(markup).toContain('Vé tháng:')
    expect(markup).toContain('700.000')
    expect(markup).toContain('Vé lẻ:')
    expect(markup).toContain('120.000')
    expect(markup).toContain('Chỉnh giá vé ở màn Cấu hình pickleball')
    expect(markup).toContain('Vé tháng thu về')
    expect(markup).toContain('Vé lẻ thu về')
    expect(markup).not.toContain('Tiền sân tháng')
    expect(markup).not.toContain('Giá vé lẻ/người')
    expect(markup).not.toContain('Tiền sân/buổi')
    expect(markup).not.toContain('Tiền sân/người')
    expect(markup).not.toContain('Lưu cấu hình quỹ')
    expect(markup).not.toContain('Giao dịch vé lẻ')
    expect(markup).not.toContain('Quỹ team cần trả hộ thành viên')
  })

  test('keeps fixed-mode config and ticket card visible', () => {
    const markup = renderToStaticMarkup(React.createElement(PickleballTeamFund, {
      data: { ...baseData, isFlexBilling: false },
      isTreasurer: true,
    }))

    expect(markup).toContain('Tiền sân tháng')
    expect(markup).toContain('Giá vé lẻ/người')
    expect(markup).toContain('Tiền sân/buổi')
    expect(markup).toContain('Tiền sân/người')
    expect(markup).toContain('Lưu cấu hình quỹ')
    expect(markup).toContain('Giao dịch vé lẻ')
    expect(markup).toContain('Quỹ team cần trả hộ thành viên')
  })
})
