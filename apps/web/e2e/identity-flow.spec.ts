import { expect, test, type Page } from "@playwright/test";

const username = process.env.E2E_USERNAME ?? "spike-user";
const password = process.env.E2E_PASSWORD ?? "local-spike-password";

test("user signs in, verifies organization context, and signs out", async ({
  page,
}) => {
  await openLogin(page);
  await enterUsername(page);

  await page.locator("#password").fill(password);
  await page.locator("button.primary-button").click({ noWaitAfter: true });

  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(
    page.getByRole("heading", { name: "Authenticated" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Verify with Core" }).click();
  await expect(page.getByText("Verified by Core API")).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "demo-workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "bubllio-core-api" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:8180\/realms\/bubllio/);
  await expect(page.locator("#username")).toBeVisible();
});

test("password reset keeps its value and switches between English and Greek", async ({
  page,
}) => {
  await openLogin(page);
  await enterUsername(page);
  await openPasswordReset(page);
  await switchToEnglish(page);

  await expect(
    page.getByRole("heading", { name: "Forgot Your Password?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username or email")).toHaveValue(username);

  await page.getByRole("link", { name: "ΕΛ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  await expect(
    page.getByRole("heading", { name: "Forgot Your Password?" }),
  ).not.toBeVisible();
  await expect(page.getByLabel(/όνομα χρήστη|email/i)).toHaveValue(username);

  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Forgot Your Password?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username or email")).toHaveValue(username);
});

test("password reset fits a narrow mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLogin(page);
  await enterUsername(page);
  await openPasswordReset(page);
  await switchToEnglish(page);

  await expect(
    page.getByRole("region", { name: "Bubllio Identity" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Languages" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "One account. Every Bubllio workspace.",
    }),
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Forgot Your Password?" }),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

async function openLogin(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/127\.0\.0\.1:8180\/realms\/bubllio/);
  await expect(
    page.getByRole("region", { name: "Bubllio Identity" }),
  ).toBeVisible();
  await expect(page.locator("#username")).toBeVisible();
  await switchToEnglish(page);
}

async function enterUsername(page: Page): Promise<void> {
  await page.locator("#username").fill(username);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.locator("#password")).toBeVisible();
}

async function openPasswordReset(page: Page): Promise<void> {
  await page.locator('a[href*="reset-credentials"]').click();
}

async function switchToEnglish(page: Page): Promise<void> {
  if ((await page.locator("html").getAttribute("lang")) !== "en") {
    await page.getByRole("link", { name: "EN", exact: true }).click();
  }
}
