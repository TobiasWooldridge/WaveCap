import { expect, test } from "@playwright/test";

test("loads the WaveCap shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("WaveCap", { exact: true })).toBeVisible();
});
