#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateJsonSchema } from "../contract/validate.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const options = parseArguments(process.argv.slice(2));
const contractPath = resolve(options.contract);
const environmentPath = resolve(options.environment);
const composePath = resolve(options.compose);

const schema = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "deploy/contract/bubllio-installation.schema.json"),
    "utf8",
  ),
);
if (
  schema.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
  schema.additionalProperties !== false
) {
  throw new Error(
    "The canonical installation schema is not the expected strict draft 2020-12 schema",
  );
}
run(process.execPath, [
  resolve(repositoryRoot, "scripts/prepare-installation.mjs"),
  "--contract",
  contractPath,
  "--validate-only",
]);

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const schemaErrors = validateJsonSchema(contract, schema);
if (schemaErrors.length) {
  throw new Error(
    `Installation contract does not match its schema: ${schemaErrors.join("; ")}`,
  );
}
const adapterEnvironment = parseEnvironment(
  await readFile(environmentPath, "utf8"),
);
if (resolve(adapterEnvironment.BUBLLIO_CONTRACT_FILE ?? "") !== contractPath) {
  throw new Error(
    "The adapter environment was not prepared from the supplied contract",
  );
}
if (adapterEnvironment.BUBLLIO_RELEASE_VERSION !== contract.release.version) {
  throw new Error(
    "The adapter release version does not match the supplied contract",
  );
}

const composeArguments = [
  "compose",
  "--env-file",
  environmentPath,
  "-f",
  composePath,
];
const configuration = JSON.parse(
  run("docker", [...composeArguments, "config", "--format", "json"]),
);
verifyPrivateDatabases(configuration);
verifyConfiguredImages(configuration, contract.release.images);

if (options.validateOnly) {
  process.stdout.write(
    "Adapter configuration conforms to the Bubllio installation contract.\n",
  );
  process.exit(0);
}

const edgeNetwork = adapterEnvironment.BUBLLIO_EDGE_NETWORK;
if (!edgeNetwork)
  throw new Error(
    "BUBLLIO_EDGE_NETWORK is missing from the adapter environment",
  );
run("docker", ["network", "inspect", edgeNetwork]);
run("docker", [
  ...composeArguments,
  "up",
  "--detach",
  "--wait",
  "--wait-timeout",
  String(contract.health.readinessTimeoutSeconds),
]);

verifyRunningImages(composeArguments, contract.release.images);
await waitForReadiness(
  new URL(contract.health.readinessPath, `${contract.publicEndpoints.apiUrl}/`),
  contract.health.readinessTimeoutSeconds,
);

const setupUrl = new URL(
  "/setup",
  `${contract.publicEndpoints.webUrl}/`,
).toString();
process.stdout.write(
  `Adapter conformance passed. Continue product setup at ${setupUrl}\n`,
);

function verifyPrivateDatabases(configuration) {
  for (const serviceName of ["core-db", "identity-db"]) {
    const service = configuration.services?.[serviceName];
    if (!service) throw new Error(`Compose adapter is missing ${serviceName}`);
    if (service.ports?.length || service.network_mode === "host") {
      throw new Error(
        `${serviceName} must not publish a host port or use host networking`,
      );
    }
    const networkNames = Array.isArray(service.networks)
      ? service.networks
      : Object.keys(service.networks ?? {});
    if (!networkNames.length)
      throw new Error(`${serviceName} must use a private network`);
    for (const networkName of networkNames) {
      if (configuration.networks?.[networkName]?.internal !== true) {
        throw new Error(
          `${serviceName} is attached to non-private network ${networkName}`,
        );
      }
    }
  }
}

function verifyConfiguredImages(configuration, images) {
  const expected = imageServiceMap(images);
  for (const [serviceName, image] of Object.entries(expected)) {
    if (configuration.services?.[serviceName]?.image !== image) {
      throw new Error(
        `${serviceName} does not use the contract's digest-pinned image`,
      );
    }
  }
}

function verifyRunningImages(composeArguments, images) {
  for (const [serviceName, expectedImage] of Object.entries(
    imageServiceMap(images),
  )) {
    const containerId = run("docker", [
      ...composeArguments,
      "ps",
      "--all",
      "--quiet",
      serviceName,
    ]).trim();
    if (!containerId)
      throw new Error(`${serviceName} has no container after adapter startup`);
    const configuredImage = run("docker", [
      "inspect",
      "--format",
      "{{.Config.Image}}",
      containerId,
    ]).trim();
    if (configuredImage !== expectedImage) {
      throw new Error(
        `${serviceName} is not running the contract's digest-pinned image`,
      );
    }
  }
}

function imageServiceMap(images) {
  return {
    "core-api": images.coreApi,
    "core-migrate": images.coreMigrate,
    "core-web": images.coreWeb,
    "identity-bootstrap": images.keycloak,
    keycloak: images.keycloak,
  };
}

async function waitForReadiness(url, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch {
      // An external proxy or service can still be converging; retry within the contract bound.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
  }
  throw new Error(
    `Core readiness did not succeed within ${timeoutSeconds} seconds`,
  );
}

function parseEnvironment(contents) {
  const result = {};
  for (const line of contents.split(/\r?\n/u)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1)
      throw new Error("Adapter environment contains an invalid line");
    result[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return result;
}

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail =
      result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`${command} failed: ${detail}`);
  }
  return result.stdout;
}

function parseArguments(arguments_) {
  const result = {
    contract: "deploy/contract/bubllio-installation.json",
    environment: ".local/installation/compose.env",
    compose: "deploy/compose/compose.yaml",
    validateOnly: false,
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const name = arguments_[index];
    if (name === "--validate-only") {
      result.validateOnly = true;
      continue;
    }
    const value = arguments_[index + 1];
    if (
      !value ||
      !["--contract", "--env-file", "--compose-file"].includes(name)
    ) {
      throw new Error(`Unknown argument: ${name}`);
    }
    if (name === "--contract") result.contract = value;
    if (name === "--env-file") result.environment = value;
    if (name === "--compose-file") result.compose = value;
    index += 1;
  }
  return result;
}
