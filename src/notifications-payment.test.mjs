import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const notificationsSource = readFileSync(new URL('./screens/Notifications.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./screens/Home.jsx', import.meta.url), 'utf8')
const migrationSource = readFileSync(new URL('../supabase/migrations/20260528000002_payment_notifications.sql', import.meta.url), 'utf8')
const profileAwareMigrationSource = readFileSync(new URL('../supabase/migrations/20260528000005_profile_aware_payment_notifications.sql', import.meta.url), 'utf8')
const coveredSourcesMigrationSource = readFileSync(new URL('../supabase/migrations/20260529000001_payment_covered_sources.sql', import.meta.url), 'utf8')

function loadHomeBuilder() {
  const source = screenDataSource
    .replace(/import \{ useEffect, useMemo, useRef, useState \} from 'react'\n/, '')
    .replace(/import \{ useApp \} from '\.\.\/store\.jsx'\n/, '')
    .replace(/import \{[\s\S]*?\} from '\.\.\/data\.jsx'\n/, '')
    .replace('export function useScreenData', 'function useScreenData')
  const context = {
    Date,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${Number(value).toLocaleString('vi-VN')} ₫`,
    groupBalance: () => ({}),
    groupNet: (group, memberId) => Number(group?.netByMember?.[memberId]) || 0,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: groups => groups.flatMap(group => (group.expenses || []).map(expense => ({ ...expense, groupId: group.id, groupName: group.name }))),
  }
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildHomeData }`, context)
  return context.__builders.buildHomeData
}

function loadNotificationsBuilder() {
  const source = screenDataSource
    .replace(/import \{ useEffect, useMemo, useRef, useState \} from 'react'\n/, '')
    .replace(/import \{ useApp \} from '\.\.\/store\.jsx'\n/, '')
    .replace(/import \{[\s\S]*?\} from '\.\.\/data\.jsx'\n/, '')
    .replace('export function useScreenData', 'function useScreenData')
  const context = {
    Date,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${Number(value).toLocaleString('vi-VN')} ₫`,
    groupBalance: () => ({}),
    groupNet: () => 0,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: () => [],
  }
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildNotificationsData }`, context)
  return context.__builders.buildNotificationsData
}

