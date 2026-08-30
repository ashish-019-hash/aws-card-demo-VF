import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { adminUser, primaryNav, signIn, signOut } from './helpers';

async function expectNoAxeViolations(page: Parameters<typeof signIn>[0]) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('E-006 accessibility', () => {
  test('scans sign-in, every business/admin route, and the confirmation dialog', async ({ page }) => {
    await page.goto('/sign-in');
    await expectNoAxeViolations(page);

    await signIn(page);
    for (const route of ['Overview', 'Accounts', 'Cards', 'Transactions', 'Billing', 'Reports']) {
      await primaryNav(page).getByRole('link', { name: route }).click();
      await expectNoAxeViolations(page);
    }

    await primaryNav(page).getByRole('link', { name: 'Billing' }).click();
    await page.getByRole('button', { name: 'Pay full balance' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirm full-balance payment' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Confirm payment' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Confirm payment' })).toBeFocused();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await signOut(page);
    await signIn(page, adminUser);
    await expectNoAxeViolations(page);
  });
});
