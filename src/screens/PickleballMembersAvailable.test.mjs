import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const memberSource = readFileSync(new URL('./PickleballMembers.jsx', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');

test('available member picker includes inactive members from the current group', () => {
  assert.match(dataSource, /const inactiveCurrentMembers = currentMembers\.filter\(member => !isActiveMember\(member\)\)/);
  assert.match(dataSource, /return inactiveCurrentMembers\.concat\(outsideGroupCandidates\)/);
  assert.match(dataSource, /isInactive: !isActiveMember\(member\)/);
});

test('selecting an inactive available member reactivates instead of creating a duplicate member', () => {
  assert.match(memberSource, /if \(candidate\.isInactive\)/);
  assert.match(memberSource, /await onAction\?\.\('reactivateMember', \{ memberId: candidate\.memberId \|\| candidate\.id \}\)/);
  assert.match(appSource, /if \(type === 'reactivateMember'\)/);
  assert.match(appSource, /\.from\('members'\)[\s\S]*?\.update\(\{ is_active: true \}\)[\s\S]*?\.eq\('id', memberId\)/);
});
