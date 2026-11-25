import { expect, test } from '@playwright/test';

test('administrator can sign in and open the SIM inventory', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@sansolution.in');
  await page.getByLabel('Password').fill('Admin@12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('link', { name: /SIM Inventory/i }).click();
  await expect(page).toHaveURL(/\/sims$/);
  await expect(page.getByRole('heading', { name: 'SIM Inventory' })).toBeVisible();
});
