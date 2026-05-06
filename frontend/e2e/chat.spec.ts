/**
 * E2E: Chat Flow
 *
 * Verifies the chat interface loads, input works,
 * and messages render with correct visual treatment.
 */
import { test, expect } from '@playwright/test';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const demoBtn = page.locator('text=体验一下');
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForURL('/');
    }
    // Navigate to chat
    await page.click('a[href="/chat"], .nav-item >> text=💭');
    await page.waitForURL('**/chat');
  });

  test('chat page shows bot name', async ({ page }) => {
    await expect(page.locator('text=小苗')).toBeVisible();
  });

  test('input field is visible and focusable', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first();
    await expect(input).toBeVisible();
    await input.focus();
    // Input focus wrapper should activate
    const wrapper = page.locator('.input-focus-wrapper');
    if (await wrapper.count() > 0) {
      await expect(wrapper.first()).toBeVisible();
    }
  });

  test('can type in chat input', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('你好');
    await expect(input).toHaveValue('你好');
  });

  test('chat view fills available height', async ({ page }) => {
    const chatHeight = await page.evaluate(() => {
      const el = document.querySelector('[style*="100dvh"]') ||
                 document.querySelector('[style*="calc(100"]');
      return el ? el.getBoundingClientRect().height : 0;
    });
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    // Chat should take up most of the viewport
    expect(chatHeight).toBeGreaterThan(viewportHeight * 0.7);
  });

  test('new chat button exists', async ({ page }) => {
    const newChatBtn = page.locator('text=新对话, text=New Chat, button >> text=+').first();
    await expect(newChatBtn).toBeVisible({ timeout: 5000 });
  });
});
