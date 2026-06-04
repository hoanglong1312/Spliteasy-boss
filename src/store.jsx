import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createSupabase } from './lib/supabase.js'
import { getStoredAuth, storeAuth, clearAuth, joinGroup } from './lib/auth.js'

const AppContext = createContext(null)
const TOAST_HIDE_DELAY_MS = 3000

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function ownerPaymentItemMatches(item, targetItem, payment = {}) {
  return String(item?.key || item?.type || '') === String(targetItem?.key || targetItem?.type || '') &&
    String(item?.yearMonth || item?.year_month || payment?.yearMonth || payment?.year_month || '') === String(targetItem?.yearMonth || targetItem?.year_month || '')
}

function isDoneStatus(status) {
  return ['completed', 'done', 'closed'].includes(String(status || '').toLowerCase())
}

function isMovedStatus(status) {
  return ['moved', 'cancelled', 'canceled'].includes(String(status || '').toLowerCase())
}

function getMonthRange(yearMonth) {
  const [yearText, monthText] = String(yearMonth || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('invalid_year_month')
  }
  const mm = String(month).padStart(2, '0')
  const endDay = new Date(year, month, 0).getDate()
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(endDay).padStart(2, '0')}`,
  }
}

export function generateMonthSessions(yearMonth, config = {}) {
  const [yearText, monthText] = String(yearMonth || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return []

  function toIsoWeekday(value) {
    if (typeof value === 'number' && Number.isInteger(value)) {
      if (value >= 1 && value <= 7) return value
      if (value === 0) return 7
    }
    const text = String(value || '').trim().toLowerCase()
    const map = {
      monday: 1,
      mon: 1,
      t2: 1,
      '2': 1,
      tuesday: 2,
      tue: 2,
      t3: 2,
      '3': 2,
      wednesday: 3,
      wed: 3,
      t4: 3,
      '4': 3,
      thursday: 4,
      thu: 4,
      t5: 4,
      '5': 4,
      friday: 5,
      fri: 5,
      t6: 5,
      '6': 5,
      saturday: 6,
      sat: 6,
      t7: 6,
      '7': 6,
      sunday: 7,
      sun: 7,
      cn: 7,
      '0': 7,
    }
    return map[text] || null
  }

  function startDayFrom(value) {
    if (typeof value === 'number' && Number.isInteger(value)) return value
    const text = String(value || '').trim()
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (iso) return Number(iso[3])
    const slash = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
    if (slash) return Number(slash[1])
    return 1
  }

  const scheduleWeekdayList = Array.isArray(config.scheduleWeekdays) ? config.scheduleWeekdays : []
  const weekdays = new Set(scheduleWeekdayList.map(toIsoWeekday).filter(Boolean))
  if (weekdays.size === 0) return []

  const [startTime = '19:00', endTime = '21:00'] = String(config.scheduleTime || '19:00-21:00')
    .split(/\s*(?:-|–|—|to)\s*/i)
    .map(part => part.trim())
    .filter(Boolean)
  const court = config.defaultVenue || 'CLB Pickleball'
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = Math.max(1, Math.min(startDayFrom(config.startDate), daysInMonth))
  const mm = String(month).padStart(2, '0')
  const sessions = []

  for (let day = firstDay; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day)
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
    if (!weekdays.has(isoWeekday)) continue
    sessions.push({
      date: `${year}-${mm}-${String(day).padStart(2, '0')}`,
      startTime,
      endTime,
      court,
      status: 'scheduled',
      sessionNumber: sessions.length + 1,
    })
  }

  return sessions
}

function normalizeScheduleWeekdays(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\s]+/)
  const map = {
    monday: 1,
    mon: 1,
    t2: 1,
    '2': 1,
    tuesday: 2,
    tue: 2,
    t3: 2,
    '3': 2,
    wednesday: 3,
    wed: 3,
    t4: 3,
    '4': 3,
    thursday: 4,
    thu: 4,
    t5: 4,
    '5': 4,
    friday: 5,
    fri: 5,
    t6: 5,
    '6': 5,
    saturday: 6,
    sat: 6,
    t7: 6,
    '7': 6,
    sunday: 7,
    sun: 7,
    cn: 7,
    '0': 7,
  }
  return list
    .map(item => {
      if (typeof item === 'number' && Number.isInteger(item)) return item === 0 ? 7 : item
      return map[String(item || '').trim().toLowerCase()]
    })
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 7)
}

function isoWeekdayFromDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return null
  return date.getDay() === 0 ? 7 : date.getDay()
}

function generationConfigFromState(state, yearMonth, override = {}) {
  const groupId = override.groupId || override.group_id || state?.pickleballGroupId || state?.pickleballGroup?.id || state?.currentGroupId || state?.currentGroup?.id
  const group = safeArray(state?.groups).find(g => String(g.id) === String(groupId)) || state?.pickleballGroup || state?.currentGroup || {}
  const config = safeArray(state?._allPickle?.configs || state?.pickleConfigs)
    .find(row => String(row?.groupId || row?.group_id || '') === String(groupId || '')) || {}
  const monthlyConfig = safeArray(state?.pickle?.monthlyConfigs)
    .find(row => (
      String(row?.groupId || row?.group_id || '') === String(groupId || '') &&
      String(row?.yearMonth || row?.year_month || '') === String(yearMonth || '')
    )) || {}
  const month = String(yearMonth || '').split('-')[1] || String(new Date().getMonth() + 1).padStart(2, '0')
  const year = String(yearMonth || '').split('-')[0] || String(new Date().getFullYear())

  return {
    scheduleWeekdays: override.scheduleWeekdays ?? override.schedule_weekdays ??
      monthlyConfig.scheduleWeekdays ?? monthlyConfig.schedule_weekdays,
    scheduleTime: override.scheduleTime ?? override.schedule_time ??
      monthlyConfig.scheduleTime ?? monthlyConfig.schedule_time ??
      config.scheduleTime ?? config.schedule_time ?? config.timeRange ?? group.scheduleTime ?? group.schedule_time,
    startDate: override.startDate ?? override.start_date ??
      monthlyConfig.scheduleStartDay ?? monthlyConfig.schedule_start_day ??
      config.startDate ?? config.start_date ?? `01/${month}/${year}`,
    defaultVenue: override.defaultVenue ?? override.default_venue ??
      config.defaultVenue ?? config.default_venue ?? group.defaultVenue ?? group.default_venue ?? group.name,
  }
}

function sessionDateValue(session) {
  return session?.sessionDate || session?.session_date || session?.date
}

function rescheduleOriginDate(session) {
  const note = String(session?.notes || '')
  return note.match(/Dời từ (\d{4}-\d{2}-\d{2})/)?.[1] || ''
}

function rescheduleTargetDate(session) {
  const matches = [...String(session?.notes || '').matchAll(/sang (\d{4}-\d{2}-\d{2})/g)]
  return matches.at(-1)?.[1] || ''
}

function replacementNote(originDate, fromDate, toDate, fallback = '') {
  const custom = String(fallback || '').trim()
  const hop = fromDate && fromDate !== originDate ? ` qua ${fromDate}` : ''
  const system = `Dời từ ${originDate || fromDate || 'lịch cũ'}${hop} sang ${toDate}`
  return custom ? `${custom}\n${system}` : system
}

function isHiddenReplacementSession(session) {
  return String(session?.notes || '').includes('[hidden-replacement]')
}

function replacementSessionsForOrigin(state, originalSession) {
  const originDate = rescheduleOriginDate(originalSession) || sessionDateValue(originalSession)
  const groupId = originalSession?.groupId || originalSession?.group_id
  const originalId = String(originalSession?.id || '')
  if (!originDate) return []
  return [
    ...safeArray(state?._allPickle?.sessions),
    ...safeArray(state?.pickle?.sessions),
    ...safeArray(state?.pickle?.upcoming),
  ].filter(session => {
    const sessionGroupId = session?.groupId || session?.group_id
    return String(session?.id || '') !== originalId &&
      (!groupId || !sessionGroupId || String(sessionGroupId) === String(groupId)) &&
      rescheduleOriginDate(session) === originDate &&
      !isHiddenReplacementSession(session)
  })
}

function activePickleSessionOnDate(state, date, groupId, ignoredIds = []) {
  const ignored = new Set(safeArray(ignoredIds).map(String))
  return allPickleSessionsForState(state).find(session => {
    const sessionGroupId = session?.groupId || session?.group_id
    if (isOffScheduleConflictSession(state, session)) return false
    return String(sessionDateValue(session) || '').slice(0, 10) === String(date || '').slice(0, 10) &&
      (!groupId || !sessionGroupId || String(sessionGroupId) === String(groupId)) &&
      !ignored.has(String(session?.id || '')) &&
      !isMovedStatus(session?.status) &&
      !isHiddenReplacementSession(session)
  }) || null
}

function reusableReplacementSessionOnDate(state, date, groupId, ignoredIds = []) {
  const ignored = new Set(safeArray(ignoredIds).map(String))
  return allPickleSessionsForState(state).find(session => {
    const sessionGroupId = session?.groupId || session?.group_id
    return String(sessionDateValue(session) || '').slice(0, 10) === String(date || '').slice(0, 10) &&
      (!groupId || !sessionGroupId || String(sessionGroupId) === String(groupId)) &&
      !ignored.has(String(session?.id || '')) &&
      (session?.sourceTable || session?.source_table) === 'pickle_sessions' &&
      (isMovedStatus(session?.status) || isHiddenReplacementSession(session) || isOffScheduleConflictSession(state, session))
  }) || null
}

function scheduleWeekdaysForSession(state, session) {
  const groupId = session?.groupId || session?.group_id || state?.currentGroupId || state?.currentGroup?.id
  const yearMonth = String(sessionDateValue(session) || '').slice(0, 7)
  const group = state?.currentGroup || safeArray(state?.groups).find(row => String(row?.id || '') === String(groupId || '')) || {}
  const config = safeArray(state?._allPickle?.configs || state?.pickleConfigs)
    .find(row => String(row?.groupId || row?.group_id || '') === String(groupId || '')) || {}
  const monthlyConfig = [
    ...safeArray(state?._allPickle?.monthlyConfigs),
    ...safeArray(state?.pickle?.monthlyConfigs),
  ].find(row => (
    String(row?.groupId || row?.group_id || '') === String(groupId || '') &&
    String(row?.yearMonth || row?.year_month || '') === String(yearMonth || '')
  )) || {}
  return normalizeScheduleWeekdays(
    monthlyConfig.scheduleWeekdays ?? monthlyConfig.schedule_weekdays ??
    config.scheduleWeekdays ?? config.schedule_weekdays ??
    group.scheduleWeekdays ?? group.schedule_weekdays
  )
}

function isOffScheduleConflictSession(state, session) {
  const normalizedStatus = String(session?.status || '').toLowerCase()
  if (!['scheduled', 'upcoming'].includes(normalizedStatus)) return false
  const selfDate = String(sessionDateValue(session) || '').slice(0, 10)
  const originDate = rescheduleOriginDate(session)
  const targetDate = rescheduleTargetDate(session)
  if (originDate && originDate !== selfDate && targetDate === selfDate) return false
  if (originDate && originDate === selfDate) return true
  const weekdays = scheduleWeekdaysForSession(state, session)
  if (weekdays.length === 0) return false
  return !weekdays.includes(isoWeekdayFromDate(selfDate))
}

function allPickleSessionsForState(state) {
  return [
    ...safeArray(state?._allPickle?.sessions),
    ...safeArray(state?.pickle?.sessions),
    ...safeArray(state?.pickle?.upcoming),
  ]
}

function isStaleReplacementSession(session, sessions) {
  const originDate = rescheduleOriginDate(session)
  const selfDate = sessionDateValue(session)
  if (!originDate || originDate === selfDate || isHiddenReplacementSession(session)) return false
  const targetDate = rescheduleTargetDate(session)
  if (targetDate && targetDate !== selfDate) return true
  if (isMovedStatus(session?.status)) return true
  const groupId = session?.groupId || session?.group_id
  const originSession = safeArray(sessions).find(item => {
    const itemGroupId = item?.groupId || item?.group_id
    return sessionDateValue(item) === originDate &&
      (!groupId || !itemGroupId || String(itemGroupId) === String(groupId)) &&
      !isHiddenReplacementSession(item)
  })
  return Boolean(originSession && !isMovedStatus(originSession?.status))
}

function staleReplacementSessions(state, ids = []) {
  const wantedIds = new Set(safeArray(ids).map(String))
  const sessions = allPickleSessionsForState(state)
  return sessions.filter(session => (
    (wantedIds.size === 0 || wantedIds.has(String(session?.id || ''))) &&
    isStaleReplacementSession(session, sessions)
  ))
}

async function hideReplacementSession(sb, replacement) {
  const table = (replacement?.sourceTable || replacement?.source_table) === 'pickleball_sessions'
    ? 'pickleball_sessions'
    : 'pickle_sessions'
  return sb
    .from(table)
    .update({
      status: 'cancelled',
      notes: `[hidden-replacement] ${replacement?.notes || ''}`.trim(),
    })
    .eq('id', replacement.id)
}

function updatePickleSessions(pickle, updateSessions) {
  if (!pickle) return pickle
  return {
    ...pickle,
    sessions: updateSessions(safeArray(pickle.sessions)),
  }
}

function removeScheduledSessionsForMonthFromState(current, groupId, yearMonth) {
  if (!groupId || !yearMonth) return current
  const keepSession = session => !(
    String(session?.groupId || session?.group_id || '') === String(groupId) &&
    String(sessionDateValue(session) || '').startsWith(String(yearMonth)) &&
    (String(session?.status || '').toLowerCase() === 'scheduled' || !session?.status)
  )

  return {
    ...current,
    _allPickle: updatePickleSessions(current?._allPickle, sessions => sessions.filter(keepSession)),
    pickle: updatePickleSessions(current?.pickle, sessions => sessions.filter(keepSession)),
  }
}

function removeSessionGuestFromState(current, sessionId, attendeeId) {
  if (!sessionId || !attendeeId) return current
  const targetSessionId = String(sessionId)
  const targetAttendeeId = String(attendeeId)
  const removeGuest = session => {
    if (String(session?.id || '') !== targetSessionId) return session
    const guests = safeArray(session.guests)
    const nextGuests = guests.filter(guest => String(guest?.id || guest?.attendee_id || guest?.guest_id || '') !== targetAttendeeId)
    if (nextGuests.length === guests.length) return session
    return { ...session, guests: nextGuests }
  }

  return {
    ...current,
    _allPickle: updatePickleSessions(current?._allPickle, sessions => sessions.map(removeGuest)),
    pickle: updatePickleSessions(current?.pickle, sessions => sessions.map(removeGuest)),
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function memberNameParts(name) {
  const trimmed = String(name || '').trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  return {
    short: words.at(-1) || trimmed,
    initials: words.map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?',
  }
}

export function disambiguateMembers(members = []) {
  const rows = safeArray(members).map((member, index) => ({ member, index }))
  const byName = new Map()

  rows.forEach(row => {
    const key = String(row.member?.name || '').trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(row)
  })

  const suffixByIndex = new Map()
  byName.forEach(group => {
    if (group.length < 2) return
    group
      .slice()
      .sort((a, b) => {
        const at = Date.parse(a.member?.created_at || a.member?.createdAt || '')
        const bt = Date.parse(b.member?.created_at || b.member?.createdAt || '')
        const av = Number.isNaN(at) ? Number.MAX_SAFE_INTEGER : at
        const bv = Number.isNaN(bt) ? Number.MAX_SAFE_INTEGER : bt
        return av === bv ? a.index - b.index : av - bv
      })
      .forEach((row, position) => suffixByIndex.set(row.index, position + 1))
  })

  return rows.map(({ member, index }) => {
    const name = String(member?.name || '').trim()
    const suffix = suffixByIndex.get(index)
    return {
      ...member,
      displayName: suffix ? `${name} (${suffix})` : name,
    }
  })
}

export function getExpenseRealtimeAuthorId(row = {}) {
  return row.created_by ?? row.submitted_by_member_id ?? null
}

export function isExpenseRealtimeFromCurrentUser(payload, currentUserId) {
  if (!currentUserId) return false
  return [payload?.new, payload?.old].some(row => String(getExpenseRealtimeAuthorId(row)) === String(currentUserId))
}

export function expenseRealtimeToastMessage(payload, members = []) {
  const eventType = payload?.eventType || payload?.event_type
  switch (eventType) {
    case 'INSERT': {
      const authorId = getExpenseRealtimeAuthorId(payload?.new || {})
      const member = safeArray(members).find(m => String(m.id) === String(authorId))
      const name = member?.displayName || member?.name || 'Ai đó'
      return `${name} vừa thêm chi tiêu mới`
    }
    case 'UPDATE':
      return 'Chi tiêu vừa được cập nhật'
    case 'DELETE':
      return 'Một chi tiêu đã bị xóa'
    default:
      return ''
  }
}

function randomInviteCode(name) {
  const prefix = String(name || 'GROUP')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase() || 'GROUP'
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  const suffix = Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
  return `${prefix}-${suffix}`
}

function memberInsertRow(groupId, member, role) {
  const parts = memberNameParts(member?.name)
  const row = {
    group_id: groupId,
    name: String(member?.name || '').trim(),
    short: member?.short || parts.short,
    initials: member?.initials || parts.initials,
    color: member?.color || '#574EFA',
    role,
    member_type: member?.memberType || member?.member_type || member?.type || 'fixed',
    expense_active: member?.expenseActive ?? member?.expense_active ?? true,
    bank_name: member?.bankName ?? member?.bank_name ?? null,
    bank_account: member?.bankAccount ?? member?.bank_account ?? null,
    bank_account_name: member?.bankAccountName ?? member?.bank_account_name ?? null,
  }
  const profileId = member?.profileId || member?.profile_id
  if (profileId) row.profile_id = profileId
  return row
}

function normalizeReceiptImages(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function ensureProfileForMember(sb, member) {
  if (member?.profileId || member?.profile_id) return member.profileId || member.profile_id
  const parts = memberNameParts(member?.name)
  const { data, error } = await sb
    .from('profiles')
    .insert({
      name: String(member?.name || '').trim(),
      short: member?.short || parts.short,
      initials: member?.initials || parts.initials,
      color: member?.color || '#574EFA',
      bank_name: member?.bankName ?? member?.bank_name ?? null,
      bank_account: member?.bankAccount ?? member?.bank_account ?? null,
      bank_account_name: member?.bankAccountName ?? member?.bank_account_name ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data?.id
}

function buildEmptyState() {
  return {
    currentUserId: null,
    currentUserName: null,
    selectedYearMonth: monthKey(new Date()),
    currentGroupId: null,
    currentGroup: null,
    pickleballGroupId: null,
    pickleballGroup: null,
    profiles: [],
    members: [],
    memberTokens: [],
    groups: [],
    expenses: [],
    joinRequests: [],
    settlementPeriods: [],
    pickle: {
      sessions: [],
      upcoming: [],
      fixedMembers: [],
      externalTickets: [],
      monthlyConfigs: [],
      monthlyCourtFee: 0,
      guestFeePerSession: 0,
    },
    notifications: [],
    disputeCount: 0,
    homeMonth: null,
    homeMonthSessions: [],
    homeMonthExpenses: [],
    homeMonthError: null,
    _allPickle: null,
    toast: { visible: false, message: '' },
    _pickleRegenInProgress: false,
    _loading: false,
    _error: null,
  }
}

function memberHasPin(member, profile = null) {
  if (typeof profile?.has_pin === 'boolean') return profile.has_pin
  if (typeof profile?.hasPin === 'boolean') return profile.hasPin
  if ('pin_hash' in (profile || {})) return Boolean(profile.pin_hash)
  if ('pinHash' in (profile || {})) return Boolean(profile.pinHash)
  if (typeof member?.has_pin === 'boolean') return member.has_pin
  if (typeof member?.hasPin === 'boolean') return member.hasPin
  if ('pin_hash' in (member || {})) return Boolean(member.pin_hash)
  if ('pinHash' in (member || {})) return Boolean(member.pinHash)
  return false
}

async function fetchGroupData(token) {
  const sb = createSupabase(token)
  const [mR, prR, gR, mtR, eR, pR, sR, spR, ppR, pcR, pmcR, psR, paR, pbsR, pbaR, psiR, ptR, popR, dR, nR, jR] = await Promise.all([
    sb.from('members').select('*'),
    sb.from('profiles').select('*'),
    sb.from('groups').select('*'),
    sb.from('member_tokens').select('member_id,revoked_at'),
    sb.from('expenses').select('*').order('expense_date', { ascending: false }),
    sb.from('expense_participants').select('*'),
    sb.from('settlements').select('*').order('settlement_date', { ascending: false }),
    sb.from('settlement_periods').select('*').order('period_end', { ascending: false }),
    sb.from('period_payments').select('*'),
    sb.from('pickle_configs').select('*'),
    sb.from('pickleball_monthly_config').select('*'),
    sb.from('pickle_sessions').select('*').order('session_date', { ascending: false }),
    sb.from('pickle_attendees').select('*'),
    sb.from('pickleball_sessions').select('*').order('date', { ascending: false }),
    sb.from('pickleball_attendance').select('*'),
    sb.from('pickleball_session_items').select('*'),
    sb.from('pickleball_tickets').select('*').order('session_date', { ascending: true }),
    sb.from('pickleball_owner_payments').select('*').order('paid_at', { ascending: false }),
    sb.from('expense_disputes').select('id').eq('status', 'open'),
    sb.rpc('list_visible_notifications'),
    sb.from('join_requests').select('*').eq('status', 'pending'),
  ])
  if (mR.error) throw mR.error
  if (prR.error) console.warn('[store] profiles query failed:', prR.error)
  if (gR.error) throw gR.error
  if (mtR.error) console.warn('[store] member_tokens query failed:', mtR.error)
  if (spR.error) console.warn('[store] settlement_periods query failed:', spR.error)
  if (ppR.error) console.warn('[store] period_payments query failed:', ppR.error)
  if (pcR.error) console.warn('[store] pickle_configs query failed:', pcR.error)
  if (pmcR.error) console.warn('[store] pickleball_monthly_config query failed:', pmcR.error)
  if (pbsR.error) console.warn('[store] pickleball_sessions query failed:', pbsR.error)
  if (pbaR.error) console.warn('[store] pickleball_attendance query failed:', pbaR.error)
  if (psiR.error) console.warn('[store] pickleball_session_items query failed:', psiR.error)
  if (ptR.error) console.warn('[store] pickleball_tickets query failed:', ptR.error)
  if (popR.error) console.warn('[store] pickleball_owner_payments query failed:', popR.error)
  if (dR.error) console.warn('[store] dispute count query failed:', dR.error)
  if (nR.error) console.warn('[store] notifications query failed:', nR.error)
  if (jR.error) console.warn('[store] join_requests query failed:', jR.error)
  return {
    members:         mR.data || [],
    profiles:        prR.data || [],
    groups:          gR.data || [],
    memberTokens:    mtR.data || [],
    expenses:        eR.data || [],
    participants:    pR.data || [],
    settlements:     sR.data || [],
    settlementPeriods: spR.data || [],
    periodPayments:    ppR.data || [],
    pickleConfigs:   pcR.data || [],
    pickleballMonthlyConfigs: pmcR.data || [],
    pickleSessions:  psR.data || [],
    pickleAttendees: paR.data || [],
    pickleballSessions: pbsR.data || [],
    pickleballAttendance: pbaR.data || [],
    pickleballSessionItems: psiR.data || [],
    pickleballTickets: ptR.data || [],
    pickleballOwnerPayments: popR.data || [],
    disputeCount:    (dR.data || []).length,
    notifications:   nR.data || [],
    joinRequests:    jR.data || [],
  }
}

export async function fetchPickleballSessions(token, yearMonth) {
  const { start, end } = getMonthRange(yearMonth)
  const sb = createSupabase(token)
  const { data, error } = await sb
    .from('pickleball_sessions')
    .select(`
      id,
      group_id,
      date,
      notes,
      created_at,
      pickleball_attendance (
        session_id,
        member_id,
        status
      )
    `)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchMonthlyExpenses(token, yearMonth) {
  const { start, end } = getMonthRange(yearMonth)
  const sb = createSupabase(token)
  const { data, error } = await sb
    .from('expense_participants')
    .select(`
      expense_id,
      member_id,
      share_amount,
      amount:share_amount,
      share:share_amount,
      share_type,
      expenses!inner (
        id,
        group_id,
        title,
        description:title,
        amount,
        expense_date,
        date:expense_date,
        category,
        cat:category,
        module,
        pickle_session_id,
        paid_by_member_id,
        submitted_by_member_id,
        status,
        groups (
          id,
          name
        )
      )
    `)
    .gte('expenses.expense_date', start)
    .lte('expenses.expense_date', end)

  if (error) throw error
  return (data || []).slice().sort((a, b) => (
    String(b.expenses?.expense_date || b.expenses?.date || '')
      .localeCompare(String(a.expenses?.expense_date || a.expenses?.date || ''))
  ))
}

function sameMemberName(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function normalizeMemberTokens(memberTokens = []) {
  return safeArray(memberTokens)
    .map(token => {
      const memberId = token.member_id ?? token.memberId
      return memberId ? { ...token, memberId, member_id: memberId } : null
    })
    .filter(Boolean)
}

function formatVNDForMessage(value) {
  const amount = Number(value) || 0
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`
}

