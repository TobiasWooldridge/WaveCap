import { expect, test } from "@playwright/test";

test("loads the WaveCap shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("WaveCap", { exact: true })).toBeVisible();
});

test("shows the stream sidebar and sort control", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app-stream-sidebar")).toBeVisible();
  await expect(page.getByLabel("Sort:")).toBeVisible();
});

test("opens and closes the settings dialog", async ({ page }) => {
  await page.goto("/");

  const settingsButton = page.getByRole("button", { name: "Settings" });
  await settingsButton.click();

  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();

  const closeButton = dialog.getByRole("button", { name: "Close settings" });
  await closeButton.click();
  await expect(dialog).toBeHidden();
});
