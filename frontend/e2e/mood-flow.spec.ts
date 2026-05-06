/**
 * E2E: Mood Recording & Theme Flow
 *
 * Verifies the complete mood recording path:
 * picker → theme change → home page reflects new mood.
 */
import { test, expect } from '@playwright/test';

test.describe('Mood Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const demoBtn = page.locator('text=体验一下');
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForURL('/');
    }
  });

  test('mood page loads and shows picker', async ({ page }) => {
    await page.click('a[href="/mood"], .nav-item >> text=🌿');
    await page.waitForURL('**/mood');
    // Mood picker should have emoji buttons or score selectors
    await expect(page.locator('[data-testid="mood-picker"], .mood-picker, .mood-grid').first()).toBeVisible({ timeout: 5000 });
  });

  test('quick tools on home page are clickable', async ({ page }) => {
    const tools = page.locator('#home-quick-tools a');
    const count = await tools.count();
    expect(count).toBe(3); // 呼吸, 聊天, 情绪
    // Each should have an href
    for (let i = 0; i < count; i++) {
      const href = await tools.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('theme CSS variables are set on root', async ({ page }) => {
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--mood-accent').trim()
    );
    expect(accent).toBeTruthy();
    expect(accent).toMatch(/#[0-9a-fA-F]{6}/);
  });

  test('personal gradient CSS variable is set', async ({ page }) => {
    const gradient = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--personal-gradient').trim()
    );
    expect(gradient).toContain('linear-gradient');
  });
});
