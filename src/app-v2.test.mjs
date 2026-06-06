import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseWaterOcrText } from './lib/waterOcrImport.js'

const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const batchEntrySource = readFileSync(new URL('./screens/BatchEntry.jsx', import.meta.url), 'utf8')

const MAY_WATER_OCR_SAMPLE = `
NGÀY
19h30-22h
T2-4-6
GIÁ TIỀN
10k/chai
10k/ chai 12,5k/chai 14k/chai 30k/chai
50k/quả 30k/quả
GHI CHÚ
Tất
THÀNH TIỀN
161
01/05/2026
2
2
4
96.000 đ
96.000 đ
162
04/05/2026
2
4
76.000 đ
76.000 đ
165
09/05/2026
Xé vé
200.000 đ
1
10.000 đ
210.000 đ
173
27/05/2026
2
2
4
88.000 đ
15.000 đ
103.000 đ
175
TỔNG CỘNG
1.445-000đ
`

test('parseWaterOcrText parses dated OCR rows into water quantities and skips totals', () => {
  const result = parseWaterOcrText(MAY_WATER_OCR_SAMPLE)

  assert.equal(result.rows.some(row => row.displayDate === 'TỔNG CỘNG'), false)
  assert.deepEqual(result.rows.map(row => row.displayDate), [
    '01/05/2026',
    '04/05/2026',
    '09/05/2026',
    '27/05/2026',
  ])

  assert.deepEqual(result.rows[0], {
    date: '2026-05-01',
    displayDate: '01/05/2026',
    quantities: {
      10000: 4,
      12000: 0,
      12500: 0,
      14000: 4,
      30000: 0,
    },
    detectedWaterTotal: 96000,
    calculatedWaterTotal: 96000,
    extraNotes: [],
    status: 'ok',
    warnings: [],
  })

  assert.deepEqual(result.rows[1], {
    date: '2026-05-04',
    displayDate: '04/05/2026',
    quantities: {
      10000: 2,
      12000: 0,
      12500: 0,
      14000: 4,
      30000: 0,
    },
    detectedWaterTotal: 76000,
    calculatedWaterTotal: 76000,
    extraNotes: [],
    status: 'ok',
    warnings: [],
  })
})

test('parseWaterOcrText detects xé vé but excludes it from water totals', () => {
  const result = parseWaterOcrText(MAY_WATER_OCR_SAMPLE)
  const row = result.rows.find(item => item.displayDate === '09/05/2026')

  assert.deepEqual(row, {
    date: '2026-05-09',
    displayDate: '09/05/2026',
    quantities: {
      10000: 1,
      12000: 0,
      12500: 0,
      14000: 0,
      30000: 0,
    },
    detectedWaterTotal: 10000,
    calculatedWaterTotal: 10000,
    extraNotes: ['Có xé vé 200.000 đ — không nhập vào nước'],
    status: 'ok',
    warnings: [],
  })
})

test('parseWaterOcrText marks mismatched rows as needs_review', () => {
  const result = parseWaterOcrText(`01/05/2026\n2\n2\n4\n95.000 đ`)

  assert.equal(result.rows[0].status, 'needs_review')
  assert.equal(result.rows[0].calculatedWaterTotal, 88000) // fallback: [10k,10k,12k] → 2*10+2*10+4*12=88k
  assert.equal(result.rows[0].detectedWaterTotal, 95000)
  assert.equal(result.rows[0].warnings.includes('Tổng tiền nước không khớp'), true)
})

test('parseWaterOcrText returns a top-level error for empty or dateless text', () => {
  assert.deepEqual(parseWaterOcrText(''), {
    rows: [],
    error: 'Chưa có dữ liệu để phân tích',
  })
  assert.deepEqual(parseWaterOcrText('TỔNG CỘNG 1.445.000 đ'), {
    rows: [],
    error: 'Không tìm thấy ngày dạng dd/mm/yyyy',
  })
})

