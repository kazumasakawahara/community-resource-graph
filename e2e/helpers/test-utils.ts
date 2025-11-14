/**
 * E2E Test Helper Utilities
 *
 * Common utilities for E2E tests to reduce code duplication
 * and improve test reliability.
 */

import { Page, expect } from '@playwright/test';

/**
 * Login helper for authenticated test scenarios
 */
export async function login(page: Page, email: string = 'test@example.com', password: string = 'password123') {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to complete
  await page.waitForURL(/\/(resources)?$/, { timeout: 5000 }).catch(() => {
    // Login might have failed, tests will handle this
  });
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  const logoutButton = page.getByText(/ログアウト|Logout/);
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/\/login/);
  }
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Wait for network graph to be ready
 */
export async function waitForNetworkGraph(page: Page, timeout: number = 10000) {
  await page.waitForSelector('svg', { timeout });
  await page.waitForSelector('svg circle', { timeout });

  // Wait for initial force simulation to stabilize
  await page.waitForTimeout(1000);
}

/**
 * Get SVG bounding box safely
 */
export async function getSvgBoundingBox(page: Page) {
  const svg = page.locator('svg');
  const box = await svg.boundingBox();

  if (!box) {
    throw new Error('SVG element not found or not visible');
  }

  return box;
}

/**
 * Get center point of SVG
 */
export async function getSvgCenter(page: Page) {
  const box = await getSvgBoundingBox(page);
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

/**
 * Simulate zoom interaction
 */
export async function zoomIn(page: Page, deltaY: number = -100) {
  const center = await getSvgCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(300);
}

/**
 * Simulate zoom out interaction
 */
export async function zoomOut(page: Page, deltaY: number = 100) {
  await zoomIn(page, deltaY);
}

/**
 * Get first node circle element
 */
export async function getFirstNode(page: Page) {
  return page.locator('svg circle').first();
}

/**
 * Drag node to new position
 */
export async function dragNode(page: Page, nodeLocator: any, deltaX: number, deltaY: number) {
  const box = await nodeLocator.boundingBox();

  if (!box) {
    throw new Error('Node not found or not visible');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

/**
 * Check if tooltip is visible
 */
export async function isTooltipVisible(page: Page) {
  const tooltip = page.locator('.network-tooltip');
  return await tooltip.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Get depth selector value
 */
export async function getDepthValue(page: Page) {
  const select = page.locator('select');
  return await select.inputValue();
}

/**
 * Set depth selector value
 */
export async function setDepthValue(page: Page, depth: string) {
  const select = page.locator('select');
  await select.selectOption(depth);
  await page.waitForTimeout(500);
}

/**
 * Check if error message is displayed
 */
export async function hasErrorMessage(page: Page) {
  const errorText = page.getByText('エラーが発生しました');
  return await errorText.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Check if loading indicator is displayed
 */
export async function isLoading(page: Page) {
  const loadingText = page.getByText('ネットワークを読み込んでいます');
  return await loadingText.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Get network statistics
 */
export async function getNetworkStats(page: Page) {
  const statsText = await page.getByText(/接続数:/).textContent();

  if (!statsText) {
    return { nodes: 0, relationships: 0 };
  }

  const nodeMatch = statsText.match(/(\d+)\s*資源/);
  const relMatch = statsText.match(/(\d+)\s*関係/);

  return {
    nodes: nodeMatch ? parseInt(nodeMatch[1]) : 0,
    relationships: relMatch ? parseInt(relMatch[1]) : 0
  };
}

/**
 * Navigate to network graph page
 */
export async function navigateToNetworkGraph(page: Page, resourceId: string = 'res_050') {
  await page.goto(`/resources/${resourceId}/network`);
  await waitForNetworkGraph(page);
}
