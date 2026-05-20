import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settingsSource = readFileSync(new URL('./PickleballSettings.jsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');

test('PickleballSettings shell allocates remaining height to a scrollable content area', () => {
  assert.match(settingsSource, /display:\s*'flex'/);
  assert.match(settingsSource, /flexDirection:\s*'column'/);
  assert.match(settingsSource, /height:\s*'100%'/);
  assert.match(settingsSource, /maxHeight:\s*812/);
  assert.match(settingsSource, /overflowY:\s*'auto'/);
  assert.match(settingsSource, /flex:\s*1/);
});

test('PickleballSettings add-member action is handled by app-v2 placeholder', () => {
  assert.match(settingsSource, /onAction\?\.\('addMember'\)/);
  assert.match(appSource, /type === 'addMember'/);
  assert.match(appSource, /alert\('Chức năng thêm thành viên — coming soon'\)/);
});
