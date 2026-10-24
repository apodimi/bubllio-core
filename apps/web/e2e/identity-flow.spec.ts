import { expect, test, type Page } from "@playwright/test";

import {
  clearLocalInbox,
  getLocalEmailContent,
  waitForLocalEmail,
} from "./support/mailpit";

const username = process.env.E2E_USERNAME ?? "spike-user";
const password = process.env.E2E_PASSWORD ?? "local-spike-password";
const email = process.env.E2E_EMAIL ?? "spike-user@example.test";

test("user signs in, sees the Core workspace, and signs out", async ({
  page,
}) => {
  await page.route("**/api/v1/me/organizations", (route) =>
    route.fulfill({ json: [] }),
  );
  await openLogin(page);
  await enterUsername(page);

  await page.locator("#password").fill(password);
  await page.locator("button.primary-button").click({ noWaitAfter: true });

  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(
    page.getByRole("heading", { name: "Your applications" }),
  ).toBeVisible();
  await expect(
    page.getByText("You do not have an active Core organization yet."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Creating an account alone does not grant workspace access.",
      {
        exact: false,
      },
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:8180\/realms\/bubllio/);
  await expect(page.locator("#username")).toBeVisible();
});

test("workspace switches organizations and shows only their granted apps", async ({
  page,
}) => {
  const salesOrganizationId = "00000000-0000-0000-0000-000000000001";
  const projectOrganizationId = "00000000-0000-0000-0000-000000000002";
  await page.route("**/api/v1/me/organizations", (route) =>
    route.fulfill({
      json: [
        { id: salesOrganizationId, displayName: "Sales" },
        { id: projectOrganizationId, displayName: "Projects" },
      ],
    }),
  );
  await page.route("**/api/v1/organizations/*/applications", (route) =>
    route.fulfill({
      json: route.request().url().includes(salesOrganizationId)
        ? [
            {
              key: "bubllio-crm",
              displayName: "CRM",
              launchUrl: "https://crm.example.test",
            },
          ]
        : [
            {
              key: "bubllio-board",
              displayName: "Board",
              launchUrl: "https://board.example.test",
            },
          ],
    }),
  );

  await openLogin(page);
  await enterUsername(page);
  await page.locator("#password").fill(password);
  await page.locator("button.primary-button").click({ noWaitAfter: true });

  await expect(
    page.getByRole("link", { name: "CRM Open application" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "CRM Open application" }),
  ).toHaveAttribute(
    "href",
    `https://crm.example.test/?organization_id=${salesOrganizationId}`,
  );
  await expect(
    page.getByRole("link", { name: "Board Open application" }),
  ).toHaveCount(0);
  await page.getByLabel("Organization").selectOption(projectOrganizationId);
  await expect(
    page.getByRole("link", { name: "Board Open application" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Board Open application" }),
  ).toHaveAttribute(
    "href",
    `https://board.example.test/?organization_id=${projectOrganizationId}`,
  );
  await expect(
    page.getByRole("link", { name: "CRM Open application" }),
  ).toHaveCount(0);
});

test("first-run screen claims setup and resumes the owner operation", async ({
  page,
}) => {
  await page.route("**/api/v1/setup/current", (route) =>
    route.fulfill({ json: { state: "unclaimed" } }),
  );
  await page.route("**/api/v1/setup/claim", (route) =>
    route.fulfill({ status: 201, json: { status: "claimed" } }),
  );
  await page.route("**/api/v1/setup/organization", (route) =>
    route.fulfill({
      status: 202,
      json: {
        id: "00000000-0000-0000-0000-000000000021",
        status: "awaiting_owner",
        organizationId: "00000000-0000-0000-0000-000000000022",
        correlationId: "00000000-0000-0000-0000-000000000021",
        safeErrorCode: "OWNER_INVITATION_PENDING",
        reauthenticationRequired: false,
        stages: [
          { name: "core_organization", status: "complete" },
          { name: "identity_organization", status: "complete" },
          { name: "owner_membership", status: "in_progress" },
          { name: "token_refresh", status: "queued" },
        ],
      },
    }),
  );

  await openLogin(page);
  await enterUsername(page);
  await page.locator("#password").fill(password);
  await page.locator("button.primary-button").click({ noWaitAfter: true });
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );
  await page.goto("/setup");

  await expect(page.getByLabel("One-time setup secret")).toBeVisible();
  await page
    .getByLabel("One-time setup secret")
    .fill("test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Organization name").fill("Example Team");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(
    page.getByText("A membership invitation was sent to your email.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Enter the setup secret again")).toHaveValue("");
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});

test("first-run screen opens browser registration for a new owner", async ({
  page,
}) => {
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );
  await page.route("**/protocol/openid-connect/registrations?**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Owner registration</h1>",
    }),
  );

  await page.goto("/");
  await expect(page).toHaveURL("http://127.0.0.1:5174/setup");
  await expect(
    page.getByRole("button", { name: "I already have an account" }),
  ).toHaveCount(0);
  await expect(page.locator("#username")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Create administrator account" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Owner registration" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/protocol\/openid-connect\/registrations\?/);
});

