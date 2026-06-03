import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const authSource = readFileSync(new URL('./auth.js', import.meta.url), 'utf8')

test('auth exposes profile PIN RPC helpers keyed by profile_id', () => {
  assert.match(authSource, /export async function verifyProfilePin\(profileId, pin\) \{/)
  assert.match(authSource, /if \(!profileId \|\| !pin\) return false/)
  assert.match(authSource, /\.rpc\('verify_profile_pin', \{ p_profile_id: profileId, p_pin: pin \}\)/)
  assert.match(authSource, /export async function profilePinRequired\(profileId\) \{/)
  assert.match(authSource, /if \(!profileId\) return false/)
  assert.match(authSource, /\.rpc\('profile_pin_required', \{ p_profile_id: profileId \}\)/)
})
