import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const memberSource = readFileSync(new URL('./PickleballMembers.jsx', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');

test('Pickleball member add flow validates typed names against active and inactive group members', () => {
  assert.match(dataSource, /allMembers: allMemberRows/);
  assert.match(memberSource, /const allMembers = d\.allMembers \|\| \[\]/);
  assert.match(memberSource, /function findDuplicateMember\(name, members\)/);
  assert.match(memberSource, /String\(member\?\.name \|\| member\?\.displayName \|\| ''\)\.trim\(\)\.toLowerCase\(\)/);
  assert.match(memberSource, /Tên này đã tồn tại trong nhóm\. Vui lòng dùng tên khác\./);
  assert.match(memberSource, /const duplicateMember = findDuplicateMember\(newMemberName, allMembers\)/);
  assert.match(memberSource, /if \(duplicateMember && isActiveMember\(duplicateMember\)\)/);
  assert.match(memberSource, /await onAction\?\.\('addPickleballMember'/);
  assert.doesNotMatch(memberSource, /onAction\?\.\('addMember'/);
});

test('Pickleball member add flow suggests and triggers inactive member reactivation', () => {
  assert.match(memberSource, /const duplicateMemberInactive = duplicateMember && !isActiveMember\(duplicateMember\)/);
  assert.match(memberSource, /Thành viên '\{duplicateMember\.name\}' đang ở trạng thái chờ — bạn có muốn thêm lại không\?/);
  assert.match(memberSource, />Thêm lại<\/Button>/);
  assert.match(memberSource, /await onAction\?\.\('reactivateMember', \{ memberId: duplicateMember\.id, groupId: d\.groupId \}\)/);
  assert.match(appSource, /if \(type === 'reactivateMember'\)/);
  assert.match(appSource, /const isPickleballGroup = isPickleballActionGroup\(currentGroup\)/);
  assert.doesNotMatch(appSource, /groupText\.includes\('pickle'\)/);
  assert.match(appSource, /\.update\(\{ member_type: 'fixed', is_active: true \}\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)/);
});

test('Pickleball members screen reserves tab bar space so bottom member remains reachable', () => {
  assert.match(memberSource, /<Screen\s+tabBar\s+style=\{\{ background: colors\.pageBg \}\}>/);
});

test('Pickleball member row does not nest quick action button inside another button', () => {
  assert.match(memberSource, /<div role="button" tabIndex=\{0\} onClick=\{\(\) => onAction\?\.\('memberDetail', \{ memberId: member\.id \}\)\}/);
  assert.doesNotMatch(memberSource, /return \(\s*<button type="button" onClick=\{\(\) => onAction\?\.\('memberDetail'/);
});
