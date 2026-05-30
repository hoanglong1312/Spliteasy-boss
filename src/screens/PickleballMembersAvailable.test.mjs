import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const memberSource = readFileSync(new URL('./PickleballMembers.jsx', import.meta.url), 'utf8');
const groupDetailSource = readFileSync(new URL('./GroupDetail.jsx', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');

test('available member picker includes inactive members from the current group', () => {
  assert.match(dataSource, /mode === 'pickleball' \? !isActiveMember\(member\) : !isExpenseActiveMember\(member\)/);
  assert.match(dataSource, /return dedupedInactiveCurrentMembers\.concat\(outsideGroupCandidates\)/);
  assert.match(dataSource, /isInactive: mode === 'pickleball' \? !isActiveMember\(member\) : !isExpenseActiveMember\(member\)/);
  assert.match(dataSource, /memberType: memberType\(member\)/);
});

test('selecting an inactive available member reactivates instead of creating a duplicate member', () => {
  assert.match(memberSource, /if \(candidate\.isInactive\)/);
  assert.match(memberSource, /await onAction\?\.\('reactivateMember', \{ memberId: candidate\.memberId \|\| candidate\.id, groupId: d\.groupId \}\)/);
  assert.match(groupDetailSource, /if \(candidate\.isInactive\)/);
  assert.match(groupDetailSource, /await onAction\?\.\('reactivateMember', \{[\s\S]*?memberId: candidate\.memberId \|\| candidate\.id,[\s\S]*?groupId,/);
  assert.match(appSource, /if \(type === 'reactivateMember'\)/);
  assert.match(appSource, /const isPickleballGroup = isPickleballActionGroup\(currentGroup\)/);
  assert.doesNotMatch(appSource, /groupText\.includes\('pickle'\)/);
  assert.match(appSource, /\.update\(\{ member_type: 'fixed', is_active: true \}\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)/);
  assert.match(appSource, /\.rpc\('add_expense_group_member', \{[\s\S]*?p_member_id: memberId,/);
});
