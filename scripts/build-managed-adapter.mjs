#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { readReleaseManifest } from "../deploy/release/manifest.mjs";

const options = parseArguments(process.argv.slice(2));
const manifest = await readReleaseManifest(options.releaseManifest);
let compose = await readFile(resolve(options.template), "utf8");
const replacements = new Map([
  ["__INSTALLER_IMAGE__", manifest.images.installer],
  ["__KEYCLOAK_IMAGE__", manifest.images.keycloak],
  ["__IDENTITY_SETUP_AGENT_IMAGE__", manifest.images.identitySetupAgent],
  ["__CORE_MIGRATE_IMAGE__", manifest.images.coreMigrate],
  ["__CORE_API_IMAGE__", manifest.images.coreApi],
  ["__CORE_WEB_IMAGE__", manifest.images.coreWeb],
]);
for (const [token, value] of replacements) {
  if (!compose.includes(token))
    throw new Error(`Adapter template lacks ${token}`);
  compose = compose.replaceAll(token, value);
}
if (/__[A-Z0-9_]+__/u.test(compose)) {
  throw new Error("Adapter template contains an unresolved token");
}
await writeFile(resolve(options.output), compose, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o644,
});
process.stdout.write(`Built managed Compose adapter: ${options.output}\n`);

function parseArguments(arguments_) {
  const result = {
    releaseManifest: undefined,
    template: "deploy/managed/dokploy-compose.template.yaml",
    output: undefined,
  };
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!value) throw new Error(`Missing value for ${name}`);
    if (name === "--release-manifest") result.releaseManifest = value;
    else if (name === "--template") result.template = value;
    else if (name === "--output") result.output = value;
    else throw new Error(`Unknown argument: ${name}`);
  }
  if (!result.releaseManifest) throw new Error("Missing --release-manifest");
  if (!result.output) throw new Error("Missing --output");
  return result;
}
