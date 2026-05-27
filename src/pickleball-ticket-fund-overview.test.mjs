import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const overviewSource = readFileSync(new URL('./screens/PickleballOverview.jsx', import.meta.url), 'utf8')
const teamFundSource = readFileSync(new URL('./screens/PickleballTeamFund.jsx', import.meta.url), 'utf8')
const ownerPaymentMigration = readFileSync(new URL('../supabase/migrations/20260522000003_pickleball_owner_payments.sql', import.meta.url), 'utf8')

function loadScreenDataBuilders() {
  const fixedNow = new Date('2026-05-21T12:00:00')
  class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(fixedNow)
      else super(...args)
    }

    static now() {
      return fixedNow.getTime()
    }
  }

  const source = dataSource
    .replace(/import \{ useEffect, useMemo, useRef \} from 'react'\n/, '')
    .replace(/import \{ useApp \} from '\.\.\/store\.jsx'\n/, '')
    .replace(/import \{[\s\S]*?\} from '\.\.\/data\.jsx'\n/, '')
    .replace('export function useScreenData', 'function useScreenData')

  const context = {
    Date: FixedDate,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${value}`,
    groupBalance: () => ({}),
    groupNet: () => 0,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: () => [],
  }
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildPickleballOverviewData }`, context)
  return context.__builders
}

