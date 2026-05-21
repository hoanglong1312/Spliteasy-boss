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

test('Profile photo is keyed by current member and persisted locally', () => {
  assert.match(screenDataSource, /photoUrl: loadStoredProfilePhoto\(currentUserId\)/)
  assert.match(screenDataSource, /id: currentUserId/)
  assert.match(screenDataSource, /function profilePhotoStorageKey\(memberId\)/)
  assert.match(appSource, /if \(type === 'uploadPhoto'\)/)
  assert.match(appSource, /localStorage\.setItem\(profilePhotoStorageKey\(memberId\), photoUrl\)/)
})
