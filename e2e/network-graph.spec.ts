import { test, expect } from '@playwright/test';

/**
 * Network Graph E2E Tests
 *
 * Tests the interactive network visualization component:
 * - Rendering and display
 * - Interactive features (drag, zoom, hover)
 * - Depth control
 * - Navigation
 */

test.describe('Network Graph Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a resource with network connections
    // Note: This assumes demo data exists in the database
    await page.goto('/');
  });

  test('should display network graph page', async ({ page }) => {
    // This test will verify basic page structure
    // In a real scenario, we'd need to:
    // 1. Login if required
    // 2. Navigate to a resource with connections
    // 3. Click on the network visualization link

    // For now, we'll test the basic structure
    await page.goto('/resources/res_050/network');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for main heading
    await expect(page.locator('h1')).toContainText('ネットワーク可視化');
  });

  test('should show loading state initially', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/resources/*/network*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/resources/res_050/network');

    // Should show loading spinner
    await expect(page.getByText('ネットワークを読み込んでいます')).toBeVisible();
  });

  test('should render SVG network graph', async ({ page }) => {
    await page.goto('/resources/res_050/network');

    // Wait for network to load
    await page.waitForSelector('svg', { timeout: 10000 });

    // Check that SVG exists
    const svg = page.locator('svg');
    await expect(svg).toBeVisible();

    // Check for graph elements
    const circles = page.locator('svg circle');
    await expect(circles.first()).toBeVisible();
  });

  test('should display depth control', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Check for depth selector
    const depthSelect = page.locator('select');
    await expect(depthSelect).toBeVisible();

    // Should have depth options
    await expect(depthSelect.locator('option[value="1"]')).toHaveText(/1段階/);
    await expect(depthSelect.locator('option[value="2"]')).toHaveText(/2段階/);
    await expect(depthSelect.locator('option[value="3"]')).toHaveText(/3段階/);
  });

  test('should change depth when selector is changed', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    const depthSelect = page.locator('select');

    // Change depth to 1
    await depthSelect.selectOption('1');

    // Wait for network to reload
    await page.waitForTimeout(500);

    // Verify selection
    await expect(depthSelect).toHaveValue('1');
  });

  test('should display legend', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Check for legend section
    await expect(page.getByText('凡例')).toBeVisible();

    // Check for legend items
    await expect(page.getByText('中心資源')).toBeVisible();
    await expect(page.getByText('関連資源')).toBeVisible();
    await expect(page.getByText('近接')).toBeVisible();
    await expect(page.getByText('類似')).toBeVisible();
  });

  test('should display usage instructions', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Check for instructions
    await expect(page.getByText('使い方:')).toBeVisible();
    await expect(page.getByText('ノードをクリックして資源詳細ページに移動')).toBeVisible();
    await expect(page.getByText('ノードをドラッグして配置を調整')).toBeVisible();
  });

  test('should support zoom interaction', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    const svg = page.locator('svg');
    const boundingBox = await svg.boundingBox();

    if (boundingBox) {
      // Simulate mouse wheel zoom
      await page.mouse.move(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );

      // Scroll to zoom in
      await page.mouse.wheel(0, -100);

      // Wait for zoom animation
      await page.waitForTimeout(500);

      // SVG should still be visible (zoom functionality exists)
      await expect(svg).toBeVisible();
    }
  });

  test('should support node hover interaction', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg circle');

    // Hover over a node
    const firstCircle = page.locator('svg circle').first();
    await firstCircle.hover();

    // Tooltip should appear
    await expect(page.locator('.network-tooltip')).toBeVisible({ timeout: 1000 });
  });

  test('should support node drag interaction', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg circle');

    const circles = page.locator('svg circle');
    const count = await circles.count();

    // Only test dragging if there are multiple nodes
    // (single nodes may not move in force simulation)
    if (count > 1) {
      const firstCircle = circles.first();
      const initialBox = await firstCircle.boundingBox();

      if (initialBox) {
        // Drag the node
        await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 50, initialBox.y + 50);
        await page.mouse.up();

        // Wait for animation
        await page.waitForTimeout(500);

        // Node should still exist
        await expect(firstCircle).toBeVisible();
      }
    } else {
      // For single nodes, just verify the node is visible and draggable
      const firstCircle = circles.first();
      await expect(firstCircle).toBeVisible();
      expect(await firstCircle.getAttribute('style')).toContain('cursor');
    }
  });

  test('should navigate back to resource detail', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Click back link
    const backLink = page.getByText('資源詳細に戻る');
    await backLink.click();

    // Should navigate to resource detail page
    await expect(page).toHaveURL(/\/resources\/res_050$/);
  });

  test('should display network statistics', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Should show connection count with specific text
    await expect(page.getByText(/接続数: \d+ 資源 \| \d+ 関係/)).toBeVisible();
  });

  test('should handle error state gracefully', async ({ page }) => {
    // Simulate API error
    await page.route('**/api/resources/*/network*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server error' }),
      });
    });

    await page.goto('/resources/res_050/network');

    // Should show error message
    await expect(page.getByText('エラーが発生しました')).toBeVisible();

    // Should show link to go back
    await expect(page.getByText('資源一覧に戻る')).toBeVisible();
  });

  test('should be responsive on smaller screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // SVG should adapt to smaller width
    const svg = page.locator('svg');
    const boundingBox = await svg.boundingBox();

    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }

    // Controls should still be visible and wrapped
    const depthSelect = page.locator('select');
    await expect(depthSelect).toBeVisible();
  });

  test('should maintain aspect ratio on window resize', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Get initial size
    const svg = page.locator('svg');
    const initialBox = await svg.boundingBox();

    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);

    // Get new size
    const newBox = await svg.boundingBox();

    // Width should have changed
    expect(newBox?.width).not.toBe(initialBox?.width);
  });
});

test.describe('Network Graph Visual Tests', () => {
  test('should match visual snapshot for default view', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Wait for force simulation to stabilize
    await page.waitForTimeout(2000);

    // Take screenshot of the graph area
    const container = page.locator('svg').locator('..');
    await expect(container).toHaveScreenshot('network-graph-default.png', {
      maxDiffPixels: 100, // Allow some tolerance for dynamic layout
    });
  });

  test('should match visual snapshot for depth 1', async ({ page }) => {
    await page.goto('/resources/res_050/network');
    await page.waitForSelector('svg');

    // Change to depth 1
    await page.locator('select').selectOption('1');
    await page.waitForTimeout(2000);

    const container = page.locator('svg').locator('..');
    await expect(container).toHaveScreenshot('network-graph-depth1.png', {
      maxDiffPixels: 100,
    });
  });
});
