import { test, expect } from "@playwright/test";

test("signup, login, and dashboard access", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-1");
  await page.getByLabel("Confirm password").fill("correct-horse-1");
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page.getByRole("status")).toContainText("verify your account");

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated user is redirected away from the admin panel", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login/);
});

// A 1x1 PNG — the smallest thing the avatars bucket's allowed_mime_types will accept.
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test("uploaded avatar is rendered back after a reload", async ({ page }) => {
  const email = `e2e-avatar-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-1");
  await page.getByLabel("Confirm password").fill("correct-horse-1");
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page.getByRole("status")).toContainText("verify your account");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto("/settings");
  await expect(page.getByText("No avatar")).toBeVisible();

  await page.getByLabel("Upload avatar").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await expect(page.getByAltText("Your avatar")).toBeVisible();

  // The real regression this guards: the upload used to be write-only (no avatar_url
  // column, no read path), so the avatar vanished on the next page load.
  await page.reload();
  await expect(page.getByAltText("Your avatar")).toBeVisible();
  await expect(page.getByText("No avatar")).toHaveCount(0);
});
