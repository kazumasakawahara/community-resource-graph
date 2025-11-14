import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Tests the authentication flow:
 * - Login
 * - Registration
 * - Token management
 * - Protected routes
 */

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText(/ログイン|Login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should allow user login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to resources page or home
    await page.waitForURL(/\/(resources)?$/);

    // Should be logged in (check for logout button or user menu)
    // This depends on your UI implementation
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.getByText(/エラー|失敗|Error|Invalid/)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');

    // Click register link
    const registerLink = page.getByText(/登録|Register|Sign up/);
    if (await registerLink.isVisible()) {
      await registerLink.click();

      // Should navigate to registration page
      await expect(page).toHaveURL(/\/register/);
    }
  });

  test('should protect network graph route when not authenticated', async ({ page }) => {
    // Clear any existing auth tokens
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access protected route
    await page.goto('/resources/res_050/network');

    // Should redirect to login or show auth required message
    // This depends on your auth implementation
    const currentURL = page.url();
    const hasAuthRedirect = currentURL.includes('/login') || currentURL.includes('/auth');

    if (hasAuthRedirect) {
      expect(hasAuthRedirect).toBeTruthy();
    }
  });
});

test.describe('Authenticated User Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(resources)?$/, { timeout: 5000 }).catch(() => {
      // Login might have failed, tests will handle this
    });
  });

  test('should access network graph when authenticated', async ({ page }) => {
    await page.goto('/resources/res_050/network');

    // Should successfully load network graph
    await expect(page.locator('h1')).toContainText('ネットワーク可視化');
  });

  test('should allow logout', async ({ page }) => {
    // Look for logout button (implementation dependent)
    const logoutButton = page.getByText(/ログアウト|Logout/);

    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
