// Tao va download file CSV, khong can thu vien ngoai.

export function exportMonthlyCSV(state) {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const monthLabel = now
    .toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
    .replace('/', '-')

  const group = state?.groups?.[0]
  if (!group) return

  const members = state.members || []
  const getName = (id) => {
    const member = members.find(m => m.id === id)
    return member?.displayName || member?.name || id
  }

  const expenses = (group.expenses || []).filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === month && d.getFullYear() === year
  })
  const settlements = (group.settlements || []).filter(s => {
    const d = new Date(s.date)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const rows = []

  rows.push(['Báo cáo tháng ' + monthLabel])
  rows.push([])

  rows.push(['CHI TIÊU'])
  rows.push(['Ngày', 'Tên khoản', 'Số tiền', 'Người trả', 'Chia cho', 'Trạng thái'])
  for (const e of expenses) {
    rows.push([
      e.date,
      e.title || '',
      e.amount,
      getName(e.paidBy),
      (e.participants || []).map(getName).join(' + '),
      e.status === 'approved' ? 'Đã duyệt' : e.status === 'declined' ? 'Từ chối' : 'Chờ duyệt',
    ])
  }
  rows.push([])

  rows.push(['THANH TOÁN'])
  rows.push(['Ngày', 'Từ', 'Đến', 'Số tiền'])
  for (const s of settlements) {
    rows.push([s.date, getName(s.fromId), getName(s.toId), s.amount])
  }

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spliteasy-${monthLabel}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
