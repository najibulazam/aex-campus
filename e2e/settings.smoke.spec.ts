import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/");
}

test.describe("settings smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !email || !password,
      "Set E2E_EMAIL and E2E_PASSWORD to run authenticated settings smoke tests."
    );

    await login(page);
  });

  test("falls back to profile tab", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/tab=profile/);
    await expect(page.getByRole("button", { name: "Profile" })).toBeVisible();
  });

  test("warns on unsaved tab switch and blocks navigation when dismissed", async ({ page }) => {
    await page.goto("/settings?tab=profile");
    await page.getByPlaceholder("Display name").fill(`Smoke-${Date.now()}`);

    const dialogPromise = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "Preferences" }).click();
    const dialog = await dialogPromise;

    expect(dialog.message()).toContain("You have unsaved changes");
    await dialog.dismiss();

    await expect(page).toHaveURL(/tab=profile/);
  });

  test("warns on refresh when there are unsaved changes", async ({ page }) => {
    await page.goto("/settings?tab=profile");
    await page.getByPlaceholder("Display name").fill(`Reload-${Date.now()}`);

    const dialogPromise = page.waitForEvent("dialog");
    await page.reload();
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe("beforeunload");
    await dialog.dismiss();
    await expect(page).toHaveURL(/tab=profile/);
  });
});