test('overview rolls individual tickets into team-fund member adjustments', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'viet',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'Nhóm Pickleball Quận 7' },
    members: [
      { id: 'viet', groupId: 'g1', name: 'Anh Việt', memberType: 'fixed', isActive: true },
      { id: 'cuong', groupId: 'g1', name: 'Cường', memberType: 'fixed', isActive: true },
      { id: 'giang', groupId: 'g1', name: 'Giang', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      fixedMembers: ['viet', 'cuong', 'giang'],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', courtFee: 0 }],
      sessions: [],
      externalTickets: [
        { id: 't1', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-21', status: 'unpaid', totalAmount: 100000, memberIds: ['viet', 'cuong'], advancerId: 'viet' },
        { id: 't2', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-22', status: 'team_fund', totalAmount: 100000, memberIds: ['cuong', 'giang'] },
        { id: 't3', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-23', status: 'pending_review', totalAmount: 50000, memberIds: ['viet'], advancerId: 'viet' },
      ],
    },
    _allPickle: { externalTickets: [] },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'viet', state.members)

  assert.equal(data.ticketFund.totalCredit, 50000)
  assert.equal(data.ticketFund.totalDue, 150000)
  assert.equal(data.ticketFund.netToFund, 100000)
  assert.deepEqual(data.ticketFund.rows.map(row => [row.name, row.amount, row.label]), [
    ['Anh Việt', -50000, 'Quỹ bù lại'],
    ['Cường', 100000, 'Nộp vào quỹ'],
    ['Giang', 50000, 'Nộp vào quỹ'],
  ])
  assert.equal(data.yourBalance.total, 50000)
  assert.equal(data.yourBalance.statusLabel, 'Được quỹ bù')
  assert.equal(JSON.stringify(data.yourBalance.summaryCards.map(row => [row.label, row.amount, row.sub])), JSON.stringify([
    ['Sân của bạn', 0, 'Phần của bạn'],
    ['Nước của bạn', 0, '0 buổi có nước'],
    ['Vé lẻ qua quỹ', -50000, 'Qua quỹ team'],
  ]))
  assert.equal(JSON.stringify(data.yourBalance.breakdown.map(row => [row.label, row.amount])), JSON.stringify([
    ['🏸 Tiền sân', 0],
    ['💧 Tiền nước (0 buổi)', 0],
    ['📦 Phụ phát sinh', 0],
    ['🎟️ Vé lẻ qua quỹ', -50000],
  ]))
  assert.equal(data.yourTickets.summary.sessionCount, 1)
  assert.equal(data.yourTickets.summary.totalAdjustment, -50000)
  assert.equal(data.yourTickets.summary.displayAdjustment, 50000)
  assert.equal(data.yourTickets.summary.advancedCount, 1)
  assert.equal(JSON.stringify(data.yourTickets.rows.map(row => [row.dateLabel, row.sourceLabel, row.roleLabel, row.personalAmount, row.displayAmount])), JSON.stringify([
    ['T5 21/05', 'Anh Việt ứng', 'Bạn ứng tiền', -50000, 50000],
  ]))
  assert.equal(JSON.stringify(data.teamFundOverview.costRows.map(row => [row.label, row.amount, row.paidToOwner])), JSON.stringify([
    ['Tiền sân', 0, false],
    ['Tiền nước', 0, false],
    ['Phát sinh', 0, false],
    ['Vé lẻ team', 100000, false],
  ]))
  assert.equal(data.teamFundOverview.teamFundDirectTotal, 100000)
  assert.equal(JSON.stringify(data.teamFundOverview.paymentDraft.items.map(row => [row.key, row.amount])), JSON.stringify([
    ['water', 0],
    ['extras', 0],
    ['tickets', 100000],
    ['next_court', 0],
  ]))
  assert.equal(JSON.stringify(data.teamFundOverview.ticketRows.map(row => [row.dateLabel, row.sourceLabel, row.totalAmount, row.amountPerPerson])), JSON.stringify([
    ['T5 21/05', 'Anh Việt ứng', 100000, 50000],
    ['T6 22/05', 'Quỹ team trả hộ', 100000, 50000],
  ]))
  assert.equal(JSON.stringify(data.teamFundOverview.ticketRows.map(row => row.ledgerRows.map(item => [item.name, item.roleLabel, item.amount]))), JSON.stringify([
    [
      ['Anh Việt', 'Người khác trả lại', 50000],
      ['Cường', 'Phần tham gia', -50000],
    ],
    [
      ['Cường', 'Quỹ trả hộ', -50000],
      ['Giang', 'Quỹ trả hộ', -50000],
    ],
  ]))
  assert.equal(JSON.stringify(data.teamFundOverview.ticketParticipantRows.map(row => [row.name, row.sessions, row.amount])), JSON.stringify([
    ['Anh Việt', 1, 50000],
    ['Giang', 1, -50000],
    ['Cường', 2, -100000],
  ]))
})

test('overview resolves same-profile current user to pickleball member before reading tickets', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'cuong-expense',
    currentUserName: 'Cường',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'Virgo Pickleball 246', members: ['minh-pickle', 'cuong-pickle'] },
    members: [
      { id: 'cuong-expense', groupId: 'expense-1', name: 'Cường', memberType: 'fixed', isActive: true, profileId: 'profile-cuong' },
      { id: 'minh-pickle', groupId: 'g1', name: 'Minh Em', memberType: 'fixed', isActive: true, profileId: 'profile-minh' },
      { id: 'cuong-pickle', groupId: 'g1', name: 'Cường', memberType: 'fixed', isActive: true, profileId: 'profile-cuong' },
    ],
    pickle: {
      fixedMembers: ['minh-pickle', 'cuong-pickle'],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', courtFee: 0 }],
      sessions: [],
      externalTickets: [
        { id: 'ticket-16', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-16', status: 'unpaid', totalAmount: 100000, memberIds: ['minh-pickle', 'cuong-pickle'], advancerId: 'minh-pickle' },
      ],
    },
    _allPickle: { externalTickets: [] },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'cuong-expense', state.members, '2026-05')

  assert.equal(data.yourBalance.name, 'Cường')
  assert.equal(data.yourTickets.summary.sessionCount, 1)
  assert.equal(data.yourTickets.summary.displayAdjustment, -50000)
  assert.deepEqual(JSON.parse(JSON.stringify(data.yourTickets.rows.map(row => [row.dateLabel, row.sourceLabel, row.roleLabel, row.displayAmount]))), [
    ['T7 16/05', 'Minh Em ứng', 'Bạn tham gia', -50000],
  ])
})

