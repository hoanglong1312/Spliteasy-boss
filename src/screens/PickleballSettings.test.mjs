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

test('PickleballSettings saves current-month participation through monthly config', () => {
  assert.match(storeSource, /pickleball_monthly_config/);
  assert.match(storeSource, /active_member_ids/);
  assert.match(dataSource, /currentYearMonth/);
  assert.match(dataSource, /activeMonthlyMemberIds/);
  assert.match(settingsSource, /activeMemberIds/);
  assert.match(settingsSource, /activeMonthlyMemberIds:\s*Array\.from\(activeMemberIds\)/);
  assert.match(appSource, /SAVE_PICKLEBALL_MONTHLY_CONFIG/);
});

test('PickleballSettings add-member action uses an inline controlled form', () => {
  assert.match(settingsSource, /showAddMemberForm/);
  assert.match(settingsSource, /newMemberName/);
  assert.match(settingsSource, /value=\{newMemberName\}/);
  assert.match(settingsSource, /onChange=\{e => setNewMemberName\(e\.target\.value\)\}/);
  assert.match(settingsSource, /onAction\?\.\('addMember', \{ name: trimmedName \}\)/);
  assert.match(appSource, /dispatch\(\{\s*type: 'ADD_MEMBER'/);
  assert.doesNotMatch(appSource, /coming soon/);
});

test('PickleballSettings treasurer can deactivate members from the row', () => {
  assert.match(dataSource, /currentRole/);
  assert.match(settingsSource, /d\.currentRole === 'treasurer'/);
  assert.match(settingsSource, /onAction\?\.\('deleteMember'/);
  assert.match(settingsSource, /confirm\(`Xóa \$\{m\.name\} khỏi nhóm\?`\)/);
  assert.match(appSource, /type === 'deleteMember'/);
  assert.match(appSource, /\.from\('members'\)/);
  assert.match(appSource, /is_active: false/);
  assert.match(appSource, /left_at: new Date\(\)\.toISOString\(\)/);
});
