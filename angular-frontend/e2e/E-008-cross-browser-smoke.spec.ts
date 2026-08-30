import { expect, test } from './fixtures';
import { adminUser, primaryNav, signIn, signOut } from './helpers';

test.describe('E-008 cross-browser critical smoke', () => {
  test('supports authentication, business reports, sign-out, and administrator access', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();

    await signIn(page);
    await primaryNav(page).getByRole('link', { name: 'Reports' }).click();
    await expect(page.getByRole('heading', { name: 'Transaction reports' })).toBeVisible();
    await page.getByRole('button', { name: 'Generate report' }).click();
    await expect(page.getByText('Report completed')).toBeVisible();
    await signOut(page);

    await signIn(page, adminUser);
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });
});
