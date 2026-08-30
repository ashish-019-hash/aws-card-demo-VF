import { expect, test } from './fixtures';
import { adminUser, businessUser, primaryNav, signIn, signOut, uniqueId } from './helpers';

test.describe('E-005 report ownership', () => {
  test('allows only the report owner to retrieve a report and its content', async ({ page }) => {
    const secondUser = uniqueId('RP');
    await signIn(page, adminUser);
    await page.getByRole('button', { name: /Create user/ }).click();
    await page.getByLabel('User ID').fill(secondUser);
    await page.getByLabel('First name').fill('Report');
    await page.getByLabel('Last name').fill('Reader');
    await page.getByLabel('Password').fill('Report123!');
    await page.getByRole('button', { name: 'Create user', exact: true }).click();
    await signOut(page);

    await signIn(page, businessUser);
    await primaryNav(page).getByRole('link', { name: 'Reports' }).click();
    const created = page.waitForResponse(response => response.url().endsWith('/api/reports') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Generate report' }).click();
    const reportId = (await (await created).json()).data.id as string;
    await expect(page.getByText('Report completed')).toBeVisible();
    await signOut(page);

    await signIn(page, { userId: secondUser, password: 'Report123!' });
    const denied = await page.evaluate(async report => {
      const response = await fetch(`/api/reports/${report}/content`);
      return { status: response.status, body: await response.json() };
    }, reportId);
    expect(denied.status).toBe(403);
    expect(denied.body.error.message).toContain('another user');

    await signOut(page);
    await signIn(page, adminUser);
    await page.getByRole('button', { name: `Edit user ${secondUser}` }).click();
    await page.getByRole('button', { name: 'Delete user' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete user' }).click();
  });

  test.skip('TODO(P0 design): define whether report contents must be account-scoped or back-office all-account scoped', async () => {
    // Do not treat current all-account content as correct until the product design resolves report scoping.
  });
});