test('BatchEntry previews OCR import and only applies ok rows locally', () => {
  assert.match(batchEntrySource, /import \{ parseWaterOcrText \} from '\.\.\/lib\/waterOcrImport\.js'/)
  assert.match(batchEntrySource, /const \[waterImportOpen, setWaterImportOpen\] = useState\(false\)/)
  assert.match(batchEntrySource, /const \[waterImportText, setWaterImportText\] = useState\(''\)/)
  assert.match(batchEntrySource, /const \[waterImportResult, setWaterImportResult\] = useState\(null\)/)
  assert.match(batchEntrySource, /function analyzeWaterImport\(\)/)
  assert.match(batchEntrySource, /function applyWaterImportRows\(\)/)
  assert.match(batchEntrySource, /waterImportResult\?\.rows\s*\|\| \[\][\s\S]*?filter\(row => row\.status === 'ok'\)/)
  assert.match(batchEntrySource, /setSessions\(updatedSessions\)/)
  assert.match(batchEntrySource, /function applyImportedWaterRows\(sessions, rows\)/)
  assert.match(batchEntrySource, /waterAmount: importedAmount/)
  assert.match(batchEntrySource, /waterInput: formatAmountInput\(importedAmount\)/)
  assert.match(batchEntrySource, /Dán dữ liệu Excel\/OCR/)
  assert.match(batchEntrySource, /Phân tích/)
  assert.match(batchEntrySource, /Điền vào bảng nhập nhanh/)
})

test('PinEntryScreen uses a controlled numeric password input instead of a numpad', () => {
  assert.match(appSource, /<input[\s\S]*type="password"[\s\S]*inputMode="numeric"[\s\S]*maxLength=\{6\}/)
  assert.match(appSource, /value=\{value\}/)
  assert.match(appSource, /onChange=\{e => onChange\(e\.target\.value\.replace\(\/\\D\/g, ''\)\.slice\(0, 6\)\)\}/)
  assert.match(appSource, /onKeyDown=\{e => e\.key === 'Enter' && onSubmit\(\)\}/)
  assert.doesNotMatch(appSource, /\[1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7,\s*8,\s*9,\s*'',\s*0,\s*'⌫'\]/)
  assert.doesNotMatch(appSource, /isBackspace/)
})

