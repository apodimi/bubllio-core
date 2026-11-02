import assert from "node:assert/strict";
import test from "node:test";

import { resolveSetupStep } from "../src/features/setup/flows/setupFlow/resolveSetupStep.ts";

function setupInput(overrides = {}) {
  return {
    authenticated: false,
    current: undefined,
    currentError: null,
    currentFailed: false,
    emailDeliveryFailed: false,
    emailDeliveryStatus: { status: "ready" },
    operation: undefined,
    preflightReady: true,
    setupStatus: { phase: "new", setupRequired: true },
    setupStatusFailed: false,
    state: { step: "preflight" },
    ...overrides,
  };
}

test("setup waits for preflight and verified email before opening registration", () => {
  assert.equal(
    resolveSetupStep(setupInput({ preflightReady: false })),
    "preflight",
  );
  assert.equal(
    resolveSetupStep(
      setupInput({ emailDeliveryStatus: { status: "awaiting_confirmation" } }),
    ),
    "email",
  );
  assert.equal(resolveSetupStep(setupInput()), "intro");
});

test("authentication failure takes precedence over generic setup failure", () => {
  assert.equal(
    resolveSetupStep(
      setupInput({
        authenticated: true,
        currentError: new Error("SESSION_EXPIRED"),
        currentFailed: true,
        setupStatusFailed: true,
        state: { step: "organization" },
      }),
    ),
    "reauthenticate",
  );
});

test("server failure replaces a locally selected setup step", () => {
  assert.equal(
    resolveSetupStep(
      setupInput({
        authenticated: true,
        currentFailed: true,
        state: { step: "progress" },
      }),
    ),
    "unavailable",
  );
});

test("lost authentication closes locally selected protected steps", () => {
  for (const step of ["organization", "progress"]) {
    assert.equal(
      resolveSetupStep(setupInput({ state: { step } })),
      "reauthenticate",
    );
  }
});

test("completed operation advances to done without waiting for another action", () => {
  assert.equal(
    resolveSetupStep(
      setupInput({
        authenticated: true,
        operation: { status: "succeeded" },
        state: { step: "progress" },
      }),
    ),
    "done",
  );
});
