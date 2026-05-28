import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const profileSource = readFileSync(new URL('./screens/Profile.jsx', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/Settings.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const primitiveSource = readFileSync(new URL('./primitives.jsx', import.meta.url), 'utf8')
const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')
const pickleballMembersSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
const memberDetailSource = readFileSync(new URL('./screens/MemberDetail.jsx', import.meta.url), 'utf8')
const memberPinMigration = readFileSync(new URL('../supabase/migrations/20260528000001_member_pin_rpcs.sql', import.meta.url), 'utf8')

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

test('Profile persists app PIN through Supabase instead of localStorage', () => {
  assert.match(profileSource, /const \[pinSet, setPinSet\] = useState\(\(\) => Boolean\(d\.pin\)\)/)
  assert.match(profileSource, /useEffect\(\(\) => \{\s*setPinSet\(Boolean\(d\.pin\)\)/)
  assert.match(profileSource, /await onAction\?\.\('setPin', \{ pin: pinInputValue \}\)/)
  assert.match(profileSource, /await onAction\?\.\('verifyPin', \{ pin: pinInputValue \}\)/)
  assert.match(profileSource, /await onAction\?\.\('removePin'\)/)
  assert.match(profileSource, /const pinRequiresInput = pinSetupMode !== 'remove'/)
  assert.doesNotMatch(profileSource, /localStorage\.getItem\(pinKey\)/)
  assert.doesNotMatch(profileSource, /localStorage\.setItem\(pinKey, pinInputValue\)/)
  assert.doesNotMatch(profileSource, /localStorage\.removeItem\(pinKey\)/)
  assert.doesNotMatch(settingsSource, /localStorage\.getItem\('spliteasy_pin'\)/)
  assert.doesNotMatch(settingsSource, /localStorage\.setItem\('spliteasy_pin'/)
  assert.doesNotMatch(settingsSource, /localStorage\.removeItem\('spliteasy_pin'\)/)
  assert.match(screenDataSource, /pin: Boolean\(me\?\.hasPin \|\| me\?\.has_pin\)/)
  assert.match(appSource, /if \(type === 'setPin'\)/)
  assert.match(appSource, /if \(type === 'verifyPin'\)/)
  assert.match(appSource, /if \(type === 'removePin'\)/)
  assert.match(storeSource, /storeAuth\(t, \{[\s\S]*hasPin: currentMember\?\.hasPin === true \|\| currentMember\?\.has_pin === true/)
  assert.match(memberPinMigration, /CREATE OR REPLACE FUNCTION public\.set_member_pin\(p_pin text\)/)
  assert.match(memberPinMigration, /CREATE OR REPLACE FUNCTION public\.verify_member_pin\(p_member_id uuid, p_pin text\)/)
  assert.match(memberPinMigration, /CREATE OR REPLACE FUNCTION public\.reset_member_pin\(p_member_id uuid DEFAULT NULL, p_pin text DEFAULT NULL\)/)
  assert.match(memberPinMigration, /IF p_pin IS NOT NULL AND NOT public\.verify_member_pin\(v_target_member_id, p_pin\) THEN/)
  assert.match(memberPinMigration, /UPDATE public\.members[\s\S]*pin_hash = encode\(digest\(p_pin \|\| ':' \|\| v_member_id::text, 'sha256'\), 'hex'\)/)
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
