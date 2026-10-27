import { expect, test, type Page } from "@playwright/test";

import {
  clearLocalInbox,
  getLocalEmailContent,
  waitForLocalEmail,
} from "./support/mailpit";

const username = process.env.E2E_USERNAME ?? "spike-user";
const password = process.env.E2E_PASSWORD ?? "local-spike-password";
const email = process.env.E2E_EMAIL ?? "spike-user@example.test";

const readySystemChecks = [
  { key: "database", status: "ready" },
  { key: "identity", status: "ready" },
  { key: "migrations", status: "ready" },
  { key: "applications", status: "ready" },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/system/preflight", (route) =>
    route.fulfill({
      status: 200,
      json: { status: "ready", checks: readySystemChecks },
    }),
  );
  await page.route("**/api/v1/setup/email/status", (route) =>
    route.fulfill({
      status: 200,
      json: {
        status: "ready",
        testedAt: "2026-10-24T18:00:00.000Z",
        configuredAt: "2026-10-24T18:01:00.000Z",
      },
    }),
  );
});

test("email delivery is tested and confirmed before account creation", async ({
  page,
}) => {
  await page.unroute("**/api/v1/setup/email/status");
  let emailStatus: "required" | "awaiting_confirmation" | "ready" = "required";
  await page.route("**/api/v1/setup/email/status", (route) =>
    route.fulfill({ json: { status: emailStatus } }),
  );
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );
  let testRequest: { body?: string; secret?: string } = {};
  await page.route("**/api/v1/setup/email/test", async (route) => {
    testRequest = {
      body: route.request().postData() ?? undefined,
      secret: route.request().headers()["x-bubllio-setup-secret"],
    };
    emailStatus = "awaiting_confirmation";
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      json: {
        status: "awaiting_confirmation",
        maskedRecipient: "o•••@example.test",
      },
    });
  });
  let confirmationBody = "";
  const confirmationKeys: string[] = [];
  await page.route("**/api/v1/setup/email/confirm", async (route) => {
    confirmationBody = route.request().postData() ?? "";
    confirmationKeys.push(route.request().headers()["idempotency-key"] ?? "");
    if (confirmationKeys.length === 1) {
      await route.fulfill({
        status: 422,
        json: { code: "EMAIL_CONFIRMATION_INVALID" },
      });
      return;
    }
    emailStatus = "ready";
    await route.fulfill({
      status: 200,
      json: {
        status: "ready",
        testedAt: "2026-10-24T18:00:00.000Z",
        configuredAt: "2026-10-24T18:01:00.000Z",
      },
    });
  });

  await page.goto("/setup");
  await continuePastSystemCheck(page);
  await expect(
    page.getByRole("heading", { name: "Set up email delivery" }),
  ).toBeVisible();
  await page.getByLabel("Sender email").fill("hello@example.test");
  await page.getByLabel("SMTP host").fill("smtp.example.test");
  await page.getByLabel("Username").fill("mailer");
  await page.getByLabel("Password").fill("smtp-password-not-persisted");
  await page.getByLabel("Send the test to").fill("owner@example.test");
  await page
    .getByLabel("One-time setup secret")
    .fill("test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Send test email" }).click();

  const sendingButton = page.getByRole("button", {
    name: "Sending a secure test…",
  });
  await expect(sendingButton).toBeDisabled();
  await expect(sendingButton.getByRole("progressbar")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Enter the confirmation code" }),
  ).toBeVisible();
  await expect(page.getByText("o•••@example.test")).toBeVisible();
  expect(JSON.parse(testRequest.body ?? "{}")).toMatchObject({
    senderName: "Bubllio",
    senderEmail: "hello@example.test",
    host: "smtp.example.test",
    port: 587,
    security: "starttls",
    username: "mailer",
    password: "smtp-password-not-persisted",
    testRecipient: "owner@example.test",
  });
  expect(testRequest.secret).toBe(
    "test-only-setup-secret-with-sufficient-length",
  );
  await expect(page.getByLabel("One-time setup secret")).toHaveValue("");

  await page.getByLabel("Confirmation code").fill("482913");
  await page
    .getByLabel("One-time setup secret")
    .fill("test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Confirm email delivery" }).click();
  await expect(
    page.getByText(
      "That confirmation code is not valid or has expired. Send another test if needed.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Confirmation code")).toHaveValue("");
  await expect(page.getByLabel("One-time setup secret")).toHaveValue("");

  await page.getByLabel("Confirmation code").fill("482913");
  await page
    .getByLabel("One-time setup secret")
    .fill("test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Confirm email delivery" }).click();
  await expect(
    page.getByRole("heading", { name: "Create the administrator account" }),
  ).toBeVisible();
  expect(JSON.parse(confirmationBody)).toEqual({ code: "482913" });
  expect(confirmationKeys).toHaveLength(2);
  expect(confirmationKeys[1]).not.toBe(confirmationKeys[0]);
  expect(page.url()).not.toContain("smtp-password");
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});

