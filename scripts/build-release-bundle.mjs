#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readReleaseManifest } from "../deploy/release/manifest.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const options = parseArguments(process.argv.slice(2));
const manifest = await readReleaseManifest(options.releaseManifest);
const outputDirectory = resolve(options.outputDirectory);
await ensureEmptyDirectory(outputDirectory);

const files = new Map([
  ["deploy/compose/compose.yaml", "deploy/compose/compose.yaml"],
  ["deploy/keycloak/bubllio-realm.json", "deploy/keycloak/bubllio-realm.json"],
]);
for (const [source, target] of files) {
  await copy(resolve(root, source), join(outputDirectory, target));
}

const manifestContents = `${JSON.stringify(manifest, null, 2)}\n`;
await write(join(outputDirectory, "release-manifest.json"), manifestContents);

const wrapperTemplate = await readFile(
  resolve(root, "deploy/bundle/bubllio.sh"),
  "utf8",
);
const wrapper = replaceTokens(wrapperTemplate, manifest);
const wrapperPath = join(outputDirectory, "bubllio");
await write(wrapperPath, wrapper);
await chmod(wrapperPath, 0o755);

const readmeTemplate = await readFile(
  resolve(root, "deploy/bundle/README.md"),
  "utf8",
);
await write(
  join(outputDirectory, "README.md"),
  readmeTemplate.replaceAll("__BUBLLIO_RELEASE_VERSION__", manifest.version),
);

const checksumFiles = [
  "README.md",
  "bubllio",
  "deploy/compose/compose.yaml",
  "deploy/keycloak/bubllio-realm.json",
  "release-manifest.json",
];
const checksums = [];
for (const path of checksumFiles) {
  const digest = createHash("sha256")
    .update(await readFile(join(outputDirectory, path)))
    .digest("hex");
  checksums.push(`${digest}  ${path}`);
}
await write(
  join(outputDirectory, "CHECKSUMS.sha256"),
  `${checksums.join("\n")}\n`,
);

process.stdout.write(
  `Built Bubllio ${manifest.version} release bundle: ${outputDirectory}\n`,
);

function parseArguments(arguments_) {
  const result = { releaseManifest: undefined, outputDirectory: undefined };
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!value) throw new Error(`Missing value for ${name}`);
    if (name === "--release-manifest") result.releaseManifest = value;
    else if (name === "--output-dir") result.outputDirectory = value;
    else throw new Error(`Unknown argument: ${name}`);
  }
  if (!result.releaseManifest) throw new Error("Missing --release-manifest");
  if (!result.outputDirectory) throw new Error("Missing --output-dir");
  return result;
}

async function ensureEmptyDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o755 });
  const entries = await readdir(path);
  if (entries.length) {
    throw new Error(`Bundle output directory must be empty: ${path}`);
  }
}

async function copy(source, target) {
  await mkdir(dirname(target), { recursive: true, mode: 0o755 });
  await copyFile(source, target);
  await chmod(target, 0o644);
}

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true, mode: 0o755 });
  await writeFile(path, contents, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o644,
  });
}

function replaceTokens(template, manifest) {
  const replacements = new Map([
    ["__BUBLLIO_INSTALLER_IMAGE__", manifest.images.installer],
    ["__BUBLLIO_RELEASE_VERSION__", manifest.version],
  ]);
  let output = template;
  for (const [token, value] of replacements) {
    if (!output.includes(token))
      throw new Error(`Bundle template lacks ${token}`);
    output = output.replaceAll(token, value);
  }
  if (/__BUBLLIO_[A-Z_]+__/u.test(output)) {
    throw new Error("Bundle template contains unresolved tokens");
  }
  return output;
}
