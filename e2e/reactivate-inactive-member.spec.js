import { expect, test } from '@playwright/test'

const AUTH_TOKEN_KEY = 'spliteasy_token'
const AUTH_MEMBER_KEY = 'spliteasy_member'

const GROUP_ID = '11111111-1111-1111-1111-111111111111'
const PB_GROUP_ID = '22222222-2222-2222-2222-222222222222'
const ME_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const MINH_ANH_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ME_PROFILE = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const MINH_ANH_PROFILE = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const groupRow = {
  id: GROUP_ID,
  name: 'Chi tiêu Virgo 246',
  emoji: '🏓',
  color: '#574EFA',
  description: '',
  invite_code: 'V246',
  linked_pickleball_group_id: PB_GROUP_ID,
}

const meRow = {
  id: ME_ID,
  name: 'Long',
  group_id: GROUP_ID,
  profile_id: ME_PROFILE,
  role: 'treasurer',
  is_active: true,
  expense_active: true,
  member_type: 'fixed',
}

const minhAnhRow = {
  id: MINH_ANH_ID,
  name: 'Minh Anh',
  group_id: GROUP_ID,
  profile_id: MINH_ANH_PROFILE,
  role: 'member',
  is_active: true,
  expense_active: false,
  member_type: 'fixed',
}

const profiles = [
  { id: ME_PROFILE, name: 'Long' },
  { id: MINH_ANH_PROFILE, name: 'Minh Anh' },
]

const tableData = {
  groups: [groupRow],
  members: [meRow, minhAnhRow],
  profiles,
  member_tokens: [],
  expenses: [],
  expense_participants: [],
  settlements: [],
  settlement_periods: [],
  period_payments: [],
  pickle_configs: [],
  pickleball_monthly_config: [],
  pickle_sessions: [],
  pickle_attendees: [],
  pickleball_sessions: [],
  pickleball_attendance: [],
  pickleball_session_items: [],
  pickleball_tickets: [],
  pickleball_owner_payments: [],
  expense_disputes: [],
  join_requests: [],
}

test('reactivate Minh Anh in expense group calls add_expense_group_member rpc', async ({ page }) => {
  const rpcCalls = []
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await page.addInitScript(([tokenKey, memberKey, meId, groupId]) => {
    localStorage.setItem(tokenKey, 'mock-token')
    localStorage.setItem(memberKey, JSON.stringify({ id: meId, name: 'Long', groupId }))
  }, [AUTH_TOKEN_KEY, AUTH_MEMBER_KEY, ME_ID, GROUP_ID])

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.split('/rest/v1/')[1] || ''
    const table = path.split('?')[0]
    const rows = tableData[table] || []
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rows),
    })
  })

  await page.route('**/rpc/**', async (route) => {
    const url = new URL(route.request().url())
    const fn = url.pathname.split('/rpc/')[1]
    let body = null
    try { body = route.request().postDataJSON() } catch {}
    rpcCalls.push({ fn, body })
    if (fn === 'add_expense_group_member') {
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(MINH_ANH_ID) })
    }
    return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: 'null' })
  })

  await page.goto('/')
  await page.waitForSelector('text=Xin chào', { timeout: 10000 })
  await page.click('text=Nhóm')
  await page.click('text=Chi tiêu Virgo 246')
  await page.click('text=Thành viên')
  // "Thêm thành viên" is inside the FAB menu — open FAB first via aria-label
  await page.click('button[aria-label="Thêm"]', { timeout: 5000 })
  await page.waitForSelector('text=Thêm thành viên', { timeout: 3000 })
  await page.click('text=Thêm thành viên')
  await page.waitForSelector('text=Thêm lại vào nhóm', { timeout: 5000 })
  await page.click('text=Minh Anh')
  await page.click('button:has-text("Thêm 1 thành viên")')

  await page.waitForFunction(() => true, null, { timeout: 1000 })

  const reactivateCalls = rpcCalls.filter((call) => call.fn === 'add_expense_group_member')
  expect(reactivateCalls, `RPC calls so far: ${JSON.stringify(rpcCalls)}`).toHaveLength(1)
  expect(reactivateCalls[0].body.p_member_id).toBe(MINH_ANH_ID)
  expect(reactivateCalls[0].body.p_group_id).toBe(GROUP_ID)
  expect(reactivateCalls[0].body.p_name).toBe('Minh Anh')
  const meaningful = consoleErrors.filter((msg) => !/Warning: A props object containing a "key" prop/.test(msg))
  expect(meaningful, `console errors: ${JSON.stringify(meaningful)}`).toEqual([])
})
