import { test, expect } from "@playwright/test";

// Assumes a seeded admin account exists in the local Supabase instance
// (seed via supabase/seed.sql: an admin@example.com user with the admin role).
test("admin can view and search the users table", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("admin-password-1");
  await page.getByRole("button", { name: /log in/i }).click();
  // LoginForm submits via a client-side transition (fetch + router.push), not a browser-level
  // navigation, so Playwright's click() doesn't wait for it. Wait for the post-login redirect
  // to land before navigating away, otherwise the goto below can race the login request and
  // cancel it mid-flight.
  await page.waitForURL(/\/dashboard/);

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  await page.getByPlaceholder(/search/i).fill("admin");
  await expect(page.getByText("admin@example.com")).toBeVisible();
});
