import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dataSource = readFileSync(new URL('./useScreenData.js', import.meta.url), 'utf8')

test('Pickleball overview reads current-month court fee and members from monthly config', () => {
  const overviewMatch = dataSource.match(/function buildPickleballOverviewData[\s\S]*?\n}\n\nfunction buildProfileData/)
  assert.ok(overviewMatch)

  const overviewSource = overviewMatch[0]
  assert.match(overviewSource, /const currentYearMonth = monthKey\(today\)/)
  assert.match(overviewSource, /const currentMonthConfig = safeArray\(pickle\?\.monthlyConfigs\)\.find\([\s\S]*?c => c\.yearMonth === currentYearMonth[\s\S]*?\)/)
  assert.match(overviewSource, /const courtFee = Number\(currentMonthConfig\?\.courtFee \?\? pickle\?\.monthlyCourtFee \?\? 0\)/)
  assert.match(overviewSource, /const monthlyActiveMemberIds = safeArray\(currentMonthConfig\?\.activeMemberIds\)/)
  assert.match(overviewSource, /const activeMemberIds = monthlyActiveMemberIds\.length > 0 \? monthlyActiveMemberIds : safeArray\(pickle\?\.fixedMembers\)/)
  assert.match(overviewSource, /memberCount: activeMemberIds\.length/)
  assert.match(overviewSource, /courtSub: `\$\{activeMemberIds\.length\} thành viên cố định`/)
})
