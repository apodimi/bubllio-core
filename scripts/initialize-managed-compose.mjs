#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

const DOMAIN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;
const SETUP_SECRET = /^[A-Za-z0-9_-]{43}$/u;
const SECRET = /^[A-Za-z0-9_-]{43}$/u;
const baseDomain = normalizeDomain(process.env.BUBLLIO_BASE_DOMAIN);
const setupSecret = process.env.BUBLLIO_SETUP_SECRET?.trim();
const stateRoot = parseStateRoot(process.argv.slice(2));

const paths = {
  coreDatabasePassword: join(stateRoot, "core-database/password"),
  identityDatabasePassword: join(stateRoot, "identity-database/password"),
  coreIdentityClientSecret: join(stateRoot, "core-identity/client-secret"),
  identitySetupAgentToken: join(stateRoot, "identity-agent/token"),
  keycloakBootstrapClientSecret: join(
    stateRoot,
    "keycloak-bootstrap/client-secret",
  ),
  setupMaterial: join(stateRoot, "setup/material.json"),
  installation: join(stateRoot, "setup/installation.json"),
};

const existingInstallation = await readInstallation(paths.installation);
if (existingInstallation && existingInstallation.baseDomain !== baseDomain) {
  fail(
    `This installation belongs to ${existingInstallation.baseDomain}; refusing ${baseDomain}`,
  );
}

await ensureGeneratedSecret(paths.coreDatabasePassword);
await ensureGeneratedSecret(paths.identityDatabasePassword);
await ensureGeneratedSecret(paths.coreIdentityClientSecret);
await ensureGeneratedSecret(paths.identitySetupAgentToken);
await ensureGeneratedSecret(paths.keycloakBootstrapClientSecret);

if (!(await exists(paths.setupMaterial))) {
  if (!setupSecret || !SETUP_SECRET.test(setupSecret)) {
    fail(
      "BUBLLIO_SETUP_SECRET must be exactly 43 base64url characters on the first deployment",
    );
  }
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
  const digest = createHash("sha256").update(setupSecret, "utf8").digest("hex");
  await createAtomic(
    paths.setupMaterial,
    `${JSON.stringify({ schemaVersion: "1", digest, expiresAt }, null, 2)}\n`,
    0o444,
  );
} else {
  const material = await readSetupMaterial(paths.setupMaterial);
  if (
    setupSecret &&
    createHash("sha256").update(setupSecret, "utf8").digest("hex") !==
      material.digest
  ) {
    fail("BUBLLIO_SETUP_SECRET does not match the initialized installation");
  }
}

if (!existingInstallation) {
  await createAtomic(
    paths.installation,
    `${JSON.stringify({ schemaVersion: "1", baseDomain }, null, 2)}\n`,
    0o444,
  );
}

process.stdout.write(
  `Bubllio installation state is ready for ${baseDomain}. No secrets were printed.\n`,
);

async function ensureGeneratedSecret(path) {
  if (await exists(path)) {
    const value = await readRegularFile(path);
    if (!SECRET.test(value.trim())) fail(`Existing secret is invalid: ${path}`);
    return;
  }
  await createAtomic(path, `${randomBytes(32).toString("base64url")}\n`, 0o444);
}

async function readSetupMaterial(path) {
  const value = JSON.parse(await readRegularFile(path));
  if (
    value?.schemaVersion !== "1" ||
    typeof value.digest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.digest) ||
    typeof value.expiresAt !== "string"
  ) {
    fail("Existing setup material is invalid");
  }
  const date = new Date(value.expiresAt);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== value.expiresAt
  ) {
    fail("Existing setup expiry is invalid");
  }
  return value;
}

async function readInstallation(path) {
  if (!(await exists(path))) return undefined;
  const value = JSON.parse(await readRegularFile(path));
  if (
    value?.schemaVersion !== "1" ||
    typeof value.baseDomain !== "string" ||
    !DOMAIN.test(value.baseDomain)
  ) {
    fail("Existing installation metadata is invalid");
  }
  return value;
}

async function createAtomic(path, contents, mode) {
  await ensureDirectory(dirname(path));
  const temporaryPath = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporaryPath, contents, { flag: "wx", mode });
  await chmod(temporaryPath, mode);
  try {
    await link(temporaryPath, path);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  } finally {
    await unlink(temporaryPath);
  }
  await readRegularFile(path);
}

async function ensureDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o755 });
  const information = await lstat(path);
  if (!information.isDirectory() || information.isSymbolicLink()) {
    fail(`Refusing unsafe state directory: ${path}`);
  }
}

async function readRegularFile(path) {
  const information = await lstat(path);
  if (!information.isFile() || information.isSymbolicLink()) {
    fail(`Refusing unsafe state file: ${path}`);
  }
  return readFile(path, "utf8");
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function normalizeDomain(value) {
  const normalized = value?.trim().toLowerCase().replace(/\.$/u, "");
  if (!normalized || !DOMAIN.test(normalized)) {
    fail(
      "BUBLLIO_BASE_DOMAIN must be a DNS hostname without scheme, path, wildcard, or port",
    );
  }
  return normalized;
}

function parseStateRoot(arguments_) {
  if (arguments_.length === 0) return "/state";
  if (
    arguments_.length !== 2 ||
    arguments_[0] !== "--state-root" ||
    !isAbsolute(arguments_[1])
  ) {
    fail("Usage: initialize-managed-compose [--state-root <absolute-path>]");
  }
  return arguments_[1];
}

function fail(message) {
  throw new Error(message);
}
