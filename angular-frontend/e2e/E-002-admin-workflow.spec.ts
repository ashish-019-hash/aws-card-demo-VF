import { expect, test } from './fixtures';
import { adminUser, signIn, uniqueId } from './helpers';

test.describe('E-002 admin workflow', () => {
  test('an administrator creates and removes a business user', async ({ page }) => {
    const userId = uniqueId('E2E');
    await signIn(page, adminUser);

    await page.getByRole('button', { name: /Create user/ }).click();
    await page.getByLabel('User ID').fill(userId);
    await page.getByLabel('First name').fill('Browser');
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Password').fill('Browser123!');
    await page.getByRole('button', { name: 'Create user', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Users' })).toContainText(userId);

    await page.getByRole('button', { name: `Edit user ${userId}` }).click();
    await page.getByRole('button', { name: 'Delete user' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(`Delete ${userId}?`);
    await dialog.getByRole('button', { name: 'Delete user' }).click();
    await expect(page.getByRole('table', { name: 'Users' })).not.toContainText(userId);
  });
});
