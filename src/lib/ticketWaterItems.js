export const TICKET_WATER_DRINKS = [
  { key: 'aquafina', label: 'Aquafina', shortLabel: 'aqa', unitPrice: 7000 },
  { key: 'revive', label: 'Revive', shortLabel: 'revi', unitPrice: 10000 },
  { key: 'quang_hanh', label: 'Nước khoáng Quang Hanh', shortLabel: 'qh', unitPrice: 7000 },
]

export function emptyWaterItems() {
  return { aquafina: 0, revive: 0, quang_hanh: 0 }
}

export function normalizeWaterItems(raw) {
  const next = emptyWaterItems()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return next
  for (const drink of TICKET_WATER_DRINKS) {
    next[drink.key] = Math.max(0, Math.round(Number(raw[drink.key]) || 0))
  }
  return next
}

export function waterItemsTotal(items) {
  const normalized = normalizeWaterItems(items)
  return TICKET_WATER_DRINKS.reduce((sum, drink) => sum + normalized[drink.key] * drink.unitPrice, 0)
}

export function hasWaterItemQuantities(items) {
  const normalized = normalizeWaterItems(items)
  return TICKET_WATER_DRINKS.some(drink => normalized[drink.key] > 0)
}

/** Prefer itemized total when any qty > 0; else fall back to legacy water_amount. */
export function resolveTicketWaterAmount(items, legacyWaterAmount = 0) {
  if (hasWaterItemQuantities(items)) return waterItemsTotal(items)
  return Math.max(0, Math.round(Number(legacyWaterAmount) || 0))
}
