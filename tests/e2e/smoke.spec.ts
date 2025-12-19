import { test, expect } from '@playwright/test';

test('Smoke Test: App Loads', async ({ page }) => {
    // Go to the base URL
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // Note: Adjust this string based on your actual document title in index.html
    await expect(page).toHaveTitle(/CRM/);

    // Verify that the dashboard or login appears
    // This helps confirm that React hydration finished
    await expect(page.locator('body')).toBeVisible();
});
