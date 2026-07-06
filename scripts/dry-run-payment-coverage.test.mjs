import assert from 'node:assert/strict'
import test from 'node:test'
import { inferLegacyPaymentCoverage } from './dry-run-payment-coverage.mjs'

test('infers coveredMembers from actor profile without merging member ids', () => {
  const notification = {
    id: 'pay-1',
    actor_member_id: 'member-pickle',
    group_id: 'group-pickle',
    metadata: {
      status: 'confirmed',
      amount: 794590,
      memberName: 'Lê Tuấn',
      monthLabel: 'Tháng 5 · 2026',
    },
  }
  const members = [
    { id: 'member-pickle', profile_id: 'profile-tuan', group_id: 'group-pickle', is_active: true },
    { id: 'member-expense', profile_id: 'profile-tuan', group_id: 'group-expense', is_active: true },
  ]
  const profiles = [{ id: 'profile-tuan', name: 'Lê Tuấn' }]

  const result = inferLegacyPaymentCoverage(notification, { members, profiles })

  assert.equal(result.confidence, 'high')
  assert.deepEqual(result.coveredMembers, [{
    profileId: 'profile-tuan',
    memberId: 'member-pickle',
    memberIds: ['member-pickle', 'member-expense'],
    name: 'Lê Tuấn',
    amount: 794590,
  }])
})

test('flags name mismatch for manual review', () => {
  const notification = {
    id: 'pay-2',
    actor_member_id: 'member-a',
    metadata: { status: 'confirmed', amount: 1000, memberName: 'Người Khác' },
  }
  const members = [{ id: 'member-a', profile_id: 'profile-a', group_id: 'group-a', is_active: true }]
  const profiles = [{ id: 'profile-a', name: 'Lê Tuấn' }]

  const result = inferLegacyPaymentCoverage(notification, { members, profiles })

  assert.equal(result.confidence, 'review')
  assert.equal(result.reason, 'actor profile found, name mismatch')
})
