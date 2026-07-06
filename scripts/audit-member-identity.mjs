#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

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
  const files = ['.env', '.env.local']
  const env = {}
  for (const file of files) {
    const fullPath = path.join(root, file)
    if (existsSync(fullPath)) Object.assign(env, parseEnv(await readFile(fullPath, 'utf8')))
  }
  return { ...env, ...process.env }
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
}

function shortId(value) {
  return String(value || '').slice(0, 8)
}

function money(value) {
  return `${Math.round(Math.abs(Number(value) || 0)).toLocaleString('vi-VN')} đ`
}

function dateText(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
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

function groupBy(rows, keyFn) {
  const map = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    map.set(key, [...(map.get(key) || []), row])
  }
  return map
}

function displayMemberName(member, profilesById) {
  const profile = profilesById.get(String(member.profile_id || ''))
  return String(profile?.name || member.name || '').trim()
}

function memberLabel(member, groupsById, profilesById) {
  const group = groupsById.get(String(member.group_id || ''))
  const profile = member.profile_id ? `profile ${shortId(member.profile_id)}` : 'no profile'
  const active = member.is_active === false ? 'inactive' : 'active'
  return `\`${shortId(member.id)}\` · ${displayMemberName(member, profilesById) || '—'} · ${group?.name || 'unknown group'} · ${profile} · ${active}`
}

function notificationMonth(notification) {
  const metadata = notification.metadata || {}
  return metadata.monthLabel || metadata.month_label || ''
}

function notificationName(notification) {
  const metadata = notification.metadata || {}
  return metadata.memberName || metadata.member_name || notification.actor_name || ''
}

function notificationAmount(notification) {
  return Number((notification.metadata || {}).amount) || 0
}

function hasExplicitCoverage(notification) {
  const metadata = notification.metadata || {}
  return Boolean(
    (metadata.coveredSources || metadata.covered_sources || []).length ||
    (metadata.coveredMembers || metadata.covered_members || []).length,
  )
}

function statusOf(notification) {
  return String((notification.metadata || {}).status || 'pending').toLowerCase()
}

function likelyCanonical(candidates) {
  return [...candidates].sort((a, b) => {
    const profileScore = Number(Boolean(b.profile_id)) - Number(Boolean(a.profile_id))
    if (profileScore) return profileScore
    const activeScore = Number(b.is_active !== false) - Number(a.is_active !== false)
    if (activeScore) return activeScore
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })[0]
}

function referencesForMember(member, notifications, checkpoints) {
  const id = String(member.id)
  return {
    notificationsActor: notifications.filter(row => String(row.actor_member_id || '') === id),
    notificationsRecipient: notifications.filter(row => String(row.member_id || '') === id),
    checkpoints: checkpoints.filter(row => String(row.member_id || '') === id),
  }
}

function renderDuplicateSection(duplicates, groupsById, profilesById, notifications, checkpoints) {
  if (!duplicates.length) return ['Không thấy duplicate name đáng nghi.']
  return duplicates.flatMap(([nameKey, members], index) => {
    const canonical = likelyCanonical(members)
    const lines = [
      `### ${index + 1}. ${displayMemberName(members[0], profilesById) || nameKey}`,
      `- Mức độ: ${members.some(m => m.profile_id) ? 'Cần review profile/member mapping' : 'Cần gán profile_id'}`,
      `- Canonical gợi ý: \`${shortId(canonical?.id)}\` (${displayMemberName(canonical, profilesById) || '—'})`,
      `- Members:`,
      ...members.map(member => `  - ${memberLabel(member, groupsById, profilesById)}`),
      `- References:`,
    ]
    for (const member of members) {
      const refs = referencesForMember(member, notifications, checkpoints)
      lines.push(`  - \`${shortId(member.id)}\`: ${refs.notificationsActor.length} payment actor, ${refs.notificationsRecipient.length} notification recipient, ${refs.checkpoints.length} checkpoint`)
    }
    return lines
  })
}

function legacyConfirmedPayments(notifications) {
  return notifications
    .filter(row => String(row.type || '').toLowerCase().includes('payment'))
    .filter(row => statusOf(row) === 'confirmed')
    .filter(row => !hasExplicitCoverage(row))
}

function renderLegacyPayments(duplicates, groupsById, notifications) {
  const duplicateNames = new Set(duplicates.map(([name]) => name))
  const rows = legacyConfirmedPayments(notifications)
    .filter(row => duplicateNames.has(normalizeName(notificationName(row))))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

  if (!rows.length) return ['Không thấy confirmed payment legacy no-source bám tên trùng.']
  return rows.map(row => {
    const group = groupsById.get(String(row.group_id || ''))
    return `- \`${shortId(row.id)}\` · ${notificationName(row) || '—'} · ${notificationMonth(row) || 'no month'} · ${money(notificationAmount(row))} · group ${group?.name || shortId(row.group_id)} · actor \`${shortId(row.actor_member_id)}\` · recipient \`${shortId(row.member_id)}\``
  })
}