test("setup validation is localized, focuses the first error, and exposes stable field semantics", async ({
  page,
}) => {
  await page.unroute("**/api/v1/setup/email/status");
  await page.route("**/api/v1/setup/email/status", (route) =>
    route.fulfill({ json: { status: "required" } }),
  );
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );

  await page.goto("/setup");
  await continuePastSystemCheck(page);
  await expect(
    page.getByRole("heading", { name: "Set up email delivery" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Ελληνικά" }).click();
  await page
    .getByRole("button", { name: "Αποστολή δοκιμαστικού email" })
    .click();

  const senderEmail = page.getByLabel("Email αποστολέα");
  await expect(senderEmail).toBeFocused();
  await expect(senderEmail).toHaveAttribute("name", "senderEmail");
  await expect(senderEmail).toHaveAttribute("autocomplete", "email");
  await expect(senderEmail).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Συμπλήρωσε το πεδίο «email αποστολέα»."),
  ).toBeVisible();

  const advanced = page.getByRole("button", {
    name: "Εμφάνιση προχωρημένων ρυθμίσεων",
  });
  await expect(advanced).toHaveAttribute(
    "aria-controls",
    "email-advanced-settings",
  );
  await advanced.click();
  await expect(
    page.getByRole("button", {
      name: "Απόκρυψη προχωρημένων ρυθμίσεων",
    }),
  ).toBeVisible();
});

test("setup progress stays compact at every viewport", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );
  await page.goto("/setup");
  await page.getByRole("button", { name: "Ελληνικά" }).click();

  const progress = page.getByRole("navigation", {
    name: "Πρόοδος εγκατάστασης",
  });
  await expect(progress.getByRole("progressbar")).toBeVisible();
  await expect(progress.locator("ol")).toHaveCount(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(progress.getByRole("progressbar")).toBeVisible();
  await expect(progress.locator("ol")).toHaveCount(0);
});

test("static field labels keep the outlined border continuous", async ({
  page,
}) => {
  await page.unroute("**/api/v1/setup/email/status");
  await page.route("**/api/v1/setup/email/status", (route) =>
    route.fulfill({ json: { status: "required" } }),
  );
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );

  await page.goto("/setup");
  await continuePastSystemCheck(page);
  await page.getByRole("button", { name: "Ελληνικά" }).click();

  const senderName = page.getByLabel("Όνομα αποστολέα");
  await senderName.focus();
  const notchWidth = await senderName
    .locator("xpath=..")
    .locator("fieldset > legend")
    .evaluate((legend) => legend.getBoundingClientRect().width);
  expect(notchWidth).toBeLessThan(1);
});

