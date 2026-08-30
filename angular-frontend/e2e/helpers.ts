import { expect, Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

export const accountId = '00000000001';
export const firstCardNumber = '0500024453765740';
export const businessUser = { userId: 'USER0001', password: 'User123!' };
export const adminUser = { userId: 'ADMIN001', password: 'Admin123!' };

export async function signIn(page: Page, user = businessUser) {
  await page.goto('/sign-in');
  await page.getByLabel('User ID').fill(user.userId);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(user === adminUser ? /\/admin\/users$/ : /\/overview$/);
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

export const primaryNav = (page: Page) => page.getByLabel('Primary navigation');
export const mobileNav = (page: Page) => page.getByLabel('Mobile navigation');

export function uniqueId(prefix = 'E') {
  const suffix = randomBytes(4).readUInt32BE(0).toString(36).toUpperCase().padStart(7, '0').slice(-7);
  return `${prefix.slice(0, 1).toUpperCase()}${suffix}`;
}
