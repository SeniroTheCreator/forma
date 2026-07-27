import { test, expect, type Page } from "@playwright/test";

// Assumes a seeded admin account exists in the local Supabase instance
// (seed via supabase/seed.sql: an admin@example.com user with the admin role).
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin-password-1";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  // LoginForm submits via a client-side transition (fetch + router.push), not a browser-level
  // navigation, so Playwright's click() doesn't wait for it. Wait for the post-login redirect
  // to land before navigating away, otherwise the goto below can race the login request and
  // cancel it mid-flight.
  await page.waitForURL(/\/dashboard/);
}

async function signupThroughUi(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("First name").fill("Target");
  await page.getByLabel("Last name").fill("User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-1");
  await page.getByLabel("Confirm password").fill("correct-horse-1");
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page.getByRole("status")).toContainText("verify your account");
}

test("admin can view and search the users table", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  await page.getByPlaceholder(/search/i).fill("admin");
  await page.getByRole("button", { name: /^search$/i }).click();
  await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
});

test("admin can change another user's role and suspend their account", async ({ page }) => {
  const targetEmail = `e2e-target-${Date.now()}@example.com`;
  await signupThroughUi(page, targetEmail);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/users");
  await page.getByPlaceholder(/search/i).fill(targetEmail);
  await page.getByRole("button", { name: /^search$/i }).click();

  // Opening the detail page at all is itself a regression test: a user with more than one
  // user_roles row made getUserById's .single() throw, which is what the seeded admin used
  // to hit on its own detail page.
  await page.getByRole("link", { name: /target user/i }).click();
  await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f-]{36}/);
  await expect(page.getByText(targetEmail)).toBeVisible();
  await expect(page.getByLabel("Role")).toHaveValue("user");

  await page.getByLabel("Role").selectOption("admin");
  await page.getByRole("button", { name: /save role/i }).click();
  // Toasts stack (and only auto-dismiss after 5s), so each assertion targets its own.
  await expect(page.getByRole("status").filter({ hasText: "Role updated successfully" })).toBeVisible();
  await expect(page.getByLabel("Role")).toHaveValue("admin");

  await page.getByRole("button", { name: /suspend account/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "User suspended" })).toBeVisible();
  await expect(page.getByRole("button", { name: /reactivate account/i })).toBeVisible();

  // Both changes must survive a reload — i.e. they were really persisted, not just
  // optimistically reflected in the client cache.
  await page.reload();
  await expect(page.getByLabel("Role")).toHaveValue("admin");
  await expect(page.getByRole("button", { name: /reactivate account/i })).toBeVisible();
});

test("admin cannot demote or suspend their own account", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/users");
  await page.getByPlaceholder(/search/i).fill(ADMIN_EMAIL);
  await page.getByRole("button", { name: /^search$/i }).click();
  await page.getByRole("link", { name: /admin user/i }).click();

  // There is no bootstrap/re-promotion flow, so a successful self-demotion or
  // self-suspension here would permanently lock the admin panel.
  await page.getByLabel("Role").selectOption("user");
  await page.getByRole("button", { name: /save role/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Failed to update role" })).toBeVisible();

  await page.getByRole("button", { name: /suspend account/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Failed to update account status" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Role")).toHaveValue("admin");
  await expect(page.getByRole("button", { name: /suspend account/i })).toBeVisible();

  // Still an admin: the admin panel is still reachable.
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
});
