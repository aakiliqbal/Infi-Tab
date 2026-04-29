import { expect, test } from "@playwright/test";

test("new tab shell renders core surfaces", async ({ page }) => {
  await page.goto("/newtab.html");

  await expect(page.getByRole("button", { name: "Open settings menu" })).toBeVisible();
  await expect(page.getByLabel(/Search with/i)).toBeVisible();
  await expect(page.getByLabel("Quick links")).toBeVisible();
});

test("settings drawer renders backup controls", async ({ page }) => {
  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Open settings menu" }).click();

  await expect(page.getByRole("heading", { name: "Backup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export JSON backup" })).toBeVisible();
  await expect(page.getByText("Import JSON backup")).toBeVisible();
});
