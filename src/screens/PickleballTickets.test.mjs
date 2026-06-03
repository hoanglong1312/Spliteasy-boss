import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screenSource = readFileSync(new URL('./PickleballTickets.jsx', import.meta.url), 'utf8')
const calendarSource = readFileSync(new URL('./PickleballCalendar.jsx', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8')

test('PickleballTickets renders emerald tickets layout and treasurer actions', () => {
  assert.match(screenSource, /import React, \{ useEffect, useMemo, useState \} from 'react'/)
  assert.match(screenSource, /Hero variant="emerald"/)
  assert.match(screenSource, />Vé lẻ<\/h1>/)
  assert.match(screenSource, /onClick=\{\(\) => setShowForm\(true\)\}/)
  assert.match(screenSource, /Tổng buổi/)
  assert.match(screenSource, /Tổng lượt/)
  assert.match(screenSource, /Tổng tiền/)
  assert.match(screenSource, /Tất cả/)
  assert.match(screenSource, /🕓 Chờ duyệt/)
  assert.match(screenSource, /⏳ Người ứng/)
  assert.match(screenSource, /🏦 Quỹ team/)
  assert.match(screenSource, /onAction\?\.\('approveTicket', \{ ticketId: t\.id, status: t\.advancerId \? 'unpaid' : 'team_fund' \}\)/)
  assert.doesNotMatch(screenSource, /Đã trả/)
  assert.doesNotMatch(screenSource, /markTicketPaid/)
  assert.match(screenSource, /window\.confirm\('Xoá vé lẻ này\?'\)/)
  assert.match(screenSource, /onAction\?\.\('deleteTicket', \{ ticketId: t\.id \}\)/)
})

test('PickleballTickets add form calculates total from selected participants and saves expected payload', () => {
  assert.match(screenSource, /import React, \{ useEffect, useMemo, useState \} from 'react'/)
  assert.match(screenSource, /function AddTicketSheet\(\{ data, onClose, onSave \}\) \{/)
  assert.match(screenSource, /const \[date, setDate\] = useState/)
  assert.match(screenSource, /const \[time, setTime\] = useState/)
  assert.match(screenSource, /const \[memberIds, setMemberIds\] = useState/)
  assert.match(screenSource, /const \[paymentMode, setPaymentMode\] = useState\('team_fund'\)/)
  assert.match(screenSource, /const \[error, setError\] = useState\(''\)/)
  assert.match(screenSource, /const selectedMembers = members\.filter\(member => memberIds\.some\(id => String\(id\) === String\(member\.id\)\)\)/)
  assert.match(screenSource, /\{selectedMembers\.map\(member => \(/)
  assert.doesNotMatch(screenSource, /const \[totalAmount, setTotalAmount\]/)
  assert.match(screenSource, /value=\{date\}/)
  assert.match(screenSource, /value=\{time\}/)
  assert.match(screenSource, /value=\{advancerId\}/)
  assert.doesNotMatch(screenSource, /<Input\s+label="Tổng tiền"/)
  assert.doesNotMatch(screenSource, /defaultValue=/)
  assert.match(screenSource, /const ticketPrice = Number\(data\.ticketPricePerPerson \|\| data\.ticketPrice \|\| data\.defaultTicketAmountPerPerson \|\| 50000\) \|\| 50000/)
  assert.match(screenSource, /const totalAmountToSave = ticketPrice \* memberIds\.length/)
  assert.match(screenSource, /const amountPerPerson = ticketPrice/)
  assert.match(screenSource, /\{memberIds\.length\} người đã chọn/)
  assert.match(screenSource, /Price per person/)
  assert.match(screenSource, /Tổng \{formatShortAmount\(totalAmountToSave\)\}/)
  assert.match(screenSource, /function ticketValidationError\(/)
  assert.match(screenSource, /onSave\(\{\s*session_date: dateToIso\(date\),\s*session_time: time,\s*member_ids: memberIds,\s*total_amount: totalAmountToSave,\s*advancer_id: paymentMode === 'advancer' \? advancerId : null,\s*paymentMode,\s*\}\)/)
  assert.match(screenSource, /\{formatShortAmount\(amountPerPerson\)\}\/người/)
})

test('PickleballCalendar ticket sheet keeps member save errors visible', () => {
  const sheetSource = calendarSource.slice(
    calendarSource.indexOf('function AddTicketSheet'),
    calendarSource.indexOf('function SessionDetailPanel')
  )

  assert.match(sheetSource, /try \{/)
  assert.match(sheetSource, /await onSave\(\{/)
  assert.match(sheetSource, /catch \(err\) \{/)
  assert.match(sheetSource, /setError\(ticketErrorMessage\(err\)\)/)
  assert.match(sheetSource, /function ticketErrorMessage\(err\)/)
  assert.match(sheetSource, /ticket_rls_denied/)
})

test('loading overlays render at PhoneFrame level for full-screen coverage', () => {
  const ticketTopLevel = screenSource.slice(
    screenSource.indexOf('export default function PickleballTickets'),
    screenSource.indexOf('function TicketCard')
  )
  const ticketCard = screenSource.slice(
    screenSource.indexOf('function TicketCard'),
    screenSource.indexOf('function AttendeeChip')
  )
  const calendarTopLevel = calendarSource.slice(
    calendarSource.indexOf('export default function PickleballCalendar'),
    calendarSource.indexOf('function LegendChip')
  )
  const sessionPanel = calendarSource.slice(
    calendarSource.indexOf('function SessionDetailPanel'),
    calendarSource.indexOf('function AttendChip')
  )
  const ticketDayPanel = calendarSource.slice(
    calendarSource.indexOf('function TicketDayPanel'),
    calendarSource.indexOf('function AddTicketSheet')
  )
  const homeTopLevel = homeSource.slice(
    homeSource.indexOf('export default function Home'),
    homeSource.indexOf('function formatVND')
  )
  const pendingZone = homeSource.slice(
    homeSource.indexOf('function PendingApprovalZone'),
    homeSource.indexOf('function MonthSummary')
  )
  const paymentSheet = homeSource.slice(
    homeSource.indexOf('function PaymentSheet'),
    homeSource.indexOf('function MemberBalanceRow')
  )

  assert.match(ticketTopLevel, /const \[savingAction, setSavingAction\] = useState\(''\)/)
  assert.match(ticketTopLevel, /<TicketCard[\s\S]*?savingAction=\{savingAction\}[\s\S]*?setSavingAction=\{setSavingAction\}/)
  assert.match(ticketTopLevel, /\{savingAction && \([\s\S]*?style=\{loadingOverlayStyle\}[\s\S]*?Đang xử lý…[\s\S]*?\)\}[\s\S]*?<\/PhoneFrame>/)
  assert.doesNotMatch(ticketCard, /style=\{loadingOverlayStyle\}/)

  assert.match(calendarTopLevel, /const \[savingAction, setSavingAction\] = useState\(''\)/)
  assert.match(calendarTopLevel, /<SessionDetailPanel[\s\S]*?savingAction=\{savingAction\}[\s\S]*?setSavingAction=\{setSavingAction\}/)
  assert.match(calendarTopLevel, /<TicketDayPanel[\s\S]*?savingAction=\{savingAction\}[\s\S]*?setSavingAction=\{setSavingAction\}/)
  assert.match(calendarTopLevel, /\{savingAction && \([\s\S]*?style=\{loadingOverlayStyle\}[\s\S]*?Đang xử lý…[\s\S]*?\)\}[\s\S]*?<\/PhoneFrame>/)
  assert.doesNotMatch(sessionPanel, /const \[savingAction, setSavingAction\]/)
  assert.doesNotMatch(ticketDayPanel, /const \[savingAction, setSavingAction\]/)

  assert.match(homeTopLevel, /const \[savingAction, setSavingAction\] = useState\(''\)/)
  assert.match(homeTopLevel, /<PendingApprovalZone[\s\S]*?savingAction=\{savingAction\}[\s\S]*?setSavingAction=\{setSavingAction\}/)
  assert.match(homeTopLevel, /<PaymentSheet[\s\S]*?savingAction=\{savingAction\}[\s\S]*?setSavingAction=\{setSavingAction\}/)
  assert.match(homeTopLevel, /\{savingAction && \([\s\S]*?style=\{loadingOverlayStyle\}[\s\S]*?Đang xử lý…[\s\S]*?\)\}[\s\S]*?<\/PhoneFrame>/)
  assert.doesNotMatch(pendingZone, /const \[savingAction, setSavingAction\]/)
  assert.doesNotMatch(paymentSheet, /const \[savingAction, setSavingAction\]/)
})
