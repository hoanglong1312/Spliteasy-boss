import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const primitivesSource = readFileSync(new URL('./primitives.jsx', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./screens/Home.jsx', import.meta.url), 'utf8')

test('small mobile safe-bottom uses the device safe-area inset', () => {
  assert.match(indexSource, /--safe-bottom: env\(safe-area-inset-bottom\);/)
  assert.doesNotMatch(indexSource, /--safe-bottom: max\(env\(safe-area-inset-bottom\), 28px\)/)
})

test('paid rows use isPaid flag not approval status', () => {
  assert.match(homeSource, /tx\.isPaid/)
  assert.match(homeSource, /rgba\(52,211,153,0\.07\)/)
  assert.match(homeSource, /Đã thanh toán/)
  assert.doesNotMatch(homeSource, /transactionStatus\(tx\) === 'approved' && tx\.status !== 'pending' && !tx\.type/)
})

test('inactive tab labels use readable secondary contrast', () => {
  assert.match(primitivesSource, /color: active \? colors\.brandLight : colors\.textSecondary/)
  assert.match(primitivesSource, /opacity: active \? 1 : 0\.55/)
})

test('home header no longer renders the notification bell icon button', () => {
  assert.doesNotMatch(homeSource, /import \{ Bell \} from '@phosphor-icons\/react'/)
  assert.doesNotMatch(homeSource, /onAction\?\.\('notifications'\)/)
  assert.doesNotMatch(homeSource, /<Bell size=\{18\} weight="fill" \/>/)
})

test('previous month unpaid notice is visually prominent', () => {
  assert.match(homeSource, /background: 'rgba\(251,191,36,0\.14\)'/)
  assert.match(homeSource, /border: '1px solid rgba\(251,191,36,0\.4\)'/)
  assert.match(homeSource, /borderLeft: '4px solid #fbbf24'/)
  assert.match(homeSource, /⚠️ \{label\} chưa trả ·/)
  assert.match(homeSource, /color: '#fbbf24'/)
  assert.match(homeSource, /textShadow: '0 0 8px rgba\(251,191,36,0\.5\)'/)
  assert.match(homeSource, /fontWeight: 900, color: '#fca5a5'/)
  assert.match(homeSource, /background: 'rgba\(251,191,36,0\.25\)'/)
  assert.match(homeSource, /border: '1px solid rgba\(251,191,36,0\.5\)'/)
  assert.match(homeSource, /fontWeight: 900,\n\s+fontFamily: 'inherit'/)
})
