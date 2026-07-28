import { test, expect, type Page } from "@playwright/test";

// Assumes a seeded admin account exists in the local Supabase instance
// (seed via supabase/seed.sql: an admin@example.com user with the admin role).
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin-password-1";

// A 1x1 PNG — the smallest thing the avatars bucket's allowed_mime_types will accept.
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

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

// Every test in this file reuses "Target User" as the display name, so the local dev DB
// accumulates several identically-named rows across repeated runs (nothing here deletes
// what it creates) — scoping by the row containing the caller's own unique email, rather
// than matching the link by name, keeps this exact instead of ambiguous once more than one
// same-named row is on screen at once (whether from a prior run or the Search box briefly
// still showing the unfiltered list while the filtered request is in flight).
async function openUserDetail(page: Page, email: string) {
  await page.getByPlaceholder(/search/i).fill(email);
  await page.getByRole("button", { name: /^search$/i }).click();
  await page.getByRole("row").filter({ hasText: email }).getByRole("link").click();
  await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f-]{36}/);
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
  // Opening the detail page at all is itself a regression test: a user with more than one
  // user_roles row made getUserById's .single() throw, which is what the seeded admin used
  // to hit on its own detail page.
  await openUserDetail(page, targetEmail);
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

test("admin can edit another user's name and avatar", async ({ page }) => {
  const targetEmail = `e2e-profile-${Date.now()}@example.com`;
  await signupThroughUi(page, targetEmail);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/users");
  await openUserDetail(page, targetEmail);

  await page.getByLabel("First name").fill("Renamed");
  await page.getByLabel("Last name").fill("Person");
  await page.getByRole("button", { name: /save profile/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile updated successfully" })).toBeVisible();
  // CardTitle (src/components/ui/card.tsx) renders a plain <div>, not a semantic heading
  // element, so this is a text match rather than getByRole("heading", ...).
  await expect(page.getByText("Renamed Person")).toBeVisible();

  await expect(page.getByText("No avatar")).toBeVisible();
  await page.getByLabel("Upload avatar for this user").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await expect(page.getByRole("status").filter({ hasText: "Avatar updated successfully" })).toBeVisible();
  await expect(page.getByAltText("Renamed Person's avatar")).toBeVisible();

  // Both changes must survive a reload — i.e. they were really persisted through the
  // caller's own RLS-scoped client (per adminService.updateUserProfile/uploadUserAvatar),
  // not just optimistically reflected in the client cache.
  await page.reload();
  await expect(page.getByLabel("First name")).toHaveValue("Renamed");
  await expect(page.getByLabel("Last name")).toHaveValue("Person");
  await expect(page.getByAltText("Renamed Person's avatar")).toBeVisible();
});

test("admin cannot demote or suspend their own account", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/users");
  await openUserDetail(page, ADMIN_EMAIL);

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
