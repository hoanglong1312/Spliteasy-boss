import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const settingsSource = readFileSync(new URL('./screens/PickleballSettings.jsx', import.meta.url), 'utf8')
const overviewSource = readFileSync(new URL('./screens/PickleballOverview.jsx', import.meta.url), 'utf8')
const calendarSource = readFileSync(new URL('./screens/PickleballCalendar.jsx', import.meta.url), 'utf8')
const membersSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
const memberDetailSource = readFileSync(new URL('./screens/MemberDetail.jsx', import.meta.url), 'utf8')
const ticketsSource = readFileSync(new URL('./screens/PickleballTickets.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')

test('settings removes batch entry and member toggles, keeps schedule and ticket price', () => {
  assert.doesNotMatch(settingsSource, /Nhập nhanh chi phí tháng này/)
  assert.doesNotMatch(settingsSource, /onAction\?\.\('batchEntry'\)/)
  assert.doesNotMatch(settingsSource, /Thành viên tháng này/)
  assert.doesNotMatch(settingsSource, /activeMonthlyMemberIds: Array\.from\(activeMemberIds\)/)
  assert.match(settingsSource, /Giá vé lẻ/)
  assert.match(settingsSource, /const \[ticketPrice, setTicketPrice\]/)
  assert.match(settingsSource, /ticketPrice,/)
  assert.match(settingsSource, /Lịch tự động/)
  assert.doesNotMatch(settingsSource, /Tạo lại lịch tháng này/)
  assert.doesNotMatch(appSource, /type === 'regenerateSessions'/)
})

test('overview shows treasurer-only compact batch water entry action', () => {
  assert.match(overviewSource, /isTreasurer && \(/)
  assert.match(overviewSource, /Nhập nhanh tiền nước/)
  assert.match(overviewSource, /onAction\?\.\('batchEntry'\)/)
  assert.match(overviewSource, /variant="ghost"/)
})

test('overview does not duplicate attendance controls from calendar', () => {
  assert.doesNotMatch(overviewSource, /onAction\?\.\('attend'/)
  assert.doesNotMatch(overviewSource, /Điểm danh Buổi/)
  assert.match(calendarSource, /Điểm danh · \{session\.attendance\.present\}\/\{session\.attendance\.total\} tham gia/)
})

test('calendar extra cost editor starts new extras with no selected members and shows zero count', () => {
  assert.match(calendarSource, /memberIds: \[\]/)
  assert.match(calendarSource, /const splitCount = extra\.memberIds\.length/)
  assert.match(calendarSource, /0 người/)
  assert.match(calendarSource, /onChange\(\{ memberIds: allMemberIds \}\)/)
})

test('calendar treats casual members as attendance chips and adds only brand new guests by name', () => {
  assert.match(calendarSource, /guestName/)
  assert.match(calendarSource, /onAction\?\.\('addGuest', \{\s*sessionId: session\.id,\s*guestName:/)
  assert.match(appSource, /if \(type === 'addGuest'\)/)
  assert.match(appSource, /guest_name: guestName/)
  assert.match(appSource, /attendee_type: 'guest'/)
  assert.doesNotMatch(appSource, /is_guest: true/)
  assert.match(dataSource, /memberType: memberType\(member\)/)
})

test('calendar guest attendance chip uses a readable horizontal pill', () => {
  assert.match(calendarSource, /if \(a\.kind === 'guest'\) \{/)
  assert.match(calendarSource, /flex: '1 1 132px'/)
  assert.match(calendarSource, /maxWidth: 180/)
  assert.match(calendarSource, /aria-label=\{`Xóa \$\{a\.name\}`\}/)
  assert.match(calendarSource, /Khách/)
})

test('member management confirms role changes and edits full bank information', () => {
  assert.match(memberDetailSource, /window\.confirm\(role === 'treasurer'/)
  assert.match(memberDetailSource, /onAction\?\.\('setMemberRole', \{\s*memberId: d\.id,\s*role/)
  assert.match(memberDetailSource, /Họ và tên đầy đủ/)
  assert.match(memberDetailSource, /bankAccountName/)
  assert.match(memberDetailSource, /Ngân hàng/)
  assert.match(memberDetailSource, /VN_BANKS/)
  assert.match(memberDetailSource, /type="number"/)

  assert.match(membersSource, /window\.confirm\(role === 'treasurer'/)
  assert.match(membersSource, /onAction\?\.\('setMemberRole'/)
  assert.match(membersSource, /Họ và tên đầy đủ/)
  assert.match(membersSource, /bankAccountName/)
  assert.match(membersSource, /Ngân hàng/)
  assert.match(membersSource, /VN_BANKS/)
})

test('store, app handler, and screen data support ticket price and full bank columns', () => {
  assert.match(storeSource, /ticketPrice: Number\(config\.ticket_price \?\? config\.ticketPrice \?\? 50000\) \|\| 50000/)
  assert.match(storeSource, /ticket_price: Number\(config\.ticket_price \?\? config\.ticketPrice \?\? 50000\) \|\| 50000/)
  assert.match(storeSource, /row\.ticket_price = Number\(action\.ticketPrice \?\? action\.ticket_price\) \|\| 50000/)
  assert.match(appSource, /ticketPrice: payload\?\.ticketPrice/)
  assert.match(appSource, /bank_name: payload\?\.bankName/)
  assert.match(appSource, /bank_account_name: payload\?\.bankAccountName/)
  assert.match(dataSource, /ticketPricePerPerson/)
  assert.match(dataSource, /monthlyConfig\?\.ticketPrice/)
  assert.match(dataSource, /bankName: member\?\.bankName/)
  assert.match(dataSource, /bankAccountName: member\?\.bankAccountName/)
})

test('ticket add form starts empty and calculates total from configured per-person price', () => {
  assert.match(ticketsSource, /const \[memberIds, setMemberIds\] = useState\(\[\]\)/)
  assert.doesNotMatch(ticketsSource, /const \[totalAmount, setTotalAmount\]/)
  assert.doesNotMatch(ticketsSource, /<Input\s+label="Tổng tiền"/)
  assert.match(ticketsSource, /const ticketPrice = Number\(data\.ticketPricePerPerson \|\| data\.ticketPrice \|\| data\.defaultTicketAmountPerPerson \|\| 50000\) \|\| 50000/)
  assert.match(ticketsSource, /const totalAmountToSave = ticketPrice \* memberIds\.length/)
  assert.match(ticketsSource, /người đã chọn/)
  assert.match(ticketsSource, /Price per person/)
})
