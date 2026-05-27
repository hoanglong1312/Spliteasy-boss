import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const profileSource = readFileSync(new URL('./screens/Profile.jsx', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/Settings.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const primitiveSource = readFileSync(new URL('./primitives.jsx', import.meta.url), 'utf8')
const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')
const pickleballMembersSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
const memberDetailSource = readFileSync(new URL('./screens/MemberDetail.jsx', import.meta.url), 'utf8')

test('Profile no longer exposes manual display color controls', () => {
  assert.doesNotMatch(profileSource, /Màu hiển thị/)
  assert.doesNotMatch(profileSource, /PROFILE_COLORS\.map/)
  assert.doesNotMatch(profileSource, /onAction\?\.\('color'/)
  assert.match(profileSource, /background: currentPhotoUrl \? colors\.shellBg : d\.user\.color/)
  assert.match(screenDataSource, /color: me\?\.color \|\| '#6366f1'/)
})

test('Profile removes redundant monthly stat cards from the personal settings surface', () => {
  assert.doesNotMatch(profileSource, /Buổi đánh/)
  assert.doesNotMatch(profileSource, /Số dư/)
  assert.doesNotMatch(profileSource, /monthStats\.sessions/)
  assert.doesNotMatch(profileSource, /monthStats\.balance/)
  assert.doesNotMatch(profileSource, /formatVNDShort/)
})

test('Settings stores app PIN per member instead of globally per browser', () => {
  assert.match(settingsSource, /function memberPinStorageKey\(memberId\)/)
  assert.match(settingsSource, /const pinKey = memberPinStorageKey\(d\.memberId\)/)
  assert.match(settingsSource, /localStorage\.getItem\(pinKey\)/)
  assert.match(settingsSource, /localStorage\.setItem\(pinKey, pinInputValue\)/)
  assert.match(settingsSource, /localStorage\.removeItem\(pinKey\)/)
  assert.doesNotMatch(settingsSource, /localStorage\.getItem\('spliteasy_pin'\)/)
  assert.doesNotMatch(settingsSource, /localStorage\.setItem\('spliteasy_pin'/)
  assert.doesNotMatch(settingsSource, /localStorage\.removeItem\('spliteasy_pin'\)/)
  assert.match(screenDataSource, /memberId: state\?\.currentUserId/)
})

test('Profile owns account settings without opening the settings screen', () => {
  assert.doesNotMatch(profileSource, /<IconButton onClick=\{\(\) => onAction\?\.\('settings'\)\}>/)
  assert.doesNotMatch(profileSource, /SectionLabel action="Sửa →" onAction=\{\(\) => onAction\?\.\('settings'\)\}/)
  assert.doesNotMatch(profileSource, /onClick=\{\(\) => onAction\?\.\('settings'\)\}/)
  assert.match(profileSource, /const \[editingBank, setEditingBank\]/)
  assert.match(profileSource, /BANK_SUGGESTIONS/)
  assert.match(profileSource, /list="profile-bank-suggestions"/)
  assert.match(profileSource, /onAction\?\.\('saveBank', \{ bankName: bankName\.trim\(\), bankAccount: bankAccount\.trim\(\), bankAccountName: bankOwner\.trim\(\) \}\)/)
  assert.match(appSource, /if \(stack\[stack\.length - 1\]\?\.screen === 'settings'\)/)
  assert.match(profileSource, /function submitPinSetup\(\)/)
  assert.match(profileSource, /function SettingRow/)
  assert.match(profileSource, /onAction\?\.\('logout'\)/)
})

test('Bank placeholders stay empty and add-bank entry is removed', () => {
  assert.doesNotMatch(profileSource, /Thêm ngân hàng khác/)
  assert.doesNotMatch(profileSource, /Chưa cập nhật/)
  assert.doesNotMatch(settingsSource, /Thêm ngân hàng khác/)
  assert.doesNotMatch(settingsSource, /onAction\?\.\('addBank'\)/)
  assert.match(screenDataSource, /const bankName = member\?\.bankName \|\| member\?\.bank_name \|\| ''/)
  assert.match(screenDataSource, /if \(!digits\) return ''/)
})

test('Avatar primitive and member screens render uploaded member photos', () => {
  assert.match(primitiveSource, /export function Avatar\(\{ initial, size = 24, color, photoUrl/)
  assert.match(primitiveSource, /photoUrl \? \(/)
  assert.match(primitiveSource, /<img[\s\S]*src=\{photoUrl\}/)
  assert.match(groupDetailSource, /photoUrl=\{member\.photoUrl\}/)
  assert.match(pickleballMembersSource, /photoUrl=\{member\.photoUrl\}/)
  assert.match(memberDetailSource, /photoUrl=\{d\.photoUrl\}/)
})

test('Profile shows the delete-photo action as a hover X on the avatar', () => {
  assert.match(profileSource, /const \[avatarHover, setAvatarHover\]/)
  assert.match(profileSource, /onMouseEnter=\{\(\) => setAvatarHover\(true\)\}/)
  assert.match(profileSource, /onMouseLeave=\{\(\) => setAvatarHover\(false\)\}/)
  assert.match(profileSource, /aria-label="Xóa ảnh đại diện"/)
  assert.match(profileSource, /currentPhotoUrl && \(/)
  assert.match(profileSource, /color: '#fecaca'/)
  assert.doesNotMatch(profileSource, />Xóa ảnh<\/button>/)
})

test('GroupDetail keeps treasurer pill inline with the member name', () => {
  const memberRowSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberRow'),
    groupDetailSource.indexOf('function RolePill')
  )
  assert.match(memberRowSource, /display: 'flex', alignItems: 'center', gap: 8/)
  assert.match(memberRowSource, /<span[\s\S]*\{member\.name\}[\s\S]*<\/span>/)
  assert.doesNotMatch(memberRowSource, /marginTop: 5/)
})
