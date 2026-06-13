import { expect, test } from '@playwright/test'

// Test token for Anh Quân — pickleball group member (member_type fixed, in fixed_member_ids June 2026)
const QUAN_TOKEN = '98306397d8472732f7e3a55d02ec944c9fc9c02408c605b188521bf04ecef113'
const QUAN_MEMBER = {
  id: 'e5a3f621-112a-4214-8ae1-bed5e76d40f8',
  group_id: '11111111-1111-1111-1111-111111111111',
  profile_id: 'd4919cff-68f3-4798-ace8-e548396ba9de',
  name: 'Anh Quân',
  role: 'member',
  member_type: 'fixed',
}

// Test token for Anh Quân — expense group member (production login path via Chi tiêu Virgo 246 invite link)
// sha256('e2b4c6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4') = 018ecc11...
const QUAN_EXPENSE_TOKEN = 'e2b4c6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4'
const QUAN_EXPENSE_MEMBER = {
  id: 'b4838850-d5ab-458e-9925-7dec14b25ffd',
  group_id: '4aa93456-bfb0-4150-aca4-444edc3e95ef',
  profile_id: 'd4919cff-68f3-4798-ace8-e548396ba9de',
  name: 'Anh Quân',
  role: 'member',
  member_type: 'fixed',
}

async function loginAsQuan(page) {
  await page.addInitScript(({ token, member, tokenKey, memberKey }) => {
    localStorage.setItem(tokenKey, token)
    localStorage.setItem(memberKey, JSON.stringify(member))
  }, {
    token: QUAN_TOKEN,
    member: QUAN_MEMBER,
    tokenKey: 'spliteasy_token',
    memberKey: 'spliteasy_member',
  })
}

async function loginAsQuanExpenseGroup(page) {
  await page.addInitScript(({ token, member, tokenKey, memberKey }) => {
    localStorage.setItem(tokenKey, token)
    localStorage.setItem(memberKey, JSON.stringify(member))
  }, {
    token: QUAN_EXPENSE_TOKEN,
    member: QUAN_EXPENSE_MEMBER,
    tokenKey: 'spliteasy_token',
    memberKey: 'spliteasy_member',
  })
}

test('Quân tháng 6: pickleball overview shows 9 thành viên cố định', async ({ page }) => {
  await loginAsQuan(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào, Anh Quân')

  const pbTab = page.getByRole('button', { name: /Pickleball/ }).last()
  await pbTab.click()

  // Header must show 9 members (not 8 — the bug was Quân excluded)
  await expect(page.getByText(/9 thành viên/)).toBeVisible({ timeout: 5000 })
})

test('Quân tháng 6: court fee = 505.556₫ (chia 9, không phải 8)', async ({ page }) => {
  await loginAsQuan(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào, Anh Quân')

  const pbTab = page.getByRole('button', { name: /Pickleball/ }).last()
  await pbTab.click()

  // 4.550.000 / 9 = 505.556 (rounded). If bug active: 4.550.000/8 = 568.750
  await expect(page.getByText(/505\.556/).first()).toBeVisible({ timeout: 5000 })
  // Confirm 568.750 does NOT appear (regression check)
  await expect(page.getByText(/568\.750/)).not.toBeVisible()
})

test('Quân tháng 6: home balance = -505.556₫', async ({ page }) => {
  await loginAsQuan(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào, Anh Quân')

  // Home screen pickleball balance tile
  await expect(page.getByText(/−505\.556|505\.556/).first()).toBeVisible({ timeout: 5000 })
})

// Production login path: Quân logged in via expense group invite link
// Root cause of original bug: expense group member had wrong profile_id → get_my_group_ids() only returned expense group → pickleball config invisible → 0đ
test('Quân expense group login: pickleball overview shows 9 thành viên cố định', async ({ page }) => {
  await loginAsQuanExpenseGroup(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào, Anh Quân')

  const pbTab = page.getByRole('button', { name: /Pickleball/ }).last()
  await pbTab.click()

  await expect(page.getByText(/9 thành viên/)).toBeVisible({ timeout: 5000 })
})

test('Quân expense group login: court fee = 505.556₫ (không phải 0₫)', async ({ page }) => {
  await loginAsQuanExpenseGroup(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào, Anh Quân')

  const pbTab = page.getByRole('button', { name: /Pickleball/ }).last()
  await pbTab.click()

  // Must NOT show 0đ (the original production bug)
  await expect(page.getByText(/SÂN CỦA BẠN.*0\s*₫|0\s*₫.*sân/i)).not.toBeVisible({ timeout: 5000 })
  // Must show correct court fee
  await expect(page.getByText(/505\.556/).first()).toBeVisible({ timeout: 5000 })
})

test('Quân expense group login: home balance không phải 0₫', async ({ page }) => {
  await loginAsQuanExpenseGroup(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào, Anh Quân')

  // Home screen pickleball balance must be non-zero
  await expect(page.getByText(/−505\.556|505\.556/).first()).toBeVisible({ timeout: 5000 })
})
