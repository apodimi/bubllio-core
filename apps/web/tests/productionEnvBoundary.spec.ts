import { expect, test } from "@playwright/test";

test("production ignores baked endpoint URLs when runtime config is missing", async ({
  page,
}) => {
  let contactedApi = false;
  await page.route("**/api/v1/setup/status", (route) => {
    contactedApi = true;

    return route.abort();
  });
  await page.goto("/");
  await expect(page.locator("body")).toContainText("Bubllio could not start");
  expect(contactedApi).toBe(false);
});

test("production accepts validated runtime endpoints", async ({ page }) => {
  let contactedApi = false;
  await page.route("**/runtime-config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'window.__BUBLLIO_CONFIG__ = { coreApiUrl: "https://api.example.test", keycloakUrl: "https://auth.example.test" };',
    }),
  );
  await page.route("https://api.example.test/api/v1/setup/status", (route) => {
    contactedApi = true;

    return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
  });
  await page.goto("/");
  await expect(page.locator("body")).toContainText("Bubllio could not start");
  expect(contactedApi).toBe(true);
});

test("production rejects a runtime endpoint with a path", async ({ page }) => {
  let contactedApi = false;
  await page.route("**/runtime-config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'window.__BUBLLIO_CONFIG__ = { coreApiUrl: "https://api.example.test/private", keycloakUrl: "https://auth.example.test" };',
    }),
  );
  await page.route("**/api/v1/setup/status", (route) => {
    contactedApi = true;

    return route.abort();
  });
  await page.goto("/");
  await expect(page.locator("body")).toContainText("Bubllio could not start");
  expect(contactedApi).toBe(false);
});

test("production rejects an HTTP runtime endpoint", async ({ page }) => {
  let contactedApi = false;
  await page.route("**/runtime-config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'window.__BUBLLIO_CONFIG__ = { coreApiUrl: "http://127.0.0.1:3100", keycloakUrl: "https://auth.example.test" };',
    }),
  );
  await page.route("**/api/v1/setup/status", (route) => {
    contactedApi = true;

    return route.abort();
  });
  await page.goto("/");
  await expect(page.locator("body")).toContainText("Bubllio could not start");
  expect(contactedApi).toBe(false);
});
