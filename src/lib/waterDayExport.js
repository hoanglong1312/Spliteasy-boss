import {
  TICKET_WATER_DRINKS,
  hasWaterItemQuantities,
  normalizeWaterItems,
  resolveTicketWaterAmount,
} from './ticketWaterItems.js'

function formatVndPlain(amount) {
  return Math.round(Number(amount) || 0).toLocaleString('vi-VN')
}

export function formatWaterItemsDetail(items) {
  const normalized = normalizeWaterItems(items)
  return TICKET_WATER_DRINKS
    .filter(drink => normalized[drink.key] > 0)
    .map(drink => `${drink.shortLabel || drink.label} x${normalized[drink.key]}`)
    .join(', ')
}

/** Subtract owner-paid water from oldest days first; return only remaining unpaid rows. */
export function applyOwnerPaidFifoToWaterDays(rows = [], paidAmount = 0) {
  let remainingPaid = Math.max(0, Math.round(Number(paidAmount) || 0))
  const sorted = [...safeArray(rows)]
    .filter(row => (Number(row?.amount) || 0) > 0)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))

  const unpaid = []
  for (const row of sorted) {
    const amount = Math.round(Number(row.amount) || 0)
    if (remainingPaid <= 0) {
      unpaid.push({ ...row, amount })
      continue
    }
    if (remainingPaid >= amount) {
      remainingPaid -= amount
      continue
    }
    const leftover = amount - remainingPaid
    remainingPaid = 0
    unpaid.push({
      ...row,
      amount: leftover,
      // Partial day after owner payment — drop item breakdown (not allocated).
      waterItems: null,
      itemsDetail: '',
    })
  }
  return unpaid
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

export function formatWaterDayExportText({
  clubName = 'CLB Pickleball',
  monthLabel = '',
  rows = [],
} = {}) {
  const list = Array.isArray(rows) ? rows.filter(row => (Number(row?.amount) || 0) > 0) : []
  const total = list.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const header = `Tiền nước · ${monthLabel || 'Tháng'} · ${clubName}`.trim()
  if (list.length === 0) {
    return `${header}\n(Không còn tiền nước chưa trả chủ sân)\nTổng còn: 0 đ`
  }
  const body = list.map(row => {
    const main = `${row.dateLabel || row.date || ''} · ${formatVndPlain(row.amount)} đ`
    const detail = row.itemsDetail || (hasWaterItemQuantities(row.waterItems) ? formatWaterItemsDetail(row.waterItems) : '')
    return detail ? `${main}\n  ${detail}` : main
  })
  return [
    header,
    ...body,
    '',
    `Tổng còn: ${formatVndPlain(total)} đ (${list.length} ngày)`,
  ].join('\n')
}

export function mergeWaterDayRow(existing, next) {
  const amount = (Number(existing?.amount) || 0) + (Number(next?.amount) || 0)
  const aItems = hasWaterItemQuantities(existing?.waterItems) ? normalizeWaterItems(existing.waterItems) : null
  const bItems = hasWaterItemQuantities(next?.waterItems) ? normalizeWaterItems(next.waterItems) : null
  let waterItems = null
  if (aItems || bItems) {
    waterItems = normalizeWaterItems({})
    for (const drink of TICKET_WATER_DRINKS) {
      waterItems[drink.key] = (aItems?.[drink.key] || 0) + (bItems?.[drink.key] || 0)
    }
  }
  return {
    date: existing?.date || next?.date || '',
    dateLabel: existing?.dateLabel || next?.dateLabel || '',
    amount,
    waterItems,
    itemsDetail: waterItems && hasWaterItemQuantities(waterItems) ? formatWaterItemsDetail(waterItems) : '',
  }
}

export { resolveTicketWaterAmount, hasWaterItemQuantities, normalizeWaterItems }
