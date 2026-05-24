import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
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
  assert.match(appSource, /case 'member-detail':\s*return <MemberDetail data=\{getMemberDetailData\(route\.params\?\.memberId \?\? route\.params\)\} isTreasurer=\{isPickleballTreasurer\} onAction=\{handle\} \/>/)
  assert.match(appSource, /memberDetail:\s*'member-detail'/)

  assert.match(appSource, /if \(type === 'editMember'\)/)
  assert.match(appSource, /name: payload\?\.name/)
  assert.match(appSource, /bank_account: payload\?\.bankAccount/)
  assert.match(appSource, /if \(type === 'setMemberRole'\)/)
  assert.match(appSource, /role: payload\?\.role/)
  assert.match(appSource, /if \(type === 'setMemberType'\)/)
  assert.match(appSource, /member_type: payload\?\.type/)
  assert.match(appSource, /if \(type === 'removeMemberToVanglai'\)/)
  assert.match(appSource, /const currentGroup = \(state\.groups \|\| \[\]\)\.find\(group => String\(group\.id\) === String\(state\.currentGroupId\)\)/)
  assert.match(appSource, /const isPickleballGroup = \(currentGroup\?\.groupType \|\| currentGroup\?\.group_type \|\| ''\) === 'pickleball'/)
  assert.match(appSource, /\.update\(isPickleballGroup \? \{ member_type: 'casual' \} : \{ is_active: false \}\)/)
  assert.match(appSource, /if \(type === 'reactivateMember'\)/)
  assert.match(appSource, /\.update\(isPickleballGroup \? \{ member_type: 'fixed' \} : \{ is_active: true \}\)/)
})

test('member deletion is confirmed with the shared in-app sheet before dispatch', () => {
  const memberListSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
  const memberDetailSource = readFileSync(new URL('./screens/MemberDetail.jsx', import.meta.url), 'utf8')

  assert.match(memberListSource, /BottomSheet/)
  assert.match(memberListSource, /const \[deleteConfirmMember, setDeleteConfirmMember\] = useState\(null\)/)
  assert.match(memberListSource, /title="Xóa thành viên\?"/)
  assert.match(memberListSource, /Thành viên sẽ được chuyển vào danh sách chờ\. Bạn có thể thêm lại sau\./)
  assert.match(memberListSource, />Hủy<\/Button>/)
  assert.match(memberListSource, /variant="danger"[\s\S]*>Xác nhận<\/Button>/)
  assert.match(memberListSource, /await onAction\?\.\('removeMemberToVanglai', \{ memberId: deleteConfirmMember\.id \}\)/)
  assert.doesNotMatch(memberListSource, /window\.confirm\(`Xóa \$\{member\.name\} khỏi nhóm\?`\)/)

  assert.match(memberDetailSource, /BottomSheet/)
  assert.match(memberDetailSource, /const \[showDeleteConfirm, setShowDeleteConfirm\] = useState\(false\)/)
  assert.match(memberDetailSource, /title="Xóa thành viên\?"/)
  assert.match(memberDetailSource, /Thành viên sẽ được chuyển vào danh sách chờ\. Bạn có thể thêm lại sau\./)
  assert.match(memberDetailSource, /await onAction\?\.\('removeMemberToVanglai', \{ memberId: d\.id \}\)/)
  assert.doesNotMatch(memberDetailSource, /window\.confirm\(`Xóa \$\{d\.name\} khỏi nhóm\?`\)/)
})

