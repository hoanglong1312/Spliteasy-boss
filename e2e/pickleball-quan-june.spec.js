import { expect, test } from '@playwright/test'

// Test token inserted via Supabase for Anh Quân (no PIN, member_type fixed, in fixed_member_ids June 2026)
const QUAN_TOKEN = '98306397d8472732f7e3a55d02ec944c9fc9c02408c605b188521bf04ecef113'
const QUAN_MEMBER = {
  id: 'e5a3f621-112a-4214-8ae1-bed5e76d40f8',
  group_id: '11111111-1111-1111-1111-111111111111',
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
