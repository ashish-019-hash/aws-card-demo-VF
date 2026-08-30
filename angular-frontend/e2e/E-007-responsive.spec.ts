import { expect, test } from './fixtures';
import { mobileNav, primaryNav, signIn } from './helpers';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
  { name: 'narrow mobile', width: 320, height: 568 }
];

async function expectNoPageOverflow(page: Parameters<typeof signIn>[0]) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    table: document.querySelector('.table')?.scrollWidth ?? 0,
    wrapper: document.querySelector('.table')?.clientWidth ?? 0
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  return dimensions;
}

test.describe('E-007 responsive viewports', () => {
  for (const viewport of viewports) {
    test(`keeps transactions usable at ${viewport.name} ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await signIn(page);
      const nav = viewport.width <= 720 ? mobileNav(page) : primaryNav(page);
      await nav.getByRole('link', { name: 'Transactions' }).click();
      await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
      const dimensions = await expectNoPageOverflow(page);
      expect(dimensions.table).toBeGreaterThan(0);
      if (viewport.width <= 720) expect(dimensions.table).toBeGreaterThan(dimensions.wrapper);
    });
  }

  test('keeps long report content contained at 200% CSS zoom', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page);
    await page.addStyleTag({ content: 'html { zoom: 2; }' });
    await mobileNav(page).getByRole('link', { name: 'Reports' }).click();
    await page.getByRole('button', { name: 'Generate report' }).click();
    await expect(page.locator('pre')).toBeVisible();
    await expectNoPageOverflow(page);
  });
});