function isPickleAttendeeGuest(row = {}) {
  return row.is_guest === true || String(row.attendee_type || '').toLowerCase() === 'guest'
}

function attendanceStatus(row = {}) {
  const status = String(row.status || row.rsvp_status || '').toLowerCase()
  if (status === 'absent' || status === 'not_going' || row.attended === false) return 'absent'
  return 'present'
}

function findPickleSessionInState(state, sessionId) {
  const id = String(sessionId || '')
  if (!id) return null
  return [
    ...safeArray(state?._allPickle?.sessions),
    ...safeArray(state?.pickle?.sessions),
    ...safeArray(state?.pickle?.upcoming),
  ].find(session => String(session?.id) === id) || null
}

function resolveMemberForGroup({ members, memberTokens, groupId, currentMemberId, currentUserName }) {
  const groupMembers = safeArray(members).filter(m => (m.groupId ?? m.group_id) === groupId)
  const tokenMemberIds = new Set(normalizeMemberTokens(memberTokens).map(t => t.memberId))
  const tokenMember = groupMembers.find(m => tokenMemberIds.has(m.id))
  if (tokenMember) return tokenMember

  const currentMember = groupMembers.find(m => m.id === currentMemberId)
  if (currentMember) return currentMember

  const namedMember = groupMembers.find(m => sameMemberName(m.name, currentUserName))
  if (namedMember) return namedMember

  const previousMember = safeArray(members).find(m => m.id === currentMemberId)
  if (previousMember?.name) {
    const matchingName = groupMembers.find(m => sameMemberName(m.name, previousMember.name))
    if (matchingName) return matchingName
  }

  return groupMembers[0] || null
}

