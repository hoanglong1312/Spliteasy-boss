#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { promisify } from 'node:util'
import { createServer } from 'vite'

const root = process.cwd()
const execFileAsync = promisify(execFile)
const SNAPSHOT_TABLES = [
  'expense_participants',
  'expenses',
  'groups',
  'members',
  'notifications',
  'period_payments',
  'pickle_attendees',
  'pickle_configs',
  'pickle_sessions',
  'pickleball_attendance',
  'pickleball_monthly_config',
  'pickleball_owner_payments',
  'pickleball_session_items',
  'pickleball_sessions',
  'pickleball_tickets',
  'profiles',
  'settlement_periods',
  'settlements',
]
const DUPLICATE_OF_BY_ID = new Map([
  ['8859fcfa-8f2d-4dd9-8081-c6498154332d', '35ba5aa3-5be8-4e65-8ffa-38101aa554d3'],
])

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
      }),
  )
}

async function loadEnv() {
  const env = {}
  for (const file of ['.env', '.env.local']) {
    const fullPath = path.join(root, file)
    if (existsSync(fullPath)) Object.assign(env, parseEnv(await readFile(fullPath, 'utf8')))
  }
  return { ...env, ...process.env }
}

function metadataOf(notification) {
  return notification.metadata || {}
}

export function isLegacyConfirmedPayment(notification) {
  const metadata = metadataOf(notification)
  return String(notification.type || '').toLowerCase().includes('payment') &&
    String(metadata.status || 'pending').toLowerCase() === 'confirmed' &&
    (metadata.coveredSources || metadata.covered_sources || []).length > 0 &&
    (metadata.coveredItems || metadata.covered_items || []).length === 0
}

function coverageKey(row) {
  return [
    row?.memberId || row?.member_id || '',
    row?.profileId || row?.profile_id || '',
    row?.sourceType || row?.source_type || '',
    row?.sourceId || row?.source_id || '',
    row?.month || row?.yearMonth || row?.year_month || '',
  ].map(String).join('|')
}

function payableItemKey(item) {
  return String(item?.payableItemKey || item?.payable_item_key || '')
}

function itemEventTime(item) {
  const explicit = item?.eventDate || item?.event_date || item?.date ||
    item?.expenseDate || item?.expense_date || item?.sessionDate || item?.session_date ||
    item?.ticketDate || item?.ticket_date
  const fallback = (item?.month || item?.yearMonth || item?.year_month)
    ? `${item.month || item.yearMonth || item.year_month}-01T00:00:00Z`
    : ''
  const value = Date.parse(explicit || fallback)
  return Number.isFinite(value) ? value : null
}

function uniqueExactSubset(items, targetAmount) {
  const states = new Map([[0, { count: 1, items: [] }]])
  for (const item of items) {
    const amount = Math.round(Number(item.amount) || 0)
    if (!amount) continue
    for (const [sum, state] of [...states.entries()]) {
      const nextSum = sum + amount
      const existing = states.get(nextSum)
      states.set(nextSum, {
        count: Math.min(2, (existing?.count || 0) + state.count),
        items: existing?.items || [...state.items, item],
      })
    }
  }
  return states.get(targetAmount) || { count: 0, items: [] }
}

