import { test, expect } from '@playwright/test';

/**
 * Simple E2E Test
 *
 * Basic test to verify the application is running
 */

test.describe('Basic Application Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/homepage.png' });

    // Check if React app loaded
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('should load resources page', async ({ page }) => {
    await page.goto('/resources');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/resources-page.png' });

    // Check if React app loaded
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('should navigate to network graph', async ({ page }) => {
    await page.goto('/resources/resource_001/network');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/network-graph.png' });

    // Check if React app loaded
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Wait a bit for any async rendering
    await page.waitForTimeout(2000);

    // Check console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Log any errors found
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  });
});