function renderAllLegacyPayments(groupsById, notifications) {
  const rows = legacyConfirmedPayments(notifications)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  if (!rows.length) return ['Không thấy confirmed payment legacy/no-source.']
  return rows.map(row => {
    const group = groupsById.get(String(row.group_id || ''))
    return `- \`${shortId(row.id)}\` · ${notificationName(row) || '—'} · ${notificationMonth(row) || 'no month'} · ${money(notificationAmount(row))} · group ${group?.name || shortId(row.group_id)} · actor \`${shortId(row.actor_member_id)}\` · recipient \`${shortId(row.member_id)}\``
  })
}

function renderOrphans(tableName, rows, membersById, memberFields) {
  const misses = []
  for (const row of rows) {
    for (const field of memberFields) {
      const value = row[field]
      if (value && !membersById.has(String(value))) misses.push({ row, field, value })
    }
  }
  if (!misses.length) return [`Không thấy orphan member_id trong ${tableName}.`]
  return misses.map(item => `- ${tableName} \`${shortId(item.row.id)}\` field \`${item.field}\` → missing member \`${shortId(item.value)}\``)
}

async function main() {
  const env = await loadEnv()
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL/SUPABASE_ANON_KEY in .env')

  const rest = {
    url,
    key,
    headers: env.MEMBER_TOKEN ? { 'x-member-token': env.MEMBER_TOKEN } : {},
  }

  const [members, profiles, groups, notifications, settlementCheckpoints] = await Promise.all([
    selectAll(rest, 'members'),
    selectAll(rest, 'profiles'),
    selectAll(rest, 'groups'),
    selectAll(rest, 'notifications'),
    selectAll(rest, 'settlement_checkpoints'),
  ])

  const groupsById = new Map(groups.map(row => [String(row.id), row]))
  const profilesById = new Map(profiles.map(row => [String(row.id), row]))
  const membersById = new Map(members.map(row => [String(row.id), row]))
  const byName = [...groupBy(members, row => normalizeName(displayMemberName(row, profilesById))).entries()]
    .filter(([, rows]) => rows.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'vi'))
  const byProfile = [...groupBy(members, row => row.profile_id ? String(row.profile_id) : '').entries()]
    .filter(([, rows]) => rows.length > 1)
    .sort((a, b) => b[1].length - a[1].length)

  const now = new Date()
  const filename = `member-identity-audit-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.md`
  const outputDir = path.join(root, 'reports')
  const outputPath = path.join(outputDir, filename)
  await mkdir(outputDir, { recursive: true })

  const lines = [
    '# Member Identity Audit',
    '',
    `- Generated: ${now.toISOString()}`,
    `- Mode: read-only`,
    `- Tables: members ${members.length}, profiles ${profiles.length}, groups ${groups.length}, notifications ${notifications.length}, settlement_checkpoints ${settlementCheckpoints.length}`,
    `- Auth: ${env.MEMBER_TOKEN ? 'member token supplied' : 'anon key only'}`,
    '',
    '## Tóm tắt dễ hiểu',
    '',
    `- Tên trùng member_id: ${byName.length} nhóm tên.`,
    `- Profile dùng nhiều member_id: ${byProfile.length} profile.`,
    `- Payment confirmed legacy/no-source đáng kiểm tra: ${legacyConfirmedPayments(notifications).length}.`,
    '',
    '## Việc nên làm tiếp',
    '',
    '1. Review từng mục "High confidence" trước.',
    '2. Chỉ migrate khi cùng tên + cùng profile hoặc user xác nhận cùng người.',
    '3. Sau khi có allowlist, mới chạy script update có rollback.',
    '',
    '## Duplicate theo tên',
    '',
    ...renderDuplicateSection(byName, groupsById, profilesById, notifications, settlementCheckpoints),
    '',
    '## Profile đang dùng nhiều member_id',
    '',
    ...(byProfile.length ? byProfile.flatMap(([profileId, rows], index) => [
      `### ${index + 1}. profile \`${shortId(profileId)}\``,
      ...rows.map(member => `- ${memberLabel(member, groupsById, profilesById)}`),
    ]) : ['Không thấy profile_id dùng cho nhiều member.']),
    '',
    '## Confirmed payment legacy/no-source',
    '',
    ...renderAllLegacyPayments(groupsById, notifications),
    '',
    '## Confirmed payment legacy/no-source trên tên trùng',
    '',
    ...renderLegacyPayments(byName, groupsById, notifications),
    '',
    '## Orphan references',
    '',
    ...renderOrphans('notifications', notifications, membersById, ['member_id', 'actor_member_id']),
    ...renderOrphans('settlement_checkpoints', settlementCheckpoints, membersById, ['member_id', 'created_by_member_id', 'confirmed_by_member_id']),
    '',
    '## Ghi chú',
    '',
    '- `member_id` là membership trong group, không nên xem là identity xuyên group.',
    '- `profile_id` nên là identity chính khi quyết toán/payment xuyên nhóm.',
    '- Report này không sửa DB.',
    '',
  ]

  await writeFile(outputPath, `${lines.join('\n')}\n`)
  console.log(outputPath)
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
