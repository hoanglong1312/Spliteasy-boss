import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dataSource = readFileSync(new URL('./useScreenData.js', import.meta.url), 'utf8')

test('Pickleball overview reads current-month court fee and current fixed members', () => {
  const overviewMatch = dataSource.match(/function buildPickleballOverviewData[\s\S]*?\n}\n\nfunction buildProfileData/)
  assert.ok(overviewMatch)

  const overviewSource = overviewMatch[0]
  assert.match(overviewSource, /const currentYearMonth = monthKey\(today\)/)
  assert.match(overviewSource, /const currentMonthConfig = safeArray\(pickle\?\.monthlyConfigs\)\.find\([\s\S]*?c => c\.yearMonth === currentYearMonth[\s\S]*?\)/)
  assert.match(overviewSource, /const monthSessions = getStateMonthSessions\(state, today\)/)
  assert.match(overviewSource, /const courtFee = Number\(currentMonthConfig\?\.courtFee \?\? pickle\?\.monthlyCourtFee \?\? 0\)/)
  assert.match(overviewSource, /const currentFixedMembers = currentGroupMembers\(state\)\.filter\(member => isActiveMember\(member\) && memberType\(member\) === 'fixed'\)/)
  assert.match(overviewSource, /const activeMemberIds = currentFixedMembers\.map/)
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

test('Pickleball tickets data exposes individual-ticket table rows and team-fund filter', () => {
  const ticketsMatch = dataSource.match(/function buildPickleballTicketsData[\s\S]*?\n}\n\nfunction buildPickleballSettingsData/)
  assert.ok(ticketsMatch)
  const ticketsSource = ticketsMatch[0]

  assert.match(ticketsSource, /monthTicketsForState\(state, today\)/)
  assert.match(dataSource, /state\?\._allPickle\?\.externalTickets/)
  assert.match(dataSource, /state\?\.pickle\?\.externalTickets/)
  assert.match(ticketsSource, /monthLabel: formatMonthLabel\(today\)/)
  assert.match(ticketsSource, /const approvedTickets = tickets\.filter\(ticket => ticket\.status !== 'pending_review'\)/)
  assert.match(ticketsSource, /totalAttendances: approvedTickets\.reduce\([\s\S]*?safeArray\(ticket\.memberIds\)\.length/)
  assert.match(dataSource, /amountPerPerson/)
  assert.match(dataSource, /memberLabels/)
  assert.match(dataSource, /advancerName/)
  assert.match(ticketsSource, /status: 'team_fund'/)
  assert.match(ticketsSource, /\{ key: 'pending', label: `🕓 Chờ duyệt · \$\{pending\.length\}` \}/)
  assert.match(ticketsSource, /\{ key: 'team', label: `🏦 Quỹ team · \$\{teamFund\.length\}` \}/)
})

test('Pickleball overview and member detail include individual-ticket balances', () => {
  assert.match(dataSource, /function memberTicketBalance\(state, memberId\) \{/)
  assert.match(dataSource, /function memberTeamFundTicketShare\(state, memberId\) \{/)
  assert.match(dataSource, /const p2pTicketBalance = memberTicketBalance\(state, currentUserId\)/)
  assert.match(dataSource, /const teamFundTicketShare = memberTeamFundTicketShare\(state, currentUserId\)/)
  assert.match(dataSource, /const ticketAmount = p2pTicketBalance - teamFundTicketShare/)
  assert.match(dataSource, /const ticketStats = buildTicketMonthStats\(state\)/)
  assert.match(dataSource, /ticketStats,\s*\n\s*ticketFund,/)
  assert.match(dataSource, /ticketSessions: ticketStats\.sessionCount/)
  assert.match(dataSource, /ticketTotal: ticketStats\.totalAmount/)
  assert.match(dataSource, /summaryCards: buildPersonalPickleSummaryCards\(/)
  assert.match(dataSource, /yourTickets: buildPersonalTicketOverview\(state, currentUserId\)/)
  assert.match(dataSource, /memberBalance\.courtFee/)
  assert.match(dataSource, /memberBalance\.waterFee/)
  assert.match(dataSource, /ticketAdjustment/)
  assert.match(dataSource, /const ticketShare = memberTeamFundTicketShare\(state, memberId\)/)
  assert.match(dataSource, /const p2pBalance = memberTicketBalance\(state, memberId\)/)
  assert.match(dataSource, /ticketShare/)
  assert.match(dataSource, /p2pBalance/)
})
