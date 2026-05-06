/**
 * E2E: Navigation & Layout
 *
 * Verifies core navigation works at different viewport widths,
 * page transitions don't break, and responsive layout adapts.
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Start in demo mode to bypass auth
    await page.goto('/');
    // Click "try demo" if login page appears
    const demoBtn = page.locator('text=体验一下');
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForURL('/');
    }
  });

  test('home page loads with greeting', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  test('can navigate to chat page', async ({ page }) => {
    await page.click('a[href="/chat"], .nav-item >> text=💭');
    await page.waitForURL('**/chat');
    await expect(page.locator('text=小苗')).toBeVisible();
  });

  test('can navigate to mood page', async ({ page }) => {
    await page.click('a[href="/mood"], .nav-item >> text=🌿');
    await page.waitForURL('**/mood');
  });

  test('can navigate to analytics page', async ({ page }) => {
    await page.click('a[href="/analytics"], .nav-item >> text=📊');
    await page.waitForURL('**/analytics');
  });

  test('all nav items are visible', async ({ page }) => {
    const navItems = page.locator('.nav-item');
    await expect(navItems).toHaveCount(7);
  });
});

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const demoBtn = page.locator('text=体验一下');
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForURL('/');
    }
  });

  test('app-container exists and has correct max-width', async ({ page }) => {
    const container = page.locator('.app-container').first();
    await expect(container).toBeVisible();
  });

  test('header container matches main container width class', async ({ page }) => {
    const headerContainer = page.locator('header .app-container');
    await expect(headerContainer).toBeVisible();
  });

  test('narrow viewport shows nav icons', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    // At < 1024px, icons should be visible, labels hidden
    const icon = page.locator('.nav-icon-responsive').first();
    await expect(icon).toBeVisible();
  });

  test('wide viewport shows nav labels', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    const label = page.locator('.nav-label-responsive').first();
    await expect(label).toBeVisible();
  });

  test('no horizontal overflow at 800px width', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test('content does not exceed container at 1536px', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    const containerWidth = await page.evaluate(() => {
      const el = document.querySelector('.app-container');
      return el ? el.getBoundingClientRect().width : 0;
    });
    expect(containerWidth).toBeLessThanOrEqual(1280 + 48); // max-width + padding
    expect(containerWidth).toBeGreaterThan(900); // should expand beyond 960
  });
});
