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
