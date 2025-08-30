import { test, expect } from '@playwright/test';

test.describe('Basic E2E Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/Skool/);

    // Check for main content areas
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate to communities page', async ({ page }) => {
    await page.goto('/');

    // Navigate to communities
    await page.getByRole('link', { name: /communities/i }).click();

    // Check if we're on the communities page
    await expect(page).toHaveURL(/.*communities/);
    await expect(page.locator('h1')).toContainText('Communities');
  });

  test('should handle user authentication flow', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect or show success message
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display 404 for non-existent pages', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Should show 404 error
    await expect(page.locator('h1')).toContainText('404');
  });
});