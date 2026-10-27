#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  RELEASE_IMAGES,
  classifyReleaseImages,
} from "./changed-release-images.mjs";

const keys = (result) => result.matrix.include.map(({ key }) => key);

assert.deepEqual(
  keys(classifyReleaseImages(["docs/operations/first-run.md"])),
  [],
);
assert.deepEqual(keys(classifyReleaseImages(["apps/web/src/main.tsx"])), [
  "coreWeb",
]);
assert.deepEqual(keys(classifyReleaseImages(["apps/api/src/main.ts"])), [
  "coreApi",
  "identitySetupAgent",
]);
assert.deepEqual(
  keys(classifyReleaseImages(["apps/api/prisma/schema.prisma"])),
  ["coreApi", "coreMigrate", "identitySetupAgent"],
);
assert.deepEqual(
  keys(classifyReleaseImages(["apps/keycloak-theme/src/main.tsx"])),
  ["keycloak"],
);
assert.deepEqual(keys(classifyReleaseImages(["deploy/installer/Dockerfile"])), [
  "installer",
]);
assert.deepEqual(
  keys(
    classifyReleaseImages(["apps/web/src/main.tsx", "apps/api/src/main.ts"]),
  ),
  ["coreApi", "identitySetupAgent", "coreWeb"],
);
assert.deepEqual(
  keys(classifyReleaseImages(["scripts/build-release-bundle.mjs"])),
  RELEASE_IMAGES.map(({ key }) => key),
);
assert.equal(
  classifyReleaseImages(["apps/keycloak-theme/src/main.tsx"]).needsBootstrap,
  true,
);
assert.equal(
  classifyReleaseImages(["apps/web/src/main.tsx"]).needsBootstrap,
  false,
);
assert.equal(
  classifyReleaseImages(["deploy/managed/compose.template.yaml"]).releaseNeeded,
  true,
);
assert.equal(
  classifyReleaseImages(["deploy/managed/compose.template.yaml"]).hasImages,
  false,
);
assert.equal(
  classifyReleaseImages(["apps/web/e2e/identity-flow.spec.ts"]).releaseNeeded,
  false,
);
assert.equal(
  classifyReleaseImages(["apps/web/e2e/identity-flow.spec.ts"]).verifyNeeded,
  true,
);
assert.equal(
  classifyReleaseImages(["docs/operations/first-run.md"]).verifyNeeded,
  false,
);
assert.equal(classifyReleaseImages([], { forceAll: true }).fullBuild, true);

process.stdout.write("Changed release image classification passed.\n");
