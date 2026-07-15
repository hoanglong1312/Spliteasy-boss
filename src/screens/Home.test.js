import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import * as HomeModule from './Home.jsx'

const { buildTreasurerOutstandingBreakdown, SourceBreakdown } = HomeModule

describe('buildTreasurerOutstandingBreakdown', () => {
  test('matches outstanding member total while preserving source offsets', () => {
    const sources = buildTreasurerOutstandingBreakdown([
      {
        profileId: 'profile-1',
        status: 'unpaid',
        amount: 70000,
        paymentItems: [
          { sourceType: 'group', sourceId: 'g1', sourceLabel: 'Nhóm ăn tối', month: '2026-07', monthLabel: 'Tháng 7', amount: -100000 },
          { sourceType: 'pickleball', sourceId: 'pb', sourceLabel: 'Pickleball', month: '2026-07', monthLabel: 'Tháng 7', amount: 30000 },
        ],
      },
      {
        profileId: 'profile-2',
        status: 'pending',
        amount: 20000,
        paymentItems: [
          { sourceType: 'group', sourceId: 'g1', sourceLabel: 'Nhóm ăn tối', month: '2026-07', monthLabel: 'Tháng 7', amount: -20000 },
        ],
      },
      { profileId: 'current', status: 'unpaid', amount: 50000, paymentItems: [] },
      { profileId: 'profile-3', status: 'confirmed', amount: 40000, paymentItems: [] },
    ], 'current')

    expect(sources).toEqual([
      expect.objectContaining({
        sourceId: 'g1',
        amount: 120000,
        monthBreakdown: [{ month: '2026-07', label: 'Tháng 7', amount: 120000 }],
      }),
      expect.objectContaining({
        sourceId: 'pb',
        amount: -30000,
        monthBreakdown: [{ month: '2026-07', label: 'Tháng 7', amount: -30000 }],
      }),
    ])
    expect(sources.reduce((sum, source) => sum + source.amount, 0)).toBe(90000)
  })

  test('keeps total exact when legacy row has no source items', () => {
    const sources = buildTreasurerOutstandingBreakdown([
      { profileId: 'profile-1', name: 'Lê Cường', status: 'pending', amount: 70000 },
    ])

    expect(sources).toEqual([
      expect.objectContaining({ sourceType: 'unallocated', sourceLabel: 'Chưa phân nguồn', amount: 70000 }),
    ])
  })
})

describe('buildTreasurerMemberRows', () => {
  test('splits refunds by month and keeps exact settlement sources', () => {
    expect(HomeModule.buildTreasurerMemberRows).toBeTypeOf('function')

    const rows = HomeModule.buildTreasurerMemberRows({
      progressRows: [],
      confirmedRecords: [],
      confirmedCheckpoints: [],
      pendingCheckpoints: [],
      confirmedRefunds: new Set(),
      monthLabel: 'Tháng 7 · 2026',
      matchSearch: () => true,
      refundRows: [{
        profileId: 'profile-giang',
        memberId: 'member-giang',
        name: 'Giang',
        amount: 349584,
        sources: [{
          sourceType: 'group',
          sourceId: 'group-1',
          sourceLabel: 'Lấy vk để trưởng thành',
          profileId: 'profile-giang',
          memberId: 'member-giang',
          amount: 349584,
          monthBreakdown: [
            { month: '2026-06', label: 'Tháng 6 · 2026', amount: 207500 },
            { month: '2026-07', label: 'Tháng 7 · 2026', amount: 142084 },
          ],
        }],
      }],
    })

    expect(rows[0].items.map(item => ({
      month: item.month,
      amount: item.amount,
      coveredSources: item.coveredSources,
    }))).toEqual([
      {
        month: '2026-06',
        amount: 207500,
        coveredSources: [expect.objectContaining({
          sourceType: 'group',
          sourceId: 'group-1',
          memberId: 'member-giang',
          profileId: 'profile-giang',
          month: '2026-06',
          amount: 207500,
        })],
      },
      {
        month: '2026-07',
        amount: 142084,
        coveredSources: [expect.objectContaining({
          sourceType: 'group',
          sourceId: 'group-1',
          memberId: 'member-giang',
          profileId: 'profile-giang',
          month: '2026-07',
          amount: 142084,
        })],
      },
    ])
  })
})

describe('SourceBreakdown', () => {
  test('renders redesigned hero with compact collapsed source toggle', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SourceBreakdown, {
        sources: [
          { sourceType: 'pickleball', sourceId: 'pb', sourceLabel: 'Pickleball tháng 6', amount: -120000 },
          { sourceType: 'group', sourceId: 'g1', sourceLabel: 'Nhóm ăn tối', amount: 50000 },
        ],
        totalBalance: -70000,
        balanceLabel: 'Bạn cần nộp quỹ',
        owedTo: 70000,
        paymentStatus: '',
      })
    )

    expect(markup).toContain('Bạn cần nộp quỹ')
    expect(markup).toContain('💳 Thanh toán')
    expect(markup).toContain('2 nguồn')
    expect(markup).toContain('↓')
    expect(markup).not.toContain('Theo nguồn tiền')
    expect(markup).not.toContain('Tổng tháng này')
    expect(markup).not.toContain('Pickleball tháng 6')
  })
})
