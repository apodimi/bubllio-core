#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "bubllio-managed-test-"));
const setupSecret = "A".repeat(43);

try {
  const first = initialize(temporaryRoot, setupSecret);
  assert.equal(first.status, 0, first.stderr);
  assert.doesNotMatch(
    first.stdout + first.stderr,
    new RegExp(setupSecret, "u"),
  );

  const setupMaterial = JSON.parse(
    await readFile(join(temporaryRoot, "setup/material.json"), "utf8"),
  );
  assert.equal(
    setupMaterial.digest,
    createHash("sha256").update(setupSecret).digest("hex"),
  );
  const allFiles = await listFiles(temporaryRoot);
  for (const path of allFiles) {
    assert.ok(!(await readFile(path, "utf8")).includes(setupSecret));
  }
  assert.equal(
    (await stat(join(temporaryRoot, "setup/material.json"))).mode & 0o777,
    0o444,
  );

  const passwordBefore = await readFile(
    join(temporaryRoot, "core-database/password"),
    "utf8",
  );
  const second = initialize(temporaryRoot, undefined);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(
    await readFile(join(temporaryRoot, "core-database/password"), "utf8"),
    passwordBefore,
  );

  const changed = initialize(temporaryRoot, "B".repeat(43));
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /does not match/u);
  const weak = initialize(join(temporaryRoot, "weak"), "human-password");
  assert.notEqual(weak.status, 0);
  assert.match(weak.stderr, /exactly 43 base64url/u);
  const missing = initialize(join(temporaryRoot, "missing"), undefined);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /exactly 43 base64url/u);
  const changedDomain = initialize(
    temporaryRoot,
    undefined,
    "changed.example.com",
  );
  assert.notEqual(changedDomain.status, 0);
  assert.match(changedDomain.stderr, /refusing changed\.example\.com/u);

  const manifestPath = join(temporaryRoot, "release-manifest.json");
  const adapterPath = join(temporaryRoot, "dokploy-compose.yaml");
  const digest = "a".repeat(64);
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      schemaVersion: "1",
      releaseRef: "v0.1.0-alpha.test",
      version: "0.1.0-alpha.test",
      commitSha: "b".repeat(40),
      images: Object.fromEntries(
        [
          "coreApi",
          "coreMigrate",
          "coreWeb",
          "identitySetupAgent",
          "installer",
          "keycloak",
        ].map((name) => [
          name,
          `ghcr.io/bubllio/${name.toLowerCase()}@sha256:${digest}`,
        ]),
      ),
    })}\n`,
  );
  const render = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/build-managed-adapter.mjs"),
      "--release-manifest",
      manifestPath,
      "--output",
      adapterPath,
    ],
    { encoding: "utf8", cwd: root },
  );
  assert.equal(render.status, 0, render.stderr);
  assert.doesNotMatch(await readFile(adapterPath, "utf8"), /__[A-Z0-9_]+__/u);

  // Git-based installs must consume exactly the reviewed release snapshot.
  const publishedAdapterPath = join(temporaryRoot, "published-compose.yaml");
  const publishedRender = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/build-managed-adapter.mjs"),
      "--release-manifest",
      resolve(root, "deploy/managed/release-manifest.json"),
      "--output",
      publishedAdapterPath,
    ],
    { encoding: "utf8", cwd: root },
  );
  assert.equal(publishedRender.status, 0, publishedRender.stderr);
  assert.equal(
    await readFile(resolve(root, "deploy/managed/compose.yaml"), "utf8"),
    await readFile(publishedAdapterPath, "utf8"),
    "The Git deployment Compose must match its release manifest and template",
  );

  const configured = spawnSync(
    "docker",
    [
      "compose",
      "--project-directory",
      resolve(root, "deploy/managed"),
      "-f",
      adapterPath,
      "config",
      "--format",
      "json",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        BUBLLIO_BASE_DOMAIN: "dev.bubllio.com",
        BUBLLIO_SETUP_SECRET: setupSecret,
        BUBLLIO_EDGE_NETWORK: "example-proxy-network",
      },
    },
  );
  assert.equal(configured.status, 0, configured.stderr);
  const compose = JSON.parse(configured.stdout);
  assert.equal(compose.networks.edge.name, "example-proxy-network");
  assert.equal(
    compose.services["installation-init"].environment.BUBLLIO_SETUP_SECRET,
    setupSecret,
  );
  for (const [name, service] of Object.entries(compose.services)) {
    if (name !== "installation-init") {
      assert.ok(
        !JSON.stringify(service.environment ?? {}).includes(setupSecret),
      );
    }
    assert.equal(
      service.ports,
      undefined,
      `${name} must not publish host ports`,
    );
  }
  assert.deepEqual(
    Object.entries(compose.services)
      .filter(([, service]) => Object.hasOwn(service.networks ?? {}, "edge"))
      .map(([name]) => name)
      .sort(),
    ["core-api", "core-web", "keycloak"],
  );

  if (process.env.BUBLLIO_INSTALLER_TEST_IMAGE) {
    const containerState = join(temporaryRoot, "container-state");
    await mkdir(containerState);
    await chmod(containerState, 0o777);
    // The root initializer must not leave root-owned directories that the
    // unprivileged CI runner cannot clean up after this bind-mount test.
    for (const directory of [
      "core-database",
      "identity-database",
      "core-identity",
      "identity-agent",
      "keycloak-bootstrap",
      "setup",
    ]) {
      const path = join(containerState, directory);
      await mkdir(path);
      await chmod(path, 0o777);
    }
    const containerRun = spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--read-only",
        "--tmpfs",
        "/tmp:mode=1777",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        "--user",
        "0:0",
        "--env",
        "BUBLLIO_BASE_DOMAIN=dev.bubllio.com",
        "--env",
        `BUBLLIO_SETUP_SECRET=${setupSecret}`,
        "--mount",
        `type=bind,src=${containerState},dst=/state`,
        process.env.BUBLLIO_INSTALLER_TEST_IMAGE,
        "initialize-managed-compose",
      ],
      { encoding: "utf8" },
    );
    assert.equal(containerRun.status, 0, containerRun.stderr);
    assert.doesNotMatch(
      containerRun.stdout + containerRun.stderr,
      new RegExp(setupSecret, "u"),
    );
  }

  process.stdout.write("Managed Compose initialization checks passed.\n");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

function initialize(stateRoot, secret, baseDomain = "dev.bubllio.com") {
  const environment = {
    ...process.env,
    BUBLLIO_BASE_DOMAIN: baseDomain,
  };
  if (secret !== undefined) environment.BUBLLIO_SETUP_SECRET = secret;
  else delete environment.BUBLLIO_SETUP_SECRET;
  return spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/initialize-managed-compose.mjs"),
      "--state-root",
      stateRoot,
    ],
    { encoding: "utf8", env: environment },
  );
}

async function listFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await listFiles(path)));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
