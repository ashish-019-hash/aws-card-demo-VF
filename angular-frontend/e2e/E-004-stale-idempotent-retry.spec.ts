import { expect, test } from './fixtures';
import { accountVersion, transactionEvidence } from './db';
import { accountId, firstCardNumber, primaryNav, signIn, uniqueId } from './helpers';

test.describe('E-004 stale updates and idempotent retry', () => {
  test('receives a real stale ETag response and safely retries a real lost transaction response', async ({ page }) => {
    await signIn(page);
    await primaryNav(page).getByRole('link', { name: 'Accounts' }).click();
    await page.getByRole('button', { name: 'Edit account' }).click();

    const before = await accountVersion(accountId);
    const concurrent = await page.evaluate(async ({ id, creditLimit }) => {
      const current = await fetch(`/api/accounts/${id}`);
      const etag = current.headers.get('etag');
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'If-Match': etag ?? '' },
        body: JSON.stringify({ creditLimit })
      });
      return { status: response.status, etag: response.headers.get('etag') };
    }, { id: accountId, creditLimit: Number(before.credit_limit) + 1 });
    expect(concurrent.status).toBe(200);

    const stale = page.waitForResponse(response => response.url().endsWith(`/api/accounts/${accountId}`) && response.request().method() === 'PATCH');
    await page.getByRole('spinbutton', { name: 'Credit limit', exact: true }).fill(String(Number(before.credit_limit) + 2));
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await stale).status()).toBe(412);
    await expect(page.getByRole('alert')).toContainText('record changed elsewhere');
    expect((await accountVersion(accountId)).version).toBeGreaterThan(before.version);

    await primaryNav(page).getByRole('link', { name: 'Transactions' }).click();
    await page.getByRole('link', { name: /Create transaction/ }).click();
    const description = `E2E lost ${uniqueId('TX')}`;
    await page.getByLabel('Card number').fill(firstCardNumber);
    await page.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('8.76');
    await page.getByLabel('Description').fill(description);
    await page.getByLabel('Merchant name').fill('Retry Market');
    await page.getByLabel('Merchant city').fill('Portland');

    let idempotencyKey = '';
    await page.route('**/api/transactions', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      idempotencyKey = route.request().headers()['idempotency-key'];
      // Let the real request commit, then drop only the browser response: a lost-response retry.
      await route.fetch();
      await route.abort('connectionreset');
      await page.unroute('**/api/transactions');
    });

    await page.getByRole('button', { name: 'Create transaction' }).click();
    await expect(page.getByRole('alert')).toContainText('Unable to reach the service');
    expect(idempotencyKey).toMatch(/^[!-~]{8,128}$/);
    expect((await transactionEvidence(description)).count).toBe(1);

    const replay = page.waitForResponse(response => response.url().endsWith('/api/transactions') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create transaction' }).click();
    const replayResponse = await replay;
    expect(replayResponse.status()).toBe(200);
    expect(replayResponse.request().headers()['idempotency-key']).toBe(idempotencyKey);
    await expect(page).toHaveURL(/\/transactions$/);
    expect((await transactionEvidence(description)).count).toBe(1);
  });
});
