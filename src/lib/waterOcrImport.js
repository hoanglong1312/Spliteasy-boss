const WATER_PRICES = [10000, 12500, 14000, 30000]

const emptyQuantities = () => ({
  10000: 0,
  12500: 0,
  14000: 0,
  30000: 0,
})

const normalizeNumberText = value => String(value || '').replace(/[,]/g, '.').replace(/[đ\s]/gi, '')

const parseMoney = value => {
  const normalized = normalizeNumberText(value)
    .replace(/(\d)[.-](\d{3})(?!\d)/g, '$1$2')
    .replace(/[^0-9]/g, '')
  return normalized ? Number(normalized) : 0
}

const formatMoney = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const toIsoDate = displayDate => {
  const [day, month, year] = displayDate.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const standaloneNumbersBeforeAmount = (block, amount) => {
  const lines = block
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)

  const values = []
  for (const line of lines) {
    if (amount && parseMoney(line) === amount && /\d+[.,-]\d{3}\s*đ?/i.test(line)) break
    if (/^\d+$/.test(line)) values.push(Number(line))
  }
  return values
}

const moneyValues = block => {
  const matches = block.match(/\d+[.,-]\d{3}\s*đ?/gi) || []
  return matches.map(parseMoney).filter(value => value > 0)
}

const pickWaterTotal = (amounts, ticketAmount) => {
  const filtered = amounts.filter(amount => amount !== ticketAmount)
  if (!filtered.length) return 0
  if (ticketAmount) {
    const exactWater = filtered.find(amount => filtered.includes(amount + ticketAmount))
    if (exactWater) return exactWater
  }
  return filtered[0]
}

const combinations = (length, size, start = 0) => {
  if (size === 0) return [[]]
  const result = []
  for (let index = start; index <= length - size; index += 1) {
    combinations(length, size - 1, index + 1).forEach(rest => {
      result.push([index, ...rest])
    })
  }
  return result
}

const assignQuantities = (values, detectedWaterTotal) => {
  const quantities = emptyQuantities()
  const candidates = combinations(WATER_PRICES.length, Math.min(values.length, WATER_PRICES.length))
  const matched = candidates.find(candidate => candidate.reduce((sum, priceIndex, valueIndex) => {
    return sum + WATER_PRICES[priceIndex] * Number(values[valueIndex] || 0)
  }, 0) === detectedWaterTotal)
  const slots = matched || WATER_PRICES.map((_, index) => index).slice(0, values.length)
  slots.forEach((priceIndex, valueIndex) => {
    quantities[WATER_PRICES[priceIndex]] = Number(values[valueIndex] || 0)
  })
  return quantities
}

const calculatedTotal = quantities => WATER_PRICES.reduce((sum, price) => {
  return sum + Number(quantities[price] || 0) * price
}, 0)

const parseBlock = (displayDate, block) => {
  const hasTicket = /x[eé]\s*vé/i.test(block)
  const amounts = moneyValues(block)
  const ticketAmount = hasTicket ? amounts[0] || 0 : 0
  const detectedWaterTotal = pickWaterTotal(amounts, ticketAmount)
  const quantities = assignQuantities(standaloneNumbersBeforeAmount(block, detectedWaterTotal), detectedWaterTotal)
  const calculatedWaterTotal = calculatedTotal(quantities)
  const warnings = []
  const extraNotes = []

  if (ticketAmount) {
    extraNotes.push(`Có xé vé ${formatMoney(ticketAmount)} — không nhập vào nước`)
  }

  if (!calculatedWaterTotal && !detectedWaterTotal) {
    return {
      date: toIsoDate(displayDate),
      displayDate,
      quantities,
      detectedWaterTotal,
      calculatedWaterTotal,
      extraNotes,
      status: 'skip',
      warnings: ['Không tìm thấy dữ liệu tiền nước'],
    }
  }

  if (detectedWaterTotal && calculatedWaterTotal !== detectedWaterTotal) {
    warnings.push('Tổng tiền nước không khớp')
  }

  return {
    date: toIsoDate(displayDate),
    displayDate,
    quantities,
    detectedWaterTotal,
    calculatedWaterTotal,
    extraNotes,
    status: warnings.length ? 'needs_review' : 'ok',
    warnings,
  }
}

export const parseWaterOcrText = text => {
  const raw = String(text || '').trim()
  if (!raw) return { rows: [], error: 'Chưa có dữ liệu để phân tích' }

  const dateMatches = [...raw.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g)]
  if (!dateMatches.length) return { rows: [], error: 'Không tìm thấy ngày dạng dd/mm/yyyy' }

  const rows = dateMatches.map((match, index) => {
    const displayDate = match[0]
    const start = match.index + displayDate.length
    const end = dateMatches[index + 1]?.index ?? raw.length
    return parseBlock(displayDate, raw.slice(start, end))
  }).filter(row => row.displayDate !== 'TỔNG CỘNG')

  return { rows, error: '' }
}
