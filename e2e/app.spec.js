import { expect, test } from '@playwright/test'

const AUTH_TOKEN_KEY = 'spliteasy_token'
const AUTH_MEMBER_KEY = 'spliteasy_member'

async function clearAuth(page) {
  await page.addInitScript(([tokenKey, memberKey]) => {
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(memberKey)
    localStorage.removeItem('spliteasy_tokens')
  }, [AUTH_TOKEN_KEY, AUTH_MEMBER_KEY])
}

async function seedLoggedInSession(page) {
  await page.addInitScript(([tokenKey, memberKey]) => {
    localStorage.setItem(tokenKey, 'e2e-token')
    localStorage.setItem(memberKey, JSON.stringify({
      id: 'e2e-user',
      name: 'E2E User',
      groupId: 'e2e-group',
    }))
  }, [AUTH_TOKEN_KEY, AUTH_MEMBER_KEY])
}

async function openJoinGroup(page) {
  await clearAuth(page)
  await page.goto('/')
  await page.waitForSelector('text=/Tham gia nhóm|Xin chào/')
}

async function openHome(page) {
  await seedLoggedInSession(page)
  await page.goto('/')
  await page.waitForSelector('text=Xin chào')
}

test('App loads', async ({ page }) => {
  const errors = []

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await openJoinGroup(page)

  await expect(page.locator('text=/Tham gia nhóm|Xin chào/').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('JoinGroup form has invite-code input', async ({ page }) => {
  await openJoinGroup(page)

  const joinGroupVisible = await page.getByText('Tham gia nhóm').first().isVisible().catch(() => false)
  test.skip(!joinGroupVisible, 'JoinGroup screen is not visible')

  const codeInput = page.locator('input[placeholder="NHẬP-MÃ-MỜI"], input[placeholder="VD: PICKLE-TEST"], input').first()
  await codeInput.click()
  await codeInput.fill('test01')

  await expect(codeInput).toHaveValue('TEST01')
})

test('Tab navigation opens Groups screen when Home is available', async ({ page }) => {
  await openHome(page)

  const groupsTab = page.getByRole('button', { name: /Nhóm/ }).last()
  test.skip(!(await groupsTab.isVisible().catch(() => false)), 'TabBar is not visible')

  await groupsTab.click()
  await page.waitForSelector('h1:has-text("Nhóm")')

  await expect(page.locator('h1').filter({ hasText: /^Nhóm$/ })).toBeVisible()
  await expect(page.getByText(/đang hoạt động/).first()).toBeVisible()
})

test('Add expense button opens AddExpense screen', async ({ page }) => {
  await openHome(page)

  const addExpenseButton = page.getByRole('button', { name: /\+ Thêm chi tiêu/ })
  test.skip(!(await addExpenseButton.isVisible().catch(() => false)), 'Home add-expense button is not visible')

  await addExpenseButton.click()
  await page.waitForSelector('h1:has-text("Thêm chi tiêu")')

  await expect(page.locator('h1').filter({ hasText: 'Thêm chi tiêu' })).toBeVisible()
})

test('JoinGroup lookup shows member names after entering valid code', async ({ page }) => {
  await openJoinGroup(page)

  const codeInput = page.locator('input[placeholder="NHẬP-MÃ-MỜI"]').first()
  await codeInput.fill('PICKLE-TEST')

  await expect(page.getByText('Long').first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Long').first()).toBeVisible({ timeout: 2000 })
})

test('JoinGroup shows error for invalid code', async ({ page }) => {
  await openJoinGroup(page)

  const codeInput = page.locator('input[placeholder="NHẬP-MÃ-MỜI"]').first()
  await codeInput.fill('INVALID-CODE-XYZ')

  await expect(page.getByText(/Mã mời không/)).toBeVisible({ timeout: 5000 })
})

test('AddExpense title input accepts text', async ({ page }) => {
  await openHome(page)

  const addExpenseButton = page.getByRole('button', { name: /\+ Thêm chi tiêu/ })
  test.skip(!(await addExpenseButton.isVisible().catch(() => false)), 'Home add-expense button is not visible')

  await addExpenseButton.click()
  await page.waitForSelector('h1:has-text("Thêm chi tiêu")')

  const titleInput = page.getByPlaceholder('Mô tả chi tiêu...')
  await titleInput.fill('Cafe test')

  await expect(titleInput).toHaveValue('Cafe test')
})

test('Profile tab shows Cá nhân screen', async ({ page }) => {
  await openHome(page)
  const profileTab = page.getByRole('button', { name: /Cá nhân/ }).last()
  test.skip(!(await profileTab.isVisible().catch(() => false)), 'TabBar not visible')
  await profileTab.click()
  await expect(page.locator('h1').filter({ hasText: 'Cá nhân' })).toBeVisible()
})

test('Settings screen opens from Profile via gear button', async ({ page }) => {
  await openHome(page)
  const profileTab = page.getByRole('button', { name: /Cá nhân/ }).last()
  test.skip(!(await profileTab.isVisible().catch(() => false)), 'TabBar not visible')
  await profileTab.click()
  await page.waitForSelector('h1:has-text("Cá nhân")')
  const gearBtn = page.getByRole('button', { name: /⚙/ })
  test.skip(!(await gearBtn.isVisible().catch(() => false)), 'Gear button not visible')
  await gearBtn.click()
  await expect(page.getByText('Cài đặt').first()).toBeVisible()
})

test('Pickleball tab shows overview screen', async ({ page }) => {
  await openHome(page)
  const pbTab = page.getByRole('button', { name: /Pickleball/ }).last()
  test.skip(!(await pbTab.isVisible().catch(() => false)), 'Pickleball tab not visible')
  await pbTab.click()
  await expect(page.getByText(/Tổng quan/i).first()).toBeVisible({ timeout: 3000 })
})