export function mapLegacyPaymentToCoveredItems(notification, payableItems, options = {}) {
  const metadata = metadataOf(notification)
  const coveredSources = metadata.coveredSources || metadata.covered_sources || []
  const expectedAmount = Math.round(Math.abs(Number(metadata.amount) || 0))
  const sourceAmount = Math.abs(coveredSources.reduce((sum, source) => sum + Math.round(Number(source.amount) || 0), 0))
  if (sourceAmount !== expectedAmount) {
    return {
      status: 'blocked',
      reason: `payment amount ${expectedAmount} đ differs from covered sources ${sourceAmount} đ`,
      expectedAmount,
      mappedAmount: 0,
      coveredItems: [],
    }
  }

  const coveredItems = []
  const usedKeys = new Set(options.excludedItemKeys || [])
  const confirmedAt = Date.parse(notification.createdAt || notification.created_at || '')
  for (const source of coveredSources) {
    const expectedSourceAmount = Math.round(Number(source.amount) || 0)
    const seenKeys = new Set()
    const matches = payableItems.filter(item => {
      const key = payableItemKey(item)
      if (!key || seenKeys.has(key) || usedKeys.has(key) || coverageKey(item) !== coverageKey(source)) return false
      const eventTime = itemEventTime(item)
      if (Number.isFinite(confirmedAt) && eventTime != null && eventTime > confirmedAt) return false
      seenKeys.add(key)
      return true
    })
    const availableAmount = matches.reduce((sum, item) => sum + Math.round(Number(item.amount) || 0), 0)
    const match = availableAmount === expectedSourceAmount
      ? { count: 1, items: matches }
      : uniqueExactSubset(matches, expectedSourceAmount)
    if (match.count > 1) {
      return {
        status: 'blocked',
        reason: `source ${coverageKey(source)} is ambiguous`,
        expectedAmount,
        mappedAmount: Math.abs(expectedSourceAmount),
        coveredItems: [],
      }
    }
    if (match.count === 0) {
      return {
        status: 'blocked',
        reason: `source ${coverageKey(source)} differs by ${Math.abs(expectedSourceAmount - availableAmount)} đ`,
        expectedAmount,
        mappedAmount: Math.abs(availableAmount),
        coveredItems: [],
      }
    }
    match.items.forEach(item => usedKeys.add(payableItemKey(item)))
    coveredItems.push(...match.items)
  }

  const mappedAmount = Math.abs(coveredItems.reduce((sum, item) => sum + Math.round(Number(item.amount) || 0), 0))
  return {
    status: mappedAmount === expectedAmount ? 'mapped' : 'blocked',
    reason: mappedAmount === expectedAmount ? 'exact match' : `payment differs by ${Math.abs(expectedAmount - mappedAmount)} đ`,
    expectedAmount,
    mappedAmount,
    coveredItems,
  }
}

export function mapLegacyPaymentsToCoveredItems(notifications, payableItems, options = {}) {
  const duplicateOfById = options.duplicateOfById || new Map()
  const rowsById = new Map()
  const consumedItemKeys = new Set()
  const sorted = [...notifications].sort((a, b) => (
    Date.parse(a.createdAt || a.created_at || '') - Date.parse(b.createdAt || b.created_at || '') ||
    String(a.id || '').localeCompare(String(b.id || ''))
  ))

  sorted.forEach(notification => {
    const duplicateOf = duplicateOfById.get(notification.id)
    if (duplicateOf) {
      const original = rowsById.get(duplicateOf)
      rowsById.set(notification.id, original?.status === 'mapped'
        ? { ...original, notification, duplicateOf, coveredItems: [...original.coveredItems] }
        : { notification, status: 'blocked', reason: `duplicate source ${duplicateOf} is not mapped`, expectedAmount: 0, mappedAmount: 0, coveredItems: [] })
      return
    }

    const result = mapLegacyPaymentToCoveredItems(notification, payableItems, { excludedItemKeys: consumedItemKeys })
    rowsById.set(notification.id, { notification, ...result })
    if (result.status === 'mapped') {
      result.coveredItems.forEach(item => consumedItemKeys.add(payableItemKey(item)))
    }
  })

  return notifications.map(notification => rowsById.get(notification.id))
}

