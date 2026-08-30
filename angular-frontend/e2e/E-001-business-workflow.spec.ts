import { expect, test } from './fixtures';
import { accountId, firstCardNumber, primaryNav, signIn } from './helpers';

test.describe('E-001 business workflow', () => {
  test('a business user searches a card and creates a transaction through the UI', async ({ page }) => {
    await signIn(page);

    await primaryNav(page).getByRole('link', { name: 'Cards' }).click();
    await page.getByPlaceholder('Account ID').fill(accountId);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('table', { name: 'Cards' })).toContainText('•••• 5740');

    await primaryNav(page).getByRole('link', { name: 'Transactions' }).click();
    await page.getByRole('link', { name: /Create transaction/ }).click();
    await page.getByLabel('Card number').fill(firstCardNumber);
    await page.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('12.34');
    await page.getByLabel('Description').fill('E2E browser purchase');
    await page.getByLabel('Merchant name').fill('E2E Market');
    await page.getByLabel('Merchant city').fill('Seattle');
    await page.getByRole('button', { name: 'Create transaction' }).click();

    await expect(page).toHaveURL(/\/transactions$/);
    await page.getByPlaceholder('Card number').fill(firstCardNumber);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('table', { name: 'Transactions' })).toContainText('E2E Market');
  });
});
