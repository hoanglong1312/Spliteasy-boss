import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const dataSource = readFileSync(new URL('./hooks/useScreenData.js', import.meta.url), 'utf8')
const calendarSource = readFileSync(new URL('./screens/PickleballCalendar.jsx', import.meta.url), 'utf8')
const batchSource = readFileSync(new URL('./screens/BatchEntry.jsx', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./screens/PickleballSettings.jsx', import.meta.url), 'utf8')
const overviewSource = readFileSync(new URL('./screens/PickleballOverview.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('./app-v2.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('./store.jsx', import.meta.url), 'utf8')

function loadScreenDataBuilders() {
  const fixedNow = new Date('2026-05-20T12:00:00')
  class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(fixedNow)
      else super(...args)
    }

    static now() {
      return fixedNow.getTime()
    }
  }

  const source = dataSource
    .replace(/import \{ useEffect, useMemo, useRef \} from 'react'\n/, '')
    .replace(/import \{ useApp \} from '\.\.\/store\.jsx'\n/, '')
    .replace(/import \{[\s\S]*?\} from '\.\.\/data\.jsx'\n/, '')
    .replace('export function useScreenData', 'function useScreenData')

  const context = {
    Date: FixedDate,
    Math,
    Intl,
    console,
    fmtVNDFull: value => `${value}`,
    groupBalance: () => ({}),
    groupNet: () => 0,
    pickleSummary: () => ({ memberOwes: {} }),
    recentActivity: () => [],
  }
  vm.runInNewContext(`${source}\nglobalThis.__builders = { buildPickleballCalendarData }`, context)
  return context.__builders
}

test('calendar selected session exposes water and extra costs from pickleball session items', () => {
  const { buildPickleballCalendarData } = loadScreenDataBuilders()
  const state = {
    currentUserId: 'm1',
    currentGroupId: 'g1',
    currentGroup: { id: 'g1', name: 'CLB' },
    members: [
      { id: 'm1', groupId: 'g1', name: 'An', role: 'treasurer', memberType: 'fixed' },
      { id: 'm2', groupId: 'g1', name: 'Long', role: 'member', memberType: 'fixed' },
    ],
    pickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', startTime: '19:00', status: 'completed', attendees: ['m1', 'm2'] },
      ],
      monthlyConfigs: [],
      fixedMembers: ['m1', 'm2'],
    },
    _allPickle: {
      sessions: [
        { id: 's1', groupId: 'g1', date: '2026-05-20', startTime: '19:00', status: 'completed', attendees: ['m1', 'm2'] },
      ],
      sessionItems: [
        { id: 'w1', sessionId: 's1', session_id: 's1', name: 'Nước', amount: 45000, memberIds: null, member_ids: null },
        { id: 'x1', sessionId: 's1', session_id: 's1', name: 'Bóng thi đấu', amount: 90000, memberIds: ['m1'], member_ids: ['m1'] },
      ],
      monthlyConfigs: [],
    },
  }

  const data = buildPickleballCalendarData(state)

  assert.equal(data.selectedSession.id, 's1')
  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.costs)), {
    waterAmount: 45000,
    extras: [
      { id: 'x1', note: 'Bóng thi đấu', amount: 90000, memberIds: ['m1'] },
    ],
  })
  assert.deepEqual(JSON.parse(JSON.stringify(data.selectedSession.members.map(member => member.id))), ['m1', 'm2'])
})

test('calendar detail panel contains the P1 session-cost editor contract', () => {
  assert.match(calendarSource, /Chi phí buổi này/)
  assert.match(calendarSource, /Phụ phát sinh/)
  assert.match(calendarSource, /\+ Thêm phát sinh/)
  assert.match(calendarSource, /onAction\?\.\('saveSessionCost'/)
  assert.match(calendarSource, /memberIds/)
})

test('batch entry sends batch water saves and can cancel back', () => {
  assert.match(batchSource, /onAction\?\.\('saveBatchCosts'/)
  assert.match(batchSource, /sessions:\s*sessions\.map/)
  assert.match(batchSource, /onAction\?\.\('back'\)/)
  assert.match(batchSource, /Tổng nước tháng/)
  assert.match(batchSource, /Phát sinh/)
  assert.match(batchSource, /position:\s*'sticky'[\s\S]*bottom:\s*0[\s\S]*background:\s*colors\.pageBg[\s\S]*zIndex:\s*10/)
  assert.match(batchSource, /memberIds:\s*\[\]/)
  assert.doesNotMatch(batchSource, /memberIds:\s*\(members \|\| \[\]\)\.map\(member => member\.id\)/)
})

test('app handlers persist session water and extras through pickleball_session_items', () => {
  assert.match(appSource, /type === 'saveSessionCost'/)
  assert.match(appSource, /\.from\('pickleball_session_items'\)[\s\S]*?\.upsert\(/)
  assert.match(appSource, /name: 'Nước'/)
  assert.match(appSource, /\.delete\(\)[\s\S]*?\.eq\('session_id', sessionId\)[\s\S]*?\.neq\('name', 'Nước'\)/)
  assert.match(appSource, /\.insert\([\s\S]*?member_ids/)
  assert.match(appSource, /type === 'saveBatchCosts'/)
})

test('store loads pickleball_session_items into normalized pickle state', () => {
  assert.match(storeSource, /sb\.from\('pickleball_session_items'\)\.select\('\*'\)/)
  assert.match(storeSource, /pickleballSessionItems/)
  assert.match(storeSource, /sessionItems/)
})

test('quick monthly water entry moved from settings to overview', () => {
  assert.doesNotMatch(settingsSource, /📋 Nhập nhanh chi phí tháng này/)
  assert.doesNotMatch(settingsSource, /onAction\?\.\('batchEntry'\)/)
  assert.match(overviewSource, /📋 Nhập nhanh tiền nước/)
  assert.match(overviewSource, /onAction\?\.\('batchEntry'\)/)
})