test('recent session resume asks for the simple PIN input before login when PIN is enabled', () => {
  assert.match(appSource, /const \[pendingPinSession, setPendingPinSession\] = useState\(null\)/)
  assert.match(appSource, /const requiresPin = await checkMemberPinRequired\(payload\?\.memberId\)/)
  assert.doesNotMatch(appSource, /const requiresPin = Boolean\(payload\?\.hasPin\) && await checkMemberPinRequired\(payload\?\.memberId\)/)
  assert.match(appSource, /async function checkMemberPinRequired\(memberId, profileId\)/)
  assert.match(appSource, /if \(profileId\) \{[\s\S]*?return profilePinRequired\(profileId\)/)
  assert.match(appSource, /\.rpc\('member_pin_required'/)
  assert.match(appSource, /if \(!awaitingPin \|\| pendingPinSession\) return/)
  assert.match(appSource, /setAwaitingPin\(false\)/)
  assert.match(appSource, /async function verifyMemberPin\(memberId, pin\)/)
  assert.match(appSource, /const member = safeArray\(state\?\.members\)\.find\(member => String\(member\.id\) === String\(memberId\)\)/)
  assert.match(appSource, /const profileId = member\?\.profileId \|\| member\?\.profile_id[\s\S]*?if \(profileId\) return verifyProfilePin\(profileId, pin\)/)
  assert.match(appSource, /getTokenAfterPinVerify\(memberId, pin\)/)
  assert.doesNotMatch(appSource, /localStorage\.getItem\('spliteasy_pin'\)/)
  assert.doesNotMatch(appSource, /memberPinStorageKey/)
  assert.match(appSource, /setPendingPinSession\(payload\)/)
  assert.match(appSource, /const useProfilePath = !!\(pending\?\.profileId && !pending\?\.memberId\)/)
  assert.match(appSource, /if \(useProfilePath\) \{[\s\S]*?\.rpc\('verify_pin_by_profile'/)
  assert.match(appSource, /pinOk = await verifyMemberPin\(memberId, value\)/)
  assert.match(appSource, /const pending = pendingPinSession[\s\S]*handle\('resumeRecentSession', \{ \.\.\.pending, hasPin: false \}\)/)
  assert.ok(appSource.indexOf('async function submitPin') < appSource.lastIndexOf('if (!state.currentUserId)'))
})

test('PIN unlock session keys prefer profile identity over member identity', () => {
  assert.match(appSource, /function currentProfileId\(state\) \{/)
  assert.match(appSource, /sessionStorage\.getItem\(PIN_UNLOCK_KEY\) !== \(member\?\.profileId \|\| member\?\.profile_id \|\| memberId\)/)
  assert.match(appSource, /const pinKey = profileId \|\| memberId/)
  assert.doesNotMatch(appSource, /const pinKey = memberId \|\| profileId/)
  assert.match(appSource, /sessionStorage\.setItem\(PIN_UNLOCK_KEY, currentProfileId\(state\) \|\| state\.currentUserId\)/)
  assert.match(appSource, /const member = safeArray\(state\?\.members\)\.find\(m => String\(m\.id\) === String\(payload\?\.memberId\)\)/)
  assert.match(appSource, /const pinKey = member\?\.profileId \|\| member\?\.profile_id \|\| payload\?\.memberId/)
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

test('AppV2 sends payment confirmations to treasurer notifications', () => {
  const block = appSource.slice(
    appSource.indexOf("if (type === 'confirmPaymentSent')"),
    appSource.indexOf('const ACTION_TO_SCREEN')
  )
  assert.match(block, /dispatch\(\{\s*type: 'SEND_PAYMENT_NOTIFICATION'/)
  assert.match(block, /targetMemberId: payload\?\.paymentTarget\?\.memberId/)
  assert.match(block, /coveredMembers: covered/)
  assert.match(block, /coveredSources/)
  assert.match(block, /await dispatch\(\{ type: 'REFRESH' \}\)/)
  assert.match(appSource, /if \(type === 'confirmPaymentNotice' \|\| type === 'rejectPaymentNotice'\)/)
  assert.match(appSource, /type: 'REVIEW_PAYMENT_NOTIFICATION'/)
  assert.match(appSource, /status: type === 'confirmPaymentNotice' \? 'confirmed' : 'rejected'/)
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
  assert.match(appSource, /if \(type === 'addExpenseGroupMember'\)/)
  assert.match(appSource, /if \(type === 'addPickleballMember'\)/)
  assert.match(appSource, /member_type: payload\?\.type/)
  assert.match(appSource, /const duplicateTargetMember = isPickleballGroup[\s\S]*?findDuplicatePickleballMemberForType\(state, currentMember, targetGroupId, targetType\)/)
  assert.match(appSource, /\.update\(\{ is_active: false \}\)[\s\S]*?\.eq\('id', duplicateTargetMember\.id\)[\s\S]*?\.eq\('group_id', targetGroupId\)/)
  assert.doesNotMatch(appSource, /groupId: payload\?\.groupId \|\| activePickleballGroupId\(state\)/)
  assert.match(appSource, /if \(payload\?\.groupId\) request = request\.eq\('group_id', payload\.groupId\)/)
  assert.match(appSource, /if \(type === 'removePickleballMember'\)/)
  assert.match(appSource, /const targetGroupId = payload\?\.groupId \|\| state\.currentGroupId/)
  assert.match(appSource, /const currentGroup = \(state\.groups \|\| \[\]\)\.find\(group => String\(group\.id\) === String\(targetGroupId\)\)/)
  assert.match(appSource, /const isPickleballGroup = isPickleballActionGroup\(currentGroup\)/)
  assert.match(appSource, /function isPickleballActionGroup\(group\) \{/)
  assert.match(appSource, /const explicit = String\(group\?\.type \|\| group\?\.kind \|\| group\?\.groupType \|\| group\?\.group_type \|\| ''\)\.toLowerCase\(\)/)
  assert.match(appSource, /return explicit === 'pickleball'/)
  assert.doesNotMatch(appSource, /groupText\.includes\('pickle'\)/)
  assert.match(appSource, /if \(!isPickleballGroup\) return/)
  assert.match(appSource, /\.update\(\{ is_active: false \}\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)/)
  assert.match(appSource, /if \(type === 'reactivateMember'\)/)
  const reactivateBlock = appSource.slice(
    appSource.indexOf("if (type === 'reactivateMember')"),
    appSource.indexOf("if (type === 'addTicket')")
  )
  assert.match(reactivateBlock, /\.update\(\{ member_type: 'fixed', is_active: true \}\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)/)
  assert.match(reactivateBlock, /\.rpc\('add_expense_group_member', \{[\s\S]*?p_group_id: targetGroupId,[\s\S]*?p_member_id: memberId,/)
})

test('AppV2 editMember falls back to membership update when profile RLS returns no rows', () => {
  const editMemberBlock = appSource.slice(
    appSource.indexOf("if (type === 'editMember')"),
    appSource.indexOf("if (type === 'linkProfile')")
  )

  assert.match(editMemberBlock, /let updatedRows = \[\]/)
  assert.match(editMemberBlock, /if \(profileId\) \{[\s\S]*?\.from\('profiles'\)[\s\S]*?\.update\(profileUpdate\)[\s\S]*?\.eq\('id', profileId\)[\s\S]*?\.select\('id'\)/)
  assert.match(editMemberBlock, /if \(!safeArray\(updatedRows\)\.length\) \{[\s\S]*?\.from\('members'\)[\s\S]*?\.update\(memberUpdate\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)[\s\S]*?\.select\('id'\)/)
  assert.match(editMemberBlock, /if \(!safeArray\(updatedRows\)\.length\) throw new Error\(`Không thể cập nhật thành viên/)
})

test('AppV2 uses the profile-aware role RPC for expense groups', () => {
  const roleBlock = appSource.slice(
    appSource.indexOf("if (type === 'setMemberRole')"),
    appSource.indexOf("if (type === 'setMemberType')")
  )
  assert.match(roleBlock, /const groupId = payload\?\.groupId \|\| member\?\.group_id \|\| member\?\.groupId/)
  assert.match(roleBlock, /isPickleballActionGroup\(currentGroup\)/)
  assert.match(roleBlock, /\.rpc\('set_expense_group_member_role'/)
  assert.match(roleBlock, /p_group_id: groupId/)
  assert.match(roleBlock, /p_member_id: memberId/)
  assert.match(roleBlock, /p_role: payload\?\.role/)
  assert.match(roleBlock, /\.from\('members'\)[\s\S]*\.update\(\{ role: payload\?\.role \}\)[\s\S]*\.eq\('id', memberId\)/)
})

test('AppV2 edit group preserves descriptions for expense group settings', () => {
  assert.match(appSource, /if \(type === 'editGroup'\)/)
  assert.match(appSource, /description: group\.description \|\| '',/)
  assert.match(appSource, /\.rpc\('edit_expense_group'/)
  assert.match(storeSource, /const normalGroups = activeGroups\.map\(group => \(\{[\s\S]*?description: group\.description \|\| '',/)
  assert.match(storeSource, /case 'EDIT_GROUP':/)
  assert.match(storeSource, /description: action\.group\.description \|\| '',/)
})

test('AppV2 deletes expense groups through the profile-aware RPC', () => {
  const deleteGroupBlock = appSource.slice(
    appSource.indexOf("if (type === 'deleteGroup')"),
    appSource.indexOf("if (type === 'editMember')")
  )
  assert.match(deleteGroupBlock, /\.rpc\('delete_expense_group'/)
  assert.match(deleteGroupBlock, /p_group_id: groupId/)
  assert.match(deleteGroupBlock, /throw error \|\| new Error\(data\.error\)/)
  assert.match(deleteGroupBlock, /await dispatch\(\{ type: 'REFRESH' \}\)/)
  assert.doesNotMatch(deleteGroupBlock, /type: 'DELETE_GROUP'/)
  assert.match(storeSource, /case 'DELETE_GROUP':[\s\S]*\.rpc\('delete_expense_group'/)
  assert.doesNotMatch(storeSource, /case 'DELETE_GROUP':[\s\S]*\.from\('groups'\)[\s\S]*deleted_at: new Date\(\)\.toISOString\(\)/)
})

test('AppV2 uses expense-group RPCs for normal member edits instead of pickleball writes', () => {
  assert.match(appSource, /if \(type === 'addExpenseGroupMember'\)/)
  assert.match(appSource, /\.rpc\('add_expense_group_member'/)
  assert.match(appSource, /p_member_id: memberId \|\| null/)
  assert.match(appSource, /p_profile_id: payload\?\.profileId \|\| payload\?\.profile_id \|\| null/)
  const addExpenseBlock = appSource.slice(
    appSource.indexOf("if (type === 'addExpenseGroupMember')"),
    appSource.indexOf("if (type === 'addPickleballMember')")
  )
  assert.doesNotMatch(addExpenseBlock, /type: 'ADD_MEMBER'/)
  assert.doesNotMatch(addExpenseBlock, /activePickleballGroupId/)
})

test('AppV2 saves normal expense-group expenses through profile-aware RPCs', () => {
  const saveBlock = appSource.slice(
    appSource.indexOf("if (type === 'save' || type === 'saveExpense')"),
    appSource.indexOf("if (type === 'confirmPeriod')")
  )
  assert.match(saveBlock, /\.rpc\('create_expense_group_expense'/)
  assert.match(saveBlock, /\.rpc\('update_expense_group_expense'/)
  assert.match(saveBlock, /p_expense_id: expense\.id/)
  assert.match(saveBlock, /p_group_id: groupId/)
  assert.match(saveBlock, /p_paid_by_member_id: expense\.paidBy/)
  assert.match(saveBlock, /p_participant_ids: expense\.participants/)
  assert.match(saveBlock, /p_receipt_images: expense\.receiptImages/)
  assert.match(saveBlock, /await dispatch\(\{ type: 'REFRESH' \}\)/)
  assert.match(saveBlock, /throw error \|\| new Error\(data\.error\)/)
})

test('member deletion is confirmed with the shared in-app sheet before dispatch', () => {
  const memberListSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
  const memberDetailSource = readFileSync(new URL('./screens/MemberDetail.jsx', import.meta.url), 'utf8')

  assert.match(memberListSource, /BottomSheet/)
  assert.match(memberListSource, /const \[deleteConfirmMember, setDeleteConfirmMember\] = useState\(null\)/)
  assert.match(memberListSource, /title="Xóa thành viên\?"/)
  assert.match(memberListSource, /Thành viên sẽ được ẩn khỏi danh sách nhóm\. Bạn có thể thêm lại sau\./)
  assert.match(memberListSource, />Hủy<\/Button>/)
  assert.match(memberListSource, /variant="danger"[\s\S]*savingAction === 'deleteMember' \? 'Đang xóa…' : 'Xác nhận'[\s\S]*<\/Button>/)
  assert.match(dataSource, /groupId: currentGroup\(state\)\?\.id/)
  assert.match(memberListSource, /await onAction\?\.\('removePickleballMember', \{ memberId: deleteConfirmMember\.id, groupId: data\.groupId \}\)/)
  assert.doesNotMatch(memberListSource, /window\.confirm\(`Xóa \$\{member\.name\} khỏi nhóm\?`\)/)

  assert.match(memberDetailSource, /BottomSheet/)
  assert.match(memberDetailSource, /const \[showDeleteConfirm, setShowDeleteConfirm\] = useState\(false\)/)
  assert.match(memberDetailSource, /title="Xóa thành viên\?"/)
  assert.match(memberDetailSource, /Thành viên sẽ được ẩn khỏi danh sách nhóm\. Bạn có thể thêm lại sau\./)
  assert.match(memberDetailSource, /await onAction\?\.\('removePickleballMember', \{ memberId: d\.id, groupId: d\.groupId \}\)/)
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
  assert.match(appSource, /const actorMemberId = activePickleballActorMemberId\(state, groupId\)/)
  assert.match(appSource, /const ticketStatus = isPickleballTreasurer \? \(advancerId \? 'unpaid' : 'team_fund'\) : 'pending_review'/)
  assert.match(appSource, /session_date: sessionDate/)
  assert.match(appSource, /session_time: sessionTime/)
  assert.match(appSource, /member_ids: memberIds/)
  assert.match(appSource, /advancer_id: advancerId/)
  assert.match(appSource, /status: ticketStatus/)
  assert.match(appSource, /year_month: monthKey\(sessionDate \|\| new Date\(\)\)/)
  assert.match(appSource, /created_by: actorMemberId/)

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
  assert.match(appSource, /\.eq\('id', ticketId\)\s*\.select\('id'\)/)
  assert.match(appSource, /Không xóa được vé lẻ/)
})

test('AppV2 handles expense edit delete and approval actions', () => {
  assert.match(appSource, /if \(type === 'editExpense'\)/)
  assert.match(appSource, /screen: 'add-expense'[\s\S]*params: \{ expenseId: payload\.expenseId \}/)

  assert.match(appSource, /if \(type === 'deleteExpense'\)/)
  assert.match(appSource, /const groupId = payload\?\.groupId \|\| expenseGroupId\(state, expenseId\)/)
  assert.match(appSource, /\.rpc\('delete_expense_group_expense'/)
  assert.match(appSource, /p_expense_id: expenseId/)
  assert.match(appSource, /p_group_id: groupId/)
  assert.match(appSource, /await dispatch\(\{ type: 'REFRESH' \}\)/)

  assert.match(appSource, /if \(type === 'approveExpense'\)/)
  assert.match(appSource, /\.rpc\('review_expense_group_expense'/)
  assert.match(appSource, /p_status: 'approved'/)
  assert.match(appSource, /if \(type === 'rejectExpense'\)/)
  assert.match(appSource, /p_status: 'rejected'/)
})

test('GroupDetail renders expense action menu and pending approval UI', () => {
  const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')

  assert.match(groupDetailSource, /pendingExpenses = d\.pendingExpenses \|\| \[\]/)
  assert.match(groupDetailSource, /ownPendingExpenses = pendingExpenses\.filter\(expense => String\(expense\.submittedBy \|\| ''\) === String\(d\.currentMemberId \|\| ''\)\)/)
  assert.match(groupDetailSource, /CHỜ DUYỆT · \{pendingExpenses\.length\}/)
  assert.match(groupDetailSource, /PendingStatusAlert/)
  assert.match(groupDetailSource, /Đang chờ duyệt/)
  assert.match(groupDetailSource, /!isTreasurer && ownPendingExpenses\.length > 0/)
  assert.match(groupDetailSource, /setActiveTab\('activity'\)/)
  assert.match(groupDetailSource, /function PendingExpenseCard\(\{ expense, onApprove, onReject \}\)/)
  assert.match(groupDetailSource, /onAction\?\.\('approveExpense', \{ expenseId: expense\.id, groupId: d\.id \}\)/)
  assert.match(groupDetailSource, /onAction\?\.\('rejectExpense', \{ expenseId: expense\.id, groupId: d\.id \}\)/)

  assert.match(groupDetailSource, /function ActivityCard\(\{ item, isTreasurer, currentMemberId, onAction, onMenu \}\)/)
  assert.match(groupDetailSource, /item\.submittedBy === currentMemberId/)
  assert.match(groupDetailSource, /item\.status === 'pending'/)
  assert.match(groupDetailSource, /✏️ Sửa chi tiêu/)
  assert.match(groupDetailSource, /🗑️ Xóa chi tiêu/)
  assert.match(groupDetailSource, /onAction\?\.\('editExpense', \{ expenseId: expenseMenu\.id \}\)/)
  assert.match(groupDetailSource, /onAction\?\.\('deleteExpense', \{ expenseId: deleteConfirmExpense\.id \}\)/)
  assert.match(groupDetailSource, /Chờ duyệt/)
})

test('AppV2 routes pickleball writes through the dedicated pickleball group context', () => {
  assert.match(appSource, /function activePickleballGroupId\(state\)/)
  assert.match(appSource, /state\?\.pickleballGroupId \|\| state\?\.pickleballGroup\?\.id \|\| state\?\.currentGroupId/)
  assert.match(appSource, /const groupId = activePickleballGroupId\(state\)[\s\S]*?type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG'/)
  assert.match(appSource, /const groupId = activePickleballGroupId\(state\)[\s\S]*?type: 'ADD_PICKLEBALL_OWNER_PAYMENT'/)
  assert.match(appSource, /const groupId = activePickleballGroupId\(state\)[\s\S]*?\.from\('pickleball_tickets'\)[\s\S]*?group_id: groupId/)
  assert.match(appSource, /function normalizeTicketMemberIds\(value, state\) \{[\s\S]*?const groupId = activePickleballGroupId\(state\)/)
  assert.match(appSource, /function activePickleballActorMemberId\(state, groupId = activePickleballGroupId\(state\)\)/)
  assert.match(appSource, /memberIdentityKey\(member\) === currentIdentity/)
  assert.match(appSource, /function sessionGenerationConfigFromState\(state, yearMonth\) \{[\s\S]*?const groupId = activePickleballGroupId\(state\)/)
})

test('ticket approval migration allows pending member requests', () => {
  const migrationSource = readFileSync(new URL('../supabase/migrations/20260522000002_pickleball_ticket_approval.sql', import.meta.url), 'utf8')
  const profileMemberIdsSource = readFileSync(new URL('../supabase/migrations/20260527000001_pickleball_ticket_member_ids.sql', import.meta.url), 'utf8')
  const deletePolicySource = readFileSync(new URL('../supabase/migrations/20260527000007_pickleball_ticket_delete_policy.sql', import.meta.url), 'utf8')

  assert.match(migrationSource, /UPDATE pickleball_tickets[\s\S]*SET status = 'unpaid'[\s\S]*WHERE status = 'paid'/)
  assert.match(migrationSource, /CHECK \(status = ANY \(ARRAY\['unpaid', 'team_fund', 'pending_review'\]\)\)/)
  assert.match(migrationSource, /CREATE POLICY "group members can request tickets"/)
  assert.match(migrationSource, /status = 'pending_review'/)
  assert.match(profileMemberIdsSource, /CREATE OR REPLACE FUNCTION public\.get_my_member_ids\(\)/)
  assert.match(profileMemberIdsSource, /actor\.profile_id IS NOT NULL AND m\.profile_id = actor\.profile_id/)
  assert.match(deletePolicySource, /ALTER TABLE public\.pickleball_tickets ENABLE ROW LEVEL SECURITY/)
  assert.match(deletePolicySource, /ON public\.pickleball_tickets FOR DELETE/)
  assert.match(deletePolicySource, /m\.id IN \(SELECT public\.get_my_member_ids\(\)\)/)
  assert.match(deletePolicySource, /m\.role = 'treasurer'/)
  assert.match(deletePolicySource, /m\.is_active IS DISTINCT FROM false/)
})

test('expense approval migration allows rejected review status', () => {
  const migrationSource = readFileSync(new URL('../supabase/migrations/20260524000001_expense_rejected_status.sql', import.meta.url), 'utf8')

  assert.match(migrationSource, /CHECK \(status IN \('pending', 'approved', 'declined', 'rejected'\)\)/)
  assert.match(migrationSource, /status IN \('approved', 'declined', 'rejected'\)/)
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
  assert.match(appSource, /return <Home data=\{homeData\} isTreasurer=\{isTreasurer\} paymentOpen=\{homePaymentOpen\} onPaymentClose=\{\(\) => handle\('closeHomePayment'\)\} onAction=\{handle\} \/>/)
})

test('AppV2 routes treasurer team-fund config through a dedicated screen and handler', () => {
  assert.match(appSource, /import PickleballTeamFund from '\.\/screens\/PickleballTeamFund'/)
  assert.match(appSource, /case 'pickleball-team-fund':\s*return <PickleballTeamFund data=\{getPickleballTeamFundData\(route\.params\)\} isTreasurer=\{isPickleballTreasurer\} onAction=\{handle\} \/>/)
  assert.match(appSource, /if \(type === 'saveTeamFundConfig'\)/)
  assert.match(appSource, /type: 'SAVE_PICKLEBALL_MONTHLY_CONFIG'[\s\S]*?courtFee: payload\?\.courtFee[\s\S]*?ticketPrice: payload\?\.ticketPrice/)
  assert.match(appSource, /type: 'SAVE_VENUE_OWNER_BANK'/)
  assert.match(appSource, /venueOwnerName: payload\?\.venueOwnerName/)
  assert.match(appSource, /venueBankName: payload\?\.venueBankName/)
  assert.match(appSource, /venueBankAccount: payload\?\.venueBankAccount/)
  assert.match(appSource, /if \(type === 'markOwnerPayment'\)/)
  assert.match(appSource, /type: 'ADD_PICKLEBALL_OWNER_PAYMENT'/)
  assert.match(appSource, /if \(type === 'unmarkOwnerPayment'\)/)
  assert.match(appSource, /type: 'UNMARK_PICKLEBALL_OWNER_PAYMENT_ITEM'/)
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
  assert.match(memberListSource, /placeholder="Tìm thành viên hoặc nhập tên mới"/)
  assert.match(memberListSource, /const typedMemberName = candidateQuery\.trim\(\)/)
  assert.match(memberListSource, /for \(const candidate of candidatesToAdd\)/)
  assert.match(memberListSource, /profileId: candidate\?\.profileId \|\| candidate\?\.id \|\| ''/)
})

test('main renders AppProvider directly without the legacy toast bridge', () => {
  assert.doesNotMatch(mainSource, /ToastProvider/)
  assert.doesNotMatch(mainSource, /useToast/)
  assert.doesNotMatch(mainSource, /onToast=\{addToast\}/)
  assert.match(mainSource, /<AppProvider>\s*<AppV2 \/>\s*<\/AppProvider>/)
})
