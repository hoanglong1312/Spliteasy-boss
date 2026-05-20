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
