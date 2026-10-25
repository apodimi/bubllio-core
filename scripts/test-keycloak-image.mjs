#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const image = process.argv[2];
if (!image) throw new Error("Usage: test-keycloak-image.mjs <image>");
const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--entrypoint",
    "/bin/bash",
    image,
    "-ec",
    [
      'test "$(id -u)" = 1000',
      'test "$(stat -c %a /opt/keycloak/data/import)" = 755',
      'test "$(stat -c %a /opt/keycloak/data/import/bubllio-realm.json)" = 444',
      "test -x /opt/keycloak/data/import",
      "test -r /opt/keycloak/data/import/bubllio-realm.json",
      "test ! -w /opt/keycloak/data/import/bubllio-realm.json",
      "test -x /opt/keycloak/bin/bubllio-entrypoint.sh",
    ].join("; "),
  ],
  { encoding: "utf8" },
);
assert.equal(
  result.status,
  0,
  `Keycloak image permission checks failed:\n${result.stderr}`,
);
process.stdout.write("Keycloak image non-root permissions passed.\n");
