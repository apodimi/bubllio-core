#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
verifyIdentitySetupBoundary(configuration);
verifyPublicIdentityBoundary(configuration);
verifyRealmBootstrapContract();

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

function verifyIdentitySetupBoundary(configuration) {
  const agent = configuration.services?.["identity-setup-agent"];
  const keycloak = configuration.services?.keycloak;
  const vaultInit = configuration.services?.["identity-vault-init"];
  if (!agent || !keycloak || !vaultInit) {
    throw new Error("Compose adapter is missing the identity setup boundary");
  }
  if (agent.ports?.length || agent.network_mode === "host") {
    throw new Error("identity-setup-agent must not publish a host port");
  }
  const agentNetworks = Array.isArray(agent.networks)
    ? agent.networks
    : Object.keys(agent.networks ?? {});
  const privateNetworks = agentNetworks.filter(
    (network) => configuration.networks?.[network]?.internal === true,
  );
  const egressNetworks = agentNetworks.filter(
    (network) => configuration.networks?.[network]?.internal !== true,
  );
  if (
    agentNetworks.length !== 2 ||
    privateNetworks.length !== 1 ||
    egressNetworks.length !== 1 ||
    configuration.networks?.[egressNetworks[0]]?.external === true
  ) {
    throw new Error(
      "identity-setup-agent must use one private control network and one Compose-owned SMTP egress network",
    );
  }
  const egressNetwork = egressNetworks[0];
  const keycloakNetworks = Array.isArray(keycloak.networks)
    ? keycloak.networks
    : Object.keys(keycloak.networks ?? {});
  if (!keycloakNetworks.includes(egressNetwork)) {
    throw new Error(
      "Keycloak must share the reviewed SMTP egress network with the setup agent",
    );
  }
  if ((keycloak.networks?.[egressNetwork]?.gw_priority ?? 0) < 1) {
    throw new Error(
      "Keycloak must prefer the reviewed SMTP egress network as its default gateway",
    );
  }
  for (const [serviceName, service] of Object.entries(
    configuration.services ?? {},
  )) {
    if (serviceName === "identity-setup-agent" || serviceName === "keycloak")
      continue;
    const serviceNetworks = Array.isArray(service.networks)
      ? service.networks
      : Object.keys(service.networks ?? {});
    if (serviceNetworks.includes(egressNetwork)) {
      throw new Error(
        `SMTP egress network must be limited to the setup agent and Keycloak, not ${serviceName}`,
      );
    }
  }
  if (agent.environment?.IDENTITY_SETUP_AGENT_ALLOW_INSECURE_SMTP === "true") {
    throw new Error("Portable production must not permit insecure SMTP");
  }
  const expectedAgentEnvironment = {
    PORT: "3200",
    IDENTITY_SETUP_AGENT_TOKEN_FILE: "/run/secrets/identity_setup_agent_token",
    KEYCLOAK_ADMIN_URL: "http://keycloak:8080",
    KEYCLOAK_BOOTSTRAP_CLIENT_SECRET_FILE:
      "/run/secrets/keycloak_bootstrap_client_secret",
    KEYCLOAK_RUNTIME_CLIENT_SECRET_FILE:
      "/run/secrets/core_identity_client_secret",
  };
  for (const [name, expected] of Object.entries(expectedAgentEnvironment)) {
    if (agent.environment?.[name] !== expected) {
      throw new Error(`identity-setup-agent has an invalid ${name} contract`);
    }
  }
  const coreEnvironment = configuration.services?.["core-api"]?.environment;
  if (
    coreEnvironment?.CORE_IDENTITY_SETUP_AGENT_URL !==
      "http://identity-setup-agent:3200" ||
    coreEnvironment?.CORE_IDENTITY_SETUP_AGENT_TOKEN_FILE !==
      "/run/secrets/identity_setup_agent_token"
  ) {
    throw new Error("Core API has an invalid identity setup agent contract");
  }
  if (vaultInit.network_mode !== "none") {
    throw new Error(
      "Identity vault initialization must not have network access",
    );
  }

  const agentVault = findMount(agent, "/opt/keycloak/vault");
  const keycloakVault = findMount(keycloak, "/opt/keycloak/vault");
  const initVault = findMount(vaultInit, "/opt/keycloak/vault");
  if (!agentVault || !keycloakVault || !initVault) {
    throw new Error(
      "Identity vault must be mounted by init, setup agent, and Keycloak",
    );
  }
  if (
    agentVault.source !== keycloakVault.source ||
    agentVault.source !== initVault.source ||
    keycloakVault.read_only !== true ||
    agentVault.read_only === true
  ) {
    throw new Error(
      "Identity vault ownership or read-only boundaries are invalid",
    );
  }
  if (
    keycloak.environment?.KC_VAULT !== "file" ||
    keycloak.environment?.KC_VAULT_DIR !== "/opt/keycloak/vault"
  ) {
    throw new Error("Keycloak file vault runtime is not configured correctly");
  }
  if (findMount(configuration.services?.["core-api"], "/opt/keycloak/vault")) {
    throw new Error("Core API must not mount the identity vault");
  }
  if (coreEnvironment?.CORE_INSTALLATION_MASTER_KEY_FILE !== undefined) {
    throw new Error(
      "The obsolete installation master key must not be configured",
    );
  }
}

