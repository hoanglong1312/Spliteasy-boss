import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')
const paymentSettlementsMigrationSource = readFileSync(new URL('../supabase/migrations/20260709000001_record_payment_settlements.sql', import.meta.url), 'utf8')
const paymentSettlementsProfileMigrationSource = readFileSync(new URL('../supabase/migrations/20260709000002_fix_payment_settlement_treasurer_profile.sql', import.meta.url), 'utf8')

test('store owns toast state and hide lifecycle', () => {
  assert.match(storeSource, /const TOAST_HIDE_DELAY_MS = 3000/)
  assert.match(storeSource, /toast:\s*\{\s*visible:\s*false,\s*message:\s*''\s*\}/)
  assert.match(storeSource, /const toastTimerRef = useRef\(null\)/)
  assert.match(storeSource, /case 'SHOW_TOAST':\s*\{/)
  assert.match(storeSource, /case 'HIDE_TOAST':\s*\{/)
  assert.match(storeSource, /setTimeout\(\(\) => \{\s*toastTimerRef\.current = null\s*dispatch\(\{ type: 'HIDE_TOAST' \}\)\s*\}, TOAST_HIDE_DELAY_MS\)/)
  assert.match(storeSource, /if \(toastTimerRef\.current\) clearTimeout\(toastTimerRef\.current\)/)
})

test('store subscribes to expenses postgres changes and ignores current user events', () => {
  assert.match(storeSource, /export function getExpenseRealtimeAuthorId\(row = \{\}\) \{/)
  assert.match(storeSource, /return row\.created_by \?\? row\.submitted_by_member_id \?\? null/)
  assert.match(storeSource, /export function isExpenseRealtimeFromCurrentUser\(payload, currentUserId\) \{/)
  assert.match(storeSource, /\[payload\?\.new, payload\?\.old\]\.some\(row => String\(getExpenseRealtimeAuthorId\(row\)\) === String\(currentUserId\)\)/)
  assert.match(storeSource, /export function expenseRealtimeToastMessage\(payload, members = \[\]\) \{/)
  assert.match(storeSource, /case 'INSERT':[\s\S]*vừa thêm chi tiêu mới/)
  assert.match(storeSource, /case 'UPDATE':[\s\S]*Chi tiêu vừa được cập nhật/)
  assert.match(storeSource, /case 'DELETE':[\s\S]*Một chi tiêu đã bị xóa/)
  assert.match(storeSource, /channel\('expenses-realtime'\)/)
  assert.match(storeSource, /\.on\('postgres_changes', \{\s*event: '\*',\s*schema: 'public',\s*table: 'expenses',\s*\}/)
  assert.match(storeSource, /if \(isExpenseRealtimeFromCurrentUser\(payload, stateRef\.current\.currentUserId\)\) return/)
  assert.match(storeSource, /scheduleRefresh\(\)/)
  assert.match(storeSource, /dispatch\(\{ type: 'SHOW_TOAST', message \}\)/)
  assert.doesNotMatch(storeSource, /\.on\('broadcast', \{ event: 'data_changed' \}/)
})

test('store fetches and normalizes pickleball individual tickets', () => {
  assert.match(storeSource, /ptR/)
  assert.match(storeSource, /sb\.from\('pickleball_tickets'\)\.select\('\*'\)\.order\('session_date', \{ ascending: true \}\)/)
  assert.match(storeSource, /if \(ptR\.error\) console\.warn\('\[store\] pickleball_tickets query failed:', ptR\.error\)/)
  assert.match(storeSource, /pickleballTickets:\s*ptR\.data \|\| \[\]/)
  assert.match(storeSource, /pickleballTickets = \[\]/)
  assert.match(storeSource, /const normalTickets = safeArray\(pickleballTickets\)\.map\(ticket => \(\{/)
  assert.match(storeSource, /sessionDate: ticket\.session_date/)
  assert.match(storeSource, /memberIds: safeArray\(ticket\.member_ids\)/)
  assert.match(storeSource, /advancerId: ticket\.advancer_id/)
  assert.match(storeSource, /status: ticket\.status \|\| \(ticket\.advancer_id \? 'unpaid' : 'team_fund'\)/)
  assert.match(storeSource, /externalTickets: normalTickets/)
  assert.match(storeSource, /externalTickets: safeArray\(source\.externalTickets\)\.filter/)
})

test('store fetches venue owner payments and persists team-fund owner actions', () => {
  assert.match(storeSource, /popR/)
  assert.match(storeSource, /sb\.from\('pickleball_owner_payments'\)\.select\('\*'\)\.order\('paid_at', \{ ascending: false \}\)/)
  assert.match(storeSource, /if \(popR\.error\) console\.warn\('\[store\] pickleball_owner_payments query failed:', popR\.error\)/)
  assert.match(storeSource, /pickleballOwnerPayments:\s*popR\.data \|\| \[\]/)
  assert.match(storeSource, /venueOwnerName: group\.venue_owner_name/)
  assert.match(storeSource, /venueBankName: group\.venue_bank_name/)
  assert.match(storeSource, /venueBankAccount: group\.venue_bank_account/)
  assert.match(storeSource, /const normalOwnerPayments = safeArray\(pickleballOwnerPayments\)\.map\(payment => \(\{/)
  assert.match(storeSource, /ownerPayments: normalOwnerPayments/)
  assert.match(storeSource, /ownerPayments: safeArray\(source\.ownerPayments\)\.filter/)
  assert.match(storeSource, /case 'SAVE_VENUE_OWNER_BANK': \{/)
  assert.match(storeSource, /\.from\('groups'\)\.update\(\{[\s\S]*venue_owner_name: action\.venueOwnerName/)
  assert.match(storeSource, /case 'ADD_PICKLEBALL_OWNER_PAYMENT': \{/)
  assert.match(storeSource, /\.from\('pickleball_owner_payments'\)\s*\.insert\(\{/)
  assert.match(storeSource, /bank_snapshot: action\.bankSnapshot \|\| \{\}/)
  assert.match(storeSource, /items: safeArray\(action\.items\)/)
  assert.match(storeSource, /case 'UNMARK_PICKLEBALL_OWNER_PAYMENT_ITEM': \{/)
  assert.match(storeSource, /const nextItems = currentItems\.filter/)
  assert.match(storeSource, /\.from\('pickleball_owner_payments'\)\s*\.update\(\{/)
  assert.match(storeSource, /total_amount: nextItems\.reduce/)
})

test('store fetches payment notifications and persists treasurer review actions', () => {
  assert.match(storeSource, /nR/)
  assert.match(storeSource, /sb\.rpc\('list_visible_notifications'\)/)
  assert.match(storeSource, /if \(nR\.error\) console\.warn\('\[store\] notifications query failed:', nR\.error\)/)
  assert.match(storeSource, /notifications:\s*nR\.data \|\| \[\]/)
  assert.match(storeSource, /const normalNotifications = safeArray\(notifications\)\.map\(notification => \(\{/)
  assert.match(storeSource, /notifications: normalNotifications/)
  assert.match(storeSource, /case 'SEND_PAYMENT_NOTIFICATION': \{/)
  assert.match(storeSource, /\.rpc\('submit_payment_notification'/)
  assert.match(storeSource, /p_target_member_id: targetMemberId \|\| null/)
  assert.match(storeSource, /p_covered_sources: metadata\.coveredSources/)
  const reviewBlock = storeSource.slice(
    storeSource.indexOf("case 'REVIEW_PAYMENT_NOTIFICATION':"),
    storeSource.indexOf("case 'MARK_NOTIFICATIONS_READ':")
  )
  assert.match(reviewBlock, /case 'REVIEW_PAYMENT_NOTIFICATION': \{/)
  assert.match(reviewBlock, /metadata: \{ \.\.\.notification\.metadata, status: action\.status \}/)
  assert.match(reviewBlock, /is_read: true/)
  assert.doesNotMatch(reviewBlock, /\.eq\('member_id', state\.currentUserId\)/)
})

test('treasurer payment confirmation records settled source months', () => {
  const match = storeSource.match(/case 'TREASURER_CONFIRM_PAYMENT': \{[\s\S]*?\n      \}/)
  assert.ok(match, 'TREASURER_CONFIRM_PAYMENT case is available')
  const source = match[0]

  assert.match(source, /const coveredSources = safeArray\(action\.coveredSources\)/)
  assert.match(source, /\.rpc\('treasurer_confirm_payment'/)
  assert.match(source, /p_covered_sources: coveredSources/)
  assert.match(source, /\.rpc\('record_member_month_payment_settlements'/)
  assert.match(source, /p_treasurer_member_id: state\.currentUserId/)
  assert.match(source, /p_covered_sources: coveredSources/)
})

test('payment settlement migration records and backfills confirmed source months', () => {
  assert.match(paymentSettlementsMigrationSource, /create or replace function public\.record_member_month_payment_settlements/)
  assert.match(paymentSettlementsMigrationSource, /insert into public\.member_month_settlements/)
  assert.match(paymentSettlementsMigrationSource, /jsonb_array_elements\(coalesce\(n\.metadata->'coveredSources'/)
  assert.match(paymentSettlementsMigrationSource, /lower\(coalesce\(n\.metadata->>'status', ''\)\) = 'confirmed'/)
  assert.match(paymentSettlementsMigrationSource, /on conflict \(member_id, month, group_id\) do nothing/)
})

test('payment settlement rpc resolves treasurer by profile for each source group', () => {
  assert.match(paymentSettlementsProfileMigrationSource, /v_treasurer_profile_id uuid/)
  assert.match(paymentSettlementsProfileMigrationSource, /v_settled_by_member_id uuid/)
  assert.match(paymentSettlementsProfileMigrationSource, /select profile_id into v_treasurer_profile_id/)
  assert.match(paymentSettlementsProfileMigrationSource, /profile_id = v_treasurer_profile_id/)
  assert.match(paymentSettlementsProfileMigrationSource, /v_settled_by_member_id/)
  assert.match(paymentSettlementsProfileMigrationSource, /left join public\.members actor_member/)
  assert.match(paymentSettlementsProfileMigrationSource, /treasurer_by_profile\.id as settled_by_member_id/)
})

test('monthly pickleball config save persists schedule time aliases', () => {
  const match = storeSource.match(/case 'SAVE_PICKLEBALL_MONTHLY_CONFIG': \{[\s\S]*?\n      \}/)
  assert.ok(match, 'SAVE_PICKLEBALL_MONTHLY_CONFIG case is available')
  const source = match[0]

  assert.match(source, /if \('scheduleTime' in action \|\| 'schedule_time' in action \|\| 'timeRange' in action\) \{/)
  assert.match(source, /row\.schedule_time = action\.scheduleTime \?\? action\.schedule_time \?\? action\.timeRange \?\? null/)
})

test('monthly pickleball config normalizes and saves fixed member snapshots', () => {
  assert.match(storeSource, /fixedMemberIds: safeArray\(config\.fixed_member_ids \?\? config\.fixedMemberIds\)/)
  assert.match(storeSource, /fixed_member_ids: safeArray\(config\.fixed_member_ids \?\? config\.fixedMemberIds\)/)

  const match = storeSource.match(/case 'SAVE_PICKLEBALL_MONTHLY_CONFIG': \{[\s\S]*?\n      \}/)
  assert.ok(match, 'SAVE_PICKLEBALL_MONTHLY_CONFIG case is available')
  const source = match[0]

  assert.match(source, /if \('fixedMemberIds' in action \|\| 'fixed_member_ids' in action\) \{/)
  assert.match(source, /row\.fixed_member_ids = safeArray\(action\.fixedMemberIds \?\? action\.fixed_member_ids\)/)
})

test('monthly pickleball config save can skip existing rows', () => {
  const match = storeSource.match(/case 'SAVE_PICKLEBALL_MONTHLY_CONFIG': \{[\s\S]*?\n      \}/)
  assert.ok(match, 'SAVE_PICKLEBALL_MONTHLY_CONFIG case is available')
  const source = match[0]

  assert.match(source, /ignoreDuplicates: action\.skipIfExists === true/)
  assert.match(source, /action\.skipIfExists === true \? await query\.maybeSingle\(\) : await query\.single\(\)/)
})