test("email errors are safe and clear secrets without clearing settings", async ({
  page,
}) => {
  await page.unroute("**/api/v1/setup/email/status");
  await page.route("**/api/v1/setup/email/status", (route) =>
    route.fulfill({ json: { status: "required" } }),
  );
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );
  const idempotencyKeys: string[] = [];
  await page.route("**/api/v1/setup/email/test", (route) => {
    idempotencyKeys.push(route.request().headers()["idempotency-key"] ?? "");
    return route.fulfill({
      status: 422,
      json: {
        code: "EMAIL_DELIVERY_AUTHENTICATION_FAILED",
        message: "provider said password=raw-secret",
      },
    });
  });

  await page.goto("/setup");
  await continuePastSystemCheck(page);
  await page.getByLabel("Sender email").fill("hello@example.test");
  await page.getByLabel("SMTP host").fill("smtp.example.test");
  await page.getByLabel("Username").fill("mailer");
  await page.getByLabel("Password").fill("smtp-password-not-persisted");
  await page.getByLabel("Send the test to").fill("owner@example.test");
  await page
    .getByLabel("One-time setup secret")
    .fill("test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Send test email" }).click();

  await expect(
    page.getByText("The email server rejected the credentials.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("raw-secret")).toHaveCount(0);
  await expect(page.getByLabel("SMTP host")).toHaveValue("smtp.example.test");
  await expect(page.getByLabel("Username")).toHaveValue("mailer");
  await expect(page.getByLabel("Password")).toHaveValue("");
  await expect(page.getByLabel("One-time setup secret")).toHaveValue("");

  await page.getByLabel("Password").fill("second-secret");
  await page
    .getByLabel("One-time setup secret")
    .fill("second-test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect.poll(() => idempotencyKeys.length).toBe(2);
  expect(idempotencyKeys[0]).toBeTruthy();
  expect(idempotencyKeys[1]).toBeTruthy();
  expect(idempotencyKeys[1]).not.toBe(idempotencyKeys[0]);
});

test("email confirmation recovery resumes safely after reload in Greek on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.unroute("**/api/v1/setup/email/status");
  await page.route("**/api/v1/setup/email/status", (route) =>
    route.fulfill({
      json: {
        status: "attention",
        safeErrorCode: "IDENTITY_ACTIVATION_FAILED",
        confirmationRetryable: true,
      },
    }),
  );
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );

  await page.goto("/setup");
  await continuePastSystemCheck(page);
  await page.getByRole("button", { name: "Ελληνικά" }).click();
  await expect(
    page.getByRole("heading", { name: "Βάλε τον κωδικό επιβεβαίωσης" }),
  ).toBeVisible();
  await expect(page.getByText("Βήμα 2 από 6")).toBeVisible();
  await expect(page.getByText("τη διεύθυνση δοκιμής σου")).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

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

  await continuePastSystemCheck(page);

  await expect(page.getByLabel("One-time setup secret")).toBeVisible();
  await page
    .getByLabel("One-time setup secret")
    .fill("test-only-setup-secret-with-sufficient-length");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText(
      "Member and application administration is not available in this technical alpha.",
      { exact: false },
    ),
  ).toBeVisible();
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
  await continuePastSystemCheck(page);
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
  await continuePastSystemCheck(page);
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

test("system check blocks setup until every product service is ready", async ({
  page,
}) => {
  let ready = false;
  await page.unroute("**/api/v1/system/preflight");
  await page.route("**/api/v1/system/preflight", (route) =>
    route.fulfill({
      status: 200,
      json: ready
        ? { status: "ready", checks: readySystemChecks }
        : {
            status: "attention",
            checks: readySystemChecks.map((check) =>
              check.key === "identity"
                ? { ...check, status: "attention", messageCode: "UNAVAILABLE" }
                : check,
            ),
          },
    }),
  );
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );

  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Check that Bubllio is ready" }),
  ).toBeVisible();
  await expect(page.getByText("Account service")).toBeVisible();
  await expect(page.getByText("Needs attention")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue setup" }),
  ).toHaveCount(0);

  ready = true;
  await page.getByRole("button", { name: "Run check again" }).click();
  await expect(page.getByText("Everything is ready for setup.")).toBeVisible();
  await page.getByRole("button", { name: "Continue setup" }).click();
  await expect(
    page.getByRole("heading", { name: "Create the administrator account" }),
  ).toBeVisible();
});

test("system check fits a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/setup/status", (route) =>
    route.fulfill({ json: { setupRequired: true, phase: "new" } }),
  );
  await page.goto("/setup");
  await expect(page.getByText("Application catalog")).toBeVisible();
  await page.getByRole("button", { name: "Ελληνικά" }).click();
  await expect(
    page.getByRole("heading", { name: "Έλεγξε ότι το Bubllio είναι έτοιμο" }),
  ).toBeVisible();
  await expect(page.getByText("Κατάλογος εφαρμογών")).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
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
  const startupErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() !== "error" ||
      !message.text().startsWith("Failed to initialize Bubllio")
    ) {
      return;
    }
    startupErrors.push(
      message
        .text()
        .replace(/https?:\/\/\S+/g, "<url>")
        .slice(0, 160),
    );
  });
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
      `Login did not open at ${origin}${pathname}; startupFailed=${startupFailed}; errors=${startupErrors.join(", ")}`,
    );
  }
  await expect(
    page.getByRole("region", { name: "Bubllio Identity" }),
  ).toBeVisible();
  await expect(page.locator("#username")).toBeVisible();
  await switchToEnglish(page);
}

async function continuePastSystemCheck(page: Page): Promise<void> {
  const heading = page.getByRole("heading", {
    name: "Check that Bubllio is ready",
  });
  const preflightVisible = await heading
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!preflightVisible) return;

  const continueButton = page.getByRole("button", { name: "Continue setup" });
  await expect(continueButton).toBeVisible();
  await continueButton.click();
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
