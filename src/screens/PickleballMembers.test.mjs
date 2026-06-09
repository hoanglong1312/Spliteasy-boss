import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const memberSource = readFileSync(new URL('./PickleballMembers.jsx', import.meta.url), 'utf8');
const memberDetailSource = readFileSync(new URL('./MemberDetail.jsx', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../store.jsx', import.meta.url), 'utf8');

test('Pickleball member add flow validates typed names against active and inactive group members', () => {
  assert.match(dataSource, /allMembers: allMemberRows/);
  assert.match(memberSource, /const allMembers = d\.allMembers \|\| \[\]/);
  assert.match(memberSource, /function findDuplicateMember\(name, members\)/);
  assert.match(memberSource, /String\(member\?\.name \|\| member\?\.displayName \|\| ''\)\.trim\(\)\.toLowerCase\(\)/);
  assert.match(memberSource, /Tên này đã tồn tại trong nhóm\. Vui lòng dùng tên khác\./);
  assert.match(memberSource, /const duplicateMember = findDuplicateMember\(typedMemberName, allMembers\)/);
  assert.match(memberSource, /if \(duplicateMember && isActiveMember\(duplicateMember\)\)/);
  assert.match(memberSource, /await onAction\?\.\('addPickleballMember'/);
  assert.doesNotMatch(memberSource, /onAction\?\.\('addMember'/);
});

test('Pickleball member add flow suggests and triggers inactive member reactivation', () => {
  assert.match(memberSource, /const duplicateMemberInactive = duplicateMember && !isActiveMember\(duplicateMember\)/);
  assert.match(memberSource, /Thành viên '\{duplicateMember\.name\}' đang ở trạng thái chờ — bạn có muốn thêm lại không\?/);
  assert.match(memberSource, /savingAction === 'reactivateMember' \? 'Đang lưu…' : 'Thêm lại'/);
  assert.match(memberSource, /await onAction\?\.\('reactivateMember', \{ memberId: duplicateMember\.id, groupId: d\.groupId \}\)/);
  assert.match(appSource, /if \(type === 'reactivateMember'\)/);
  assert.match(appSource, /const isPickleballGroup = isPickleballActionGroup\(currentGroup\)/);
  assert.doesNotMatch(appSource, /groupText\.includes\('pickle'\)/);
  assert.match(appSource, /\.update\(\{ member_type: 'fixed', is_active: true \}\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)/);
});

test('Pickleball async save buttons show pending text and disable while awaiting save', () => {
  assert.match(memberSource, /const \[savingAction, setSavingAction\] = useState\(''\)/);
  assert.match(memberSource, /setSavingAction\('addMember'\)[\s\S]*?finally \{[\s\S]*?setSavingAction\(''\)/);
  assert.match(memberSource, /setSavingAction\('reactivateMember'\)[\s\S]*?finally \{[\s\S]*?setSavingAction\(''\)/);
  assert.match(memberSource, /setSavingAction\('editMember'\)[\s\S]*?finally \{[\s\S]*?setSavingAction\(''\)/);
  assert.match(memberSource, /setSavingAction\('deleteMember'\)[\s\S]*?finally \{[\s\S]*?setSavingAction\(''\)/);
  assert.match(memberSource, /disabled=\{savingAction === 'addMember'\}/);
  assert.match(memberSource, /savingAction === 'addMember' \? 'Đang lưu…'/);
  assert.match(memberSource, /disabled=\{savingAction === 'editMember'\}/);
  assert.match(memberSource, /savingAction === 'editMember' \? 'Đang lưu…' : 'Lưu thay đổi'/);
  assert.match(memberSource, /disabled=\{savingAction === 'deleteMember'\}/);
  assert.match(memberSource, /savingAction === 'deleteMember' \? 'Đang xóa…' : 'Xác nhận'/);
  assert.match(memberSource, /\{savingAction && \(/);
  assert.match(memberSource, /role="status"/);
  assert.match(memberSource, /Đang xử lý…/);
  assert.match(memberSource, /LoadingSpinner/);
});

test('Pickleball members screen reserves tab bar space so bottom member remains reachable', () => {
  assert.match(memberSource, /<Screen\s+tabBar\s+style=\{\{ background: colors\.pageBg \}\}>/);
});

test('Pickleball member row does not nest quick action button inside another button', () => {
  assert.match(memberSource, /<div role="button" tabIndex=\{0\} onClick=\{\(\) => onAction\?\.\('memberDetail', \{ memberId: member\.id \}\)\}/);
  assert.doesNotMatch(memberSource, /return \(\s*<button type="button" onClick=\{\(\) => onAction\?\.\('memberDetail'/);
});

test('Pickleball member type changes pass the selected month to avoid cross-month contamination', () => {
  assert.match(memberSource, /onAction\?\.\('setMemberType', \{ memberId: member\.id, type, groupId: d\.groupId, yearMonth: d\.currentYearMonth \}\)/);
  assert.match(dataSource, /currentYearMonth: monthKey\(today\)/);
});

test('Pickleball member actions expand inline instead of using a quick action sheet', () => {
  assert.match(memberSource, /const \[expandedMemberId, setExpandedMemberId\] = useState\(null\)/);
  assert.match(memberSource, /isExpanded=\{expandedMemberId === member\.id\}/);
  assert.match(memberSource, /onToggleExpand=\{onToggleExpand\}/);
  assert.match(memberSource, /setExpandedMemberId\(prev => prev === id \? null : id\)/);
  assert.match(memberSource, />Sửa<\/button>/);
  assert.match(memberSource, />Xóa<\/button>/);
  assert.doesNotMatch(memberSource, /QuickActionSheet/);
  assert.doesNotMatch(memberSource, /quickActionMember/);
});

test('Pickleball member edit includes profile and group identity so profile-level name updates refresh rows', () => {
  assert.match(memberSource, /await onAction\?\.\('editMember', \{[\s\S]*?memberId: editingMember\.id,[\s\S]*?profileId: editingMember\?\.profileId \|\| editingMember\?\.profile_id \|\| '',[\s\S]*?groupId: d\.groupId,[\s\S]*?name,/);
});

test('Pickleball member add candidates use pickleball membership semantics', () => {
  assert.match(dataSource, /memberCandidates: buildGroupMemberCandidates\(currentGroup\(state\), state\?\.members, state\?\.profiles, \{ mode: 'pickleball' \}\)/);
});

test('Pickleball plain member add uses search text instead of a separate new-name field', () => {
  assert.match(memberSource, /const typedMemberName = candidateQuery\.trim\(\)/);
  assert.match(memberSource, /const duplicateMember = findDuplicateMember\(typedMemberName, allMembers\)/);
  assert.match(memberSource, /await onAction\?\.\('addPickleballMember', \{ groupId: d\.groupId, name: typedMemberName, profileId: '', type: newMemberType \}\)/);
  assert.doesNotMatch(memberSource, /const \[newMemberName, setNewMemberName\]/);
  assert.doesNotMatch(memberSource, /label=\{memberCandidates\.length > 0 \? 'Hoặc nhập tên mới' : 'Tên'\}/);
});

test('Pickleball exact typed candidate save uses that existing candidate', () => {
  assert.match(memberSource, /const exactCandidateMatch = typedMemberName && memberCandidates\.find\(candidate => normalizeSearch\(candidate\?\.name\) === normalizeSearch\(typedMemberName\)\)/);
  assert.match(memberSource, /const candidatesToAdd = selectedCandidates\.length > 0 \? selectedCandidates : exactCandidateMatch \? \[exactCandidateMatch\] : \[\]/);
  assert.match(memberSource, /if \(savingAction \|\| \(candidatesToAdd\.length === 0 && !typedMemberName\)\) return/);
  assert.match(memberSource, /for \(const candidate of candidatesToAdd\)/);
  assert.match(memberSource, /if \(candidatesToAdd\.length === 0 && typedMemberName\)/);
});

test('Store ADD_MEMBER creates a profile for plain pickleball members before inserting membership', () => {
  const addMemberBlock = storeSource.slice(
    storeSource.indexOf("case 'ADD_MEMBER':"),
    storeSource.indexOf("case 'SAVE_PICKLEBALL_MONTHLY_CONFIG':")
  );

  assert.match(addMemberBlock, /let profileId = member\?\.profileId \|\| member\?\.profile_id/);
  assert.match(addMemberBlock, /if \(!profileId\) \{/);
  assert.match(addMemberBlock, /const \{ short, initials \} = memberNameParts\(member\?\.name\)/);
  assert.match(addMemberBlock, /\.from\('profiles'\)\s*\.insert\(\{[\s\S]*?name: String\(member\?\.name \|\| ''\)\.trim\(\),[\s\S]*?short,[\s\S]*?initials,[\s\S]*?color: '#574EFA',[\s\S]*?bank_name: member\?\.bankName \?\? member\?\.bank_name \?\? null,[\s\S]*?bank_account: member\?\.bankAccount \?\? member\?\.bank_account \?\? null,[\s\S]*?bank_account_name: member\?\.bankAccountName \?\? member\?\.bank_account_name \?\? null,[\s\S]*?\}\)\s*\.select\('id'\)\s*\.single\(\)/);
  assert.match(addMemberBlock, /if \(profileError\) throw profileError/);
  assert.match(addMemberBlock, /profileId = profileRow\?\.id/);
  assert.match(addMemberBlock, /memberInsertRow\(groupId, \{ \.\.\.member, profileId \}, member\.role \|\| 'member'\)/);
});

test('Member detail edit includes profile and group identity so bottom sheet save targets the same member row', () => {
  assert.match(memberDetailSource, /await onAction\?\.\('editMember', \{[\s\S]*?memberId: d\.id,[\s\S]*?profileId: d\?\.profileId \|\| d\?\.profile_id \|\| '',[\s\S]*?groupId: d\?\.groupId \|\| d\?\.group_id \|\| '',[\s\S]*?name,/);
});

test('AppV2 editMember falls back to membership row updates so pickleball refresh does not show stale names', () => {
  const editMemberBlock = appSource.slice(
    appSource.indexOf("if (type === 'editMember')"),
    appSource.indexOf("if (type === 'linkProfile')")
  );

  assert.match(editMemberBlock, /const memberUpdate = \{[\s\S]*?name: profileUpdate\.name,[\s\S]*?bank_account: profileUpdate\.bank_account,[\s\S]*?bank_name: profileUpdate\.bank_name,[\s\S]*?bank_account_name: profileUpdate\.bank_account_name/);
  assert.match(editMemberBlock, /if \(!safeArray\(updatedRows\)\.length\) \{[\s\S]*?\.from\('members'\)\.update\(memberUpdate\)\.eq\('id', memberId\)[\s\S]*?if \(targetGroupId\) request = request\.eq\('group_id', targetGroupId\)[\s\S]*?\.select\('id'\)/);
});