function pickleForGroup(allPickle, members, groupId) {
  const source = allPickle || {}
  const sessions = safeArray(source.sessions).filter(s => (s.groupId ?? s.group_id) === groupId)
  const upcoming = safeArray(source.upcoming).filter(s => (s.groupId ?? s.group_id) === groupId)
  const sessionIds = new Set(sessions.map(session => String(session.id)).filter(Boolean))
  const sessionItems = safeArray(source.sessionItems || source.session_items)
    .filter(item => sessionIds.has(String(item.sessionId || item.session_id || '')))
  const monthlyConfigs = safeArray(source.monthlyConfigs || source.monthly_configs)
    .filter(c => (c.groupId ?? c.group_id) === groupId)
  const configs = safeArray(source.configs)
  const config = configs.find(c => (c.groupId ?? c.group_id) === groupId)
    || configs.find(c => !(c.groupId ?? c.group_id))
    || {}
  const fixedMembers = safeArray(members)
    .filter(m => (
      (m.groupId ?? m.group_id) === groupId &&
      m.isActive !== false &&
      m.is_active !== false &&
      String(m.memberType || m.member_type || 'fixed').toLowerCase() !== 'casual'
    ))
    .map(m => m.id)

  return {
    sessions,
    upcoming,
    sessionItems,
    fixedMembers,
    externalTickets: safeArray(source.externalTickets).filter(t => (t.groupId ?? t.group_id) === groupId),
    ownerPayments: safeArray(source.ownerPayments).filter(payment => (payment.groupId ?? payment.group_id) === groupId),
    monthlyConfigs,
    monthlyCourtFee: Number(config.monthlyCourtFee ?? config.monthly_court_fee ?? 0),
    guestFeePerSession: Number(config.guestFeePerSession ?? config.guest_fee_per_session ?? 0),
  }
}

function pickleDataGroupIds(allPickle) {
  const ids = new Set()
  const source = allPickle || {}
  ;[
    ...safeArray(source.sessions),
    ...safeArray(source.upcoming),
    ...safeArray(source.configs),
    ...safeArray(source.monthlyConfigs || source.monthly_configs),
    ...safeArray(source.externalTickets),
    ...safeArray(source.ownerPayments),
  ].forEach(row => {
    const id = row?.groupId ?? row?.group_id
    if (id) ids.add(String(id))
  })
  return ids
}

function inferGroupType(group, pickleGroupIds = new Set()) {
  const explicit = String(group?.type || group?.kind || group?.group_type || '').toLowerCase()
  if (['pickleball', 'expense'].includes(explicit)) return explicit
  if (group?.linkedPickleballGroupId || group?.linked_pickleball_group_id) return 'expense'
  const id = group?.id
  if (id && pickleGroupIds.has(String(id))) return 'pickleball'
  const text = `${group?.name || ''} ${group?.emoji || ''}`.toLowerCase()
  if (text.includes('pickle') || text.includes('🏓') || text.includes('🏸')) return 'pickleball'
  return 'expense'
}

function resolvePickleballGroupId(state, preferredGroupId = null) {
  const groups = safeArray(state?.groups)
  const allPickle = state?._allPickle || state?.pickle
  const pickleGroupIds = pickleDataGroupIds(allPickle)
  const preferred = preferredGroupId ? groups.find(group => String(group.id) === String(preferredGroupId)) : null
  if (preferred && inferGroupType(preferred, pickleGroupIds) === 'pickleball') return preferred.id
  const currentPickle = state?.pickleballGroupId ? groups.find(group => String(group.id) === String(state.pickleballGroupId)) : null
  if (currentPickle && inferGroupType(currentPickle, pickleGroupIds) === 'pickleball') return currentPickle.id
  const dataGroup = groups.find(group => pickleGroupIds.has(String(group.id)))
  if (dataGroup) return dataGroup.id
  return groups.find(group => inferGroupType(group, pickleGroupIds) === 'pickleball')?.id || null
}

function applyPickleballSelection(state, preferredGroupId = null) {
  const groupId = resolvePickleballGroupId(state, preferredGroupId)
  const groups = safeArray(state?.groups)
  const group = groups.find(item => String(item.id) === String(groupId)) || null
  return {
    ...state,
    pickleballGroupId: group?.id || null,
    pickleballGroup: group,
    pickle: group ? pickleForGroup(state._allPickle || state.pickle, state.members, group.id) : pickleForGroup(state._allPickle || state.pickle, state.members, null),
  }
}

function applyGroupSelection(state, groupId, options = {}) {
  const groups = safeArray(state.groups)
  const currentGroup = groups.find(g => g.id === groupId)
  if (!currentGroup) return state

  const nextMember = resolveMemberForGroup({
    members: state.members,
    memberTokens: state.memberTokens,
    groupId,
    currentMemberId: options.currentMemberId ?? state.currentUserId,
    currentUserName: options.currentUserName ?? state.currentUserName,
  })
  const currentUserId = nextMember?.id || state.currentUserId
  const currentUserName = nextMember?.name || state.currentUserName || ''
  const members = safeArray(state.members).map(m => ({ ...m, isMe: m.id === currentUserId }))

  return {
    ...state,
    currentUserId,
    currentUserName,
    currentGroupId: groupId,
    currentGroup,
    members,
  }
}

