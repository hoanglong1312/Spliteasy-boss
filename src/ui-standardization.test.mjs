import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const primitivesSource = readFileSync(new URL('./primitives.jsx', import.meta.url), 'utf8')
const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')
const newGroupSource = readFileSync(new URL('./screens/NewGroup.jsx', import.meta.url), 'utf8')
const pickleballMembersSource = readFileSync(new URL('./screens/PickleballMembers.jsx', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./screens/Home.jsx', import.meta.url), 'utf8')
const groupsListSource = readFileSync(new URL('./screens/GroupsList.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')

test('shared visual primitives exist for Pickleball-style module screens', () => {
  for (const exported of [
    'ModuleHero',
    'ActionButton',
    'IconActionButton',
    'SearchInput',
    'SectionHeader',
    'StatGrid',
    'ListCard',
    'BottomSheet',
    'MemberPicker',
  ]) {
    assert.match(primitivesSource, new RegExp(`export function ${exported}\\(`))
  }
  assert.match(primitivesSource, /function normalizePickerSearch\(value\)/)
  assert.match(primitivesSource, /\.normalize\('NFD'\)/)
  assert.match(primitivesSource, /selectedIds\.includes\(String\(candidate\.id\)\)/)
  assert.match(primitivesSource, /maxHeight: maxListHeight/)
  assert.match(primitivesSource, /emptyText/)
  assert.match(primitivesSource, /function selectVisibleCandidates\(\)/)
  assert.match(primitivesSource, /function clearVisibleCandidates\(\)/)
  assert.match(primitivesSource, />\s*Chọn tất cả\s*<\/button>/)
  assert.match(primitivesSource, />\s*Bỏ chọn\s*<\/button>/)
})

test('group and pickleball member sheets use the same searchable multi-select picker', () => {
  assert.match(groupDetailSource, /MemberPicker/)
  assert.match(groupDetailSource, /selectedIds=\{selectedCandidateIds\}/)
  assert.match(groupDetailSource, /onToggle=\{toggleCandidate\}/)
  assert.match(groupDetailSource, /for \(const candidate of selectedCandidates\)/)
  assert.doesNotMatch(groupDetailSource, /function BottomSheet\(/)
  assert.doesNotMatch(groupDetailSource, /function ActionButton\(/)

  assert.match(pickleballMembersSource, /MemberPicker/)
  assert.match(pickleballMembersSource, /selectedIds=\{selectedCandidateIds\}/)
  assert.match(pickleballMembersSource, /onToggle=\{toggleCandidate\}/)
  assert.doesNotMatch(pickleballMembersSource, /function BottomSheet\(/)
  assert.doesNotMatch(pickleballMembersSource, /function ActionButton\(/)
})

test('new group uses shared module hero and scrollable existing-profile picker', () => {
  assert.match(newGroupSource, /ModuleHero/)
  assert.match(newGroupSource, /MemberPicker/)
  assert.match(newGroupSource, /candidates=\{filteredProfileOptions\}/)
  assert.match(newGroupSource, /selectedIds=\{selectedProfileIds\}/)
  assert.match(newGroupSource, /onQueryChange=\{setProfileQuery\}/)
  assert.match(newGroupSource, /profileIds: selectedProfileIds/)
  assert.match(newGroupSource, /'🍜','🥘'/)
  assert.match(newGroupSource, /'✈️','🚗'/)
  assert.match(newGroupSource, /'🏖','🏨'/)
  assert.match(newGroupSource, /overflowX: 'auto'/)
  assert.match(newGroupSource, /width: 44, height: 44/)
  assert.doesNotMatch(newGroupSource, /gridTemplateColumns: 'repeat\(6, 1fr\)'/)
})

test('primary money screens share hero, search, section, and list primitives', () => {
  assert.match(homeSource, /ModuleHero/)
  assert.match(homeSource, /SearchInput/)
  assert.match(homeSource, /SectionHeader/)
  assert.match(homeSource, /ListCard/)

  assert.match(groupsListSource, /ModuleHero/)
  assert.match(groupsListSource, /SearchInput/)
  assert.match(groupsListSource, /SectionHeader/)
  assert.match(groupsListSource, /ListCard/)

  assert.match(groupDetailSource, /ModuleHero/)
  assert.match(groupDetailSource, /StatGrid/)
  assert.match(groupDetailSource, /SearchInput/)
  assert.match(groupDetailSource, /ListCard/)
})

test('group detail data receives profile directory without free state references', () => {
  assert.match(screenDataSource, /function buildGroupDetailData\(group, currentUserId, members, currentUserName, selectedYearMonth, profiles = \[\]\)/)
  assert.match(screenDataSource, /buildGroupDetailData\(currentGroup, currentUserId, members, currentUserName, selectedYearMonth, state\?\.profiles\)/)
  assert.match(screenDataSource, /memberCandidates: buildGroupMemberCandidates\(g, members, profiles, \{ mode: 'expense' \}\)/)
  const buildGroupDetailBlock = screenDataSource.slice(
    screenDataSource.indexOf('function buildGroupDetailData'),
    screenDataSource.indexOf('function buildGroupMemberCandidates')
  )
  assert.doesNotMatch(buildGroupDetailBlock, /state\?\./)
})

test('group detail distinguishes creator and treasurer roles in member rows', () => {
  const buildGroupDetailBlock = screenDataSource.slice(
    screenDataSource.indexOf('function buildGroupDetailData'),
    screenDataSource.indexOf('function buildGroupMemberCandidates')
  )
  assert.match(buildGroupDetailBlock, /const isGroupTreasurer = Boolean\(isGroupCreator \|\|/)
  assert.match(buildGroupDetailBlock, /isGroupCreator: isMemberGroupCreator\(g, member\)/)
  assert.doesNotMatch(groupDetailSource, /member\.isGroupCreator && <RolePill/)
  assert.doesNotMatch(groupDetailSource, /Trưởng nhóm/)
  assert.match(groupDetailSource, /💳/)
  assert.match(groupDetailSource, /Thủ quỹ/)
})
