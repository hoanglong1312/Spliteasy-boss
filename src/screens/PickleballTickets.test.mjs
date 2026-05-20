import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screenSource = readFileSync(new URL('./PickleballTickets.jsx', import.meta.url), 'utf8')

test('PickleballTickets renders emerald tickets layout and treasurer actions', () => {
  assert.match(screenSource, /import React, \{ useMemo, useState \} from 'react'/)
  assert.match(screenSource, /Hero variant="emerald"/)
  assert.match(screenSource, />Vé lẻ<\/h1>/)
  assert.match(screenSource, /onClick=\{\(\) => setShowForm\(true\)\}/)
  assert.match(screenSource, /Tổng buổi/)
  assert.match(screenSource, /Tổng lượt/)
  assert.match(screenSource, /Tổng tiền/)
  assert.match(screenSource, /Tất cả/)
  assert.match(screenSource, /⏳ Chưa trả/)
  assert.match(screenSource, /✅ Đã trả/)
  assert.match(screenSource, /🏦 Quỹ team/)
  assert.match(screenSource, /onAction\?\.\('markTicketPaid', \{ ticketId: t\.id \}\)/)
  assert.match(screenSource, /window\.confirm\('Xoá vé lẻ này\?'\)/)
  assert.match(screenSource, /onAction\?\.\('deleteTicket', \{ ticketId: t\.id \}\)/)
})

test('PickleballTickets add form is controlled and saves expected payload', () => {
  assert.match(screenSource, /function AddTicketSheet\(\{ data, onClose, onSave \}\) \{/)
  assert.match(screenSource, /const \[date, setDate\] = useState/)
  assert.match(screenSource, /const \[time, setTime\] = useState/)
  assert.match(screenSource, /const \[memberIds, setMemberIds\] = useState/)
  assert.match(screenSource, /const \[totalAmount, setTotalAmount\] = useState\(''\)/)
  assert.match(screenSource, /const \[paymentMode, setPaymentMode\] = useState\('team_fund'\)/)
  assert.match(screenSource, /const \[error, setError\] = useState\(''\)/)
  assert.match(screenSource, /value=\{date\}/)
  assert.match(screenSource, /value=\{time\}/)
  assert.match(screenSource, /value=\{totalAmount\}/)
  assert.match(screenSource, /value=\{advancerId\}/)
  assert.doesNotMatch(screenSource, /defaultValue=/)
  assert.match(screenSource, /function ticketValidationError\(/)
  assert.match(screenSource, /onSave\(\{\s*session_date: dateToIso\(date\),\s*session_time: time,\s*member_ids: memberIds,\s*total_amount: totalAmountToSave,\s*advancer_id: paymentMode === 'advancer' \? advancerId : null,\s*paymentMode,\s*\}\)/)
  assert.match(screenSource, /= \{formatShortAmount\(amountPerPerson\)\}\/người/)
})
