#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [image, manifestOption, manifestPath] = process.argv.slice(2);
if (
  !image ||
  (manifestOption && (manifestOption !== "--release-manifest" || !manifestPath))
) {
  throw new Error(
    "Usage: test-managed-stack.mjs <keycloak-image> [--release-manifest <file>]",
  );
}
const project = `bubllio-smoke-${randomBytes(6).toString("hex")}`;
const network = `${project}-edge`;
const directory = await mkdtemp(join(tmpdir(), `${project}-`));
const composeDirectory = join(directory, "deploy", "managed");
const composePath = join(composeDirectory, "compose.yaml");
const manifest = JSON.parse(
  await readFile(
    new URL("../deploy/managed/release-manifest.json", import.meta.url),
    "utf8",
  ),
);
let compose = await readFile(
  new URL("../deploy/managed/compose.yaml", import.meta.url),
  "utf8",
);
if (manifestPath) {
  const { readReleaseManifest } =
    await import("../deploy/release/manifest.mjs");
  const candidate = await readReleaseManifest(manifestPath);
  for (const [key, previous] of Object.entries(manifest.images)) {
    compose = compose.replaceAll(previous, candidate.images[key]);
  }
  compose = compose.replaceAll(candidate.images.keycloak, image);
} else {
  compose = compose.replaceAll(manifest.images.keycloak, image);
}
compose = compose
  // The candidate Keycloak image is built locally before publication.
  .replaceAll("pull_policy: always", "pull_policy: missing");
await mkdir(join(directory, "deploy", "identity-edge"), { recursive: true });
await copyFile(
  new URL("../deploy/identity-edge/nginx.conf", import.meta.url),
  join(directory, "deploy", "identity-edge", "nginx.conf"),
);
await mkdir(composeDirectory, { recursive: true });
await writeFile(composePath, compose);
const secret = randomBytes(32).toString("base64url");
const environment = {
  ...process.env,
  BUBLLIO_BASE_DOMAIN: "smoke.example.com",
  BUBLLIO_EDGE_NETWORK: network,
  BUBLLIO_SETUP_SECRET: secret,
};
const args = ["compose", "-p", project, "-f", composePath];

try {
  run(["network", "create", network]);
  run([...args, "up", "-d", "--wait", "--wait-timeout", "300"]);
  verify();
  const stateBefore = fingerprint();
  // A redeploy without the raw secret must preserve the initialized state.
  delete environment.BUBLLIO_SETUP_SECRET;
  run([...args, "up", "-d", "--wait", "--wait-timeout", "120"]);
  verify();
  assert.equal(
    fingerprint(),
    stateBefore,
    "Redeploy must preserve credentials and setup proof",
  );
  process.stdout.write(
    "Managed production stack: fresh bootstrap and secret-free redeploy passed.\n",
  );
} catch (error) {
  const logs = spawnSync(
    "docker",
    [...args, "logs", "--no-color", "--tail", "40"],
    {
      env: environment,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  process.stderr.write(
    (logs.stdout + logs.stderr).replaceAll(secret, "<REDACTED>"),
  );
  throw error;
} finally {
  // Only this script's uniquely named disposable project is removed.
  const cleanup = spawnSync(
    "docker",
    [...args, "down", "--volumes", "--remove-orphans"],
    {
      env: environment,
      encoding: "utf8",
    },
  );
  const networkCleanup = spawnSync("docker", ["network", "rm", network], {
    encoding: "utf8",
  });
  await rm(directory, { recursive: true, force: true });
  assert.equal(cleanup.status, 0, "Disposable stack cleanup failed");
  assert.equal(networkCleanup.status, 0, "Disposable network cleanup failed");
}

function run(arguments_) {
  const result = spawnSync("docker", arguments_, {
    env: environment,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    `Production stack command failed:\n${(result.stdout + result.stderr).replaceAll(secret, "<REDACTED>")}`,
  );
  return result.stdout;
}

function verify() {
  run([
    ...args,
    "exec",
    "-T",
    "core-api",
    "node",
    "-e",
    "fetch('http://127.0.0.1:3100/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))",
  ]);
  const output = run([...args, "ps", "--all", "--format", "json"]).trim();
  const list = output.startsWith("[")
    ? JSON.parse(output)
    : output
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
  for (const container of list) {
    assert.ok(
      !container.Publishers?.some((p) => p.PublishedPort > 0),
      "The test stack must not publish host ports",
    );
  }
  run([
    ...args,
    "exec",
    "-T",
    "identity-edge",
    "sh",
    "-ec",
    "wget -q -O /dev/null http://127.0.0.1:8080/realms/bubllio/.well-known/openid-configuration && for path in /admin /admin/ /admin/realms/master; do test \"$(wget -S -O /dev/null http://127.0.0.1:8080$path 2>&1 | awk '$1 ~ /^HTTP/ { code = $2 } END { print code }')\" = 404; done",
  ]);
  run([
    ...args,
    "exec",
    "-T",
    "identity-setup-agent",
    "node",
    "-e",
    `
    const fs = require('node:fs');
    async function check() {
      const base = 'http://keycloak:8080/realms/bubllio';
      const discovery = await fetch(base + '/.well-known/openid-configuration');
      if (!discovery.ok || (await discovery.json()).issuer !== 'https://auth.smoke.example.com/realms/bubllio') throw Error('Issuer mismatch');
      for (const [client, path] of [
        ['bubllio-core-runtime', process.env.KEYCLOAK_RUNTIME_CLIENT_SECRET_FILE],
        ['bubllio-identity-bootstrap', process.env.KEYCLOAK_BOOTSTRAP_CLIENT_SECRET_FILE]
      ]) {
        const response = await fetch(base + '/protocol/openid-connect/token', {
          method: 'POST', body: new URLSearchParams({
            grant_type: 'client_credentials', client_id: client,
            client_secret: fs.readFileSync(path, 'utf8').trim()
          })
        });
        if (!response.ok) throw Error('Machine identity rejected: ' + client + ' HTTP ' + response.status);
        if (typeof (await response.json()).access_token !== 'string') throw Error('Missing machine token');
      }
    }
    check().catch(e => { console.error(e.message); process.exitCode = 1; });
  `,
  ]);
}

function fingerprint() {
  return run([
    ...args,
    "exec",
    "-T",
    "core-api",
    "node",
    "-e",
    `
    const fs = require('node:fs');
    const hash = require('node:crypto').createHash('sha256');
    for (const key of ['CORE_DB_PASSWORD_FILE', 'CORE_KEYCLOAK_CLIENT_SECRET_FILE', 'CORE_IDENTITY_SETUP_AGENT_TOKEN_FILE', 'CORE_SETUP_MATERIAL_FILE']) hash.update(fs.readFileSync(process.env[key]));
    console.log(hash.digest('hex'));
  `,
  ]);
}
