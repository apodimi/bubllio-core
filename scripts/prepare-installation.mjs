#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

import { validateJsonSchema } from "../deploy/contract/validate.mjs";

const IMAGE_REFERENCE =
  /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?::\d+)?(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+@sha256:[a-f0-9]{64}$/u;
const RESOURCE_NAME = /^[a-z][a-z0-9_-]{2,62}$/u;
const APPLICATION_KEY = /^[a-z][a-z0-9-]{1,62}$/u;
const AUDIENCE = /^[A-Za-z0-9_.:-]{2,255}$/u;
const CONTRACT_VERSION = /^[1-9][0-9]*(?:\.[0-9]+){0,2}$/u;
const RELEASE_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;
const options = parseArguments(process.argv.slice(2));
const contractPath = resolve(options.contract);
const outputDirectory = resolve(options.outputDirectory);
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const contractSchema = JSON.parse(
  await readFile(
    new URL(
      "../deploy/contract/bubllio-installation.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const schemaErrors = validateJsonSchema(contract, contractSchema);
if (schemaErrors.length) fail(schemaErrors.join("; "));
validateContract(contract);
if (options.validateOnly) {
  process.stdout.write(
    `Valid Bubllio installation contract: ${contractPath}\n`,
  );
  process.exit(0);
}
await ensureSafeDirectory(outputDirectory);
const secretsDirectory = join(outputDirectory, "secrets");
await ensureSafeDirectory(secretsDirectory);

const secretPaths = Object.fromEntries(
  Object.entries(contract.secretReferences).map(([key, fileName]) => [
    key,
    join(secretsDirectory, fileName),
  ]),
);

await ensureRandomSecret(secretPaths.coreDatabasePassword, false);
await ensureRandomSecret(secretPaths.identityDatabasePassword, false);
await ensureRandomSecret(secretPaths.coreIdentityClientSecret, false);
await ensureRandomSecret(secretPaths.keycloakBootstrapClientSecret, false);
await ensureRandomSecret(secretPaths.identitySetupAgentToken, false);

let setupSecret;
const setupExpiryPath = join(secretsDirectory, "setup_secret_expires_at");
if (!(await exists(secretPaths.setupSecretDigest))) {
  const candidate = randomBytes(32).toString("base64url");
  const digest = createHash("sha256").update(candidate, "utf8").digest("hex");
  if (await createPrivateFile(secretPaths.setupSecretDigest, `${digest}\n`)) {
    setupSecret = candidate;
    const expiry = new Date(
      Date.now() + contract.bootstrap.setupSecretTtlSeconds * 1000,
    ).toISOString();
    await createPrivateFile(setupExpiryPath, `${expiry}\n`);
  }
}
if (!(await exists(setupExpiryPath))) {
  fail(
    "setup secret expiry is missing; rotate the incomplete preparation directory",
  );
}
const setupDigest = (
  await readFile(secretPaths.setupSecretDigest, "utf8")
).trim();
if (!/^[a-f0-9]{64}$/u.test(setupDigest))
  fail("setup secret digest is invalid");
await assertPrivateRegularFile(setupExpiryPath);
const setupExpiresAt = (await readFile(setupExpiryPath, "utf8")).trim();
if (!isCanonicalTimestamp(setupExpiresAt))
  fail("setup secret expiry is invalid");

const manifestPath = join(outputDirectory, "applications.json");
await writePublicFile(
  manifestPath,
  `${JSON.stringify(contract.applicationManifest, null, 2)}\n`,
);

const environmentPath = join(outputDirectory, "compose.env");
const environment = createComposeEnvironment({
  contract,
  contractPath,
  manifestPath,
  secretPaths,
  setupExpiresAt,
});
await writePrivateFile(environmentPath, environment);

const setupUrl = new URL(
  "/setup",
  `${contract.publicEndpoints.webUrl}/`,
).toString();
process.stdout.write(`Prepared Bubllio ${contract.release.version}.\n`);
process.stdout.write(`Compose environment: ${environmentPath}\n`);
process.stdout.write(`Setup URL: ${setupUrl}\n`);
if (setupSecret) {
  process.stdout.write(
    "\nOne-time setup secret (store it now; it will not be shown again):\n",
  );
  process.stdout.write(`${setupSecret}\n`);
} else {
  process.stdout.write(
    "Setup material already exists; the setup secret was not shown again.\n",
  );
}

function parseArguments(arguments_) {
  if (arguments_.includes("--help")) {
    process.stdout.write(
      "Usage: node scripts/prepare-installation.mjs --contract <file> [--output-dir <directory>] [--validate-only]\n",
    );
    process.exit(0);
  }
  const result = {
    contract: "deploy/contract/bubllio-installation.example.json",
    outputDirectory: ".local/installation",
    validateOnly: false,
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const name = arguments_[index];
    if (name === "--validate-only") {
      result.validateOnly = true;
      continue;
    }
    const value = arguments_[index + 1];
    if (!value || !["--contract", "--output-dir"].includes(name))
      fail(`Unknown argument: ${name}`);
    if (name === "--contract") result.contract = value;
    if (name === "--output-dir") result.outputDirectory = value;
    index += 1;
  }
  return result;
}

function validateContract(value) {
  exactObject(value, "contract", [
    "schemaVersion",
    "release",
    "publicEndpoints",
    "storage",
    "bootstrap",
    "secretReferences",
    "health",
    "applicationManifest",
  ]);
  equal(value.schemaVersion, "1", "schemaVersion");

  exactObject(value.release, "release", ["version", "images"]);
  matches(value.release.version, RELEASE_VERSION, "release.version");
  exactObject(value.release.images, "release.images", [
    "coreApi",
    "coreMigrate",
    "coreWeb",
    "identitySetupAgent",
    "keycloak",
  ]);
  for (const [name, image] of Object.entries(value.release.images)) {
    matches(image, IMAGE_REFERENCE, `release.images.${name}`);
    if (image.endsWith(":latest"))
      fail("Mutable latest image references are not allowed");
  }

  exactObject(value.publicEndpoints, "publicEndpoints", [
    "webUrl",
    "apiUrl",
    "identityUrl",
  ]);
  for (const [name, endpoint] of Object.entries(value.publicEndpoints)) {
    validateHttpsOrigin(endpoint, `publicEndpoints.${name}`);
  }

  exactObject(value.storage, "storage", [
    "coreDatabaseVolume",
    "identityDatabaseVolume",
    "identityVaultVolume",
  ]);
  for (const [name, resource] of Object.entries(value.storage)) {
    matches(resource, RESOURCE_NAME, `storage.${name}`);
  }
  if (new Set(Object.values(value.storage)).size !== 3) {
    fail("Database and identity vault volumes must be distinct");
  }

  exactObject(value.bootstrap, "bootstrap", [
    "setupSecretOutput",
    "setupSecretTtlSeconds",
  ]);
  equal(
    value.bootstrap.setupSecretOutput,
    "terminal-once",
    "bootstrap.setupSecretOutput",
  );
  integerInRange(
    value.bootstrap.setupSecretTtlSeconds,
    900,
    86_400,
    "setupSecretTtlSeconds",
  );

  exactObject(value.secretReferences, "secretReferences", [
    "coreDatabasePassword",
    "identityDatabasePassword",
    "coreIdentityClientSecret",
    "keycloakBootstrapClientSecret",
    "identitySetupAgentToken",
    "setupSecretDigest",
  ]);
  for (const [name, reference] of Object.entries(value.secretReferences)) {
    matches(reference, RESOURCE_NAME, `secretReferences.${name}`);
  }
  if (new Set(Object.values(value.secretReferences)).size !== 6) {
    fail("Secret references must be distinct");
  }
  if (
    Object.values(value.secretReferences).includes("setup_secret_expires_at")
  ) {
    fail("Secret references must not use the reserved setup expiry file name");
  }

  exactObject(value.health, "health", [
    "livenessPath",
    "readinessPath",
    "readinessTimeoutSeconds",
  ]);
  equal(value.health.livenessPath, "/health/live", "health.livenessPath");
  equal(value.health.readinessPath, "/health/ready", "health.readinessPath");
  integerInRange(
    value.health.readinessTimeoutSeconds,
    30,
    900,
    "readinessTimeoutSeconds",
  );
  validateApplicationManifest(value.applicationManifest);
}

function validateApplicationManifest(value) {
  exactObject(value, "applicationManifest", ["schemaVersion", "applications"]);
  equal(value.schemaVersion, "1", "applicationManifest.schemaVersion");
  if (!Array.isArray(value.applications) || value.applications.length > 100) {
    fail(
      "applicationManifest.applications must be an array with at most 100 entries",
    );
  }
  const keys = new Set();
  value.applications.forEach((application, index) => {
    const path = `applicationManifest.applications[${index}]`;
    exactObject(application, path, [
      "key",
      "displayName",
      "launchUrl",
      "audience",
      "contractVersion",
    ]);
    matches(application.key, APPLICATION_KEY, `${path}.key`);
    if (keys.has(application.key))
      fail(`Duplicate application key: ${application.key}`);
    keys.add(application.key);
    if (
      typeof application.displayName !== "string" ||
      application.displayName.trim() !== application.displayName ||
      application.displayName.length < 2 ||
      application.displayName.length > 80
    ) {
      fail(`${path}.displayName is invalid`);
    }
    validateHttpsUrl(application.launchUrl, `${path}.launchUrl`);
    matches(application.audience, AUDIENCE, `${path}.audience`);
    matches(
      application.contractVersion,
      CONTRACT_VERSION,
      `${path}.contractVersion`,
    );
  });
}

function createComposeEnvironment({
  contract,
  contractPath,
  manifestPath,
  secretPaths,
  setupExpiresAt,
}) {
  const entries = {
    BUBLLIO_CONTRACT_FILE: contractPath,
    BUBLLIO_RELEASE_VERSION: contract.release.version,
    CORE_API_IMAGE: contract.release.images.coreApi,
    CORE_MIGRATE_IMAGE: contract.release.images.coreMigrate,
    CORE_WEB_IMAGE: contract.release.images.coreWeb,
    IDENTITY_SETUP_AGENT_IMAGE: contract.release.images.identitySetupAgent,
    KEYCLOAK_IMAGE: contract.release.images.keycloak,
    CORE_WEB_URL: contract.publicEndpoints.webUrl,
    CORE_API_URL: contract.publicEndpoints.apiUrl,
    KEYCLOAK_URL: contract.publicEndpoints.identityUrl,
    CORE_DATABASE_VOLUME: contract.storage.coreDatabaseVolume,
    KEYCLOAK_DATABASE_VOLUME: contract.storage.identityDatabaseVolume,
    KEYCLOAK_VAULT_VOLUME: contract.storage.identityVaultVolume,
    CORE_DATABASE_PASSWORD_FILE: secretPaths.coreDatabasePassword,
    KEYCLOAK_DATABASE_PASSWORD_FILE: secretPaths.identityDatabasePassword,
    CORE_IDENTITY_CLIENT_SECRET_FILE: secretPaths.coreIdentityClientSecret,
    KEYCLOAK_BOOTSTRAP_CLIENT_SECRET_FILE:
      secretPaths.keycloakBootstrapClientSecret,
    IDENTITY_SETUP_AGENT_TOKEN_FILE: secretPaths.identitySetupAgentToken,
    CORE_SETUP_SECRET_DIGEST_FILE: secretPaths.setupSecretDigest,
    CORE_APPLICATION_MANIFEST_FILE: manifestPath,
    CORE_SETUP_SECRET_EXPIRES_AT: setupExpiresAt,
    CORE_READY_PATH: contract.health.readinessPath,
    CORE_READY_TIMEOUT_SECONDS: String(contract.health.readinessTimeoutSeconds),
    BUBLLIO_EDGE_NETWORK: "bubllio_edge",
  };
  return `${Object.entries(entries)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n")}\n`;
}

async function ensureRandomSecret(path, exactLength) {
  if (await exists(path)) {
    await assertPrivateRegularFile(path);
  } else {
    await createPrivateFile(path, `${randomBytes(32).toString("base64url")}\n`);
  }
  const value = (await readFile(path, "utf8")).trim();
  const validLength = exactLength ? value.length === 43 : value.length >= 43;
  if (!validLength || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    fail("An existing secret file does not contain strong base64url material");
  }
}

async function createPrivateFile(path, content) {
  try {
    await writeFile(path, content, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    await assertPrivateRegularFile(path);
    return false;
  }
}

async function writePrivateFile(path, content) {
  await atomicWrite(path, content, 0o600);
}

async function writePublicFile(path, content) {
  await atomicWrite(path, content, 0o644);
}

async function atomicWrite(path, content, mode) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, content, {
    encoding: "utf8",
    flag: "wx",
    mode,
  });
  await chmod(temporaryPath, mode);
  await rename(temporaryPath, path);
  await chmod(path, mode);
}

async function ensureSafeDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const status = await lstat(path);
  if (!status.isDirectory() || status.isSymbolicLink())
    fail(`${path} must be a real directory`);
  await chmod(path, 0o700);
}

async function assertPrivateRegularFile(path) {
  const status = await lstat(path);
  if (!status.isFile() || status.isSymbolicLink())
    fail(`${path} must be a regular file`);
  await chmod(path, 0o600);
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function validateHttpsOrigin(value, name) {
  if (typeof value !== "string" || value.length > 2048)
    fail(`${name} is invalid`);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} must be a valid URL`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    value.endsWith("/")
  ) {
    fail(
      `${name} must be an exact HTTPS origin without credentials or a trailing slash`,
    );
  }
}

function validateHttpsUrl(value, name) {
  if (typeof value !== "string" || value.length > 2048)
    fail(`${name} is invalid`);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} must be a valid URL`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    fail(`${name} must be a secure URL without credentials or query data`);
  }
}

function isCanonicalTimestamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function exactObject(value, name, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${name} must contain exactly: ${expected.join(", ")}`);
  }
}

function matches(value, pattern, name) {
  if (typeof value !== "string" || !pattern.test(value))
    fail(`${name} is invalid`);
}

function equal(actual, expected, name) {
  if (actual !== expected) fail(`${name} must equal ${expected}`);
}

function integerInRange(value, minimum, maximum, name) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    fail(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}

function fail(message) {
  throw new Error(`Invalid Bubllio installation contract: ${message}`);
}
