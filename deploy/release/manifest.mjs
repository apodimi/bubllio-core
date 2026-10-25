import { readFile } from "node:fs/promises";

const IMAGE_REFERENCE =
  /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?::\d+)?(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+@sha256:[a-f0-9]{64}$/u;
const RELEASE_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;
const COMMIT_SHA = /^[a-f0-9]{40}$/u;

export const RELEASE_IMAGE_KEYS = [
  "coreApi",
  "coreMigrate",
  "coreWeb",
  "identitySetupAgent",
  "installer",
  "keycloak",
];

/** Read and validate the immutable authority emitted by the release workflow. */
export async function readReleaseManifest(path) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  validateReleaseManifest(manifest);
  return manifest;
}

export function validateReleaseManifest(manifest) {
  exactObject(manifest, "release manifest", [
    "schemaVersion",
    "releaseRef",
    "version",
    "commitSha",
    "images",
  ]);
  if (manifest.schemaVersion !== "1") fail("schemaVersion must equal 1");
  if (
    typeof manifest.releaseRef !== "string" ||
    !manifest.releaseRef.trim() ||
    manifest.releaseRef.length > 255
  ) {
    fail("releaseRef is invalid");
  }
  if (!RELEASE_VERSION.test(manifest.version)) fail("version is invalid");
  if (!COMMIT_SHA.test(manifest.commitSha)) fail("commitSha is invalid");
  exactObject(manifest.images, "release manifest images", RELEASE_IMAGE_KEYS);
  for (const [name, image] of Object.entries(manifest.images)) {
    if (!IMAGE_REFERENCE.test(image))
      fail(`${name} image is not digest-pinned`);
  }
}

function exactObject(value, name, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${name} must contain exactly: ${expected.join(", ")}`);
  }
}

function fail(message) {
  throw new Error(`Invalid Bubllio release manifest: ${message}`);
}
