import { test, expect } from '@playwright/test';

test.describe('Quote Flow', () => {
  test('homepage loads with upload zone', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(page.getByRole('heading', { name: /IDW3D Print Quote/i })).toBeVisible();

    // Check upload zone is present
    await expect(page.getByText('Drag & drop your STL file')).toBeVisible();
    await expect(page.getByText('or click to browse')).toBeVisible();
  });

  test('displays progress steps', async ({ page }) => {
    await page.goto('/');

    // Check progress indicators
    await expect(page.getByText('Upload STL')).toBeVisible();
    await expect(page.getByText('Preview')).toBeVisible();
    await expect(page.getByText('Get Quote')).toBeVisible();
  });

  test('shows how it works section', async ({ page }) => {
    await page.goto('/');

    // Check the info boxes at the bottom
    await expect(page.getByRole('heading', { name: 'Upload STL' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preview Model' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get Quote' })).toBeVisible();
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
    await expect(page.getByText(/© 2026 IDW3D/)).toBeVisible();
  });
});

test.describe('Order Page', () => {
  test('order page shows quote not found for invalid ID', async ({ page }) => {
    await page.goto('/order/invalid-quote-id');

    // Should show not found error
    await expect(page.getByText(/Quote Not Found/i)).toBeVisible();
  });
});
