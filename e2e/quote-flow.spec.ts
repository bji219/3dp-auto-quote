import { test, expect } from '@playwright/test';

test.describe('Quote Flow', () => {
  test('homepage loads with upload zone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Instant print quote/i })).toBeVisible();
    await expect(page.getByText('Drop an STL here')).toBeVisible();
  });

  test('prices an STL in the browser without any server call', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', (r) => r.url().includes('/api/') && calls.push(r.url()));
    await page.goto('/');

    // 20 mm cube, binary STL
    const p = [
      [0, 0, 0],
      [20, 0, 0],
      [20, 20, 0],
      [0, 20, 0],
      [0, 0, 20],
      [20, 0, 20],
      [20, 20, 20],
      [0, 20, 20],
    ];
    const f = [
      [0, 3, 2],
      [0, 2, 1],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ];
    const buffer = Buffer.alloc(84 + 12 * 50);
    buffer.writeUInt32LE(12, 80);
    f.forEach((t, i) =>
      t.forEach((v, j) =>
        p[v].forEach((c, k) => buffer.writeFloatLE(c, 84 + i * 50 + 12 + (j * 3 + k) * 4))
      )
    );
    await page.setInputFiles('input[type=file]', {
      name: 'cube.stl',
      mimeType: 'model/stl',
      buffer,
    });

    await expect(page.getByText('20.0 × 20.0 × 20.0 mm')).toBeVisible();
    await expect(page.getByText('8.00 cm³')).toBeVisible();
    const price = page.locator('[aria-live=polite]');
    await expect(price).toHaveText(/^\$\d+\.\d\d$/);
    const one = await price.innerText();
    await page.getByLabel('Quantity', { exact: true }).fill('40');
    await expect(price).not.toHaveText(one);
    expect(calls).toEqual([]);
  });

  test('rejects a non-STL with a useful message', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', {
      name: 'part.step',
      mimeType: 'application/step',
      buffer: Buffer.from('ISO-10303-21;'),
    });
    await expect(page.locator('p[role=alert]')).toContainText('not an STL');
  });

  test('terms of service page loads', async ({ page }) => {
    await page.goto('/terms');

    // Check terms page content
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByText('Agreement to Terms')).toBeVisible();
  });

  test('footer displays copyright', async ({ page }) => {
    await page.goto('/');

    // Check footer
    await expect(page.getByText(/© \d{4} Intelligent Design Works Limited/)).toBeVisible();
  });
});

test.describe('Order Page', () => {
  test('order page shows quote not found for invalid ID', async ({ page }) => {
    await page.goto('/order/invalid-quote-id');

    // Should show not found error
    await expect(page.getByText(/Quote Not Found/i)).toBeVisible();
  });
});
