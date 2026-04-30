import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/tools',
  '/mp4-to-gif',
  '/gif-resizer',
  '/faq',
  '/privacy'
];

for (const route of routes) {
  test(`${route} has no horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('#page-title')).toBeVisible();

    const overflowing = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;

      return Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((element) => element.scrollWidth > viewportWidth || element.getBoundingClientRect().right > viewportWidth + 1)
        .slice(0, 10)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className.toString(),
          scrollWidth: element.scrollWidth,
          right: Math.round(element.getBoundingClientRect().right),
          viewportWidth
        }));
    });

    expect(overflowing).toEqual([]);
  });
}

test('mobile navigation opens without layout overflow', async ({ page }) => {
  await page.goto('/');
  const menuToggle = page.locator('#menu-toggle');

  if (await menuToggle.isVisible()) {
    await menuToggle.click();
    await expect(page.locator('#site-navigation')).toHaveAttribute('data-open', 'true');
  } else {
    await expect(page.locator('#site-navigation')).toBeVisible();
  }

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});

test('home page visual snapshot', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#page-title')).toBeVisible();
  await expect(page).toHaveScreenshot(`home-${testInfo.project.name}.png`, {
    fullPage: true,
    animations: 'disabled'
  });
});