function normalize(raw, currentMemberId, preferredGroupId = null, preferredMemberName = '') {
  const {
    members,
    profiles = [],
    groups,
    memberTokens = [],
    expenses,
    participants,
    settlements,
    settlementPeriods,
    periodPayments,
    pickleConfigs,
    pickleballMonthlyConfigs = [],
    pickleConfig,
    pickleSessions,
    pickleAttendees,
    pickleballSessions = [],
    pickleballAttendance = [],
    pickleballSessionItems = [],
    pickleballTickets = [],
    pickleballOwnerPayments = [],
    disputeCount,
    notifications = [],
    joinRequests = [],
  } = raw
  const activeGroups = safeArray(groups).filter(group => !group.deleted_at && !group.deletedAt)
  if (activeGroups.length === 0) return null  // signal: data empty but keep session

  const me = members.find(m => m.id === currentMemberId)
  const currentGroup = activeGroups.find(g => g.id === preferredGroupId) || activeGroups.find(g => g.id === me?.group_id) || activeGroups[0]
  const normalJoinRequests = safeArray(joinRequests)
    .map(r => ({
      id: r.id,
      groupId: r.group_id,
      group_id: r.group_id,
      name: r.name,
      status: r.status || 'pending',
      createdAt: r.created_at,
      created_at: r.created_at,
    }))

  const normalExpenses = expenses.map(e => ({
    id: e.id,
    groupId: e.group_id,
    group_id: e.group_id,
    title: e.title,
    cat: e.cat || e.category || 'food',
    category: e.category || e.cat || 'food',
    amount: Number(e.amount),
    paidBy: e.paid_by_member_id,
    participants: participants.filter(p => p.expense_id === e.id).map(p => p.member_id),
    splits: participants.filter(p => p.expense_id === e.id).map(p => ({
      memberId: p.member_id,
      amount: Number(p.share_amount),
    })),
    date: e.expense_date,
    status: e.status,
    notes: e.notes || '',
    receiptImages: normalizeReceiptImages(e.receipt_images),
    receipt_images: normalizeReceiptImages(e.receipt_images),
    declineReason: e.decline_reason,
    submittedBy: e.submitted_by_member_id,
    submitted_by_member_id: e.submitted_by_member_id,
    pickleSessionId: e.pickle_session_id,
  }))

  const normalSettlements = settlements.map(s => ({
    id: s.id,
    groupId: s.group_id,
    group_id: s.group_id,
    fromId: s.from_member_id,
    toId: s.to_member_id,
    amount: Number(s.amount),
    date: s.settlement_date,
  }))

  const normalPeriodPayments = (periodPayments || []).map(p => ({
    id: p.id,
    periodId: p.period_id,
    period_id: p.period_id,
    fromMemberId: p.from_member_id,
    from_member_id: p.from_member_id,
    toMemberId: p.to_member_id,
    to_member_id: p.to_member_id,
    amount: Number(p.amount),
    status: p.status || 'pending',
    transferredAt: p.transferred_at,
    transferred_at: p.transferred_at,
    confirmedAt: p.confirmed_at,
    confirmed_at: p.confirmed_at,
  }))

  const normalSettlementPeriods = (settlementPeriods || []).map(p => ({
    id: p.id,
    groupId: p.group_id,
    group_id: p.group_id,
    periodStart: p.period_start,
    period_start: p.period_start,
    periodEnd: p.period_end,
    period_end: p.period_end,
    status: p.status || 'open',
    createdByMemberId: p.created_by_member_id,
    created_by_member_id: p.created_by_member_id,
    createdAt: p.created_at,
    created_at: p.created_at,
    payments: normalPeriodPayments.filter(pay => pay.periodId === p.id),
  }))
  const normalNotifications = safeArray(notifications).map(notification => ({
    id: notification.id,
    memberId: notification.member_id,
    member_id: notification.member_id,
    groupId: notification.group_id,
    group_id: notification.group_id,
    actorMemberId: notification.actor_member_id,
    actor_member_id: notification.actor_member_id,
    type: notification.type,
    refType: notification.ref_type,
    ref_type: notification.ref_type,
    refId: notification.ref_id,
    ref_id: notification.ref_id,
    message: notification.message,
    metadata: notification.metadata || {},
    unread: notification.is_read === false,
    read: notification.is_read === true,
    createdAt: notification.created_at,
    created_at: notification.created_at,
  }))

  const normalSessionItems = safeArray(pickleballSessionItems).map(item => {
    const memberIds = item.member_ids == null ? null : safeArray(item.member_ids)
    return {
      id: item.id,
      sessionId: item.session_id,
      session_id: item.session_id,
      name: item.name || '',
      amount: Number(item.amount) || 0,
      memberIds,
      member_ids: memberIds,
      createdBy: item.created_by,
      created_by: item.created_by,
      createdAt: item.created_at,
      created_at: item.created_at,
    }
  })
  const sessionItemsBySession = normalSessionItems.reduce((map, item) => {
    const sessionId = String(item.sessionId || item.session_id || '')
    if (!sessionId) return map
    if (!map.has(sessionId)) map.set(sessionId, [])
    map.get(sessionId).push(item)
    return map
  }, new Map())

  const normalLegacySessions = safeArray(pickleballSessions).map(s => {
    const sessionItems = sessionItemsBySession.get(String(s.id)) || []
    const attendanceRecords = safeArray(pickleballAttendance)
      .filter(a => a.session_id === s.id)
      .map(a => ({
        sessionId: a.session_id,
        session_id: a.session_id,
        memberId: a.member_id,
        member_id: a.member_id,
        status: attendanceStatus(a),
      }))
    const itemExpenses = sessionItems.map(item => ({
      id: item.id,
      groupId: s.group_id,
      group_id: s.group_id,
      title: item.name,
      name: item.name,
      cat: /nước|water/i.test(item.name) ? 'water' : 'pickleball_extra',
      category: /nước|water/i.test(item.name) ? 'water' : 'pickleball_extra',
      amount: item.amount,
      paidBy: item.createdBy,
      participants: item.memberIds == null ? [] : item.memberIds,
      splits: [],
      date: s.date,
      status: 'approved',
      pickleSessionId: s.id,
      memberIds: item.memberIds,
      member_ids: item.memberIds,
      source: 'pickleball_session_items',
    }))
    return {
      id: s.id,
      sourceTable: 'pickleball_sessions',
      source_table: 'pickleball_sessions',
      groupId: s.group_id,
      group_id: s.group_id,
      date: s.date,
      sessionDate: s.date,
      session_date: s.date,
      startTime: s.start_time,
      start_time: s.start_time,
      court: s.court,
      status: s.status || 'completed',
      waterAmount: Number(s.water_amount) || 0,
      water_amount: Number(s.water_amount) || 0,
      notes: s.notes,
      attendanceRecords,
      attendance_records: attendanceRecords,
      attendees: attendanceRecords
        .filter(record => record.status !== 'absent')
        .map(record => record.memberId),
      guests: [],
      sessionItems,
      session_items: sessionItems,
      expenses: [
        ...itemExpenses,
      ],
    }
  })

  const normalSessions = pickleSessions.map(s => {
    const sessionItems = sessionItemsBySession.get(String(s.id)) || []
    const attendeeRows = safeArray(pickleAttendees).filter(a => a.session_id === s.id)
    const memberAttendance = attendeeRows
      .filter(a => !isPickleAttendeeGuest(a))
      .map(a => ({
        sessionId: a.session_id,
        session_id: a.session_id,
        memberId: a.member_id,
        member_id: a.member_id,
        status: attendanceStatus(a),
      }))
    const itemExpenses = sessionItems.map(item => ({
      id: item.id,
      groupId: s.group_id,
      group_id: s.group_id,
      title: item.name,
      name: item.name,
      cat: /nước|water/i.test(item.name) ? 'water' : 'pickleball_extra',
      category: /nước|water/i.test(item.name) ? 'water' : 'pickleball_extra',
      amount: item.amount,
      paidBy: item.createdBy,
      participants: item.memberIds == null ? [] : item.memberIds,
      splits: [],
      date: s.session_date,
      status: 'approved',
      pickleSessionId: s.id,
      memberIds: item.memberIds,
      member_ids: item.memberIds,
      source: 'pickleball_session_items',
    }))
    return {
      id: s.id,
      sourceTable: 'pickle_sessions',
      source_table: 'pickle_sessions',
      groupId: s.group_id,
      group_id: s.group_id,
      date: s.session_date,
      sessionDate: s.session_date,
      session_date: s.session_date,
      startTime: s.start_time,
      start_time: s.start_time,
      court: s.court,
      status: s.status,
      notes: s.notes,
      attendanceRecords: memberAttendance,
      attendance_records: memberAttendance,
      attendees: memberAttendance
        .filter(record => record.status !== 'absent')
        .map(record => record.memberId),
      guests: attendeeRows.filter(isPickleAttendeeGuest),
      sessionItems,
      session_items: sessionItems,
      expenses: [
        ...normalExpenses.filter(e => e.pickleSessionId === s.id),
        ...itemExpenses,
      ],
    }
  })

  const normalProfiles = safeArray(profiles).map(profile => ({
    id: profile.id,
    name: String(profile.name || '').trim(),
    short: profile.short || String(profile.name || '').trim().split(' ').pop(),
    initials: profile.initials || String(profile.name || '').trim().slice(0, 2).toUpperCase(),
    color: profile.color || '#574EFA',
    avatarUrl: profile.avatar_url || '',
    avatar_url: profile.avatar_url || '',
    photoUrl: profile.avatar_url || '',
    photo_url: profile.avatar_url || '',
    bankName: profile.bank_name || '',
    bankAccount: profile.bank_account || '',
    bankAccountName: profile.bank_account_name || '',
    bank_name: profile.bank_name || '',
    bank_account: profile.bank_account || '',
    bank_account_name: profile.bank_account_name || '',
    hasPin: memberHasPin(null, profile),
    has_pin: memberHasPin(null, profile),
    createdAt: profile.created_at,
    created_at: profile.created_at,
  }))
  const profilesById = new Map(normalProfiles.map(profile => [String(profile.id), profile]))
  const normalMembers = members.map(m => {
    const profile = profilesById.get(String(m.profile_id || ''))
    const memberName = String(profile?.name || '').trim()
    return {
    id: m.id,
    profileId: m.profile_id,
    profile_id: m.profile_id,
    groupId: m.group_id,
    group_id: m.group_id,
    name: memberName,
    short: profile?.short || memberName.split(' ').pop(),
    initials: profile?.initials || memberName.slice(0, 2).toUpperCase(),
    color: profile?.color || '#574EFA',
    avatarUrl: profile?.avatar_url || '',
    avatar_url: profile?.avatar_url || '',
    photoUrl: profile?.avatar_url || '',
    photo_url: profile?.avatar_url || '',
    role: m.role,
    memberType: m.member_type || 'fixed',
    member_type: m.member_type || 'fixed',
    isMe: m.id === currentMemberId,
    isActive: m.is_active !== false,
    is_active: m.is_active !== false,
    expenseActive: m.expense_active ?? !['casual', 'guest', 'vanglai', 'vãng lai'].includes(String(m.member_type || 'fixed').toLowerCase()),
    expense_active: m.expense_active ?? !['casual', 'guest', 'vanglai', 'vãng lai'].includes(String(m.member_type || 'fixed').toLowerCase()),
    bankName: profile?.bank_name || '',
    bankAccount: profile?.bank_account || '',
    bankAccountName: profile?.bank_account_name || '',
    bank_name: profile?.bank_name || '',
    bank_account: profile?.bank_account || '',
    bank_account_name: profile?.bank_account_name || '',
    createdAt: m.created_at,
    created_at: m.created_at,
    hasPin: memberHasPin(m, profile),
    has_pin: memberHasPin(m, profile),
    }
  })

  const normalGroups = activeGroups.map(group => ({
    id: group.id,
    name: group.name,
    emoji: group.emoji || '👥',
    description: group.description || '',
    color: group.color || '#574EFA',
    createdBy: group.created_by || null,
    created_by: group.created_by || null,
    type: group.type || group.kind || group.group_type || null,
    kind: group.kind || group.type || group.group_type || null,
    groupType: group.group_type || group.type || group.kind || null,
    group_type: group.group_type || group.type || group.kind || null,
    linkedPickleballGroupId: group.linked_pickleball_group_id || null,
    linked_pickleball_group_id: group.linked_pickleball_group_id || null,
    venueOwnerName: group.venue_owner_name || '',
    venue_owner_name: group.venue_owner_name || '',
    venueBankName: group.venue_bank_name || '',
    venue_bank_name: group.venue_bank_name || '',
    venueBankAccount: group.venue_bank_account || '',
    venue_bank_account: group.venue_bank_account || '',
    inviteCode: group.invite_code,
    members: members.filter(m => m.group_id === group.id).map(m => m.id),
    expenses: normalExpenses.filter(e => e.groupId === group.id),
    settlements: normalSettlements.filter(s => s.groupId === group.id),
    settlementPeriods: normalSettlementPeriods.filter(p => p.groupId === group.id),
  }))
  const normalPickleConfigs = safeArray(pickleConfigs ?? (pickleConfig ? [pickleConfig] : [])).map(config => ({
    ...config,
    groupId: config.group_id ?? config.groupId,
    group_id: config.group_id ?? config.groupId,
    monthlyCourtFee: Number(config.monthly_court_fee ?? config.monthlyCourtFee ?? 0),
    monthly_court_fee: Number(config.monthly_court_fee ?? config.monthlyCourtFee ?? 0),
    guestFeePerSession: Number(config.guest_fee_per_session ?? config.guestFeePerSession ?? 0),
    guest_fee_per_session: Number(config.guest_fee_per_session ?? config.guestFeePerSession ?? 0),
  }))
  const normalPickleballMonthlyConfigs = safeArray(pickleballMonthlyConfigs).map(config => ({
    ...config,
    groupId: config.group_id ?? config.groupId,
    group_id: config.group_id ?? config.groupId,
    yearMonth: config.year_month ?? config.yearMonth,
    year_month: config.year_month ?? config.yearMonth,
    courtFee: Number(config.court_fee ?? config.courtFee ?? 0),
    court_fee: Number(config.court_fee ?? config.courtFee ?? 0),
    ticketPrice: Number(config.ticket_price ?? config.ticketPrice ?? 50000) || 50000,
    ticket_price: Number(config.ticket_price ?? config.ticketPrice ?? 50000) || 50000,
    activeMemberIds: safeArray(config.active_member_ids ?? config.activeMemberIds),
    active_member_ids: safeArray(config.active_member_ids ?? config.activeMemberIds),
    scheduleWeekdays: safeArray(config.schedule_weekdays ?? config.scheduleWeekdays),
    schedule_weekdays: safeArray(config.schedule_weekdays ?? config.scheduleWeekdays),
    scheduleStartDay: config.schedule_start_day ?? config.scheduleStartDay ?? null,
    schedule_start_day: config.schedule_start_day ?? config.scheduleStartDay ?? null,
  }))
  const normalTickets = safeArray(pickleballTickets).map(ticket => ({
    id: ticket.id,
    groupId: ticket.group_id,
    group_id: ticket.group_id,
    sessionDate: ticket.session_date,
    session_date: ticket.session_date,
    sessionTime: ticket.session_time,
    session_time: ticket.session_time,
    time: ticket.session_time,
    totalAmount: Number(ticket.total_amount) || 0,
    total_amount: Number(ticket.total_amount) || 0,
    amount: Number(ticket.total_amount) || 0,
    memberIds: safeArray(ticket.member_ids),
    member_ids: safeArray(ticket.member_ids),
    advancerId: ticket.advancer_id,
    advancer_id: ticket.advancer_id,
    status: ticket.status || (ticket.advancer_id ? 'unpaid' : 'team_fund'),
    yearMonth: ticket.year_month,
    year_month: ticket.year_month,
    createdBy: ticket.created_by,
    created_by: ticket.created_by,
    createdAt: ticket.created_at,
    created_at: ticket.created_at,
  }))
  const normalOwnerPayments = safeArray(pickleballOwnerPayments).map(payment => ({
    id: payment.id,
    groupId: payment.group_id,
    group_id: payment.group_id,
    yearMonth: payment.year_month,
    year_month: payment.year_month,
    paidAt: payment.paid_at,
    paid_at: payment.paid_at,
    totalAmount: Number(payment.total_amount) || 0,
    total_amount: Number(payment.total_amount) || 0,
    bankSnapshot: payment.bank_snapshot || {},
    bank_snapshot: payment.bank_snapshot || {},
    items: safeArray(payment.items),
    note: payment.note || '',
    createdBy: payment.created_by,
    created_by: payment.created_by,
    createdAt: payment.created_at,
    created_at: payment.created_at,
  }))
  const pickleGroupIds = pickleDataGroupIds({
    sessions: [
      ...normalLegacySessions,
      ...normalSessions,
    ],
    configs: normalPickleConfigs,
    monthlyConfigs: normalPickleballMonthlyConfigs,
    externalTickets: normalTickets,
    ownerPayments: normalOwnerPayments,
  })
  const typedGroups = normalGroups.map(group => ({
    ...group,
    type: inferGroupType(group, pickleGroupIds),
    kind: group.kind || inferGroupType(group, pickleGroupIds),
    groupType: inferGroupType(group, pickleGroupIds),
    group_type: inferGroupType(group, pickleGroupIds),
  }))
  const baseState = {
    currentUserId: currentMemberId,
    currentUserName: me?.name || '',
    currentGroupId: currentGroup.id,
    currentGroup: typedGroups.find(g => g.id === currentGroup.id) || typedGroups[0] || null,
    profiles: normalProfiles,
    members: normalMembers,
    memberTokens: normalizeMemberTokens(memberTokens),
    groups: typedGroups,
    expenses: normalExpenses,
    joinRequests: normalJoinRequests,
    settlementPeriods: normalSettlementPeriods,
    pickle: null,
    _allPickle: {
      sessions: [
        ...normalLegacySessions,
        ...normalSessions,
      ],
      upcoming: [],
      sessionItems: normalSessionItems,
      configs: normalPickleConfigs,
      monthlyConfigs: normalPickleballMonthlyConfigs,
      externalTickets: normalTickets,
      ownerPayments: normalOwnerPayments,
    },
    notifications: normalNotifications,
    disputeCount: disputeCount || 0,
    toast: { visible: false, message: '' },
    _loading: false,
    _error: null,
  }

  const selectedState = applyGroupSelection(baseState, currentGroup.id, {
    currentMemberId,
    currentUserName: preferredMemberName || me?.name || '',
  })
  return applyPickleballSelection(selectedState, preferredGroupId)
}