async function selectAll(rest, table, columns = '*') {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const endpoint = new URL(`${rest.url}/rest/v1/${table}`)
    endpoint.searchParams.set('select', columns)
    const response = await fetch(endpoint, {
      headers: {
        apikey: rest.key,
        Authorization: `Bearer ${rest.key}`,
        Range: `${from}-${from + pageSize - 1}`,
        ...rest.headers,
      },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(`${table}: ${data?.message || response.statusText}`)
    rows.push(...(data || []))
    if (!data || data.length < pageSize) return rows
  }
}

export function parseArgs(argv) {
  const args = { apply: false, linked: false, snapshotPath: '' }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--apply') {
      args.apply = true
    } else if (argv[index] === '--linked') {
      args.linked = true
    } else if (argv[index] === '--snapshot' && argv[index + 1]) {
      args.snapshotPath = argv[index + 1]
      index += 1
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`)
    }
  }
  if (args.apply && args.snapshotPath) throw new Error('--apply must use fresh live data, not --snapshot')
  if (args.apply && !args.linked) throw new Error('--apply requires --linked transaction mode')
  if (args.linked && args.snapshotPath) throw new Error('--linked cannot be combined with --snapshot')
  return args
}

async function fetchTables(rest) {
  return Object.fromEntries(await Promise.all(
    SNAPSHOT_TABLES.map(async table => [table, await selectAll(rest, table)]),
  ))
}

async function runLinkedQuery(sql) {
  const { stdout } = await execFileAsync('supabase', [
    'db',
    'query',
    '--linked',
    '--agent=no',
    '-o',
    'json',
    sql,
  ], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
  })
  return JSON.parse(stdout)
}

async function fetchTablesLinked() {
  const fields = SNAPSHOT_TABLES.flatMap(table => [
    `'${table}'`,
    `(select coalesce(jsonb_agg(t), '[]'::jsonb) from public.${table} t)`,
  ])
  const result = await runLinkedQuery(`select jsonb_build_object(${fields.join(', ')}) as tables;`)
  return result[0]?.tables || {}
}

function rawStateFromTables(tables) {
  return {
    members: tables.members || [],
    profiles: tables.profiles || [],
    groups: tables.groups || [],
    memberTokens: tables.member_tokens || [],
    expenses: tables.expenses || [],
    participants: tables.expense_participants || [],
    settlements: tables.settlements || [],
    settlementPeriods: tables.settlement_periods || [],
    settlementCheckpoints: [],
    periodPayments: tables.period_payments || [],
    pickleConfigs: tables.pickle_configs || [],
    pickleballMonthlyConfigs: tables.pickleball_monthly_config || [],
    pickleSessions: tables.pickle_sessions || [],
    pickleAttendees: tables.pickle_attendees || [],
    pickleballSessions: tables.pickleball_sessions || [],
    pickleballAttendance: tables.pickleball_attendance || [],
    pickleballSessionItems: tables.pickleball_session_items || [],
    pickleballTickets: tables.pickleball_tickets || [],
    pickleballOwnerPayments: tables.pickleball_owner_payments || [],
    notifications: [],
    joinRequests: tables.join_requests || [],
    monthSettlements: [],
  }
}

async function loadSnapshot(snapshotPath) {
  const value = JSON.parse(await readFile(path.resolve(root, snapshotPath), 'utf8'))
  if (!value?.tables || typeof value.tables !== 'object') throw new Error('Snapshot must contain a tables object')
  return value.tables
}

function fileTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

async function writePrivateJson(outputPath, value) {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

async function loadMigrationRuntime() {
  const storePath = path.join(root, 'src/store.jsx')
  const server = await createServer({
    root,
    configFile: false,
    appType: 'custom',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    plugins: [{
      name: 'expose-normalize-for-payment-migration',
      enforce: 'pre',
      transform(code, id) {
        if (id === storePath) return `${code}\nexport { normalize as __normalizeForMigration }\n`
      },
    }],
  })
  try {
    const store = await server.ssrLoadModule('/src/store.jsx')
    const screenData = await server.ssrLoadModule('/src/hooks/useScreenData.js')
    return {
      normalize: store.__normalizeForMigration,
      buildHomeData: screenData.buildHomeData,
    }
  } finally {
    await server.close()
  }
}

export function enrichPayableItemDates(payableItems, tables) {
  const expenseDates = new Map((tables.expenses || []).map(row => [String(row.id), row.expense_date]))
  const sessionDates = new Map([
    ...(tables.pickle_sessions || []),
    ...(tables.pickleball_sessions || []),
  ].map(row => [String(row.id), row.session_date || row.date]))
  const ticketDates = new Map((tables.pickleball_tickets || []).map(row => [String(row.id), row.session_date]))

  return payableItems.map(item => {
    let eventDate = item.expenseId ? expenseDates.get(String(item.expenseId)) : ''
    const itemId = String(item.itemId || '')
    const sessionMatch = itemId.match(/^pickleball-session:([^:]+):/)
    const ticketMatch = itemId.match(/^pickleball-ticket:([^:]+):/)
    if (sessionMatch) eventDate = sessionDates.get(sessionMatch[1]) || eventDate
    if (ticketMatch) eventDate = ticketDates.get(ticketMatch[1]) || eventDate
    return eventDate ? { ...item, eventDate } : item
  })
}

async function buildCanonicalPayableItems(tables, legacyNotifications) {
  const { normalize, buildHomeData } = await loadMigrationRuntime()
  const raw = rawStateFromTables(tables)
  const scopes = new Map()
  legacyNotifications.forEach(notification => {
    const coveredSources = metadataOf(notification).coveredSources || metadataOf(notification).covered_sources || []
    coveredSources.forEach(source => {
      const key = [source.memberId || source.member_id, source.profileId || source.profile_id, source.month || source.yearMonth || source.year_month].map(String).join('|')
      scopes.set(key, source)
    })
  })

  const itemsByKey = new Map()
  for (const source of scopes.values()) {
    const memberId = source.memberId || source.member_id
    const profileId = source.profileId || source.profile_id
    const selectedMonth = source.month || source.yearMonth || source.year_month
    const member = (tables.members || []).find(row => String(row.id) === String(memberId))
    if (!member) throw new Error(`Missing member ${memberId} for canonical payable items`)
    const state = normalize(raw, member.id, member.group_id, member.name, profileId)
    if (!state) throw new Error(`Could not normalize state for member ${memberId}`)
    const pickleballState = {
      ...state,
      currentGroupId: state.pickleballGroup?.id || state.currentGroupId,
      currentGroup: state.pickleballGroup || state.currentGroup,
    }
    const home = buildHomeData(
      state,
      state.currentUserId,
      state.members,
      state.groups,
      state.pickle,
      pickleballState,
      selectedMonth,
    )
    for (const row of home.paymentSummary?.sourceBreakdown || []) {
      for (const item of row.payableItems || []) {
        const key = payableItemKey(item)
        const existing = itemsByKey.get(key)
        if (existing && Math.round(Number(existing.amount) || 0) !== Math.round(Number(item.amount) || 0)) {
          throw new Error(`Canonical item ${key} has inconsistent amounts`)
        }
        if (key) itemsByKey.set(key, item)
      }
    }
  }

  return enrichPayableItemDates([...itemsByKey.values()], tables)
}

function coveredItemForMetadata(item) {
  return Object.fromEntries([
    'payableItemKey',
    'itemId',
    'expenseId',
    'expenseTitle',
    'sourceType',
    'sourceId',
    'sourceLabel',
    'memberId',
    'profileId',
    'month',
    'monthLabel',
    'amount',
  ].filter(key => item[key] !== undefined && item[key] !== '').map(key => [key, item[key]]))
}

function expectedMetadata(row) {
  return {
    ...metadataOf(row.notification),
    coveredItems: row.coveredItems.map(coveredItemForMetadata),
  }
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

export function buildLinkedMigrationSql(rows) {
  const values = rows.map(row => `(
    ${sqlString(row.notification.id)},
    ${sqlString(JSON.stringify(metadataOf(row.notification)))}::jsonb,
    ${sqlString(JSON.stringify(expectedMetadata(row)))}::jsonb
  )`).join(',\n')
  return `begin;
create temp table payment_covered_items_migration (
  id text primary key,
  original_metadata jsonb not null,
  new_metadata jsonb not null
) on commit drop;
insert into payment_covered_items_migration (id, original_metadata, new_metadata) values
${values};
do $$
declare
  updated_count integer;
begin
  if (select count(*) from payment_covered_items_migration) <> ${rows.length} then
    raise exception 'Expected ${rows.length} migration rows';
  end if;
  update public.notifications notification
  set metadata = migration.new_metadata
  from payment_covered_items_migration migration
  where notification.id::text = migration.id
    and notification.metadata is not distinct from migration.original_metadata;
  get diagnostics updated_count = row_count;
  if updated_count <> ${rows.length} then
    raise exception 'Expected ${rows.length} unchanged notification rows, updated %', updated_count;
  end if;
end $$;
do $$
begin
  if (
    select count(*)
    from payment_covered_items_migration migration
    join public.notifications notification on notification.id::text = migration.id
    where notification.metadata = migration.new_metadata
  ) <> ${rows.length} then
    raise exception 'Not all notification metadata rows were updated';
  end if;
end $$;
commit;
`
}

function migrationReportRow(row) {
  const metadata = metadataOf(row.notification)
  return {
    notificationId: row.notification.id,
    createdAt: row.notification.created_at || row.notification.createdAt,
    memberName: metadata.memberName || metadata.member_name || '',
    monthLabel: metadata.monthLabel || metadata.month_label || '',
    status: row.status,
    reason: row.reason,
    expectedAmount: row.expectedAmount,
    mappedAmount: row.mappedAmount,
    duplicateOf: row.duplicateOf || null,
    sourceCount: (metadata.coveredSources || metadata.covered_sources || []).length,
    itemCount: row.coveredItems.length,
    coveredItems: row.coveredItems.map(coveredItemForMetadata),
  }
}

async function applyMigrationRowsLinked(rows, timestamp) {
  const sqlPath = path.join(root, 'reports', `payment-covered-items-apply-${timestamp}.sql`)
  await writeFile(sqlPath, buildLinkedMigrationSql(rows), { mode: 0o600 })
  try {
    await execFileAsync('supabase', [
      'db',
      'query',
      '--linked',
      '--agent=no',
      '-o',
      'json',
      '-f',
      sqlPath,
    ], {
      cwd: root,
      maxBuffer: 32 * 1024 * 1024,
    })
  } finally {
    await rm(sqlPath, { force: true })
  }
}

async function verifyAppliedRowsLinked(rows) {
  const result = await runLinkedQuery("select coalesce(jsonb_agg(t), '[]'::jsonb) as rows from public.notifications t;")
  const notifications = result[0]?.rows || []
  const byId = new Map(notifications.map(row => [String(row.id), row]))
  for (const row of rows) {
    const stored = byId.get(String(row.notification.id))
    if (!stored) throw new Error(`Verification missing notification ${row.notification.id}`)
    if (!isDeepStrictEqual(stored.metadata, expectedMetadata(row))) {
      throw new Error(`Verification metadata mismatch for ${row.notification.id}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const now = new Date()
  const timestamp = fileTimestamp(now)
  let rest = null
  let tables

  if (args.snapshotPath) {
    tables = await loadSnapshot(args.snapshotPath)
  } else if (args.linked) {
    tables = await fetchTablesLinked()
  } else {
    const env = await loadEnv()
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing SUPABASE_URL/SUPABASE_ANON_KEY in .env')
    rest = {
      url,
      key,
      headers: env.MEMBER_TOKEN ? { 'x-member-token': env.MEMBER_TOKEN } : {},
    }
    tables = await fetchTables(rest)
  }

  const legacyNotifications = (tables.notifications || []).filter(isLegacyConfirmedPayment)
  const payableItems = await buildCanonicalPayableItems(tables, legacyNotifications)
  const rows = mapLegacyPaymentsToCoveredItems(legacyNotifications, payableItems, {
    duplicateOfById: DUPLICATE_OF_BY_ID,
  })
  const blockedRows = rows.filter(row => row.status !== 'mapped')
  const mismatchAmount = rows.reduce((sum, row) => sum + Math.abs(row.expectedAmount - row.mappedAmount), 0)
  const report = {
    generatedAt: now.toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    input: args.snapshotPath ? path.resolve(root, args.snapshotPath) : 'live Supabase',
    totals: {
      legacyPayments: rows.length,
      canonicalItems: payableItems.length,
      mapped: rows.length - blockedRows.length,
      blocked: blockedRows.length,
      mismatchAmount,
    },
    rows: rows.map(migrationReportRow),
  }
  const reportPath = path.join(root, 'reports', `payment-covered-items-${args.apply ? 'apply' : 'dry-run'}-${timestamp}.json`)
  await writePrivateJson(reportPath, report)

  if (blockedRows.length || mismatchAmount) {
    throw new Error(`Migration blocked: ${blockedRows.length} blocked, ${mismatchAmount} đ mismatch. Report: ${reportPath}`)
  }

  let backupPath = ''
  if (args.apply) {
    if (rows.length !== 31) throw new Error(`Expected 31 legacy payments before apply, found ${rows.length}`)
    backupPath = path.join(root, 'reports', `supabase-before-covered-items-${timestamp}.json`)
    await writePrivateJson(backupPath, {
      generatedAt: now.toISOString(),
      projectRef: (await readFile(path.join(root, 'supabase/.temp/project-ref'), 'utf8')).trim(),
      tables,
    })
    await applyMigrationRowsLinked(rows, timestamp)
    await verifyAppliedRowsLinked(rows)
  }

  console.log(JSON.stringify({
    ...report.totals,
    reportPath,
    backupPath: backupPath || null,
    applied: args.apply ? rows.length : 0,
  }, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
