import { expect, test } from './fixtures';
import { signIn, signOut } from './helpers';

test.describe('E-003 authentication, deep link, and sign-out', () => {
  test('redirects protected deep links, allows a role route after sign-in, then signs out', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();

    await signIn(page);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Transaction reports' })).toBeVisible();

    await signOut(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Transaction reports' })).toHaveCount(0);
    await expect(page.locator('pre')).toHaveCount(0);
  });
});
