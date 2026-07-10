import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLinkedMigrationSql,
  enrichPayableItemDates,
  isLegacyConfirmedPayment,
  mapLegacyPaymentToCoveredItems,
  mapLegacyPaymentsToCoveredItems,
  parseArgs,
} from './dry-run-payment-coverage.mjs'

const notification = {
  id: 'payment-1',
  type: 'payment_submitted',
  actor_member_id: 'member-tuan',
  metadata: {
    status: 'confirmed',
    amount: 60000,
    coveredMembers: [{ profileId: 'profile-tuan', memberId: 'member-tuan' }],
    coveredSources: [{
      sourceType: 'group',
      sourceId: 'group-vk',
      memberId: 'member-tuan',
      profileId: 'profile-tuan',
      month: '2026-07',
      amount: -60000,
    }],
  },
}

const payableItems = [
  {
    payableItemKey: 'expense:water-1|member:member-tuan|profile:profile-tuan|month:2026-07',
    sourceType: 'group',
    sourceId: 'group-vk',
    memberId: 'member-tuan',
    profileId: 'profile-tuan',
    month: '2026-07',
    amount: -50000,
  },
  {
    payableItemKey: 'expense:water-2|member:member-tuan|profile:profile-tuan|month:2026-07',
    sourceType: 'group',
    sourceId: 'group-vk',
    memberId: 'member-tuan',
    profileId: 'profile-tuan',
    month: '2026-07',
    amount: -10000,
  },
  {
    payableItemKey: 'expense:water-trang|member:member-trang|profile:profile-trang|month:2026-07',
    sourceType: 'group',
    sourceId: 'group-vk',
    memberId: 'member-trang',
    profileId: 'profile-trang',
    month: '2026-07',
    amount: -60000,
  },
  {
    payableItemKey: 'expense:water-june|member:member-tuan|profile:profile-tuan|month:2026-06',
    sourceType: 'group',
    sourceId: 'group-vk',
    memberId: 'member-tuan',
    profileId: 'profile-tuan',
    month: '2026-06',
    amount: -60000,
  },
]

test('confirmed payment with coveredSources but no coveredItems is legacy', () => {
  assert.equal(isLegacyConfirmedPayment(notification), true)
  assert.equal(isLegacyConfirmedPayment({
    ...notification,
    metadata: { ...notification.metadata, coveredItems: [payableItems[0]] },
  }), false)
})

test('maps only exact member profile source and month items', () => {
  const result = mapLegacyPaymentToCoveredItems(notification, payableItems)

  assert.equal(result.status, 'mapped')
  assert.equal(result.expectedAmount, 60000)
  assert.equal(result.mappedAmount, 60000)
  assert.deepEqual(result.coveredItems, payableItems.slice(0, 2))
  assert.deepEqual(notification.metadata.coveredMembers, [{ profileId: 'profile-tuan', memberId: 'member-tuan' }])
  assert.equal(notification.metadata.coveredItems, undefined)
})

test('blocks when canonical items differ by one đồng', () => {
  const result = mapLegacyPaymentToCoveredItems({
    ...notification,
    metadata: {
      ...notification.metadata,
      amount: 60001,
      coveredSources: [{
        ...notification.metadata.coveredSources[0],
        amount: -60001,
      }],
    },
  }, payableItems)

  assert.equal(result.status, 'blocked')
  assert.match(result.reason, /1 đ/)
  assert.equal(result.expectedAmount, 60001)
  assert.equal(result.mappedAmount, 60000)
})

test('blocks when payment amount differs from covered source total', () => {
  const result = mapLegacyPaymentToCoveredItems({
    ...notification,
    metadata: { ...notification.metadata, amount: 59999 },
  }, payableItems)

  assert.equal(result.status, 'blocked')
  assert.match(result.reason, /payment amount/)
})

test('maps signed debt and credit to net payment amount', () => {
  const result = mapLegacyPaymentToCoveredItems({
    ...notification,
    metadata: {
      ...notification.metadata,
      amount: 425816,
      coveredSources: [
        { ...notification.metadata.coveredSources[0], month: '2026-06', amount: -658166 },
        { ...notification.metadata.coveredSources[0], month: '2026-07', amount: 232350 },
      ],
    },
  }, [
    { ...payableItems[0], month: '2026-06', amount: -658166 },
    { ...payableItems[1], month: '2026-07', amount: 232350 },
  ])

  assert.equal(result.status, 'mapped')
  assert.equal(result.expectedAmount, 425816)
  assert.equal(result.mappedAmount, 425816)
  assert.equal(result.coveredItems.length, 2)
})

