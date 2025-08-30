// tests/e2e/auth.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('user can sign up', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/signup');

    // Fill signup form
    await page.fill('input[name="email"]', 'newuser@test.com');
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');

    // Accept terms
    await page.check('input[name="terms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/onboarding');

    // Verify welcome message
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('user can log in', async ({ page }) => {
    // Navigate to login
    await page.click('text=Log In');
    await expect(page).toHaveURL('/login');

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('shows validation errors for invalid input', async ({ page }) => {
    await page.click('text=Sign Up');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Username is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();

    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email address')).toBeVisible();

    // Test weak password
    await page.fill('input[name="password"]', 'weak');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('user can reset password', async ({ page }) => {
    await page.click('text=Log In');
    await page.click('text=Forgot Password?');

    await expect(page).toHaveURL('/forgot-password');

    // Enter email
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    // First log in
    await loginUser(page);

    // Open user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('text=Log Out');

    // Verify logged out
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Log In')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login?redirect=/dashboard');
  });

  test('redirects back after login', async ({ page }) => {
    await page.goto('/communities');
    await expect(page).toHaveURL('/login?redirect=/communities');

    // Log in
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should redirect back to communities
    await expect(page).toHaveURL('/communities');
  });
});

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}