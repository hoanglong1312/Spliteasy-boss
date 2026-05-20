import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const addExpenseSource = readFileSync(new URL('./AddExpense.jsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');
const screenDataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');

test('AddExpense defaults to the logged-in member and submits edit expense ids', () => {
  assert.match(addExpenseSource, /const editExpense = d\.editExpense/);
  assert.match(addExpenseSource, /useState\(\(\) => editExpense\?\.paidBy \?\? d\.currentMemberId \?\? ''\)/);
  assert.match(addExpenseSource, /<h1[\s\S]*\{editExpense \? 'Sửa chi tiêu' : 'Thêm chi tiêu'\}/);
  assert.match(addExpenseSource, /expenseId: editExpense\?\.id/);
});

test('Home activity list supports controlled title filtering and expense editing', () => {
  assert.match(homeSource, /import React, \{ useState \} from 'react'/);
  assert.match(homeSource, /const \[filterText, setFilterText\] = useState\(''\)/);
  assert.match(homeSource, /placeholder="Tìm chi tiêu\.\.\."/);
  assert.match(homeSource, /const visibleTransactions = d\.transactions\.filter/);
  assert.match(homeSource, /onAction\?\.\('editExpense', \{ expenseId: tx\.id \}\)/);
  assert.doesNotMatch(homeSource, /<MiniStat/);
  assert.doesNotMatch(homeSource, /function MiniStat/);
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