test('does not cover payable item created after payment confirmation', () => {
  const result = mapLegacyPaymentToCoveredItems({
    ...notification,
    created_at: '2026-07-09T15:00:00Z',
    metadata: {
      ...notification.metadata,
      amount: 50000,
      coveredSources: [{ ...notification.metadata.coveredSources[0], amount: -50000 }],
    },
  }, [
    { ...payableItems[0], amount: -50000, eventDate: '2026-07-09T10:00:00Z' },
    { ...payableItems[1], amount: -50000, eventDate: '2026-07-10T10:00:00Z' },
  ])

  assert.equal(result.status, 'mapped')
  assert.deepEqual(result.coveredItems.map(item => item.payableItemKey), [payableItems[0].payableItemKey])
})

test('duplicate payment reuses mapping without consuming items twice', () => {
  const duplicate = {
    ...notification,
    id: 'payment-duplicate',
    created_at: '2026-07-09T15:00:07Z',
  }
  const rows = mapLegacyPaymentsToCoveredItems(
    [{ ...notification, created_at: '2026-07-09T15:00:00Z' }, duplicate],
    payableItems,
    { duplicateOfById: new Map([[duplicate.id, notification.id]]) },
  )

  assert.equal(rows[0].status, 'mapped')
  assert.equal(rows[1].status, 'mapped')
  assert.equal(rows[1].duplicateOf, notification.id)
  assert.deepEqual(rows[1].coveredItems, rows[0].coveredItems)
})

test('blocks when multiple payable item subsets match same source amount', () => {
  const result = mapLegacyPaymentToCoveredItems({
    ...notification,
    metadata: {
      ...notification.metadata,
      amount: 50000,
      coveredSources: [{ ...notification.metadata.coveredSources[0], amount: -50000 }],
    },
  }, [
    { ...payableItems[0], amount: -50000 },
    { ...payableItems[1], amount: -50000 },
  ])

  assert.equal(result.status, 'blocked')
  assert.match(result.reason, /ambiguous/)
  assert.deepEqual(result.coveredItems, [])
})

test('maps every source item when full source total matches despite zero-sum subsets', () => {
  const sourceItems = [
    { ...payableItems[0], amount: -50000 },
    { ...payableItems[1], amount: 10000 },
    {
      ...payableItems[1],
      payableItemKey: 'expense:water-3|member:member-tuan|profile:profile-tuan|month:2026-07',
      amount: -10000,
    },
  ]
  const result = mapLegacyPaymentToCoveredItems({
    ...notification,
    metadata: {
      ...notification.metadata,
      amount: 50000,
      coveredSources: [{ ...notification.metadata.coveredSources[0], amount: -50000 }],
    },
  }, sourceItems)

  assert.equal(result.status, 'mapped')
  assert.deepEqual(result.coveredItems, sourceItems)
})

test('enriches canonical items from pickleball_sessions date column', () => {
  const [item] = enrichPayableItemDates([{
    itemId: 'pickleball-session:session-1:water',
  }], {
    pickleball_sessions: [{ id: 'session-1', date: '2026-07-10' }],
  })

  assert.equal(item.eventDate, '2026-07-10')
})

test('apply requires linked transaction mode', () => {
  assert.throws(() => parseArgs(['--apply']), /--apply requires --linked/)
})

test('linked migration updates exact metadata inside one guarded transaction', () => {
  const row = {
    notification: {
      ...notification,
      metadata: { ...notification.metadata, memberName: "Tuấn O'Brien" },
    },
    coveredItems: payableItems.slice(0, 2),
  }
  const sql = buildLinkedMigrationSql([row])

  assert.match(sql, /^begin;/)
  assert.match(sql, /notification\.metadata is not distinct from migration\.original_metadata/)
  assert.match(sql, /Tuấn O''Brien/)
  assert.match(sql, /commit;\s*$/)
})
