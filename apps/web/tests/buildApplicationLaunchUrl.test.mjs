import assert from "node:assert/strict";
import test from "node:test";

import { buildApplicationLaunchUrl } from "../src/features/workspace/buildApplicationLaunchUrl.ts";

test("external app link preserves its query and replaces stale organization context", () => {
  assert.equal(
    buildApplicationLaunchUrl(
      "https://crm.example.test/workspace?source=core&organization_id=old",
      "new",
      false,
    ),
    "https://crm.example.test/workspace?source=core&organization_id=new",
  );
});

test("invalid or unsafe catalog URLs cannot become links", () => {
  for (const value of [
    "not a URL",
    "javascript:alert(1)",
    "http://crm.example.test",
  ]) {
    assert.equal(buildApplicationLaunchUrl(value, "org", false), undefined);
  }
});

test("development HTTP is limited to localhost", () => {
  assert.equal(
    buildApplicationLaunchUrl("http://localhost:5174/app", "org", true),
    "http://localhost:5174/app?organization_id=org",
  );
  assert.equal(
    buildApplicationLaunchUrl("http://crm.example.test/app", "org", true),
    undefined,
  );
});