function verifyPublicIdentityBoundary(configuration) {
  const gateway = configuration.services?.["identity-edge"];
  const keycloak = configuration.services?.keycloak;
  if (!gateway || !keycloak) {
    throw new Error("Compose adapter is missing the public identity boundary");
  }
  const gatewayNetworks = serviceNetworks(gateway);
  const keycloakNetworks = serviceNetworks(keycloak);
  const sharedPrivateNetworks = gatewayNetworks.filter(
    (network) =>
      keycloakNetworks.includes(network) &&
      configuration.networks?.[network]?.internal === true,
  );
  const gatewayExternalNetworks = gatewayNetworks.filter(
    (network) => configuration.networks?.[network]?.external === true,
  );
  const keycloakExternalNetworks = keycloakNetworks.filter(
    (network) => configuration.networks?.[network]?.external === true,
  );
  if (
    sharedPrivateNetworks.length !== 1 ||
    gatewayExternalNetworks.length !== 1 ||
    keycloakExternalNetworks.length !== 0
  ) {
    throw new Error(
      "Only identity-edge may expose Keycloak through one external and one shared private network",
    );
  }
  if (gateway.ports?.length || gateway.network_mode === "host") {
    throw new Error(
      "identity-edge must use only the selected reverse-proxy network",
    );
  }
  const proxy = findConfig(gateway, "/etc/nginx/nginx.conf");
  if (!proxy || String(proxy.mode) !== "0444") {
    throw new Error(
      "identity-edge must mount its reviewed proxy policy read-only",
    );
  }
  const policy = readFileSync(
    resolve(repositoryRoot, "deploy/identity-edge/nginx.conf"),
    "utf8",
  );
  if (!policy.includes("location ~ ^/admin(?:/|$)")) {
    throw new Error("identity-edge must deny /admin and all child paths");
  }
}

function serviceNetworks(service) {
  return Array.isArray(service.networks)
    ? service.networks
    : Object.keys(service.networks ?? {});
}

function findConfig(service, target) {
  return (service?.configs ?? []).find((config) =>
    typeof config === "string" ? false : config.target === target,
  );
}

function findMount(service, target) {
  const mounts = service?.volumes ?? [];
  return mounts.find((mount) =>
    typeof mount === "string"
      ? mount.split(":")[1] === target
      : mount.target === target,
  );
}

function verifyRealmBootstrapContract() {
  const realm = JSON.parse(
    run(process.execPath, [
      "-e",
      `process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(resolve(repositoryRoot, "deploy/keycloak/bubllio-realm.json"))}, 'utf8'))`,
    ]),
  );
  if (realm.registrationAllowed !== false) {
    throw new Error(
      "Portable realm registration must stay closed until identity finalization",
    );
  }
  const roleSet = (clientId) =>
    new Set(
      realm.users?.find((user) => user.serviceAccountClientId === clientId)
        ?.clientRoles?.["realm-management"] ?? [],
    );
  const bootstrapRoles = roleSet("bubllio-identity-bootstrap");
  if (
    bootstrapRoles.size !== 2 ||
    !bootstrapRoles.has("manage-realm") ||
    !bootstrapRoles.has("manage-clients")
  ) {
    throw new Error(
      "Identity bootstrap client roles differ from the reviewed authority",
    );
  }
  if (!roleSet("bubllio-core-runtime").has("view-realm")) {
    throw new Error(
      "Core runtime must retain the reviewed view-realm capability",
    );
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
    "identity-setup-agent": images.identitySetupAgent,
    "identity-bootstrap": images.keycloak,
    "identity-vault-init": images.keycloak,
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
