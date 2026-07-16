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

test('Home pending tickets banner expands with inline approve and delete actions', () => {
  const callsite = homeSource.slice(
    homeSource.indexOf('<PendingTicketsBanner'),
    homeSource.indexOf('{isTreasurer &&')
  )
  const banner = homeSource.slice(
    homeSource.indexOf('function PendingTicketsBanner'),
    homeSource.indexOf('function MonthSummary')
  )

  assert.match(callsite, /items=\{d\.pendingTickets\?\.items \|\| \[\]\}/)
  assert.match(callsite, /count=\{d\.pendingTickets\?\.count \|\| 0\}/)
  assert.match(callsite, /totalAmount=\{d\.pendingTickets\?\.totalAmount \|\| 0\}/)
  assert.match(callsite, /onNavigate=\{\(\) => \{[\s\S]*?onAction\?\.\('push', \{[\s\S]*?screen: 'pickleball-calendar'/)
  assert.match(callsite, /onAction=\{onAction\}/)
  assert.match(banner, /function PendingTicketsBanner\(\{ items = \[\], count, totalAmount, onNavigate, onAction \}\)/)
  assert.match(banner, /const \[expanded, setExpanded\] = useState\(false\)/)
  assert.match(banner, /items\.map\(ticket =>/)
  assert.match(banner, /ticket\.dateLabel \|\| ticket\.date \|\| 'Chưa có ngày'/)
  assert.match(banner, /ticket\.memberLabel \|\| '—'/)
  assert.match(banner, /ticket\.advancerName \? `\$\{ticket\.advancerName\} ứng` : 'Quỹ team trả'/)
  assert.match(banner, /await onAction\?\.\('approveTicket', \{ ticketId: ticket\.id, status: ticket\.approveStatus \}\)/)
  assert.match(banner, /await onAction\?\.\('deleteTicket', \{ ticketId: ticket\.id \}\)/)
  assert.match(banner, /'Đang lưu…'/)
  assert.match(banner, /saving \? 'Đang lưu…' : 'Duyệt'/)
  assert.match(banner, /saving \? 'Đang lưu…' : 'Xóa'/)
})

test('PickleballTickets add form calculates total from selected participants and saves expected payload', () => {
  assert.match(screenSource, /import React, \{ useEffect, useMemo, useState \} from 'react'/)
  assert.match(screenSource, /function AddTicketSheet\(\{ data, onClose, onSave \}\) \{/)
  assert.match(screenSource, /const \[date, setDate\] = useState/)
  assert.doesNotMatch(screenSource, /const \[time, setTime\] = useState/)
  assert.match(screenSource, /const time = '19:00'/)
  assert.match(screenSource, /const \[memberIds, setMemberIds\] = useState/)
  assert.match(screenSource, /const \[paymentMode, setPaymentMode\] = useState\('team_fund'\)/)
  assert.match(screenSource, /const \[error, setError\] = useState\(''\)/)
  assert.match(screenSource, /const selectedMembers = members\.filter\(member => memberIds\.some\(id => String\(id\) === String\(member\.id\)\)\)/)
  assert.match(screenSource, /\{selectedMembers\.map\(member => \(/)
  assert.doesNotMatch(screenSource, /const \[totalAmount, setTotalAmount\]/)
  assert.match(screenSource, /value=\{date\}/)
  assert.doesNotMatch(screenSource, /label="Giờ"/)
  assert.match(screenSource, /value=\{advancerId\}/)
  assert.doesNotMatch(screenSource, /<Input\s+label="Tổng tiền"/)
  assert.doesNotMatch(screenSource, /defaultValue=/)
  assert.match(screenSource, /const ticketPrice = Number\(data\.ticketPricePerPerson \|\| data\.ticketPrice \|\| data\.defaultTicketAmountPerPerson \|\| 50000\) \|\| 50000/)
  assert.match(screenSource, /const totalAmountToSave = ticketPrice \* billedMemberIds\.length/)
  assert.match(screenSource, /const monthlyMemberIds = memberIds\.filter/)
  assert.match(screenSource, /const waterPerPerson = totalSelected > 0 \? Math\.round\(waterAmount \/ totalSelected\) : 0/)
  assert.match(screenSource, /const perLegPersonAmount = ticketPrice \+ waterPerPerson/)
  assert.match(screenSource, /const grandTotal = totalAmountToSave \+ waterAmount/)
  assert.match(screenSource, /\{memberIds\.length\} người đã chọn/)
  assert.match(screenSource, /Price per person/)
  assert.match(screenSource, /Vé lẻ · \{billedMemberIds\.length\} người/)
  assert.match(screenSource, /Vé tháng · \{monthlyMemberIds\.length\} người/)
  assert.match(screenSource, /Tổng cộng/)
  assert.match(screenSource, /function ticketValidationError\(/)
  assert.match(screenSource, /onSave\(\{\s*session_date: dateToIso\(date\),\s*session_time: time,\s*member_ids: memberIds,\s*total_amount: totalAmountToSave,\s*advancer_id: paymentMode === 'advancer' \? advancerId : null,\s*paymentMode,\s*\}\)/)
  assert.match(screenSource, /\{formatShortAmount\(ticketPrice\)\}\/người/)
  assert.doesNotMatch(screenSource, /opacity: monthlyTicket/)
})

test('ticket sheets color monthly chips only when selected and keep simple fixed summary', () => {
  const ticketSheet = screenSource.slice(
    screenSource.indexOf('function AddTicketSheet'),
    screenSource.indexOf('function ticketValidationError')
  )
  const calendarSheet = calendarSource.slice(
    calendarSource.indexOf('function AddTicketSheet'),
    calendarSource.indexOf('function SessionDetailPanel')
  )

  for (const sheet of [ticketSheet, calendarSheet]) {
    assert.doesNotMatch(sheet, /label="Giờ"/)
    assert.match(sheet, /active && monthlyTicket \? 'rgba\(99,102,241,0\.42\)'/)
    assert.match(sheet, /active && monthlyTicket \? 'rgba\(99,102,241,0\.16\)'/)
    assert.match(sheet, /active && monthlyTicket \? '#c7d2fe'/)
    assert.doesNotMatch(sheet, /opacity: monthlyTicket/)
    assert.match(sheet, /monthlyMemberIds\.length === 0/)
  }
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

test('PickleballCalendar ticket day rows open full participant detail sheet', () => {
  const ticketDayPanel = calendarSource.slice(
    calendarSource.indexOf('function TicketDayPanel'),
    calendarSource.indexOf('function AddTicketSheet')
  )
  const detailSheet = calendarSource.slice(
    calendarSource.indexOf('function TicketDetailSheet'),
    calendarSource.indexOf('function AddTicketSheet')
  )

  assert.match(calendarSource, /BottomSheet/)
  assert.match(ticketDayPanel, /const \[detailTicket, setDetailTicket\] = useState\(null\)/)
  assert.match(ticketDayPanel, /function openTicketOnEnter\(event, ticket\)/)
  assert.match(ticketDayPanel, /role="button"/)
  assert.match(ticketDayPanel, /onClick=\{\(\) => setDetailTicket\(ticket\)\}/)
  assert.match(ticketDayPanel, /onKeyDown=\{\(event\) => openTicketOnEnter\(event, ticket\)\}/)
  assert.doesNotMatch(ticketDayPanel, /người đánh vé lẻ/)
  assert.match(ticketDayPanel, /<TicketMemberGroups ticket=\{ticket\}/)
  assert.match(ticketDayPanel, /ticketNameChipStyle\(group\.key\)/)
  assert.doesNotMatch(ticketDayPanel, /formatTimeLabel\(ticket\.timeLabel\)/)
  assert.match(ticketDayPanel, /<TicketDetailSheet[\s\S]*?ticket=\{detailTicket\}[\s\S]*?onClose=\{\(\) => setDetailTicket\(null\)\}/)
  assert.doesNotMatch(ticketDayPanel, /displayAmountPerPerson \|\| ticket\.amountPerPerson/)
  assert.match(detailSheet, /function TicketDetailSheet\(\{ ticket, onClose \}\)/)
  assert.match(detailSheet, /<BottomSheet title=\{`Vé lẻ · \$\{formatDayLabel\(ticket\.date\)\}`\}/)
  assert.match(detailSheet, /ticketMemberSummary\(ticket\)/)
  assert.match(detailSheet, /<TicketMemberGroups ticket=\{ticket\}/)
  assert.doesNotMatch(detailSheet, /Tổng vé/)
  assert.doesNotMatch(detailSheet, /formatVNDShort\(ticket\.totalAmount \|\| ticket\.amount\)/)
  assert.doesNotMatch(detailSheet, /formatTimeLabel\(ticket\.timeLabel\)/)
  assert.doesNotMatch(detailSheet, />vé lẻ</)
  assert.match(calendarSource, /label: 'Vé ngày'/)
  assert.match(calendarSource, /label: 'Vé tháng'/)
})

test('PickleballCalendar preserves selected session id across data refreshes', () => {
  const topLevel = calendarSource.slice(
    calendarSource.indexOf('export default function PickleballCalendar'),
    calendarSource.indexOf('function LegendChip')
  )

  assert.match(calendarSource, /import React, \{ useEffect, useRef, useState \} from 'react'/)
  assert.match(topLevel, /const selectedSessionIdRef = useRef\(initialSession\?\.id \|\| null\)/)
  assert.match(topLevel, /const selectedDateRef = useRef\(d\.selectedSessionDate \|\| initialSession\?\.date \|\| ''\)/)
  assert.match(topLevel, /selectedDateRef\.current = day\.date/)
  assert.match(topLevel, /selectedSessionIdRef\.current = day\.sessionId \|\| null/)
  assert.match(topLevel, /const preservedSession = \(d\.sessions \|\| \[\]\)\.find\(session => String\(session\.id\) === String\(selectedSessionIdRef\.current\)\)/)
  assert.match(topLevel, /const preservedDate = \(d\.days \|\| \[\]\)\.some\(day => day\.date === selectedDateRef\.current\)[\s\S]*?\? selectedDateRef\.current[\s\S]*?: ''/)
  assert.match(topLevel, /const nextSession = preservedSession \|\| \(preservedDate \? null : \(d\.selectedSession \|\| \(d\.sessions \|\| \[\]\)\[0\] \|\| null\)\)/)
  assert.match(topLevel, /const nextDate = preservedSession\?\.date \|\| preservedDate \|\| d\.selectedSessionDate \|\| nextSession\?\.date \|\| ''/)
  assert.match(topLevel, /setSelectedDate\(nextDate\)/)
  assert.match(topLevel, /selectedDateRef\.current = nextDate/)
  assert.match(topLevel, /setSelectedSessionId\(nextSession\?\.id \|\| null\)/)
  assert.doesNotMatch(topLevel, /setSelectedSessionId\(nextSession\?\.id \|\| null\);\n\s*}\, \[d\.selectedSession\?\.id, d\.selectedSessionDate\]\)/)
})

test('calendar ticket save shows full-screen loading until refresh completes', () => {
  const topLevel = calendarSource.slice(
    calendarSource.indexOf('export default function PickleballCalendar'),
    calendarSource.indexOf('function LegendChip')
  )

  assert.match(topLevel, /onSave=\{async \(payload\) => \{[\s\S]*?setSavingAction\(editingTicket \? 'updateTicket' : 'addTicket'\)/)
  assert.match(topLevel, /try \{[\s\S]*?await onAction\?\.\('addTicket', payload\)[\s\S]*?\} finally \{[\s\S]*?setSavingAction\(''\)/)
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
