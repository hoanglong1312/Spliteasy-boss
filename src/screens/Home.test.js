import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { SourceBreakdown } from './Home.jsx'

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
