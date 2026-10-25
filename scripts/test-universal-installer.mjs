#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "bubllio-installer-test-"));
const digest = "a".repeat(64);
const releaseManifest = {
  schemaVersion: "1",
  releaseRef: "v0.1.0-alpha.1",
  version: "0.1.0-alpha.1",
  commitSha: "b".repeat(40),
  images: Object.fromEntries(
    [
      ["coreApi", "core-api"],
      ["coreMigrate", "core-migrate"],
      ["coreWeb", "core-web"],
      ["identitySetupAgent", "identity-setup-agent"],
      ["installer", "installer"],
      ["keycloak", "keycloak"],
    ].map(([key, image]) => [key, `ghcr.io/bubllio/${image}@sha256:${digest}`]),
  ),
};

try {
  const manifestPath = join(temporaryRoot, "release-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(releaseManifest)}\n`);
  const stateDirectory = join(temporaryRoot, "state");
  const hostStateDirectory = "/srv/bubllio/state";
  const first = run("scripts/bubllio-installer.mjs", [
    "prepare",
    "--release-manifest",
    manifestPath,
    "--state-dir",
    stateDirectory,
    "--host-state-dir",
    hostStateDirectory,
    "--base-domain",
    "core.example.com",
    "--edge-network",
    "proxy-edge",
  ]);
  assert.match(first.stdout, /One-time setup secret/u);
  const setupSecret = first.stdout.match(
    /shown again\):\n([A-Za-z0-9_-]{40,})/u,
  )?.[1];
  assert.ok(setupSecret, "prepare must print the generated setup secret once");
  const contract = JSON.parse(
    await readFile(join(stateDirectory, "installation.json"), "utf8"),
  );
  assert.deepEqual(contract.publicEndpoints, {
    webUrl: "https://core.example.com",
    apiUrl: "https://api.core.example.com",
    identityUrl: "https://auth.core.example.com",
  });
  assert.deepEqual(contract.applicationManifest, {
    schemaVersion: "1",
    applications: [],
  });
  assert.equal(contract.release.images.coreApi, releaseManifest.images.coreApi);
  assert.equal(contract.storage.coreDatabaseVolume, "bubllio_core_database");

  const environment = await readFile(
    join(stateDirectory, "compose.env"),
    "utf8",
  );
  assert.match(environment, /^BUBLLIO_EDGE_NETWORK=proxy-edge$/mu);
  assert.match(
    environment,
    /^CORE_DATABASE_PASSWORD_FILE=\/srv\/bubllio\/state\/secrets\/core_database_password$/mu,
  );
  assert.doesNotMatch(environment, /One-time setup secret/u);
  assert.ok(!environment.includes(setupSecret));
  assert.equal((await stat(stateDirectory)).mode & 0o777, 0o700);
  assert.equal(
    (await stat(join(stateDirectory, "secrets/core_database_password"))).mode &
      0o777,
    0o600,
  );

  const second = run("scripts/bubllio-installer.mjs", [
    "prepare",
    "--release-manifest",
    manifestPath,
    "--state-dir",
    stateDirectory,
    "--host-state-dir",
    hostStateDirectory,
    "--base-domain",
    "core.example.com",
    "--edge-network",
    "proxy-edge",
  ]);
  assert.match(second.stdout, /was not shown again/u);
  assert.doesNotMatch(second.stdout, /One-time setup secret/u);
  runExpectFailure("scripts/bubllio-installer.mjs", [
    "prepare",
    "--release-manifest",
    manifestPath,
    "--state-dir",
    stateDirectory,
    "--host-state-dir",
    hostStateDirectory,
    "--base-domain",
    "changed.example.com",
    "--edge-network",
    "proxy-edge",
  ]);

  runExpectFailure("scripts/create-installation-contract.mjs", [
    "--release-manifest",
    manifestPath,
    "--base-domain",
    "https://core.example.com/path",
    "--output",
    join(temporaryRoot, "invalid.json"),
  ]);
  runExpectFailure("scripts/bubllio-installer.mjs", [
    "prepare",
    "--release-manifest",
    manifestPath,
    "--state-dir",
    join(temporaryRoot, "invalid-state"),
    "--host-state-dir",
    "/srv/bubllio/state",
    "--base-domain",
    "core.example.com",
    "--edge-network",
    "invalid network",
  ]);
  const mutableManifestPath = join(temporaryRoot, "mutable-manifest.json");
  await writeFile(
    mutableManifestPath,
    `${JSON.stringify({
      ...releaseManifest,
      images: {
        ...releaseManifest.images,
        installer: "ghcr.io/bubllio/installer:latest",
      },
    })}\n`,
  );
  runExpectFailure("scripts/create-installation-contract.mjs", [
    "--release-manifest",
    mutableManifestPath,
    "--base-domain",
    "core.example.com",
    "--output",
    join(temporaryRoot, "mutable.json"),
  ]);
  const symlinkTarget = join(temporaryRoot, "symlink-target");
  const symlinkState = join(temporaryRoot, "symlink-state");
  await mkdir(symlinkTarget, { mode: 0o700 });
  await symlink(symlinkTarget, symlinkState);
  runExpectFailure("scripts/create-installation-contract.mjs", [
    "--release-manifest",
    manifestPath,
    "--base-domain",
    "core.example.com",
    "--output",
    join(symlinkState, "installation.json"),
  ]);

  const bundleOne = join(temporaryRoot, "bundle-one");
  const bundleTwo = join(temporaryRoot, "bundle-two");
  run("scripts/build-release-bundle.mjs", [
    "--release-manifest",
    manifestPath,
    "--output-dir",
    bundleOne,
  ]);
  run("scripts/build-release-bundle.mjs", [
    "--release-manifest",
    manifestPath,
    "--output-dir",
    bundleTwo,
  ]);
  for (const path of [
    "README.md",
    "CHECKSUMS.sha256",
    "bubllio",
    "deploy/compose/compose.yaml",
    "deploy/keycloak/bubllio-realm.json",
    "release-manifest.json",
  ]) {
    assert.equal(
      await readFile(join(bundleOne, path), "utf8"),
      await readFile(join(bundleTwo, path), "utf8"),
      `${path} must be deterministic`,
    );
  }
  const wrapper = await readFile(join(bundleOne, "bubllio"), "utf8");
  assert.match(
    wrapper,
    new RegExp(escapeRegExp(releaseManifest.images.installer), "u"),
  );
  assert.doesNotMatch(wrapper, /__BUBLLIO_/u);
  assert.equal((await stat(join(bundleOne, "bubllio"))).mode & 0o777, 0o755);
  const shellCheck = spawnSync("sh", ["-n", join(bundleOne, "bubllio")], {
    encoding: "utf8",
  });
  assert.equal(shellCheck.status, 0, shellCheck.stderr);
  const help = spawnSync("sh", [join(bundleOne, "bubllio"), "help"], {
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Bubllio Core 0\.1\.0-alpha\.1/u);
  const wrapperSymlinkTarget = join(temporaryRoot, "wrapper-symlink-target");
  const wrapperSymlinkState = join(temporaryRoot, "wrapper-symlink-state");
  await mkdir(wrapperSymlinkTarget, { mode: 0o700 });
  await symlink(wrapperSymlinkTarget, wrapperSymlinkState);
  const symlinkStatus = spawnSync(
    "sh",
    [join(bundleOne, "bubllio"), "status"],
    {
      encoding: "utf8",
      env: { ...process.env, BUBLLIO_STATE_DIR: wrapperSymlinkState },
    },
  );
  assert.notEqual(symlinkStatus.status, 0);
  assert.match(symlinkStatus.stderr, /Refusing symbolic-link state directory/u);
  const compose = await readFile(
    join(bundleOne, "deploy/compose/compose.yaml"),
    "utf8",
  );
  assert.doesNotMatch(compose, /^\s+ports:/mu);
  assert.doesNotMatch(compose, /^\s+labels:/mu);

  if (process.env.BUBLLIO_INSTALLER_TEST_IMAGE) {
    await verifyInstallerContainer(
      process.env.BUBLLIO_INSTALLER_TEST_IMAGE,
      manifestPath,
    );
  }

  process.stdout.write("Universal installer and bundle checks passed.\n");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

function run(script, arguments_) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, script), ...arguments_],
    {
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `${script} failed (${result.status}):\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
}

function runExpectFailure(script, arguments_) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, script), ...arguments_],
    {
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0, `${script} unexpectedly succeeded`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function verifyInstallerContainer(image, manifestPath) {
  const containerState = join(temporaryRoot, "container-state");
  await mkdir(containerState, { mode: 0o700 });
  const user =
    typeof process.getuid === "function"
      ? `${process.getuid()}:${process.getgid()}`
      : "1000:1000";
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--user",
      user,
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:mode=1777",
      "--mount",
      `type=bind,src=${manifestPath},dst=/input/release-manifest.json,readonly`,
      "--mount",
      `type=bind,src=${containerState},dst=/state`,
      image,
      "prepare",
      "--release-manifest",
      "/input/release-manifest.json",
      "--state-dir",
      "/state",
      "--host-state-dir",
      containerState,
      "--base-domain",
      "container.example.com",
      "--edge-network",
      "proxy-edge",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `Installer container failed (${result.status}):\n${result.stdout}\n${result.stderr}`,
    );
  }
  assert.match(result.stdout, /One-time setup secret/u);
  assert.equal(
    (await stat(join(containerState, "secrets/core_database_password"))).mode &
      0o777,
    0o600,
  );
}
