import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')

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