test("a claimed installation offers continuation instead of another account", async ({
  page,
}) => {
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "in_progress" } }),
  );
  await page.route("**/api/v1/setup/current", (route) =>
    route.fulfill({ json: { state: "unclaimed" } }),
  );
  await page.goto("/");
  await expect(page).toHaveURL("http://127.0.0.1:5174/setup");
  await expect(
    page.getByRole("heading", { name: "Continue installation setup" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create administrator account" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Continue setup" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:8180\/realms\/bubllio/);
  await switchToEnglish(page);
  await enterUsername(page);
  await page.locator("#password").fill(password);
  await page.locator("button.primary-button").click({ noWaitAfter: true });
  await expect(
    page.getByRole("heading", {
      name: "Setup belongs to another administrator",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("One-time setup secret")).toHaveCount(0);
});

test("startup does not open login when the setup status is unavailable or invalid", async ({
  page,
}) => {
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ status: 503, json: { message: "Unavailable" } }),
  );
  await page.goto("/");
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(
    page.getByText("Bubllio could not start.", { exact: false }),
  ).toBeVisible();

  await page.unroute("**/api/v1/setup/status");
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { phase: "new" } }),
  );
  await page.reload();
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(
    page.getByText("Bubllio could not start.", { exact: false }),
  ).toBeVisible();
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
  await expect(page.locator("#username")).toHaveValue(username);

  await page.getByRole("link", { name: "ΕΛ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  await expect(
    page.getByRole("heading", { name: "Forgot Your Password?" }),
  ).not.toBeVisible();
  await expect(page.locator("#username")).toHaveValue(username);

  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Forgot Your Password?" }),
  ).toBeVisible();
  await expect(page.locator("#username")).toHaveValue(username);
});

test("password reset delivers an email to the local inbox", async ({
  page,
}) => {
  await clearLocalInbox();
  await openLogin(page);
  await enterUsername(page);
  await openPasswordReset(page);
  await switchToEnglish(page);

  await page.getByRole("button", { name: "Submit" }).click();

  const message = await waitForLocalEmail(email);
  expect(message.From).toEqual({
    Address: "identity@bubllio.test",
    Name: "Bubllio Identity",
  });
  expect(message.To).toContainEqual({ Address: email, Name: "" });
  expect(message.Subject).toBe("Reset your Bubllio password");

  const content = await getLocalEmailContent(message.ID);
  expect(content.HTML).toContain("bubllio");
  expect(content.HTML).toContain("Reset your password");
  expect(content.HTML).toContain("15 minutes");
  expect(content.Text).toContain("Bubllio Identity");
  expect(content.Text).toContain("15 minutes");
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
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: false, phase: "ready" } }),
  );
  await page.goto("/");
  try {
    await expect(page).toHaveURL(/127\.0\.0\.1:8180\/realms\/bubllio/);
  } catch {
    const { origin, pathname } = new URL(page.url());
    const startupFailed = await page
      .getByText("Bubllio could not start.", { exact: false })
      .isVisible();
    throw new Error(
      `Login did not open at ${origin}${pathname}; startupFailed=${startupFailed}`,
    );
  }
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
  await expect(page.locator("#kc-page-title")).toContainText(
    /Forgot Your Password|Ξεχάσατε/,
  );
}

async function switchToEnglish(page: Page): Promise<void> {
  if ((await page.locator("html").getAttribute("lang")) !== "en") {
    await page.getByRole("link", { name: "EN", exact: true }).click();
  }
}
