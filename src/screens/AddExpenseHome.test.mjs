import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const addExpenseSource = readFileSync(new URL('./AddExpense.jsx', import.meta.url), 'utf8');
const groupDetailSource = readFileSync(new URL('./GroupDetail.jsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');
const expenseDetailSource = readFileSync(new URL('./ExpenseDetail.jsx', import.meta.url), 'utf8');
const screenDataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');
const primitivesSource = readFileSync(new URL('../primitives.jsx', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../store.jsx', import.meta.url), 'utf8');

test('AddExpense defaults to the logged-in member and submits edit expense ids', () => {
  assert.match(addExpenseSource, /const editExpense = d\.editExpense/);
  assert.match(addExpenseSource, /useState\(\(\) => editExpense\?\.paidBy \?\? d\.currentMemberId \?\? ''\)/);
  assert.match(addExpenseSource, /<h1[\s\S]*\{editExpense \? 'Sửa chi tiêu' : 'Thêm chi tiêu'\}/);
  assert.match(addExpenseSource, /expenseId: editExpense\?\.id/);
  assert.match(addExpenseSource, /Chia trong nhóm · \{d\.memberCount \|\| \(d\.members \|\| \[\]\)\.length\} thành viên/);
  assert.match(addExpenseSource, /\{d\.groupEmoji \|\| '👥'\}/);
});

test('AddExpense uses scroll date picker and supports receipt image previews', () => {
  assert.match(addExpenseSource, /const \[datePickerOpen, setDatePickerOpen\] = useState\(false\)/);
  assert.match(addExpenseSource, /function DateScrollPicker\(\{ value, onChange, onClose \}\)/);
  assert.match(addExpenseSource, /const years = Array\.from\(\{ length: 7 \}/);
  assert.match(addExpenseSource, /overflowY: 'auto'/);
  assert.match(addExpenseSource, /setDatePickerOpen\(true\)/);
  assert.match(addExpenseSource, /function ReceiptImages\(\{ images, onAdd, onRemove \}\)/);
  assert.match(addExpenseSource, /accept="image\/\*"/);
  assert.match(addExpenseSource, /URL\.createObjectURL\(file\)/);
  assert.match(addExpenseSource, /receiptImages/);
});

test('GroupDetail menu, balances, and members tabs render real group data', () => {
  assert.match(groupDetailSource, /const \[menuOpen, setMenuOpen\] = useState\(false\)/);
  assert.match(groupDetailSource, /onAction\?\.\('addExpense', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /onAction\?\.\('settle', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /Sửa thông tin nhóm/);
  assert.match(groupDetailSource, /Mã mời thành viên/);
  assert.match(groupDetailSource, /Xóa nhóm/);
  assert.match(groupDetailSource, /onAction\?\.\('editGroup'/);
  assert.match(groupDetailSource, /onAction\?\.\('deleteGroup', \{ groupId: d\.id \}\)/);
  assert.doesNotMatch(groupDetailSource, /\{ key: 'balances', label: 'Số dư' \}/);
  assert.doesNotMatch(groupDetailSource, /activeTab === 'balances'/);
  assert.match(groupDetailSource, /activeTab === 'members'/);
  assert.match(groupDetailSource, /\+ Thêm thành viên/);
  assert.match(groupDetailSource, /<MemberRow[\s\S]*key=\{member\.id\}[\s\S]*member=\{member\}[\s\S]*onMore=\{setMemberMenu\}/);
  assert.match(groupDetailSource, /Sửa thành viên/);
  assert.match(groupDetailSource, /Cấp quyền thủ quỹ/);
  assert.match(groupDetailSource, /Xóa khỏi nhóm/);
  assert.match(groupDetailSource, /Tên tài khoản/);
  assert.match(groupDetailSource, /Số tài khoản/);
  assert.match(screenDataSource, /balanceRows: groupMembers/);
});

test('GroupDetail member management writes normal group and bank fields', () => {
  assert.match(groupDetailSource, /function AddMemberEditor\(\{ title, groupId, candidates = \[\], onClose, onAction \}\)/);
  assert.match(groupDetailSource, /Thành viên có sẵn/);
  assert.match(groupDetailSource, /candidateCards/);
  assert.match(groupDetailSource, /selectedCandidateIds\.includes\(String\(candidate\.id\)\)/);
  assert.match(groupDetailSource, /filteredCandidateCards/);
  assert.match(groupDetailSource, /placeholder="Tìm vài ký tự để lọc thành viên"/);
  assert.match(groupDetailSource, /\.normalize\('NFD'\)/);
  assert.match(groupDetailSource, /selectedCandidates = candidates\.filter\(candidate => selectedCandidateIds\.includes\(String\(candidate\.id\)\)\)/);
  assert.match(groupDetailSource, /for \(const candidate of selectedCandidates\)/);
  assert.match(groupDetailSource, /await onAction\?\.\('addMember', \{[\s\S]*profileId: candidate\?\.profileId \|\| candidate\?\.id \|\| '',[\s\S]*\}\)/);
  assert.match(groupDetailSource, /Hoặc nhập tên mới/);
  assert.match(groupDetailSource, /await onAction\?\.\('addMember', \{[\s\S]*groupId,[\s\S]*name: cleanName,[\s\S]*profileId: '',[\s\S]*\}\)/);
  const addMemberEditorSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function AddMemberEditor'),
    groupDetailSource.indexOf('function EditMemberEditor')
  );
  assert.doesNotMatch(addMemberEditorSource, /Tên tài khoản|Ngân hàng|Số tài khoản/);
  assert.match(appSource, /groupId: payload\?\.groupId \|\| activePickleballGroupId\(state\)/);
  assert.match(appSource, /bank_account: payload\?\.bankAccount \?\? payload\?\.bank_account/);
  assert.match(appSource, /bank_account_name: payload\?\.bankAccountName \?\? payload\?\.bank_account_name/);
  assert.match(screenDataSource, /color: g\.color \|\| '#574EFA'/);
  assert.match(screenDataSource, /memberCandidates: buildGroupMemberCandidates\(g, members\)/);
  assert.match(screenDataSource, /const currentProfileIds = new Set\(currentMembers\.map\(member => String\(member\.profileId \|\| member\.profile_id \|\| member\.id\)\)\)/);
  assert.match(screenDataSource, /\.filter\(isActiveMember\)/);
  assert.match(screenDataSource, /!currentProfileIds\.has\(String\(member\.profileId \|\| member\.profile_id \|\| member\.id\)\)/);
  assert.match(screenDataSource, /bankName: member\.bankName \|\| member\.bank_name \|\| ''/);
  assert.match(screenDataSource, /bankAccount: member\.bankAccount \|\| member\.bank_account \|\| ''/);
  assert.match(screenDataSource, /bankAccountName: member\.bankAccountName \|\| member\.bank_account_name \|\| ''/);
});

test('GroupDetail keeps bank fields only in edit member sheet', () => {
  assert.match(groupDetailSource, /function EditMemberEditor\(\{ title, member, onClose, onAction \}\)/);
  assert.match(groupDetailSource, /<Field label="Tên tài khoản" value=\{bankAccountName\}/);
  assert.match(groupDetailSource, /<BankSelect value=\{bankName\} onChange=\{setBankName\} \/>/);
  assert.match(groupDetailSource, /<Field label="Số tài khoản" value=\{bankAccount\}/);
});

test('GroupDetail member cards open a detail view with edit and delete actions', () => {
  assert.match(groupDetailSource, /const \[selectedMember, setSelectedMember\] = useState\(null\)/);
  assert.match(groupDetailSource, /onOpen=\{setSelectedMember\}/);
  assert.match(groupDetailSource, /function MemberDetailPanel\(\{ groupName, member, isTreasurer, onBack, onEdit, onDelete \}\)/);
  assert.match(groupDetailSource, /Chi tiết thành viên/);
  assert.match(groupDetailSource, /SỐ DƯ TRONG NHÓM/);
  assert.match(groupDetailSource, /THÔNG TIN THANH TOÁN/);
  assert.match(groupDetailSource, /onClick=\{\(\) => onOpen\?\.\(member\)\}/);
  assert.match(groupDetailSource, /event\.stopPropagation\(\)/);
  assert.match(groupDetailSource, /onEdit=\{\(\) => \{ setEditingMember\(selectedMember\); setSelectedMember\(null\); \}\}/);
  assert.match(groupDetailSource, /onDelete=\{async \(\) => \{[\s\S]*deleteMember', \{ memberId: selectedMember\.id \}/);
});

test('GroupDetail delete member does not depend on native confirm dialogs', () => {
  assert.doesNotMatch(groupDetailSource, /window\.confirm\(`Xóa \$\{selectedMember\.name\} khỏi nhóm\?`\)/);
  assert.doesNotMatch(groupDetailSource, /window\.confirm\(`Xóa \$\{memberMenu\.name\} khỏi nhóm\?`\)/);
  assert.match(groupDetailSource, /await onAction\?\.\('deleteMember', \{ memberId: memberMenu\.id \}\)/);
});

test('GroupDetail hides member bank accounts unless treasurer or self', () => {
  assert.match(groupDetailSource, /function canViewMemberBank\(member, isTreasurer\)/);
  assert.match(groupDetailSource, /member\.isCurrentUser/);
  assert.match(groupDetailSource, /const canViewBank = canViewMemberBank\(member, isTreasurer\)/);
  assert.match(groupDetailSource, /canViewBank \? `\$\{member\.bankName\} · \$\{maskAccount\(member\.bankAccount\)\}` : 'Đã cập nhật ngân hàng'/);
  assert.match(groupDetailSource, /canViewBank && member\.bankAccount/);
  assert.match(groupDetailSource, /Ẩn với thành viên khác/);
  assert.match(screenDataSource, /isCurrentUser: String\(member\.id\) === String\(currentGroupMember\?\.id \|\| ''\)/);
});

test('Screen data excludes inactive memberships from group member lists', () => {
  assert.match(screenDataSource, /function membersForGroup\(group, members\) \{/);
  assert.match(screenDataSource, /\.filter\(isActiveMember\)\.filter\(member => \(/);
});

test('GroupDetail member detail shows payer transactions for the selected month', () => {
  assert.match(screenDataSource, /payerTransactions: buildMemberPayerTransactions\(g, member\.id, selectedYearMonth\)/);
  assert.match(screenDataSource, /function buildMemberPayerTransactions\(group, memberId, selectedYearMonth\)/);
  assert.match(groupDetailSource, /THÁNG NÀY ĐÃ THANH TOÁN/);
  assert.match(groupDetailSource, /member\.payerTransactions/);
  assert.match(groupDetailSource, /function MemberPaidTransactionRow\(\{ transaction \}\)/);
});

test('App uses one selectedYearMonth across home, groups, group detail, and pickleball screens', () => {
  assert.match(storeSource, /selectedYearMonth: monthKey\(new Date\(\)\)/);
  assert.match(storeSource, /case 'SET_SELECTED_MONTH':/);
  assert.match(appSource, /dispatch\(\{ type: 'SET_SELECTED_MONTH', selectedYearMonth: nextYearMonth \}\)/);
  assert.match(screenDataSource, /selectedYearMonth = monthKey\(new Date\(\)\)/);
  assert.match(screenDataSource, /buildHomeData\(state, currentUserId, members, groups, pickle, pickleballState, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildGroupsListData\(groups, currentUserId, members, currentUserName, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildGroupDetailData\(group, currentUserId, members, currentUserName, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildPickleballOverviewData\(pickleballState, pickle, _allPickle, currentUserId, members, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildPickleballMembersData\(pickleballState, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildMemberDetailData\(pickleballState, memberId, selectedYearMonth\)/);
});

test('GroupDetail uses group-specific treasurer role for normal expense groups', () => {
  assert.match(screenDataSource, /const currentGroupMember = groupMembers\.find\(member => String\(member\.id\) === String\(memberIdForGroup\(g, currentUserId, members, currentUserName\)\)\)/);
  assert.match(screenDataSource, /const isSoloExpenseGroup = groupMembers\.length === 1 && groupKind\(g\) !== 'pickleball'/);
  assert.match(screenDataSource, /const isGroupTreasurer = currentGroupMember\?\.role === 'treasurer' \|\| String\(g\.createdBy \|\| g\.created_by \|\| ''\) === String\(currentGroupMember\?\.id \|\| ''\) \|\| \(Boolean\(currentGroupMember\) && isSoloExpenseGroup\)/);
  assert.match(screenDataSource, /isTreasurer: isGroupTreasurer/);
  assert.match(appSource, /const detailData = route\.params\?\.groupId \? getGroupDetailData\(route\.params\.groupId\) : groupDetailData/);
  assert.match(appSource, /<GroupDetail data=\{detailData\} isTreasurer=\{detailData\?\.isTreasurer \?\? isTreasurer\} onAction=\{handle\} \/>/);
});

test('Store preserves expense group creator for group-level management', () => {
  assert.match(screenDataSource, /createdBy: g\.createdBy \|\| g\.created_by \|\| null/);
  assert.match(storeSource, /createdBy: group\.created_by \|\| null/);
  assert.match(storeSource, /created_by: group\.created_by \|\| null/);
  assert.match(storeSource, /\.from\('members'\)[\s\S]*\.update\(\{ role: 'treasurer' \}\)[\s\S]*\.eq\('id', joined\.member_id\)/);
  assert.match(appSource, /const detailData = route\.params\?\.groupId \? getGroupDetailData\(route\.params\.groupId\) : groupDetailData/);
  assert.match(appSource, /<GroupDetail data=\{detailData\} isTreasurer=\{detailData\?\.isTreasurer \?\? isTreasurer\} onAction=\{handle\} \/>/);
});

test('Home activity list filters by title, status, and category', () => {
  assert.match(homeSource, /import React, \{ useState \} from 'react'/);
  assert.match(homeSource, /const \[filterText, setFilterText\] = useState\(''\)/);
  assert.match(homeSource, /const \[statusFilter, setStatusFilter\] = useState\('all'\)/);
  assert.match(homeSource, /const \[categoryFilter, setCategoryFilter\] = useState\('all'\)/);
  assert.match(homeSource, /placeholder="Tìm chi tiêu\.\.\."/);
  assert.match(homeSource, /const visibleTransactions = d\.transactions\.filter/);
  assert.match(homeSource, /titleMatches && statusMatches && categoryMatches/);
  assert.match(homeSource, /Chờ duyệt/);
  assert.match(homeSource, /Đã duyệt/);
  assert.match(homeSource, /Từ chối/);
  assert.match(homeSource, /<select[\s\S]*value=\{categoryFilter\}[\s\S]*onChange=\{e => setCategoryFilter\(e\.target\.value\)\}/);
  assert.doesNotMatch(homeSource, /<MiniStat/);
  assert.doesNotMatch(homeSource, /function MiniStat/);
});

test('Home hides monthly member balances and gates attendance card to treasurers', () => {
  assert.match(homeSource, /<Screen style=\{\{ paddingBottom: '72px' \}\}>/);
  assert.match(homeSource, /export default function Home\(\{ data, isTreasurer, onAction \}\)/);
  assert.doesNotMatch(homeSource, /<PaymentBalanceSection balances=\{d\.memberBalances \|\| \[\]\} onAction=\{onAction\} \/>/);
  assert.match(homeSource, /\{isTreasurer && d\.todaySession && \(/);
  assert.match(screenDataSource, /memberBalances: buildHomeMemberBalances\(pickleballState, pickle, today\)/);
  assert.match(screenDataSource, /function buildHomeMemberBalances\(state, pickle, monthDate\)/);
  assert.match(screenDataSource, /buildMemberMonthBalance\(state, pickle, monthSessions, member\.id\)/);
});

test('shared screens and AddExpense sheet define scrollable containers with bottom padding', () => {
  assert.match(primitivesSource, /minHeight: 0/);
  assert.match(primitivesSource, /overflowY: 'auto'/);
  assert.match(primitivesSource, /padding: '0 16px 72px'/);
  assert.match(addExpenseSource, /height: 812/);
  assert.match(addExpenseSource, /overflowY: 'auto'/);
  assert.match(addExpenseSource, /paddingBottom: '72px'/);
});

test('Home data exposes member identity and current-month normalized expense rows', () => {
  assert.match(screenDataSource, /currentUserId,\s*\n\s*currentUserName: state\?\.currentUserName \|\| 'Bạn'/);
  assert.match(screenDataSource, /expenses: buildHomeExpenses\(expenseGroups, currentUserId, members, state\?\.currentUserName, today\)/);
  assert.match(screenDataSource, /function buildHomeExpenses\(groups, currentUserId, members, currentUserName, monthDate\)/);
  assert.match(screenDataSource, /const meForGroup = memberIdForGroup\(group, currentUserId, members, currentUserName\)/);
  assert.match(screenDataSource, /paidBy: expense\.paidBy \|\| expense\.paid_by_member_id/);
  assert.match(screenDataSource, /participants: safeArray\(expense\.participants\)/);
  assert.match(screenDataSource, /splits: safeArray\(expense\.splits\)\.map\(normalizeHomeSplit\)\.filter\(split => split\.memberId\)/);
  assert.match(screenDataSource, /currentMemberId: meForGroup/);
});

test('Home transactions carry relationship metadata for the Của tôi filter', () => {
  assert.match(screenDataSource, /const group = groups\.find\(g => g\.id === expense\.groupId\)/);
  assert.match(screenDataSource, /const normalizedExpense = \{ \.\.\.expense, paidBy, participants, splits \}/);
  assert.match(screenDataSource, /isMine: isExpenseRelatedToMember\(normalizedExpense, meForGroup\)/);
  assert.match(screenDataSource, /function isExpenseRelatedToMember\(expense, memberId\)/);
  assert.match(screenDataSource, /safeArray\(expense\?\.participants\)\.some\(member => String\(member\) === id\)/);
  assert.match(screenDataSource, /safeArray\(expense\?\.splits\)\.some\(split => String\(split\.memberId \|\| split\.member_id\) === id\)/);
});

test('Home does not render personal balance inside the main hero card', () => {
  assert.doesNotMatch(homeSource, /const memberName = d\.currentUserName \|\| d\.user\.name \|\| d\.user\.firstName/);
  assert.doesNotMatch(homeSource, /const personalBalance = d\.currentUserId\s*\?\s*calculatePersonalBalance\(d\.expenses, d\.currentUserId\)\s*:\s*null/);
  assert.doesNotMatch(homeSource, /\{personalBalance && \(/);
  assert.doesNotMatch(homeSource, /\{memberName \|\| 'Bạn'\}/);
  assert.doesNotMatch(homeSource, /\{formatPersonalBalanceNet\(personalBalance\.net\)\}/);
  assert.doesNotMatch(homeSource, /personalBalance\.owes > 0 \|\| personalBalance\.owed > 0/);
  assert.doesNotMatch(homeSource, /Nợ: \{formatDong\(personalBalance\.owes\)\} · Được nợ: \{formatDong\(personalBalance\.owed\)\}/);
  assert.doesNotMatch(homeSource, /<PersonalBalance/);
  assert.doesNotMatch(homeSource, /function PersonalBalance/);
  assert.doesNotMatch(homeSource, /background: '#1e293b'/);
});

test('Home removes unused personal balance helpers', () => {
  assert.doesNotMatch(homeSource, /function calculatePersonalBalance\(expenses, currentUserId\)/);
  assert.doesNotMatch(homeSource, /function shareForMember\(expense, memberId\)/);
  assert.doesNotMatch(homeSource, /function isBalanceStatus\(status\)/);
  assert.doesNotMatch(homeSource, /function formatDong\(value\)/);
  assert.doesNotMatch(homeSource, /function formatPersonalBalanceNet\(value\)/);
});

test('Home has a controlled Của tôi filter that composes with existing filters', () => {
  assert.match(homeSource, /const \[mineOnly, setMineOnly\] = useState\(false\)/);
  assert.match(homeSource, /const mineMatches = !mineOnly \|\| transactionBelongsToCurrentUser\(tx, d\.currentUserId\)/);
  assert.match(homeSource, /return titleMatches && statusMatches && categoryMatches && mineMatches/);
  assert.match(homeSource, /onClick=\{\(\) => setMineOnly\(value => !value\)\}/);
  assert.match(homeSource, />Của tôi<\/button>/);
});

test('Home Của tôi helper falls back from isMine to paidBy, participants, and splits', () => {
  assert.match(homeSource, /function transactionBelongsToCurrentUser\(tx, currentUserId\)/);
  assert.match(homeSource, /if \(tx\?\.isMine === true\) return true/);
  assert.match(homeSource, /const memberId = tx\.currentMemberId \|\| currentUserId/);
  assert.match(homeSource, /if \(String\(tx\?\.paidBy \|\| ''\) === String\(memberId\)\) return true/);
  assert.match(homeSource, /safeArray\(tx\?\.participants\)\.some\(id => String\(id\) === String\(memberId\)\)/);
  assert.match(homeSource, /safeArray\(tx\?\.splits\)\.some\(split => String\(split\.memberId \|\| split\.member_id\) === String\(memberId\)\)/);
});

test('Home expense rows open expense detail instead of edit form', () => {
  assert.match(homeSource, /onAction\?\.\('viewExpense', \{ expenseId: tx\.id \}\)/);
  assert.match(homeSource, /onClick=\{onView\}/);
  assert.match(homeSource, />›<\/div>/);
  assert.doesNotMatch(homeSource, /onAction\?\.\('editExpense'/);
  assert.doesNotMatch(homeSource, />Sửa<\/button>/);
});

test('App routes AddExpense with current member data and existing expense data', () => {
  assert.match(screenDataSource, /getAddExpenseData: \(params\) => buildAddExpenseData\(state, params\)/);
  assert.match(screenDataSource, /const requestedGroupId = normalizeId\(params, 'groupId'\)/);
  assert.match(screenDataSource, /const requestedGroup = requestedGroupId \? safeArray\(state\?\.groups\)\.find/);
  assert.match(screenDataSource, /memberCount: members\.length/);
  assert.match(screenDataSource, /currentMemberId: state\?\.currentUserId/);
  assert.match(screenDataSource, /currentMemberName: currentMember\?\.displayName \|\| currentMember\?\.name \|\| state\?\.currentUserName/);
  assert.match(screenDataSource, /editExpense: expense \? \{/);
  assert.match(appSource, /type === 'editExpense'/);
  assert.match(appSource, /screen: 'add-expense', params: \{ expenseId: payload\.expenseId \}/);
  assert.match(appSource, /<AddExpense data=\{getAddExpenseData\(route\.params\)\} onAction=\{handle\} \/>/);
  assert.match(appSource, /type: 'EDIT_EXPENSE'/);
});

test('App routes Home viewExpense actions to ExpenseDetail', () => {
  assert.match(appSource, /type === 'viewExpense'/);
  assert.match(appSource, /screen: 'expense-detail', params: \{ expenseId: payload\.expenseId \}/);
});

test('ExpenseDetail data includes permission flags from current user role and submitted expense state', () => {
  assert.match(screenDataSource, /getExpenseDetailData: \(params\) => buildExpenseDetailData\(state, params\)/);
  assert.match(screenDataSource, /const currentUserId = state\?\.currentUserId/);
  assert.match(screenDataSource, /const role = safeArray\(state\?\.members\)\.find\(member => String\(member\.id\) === String\(currentUserId\)\)\?\.role/);
  assert.match(screenDataSource, /const canEdit = role === 'treasurer' \|\| \(String\(expense\.submitted_by_member_id \|\| ''\) === String\(currentUserId\) && String\(expense\.status \|\| ''\)\.toLowerCase\(\) === 'pending'\)/);
  assert.match(screenDataSource, /canDelete: role === 'treasurer'/);
});

test('ExpenseDetail hides edit and delete actions unless permission flags are true', () => {
  assert.match(expenseDetailSource, /\{d\.canEdit === true && \(/);
  assert.match(expenseDetailSource, /\{d\.canDelete === true && \(/);
});
