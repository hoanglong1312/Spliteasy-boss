import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const newGroupSource = readFileSync(new URL('./screens/NewGroup.jsx', import.meta.url), 'utf8')
const migrationSource = readFileSync(new URL('../supabase/migrations/20260523000001_profiles_identity.sql', import.meta.url), 'utf8')

test('profiles migration creates central identity and links members', () => {
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.profiles/)
  assert.match(migrationSource, /ALTER TABLE public\.members[\s\S]*ADD COLUMN IF NOT EXISTS profile_id uuid/)
  assert.match(migrationSource, /REFERENCES public\.profiles\(id\)/)
  assert.match(migrationSource, /INSERT INTO public\.profiles/)
  assert.match(migrationSource, /UPDATE public\.members m[\s\S]*SET profile_id = p\.id/)
  assert.match(migrationSource, /ALTER COLUMN profile_id SET NOT NULL/)
  assert.match(migrationSource, /CREATE TRIGGER members_ensure_profile/)
  assert.match(migrationSource, /CREATE POLICY profiles_select/)
  assert.match(migrationSource, /CREATE POLICY profiles_update/)
})

test('store fetches profiles and merges profile fields into members', () => {
  assert.match(storeSource, /profiles:\s*\[\]/)
  assert.match(storeSource, /prR/)
  assert.match(storeSource, /sb\.from\('profiles'\)\.select\('\*'\)/)
  assert.match(storeSource, /profiles:\s*prR\.data \|\| \[\]/)
  assert.match(storeSource, /profiles = \[\]/)
  assert.match(storeSource, /const profilesById = new Map/)
  assert.match(storeSource, /const profile = profilesById\.get\(String\(m\.profile_id \|\| ''\)\)/)
  assert.match(storeSource, /profileId: m\.profile_id/)
  assert.match(storeSource, /name: String\(profile\?\.name \|\| m\.name \|\| ''\)\.trim\(\)/)
  assert.match(storeSource, /bankName: profile\?\.bank_name \|\| m\.bank_name \|\| ''/)
  assert.match(storeSource, /profiles: normalProfiles/)
})

test('ADD_MEMBER can link an existing profile or create a new profile first', () => {
  const addMemberBlock = storeSource.match(/case 'ADD_MEMBER': \{[\s\S]*?return newMember[\s\S]*?\n      \}/)?.[0] || ''
  assert.match(storeSource, /async function ensureProfileForMember\(sb, member\) \{/)
  assert.match(storeSource, /if \(member\?\.profileId \|\| member\?\.profile_id\) return member\.profileId \|\| member\.profile_id/)
  assert.match(storeSource, /\.from\('profiles'\)\s*\.insert\(/)
  assert.match(addMemberBlock, /const profileId = await ensureProfileForMember\(sb, member\)/)
  assert.match(addMemberBlock, /memberInsertRow\(groupId, \{ \.\.\.member, profileId \}, member\.role \|\| 'member'\)/)
})

test('new group flow can include existing profiles', () => {
  assert.match(screenDataSource, /function buildNewGroupData\(state = \{\}\)/)
  assert.match(screenDataSource, /profileOptions: buildProfileOptions\(state\)/)
  assert.match(newGroupSource, /const \[selectedProfileIds, setSelectedProfileIds\] = useState/)
  assert.match(newGroupSource, /profileOptions/)
  assert.match(newGroupSource, /toggleProfile/)
  assert.match(newGroupSource, /profileIds: selectedProfileIds/)
  assert.match(storeSource, /const profileIds = safeArray\(action\.profileIds \?\? group\.profileIds\)/)
  assert.match(storeSource, /selectedProfiles = profileIds/)
  assert.match(storeSource, /profile_id: selectedProfile\.profileId \|\| selectedProfile\.id/)
})

test('screen data exposes profile aggregation helpers for home and monthly close', () => {
  assert.match(screenDataSource, /function profileIdForMember\(memberId, members\) \{/)
  assert.match(screenDataSource, /function memberIdsForProfile\(profileId, members\) \{/)
  assert.match(screenDataSource, /function aggregateBalancesByProfile\(sourceBalances, members\) \{/)
  assert.match(screenDataSource, /const sourceBalances = buildHomeSourceBalances/)
  assert.match(screenDataSource, /profileBreakdown: aggregateBalancesByProfile\(sourceBalances, members\)/)
  assert.match(screenDataSource, /const monthlySourceBalances = buildMonthlySourceBalances/)
  assert.match(screenDataSource, /profileBreakdown: aggregateBalancesByProfile\(monthlySourceBalances, members\)/)
})
