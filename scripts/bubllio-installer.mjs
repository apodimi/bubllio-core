#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [command, ...arguments_] = process.argv.slice(2);
if (command !== "prepare") {
  throw new Error("Usage: bubllio-installer prepare <options>");
}
const options = parseArguments(arguments_);
await mkdir(options.stateDirectory, { recursive: true, mode: 0o700 });
const contractPath = resolve(options.stateDirectory, "installation.json");

run(resolve(root, "scripts/create-installation-contract.mjs"), [
  "--release-manifest",
  options.releaseManifest,
  "--base-domain",
  options.baseDomain,
  "--installation-name",
  options.installationName,
  "--output",
  contractPath,
  "--setup-secret-ttl-seconds",
  String(options.setupSecretTtlSeconds),
  ...(options.applications ? ["--applications", options.applications] : []),
]);
run(resolve(root, "scripts/prepare-installation.mjs"), [
  "--contract",
  contractPath,
  "--output-dir",
  options.stateDirectory,
  "--runtime-output-dir",
  options.hostStateDirectory,
  "--edge-network",
  options.edgeNetwork,
]);

function parseArguments(values) {
  const result = {
    releaseManifest: undefined,
    stateDirectory: undefined,
    hostStateDirectory: undefined,
    baseDomain: undefined,
    edgeNetwork: undefined,
    installationName: "bubllio",
    applications: undefined,
    setupSecretTtlSeconds: 86_400,
  };
  const valueOptions = new Map([
    ["--release-manifest", "releaseManifest"],
    ["--state-dir", "stateDirectory"],
    ["--host-state-dir", "hostStateDirectory"],
    ["--base-domain", "baseDomain"],
    ["--edge-network", "edgeNetwork"],
    ["--installation-name", "installationName"],
    ["--applications", "applications"],
  ]);
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (name === "--setup-secret-ttl-seconds") {
      result.setupSecretTtlSeconds = Number(values[index + 1]);
      index += 1;
      continue;
    }
    const property = valueOptions.get(name);
    const value = values[index + 1];
    if (!property || !value)
      throw new Error(`Unknown or incomplete argument: ${name}`);
    result[property] = value;
    index += 1;
  }
  for (const required of [
    "releaseManifest",
    "stateDirectory",
    "hostStateDirectory",
    "baseDomain",
    "edgeNetwork",
  ]) {
    if (!result[required])
      throw new Error(`Missing installer option: ${required}`);
  }
  result.stateDirectory = resolve(result.stateDirectory);
  if (!isAbsolute(result.hostStateDirectory)) {
    throw new Error("--host-state-dir must be an absolute host path");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,62}$/u.test(result.edgeNetwork)) {
    throw new Error("--edge-network contains unsupported characters");
  }
  return result;
}

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
