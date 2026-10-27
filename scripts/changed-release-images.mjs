#!/usr/bin/env node

import { appendFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const RELEASE_IMAGES = [
  {
    image: "core-api",
    key: "coreApi",
    dockerfile: "apps/api/Dockerfile.production",
    target: "runtime",
  },
  {
    image: "core-migrate",
    key: "coreMigrate",
    dockerfile: "apps/api/Dockerfile.production",
    target: "migration",
  },
  {
    image: "core-identity-setup-agent",
    key: "identitySetupAgent",
    dockerfile: "apps/api/Dockerfile.production",
    target: "identity-setup-agent",
  },
  {
    image: "core-web",
    key: "coreWeb",
    dockerfile: "apps/web/Dockerfile.production",
    target: "runtime",
  },
  {
    image: "core-keycloak",
    key: "keycloak",
    dockerfile: "infrastructure/keycloak/Dockerfile.production",
    target: "runtime",
  },
  {
    image: "core-installer",
    key: "installer",
    dockerfile: "deploy/installer/Dockerfile",
    target: "runtime",
  },
];

const API_KEYS = new Set(["coreApi", "coreMigrate", "identitySetupAgent"]);
const API_RUNTIME_KEYS = new Set(["coreApi", "identitySetupAgent"]);
const DOCUMENTATION_PATHS = [
  /^AGENTS\.md$/u,
  /^LICENSE(?:\.|$)/u,
  /^PRODUCT\.md$/u,
  /^README\.md$/u,
  /^docs\//u,
  /^\.gitignore$/u,
  /^deploy\/managed\/(?:compose\.yaml|release-manifest\.json)$/u,
];
const VERIFY_ONLY_PATHS = [
  /^\.github\/(?!workflows\/release-images\.yml$)/u,
  /^apps\/api\/test\//u,
  /^apps\/web\/(?:e2e\/|playwright\.config\.ts$)/u,
  /^scripts\/test-/u,
];
const DELIVERY_PATHS = [
  /^deploy\/identity-edge\//u,
  /^deploy\/managed\/compose\.template\.yaml$/u,
  /^scripts\/build-managed-adapter\.mjs$/u,
];
const INSTALLER_SCRIPTS = new Set([
  "scripts/bubllio-installer.mjs",
  "scripts/create-installation-contract.mjs",
  "scripts/initialize-managed-compose.mjs",
  "scripts/prepare-installation.mjs",
]);

export function classifyReleaseImages(paths, { forceAll = false } = {}) {
  const selected = new Set();
  let fullBuild = forceAll;
  let deliveryChanged = false;
  let verifyNeeded = forceAll;

  for (const path of paths.filter(Boolean)) {
    if (DOCUMENTATION_PATHS.some((pattern) => pattern.test(path))) continue;
    if (VERIFY_ONLY_PATHS.some((pattern) => pattern.test(path))) {
      verifyNeeded = true;
      continue;
    }
    verifyNeeded = true;
    if (DELIVERY_PATHS.some((pattern) => pattern.test(path))) {
      deliveryChanged = true;
      continue;
    }
    if (/^apps\/web\//u.test(path)) {
      selected.add("coreWeb");
      continue;
    }
    if (/^apps\/api\/src\//u.test(path)) {
      for (const key of API_RUNTIME_KEYS) selected.add(key);
      continue;
    }
    if (/^apps\/api\//u.test(path)) {
      for (const key of API_KEYS) selected.add(key);
      continue;
    }
    if (/^(?:apps\/keycloak-theme|infrastructure\/keycloak)\//u.test(path)) {
      selected.add("keycloak");
      continue;
    }
    if (
      /^(?:deploy\/installer|deploy\/contract|deploy\/release|deploy\/adapter-conformance)\//u.test(
        path,
      )
    ) {
      selected.add("installer");
      continue;
    }
    if (path === "deploy/managed/applications.json") {
      for (const key of API_RUNTIME_KEYS) selected.add(key);
      continue;
    }
    if (path === "deploy/runtime/web-server.mjs") {
      selected.add("coreWeb");
      continue;
    }
    if (path === "deploy/runtime/core-entrypoint.mjs") {
      for (const key of API_KEYS) selected.add(key);
      continue;
    }
    if (
      path === "deploy/runtime/keycloak-entrypoint.sh" ||
      /^deploy\/keycloak\//u.test(path)
    ) {
      selected.add("keycloak");
      continue;
    }
    if (INSTALLER_SCRIPTS.has(path)) {
      selected.add("installer");
      continue;
    }

    // Shared scripts, workflow definitions, root configuration, and unknown
    // paths fail safe because they may affect more than one image target.
    fullBuild = true;
  }

  const include = fullBuild
    ? RELEASE_IMAGES
    : RELEASE_IMAGES.filter(({ key }) => selected.has(key));
  return {
    deliveryChanged,
    fullBuild,
    hasImages: include.length > 0,
    needsBootstrap: fullBuild || selected.has("keycloak"),
    releaseNeeded: include.length > 0 || deliveryChanged,
    verifyNeeded,
    matrix: { include },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [pathsFile, mode] = process.argv.slice(2);
  if (!pathsFile) {
    throw new Error(
      "Usage: changed-release-images.mjs <paths-file> [--force-all]",
    );
  }
  const paths = (await readFile(pathsFile, "utf8"))
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
  const result = classifyReleaseImages(paths, {
    forceAll: mode === "--force-all",
  });
  const outputs = {
    full_build: String(result.fullBuild),
    has_images: String(result.hasImages),
    needs_bootstrap: String(result.needsBootstrap),
    release_needed: String(result.releaseNeeded),
    verify_needed: String(result.verifyNeeded),
    matrix: JSON.stringify(result.matrix),
  };
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
  } else {
    process.stdout.write(
      `${JSON.stringify({ ...result, matrix: result.matrix })}\n`,
    );
  }
}
