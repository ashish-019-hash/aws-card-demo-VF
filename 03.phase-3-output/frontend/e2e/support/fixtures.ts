import { expect, test as base, type Page } from '@playwright/test'
import { seeded } from './test-data'

type AuthenticatedPage = {
  signInAsStandardUser: () => Promise<void>
  signInAsAdministrator: () => Promise<void>
}

async function signIn(page: Page, userId: string, password: string) {
  await page.goto('/sign-in')
  await page.getByLabel('User ID').fill(userId)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Workspace' })).toBeVisible()
}

export const test = base.extend<AuthenticatedPage>({
  signInAsStandardUser: async ({ page }, use) => {
    await use(() => signIn(page, seeded.standardUser.userId, seeded.standardUser.password))
  },
  signInAsAdministrator: async ({ page }, use) => {
    await use(() => signIn(page, seeded.administrator.userId, seeded.administrator.password))
  },
})

export { expect }
