import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settingsSource = readFileSync(new URL('./PickleballSettings.jsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../store.jsx', import.meta.url), 'utf8');

test('PickleballSettings shell allocates remaining height to a scrollable content area', () => {
  assert.match(settingsSource, /display:\s*'flex'/);
  assert.match(settingsSource, /flexDirection:\s*'column'/);
  assert.match(settingsSource, /height:\s*'100%'/);
  assert.match(settingsSource, /maxHeight:\s*812/);
  assert.match(settingsSource, /overflowY:\s*'auto'/);
  assert.match(settingsSource, /flex:\s*1/);
});

test('PickleballSettings no longer renders current-month member participation toggles', () => {
  assert.match(storeSource, /pickleball_monthly_config/);
  assert.match(dataSource, /currentYearMonth/);
  assert.doesNotMatch(settingsSource, /Thành viên tháng này/);
  assert.doesNotMatch(settingsSource, /activeMemberIds/);
  assert.doesNotMatch(settingsSource, /activeMonthlyMemberIds:\s*Array\.from\(activeMemberIds\)/);
  assert.doesNotMatch(appSource, /activeMonthlyMemberIds: payload\?\.activeMonthlyMemberIds \|\| \[\]/);
  assert.match(appSource, /SAVE_PICKLEBALL_MONTHLY_CONFIG/);
});

test('PickleballSettings no longer owns add/delete member management', () => {
  assert.match(dataSource, /currentRole/);
  assert.match(settingsSource, /d\.currentRole === 'treasurer'/);
  assert.doesNotMatch(settingsSource, /showAddMemberForm/);
  assert.doesNotMatch(settingsSource, /newMemberName/);
  assert.doesNotMatch(settingsSource, /onAction\?\.\('addMember'/);
  assert.doesNotMatch(settingsSource, /onAction\?\.\('deleteMember'/);
  assert.doesNotMatch(settingsSource, /Xác nhận xóa thành viên/);
  assert.match(appSource, /type === 'addMember'/);
  assert.match(appSource, /type === 'deleteMember'/);
  assert.match(appSource, /\.from\('members'\)/);
  assert.match(appSource, /is_active: false/);
});