test('team fund tracks venue bank info and owner payment history', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'viet',
    currentGroupId: 'g1',
    currentGroup: {
      id: 'g1',
      name: 'Nhóm Pickleball Quận 7',
      venueOwnerName: 'Virgo Pickleball',
      venueBankName: 'VCB',
      venueBankAccount: '123456789',
    },
    members: [
      { id: 'viet', groupId: 'g1', name: 'Anh Việt', memberType: 'fixed', isActive: true },
      { id: 'minh', groupId: 'g1', name: 'Minh', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      fixedMembers: ['viet', 'minh'],
      monthlyConfigs: [
        { groupId: 'g1', yearMonth: '2026-05', courtFee: 4000000, ticketPrice: 50000 },
        { groupId: 'g1', yearMonth: '2026-06', courtFee: 4200000, ticketPrice: 50000 },
      ],
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', status: 'completed', attendees: ['viet', 'minh'], waterAmount: 60000 },
      ],
      sessionItems: [
        { id: 'extra-1', sessionId: 's1', name: 'Bóng', amount: 80000, memberIds: ['viet', 'minh'] },
      ],
      externalTickets: [
        { id: 'ticket-1', groupId: 'g1', yearMonth: '2026-05', date: '2026-05-17', status: 'team_fund', totalAmount: 150000, memberIds: ['viet', 'minh'] },
      ],
      ownerPayments: [
        {
          id: 'pay-1',
          groupId: 'g1',
          yearMonth: '2026-05',
          paidAt: '2026-05-31',
          totalAmount: 4350000,
          items: [
            { key: 'court', yearMonth: '2026-05', amount: 4000000 },
            { key: 'water', yearMonth: '2026-05', amount: 60000 },
            { key: 'extras', yearMonth: '2026-05', amount: 80000 },
            { key: 'tickets', yearMonth: '2026-05', amount: 150000 },
            { key: 'next_court', yearMonth: '2026-06', amount: 4200000 },
          ],
        },
      ],
    },
    _allPickle: { sessions: [], externalTickets: [], ownerPayments: [] },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'viet', state.members)
  const team = data.teamFundOverview

  assert.equal(JSON.stringify(team.venueBank), JSON.stringify({
    ownerName: 'Virgo Pickleball',
    bankName: 'VCB',
    bankAccount: '123456789',
  }))
  assert.equal(team.nextMonth.yearMonth, '2026-06')
  assert.equal(team.nextMonth.courtFee, 4200000)
  assert.equal(JSON.stringify(team.paymentDraft.items.map(item => [item.key, item.yearMonth, item.amount, item.paid])), JSON.stringify([
    ['water', '2026-05', 60000, true],
    ['extras', '2026-05', 80000, true],
    ['tickets', '2026-05', 150000, true],
    ['next_court', '2026-06', 4200000, true],
  ]))
  assert.equal(team.paymentDraft.totalAmount, 4490000)
  assert.equal(team.ownerPayments.length, 1)
  assert.equal(team.costRows.every(row => row.paidToOwner), true)
})

