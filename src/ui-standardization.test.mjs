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
  assert.match(primitivesSource, /const allVisibleSelected = hasVisibleCandidates && visible\.every/)
  assert.match(primitivesSource, /allVisibleSelected \? clearVisibleCandidates\(\) : selectVisibleCandidates\(\)/)
  assert.match(primitivesSource, /\{allVisibleSelected \? 'Bỏ chọn' : 'Chọn tất cả'\}/)
  assert.doesNotMatch(primitivesSource, /const selected = candidates\.filter/)
  assert.doesNotMatch(primitivesSource, /\{selected\.length > 0 && \(/)
  assert.doesNotMatch(primitivesSource, /\{candidate\.name\} ×/)
  assert.doesNotMatch(primitivesSource, /gridTemplateColumns: '1fr 1fr'[\s\S]*?>\s*Bỏ chọn\s*<\/button>/)
})

test('MonthNav gives month controls clear accessible names', () => {
  const monthNavSource = primitivesSource.slice(
    primitivesSource.indexOf('export function MonthNav'),
    primitivesSource.indexOf('export function Stat({')
  )
  assert.match(monthNavSource, /aria-label="Tháng trước"/)
  assert.match(monthNavSource, /aria-label="Tháng sau"/)
})

test('MonthNav month controls meet the minimum touch target', () => {
  const monthNavSource = primitivesSource.slice(
    primitivesSource.indexOf('export function MonthNav'),
    primitivesSource.indexOf('export function Stat({')
  )
  assert.match(monthNavSource, /width: 44, height: 44/)
})

test('IconButton meets the minimum touch target', () => {
  const iconButtonSource = primitivesSource.slice(
    primitivesSource.indexOf('export function IconButton'),
    primitivesSource.indexOf('export function IconActionButton')
  )
  assert.match(iconButtonSource, /width: 44, height: 44/)
})

test('IconButton gives common symbols clear accessible names', () => {
  const iconButtonSource = primitivesSource.slice(
    primitivesSource.indexOf('export function IconButton'),
    primitivesSource.indexOf('export function IconActionButton')
  )
  assert.match(iconButtonSource, /'‹': 'Quay lại'/)
  assert.match(iconButtonSource, /'⋯': 'Tùy chọn'/)
  assert.match(iconButtonSource, /rest\['aria-label'\] \|\| iconLabel/)
})

test('BottomSheet portals to the phone frame instead of the scrollable screen', () => {
  assert.match(primitivesSource, /import \{ createPortal \} from 'react-dom'/)
  assert.match(primitivesSource, /data-spliteasy-phone-frame/)
  assert.match(primitivesSource, /document\.querySelector\('\[data-spliteasy-phone-frame\]'\)/)
  assert.match(primitivesSource, /return target \? createPortal\(sheet, target\) : sheet/)
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
  assert.match(newGroupSource, /const GROUP_TYPES = \[/)
  assert.match(newGroupSource, /key: 'food', label: 'Ăn uống', emoji: '🍜'/)
  assert.match(newGroupSource, /key: 'travel', label: 'Du lịch', emoji: '✈️'/)
  assert.match(newGroupSource, /key: 'expense', label: 'Chi tiêu', emoji: '💰'/)
  assert.match(newGroupSource, /Chọn loại nhóm/)
  assert.match(newGroupSource, /groupType: selectedGroupType\.key/)
  assert.match(newGroupSource, /overflowX: 'auto'/)
  assert.match(newGroupSource, /minWidth: 96/)
  assert.doesNotMatch(newGroupSource, /gridTemplateColumns: 'repeat\(6, 1fr\)'/)
})

test('primary money screens share summary, search, section, and list primitives', () => {
  assert.doesNotMatch(homeSource, /ModuleHero/)
  assert.match(homeSource, /function SourceBreakdown/)
  assert.match(homeSource, /SearchInput/)
  assert.match(homeSource, /SectionHeader/)
  assert.match(homeSource, /ListCard/)

  assert.match(groupsListSource, /ModuleHero/)
  assert.match(groupsListSource, /SearchInput/)
  assert.match(groupsListSource, /SectionHeader/)
  assert.match(groupsListSource, /ListCard/)

  assert.match(groupDetailSource, /ModuleHero/)
  assert.match(groupDetailSource, /SummaryChipRow/)
  assert.match(groupDetailSource, /SearchInput/)
  assert.match(groupDetailSource, /ListCard/)
})

test('group detail keeps header and member list in one screen scroll flow', () => {
  const groupDetailLayout = groupDetailSource.slice(
    groupDetailSource.indexOf('return ('),
    groupDetailSource.indexOf('{exportMenuOpen &&')
  )

  assert.match(groupDetailLayout, /<Screen tabBar style=\{\{ padding: 0 \}\}>/)
  assert.doesNotMatch(groupDetailLayout, /flex: 1, overflowY: 'auto'/)
  assert.doesNotMatch(groupDetailLayout, /overflow: 'hidden', display: 'flex', flexDirection: 'column'/)
})

test('group detail data receives profile directory and app state explicitly', () => {
  assert.match(screenDataSource, /function buildGroupDetailData\(group, currentUserId, members, currentUserName, selectedYearMonth, profiles = \[\], appState = \{\}\)/)
  assert.match(screenDataSource, /buildGroupDetailData\(currentGroup, currentUserId, members, currentUserName, selectedYearMonth, state\?\.profiles, state\)/)
  assert.match(screenDataSource, /memberCandidates: buildGroupMemberCandidates\(g, members, profiles, \{ mode: 'expense', groups: appState\?\.groups \}\)/)
  const buildGroupDetailBlock = screenDataSource.slice(
    screenDataSource.indexOf('function buildGroupDetailData'),
    screenDataSource.indexOf('function groupDetailSettlementGroup')
  )
  assert.doesNotMatch(buildGroupDetailBlock, /[^p]state\?\./)
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