test('AppV2 handles individual-ticket Supabase writes', () => {
  assert.match(appSource, /if \(type === 'addTicket'\)/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.insert\(\{/)
  assert.match(appSource, /const sessionDate = normalizeTicketDate\(payload\?\.session_date \|\| payload\?\.date\)/)
  assert.match(appSource, /const sessionTime = payload\?\.session_time \|\| payload\?\.time \|\| null/)
  assert.match(appSource, /const memberIds = normalizeTicketMemberIds\(payload\?\.member_ids \|\| payload\?\.memberIds, state\)/)
  assert.match(appSource, /const totalAmount = parseMoneyAmount\(payload\?\.total_amount \?\? payload\?\.totalAmount\)/)
  assert.match(appSource, /const rawAdvancerId = payload\?\.advancer_id \?\? payload\?\.advancerId \?\? null/)
  assert.match(appSource, /const advancerId = wantsTeamFund \? null : rawAdvancerId/)
  assert.match(appSource, /const ticketStatus = isPickleballTreasurer \? \(advancerId \? 'unpaid' : 'team_fund'\) : 'pending_review'/)
  assert.match(appSource, /session_date: sessionDate/)
  assert.match(appSource, /session_time: sessionTime/)
  assert.match(appSource, /member_ids: memberIds/)
  assert.match(appSource, /advancer_id: advancerId/)
  assert.match(appSource, /status: ticketStatus/)
  assert.match(appSource, /year_month: monthKey\(sessionDate \|\| new Date\(\)\)/)
  assert.match(appSource, /created_by: state\.currentUserId/)

  assert.match(appSource, /if \(type === 'updateTicket'\)/)
  assert.match(appSource, /const ticketId = payload\?\.ticketId \?\? payload\?\.id/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.update\(\{/)
  assert.match(appSource, /session_date: sessionDate/)
  assert.match(appSource, /session_time: sessionTime/)
  assert.match(appSource, /member_ids: memberIds/)
  assert.match(appSource, /advancer_id: advancerId/)
  assert.match(appSource, /status: ticketStatus/)
  assert.match(appSource, /year_month: monthKey\(sessionDate \|\| new Date\(\)\)/)
  assert.match(appSource, /\.eq\('id', ticketId\)/)

  assert.match(appSource, /if \(type === 'approveTicket'\)/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.update\(\{ status: approvedStatus \}\)/)
  assert.match(appSource, /\.eq\('id', ticketId\)/)
  assert.doesNotMatch(appSource, /markTicketPaid/)

  assert.match(appSource, /if \(type === 'deleteTicket'\)/)
  assert.match(appSource, /\.from\('pickleball_tickets'\)\s*\.delete\(\)/)
})

test('AppV2 routes pickleball writes through the dedicated pickleball group context', () => {
  assert.match(appSource, /function activePickleballGroupId\(state\)/)
  assert.match(appSource, /state\?\.pickleballGroupId \|\| state\?\.pickleballGroup\?\.id \|\| state\?\.currentGroupId/)
  assert.match(appSource, /const groupId = activePickleballGroupId\(state\)[\s\S]*?type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG'/)
  assert.match(appSource, /const groupId = activePickleballGroupId\(state\)[\s\S]*?type: 'ADD_PICKLEBALL_OWNER_PAYMENT'/)
  assert.match(appSource, /const groupId = activePickleballGroupId\(state\)[\s\S]*?\.from\('pickleball_tickets'\)[\s\S]*?group_id: groupId/)
  assert.match(appSource, /function normalizeTicketMemberIds\(value, state\) \{[\s\S]*?const groupId = activePickleballGroupId\(state\)/)
  assert.match(appSource, /function sessionGenerationConfigFromState\(state, yearMonth\) \{[\s\S]*?const groupId = activePickleballGroupId\(state\)/)
})

test('ticket approval migration allows pending member requests', () => {
  const migrationSource = readFileSync(new URL('../supabase/migrations/20260522000002_pickleball_ticket_approval.sql', import.meta.url), 'utf8')

  assert.match(migrationSource, /UPDATE pickleball_tickets[\s\S]*SET status = 'unpaid'[\s\S]*WHERE status = 'paid'/)
  assert.match(migrationSource, /CHECK \(status = ANY \(ARRAY\['unpaid', 'team_fund', 'pending_review'\]\)\)/)
  assert.match(migrationSource, /CREATE POLICY "group members can request tickets"/)
  assert.match(migrationSource, /status = 'pending_review'/)
})

test('store keeps expense group selection separate from pickleball group selection', () => {
  assert.match(storeSource, /pickleballGroupId: null/)
  assert.match(storeSource, /function resolvePickleballGroupId\(state, preferredGroupId = null\)/)
  assert.match(storeSource, /function applyPickleballSelection\(state, preferredGroupId = null\)/)
  const applyGroupBlock = storeSource.match(/function applyGroupSelection\(state, groupId, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || ''
  assert.doesNotMatch(applyGroupBlock, /pickle:\s*pickleForGroup/)
  assert.match(storeSource, /return applyPickleballSelection\(selectedState, preferredGroupId\)/)
  assert.match(storeSource, /type: inferGroupType\(group, pickleGroupIds\)/)
})

test('AppV2 and store clean stale moved replacement sessions without touching tickets', () => {
  assert.match(appSource, /type === 'cleanupStaleReplacementSessions'/)
  assert.match(appSource, /type: 'CLEANUP_STALE_REPLACEMENT_SESSIONS'/)
  assert.match(storeSource, /case 'CLEANUP_STALE_REPLACEMENT_SESSIONS':\s*\{/)
  const block = storeSource.match(/case 'CLEANUP_STALE_REPLACEMENT_SESSIONS':\s*\{[\s\S]*?break\s*\n\s*\}/)?.[0] || ''
  assert.match(block, /staleReplacementSessions\(stateRef\.current/)
  assert.match(block, /hideReplacementSession\(sb, session\)/)
  assert.doesNotMatch(block, /pickleball_tickets/)
})

test('AppV2 passes pickleball settings time and home treasurer role through props', () => {
  assert.match(appSource, /scheduleStartDay: payload\?\.startDate,\s*scheduleTime: payload\?\.scheduleTime,/)
  assert.doesNotMatch(appSource, /courtFee: payload\?\.courtFee,[\s\S]*?scheduleWeekdays: payload\?\.weekdays/)
  assert.doesNotMatch(appSource, /ticketPrice: payload\?\.ticketPrice,[\s\S]*?scheduleWeekdays: payload\?\.weekdays/)
  assert.match(appSource, /return <Home data=\{homeData\} isTreasurer=\{isTreasurer\} onAction=\{handle\} \/>/)
})

test('AppV2 routes treasurer team-fund config through a dedicated screen and handler', () => {
  assert.match(appSource, /import PickleballTeamFund from '\.\/screens\/PickleballTeamFund'/)
  assert.match(appSource, /case 'pickleball-team-fund':\s*return <PickleballTeamFund data=\{getPickleballTeamFundData\(\)\} isTreasurer=\{isPickleballTreasurer\} onAction=\{handle\} \/>/)
  assert.match(appSource, /if \(type === 'saveTeamFundConfig'\)/)
  assert.match(appSource, /type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG'[\s\S]*?courtFee: payload\?\.courtFee[\s\S]*?ticketPrice: payload\?\.ticketPrice/)
  assert.match(appSource, /type: 'SAVE_VENUE_OWNER_BANK'/)
  assert.match(appSource, /venueOwnerName: payload\?\.venueOwnerName/)
  assert.match(appSource, /venueBankName: payload\?\.venueBankName/)
  assert.match(appSource, /venueBankAccount: payload\?\.venueBankAccount/)
  assert.match(appSource, /if \(type === 'markOwnerPayment'\)/)
  assert.match(appSource, /type: 'ADD_PICKLEBALL_OWNER_PAYMENT'/)
  assert.match(appSource, /bankSnapshot: payload\?\.bankSnapshot/)
  assert.match(appSource, /items: payload\?\.items/)
})

test('AppV2 regenerates pickleball schedule from payload weekdays instead of dispatch return', () => {
  const settingsSaveBlock = appSource.match(/if \(type === 'saveSettings'[\s\S]*?setStack\(\(s\) => s\.slice\(0, -1\)\)/)?.[0] || ''

  assert.match(settingsSaveBlock, /const newWeekdays = normalizeScheduleWeekdays\(payload\?\.weekdays\)/)
  assert.match(settingsSaveBlock, /const shouldRegenerateSchedule = !sameScheduleWeekdays\(oldWeekdays, newWeekdays\) \|\| scheduleTimeChanged \|\| scheduleStartChanged \|\| hasScheduledSessionsWithOldDays/)
  assert.match(settingsSaveBlock, /scheduleWeekdays: newWeekdays/)
  assert.doesNotMatch(settingsSaveBlock, /savedWeekdays/)
})

test('AppV2 regenerates scheduled pickleball sessions when schedule time changes', () => {
  const settingsSaveBlock = appSource.match(/if \(type === 'saveSettings'[\s\S]*?setStack\(\(s\) => s\.slice\(0, -1\)\)/)?.[0] || ''

  assert.match(settingsSaveBlock, /const oldScheduleTime = normalizeScheduleTimeForCompare/)
  assert.match(settingsSaveBlock, /const newScheduleTime = normalizeScheduleTimeForCompare\(payload\?\.scheduleTime\)/)
  assert.match(settingsSaveBlock, /const scheduleTimeChanged = oldScheduleTime !== newScheduleTime/)
  assert.match(settingsSaveBlock, /const scheduleStartChanged = oldScheduleStartDay !== newScheduleStartDay/)
  assert.match(settingsSaveBlock, /const shouldRegenerateSchedule = !sameScheduleWeekdays\(oldWeekdays, newWeekdays\) \|\| scheduleTimeChanged \|\| scheduleStartChanged \|\| hasScheduledSessionsWithOldDays/)
})

test('AppV2 saveSettings updates only inherited future pickleball schedule', () => {
  const settingsSaveBlock = appSource.match(/if \(type === 'saveSettings'[\s\S]*?setStack\(\(s\) => s\.slice\(0, -1\)\)/)?.[0] || ''

  assert.match(settingsSaveBlock, /const \[y, m\] = yearMonth\.split\('-'\)\.map\(Number\)/)
  assert.match(settingsSaveBlock, /const nextYearMonth = /)
  assert.match(settingsSaveBlock, /padStart\(2, '0'\)/)
  assert.match(settingsSaveBlock, /const oldEffectiveScheduleConfig = sessionGenerationConfigFromState\(state, yearMonth\)/)
  assert.match(settingsSaveBlock, /const nextMonthlyConfig = findMonthlyPickleConfig\(state, groupId, nextYearMonth\)/)
  assert.match(settingsSaveBlock, /const previousScheduleConfig = \{ scheduleWeekdays: oldWeekdays, scheduleTime: oldScheduleTime, scheduleStartDay: oldScheduleStartDay \}/)
  assert.match(settingsSaveBlock, /const shouldUpdateNextMonthSchedule = shouldRegenerateSchedule && isFutureScheduleInherited\(nextMonthlyConfig, previousScheduleConfig\)/)
  assert.doesNotMatch(settingsSaveBlock, /skipIfExists: true/)
  assert.match(settingsSaveBlock, /\.from\('pickle_sessions'\)[\s\S]*?\.eq\('status', 'scheduled'\)[\s\S]*?\.gte\('session_date', `\$\{nextYearMonth\}-01`\)[\s\S]*?\.lte\('session_date', `\$\{nextYearMonth\}-31`\)/)
  assert.match(settingsSaveBlock, /\.from\('pickleball_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('group_id', groupId\)[\s\S]*?\.or\('status\.is\.null,status\.eq\.scheduled'\)[\s\S]*?\.gte\('date', `\$\{nextYearMonth\}-01`\)[\s\S]*?\.lte\('date', `\$\{nextYearMonth\}-31`\)/)
  assert.match(settingsSaveBlock, /const nextConfig = \{[\s\S]*?\.\.\.sessionGenerationConfigFromState\(state, nextYearMonth\)[\s\S]*?scheduleWeekdays: newWeekdays[\s\S]*?scheduleTime: action\.scheduleTime/)
  assert.match(settingsSaveBlock, /type: 'AUTO_GENERATE_SESSIONS'[\s\S]*?yearMonth: nextYearMonth[\s\S]*?config: nextConfig[\s\S]*?force: true/)
  assert.match(appSource, /function isFutureScheduleInherited\(futureConfig, previousConfig\)/)
  assert.match(settingsSaveBlock, /alert\('Đã lưu cài đặt lịch'\)/)
})

test('AppV2 routes pickleball month navigation through calendar params and auto-generation', () => {
  assert.match(appSource, /if \(type === 'monthPrev' \|\| type === 'monthNext'\)/)
  assert.match(appSource, /const nextYearMonth = shiftYearMonth\(currentYearMonth, type === 'monthNext' \? 1 : -1\)/)
  assert.match(appSource, /screen: 'pickleball-calendar'[\s\S]*params: \{ \.\.\.route\.params, yearMonth: nextYearMonth \}/)
  assert.match(appSource, /type: 'AUTO_GENERATE_SESSIONS'[\s\S]*yearMonth: nextYearMonth[\s\S]*config: generationConfig/)
  assert.match(appSource, /case 'pickleball-calendar': return <PickleballCalendar data=\{getPickleballCalendarData\(route\.params\)\}/)
  assert.match(appSource, /function shiftYearMonth\(yearMonth, delta\)/)
  assert.doesNotMatch(appSource, /'monthPrev',\s*\n\s*'monthNext',/)
})

test('Member management screens are registered in the app source', () => {
  const memberListSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
  assert.match(memberListSource, /const \[search, setSearch\] = useState\(''\)/)
  assert.match(memberListSource, /Xem thêm/)
  assert.match(memberListSource, /onAction\?\.\('memberDetail', \{ memberId: member\.id \}\)/)
  assert.match(memberListSource, /quickAction/)
  assert.match(memberListSource, /Cố định ·/)
  assert.match(memberListSource, /Vãng lai ·/)
  assert.match(memberListSource, /const memberCandidates = d\.memberCandidates \|\| \[\]/)
  assert.match(memberListSource, /selectedCandidateIds/)
  assert.match(memberListSource, /placeholder="Tìm vài ký tự để lọc thành viên"/)
  assert.match(memberListSource, /for \(const candidate of selectedCandidates\)/)
  assert.match(memberListSource, /profileId: candidate\?\.profileId \|\| candidate\?\.id \|\| ''/)
})

test('main renders AppProvider directly without the legacy toast bridge', () => {
  assert.doesNotMatch(mainSource, /ToastProvider/)
  assert.doesNotMatch(mainSource, /useToast/)
  assert.doesNotMatch(mainSource, /onToast=\{addToast\}/)
  assert.match(mainSource, /<AppProvider>\s*<AppV2 \/>\s*<\/AppProvider>/)
})
