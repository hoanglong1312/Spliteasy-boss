import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const profileSource = readFileSync(new URL('./screens/Profile.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')

test('Profile supports uploading a personal photo instead of export CSV', () => {
  assert.match(profileSource, /type="file"/)
  assert.match(profileSource, /accept="image\/\*"/)
  assert.match(profileSource, /FileReader/)
  assert.match(profileSource, /currentPhotoUrl \? \(/)
  assert.match(profileSource, /<img/)
  assert.match(profileSource, /onAction\?\.\('uploadPhoto'/)
  assert.doesNotMatch(profileSource, /Xuất sổ CSV/)
  assert.doesNotMatch(profileSource, /onAction\?\.\('exportCsv'\)/)
})

test('Profile photo is keyed by current profile and persisted locally', () => {
  assert.match(screenDataSource, /photoUrl: memberPhotoUrl\(me, state\?\.members\)/)
  assert.match(screenDataSource, /id: currentUserId/)
  assert.match(screenDataSource, /profileId: me\?\.profileId \|\| me\?\.profile_id \|\| currentUserId/)
  assert.match(screenDataSource, /function profilePhotoStorageKey\(identityId\)/)
  assert.match(appSource, /if \(type === 'uploadPhoto'\)/)
  assert.match(profileSource, /onAction\?\.\('uploadPhoto', \{ memberId: d\.user\.id, profileId: d\.user\.profileId, photoUrl \}\)/)
  assert.match(appSource, /localStorage\.setItem\(profilePhotoStorageKey\(profileId \|\| memberId\), photoUrl\)/)
})

test('Profile can clear a personal photo back to the default avatar', () => {
  assert.match(profileSource, /onAction\?\.\('clearPhoto', \{ memberId: d\.user\.id, profileId: d\.user\.profileId \}\)/)
  assert.match(profileSource, /setCurrentPhotoUrl\(''\)/)
  assert.match(profileSource, /currentPhotoUrl && \(/)
  assert.match(appSource, /if \(type === 'clearPhoto'\)/)
  assert.match(appSource, /localStorage\.removeItem\(profilePhotoStorageKey\(profileId \|\| memberId\)\)/)
})

test('stored profile photos are reused by member lists and detail avatars', () => {
  assert.match(screenDataSource, /function memberPhotoUrl\(member, allMembers = \[\]\)/)
  assert.match(screenDataSource, /member\?\.profileId \|\| member\?\.profile_id/)
  assert.match(screenDataSource, /safeArray\(allMembers\)[\s\S]*member\?\.profileId/)
  assert.match(screenDataSource, /photoUrl: memberPhotoUrl\(member, members\)/)
  assert.match(screenDataSource, /photoUrl: memberPhotoUrl\(me, state\?\.members\)/)
  assert.match(screenDataSource, /toPickleballMemberRow\(member, sessions, totalSessions, state\?\.members\)/)
})

test('profile photo changes refresh screen data without a browser reload', () => {
  assert.match(screenDataSource, /PROFILE_PHOTO_CHANGED_EVENT/)
  assert.match(screenDataSource, /setPhotoVersion\(version => version \+ 1\)/)
  assert.match(screenDataSource, /photoVersion,\s*me, isTreasurer/)
  assert.match(appSource, /window\.dispatchEvent\(new Event\(PROFILE_PHOTO_CHANGED_EVENT\)\)/)
})
