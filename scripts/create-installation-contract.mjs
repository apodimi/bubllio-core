#!/usr/bin/env node

import {
  chmod,
  link,
  lstat,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { readReleaseManifest } from "../deploy/release/manifest.mjs";
import { validateJsonSchema } from "../deploy/contract/validate.mjs";

const RESOURCE_NAME = /^[a-z][a-z0-9_-]{2,40}$/u;
const DOMAIN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;
const options = parseArguments(process.argv.slice(2));
const releaseManifest = await readReleaseManifest(options.releaseManifest);
const baseDomain = normalizeDomain(options.baseDomain);
const installationName = normalizeInstallationName(options.installationName);
const applications = options.applications
  ? JSON.parse(await readFile(options.applications, "utf8"))
  : { schemaVersion: "1", applications: [] };

const contract = {
  schemaVersion: "1",
  release: {
    version: releaseManifest.version,
    images: {
      coreApi: releaseManifest.images.coreApi,
      coreMigrate: releaseManifest.images.coreMigrate,
      coreWeb: releaseManifest.images.coreWeb,
      identitySetupAgent: releaseManifest.images.identitySetupAgent,
      keycloak: releaseManifest.images.keycloak,
    },
  },
  publicEndpoints: {
    webUrl: options.webUrl ?? `https://${baseDomain}`,
    apiUrl: options.apiUrl ?? `https://api.${baseDomain}`,
    identityUrl: options.identityUrl ?? `https://auth.${baseDomain}`,
  },
  storage: {
    coreDatabaseVolume: `${installationName}_core_database`,
    identityDatabaseVolume: `${installationName}_identity_database`,
    identityVaultVolume: `${installationName}_identity_vault`,
  },
  bootstrap: {
    setupSecretOutput: "terminal-once",
    setupSecretTtlSeconds: options.setupSecretTtlSeconds,
  },
  secretReferences: {
    coreDatabasePassword: "core_database_password",
    identityDatabasePassword: "identity_database_password",
    coreIdentityClientSecret: "core_identity_client_secret",
    keycloakBootstrapClientSecret: "keycloak_bootstrap_client_secret",
    identitySetupAgentToken: "identity_setup_agent_token",
    setupSecretDigest: "setup_secret_digest",
  },
  health: {
    livenessPath: "/health/live",
    readinessPath: "/health/ready",
    readinessTimeoutSeconds: 300,
  },
  applicationManifest: applications,
};

const schema = JSON.parse(
  await readFile(
    new URL(
      "../deploy/contract/bubllio-installation.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const errors = validateJsonSchema(contract, schema);
if (errors.length) {
  throw new Error(
    `Generated installation contract is invalid: ${errors.join("; ")}`,
  );
}

const outputPath = resolve(options.output);
await ensureSafeDirectory(dirname(outputPath));
const serializedContract = `${JSON.stringify(contract, null, 2)}\n`;
if (await reuseIdenticalContract(outputPath, serializedContract)) {
  process.stdout.write(`Reused installation contract: ${outputPath}\n`);
  process.exit(0);
}
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, serializedContract, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});
await chmod(temporaryPath, 0o600);
try {
  await link(temporaryPath, outputPath);
} finally {
  await unlink(temporaryPath);
}
await chmod(outputPath, 0o600);
process.stdout.write(`Created installation contract: ${outputPath}\n`);

async function ensureSafeDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const information = await lstat(path);
  if (!information.isDirectory() || information.isSymbolicLink()) {
    throw new Error(`Refusing unsafe installation state directory: ${path}`);
  }
  await chmod(path, 0o700);
}

async function reuseIdenticalContract(path, expected) {
  let information;
  try {
    information = await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  if (information.isSymbolicLink() || !information.isFile()) {
    throw new Error(`Refusing unsafe installation contract path: ${path}`);
  }
  if ((await readFile(path, "utf8")) !== expected) {
    throw new Error(
      `Installation contract already exists with different values: ${path}`,
    );
  }
  await chmod(path, 0o600);
  return true;
}

function parseArguments(arguments_) {
  const result = {
    releaseManifest: undefined,
    baseDomain: undefined,
    installationName: "bubllio",
    output: undefined,
    applications: undefined,
    webUrl: undefined,
    apiUrl: undefined,
    identityUrl: undefined,
    setupSecretTtlSeconds: 86_400,
  };
  const valueOptions = new Map([
    ["--release-manifest", "releaseManifest"],
    ["--base-domain", "baseDomain"],
    ["--installation-name", "installationName"],
    ["--output", "output"],
    ["--applications", "applications"],
    ["--web-url", "webUrl"],
    ["--api-url", "apiUrl"],
    ["--identity-url", "identityUrl"],
  ]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const name = arguments_[index];
    if (name === "--setup-secret-ttl-seconds") {
      result.setupSecretTtlSeconds = Number(arguments_[index + 1]);
      index += 1;
      continue;
    }
    const property = valueOptions.get(name);
    const value = arguments_[index + 1];
    if (!property || !value)
      throw new Error(`Unknown or incomplete argument: ${name}`);
    result[property] = value;
    index += 1;
  }
  for (const required of ["releaseManifest", "baseDomain", "output"]) {
    if (!result[required])
      throw new Error(`Missing --${toKebabCase(required)}`);
  }
  if (
    !Number.isInteger(result.setupSecretTtlSeconds) ||
    result.setupSecretTtlSeconds < 900 ||
    result.setupSecretTtlSeconds > 86_400
  ) {
    throw new Error(
      "--setup-secret-ttl-seconds must be an integer from 900 to 86400",
    );
  }
  return result;
}

function normalizeDomain(value) {
  const normalized = value.trim().toLowerCase().replace(/\.$/u, "");
  if (!DOMAIN.test(normalized)) {
    throw new Error(
      "--base-domain must be a DNS hostname without scheme, path, wildcard, or port",
    );
  }
  return normalized;
}

function normalizeInstallationName(value) {
  const normalized = value.trim().toLowerCase();
  if (!RESOURCE_NAME.test(normalized)) {
    throw new Error("--installation-name must match ^[a-z][a-z0-9_-]{2,40}$");
  }
  return normalized;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
}
