#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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
  const env = {}
  for (const file of ['.env', '.env.local']) {
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
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
}

function shortId(value) {
  return String(value || '').slice(0, 8)
}

function money(value) {
  return `${Math.round(Math.abs(Number(value) || 0)).toLocaleString('vi-VN')} đ`
}

function metadataOf(notification) {
  return notification.metadata || {}
}

function notificationName(notification) {
  const metadata = metadataOf(notification)
  return metadata.memberName || metadata.member_name || notification.actor_name || ''
}

function notificationMonth(notification) {
  const metadata = metadataOf(notification)
  return metadata.monthLabel || metadata.month_label || ''
}

function hasExplicitCoverage(notification) {
  const metadata = metadataOf(notification)
  return Boolean(
    (metadata.coveredSources || metadata.covered_sources || []).length ||
    (metadata.coveredMembers || metadata.covered_members || []).length,
  )
}

function isLegacyConfirmedPayment(notification) {
  const metadata = metadataOf(notification)
  return String(notification.type || '').toLowerCase().includes('payment') &&
    String(metadata.status || 'pending').toLowerCase() === 'confirmed' &&
    !hasExplicitCoverage(notification)
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

export function inferLegacyPaymentCoverage(notification, { members, profiles }) {
  const actorMemberId = String(notification.actor_member_id || notification.actorMemberId || '')
  const actor = members.find(member => String(member.id) === actorMemberId)
  if (!actor) return { confidence: 'blocked', reason: 'actor member missing', coveredMembers: [] }

  const profileId = String(actor.profile_id || actor.profileId || '')
  const profile = profiles.find(row => String(row.id) === profileId)
  if (!profileId || !profile) return { confidence: 'blocked', reason: 'actor profile missing', coveredMembers: [] }

  const profileName = String(profile.name || '').trim()
  const noticeName = notificationName(notification)
  const sameName = normalizeName(profileName) === normalizeName(noticeName)
  const siblingMemberIds = members
    .filter(member => String(member.profile_id || member.profileId || '') === profileId)
    .map(member => String(member.id))
    .filter(Boolean)
    .filter(id => id !== actorMemberId)
    .sort()
  const memberIds = [actorMemberId, ...siblingMemberIds]

  return {
    confidence: sameName ? 'high' : 'review',
    reason: sameName ? 'actor profile + payment name match' : 'actor profile found, name mismatch',
    coveredMembers: [{
      profileId,
      memberId: actorMemberId,
      memberIds,
      name: profileName || noticeName || 'Thành viên',
      amount: Number(metadataOf(notification).amount) || 0,
    }],
  }
}

function renderRows(rows, groupsById) {
  if (!rows.length) return ['Không có dòng nào.']
  return rows.map(row => {
    const group = groupsById.get(String(row.notification.group_id || ''))
    const covered = row.coveredMembers[0]
    return `| \`${shortId(row.notification.id)}\` | ${row.confidence} | ${notificationName(row.notification) || '—'} | ${notificationMonth(row.notification) || '—'} | ${group?.name || shortId(row.notification.group_id)} | ${money(metadataOf(row.notification).amount)} | \`${shortId(row.notification.actor_member_id)}\` | ${covered?.name || '—'} | \`${shortId(covered?.profileId)}\` | ${row.reason} |`
  })
}

function renderJsonPatchRows(rows) {
  if (!rows.length) return ['Không có patch đề xuất.']
  return rows.map(row => {
    const patch = { coveredMembers: row.coveredMembers, coveredSources: [] }
    return `### ${shortId(row.notification.id)} · ${notificationName(row.notification) || '—'} · ${notificationMonth(row.notification) || '—'}\n\n\`\`\`json\n${JSON.stringify(patch, null, 2)}\n\`\`\``
  })
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
  const [members, profiles, groups, notifications] = await Promise.all([
    selectAll(rest, 'members'),
    selectAll(rest, 'profiles'),
    selectAll(rest, 'groups'),
    selectAll(rest, 'notifications'),
  ])

  const groupsById = new Map(groups.map(group => [String(group.id), group]))
  const rows = notifications
    .filter(isLegacyConfirmedPayment)
    .map(notification => ({ notification, ...inferLegacyPaymentCoverage(notification, { members, profiles }) }))
    .sort((a, b) => a.confidence.localeCompare(b.confidence) || notificationName(a.notification).localeCompare(notificationName(b.notification), 'vi'))
  const highRows = rows.filter(row => row.confidence === 'high')
  const reviewRows = rows.filter(row => row.confidence !== 'high')

  const now = new Date()
  const filename = `payment-coverage-dry-run-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.md`
  const outputDir = path.join(root, 'reports')
  const outputPath = path.join(outputDir, filename)
  await mkdir(outputDir, { recursive: true })

  const lines = [
    '# Payment Coverage Dry Run',
    '',
    `- Generated: ${now.toISOString()}`,
    '- Mode: read-only, không sửa DB',
    `- Auth: ${env.MEMBER_TOKEN ? 'member token supplied' : 'anon key only'}`,
    `- Legacy confirmed no-source payments: ${rows.length}`,
    `- High confidence: ${highRows.length}`,
    `- Need review/blocked: ${reviewRows.length}`,
    '',
    '## Cách hiểu',
    '',
    '- `member_id` vẫn là membership theo group, không merge.',
    '- Dry-run chỉ đề xuất thêm `coveredMembers` vào payment legacy.',
    '- `high` nghĩa là actor_member_id map được profile và tên payment khớp profile.',
    '- Chỉ chạy update DB sau khi user duyệt bảng này.',
    '',
    '## Bảng đề xuất',
    '',
    '| payment | confidence | payment name | month | group | amount | actor | covered name | profile | reason |',
    '|---|---|---|---|---|---:|---|---|---|---|',
    ...renderRows(rows, groupsById),
    '',
    '## JSON patch đề xuất cho dòng high confidence',
    '',
    ...renderJsonPatchRows(highRows),
    '',
  ]

  await writeFile(outputPath, `${lines.join('\n')}\n`)
  console.log(outputPath)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
