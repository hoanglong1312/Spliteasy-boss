import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8')

test('PinEntryScreen uses a controlled numeric password input instead of a numpad', () => {
  assert.match(appSource, /<input[\s\S]*type="password"[\s\S]*inputMode="numeric"[\s\S]*maxLength=\{6\}/)
  assert.match(appSource, /value=\{value\}/)
  assert.match(appSource, /onChange=\{e => onChange\(e\.target\.value\.replace\(\/\\D\/g, ''\)\.slice\(0, 6\)\)\}/)
  assert.match(appSource, /onKeyDown=\{e => e\.key === 'Enter' && onSubmit\(\)\}/)
  assert.doesNotMatch(appSource, /\[1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7,\s*8,\s*9,\s*'',\s*0,\s*'⌫'\]/)
  assert.doesNotMatch(appSource, /isBackspace/)
})

test('AppV2 renders the store toast as a fixed bottom overlay', () => {
  assert.match(appSource, /<ToastOverlay toast=\{state\.toast\} \/>/)
  assert.match(appSource, /function ToastOverlay\(\{ toast \}\) \{/)
  assert.match(appSource, /bottom: 80/)
  assert.match(appSource, /left: '50%'/)
  assert.match(appSource, /transform: 'translateX\(-50%\)'/)
  assert.match(appSource, /background: '#1e293b'/)
  assert.match(appSource, /color: '#f8fafc'/)
  assert.match(appSource, /padding: '12px 20px'/)
  assert.match(appSource, /borderRadius: 8/)
  assert.match(appSource, /transition: 'opacity 200ms ease'/)
  assert.match(appSource, /opacity: visible \? 1 : 0/)
})

test('main renders AppProvider directly without the legacy toast bridge', () => {
  assert.doesNotMatch(mainSource, /ToastProvider/)
  assert.doesNotMatch(mainSource, /useToast/)
  assert.doesNotMatch(mainSource, /onToast=\{addToast\}/)
  assert.match(mainSource, /<AppProvider>\s*<AppV2 \/>\s*<\/AppProvider>/)
})
