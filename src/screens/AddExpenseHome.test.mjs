import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const addExpenseSource = readFileSync(new URL('./AddExpense.jsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');
const expenseDetailSource = readFileSync(new URL('./ExpenseDetail.jsx', import.meta.url), 'utf8');
const screenDataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');

test('AddExpense defaults to the logged-in member and submits edit expense ids', () => {
  assert.match(addExpenseSource, /const editExpense = d\.editExpense/);
  assert.match(addExpenseSource, /useState\(\(\) => editExpense\?\.paidBy \?\? d\.currentMemberId \?\? ''\)/);
  assert.match(addExpenseSource, /<h1[\s\S]*\{editExpense \? 'Sửa chi tiêu' : 'Thêm chi tiêu'\}/);
  assert.match(addExpenseSource, /expenseId: editExpense\?\.id/);
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

test('Home data exposes member identity and current-month normalized expense rows', () => {
  assert.match(screenDataSource, /currentUserId,\s*\n\s*currentUserName: state\?\.currentUserName \|\| 'Bạn'/);
  assert.match(screenDataSource, /expenses: buildHomeExpenses\(safeGroups, currentUserId, members, state\?\.currentUserName, today\)/);
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