export function AppProvider({ children }) {
  const { token: storedToken, member: storedMember } = getStoredAuth()

  const [state, setState] = useState(() => {
    if (storedToken && storedMember) {
      return {
        ...buildEmptyState(),
        currentUserId: storedMember.id,
        currentUserName: storedMember.name,
        currentGroupId: storedMember.groupId || storedMember.group_id,
        _loading: true,
      }
    }
    return buildEmptyState()
  })

  const tokenRef = useRef(storedToken)
  const channelRef  = useRef(null)
  const debounceRef = useRef(null)
  const toastTimerRef = useRef(null)
  const stateRef    = useRef(state)

  useEffect(() => { stateRef.current = state })

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  const refresh = useCallback(async (tok) => {
    const t = tok ?? tokenRef.current
    if (!t) return
    setState(s => ({ ...s, _loading: true }))
    try {
      const { member } = getStoredAuth()
      const raw = await fetchGroupData(t)
      const next = normalize(raw, member?.id, member?.groupId || member?.group_id, member?.name)
      if (next) {
        const nextState = {
          ...next,
          selectedYearMonth: stateRef.current.selectedYearMonth || next.selectedYearMonth || monthKey(new Date()),
          toast: stateRef.current.toast || buildEmptyState().toast,
          _pickleRegenInProgress: stateRef.current._pickleRegenInProgress === true,
        }
        const currentMember = safeArray(nextState.members).find(member => String(member.id) === String(nextState.currentUserId))
        if (nextState.currentUserId) {
          storeAuth(t, {
            id: nextState.currentUserId,
            groupId: nextState.currentGroupId,
            name: nextState.currentUserName,
            profileId: currentMember?.profileId || currentMember?.profile_id || '',
            groupName: nextState.currentGroup?.name || '',
            hasPin: currentMember?.hasPin === true || currentMember?.has_pin === true,
          })
        }
        stateRef.current = nextState
        setState(nextState)
      } else {
        // groups empty — RLS / token issue, keep session, show error
        setState(s => ({ ...s, _loading: false, _error: 'Không tải được dữ liệu nhóm. Kiểm tra kết nối.' }))
      }
    } catch (err) {
      console.error('[store] refresh error:', err)
      setState(s => ({ ...s, _loading: false, _error: err.message }))
    }
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => refresh(), 600)
  }, [refresh])

  const broadcastChange = useCallback((table, evType, row) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'data_changed',
      payload: { table, event: evType, new: row },
    })
  }, [])

  useEffect(() => {
    if (storedToken) refresh(storedToken)
  }, [])

  const dispatch = useCallback(async (action) => {
    const token = tokenRef.current
    const sb = token ? createSupabase(token) : null

    switch (action.type) {

      case 'SHOW_TOAST': {
        const message = String(action.message || '').trim()
        if (!message) return null
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        const next = {
          ...stateRef.current,
          toast: { visible: true, message },
        }
        stateRef.current = next
        setState(next)
        toastTimerRef.current = setTimeout(() => {
          toastTimerRef.current = null
          dispatch({ type: 'HIDE_TOAST' })
        }, TOAST_HIDE_DELAY_MS)
        return next.toast
      }

      case 'HIDE_TOAST': {
        const next = {
          ...stateRef.current,
          toast: {
            visible: false,
            message: stateRef.current.toast?.message || '',
          },
        }
        stateRef.current = next
        setState(next)
        return next.toast
      }

      case 'FETCH_HOME_MONTH_SUCCESS': {
        const next = {
          ...stateRef.current,
          homeMonth: action.yearMonth,
          homeMonthSessions: action.sessions,
          homeMonthExpenses: action.expenses,
          homeMonthError: null,
        }
        stateRef.current = next
        setState(next)
        return next
      }

      case 'FETCH_HOME_MONTH_ERROR': {
        const next = {
          ...stateRef.current,
          homeMonthError: action.error,
        }
        stateRef.current = next
        setState(next)
        return next
      }

      case 'SET_SELECTED_MONTH': {
        const selectedYearMonth = action.selectedYearMonth || action.yearMonth || monthKey(new Date())
        const next = {
          ...stateRef.current,
          selectedYearMonth,
        }
        stateRef.current = next
        setState(next)
        return next
      }

      case 'LOGIN': {
        const { token: newToken, memberId, groupId, memberName } = action
        storeAuth(newToken, { id: memberId, groupId, name: memberName })
        tokenRef.current = newToken
        await refresh(newToken)
        break
      }

      case 'REFRESH': {
        await refresh(action.token)
        break
      }

      case 'CLEAR_SCHEDULED_SESSIONS': {
        const groupId = action.groupId || action.group_id || stateRef.current.currentGroupId
        const yearMonth = action.yearMonth || action.year_month
        const next = removeScheduledSessionsForMonthFromState(stateRef.current, groupId, yearMonth)
        stateRef.current = next
        setState(next)
        return next
      }

      case 'SET_PICKLE_REGEN': {
        const next = {
          ...stateRef.current,
          _pickleRegenInProgress: action.value === true,
        }
        stateRef.current = next
        setState(next)
        return next
      }

      case 'SWITCH_GROUP': {
        const groupId = action.groupId ?? action.group_id
        if (!groupId) return null
        const current = stateRef.current
        const next = applyGroupSelection(current, groupId)
        if (next === current) return null
        if (tokenRef.current && next.currentUserId) {
          storeAuth(tokenRef.current, {
            id: next.currentUserId,
            groupId: next.currentGroupId,
            name: next.currentUserName,
          })
        }
        stateRef.current = next
        setState(next)
        return next.currentGroupId
      }

      case 'JOIN_GROUP': {
        const inviteCode = String(action.inviteCode || '').trim().toUpperCase()
        const memberName = String(action.memberName || '').trim()
        if (!inviteCode) throw new Error('invite_code_required')
        if (!memberName) throw new Error('name_required')

        const existingToken = getStoredAuth().token || tokenRef.current
        const result = await joinGroup(inviteCode, memberName, existingToken)
        const nextToken = result?.token || existingToken
        if (!nextToken || !result?.member_id) {
          throw new Error('join_group_no_token')
        }

        storeAuth(nextToken, {
          id: result.member_id,
          groupId: result.group_id,
          name: result.member_name || memberName,
        })
        tokenRef.current = nextToken
        await refresh(nextToken)
        return result
      }

      case 'LOGOUT': {
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current)
          toastTimerRef.current = null
        }
        clearAuth()
        tokenRef.current = null
        setState(buildEmptyState())
        break
      }

      case 'UPDATE_MEMBER_COLOR': {
        if (!sb) return
        const _colorMember = safeArray(state.members).find(m => String(m.id) === String(state.currentUserId))
        const _colorProfileId = _colorMember?.profileId || _colorMember?.profile_id
        if (!_colorProfileId) return
        const { error } = await sb
          .from('profiles')
          .update({ color: action.color })
          .eq('id', _colorProfileId)
        if (error) { console.error('[store] UPDATE_MEMBER_COLOR:', error); return }
        await refresh()
        break
      }

      case 'SET_MEMBER_PIN': {
        if (!sb) return
        const { data, error } = await sb.rpc('set_member_pin', {
          p_pin: action.pin ?? action.p_pin,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] SET_MEMBER_PIN:', err)
          throw err
        }
        await refresh()
        break
      }

      case 'RESET_MEMBER_PIN': {
        if (!sb) return
        const { data, error } = await sb.rpc('reset_member_pin', {
          p_member_id: action.memberId ?? action.p_member_id,
          p_pin: action.pin ?? action.p_pin,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] RESET_MEMBER_PIN:', err)
          throw err
        }
        await refresh()
        break
      }

      case 'UPDATE_BANK_INFO': {
        if (!sb || !state.currentUserId) return
        const bankInfo = action.bankInfo || action
        const member = safeArray(state.members).find(item => String(item.id) === String(state.currentUserId))
        const profileId = member?.profileId || member?.profile_id
        if (!profileId) return
        const { error } = await sb
          .from('profiles')
          .update({
            ...(bankInfo.name ? { name: bankInfo.name } : {}),
            bank_name: bankInfo.bankName ?? bankInfo.bank_name ?? null,
            bank_account: bankInfo.bankAccount ?? bankInfo.bank_account ?? null,
            bank_account_name: bankInfo.bankAccountName ?? bankInfo.bank_account_name ?? null,
          })
          .eq('id', profileId)
        if (error) {
          console.error('[store] UPDATE_BANK_INFO:', error)
          throw error
        }
        await refresh()
        break
      }

      case 'UPDATE_PROFILE_PHOTO': {
        if (!sb || !state.currentUserId) return
        const memberId = action.memberId || state.currentUserId
        const member = safeArray(state.members).find(item => String(item.id) === String(memberId)) || {}
        const profileId = action.profileId || action.profile_id || member.profileId || member.profile_id
        if (!profileId) return
        const { error } = await sb
          .from('profiles')
          .update({ avatar_url: action.photoUrl || null })
          .eq('id', profileId)
        if (error) {
          console.error('[store] UPDATE_PROFILE_PHOTO:', error)
          throw error
        }
        await refresh()
        break
      }

      case 'ADD_EXPENSE': {
        if (!sb) return
        const { groupId, expense } = action
        const isTreasurer = action.isTreasurer === true
        const statusFields = isTreasurer
          ? { status: 'approved', reviewed_by_member_id: state.currentUserId, reviewed_at: new Date().toISOString() }
          : { status: 'pending' }
        const { data: newExp, error } = await sb
          .from('expenses')
          .insert({
            group_id: groupId,
            title: expense.title,
            amount: expense.amount,
            category: expense.category || expense.cat || null,
            notes: expense.notes || null,
            paid_by_member_id: expense.paidBy,
            submitted_by_member_id: state.currentUserId,
            expense_date: expense.date || new Date().toISOString().slice(0, 10),
            receipt_images: normalizeReceiptImages(expense.receiptImages),
            pickle_session_id: expense.pickleSessionId || null,
            ...statusFields,
          })
          .select()
          .single()
        if (error) { console.error('[store] ADD_EXPENSE:', error); return }
        if (expense.participants?.length > 0) {
          const per = Math.round(expense.amount / expense.participants.length)
          await sb.from('expense_participants').insert(
            expense.participants.map((memberId, i) => ({
              expense_id: newExp.id,
              member_id: memberId,
              share_amount: i === expense.participants.length - 1
                ? expense.amount - per * (expense.participants.length - 1)
                : per,
            }))
          )
        }
        broadcastChange('expenses', 'INSERT', {
          submitted_by_member_id: state.currentUserId,
          title: expense.title,
          group_id: groupId,
        })
        await refresh()
        break
      }

      case 'EDIT_EXPENSE': {
        if (!sb) return
        const { expense } = action
        await sb.from('expenses').update({
          title: expense.title,
          amount: expense.amount,
          category: expense.category || expense.cat || null,
          notes: expense.notes || null,
          paid_by_member_id: expense.paidBy,
          expense_date: expense.date,
          receipt_images: normalizeReceiptImages(expense.receiptImages),
        }).eq('id', expense.id)
        await sb.from('expense_participants').delete().eq('expense_id', expense.id)
        if (expense.participants?.length > 0) {
          const per = Math.round(expense.amount / expense.participants.length)
          await sb.from('expense_participants').insert(
            expense.participants.map((memberId, i) => ({
              expense_id: expense.id,
              member_id: memberId,
              share_amount: i === expense.participants.length - 1
                ? expense.amount - per * (expense.participants.length - 1)
                : per,
            }))
          )
        }
        await refresh()
        break
      }

      case 'DELETE_EXPENSE': {
        if (!sb) return
        await sb.from('expense_participants').delete().eq('expense_id', action.expenseId)
        await sb.from('expenses').delete().eq('id', action.expenseId)
        await refresh()
        break
      }

      case 'SETTLE_DEBT': {
        if (!sb) return
        const { groupId, settlement } = action
        await sb.from('settlements').insert({
          group_id: groupId,
          from_member_id: settlement.fromId,
          to_member_id: settlement.toId,
          amount: settlement.amount,
          settlement_date: settlement.date || new Date().toISOString().slice(0, 10),
          settled_by_member_id: state.currentUserId,
        })
        broadcastChange('settlements', 'INSERT', {
          from_member_id: settlement.fromId,
          to_member_id: settlement.toId,
        })
        await refresh()
        break
      }

      case 'CREATE_PERIOD': {
        if (!sb || !state.currentGroupId || !state.currentUserId) return null
        const cleanPayments = (action.payments || [])
          .map(p => ({
            from_member_id: p.fromMemberId ?? p.from_member_id,
            to_member_id: p.toMemberId ?? p.to_member_id,
            amount: Number(p.amount) || 0,
          }))
          .filter(p => p.from_member_id && p.to_member_id && p.amount > 0)

        const { data: newPeriod, error } = await sb
          .from('settlement_periods')
          .insert({
            group_id: state.currentGroupId,
            period_start: action.periodStart,
            period_end: action.periodEnd,
            created_by_member_id: state.currentUserId,
          })
          .select('id')
          .single()
        if (error) {
          console.error('[store] CREATE_PERIOD:', error)
          throw error
        }

        if (cleanPayments.length > 0) {
          const { error: paymentsError } = await sb
            .from('period_payments')
            .insert(cleanPayments.map(p => ({
              period_id: newPeriod.id,
              from_member_id: p.from_member_id,
              to_member_id: p.to_member_id,
              amount: p.amount,
            })))
          if (paymentsError) {
            console.error('[store] CREATE_PERIOD payments:', paymentsError)
            throw paymentsError
          }
        }

        broadcastChange('settlement_periods', 'INSERT', {
          id: newPeriod.id,
          group_id: state.currentGroupId,
        })
        await refresh()
        return newPeriod.id
      }

      case 'MARK_TRANSFERRED': {
        if (!sb || !state.currentUserId) return
        const { error } = await sb
          .from('period_payments')
          .update({
            status: 'transferred',
            transferred_at: new Date().toISOString(),
          })
          .eq('id', action.paymentId)
          .eq('from_member_id', state.currentUserId)
        if (error) {
          console.error('[store] MARK_TRANSFERRED:', error)
          throw error
        }
        broadcastChange('period_payments', 'UPDATE', { id: action.paymentId })
        await refresh()
        break
      }

      case 'CONFIRM_RECEIVED': {
        if (!sb || !state.currentUserId) return
        const isTreasurer = stateRef.current.members.find(m => m.id === state.currentUserId)?.role === 'treasurer'
        let query = sb
          .from('period_payments')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', action.paymentId)
          .eq('status', 'transferred')
        if (!isTreasurer) {
          query = query.eq('to_member_id', state.currentUserId)
        }

        const { data: updatedPayment, error } = await query
          .select('period_id')
          .maybeSingle()
        if (error) {
          console.error('[store] CONFIRM_RECEIVED:', error)
          throw error
        }
        if (!updatedPayment?.period_id) {
          await refresh()
          break
        }

        const { data: payments, error: paymentsError } = await sb
          .from('period_payments')
          .select('id,status')
          .eq('period_id', updatedPayment.period_id)
        if (paymentsError) {
          console.error('[store] CONFIRM_RECEIVED check period:', paymentsError)
          throw paymentsError
        }
        const allConfirmed = (payments || []).length > 0 && payments.every(p => p.status === 'confirmed')
        if (allConfirmed) {
          const { error: periodError } = await sb
            .from('settlement_periods')
            .update({ status: 'closed' })
            .eq('id', updatedPayment.period_id)
          if (periodError) {
            console.error('[store] CONFIRM_RECEIVED close period:', periodError)
            throw periodError
          }
          broadcastChange('settlement_periods', 'UPDATE', { id: updatedPayment.period_id, status: 'closed' })
        }
        broadcastChange('period_payments', 'UPDATE', { id: action.paymentId })
        await refresh()
        break
      }

      case 'SEND_PAYMENT_NOTIFICATION': {
        if (!sb || !state.currentUserId) return null
        const targetMemberId = action.targetMemberId || action.memberId || action.member_id
        const amount = Number(action.amount) || 0
        const metadata = {
          status: 'pending',
          amount,
          memberName: action.memberName || state.currentUserName || 'Thành viên',
          coveredMembers: safeArray(action.coveredMembers),
          coveredSources: safeArray(action.coveredSources),
          transferDescription: action.transferDescription || '',
          paymentTarget: action.paymentTarget || {},
          monthLabel: action.monthLabel || '',
        }
        const { data, error } = await sb.rpc('submit_payment_notification', {
          p_target_member_id: targetMemberId || null,
          p_group_id: action.groupId || state.currentGroupId || null,
          p_amount: amount,
          p_member_name: metadata.memberName,
          p_covered_members: metadata.coveredMembers,
          p_covered_sources: metadata.coveredSources,
          p_transfer_description: metadata.transferDescription,
          p_payment_target: metadata.paymentTarget,
          p_month_label: metadata.monthLabel,
        })
        if (error) {
          console.error('[store] SEND_PAYMENT_NOTIFICATION:', error)
          throw error
        }
        await refresh()
        return data
      }

      case 'REVIEW_PAYMENT_NOTIFICATION': {
        if (!sb || !state.currentUserId) return null
        const notificationId = action.notificationId || action.id
        if (!notificationId) return null
        const notification = safeArray(stateRef.current?.notifications).find(item => String(item.id) === String(notificationId)) || {}
        const { data, error } = await sb
          .from('notifications')
          .update({
            metadata: { ...notification.metadata, status: action.status },
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .select('id')
          .maybeSingle()
        if (error) {
          console.error('[store] REVIEW_PAYMENT_NOTIFICATION:', error)
          throw error
        }
        await refresh()
        return data
      }

      case 'DELETE_PAYMENT_NOTIFICATION': {
        if (!sb || !state.currentUserId) return null
        const notificationId = action.notificationId || action.id
        if (!notificationId) return null
        const notification = safeArray(stateRef.current?.notifications).find(item => String(item.id) === String(notificationId)) || {}
        const { data, error } = await sb
          .from('notifications')
          .update({
            metadata: { ...notification.metadata, status: 'deleted', deletedAt: new Date().toISOString(), deletedBy: state.currentUserId },
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .select('id')
          .maybeSingle()
        if (error) {
          console.error('[store] DELETE_PAYMENT_NOTIFICATION:', error)
          throw error
        }
        await refresh()
        return data
      }

      case 'MARK_NOTIFICATIONS_READ': {
        if (!sb || !state.currentUserId) return
        const { error } = await sb
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('member_id', state.currentUserId)
          .eq('is_read', false)
        if (error) {
          console.error('[store] MARK_NOTIFICATIONS_READ:', error)
          throw error
        }
        await refresh()
        break
      }

      case 'EDIT_GROUP': {
        if (!sb) return
        await sb.from('groups').update({
          name: action.group.name,
          emoji: action.group.emoji,
          description: action.group.description || '',
          color: action.group.color,
        }).eq('id', action.group.id)
        await refresh()
        break
      }

      case 'DELETE_GROUP': {
        if (!sb) return
        const groupId = action.groupId || action.group_id
        if (!groupId) return
        const { data, error } = await sb.rpc('delete_expense_group', {
          p_group_id: groupId,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] DELETE_GROUP:', err)
          throw err
        }
        await refresh()
        break
      }

      case 'SAVE_VENUE_OWNER_BANK': {
        if (!sb) return
        const groupId = action.groupId || state.pickleballGroupId || state.currentGroupId
        if (!groupId) return
        const { error } = await sb.from('groups').update({
          venue_owner_name: action.venueOwnerName || '',
          venue_bank_name: action.venueBankName || '',
          venue_bank_account: action.venueBankAccount || '',
        }).eq('id', groupId)
        if (error) {
          console.error('[store] SAVE_VENUE_OWNER_BANK:', error)
          throw error
        }
        await refresh()
        break
      }

      case 'CREATE_GROUP':
      case 'ADD_GROUP': {
        if (!sb || !state.currentUserId) return null
        const group = action.group || {}
        const name = String(group.name || '').trim()
        if (!name) return null

        const memberIds = safeArray(action.memberIds ?? group.members)
        const profileIds = safeArray(action.profileIds ?? group.profileIds)
        const currentMembers = stateRef.current.members || []
        const currentProfiles = stateRef.current.profiles || []
        const currentMember = currentMembers.find(m => m.id === state.currentUserId)
        const currentProfile = currentMember?.profileId
          ? currentProfiles.find(profile => String(profile.id) === String(currentMember.profileId))
          : null
        let selectedMembers = memberIds
          .map(id => currentMembers.find(m => m.id === id))
          .filter(Boolean)
        let selectedProfiles = profileIds
          .map(id => currentProfiles.find(profile => String(profile.id) === String(id)))
          .filter(Boolean)
        selectedMembers.forEach(member => {
          const profile = currentProfiles.find(item => String(item.id) === String(member.profileId || member.profile_id || ''))
          if (profile && !selectedProfiles.some(item => String(item.id) === String(profile.id))) {
            selectedProfiles.push(profile)
          }
        })
        if (currentMember) {
          selectedMembers = [
            currentMember,
            ...selectedMembers.filter(m => m.id !== currentMember.id),
          ]
        }
        if (currentProfile && !selectedProfiles.some(profile => String(profile.id) === String(currentProfile.id))) {
          selectedProfiles = [currentProfile, ...selectedProfiles]
        }
        if (selectedMembers.length === 0 && selectedProfiles.length === 0) return null

        const seenIdentityKeys = new Set()
        const memberNamesArray = [
          ...selectedMembers.map(member => ({
            key: member?.profileId || member?.profile_id
              ? `profile:${member.profileId || member.profile_id}`
              : `member:${member?.id || ''}`,
            name: String(member?.name || '').trim(),
          })),
          ...selectedProfiles.map(profile => ({
            key: `profile:${profile?.id || ''}`,
            name: String(profile?.name || '').trim(),
          })),
        ].filter(row => {
          if (!row.name) return false
          const key = row.key || `name:${row.name}`
          if (seenIdentityKeys.has(key)) return false
          seenIdentityKeys.add(key)
          return true
        }).map(row => row.name)
        const inviteCode = group.inviteCode || group.invite_code || randomInviteCode(name)
        const { data, error } = await sb.rpc('create_group', {
          p_name: name,
          p_invite_code: inviteCode,
          p_member_names: memberNamesArray,
        })
        const newGroup = Array.isArray(data) ? data[0] : data
        if (error || data?.error || newGroup?.error || !newGroup) {
          const err = error || new Error(data?.error || newGroup?.error || 'create_group_no_data')
          console.error('[store] CREATE_GROUP group:', err)
          throw err
        }
        const newGroupId = newGroup.group_id || newGroup.id
        const newInviteCode = newGroup.invite_code || newGroup.inviteCode || inviteCode
        const creatorName = currentMember?.name || state.currentUserName || memberNamesArray[0]
        const existingToken = tokenRef.current
        let joined = null
        try {
          joined = await joinGroup(newInviteCode, creatorName, existingToken)
        } catch (err) {
          console.error('[store] CREATE_GROUP join:', err)
          throw err
        }
        if (!joined?.token || !joined?.member_id) {
          const err = new Error('join_group_no_token')
          console.error('[store] CREATE_GROUP join:', err)
          throw err
        }

        storeAuth(joined.token, {
          id: joined.member_id,
          groupId: joined.group_id || newGroupId,
          name: joined.member_name || creatorName,
        })
        tokenRef.current = joined.token

        const joinedSb = createSupabase(joined.token)
        const { error: roleError } = await joinedSb
          .from('members')
          .update({ role: 'treasurer' })
          .eq('id', joined.member_id)
        if (roleError) {
          console.warn('[store] CREATE_GROUP creator role:', roleError)
        }
        if (currentMember?.profileId) {
          const { error: profileError } = await joinedSb
            .from('members')
            .update({ profile_id: currentMember.profileId })
            .eq('id', joined.member_id)
          if (profileError) {
            console.warn('[store] CREATE_GROUP creator profile:', profileError)
          }
        }
        const selectedProfileRows = selectedProfiles
          .filter(selectedProfile => String(selectedProfile.profileId || selectedProfile.id || '') !== String(currentMember?.profileId || ''))
        for (const selectedProfile of selectedProfileRows) {
          const { error: profileLinkError } = await joinedSb
            .from('members')
            .update({ profile_id: selectedProfile.profileId || selectedProfile.id })
            .eq('group_id', joined.group_id || newGroupId)
            .ilike('name', selectedProfile.name)
          if (profileLinkError) {
            console.warn('[store] CREATE_GROUP profile link:', profileLinkError)
          }
        }
        const { error: creatorError } = await joinedSb
          .from('groups')
          .update({
            created_by: joined.member_id,
            emoji: group.emoji || '🎯',
            description: group.description || '',
            color: group.color || '#574EFA',
          })
          .eq('id', joined.group_id || newGroupId)
        if (creatorError) {
          console.warn('[store] CREATE_GROUP created_by:', creatorError)
        }

        await refresh(joined.token)
        return newGroupId
      }

      case 'ADD_MEMBER': {
        if (!sb) return
        const { member } = action
        const groupId = action.groupId || action.group_id || state.currentGroupId
        let profileId = member?.profileId || member?.profile_id
        if (!profileId) {
          const { short, initials } = memberNameParts(member?.name)
          const { data: profileRow, error: profileError } = await sb
            .from('profiles')
            .insert({
              name: String(member?.name || '').trim(),
              short,
              initials,
              color: '#574EFA',
              bank_name: member?.bankName ?? member?.bank_name ?? null,
              bank_account: member?.bankAccount ?? member?.bank_account ?? null,
              bank_account_name: member?.bankAccountName ?? member?.bank_account_name ?? null,
            })
            .select('id')
            .single()
          if (profileError) throw profileError
          profileId = profileRow?.id
        }
        const insertRow = memberInsertRow(groupId, { ...member, profileId }, member.role || 'member')
        if (isUuid(member.id)) insertRow.id = member.id
        const { data: newMember, error } = await sb
          .from('members')
          .insert(insertRow)
          .select()
          .single()
        if (error) {
          console.error('[store] ADD_MEMBER:', error)
          throw error
        }
        await refresh()
        return newMember
      }

      case 'SAVE_PICKLEBALL_MONTHLY_CONFIG': {
        if (!sb) return
        const groupId = action.groupId || state.pickleballGroupId || state.currentGroupId
        const yearMonth = action.yearMonth || action.currentYearMonth
        if (!groupId || !yearMonth) return
        const row = {
          group_id: groupId,
          year_month: yearMonth,
        }
        if ('courtFee' in action || 'court_fee' in action) {
          row.court_fee = Number(action.courtFee ?? action.court_fee) || 0
        }
        if ('activeMonthlyMemberIds' in action || 'activeMemberIds' in action || 'active_member_ids' in action) {
          row.active_member_ids = safeArray(action.activeMonthlyMemberIds ?? action.activeMemberIds ?? action.active_member_ids)
        }
        if ('ticketPrice' in action || 'ticket_price' in action) {
          row.ticket_price = Number(action.ticketPrice ?? action.ticket_price) || 50000
        }
        if ('scheduleWeekdays' in action || 'schedule_weekdays' in action || 'weekdays' in action) {
          row.schedule_weekdays = normalizeScheduleWeekdays(action.scheduleWeekdays ?? action.schedule_weekdays ?? action.weekdays)
        }
        if ('scheduleStartDay' in action || 'schedule_start_day' in action || 'startDate' in action) {
          row.schedule_start_day = action.scheduleStartDay ?? action.schedule_start_day ?? action.startDate ?? null
        }
        if ('scheduleTime' in action || 'schedule_time' in action || 'timeRange' in action) {
          row.schedule_time = action.scheduleTime ?? action.schedule_time ?? action.timeRange ?? null
        }
        const query = sb
          .from('pickleball_monthly_config')
          .upsert(row, {
            onConflict: 'group_id,year_month',
            ignoreDuplicates: action.skipIfExists === true,
          })
          .select()
        const { data, error } = action.skipIfExists === true ? await query.maybeSingle() : await query.single()
        if (error) {
          console.error('[store] SAVE_PICKLEBALL_MONTHLY_CONFIG:', error)
          throw error
        }
        await refresh()
        return data
      }

      case 'ADD_PICKLEBALL_OWNER_PAYMENT': {
        if (!sb) return
        const groupId = action.groupId || state.pickleballGroupId || state.currentGroupId
        const yearMonth = action.yearMonth || action.currentYearMonth
        if (!groupId || !yearMonth) return
        const { data, error } = await sb
          .from('pickleball_owner_payments')
          .insert({
            group_id: groupId,
            year_month: yearMonth,
            paid_at: action.paidAt || new Date().toISOString().slice(0, 10),
            total_amount: Number(action.totalAmount) || 0,
            bank_snapshot: action.bankSnapshot || {},
            items: safeArray(action.items),
            note: action.note || null,
            created_by: state.currentUserId || null,
          })
          .select()
          .single()
        if (error) {
          console.error('[store] ADD_PICKLEBALL_OWNER_PAYMENT:', error)
          throw error
        }
        await refresh()
        return data
      }

      case 'UNMARK_PICKLEBALL_OWNER_PAYMENT_ITEM': {
        if (!sb) return
        const paymentId = action.paymentId || action.id
        if (!paymentId) return
        const payment = safeArray(stateRef.current?.pickle?.ownerPayments || stateRef.current?._allPickle?.ownerPayments)
          .find(row => String(row?.id || '') === String(paymentId))
        if (!payment) return
        const targetItem = action.item || {}
        const currentItems = safeArray(payment.items)
        const nextItems = currentItems.filter(item => !ownerPaymentItemMatches(item, targetItem, payment))
        const { data, error } = await sb
          .from('pickleball_owner_payments')
          .update({
            items: nextItems,
            total_amount: nextItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
          })
          .eq('id', paymentId)
          .select()
          .single()
        if (error) {
          console.error('[store] UNMARK_PICKLEBALL_OWNER_PAYMENT_ITEM:', error)
          throw error
        }
        await refresh()
        return data
      }

      case 'AUTO_GENERATE_SESSIONS': {
        if (!sb) return []
        const yearMonth = action.yearMonth || action.year_month
        const groupId = action.groupId || action.group_id || state.pickleballGroupId || state.pickleballGroup?.id || state.currentGroupId || state.currentGroup?.id
        if (!yearMonth || !groupId) return []
        const config = generationConfigFromState(stateRef.current, yearMonth, action.config || {})
        const scheduleWeekdays = normalizeScheduleWeekdays(config.scheduleWeekdays)
        if (scheduleWeekdays.length === 0) {
          console.warn('[store] AUTO_GENERATE_SESSIONS: missing schedule weekdays', { groupId, yearMonth })
          return []
        }
        const { start, end } = getMonthRange(yearMonth)
        const { data: existingRows, error: existingError } = await sb
          .from('pickle_sessions')
          .select('id,session_date,status')
          .eq('group_id', groupId)
          .gte('session_date', start)
          .lte('session_date', end)
        if (existingError) {
          console.error('[store] AUTO_GENERATE_SESSIONS existing check:', existingError)
          throw existingError
        }
        const sessions = generateMonthSessions(yearMonth, {
          ...config,
          scheduleWeekdays,
        })
        const scheduleWeekdaySet = new Set(scheduleWeekdays)
        let validSessions = sessions.filter(session => scheduleWeekdaySet.has(isoWeekdayFromDate(session.date)))
        if (validSessions.length !== sessions.length) {
          console.warn('[store] AUTO_GENERATE_SESSIONS: skipped sessions outside schedule weekdays', {
            groupId,
            yearMonth,
            skipped: sessions.length - validSessions.length,
          })
        }
        const existingDateSet = new Set([
          ...safeArray(existingRows).map(row => String(row.session_date || '').slice(0, 10)),
          ...[
            ...safeArray(stateRef.current?.pickle?.sessions),
            ...safeArray(stateRef.current?.pickle?.upcoming),
            ...safeArray(stateRef.current?._allPickle?.sessions),
          ]
            .filter(session => String(session?.groupId || session?.group_id || '') === String(groupId))
            .map(session => String(sessionDateValue(session) || '').slice(0, 10))
            .filter(date => date.startsWith(`${yearMonth}-`)),
        ].filter(Boolean))
        validSessions = validSessions.filter(session => !existingDateSet.has(session.date))
        if (validSessions.length === 0) {
          await refresh()
          return []
        }
        const rows = validSessions.map(session => ({
          group_id: groupId,
          session_date: session.date,
          start_time: session.startTime,
          court: session.court,
          status: 'scheduled',
          created_by_member_id: state.currentUserId || null,
        }))
        const { error } = await sb
          .from('pickle_sessions')
          .insert(rows)
        if (error) {
          console.error('[store] AUTO_GENERATE_SESSIONS:', error)
          throw error
        }
        await refresh()
        return validSessions
      }

      case 'APPROVE_JOIN_REQUEST': {
        if (!sb) return
        const requestId = action.requestId ?? action.p_request_id
        if (!requestId) return
        const { data, error } = await sb.rpc('approve_join_request', {
          p_request_id: requestId,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] APPROVE_JOIN_REQUEST:', err)
          throw err
        }
        scheduleRefresh()
        return data
      }

      case 'REJECT_JOIN_REQUEST': {
        if (!sb) return
        const requestId = action.requestId ?? action.p_request_id
        if (!requestId) return
        const { data, error } = await sb.rpc('reject_join_request', {
          p_request_id: requestId,
        })
        if (error || data?.error) {
          const err = error || new Error(data.error)
          console.error('[store] REJECT_JOIN_REQUEST:', err)
          throw err
        }
        scheduleRefresh()
        return data
      }

      case 'BATCH_MARK_PICKLEBALL_ATTENDANCE': {
        if (!sb) return
        const { sessionId, changes } = action
        if (!sessionId || !changes?.length) return
        const session = findPickleSessionInState(stateRef.current, sessionId)
        const sourceTable = session?.sourceTable || session?.source_table
        if (sourceTable === 'pickleball_sessions') {
          const { error } = await sb.from('pickleball_attendance').upsert(
            changes.map(({ memberId, status }) => ({ session_id: sessionId, member_id: memberId, status })),
            { onConflict: 'session_id,member_id' }
          )
          if (error) throw error
        } else {
          const { error } = await sb.from('pickle_attendees').upsert(
            changes.map(({ memberId, status }) => ({
              session_id: sessionId,
              member_id: memberId,
              attendee_type: 'member',
              rsvp_status: status === 'present' ? 'going' : 'not_going',
              attended: status === 'present',
            })),
            { onConflict: 'session_id,member_id' }
          )
          if (error) throw error
        }
        await refresh()
        break
      }

      case 'MARK_PICKLEBALL_ATTENDANCE': {
        if (!sb) return
        const { sessionId, memberId } = action
        const status = String(action.status || (action.attending === false ? 'absent' : 'present')).toLowerCase() === 'absent'
          ? 'absent'
          : 'present'
        if (!sessionId || !memberId) return
        const session = findPickleSessionInState(stateRef.current, sessionId)
        const sourceTable = session?.sourceTable || session?.source_table
        if (sourceTable === 'pickleball_sessions') {
          const { error } = await sb.from('pickleball_attendance').upsert(
            { session_id: sessionId, member_id: memberId, status },
            { onConflict: 'session_id,member_id' }
          )
          if (error) throw error
        } else {
          const { error } = await sb.from('pickle_attendees').upsert(
            {
              session_id: sessionId,
              member_id: memberId,
              attendee_type: 'member',
              rsvp_status: status === 'present' ? 'going' : 'not_going',
              attended: status === 'present',
            },
            { onConflict: 'session_id,member_id' }
          )
          if (error) throw error
        }
        await refresh()
        break
      }

      case 'COMPLETE_PICKLEBALL_SESSION': {
        if (!sb) return
        const { sessionId } = action
        if (!sessionId) return
        const session = findPickleSessionInState(stateRef.current, sessionId)
        const sourceTable = session?.sourceTable || session?.source_table
        const table = sourceTable === 'pickleball_sessions' ? 'pickleball_sessions' : 'pickle_sessions'
        const { error } = await sb
          .from(table)
          .update({ status: 'completed' })
          .eq('id', sessionId)
        if (error) throw error

        if (table === 'pickle_sessions') {
          const allMembers = safeArray(stateRef.current?.pickle?.fixedMembers)
            .filter(m => m?.is_active !== false && m?.isActive !== false)
          const existingRecords = safeArray(session?.attendanceRecords || session?.attendance_records)
          const recordedMemberIds = new Set(existingRecords.map(r => String(r.memberId || r.member_id)))
          const unrecordedMembers = allMembers.filter(m => !recordedMemberIds.has(String(m.id)))
          if (unrecordedMembers.length > 0) {
            await sb.from('pickle_attendees').upsert(
              unrecordedMembers.map(m => ({
                session_id: sessionId,
                member_id: m.id,
                attendee_type: 'member',
                rsvp_status: 'going',
                attended: true,
              })),
              { onConflict: 'session_id,member_id' }
            )
          }
        }

        await refresh()
        break
      }

      case 'REOPEN_PICKLEBALL_SESSION': {
        if (!sb) return
        const { sessionId } = action
        if (!sessionId) return
        const session = findPickleSessionInState(stateRef.current, sessionId)
        const replacementSessions = replacementSessionsForOrigin(stateRef.current, session)
        await Promise.all(replacementSessions.map(async replacement => {
          if ((replacement?.sourceTable || replacement?.source_table) !== 'pickle_sessions') {
            const { error: hideError } = await hideReplacementSession(sb, replacement)
            if (hideError) throw hideError
            return
          }
          const { error: deleteError } = await sb
            .from('pickle_sessions')
            .delete()
            .eq('id', replacement.id)
          if (deleteError) {
            const { error: hideError } = await hideReplacementSession(sb, replacement)
            if (hideError) throw hideError
          }
        }))
        const sourceTable = session?.sourceTable || session?.source_table
        const table = sourceTable === 'pickleball_sessions' ? 'pickleball_sessions' : 'pickle_sessions'
        const { error } = await sb
          .from(table)
          .update({ status: 'scheduled', notes: null })
          .eq('id', sessionId)
        if (error) throw error
        await refresh()
        break
      }

      case 'CLEANUP_STALE_REPLACEMENT_SESSIONS': {
        if (!sb) return
        const sessions = staleReplacementSessions(stateRef.current, action.ids)
        if (sessions.length === 0) return
        await Promise.all(sessions.map(async session => {
          const { error } = await hideReplacementSession(sb, session)
          if (error) throw error
        }))
        await refresh()
        break
      }

      case 'RESCHEDULE_PICKLEBALL_SESSION': {
        if (!sb) return
        const { sessionId, newDate } = action
        if (!sessionId || !newDate) return
        const session = findPickleSessionInState(stateRef.current, sessionId)
        if (!session || isDoneStatus(session?.status) || isMovedStatus(session?.status)) return
        const sourceTable = session?.sourceTable || session?.source_table
        const table = sourceTable === 'pickleball_sessions' ? 'pickleball_sessions' : 'pickle_sessions'
        const movedNote = String(action.notes || '').trim()
        const oldDate = sessionDateValue(session)
        if (newDate === oldDate) throw new Error('reschedule_same_date')
        const groupId = session?.groupId || session?.group_id || state.currentGroupId
        const conflictingSession = activePickleSessionOnDate(stateRef.current, newDate, groupId, [sessionId])
        if (conflictingSession) throw new Error('reschedule_date_conflict')
        const originDate = rescheduleOriginDate(session) || oldDate
        const replacementPayload = {
          group_id: groupId,
          session_date: newDate,
          start_time: session?.startTime || session?.start_time || null,
          court: session?.court || null,
          status: 'scheduled',
          notes: replacementNote(originDate, oldDate, newDate, movedNote),
          created_by_member_id: state.currentUserId || null,
        }
        const reusableReplacement = reusableReplacementSessionOnDate(stateRef.current, newDate, groupId, [sessionId])
        if (reusableReplacement) {
          const { error: updateReplacementError } = await sb
            .from('pickle_sessions')
            .update(replacementPayload)
            .eq('id', reusableReplacement.id)
          if (updateReplacementError) throw updateReplacementError
        } else {
          const { error: insertError } = await sb
            .from('pickle_sessions')
            .insert(replacementPayload)
          if (insertError) throw insertError
        }

        const { error: cancelError } = await sb
          .from(table)
          .update({
            status: 'cancelled',
            notes: replacementPayload.notes,
          })
          .eq('id', sessionId)
        if (cancelError) throw cancelError
        await refresh()
        break
      }

      case 'CONFIRM_ATTENDANCE': {
        if (!sb) return
        const { sessionId, memberId, attending } = action
        if (!sessionId || !memberId) return
        const session = findPickleSessionInState(stateRef.current, sessionId)
        const sourceTable = session?.sourceTable || session?.source_table
        const status = attending === false ? 'absent' : 'present'
        if (sourceTable === 'pickleball_sessions') {
          const { error } = await sb.from('pickleball_attendance').upsert(
            { session_id: sessionId, member_id: memberId, status },
            { onConflict: 'session_id,member_id' }
          )
          if (error) throw error
        } else {
          const { error } = await sb.from('pickle_attendees').upsert(
            {
              session_id: sessionId,
              member_id: memberId,
              attendee_type: 'member',
              rsvp_status: attending === false ? 'not_going' : 'going',
              attended: attending !== false,
            },
            { onConflict: 'session_id,member_id' }
          )
          if (error) throw error
        }
        await refresh()
        break
      }

      case 'REMOVE_SESSION_GUEST': {
        const { sessionId, attendeeId } = action
        const next = removeSessionGuestFromState(stateRef.current, sessionId, attendeeId)
        stateRef.current = next
        setState(next)
        return next
      }

      case 'ADD_PICKLE_SESSION': {
        if (!sb) return
        const { date, notes, attendeeIds } = action
        const { data: newSession, error } = await sb
          .from('pickle_sessions')
          .insert({
            group_id: state.pickleballGroupId || state.currentGroupId,
            session_date: date,
            status: action.status || 'external',
            notes: notes || null,
          })
          .select()
          .single()
        if (error) { console.error('[store] ADD_PICKLE_SESSION:', error); return }
        if (attendeeIds?.length > 0) {
          await sb.from('pickle_attendees').insert(
            attendeeIds.map(memberId => ({
              session_id: newSession.id,
              member_id: memberId,
              is_guest: false,
            }))
          )
        }
        await refresh()
        break
      }

      case 'APPROVE_EXPENSE': {
        const { expenseId } = action
        const expense = stateRef.current.groups
          .flatMap(g => g.expenses || [])
          .find(e => e.id === expenseId)
        const { error } = await sb.from('expenses').update({
          status: 'approved',
          reviewed_by_member_id: state.currentUserId,
          reviewed_at: new Date().toISOString(),
        }).eq('id', expenseId)
        if (error) { console.error('[store] APPROVE_EXPENSE:', error); throw error }
        if (expense) {
          broadcastChange('expenses', 'UPDATE', {
            submitted_by_member_id: expense.submittedBy,
            title: expense.title,
            status: 'approved',
          })
        }
        await refresh()
        break
      }
      case 'DECLINE_EXPENSE': {
        const { expenseId, reason } = action
        const expense = stateRef.current.groups
          .flatMap(g => g.expenses || [])
          .find(e => e.id === expenseId)
        const { error } = await sb.from('expenses').update({
          status: 'declined',
          reviewed_by_member_id: state.currentUserId,
          reviewed_at: new Date().toISOString(),
          decline_reason: reason,
        }).eq('id', expenseId)
        if (error) { console.error('[store] DECLINE_EXPENSE:', error); throw error }
        if (expense) {
          broadcastChange('expenses', 'UPDATE', {
            submitted_by_member_id: expense.submittedBy,
            title: expense.title,
            status: 'declined',
          })
        }
        await refresh()
        break
      }
      case 'SUBMIT_DISPUTE': {
        const { expenseId, note } = action
        const { error } = await sb.from('expense_disputes').insert({
          expense_id: expenseId,
          raised_by: state.currentUserId,
          note,
        })
        if (error) { console.error('[store] SUBMIT_DISPUTE:', error); throw error }
        await refresh()
        break
      }

      case 'ADD_PICKLE_EXPENSE': {
        const isTreasurer = state.members.find(m => m.id === state.currentUserId)?.role === 'treasurer'
        dispatch({
          type: 'ADD_EXPENSE',
          groupId: state.currentGroupId,
          expense: { ...action.expense, pickleSessionId: action.sessionId },
          isTreasurer,
        })
        break
      }

      case 'ADD_EXTERNAL_TICKET':
      case 'TOGGLE_UPCOMING':
      case 'ADD_PICKLE_MEMBER':
        console.warn(`[store] ${action.type}: not implemented in Phase 4`)
        break

      case 'SET_CURRENT_USER':
        break

      default:
        console.warn('[store] Unknown action:', action.type)
    }
  }, [state.currentUserId, state.currentGroupId, refresh, scheduleRefresh, broadcastChange])

  useEffect(() => {
    const token = tokenRef.current
    if (!state.currentUserId || !token) return

    const sb = createSupabase(token)
    const channel = sb
      .channel('expenses-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
      }, (payload) => {
        if (isExpenseRealtimeFromCurrentUser(payload, stateRef.current.currentUserId)) return

        scheduleRefresh()
        const message = expenseRealtimeToastMessage(payload, stateRef.current.members)
        if (message) dispatch({ type: 'SHOW_TOAST', message })
      })
      .subscribe((status, err) => {
        if (err) {
          console.error('[expenses-realtime]', status, err)
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [state.currentUserId, scheduleRefresh, dispatch])

  return (
    <AppContext.Provider value={{ state, dispatch, genId }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
