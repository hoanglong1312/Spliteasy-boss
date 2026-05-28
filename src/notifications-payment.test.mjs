import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const notificationsSource = readFileSync(new URL('./screens/Notifications.jsx', import.meta.url), 'utf8')
const screenDataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const migrationSource = readFileSync(new URL('../supabase/migrations/20260528000002_payment_notifications.sql', import.meta.url), 'utf8')
const profileAwareMigrationSource = readFileSync(new URL('../supabase/migrations/20260528000005_profile_aware_payment_notifications.sql', import.meta.url), 'utf8')

test('payment confirmations are actionable from the notification bell', () => {
  assert.match(notificationsSource, /notif\.actions === 'paymentConfirmation'/)
  assert.match(notificationsSource, /onConfirmPayment=\{\(\) => onAction\?\.\('confirmPaymentNotice', n\)\}/)
  assert.match(notificationsSource, /onRejectPayment=\{\(\) => onAction\?\.\('rejectPaymentNotice', n\)\}/)
  assert.match(notificationsSource, />Đã nhận<\/button>/)
  assert.match(notificationsSource, />Chưa nhận<\/button>/)
})

test('notification data maps payment_submitted rows to payment actions', () => {
  assert.match(screenDataSource, /const isPayment = type\.includes\('payment'\) \|\| type\.includes\('settlement'\)/)
  assert.match(screenDataSource, /title: notification\?\.titleHtml \|\| notification\?\.title \|\| notification\?\.message/)
  assert.match(screenDataSource, /actions: isJoinRequest \? 'joinRequest' : isPendingPayment \? 'paymentConfirmation' : notification\?\.actions/)
})

test('payment notification migration allows payment_submitted inserts and review updates', () => {
  assert.match(migrationSource, /payment_submitted/)
  assert.match(migrationSource, /notifications_insert_payment_submitted/)
  assert.match(migrationSource, /DROP CONSTRAINT IF EXISTS notifications_type_check/)
  assert.match(migrationSource, /type IN \([\s\S]*'payment_submitted'/)
})

test('payment notification policies are profile-aware for Long across groups', () => {
  assert.match(profileAwareMigrationSource, /is_same_profile_member/)
  assert.match(profileAwareMigrationSource, /DROP POLICY IF EXISTS notifications_select/)
  assert.match(profileAwareMigrationSource, /CREATE POLICY notifications_select[\s\S]*public\.is_same_profile_member\(member_id\)/)
  assert.match(profileAwareMigrationSource, /DROP POLICY IF EXISTS notifications_update/)
  assert.match(profileAwareMigrationSource, /CREATE POLICY notifications_update[\s\S]*public\.is_same_profile_member\(member_id\)/)
  assert.match(profileAwareMigrationSource, /notifications_insert_payment_submitted/)
})