test('overview separates personal tickets from treasurer team-fund view', () => {
  assert.doesNotMatch(overviewSource, /d\.ticketFund\?\.rows\?\.length > 0/)
  assert.doesNotMatch(overviewSource, /Vé lẻ trong quỹ/)
  assert.match(overviewSource, /Vé lẻ qua quỹ/)
  assert.doesNotMatch(overviewSource, /ticketFund\.rows\.map/)
  assert.doesNotMatch(overviewSource, /Chênh lệch qua quỹ/)
  assert.doesNotMatch(overviewSource, /Cần thu/)
  assert.doesNotMatch(overviewSource, /Cần bù/)
  assert.match(overviewSource, /Vé lẻ của bạn trong tháng/)
  assert.match(overviewSource, /isTreasurer && \(/)
  assert.match(overviewSource, /Quỹ team tháng này/)
  assert.match(overviewSource, /onAction\?\.\('push', \{ screen: 'pickleball-team-fund', params: \{ yearMonth: d\.currentYearMonth \} \}\)/)
  assert.match(overviewSource, /Của bạn tháng này/)
  assert.doesNotMatch(overviewSource, /Xem chi tiết/)
  assert.doesNotMatch(overviewSource, /balanceDetailsOpen/)
  assert.doesNotMatch(overviewSource, /d\.yourBalance\.breakdown\.map/)
  assert.doesNotMatch(overviewSource, /Đã gồm tiền sân, nước, phát sinh và vé lẻ qua quỹ/)
  assert.match(overviewSource, /balanceHeroStyle/)
  assert.match(overviewSource, /Sân của bạn/)
  assert.match(overviewSource, /Nước của bạn/)
  assert.match(overviewSource, /Buổi thêm/)
  assert.match(overviewSource, /Phần của bạn/)
  assert.match(overviewSource, /displayAdjustment/)
  assert.match(overviewSource, /row\.displayAmount/)
  assert.match(overviewSource, /formatSignedTicketAmount/)
  assert.doesNotMatch(overviewSource, /Có người ứng/)
  assert.match(overviewSource, /Chi phí team và khoản đã trả chủ sân/)
  assert.match(overviewSource, /teamFundOverview\.costRows/)
  assert.match(overviewSource, /Đã trả chủ sân/)
  assert.match(overviewSource, /Chưa đánh dấu trả/)
  assert.doesNotMatch(overviewSource, /markOwnerPayment/)
  assert.doesNotMatch(overviewSource, /Đánh dấu đã chuyển/)
  assert.ok(overviewSource.indexOf('Của bạn tháng này') < overviewSource.indexOf('Tiến độ tháng'))
  assert.doesNotMatch(overviewSource, /Trừ vào quỹ/)
  assert.doesNotMatch(overviewSource, /Vé lẻ chưa trả/)
  assert.doesNotMatch(overviewSource, /CompactCostCard icon="🏸" label="Tiền sân"/)
})

test('team fund screen owns treasury totals and monthly money config', () => {
  assert.match(teamFundSource, /export default function PickleballTeamFund/)
  assert.match(teamFundSource, /const \[courtFee, setCourtFee\] = useState/)
  assert.match(teamFundSource, /const \[ticketPrice, setTicketPrice\] = useState/)
  assert.match(teamFundSource, /const \[venueOwnerName, setVenueOwnerName\] = useState/)
  assert.match(teamFundSource, /const \[selectedPaymentKeys, setSelectedPaymentKeys\] = useState/)
  assert.match(teamFundSource, /import \{ BANK_LIST, generateQRUrl \} from '\.\.\/lib\/vietqr\.js'/)
  assert.match(teamFundSource, /Tiền sân tháng/)
  assert.match(teamFundSource, /Giá vé lẻ\/người/)
  assert.match(teamFundSource, /STK chủ sân/)
  assert.match(teamFundSource, /const \[ownerBankOpen, setOwnerBankOpen\] = useState\(false\)/)
  assert.match(teamFundSource, /button type="button"[\s\S]*?setOwnerBankOpen\(!ownerBankOpen\)/)
  assert.match(teamFundSource, /<BankSelect value=\{venueBankName\} onChange=\{value => \{/)
  assert.match(teamFundSource, /function BankSelect/)
  assert.match(teamFundSource, /BANK_LIST\.map/)
  assert.match(teamFundSource, /generateQRUrl\(\{/)
  assert.match(teamFundSource, /Quét VietQR/)
  assert.match(teamFundSource, /Thanh toán/)
  assert.match(teamFundSource, /Chưa chuyển/)
  assert.match(teamFundSource, /Cần chạy supabase db push/)
  assert.match(teamFundSource, /Cần thanh toán/)
  assert.match(teamFundSource, /Lịch sử chuyển chủ sân/)
  assert.match(teamFundSource, /Tiền sân tháng sau/)
  assert.match(teamFundSource, /Đánh dấu đã chuyển/)
  assert.match(teamFundSource, /markSinglePaymentItem/)
  assert.match(teamFundSource, /items: \[item\]/)
  assert.match(teamFundSource, /Xác nhận đã thanh toán/)
  assert.match(teamFundSource, /unmarkSinglePaymentItem/)
  assert.match(teamFundSource, /ownerPaymentForItem\(ownerPayments, item\)/)
  assert.match(teamFundSource, /Hủy thanh toán/)
  assert.match(teamFundSource, /onAction\?\.\('unmarkOwnerPayment'/)
  assert.match(teamFundSource, /setPaymentQrOpen\(true\)/)
  assert.match(teamFundSource, /Giao dịch vé lẻ/)
  assert.match(teamFundSource, /Quỹ team cần trả hộ thành viên/)
  assert.match(teamFundSource, /teamFundDirectTotal/)
  assert.match(teamFundSource, /safeArray\(ticket\.ledgerRows\)\.map/)
  assert.match(teamFundSource, /const \[openTicketId, setOpenTicketId\] = useState\(''\)/)
  assert.match(teamFundSource, /setOpenTicketId\(ticketOpen \? '' : ticket\.id\)/)
  assert.match(teamFundSource, /ticketOpen && \(/)
  assert.match(teamFundSource, /overflowY: 'auto'/)
  assert.match(teamFundSource, /\+.*formatVND/)
  assert.match(teamFundSource, /-.*formatVND/)
  assert.match(teamFundSource, /ticketRows\.map/)
  assert.match(teamFundSource, /ticketParticipantRows\.map/)
  assert.match(teamFundSource, /formatSignedTicketAmount/)
  assert.match(teamFundSource, /row\.amount > 0 \? '#6ee7b7' : '#fca5a5'/)
  assert.doesNotMatch(teamFundSource, /Cần thu/)
  assert.doesNotMatch(teamFundSource, /Cần bù/)
  assert.doesNotMatch(teamFundSource, /Chênh lệch qua quỹ/)
  assert.match(teamFundSource, /onAction\?\.\('saveTeamFundConfig'/)
  assert.match(teamFundSource, /onAction\?\.\('markOwnerPayment'/)
  assert.match(teamFundSource, /onAction\?\.\('push', 'pickleball-calendar'\)/)
})

test('owner payment migration stores venue bank and owner transfer history', () => {
  assert.match(ownerPaymentMigration, /ALTER TABLE public\.groups/)
  assert.match(ownerPaymentMigration, /ADD COLUMN IF NOT EXISTS venue_owner_name/)
  assert.match(ownerPaymentMigration, /ADD COLUMN IF NOT EXISTS venue_bank_name/)
  assert.match(ownerPaymentMigration, /ADD COLUMN IF NOT EXISTS venue_bank_account/)
  assert.match(ownerPaymentMigration, /CREATE TABLE IF NOT EXISTS public\.pickleball_owner_payments/)
  assert.match(ownerPaymentMigration, /bank_snapshot\s+jsonb NOT NULL DEFAULT '\{\}'::jsonb/)
  assert.match(ownerPaymentMigration, /items\s+jsonb NOT NULL DEFAULT '\[\]'::jsonb/)
  assert.match(ownerPaymentMigration, /pickleball_owner_payments_select/)
  assert.match(ownerPaymentMigration, /pickleball_owner_payments_insert/)
})

test('overview folds next session into progress card instead of rendering a separate hero', () => {
  assert.doesNotMatch(overviewSource, /<Hero variant="emerald">/)
  assert.doesNotMatch(overviewSource, /d\.progress\.leaders/)
  assert.match(overviewSource, /gridTemplateColumns: '1\.28fr 0\.72fr'/)
  assert.match(overviewSource, /function CompactCostCard/)
  assert.match(overviewSource, /d\.todaySession\.statusLabel/)
  assert.doesNotMatch(overviewSource, /d\.todaySession\.statusLabel\} · \{d\.todaySession\.timeRange/)
  assert.match(overviewSource, /displayTimeRange\(d\.todaySession\.timeRange\)/)
  assert.match(overviewSource, /whiteSpace: 'nowrap'/)
  assert.match(overviewSource, /Buổi #\{d\.todaySession\.number\}/)
  assert.doesNotMatch(overviewSource, /d\.todaySession\.present/)
  assert.doesNotMatch(overviewSource, /d\.todaySession\.total/)
  assert.doesNotMatch(overviewSource, /Có mặt/)
})

test('overview uses calendar month sessions and current fixed members for progress and court summary', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'viet',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'Nhóm Pickleball Quận 7' },
    members: [
      { id: 'viet', groupId: 'g1', name: 'Anh Việt', memberType: 'fixed', isActive: true },
      { id: 'cuong', groupId: 'g1', name: 'Cường', memberType: 'fixed', isActive: true },
      { id: 'guest', groupId: 'g1', name: 'Khách', memberType: 'casual', isActive: true },
    ],
    pickle: {
      fixedMembers: ['old-a', 'old-b', 'old-c', 'old-d', 'old-e', 'old-f'],
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', courtFee: 700000, activeMemberIds: ['stale-a'] }],
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-01', status: 'completed', attendees: ['viet'] },
        { id: 's2', groupId: 'g1', date: '2026-05-08', status: 'scheduled', attendees: [] },
      ],
      externalTickets: [
        { id: 't1', groupId: 'g1', yearMonth: '2026-05', status: 'team_fund', totalAmount: 120000, memberIds: ['viet', 'cuong'] },
      ],
    },
    _allPickle: { sessions: [], externalTickets: [] },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'viet', state.members)
  assert.equal(data.memberCount, 2)
  assert.equal(data.progress.attended, 1)
  assert.equal(data.progress.total, 2)
  assert.equal(data.progress.actualTotal, 2)
  assert.equal(data.monthCosts.court, 700000)
  assert.equal(data.monthCosts.courtSub, '2 thành viên cố định')
  assert.equal(data.monthCosts.ticketFund, 120000)
})

test('overview exposes a dynamic next-session label for the progress card', () => {
  const { buildPickleballOverviewData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'a',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'a', groupId: 'g1', name: 'An', memberType: 'fixed', isActive: true },
      { id: 'b', groupId: 'g1', name: 'Bình', memberType: 'fixed', isActive: true },
      { id: 'c', groupId: 'g1', name: 'Chi', memberType: 'fixed', isActive: true },
      { id: 'd', groupId: 'g1', name: 'Dung', memberType: 'fixed', isActive: true },
    ],
    pickle: {
      monthlyConfigs: [{ groupId: 'g1', yearMonth: '2026-05', courtFee: 0 }],
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-21', status: 'scheduled', timeRange: '19:00 – 22:00', attendees: ['a'] },
        { id: 's2', groupId: 'g1', date: '2026-05-22', status: 'scheduled', timeRange: '19:00 – 22:00', attendees: [] },
      ],
    },
    _allPickle: { sessions: [], externalTickets: [] },
  }

  const data = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'a', state.members)
  assert.equal(data.todaySession.statusLabel, 'Hôm nay')
  assert.equal(data.todaySession.timeRange, '19:00 – 22:00')

  state.pickle.sessions[0].date = '2026-05-22'
  const nextData = buildPickleballOverviewData(state, state.pickle, state._allPickle, 'a', state.members)
  assert.equal(nextData.todaySession.statusLabel, 'Buổi tới')
})
