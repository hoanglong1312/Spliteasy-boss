import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8')

test('PinEntryScreen uses a controlled numeric password input instead of a numpad', () => {
  assert.match(appSource, /<input[\s\S]*type="password"[\s\S]*inputMode="numeric"[\s\S]*maxLength=\{6\}/)
  assert.match(appSource, /value=\{value\}/)
  assert.match(appSource, /onChange=\{e => onChange\(e\.target\.value\.replace\(\/\\D\/g, ''\)\.slice\(0, 6\)\)\}/)
  assert.match(appSource, /onKeyDown=\{e => e\.key === 'Enter' && onSubmit\(\)\}/)
  assert.doesNotMatch(appSource, /\[1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7,\s*8,\s*9,\s*'',\s*0,\s*'⌫'\]/)
  assert.doesNotMatch(appSource, /isBackspace/)
})

test('AppV2 renders the store toast as a fixed bottom overlay', () => {
  assert.match(appSource, /<ToastOverlay toast=\{state\.toast\} \/>/)
  assert.match(appSource, /function ToastOverlay\(\{ toast \}\) \{/)
  assert.match(appSource, /bottom: 80/)
  assert.match(appSource, /left: '50%'/)
  assert.match(appSource, /transform: 'translateX\(-50%\)'/)
  assert.match(appSource, /background: '#1e293b'/)
  assert.match(appSource, /color: '#f8fafc'/)
  assert.match(appSource, /padding: '12px 20px'/)
  assert.match(appSource, /borderRadius: 8/)
  assert.match(appSource, /transition: 'opacity 200ms ease'/)
  assert.match(appSource, /opacity: visible \? 1 : 0/)
})

test('AppV2 renders a deactivated-member error state when no groups or members load', () => {
  assert.match(appSource, /const groups = state\.groups \|\| \[\]/)
  assert.match(appSource, /const members = state\.members \|\| \[\]/)
  assert.match(appSource, /state\._error && !state\._loading && state\.currentUserId && groups\.length === 0 && members\.length === 0/)
  assert.match(appSource, /Tài khoản của bạn chưa được kích hoạt trong nhóm/)
  assert.match(appSource, /Liên hệ thủ quỹ để được thêm vào nhóm\./)
  assert.match(appSource, /onClick=\{\(\) => handle\('logout'\)\}/)
  assert.match(appSource, />Đăng xuất<\/button>/)
})

test('AppV2 wires member detail route and member management updates', () => {
  assert.match(appSource, /import MemberDetail from '\.\/screens\/MemberDetail'/)
  assert.match(appSource, /getMemberDetailData/)
  assert.match(appSource, /case 'member-detail':\s*return <MemberDetail data=\{getMemberDetailData\(route\.params\?\.memberId \?\? route\.params\)\} isTreasurer=\{isTreasurer\} onAction=\{handle\} \/>/)
  assert.match(appSource, /memberDetail:\s*'member-detail'/)

  assert.match(appSource, /if \(type === 'editMember'\)/)
  assert.match(appSource, /name: payload\?\.name/)
  assert.match(appSource, /bank_account: payload\?\.bankAccount/)
  assert.match(appSource, /if \(type === 'setMemberRole'\)/)
  assert.match(appSource, /role: payload\?\.role/)
  assert.match(appSource, /if \(type === 'setMemberType'\)/)
  assert.match(appSource, /member_type: payload\?\.type/)
  assert.match(appSource, /if \(type === 'deleteMember'\)/)
  assert.match(appSource, /is_active: false/)
})

test('AppV2 handles individual-ticket Supabase writes', () => {
  assert.match(appSource, /if \(type === 'addTicket'\)/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.insert\(\{/)
  assert.match(appSource, /const sessionDate = payload\?\.session_date \|\| payload\?\.date/)
  assert.match(appSource, /const sessionTime = payload\?\.session_time \|\| payload\?\.time \|\| null/)
  assert.match(appSource, /const memberIds = safeArray\(payload\?\.member_ids \|\| payload\?\.memberIds\)/)
  assert.match(appSource, /const totalAmount = parseMoneyAmount\(payload\?\.total_amount \?\? payload\?\.totalAmount\)/)
  assert.match(appSource, /const advancerId = payload\?\.advancer_id \?\? payload\?\.advancerId \?\? null/)
  assert.match(appSource, /session_date: sessionDate/)
  assert.match(appSource, /session_time: sessionTime/)
  assert.match(appSource, /member_ids: memberIds/)
  assert.match(appSource, /advancer_id: advancerId/)
  assert.match(appSource, /status: advancerId \? 'unpaid' : 'team_fund'/)
  assert.match(appSource, /year_month: monthKey\(sessionDate \|\| new Date\(\)\)/)
  assert.match(appSource, /created_by: state\.currentUserId/)

  assert.match(appSource, /if \(type === 'markTicketPaid'\)/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.update\(\{ status: 'paid' \}\)/)
  assert.match(appSource, /\.eq\('id', ticketId\)/)

  assert.match(appSource, /if \(type === 'deleteTicket'\)/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.delete\(\)/)
})

test('Member management screens are registered in the app source', () => {
  const memberListSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
  assert.match(memberListSource, /const \[search, setSearch\] = useState\(''\)/)
  assert.match(memberListSource, /Xem thêm/)
  assert.match(memberListSource, /onAction\?\.\('memberDetail', \{ memberId: member\.id \}\)/)
  assert.match(memberListSource, /quickAction/)
  assert.match(memberListSource, /Cố định ·/)
  assert.match(memberListSource, /Vãng lai ·/)
})

test('main renders AppProvider directly without the legacy toast bridge', () => {
  assert.doesNotMatch(mainSource, /ToastProvider/)
  assert.doesNotMatch(mainSource, /useToast/)
  assert.doesNotMatch(mainSource, /onToast=\{addToast\}/)
  assert.match(mainSource, /<AppProvider>\s*<AppV2 \/>\s*<\/AppProvider>/)
})
