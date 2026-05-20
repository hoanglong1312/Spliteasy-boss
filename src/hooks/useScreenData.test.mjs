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

test('Pickleball members data exposes fixed/casual rows with rank metadata', () => {
  const membersMatch = dataSource.match(/function buildPickleballMembersData[\s\S]*?\n}\n\nfunction buildPickleballTicketsData/)
  assert.ok(membersMatch)

  const membersSource = membersMatch[0]
  assert.match(membersSource, /const fixedMembers = activeMembers\.filter\(member => memberType\(member\) === 'fixed'\)/)
  assert.match(membersSource, /const casualMembers = activeMembers\.filter\(member => memberType\(member\) === 'casual'\)/)
  assert.match(membersSource, /type: memberType\(member\)/)
  assert.match(membersSource, /fixedMembers: fixedRows/)
  assert.match(membersSource, /casualMembers: casualRows/)
  assert.match(dataSource, /progressPct/)
  assert.match(dataSource, /rank: calculateMemberRank\(progressPct\)/)
})

test('Member detail data includes attendance rank and casual court-fee logic', () => {
  assert.match(dataSource, /getMemberDetailData: \(memberId\) => buildMemberDetailData\(state, memberId\)/)

  const detailMatch = dataSource.match(/function buildMemberDetailData[\s\S]*?\n}\n\nfunction buildPickleballTicketsData/)
  assert.ok(detailMatch)
  const detailSource = detailMatch[0]

  assert.match(detailSource, /const balance = buildMemberMonthBalance\(state, pickle, sessions, member\.id\)/)
  assert.match(detailSource, /rank: calculateMemberRank\(attendance\.percentage\)/)
  assert.match(detailSource, /bankAccount: member\?\.bankAccount \|\| member\?\.bank_account \|\| ''/)
  assert.match(dataSource, /const ratePerSession = courtFeeTotal \/ sessionsCount \/ fixedMemberCount/)
  assert.match(dataSource, /const vanglaiCharge = ratePerSession \* attendanceByMemberId\(sessions, member\.id\)/)
  assert.match(dataSource, /const rebatePerFixed = fixedMemberCount > 0 \? casualCharges\.reduce/)
})