test('payment confirmations are actionable from the notification bell', () => {
  assert.match(notificationsSource, /notif\.actions === 'paymentConfirmation'/)
  assert.match(notificationsSource, /onConfirmPayment=\{\(\) => onAction\?\.\('confirmPaymentNotice', n\)\}/)
  assert.match(notificationsSource, /onRejectPayment=\{\(\) => onAction\?\.\('rejectPaymentNotice', n\)\}/)
  assert.match(notificationsSource, />Đã nhận<\/button>/)
  assert.match(notificationsSource, />Chưa nhận<\/button>/)
  assert.match(notificationsSource, /function statusBadge\(status\) \{/)
  assert.match(notificationsSource, /Đã xác nhận/)
})

test('notification data maps payment_submitted rows to payment actions', () => {
  assert.match(screenDataSource, /const isPayment = type\.includes\('payment'\) \|\| type\.includes\('settlement'\)/)
  assert.match(screenDataSource, /const paymentStatus = String\(metadata\.status \|\| 'pending'\)\.toLowerCase\(\)/)
  assert.match(screenDataSource, /const paymentTitle = isOwnPayment/)
  assert.match(screenDataSource, /notification\?\.titleHtml \|\| notification\?\.title \|\| notification\?\.message/)
  assert.match(screenDataSource, /actions: isJoinRequest \? 'joinRequest' : isPendingPayment && canReviewPayment \? 'paymentConfirmation' : notification\?\.actions/)
  assert.match(screenDataSource, /Long đã xác nhận thanh toán/)
  assert.match(screenDataSource, /status: isPayment \? paymentStatus : notification\?\.status/)
})

test('payment review actions render only for treasurer notification viewers', () => {
  const buildNotificationsData = loadNotificationsBuilder()
  const notification = {
    id: 'pay-1',
    type: 'payment_submitted',
    actorMemberId: 'cuong-member',
    createdAt: '2026-05-28T12:00:00Z',
    metadata: { status: 'pending', amount: 1943229 },
  }
  const baseState = {
    currentUserId: 'cuong-member',
    currentUserName: 'Cường',
    members: [
      { id: 'cuong-member', name: 'Cường', role: 'member' },
      { id: 'long-member', name: 'Long', role: 'treasurer' },
    ],
    notifications: [notification],
  }

  const memberData = buildNotificationsData(baseState)
  const treasurerData = buildNotificationsData({ ...baseState, currentUserId: 'long-member', currentUserName: 'Long' })

  assert.equal(memberData.groups[0].items[0].actions, undefined)
  assert.equal(treasurerData.groups[0].items[0].actions, 'paymentConfirmation')
})

test('home payment summary exposes member payment confirmation status', () => {
  assert.match(screenDataSource, /const paymentNotice = latestPaymentNoticeForMember\(state, me, monthLabel\)/)
  assert.match(screenDataSource, /const paymentStatus = netBalance < 0 && coverage\.pendingAmount <= 0 \? '' : paymentNotice\?\.status \|\| ''/)
  assert.match(screenDataSource, /paymentStatus,/)
  assert.match(screenDataSource, /function latestPaymentNoticeForMember\(state, member, monthLabel\) \{/)
  assert.match(homeSource, /paymentStatus=\{d\.paymentSummary\?\.paymentStatus\}/)
  assert.match(homeSource, /paidConfirmed \? '✅ Đã thanh toán'/)
  assert.match(homeSource, /paymentPending \? '⏳ Chờ xác nhận'/)
  assert.match(homeSource, /if \(!paymentDisabled\) onOpenPayment\?\.\(\)/)
})

test('confirmed payments only cover the sources included when the member paid', () => {
  const buildHomeData = loadHomeBuilder()
  const state = {
    currentUserId: 'dai-member',
    currentUserName: 'Đại',
    members: [
      { id: 'dai-member', groupId: 'g1', profileId: 'dai-profile', name: 'Đại' },
      { id: 'long-member', groupId: 'g1', profileId: 'long-profile', name: 'Long', role: 'treasurer' },
    ],
    groups: [
      {
        id: 'g1',
        name: 'Lấy vk để trưởng thành',
        members: ['dai-member', 'long-member'],
        netByMember: { 'dai-member': -894479, 'long-member': 894479 },
        expenses: [
          { id: 'paid-before-28', date: '2026-05-26', title: 'Cuốn Phương Nam', amount: 1584000, paidBy: 'long-member', participants: ['dai-member', 'long-member'], status: 'approved' },
          { id: 'new-after-28', date: '2026-05-29', title: 'Phát sinh mới', amount: 120000, paidBy: 'long-member', participants: ['dai-member'], status: 'approved' },
        ],
      },
    ],
    notifications: [
      {
        id: 'notice-1',
        type: 'payment_submitted',
        actorMemberId: 'dai-member',
        createdAt: '2026-05-28T12:00:00Z',
        metadata: {
          status: 'confirmed',
          amount: 774479,
          monthLabel: 'Tháng 5 · 2026',
          coveredSources: [
            { sourceId: 'g1', sourceType: 'group', sourceLabel: 'Lấy vk để trưởng thành', amount: -774479 },
          ],
        },
      },
    ],
    pickle: { sessions: [] },
    _allPickle: { sessions: [] },
  }

  const data = buildHomeData(state, 'dai-member', state.members, state.groups, state.pickle, state, '2026-05')

  assert.equal(data.totalBalance, -120000)
  assert.equal(data.paymentSummary.netBalance, -120000)
  assert.equal(data.paymentSummary.paidAmount, 774479)
  assert.equal(data.paymentSummary.paymentStatus, '')
  assert.equal(data.sourceBreakdown[0].amount, -120000)
})

test('home exposes a treasurer payment management zone with view and delete actions', () => {
  assert.match(screenDataSource, /paymentRecords: buildPaymentManagementRecords\(state, me, today\)/)
  assert.match(screenDataSource, /function buildPaymentManagementRecords\(state, currentMember, monthDate\) \{/)
  assert.match(screenDataSource, /String\(metadata\.status \|\| 'pending'\) !== 'deleted'/)
  assert.match(homeSource, /<PaymentManagementZone records=\{d\.paymentRecords \|\| \[\]\} onAction=\{onAction\} \/>/)
  assert.match(homeSource, /function PaymentManagementZone\(\{ records, onAction \}\)/)
  assert.match(homeSource, /onAction\?\.\('deletePaymentNotice', record\)/)
  assert.match(homeSource, /onAction\?\.\('viewPaymentNotice', record\)/)
})

test('home pending payment approvals render only for Long or payment reviewers', () => {
  assert.match(screenDataSource, /function buildPendingPaymentConfirmations\(state\) \{/)
  assert.match(screenDataSource, /const canReviewPayment = \['treasurer', 'admin', 'owner'\]\.includes/)
  assert.match(screenDataSource, /currentName\.includes\('long'\)/)
  assert.match(screenDataSource, /if \(!canReviewPayment\) return \[\]/)
})

test('payment notification migration allows payment_submitted inserts and review updates', () => {
  assert.match(migrationSource, /payment_submitted/)
  assert.match(migrationSource, /notifications_insert_payment_submitted/)
  assert.match(migrationSource, /DROP CONSTRAINT IF EXISTS notifications_type_check/)
  assert.match(migrationSource, /type IN \([\s\S]*'payment_submitted'/)
})

test('payment notification stores covered sources for partial-month settlement', () => {
  assert.match(homeSource, /coveredSources/)
  assert.match(screenDataSource, /function paymentCoverageForMember\(state, member, monthLabel, sourceBreakdown\)/)
  assert.match(screenDataSource, /function applyConfirmedPaymentCoverage\(sourceBreakdown, confirmedSources\)/)
  assert.match(screenDataSource, /metadata\?\.coveredSources \|\| metadata\?\.covered_sources/)
  assert.match(coveredSourcesMigrationSource, /p_covered_sources jsonb DEFAULT '\[\]'::jsonb/)
  assert.match(coveredSourcesMigrationSource, /'coveredSources', COALESCE\(p_covered_sources, '\[\]'::jsonb\)/)
})

test('payment notification policies are profile-aware for Long across groups', () => {
  assert.match(profileAwareMigrationSource, /CREATE OR REPLACE FUNCTION public\.get_current_member_id/)
  assert.match(profileAwareMigrationSource, /extensions\.digest\(raw_token, 'sha256'\)/)
  assert.match(profileAwareMigrationSource, /is_same_profile_member/)
  assert.match(profileAwareMigrationSource, /CREATE OR REPLACE FUNCTION public.submit_payment_notification/)
  assert.match(profileAwareMigrationSource, /SECURITY DEFINER/)
  assert.match(profileAwareMigrationSource, /type, ref_type, message, metadata/)
  assert.match(profileAwareMigrationSource, /is_payment_notification_reviewer/)
  assert.match(profileAwareMigrationSource, /role IN \('treasurer', 'admin', 'owner'\)/)
  assert.match(profileAwareMigrationSource, /lower\(current_member\.name\) LIKE '%long%'/)
  assert.match(profileAwareMigrationSource, /is_active_member_session/)
  assert.match(profileAwareMigrationSource, /CREATE OR REPLACE FUNCTION public\.list_visible_notifications/)
  assert.match(profileAwareMigrationSource, /RETURNS SETOF public\.notifications/)
  assert.match(profileAwareMigrationSource, /DROP POLICY IF EXISTS notifications_select/)
  assert.match(profileAwareMigrationSource, /CREATE POLICY notifications_select[\s\S]*public\.is_payment_notification_reviewer\(type\)/)
  assert.match(profileAwareMigrationSource, /type = 'payment_submitted' AND public\.is_active_member_session\(\)/)
  assert.match(profileAwareMigrationSource, /DROP POLICY IF EXISTS notifications_update/)
  assert.match(profileAwareMigrationSource, /CREATE POLICY notifications_update[\s\S]*public\.is_payment_notification_reviewer\(type\)/)
  assert.match(profileAwareMigrationSource, /notifications_insert_payment_submitted/)
})
