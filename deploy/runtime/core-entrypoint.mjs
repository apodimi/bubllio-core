#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

const mode = process.argv[2] ?? "api";
if (!["api", "migrate"].includes(mode)) {
  throw new Error("Core entrypoint mode must be api or migrate");
}

const environment = { ...process.env };
const databasePassword = await readRequiredSecret(
  environment.CORE_DB_PASSWORD_FILE,
);
environment.DATABASE_URL = createDatabaseUrl(environment, databasePassword);

if (mode === "api") {
  environment.CORE_KEYCLOAK_CLIENT_SECRET = await readRequiredSecret(
    environment.CORE_KEYCLOAK_CLIENT_SECRET_FILE,
  );
  environment.CORE_SETUP_SECRET_SHA256 = await readRequiredSecret(
    environment.CORE_SETUP_SECRET_SHA256_FILE,
  );
  environment.CORE_IDENTITY_SETUP_AGENT_TOKEN = await readRequiredSecret(
    environment.CORE_IDENTITY_SETUP_AGENT_TOKEN_FILE,
  );
}

const command = mode === "migrate" ? "/usr/local/bin/npm" : process.execPath;
const arguments_ =
  mode === "api"
    ? ["dist/main.js"]
    : ["run", "db:deploy"];
const child = spawn(command, arguments_, {
  cwd: "/app",
  env: environment,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  process.stderr.write(`Unable to start Core ${mode}: ${error.message}\n`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

async function readRequiredSecret(path) {
  if (!path) throw new Error("A required secret file path is missing");
  const metadata = await stat(path);
  if (!metadata.isFile())
    throw new Error("A required secret path is not a regular file");
  const value = (await readFile(path, "utf8")).trim();
  if (!value) throw new Error("A required secret file is empty");
  return value;
}

function createDatabaseUrl(source, password) {
  const host = source.CORE_DB_HOST ?? "core-db";
  const port = source.CORE_DB_PORT ?? "5432";
  const name = source.CORE_DB_NAME ?? "bubllio_core";
  const user = source.CORE_DB_USER ?? "bubllio_core";
  if (!/^[a-zA-Z0-9.-]+$/u.test(host))
    throw new Error("CORE_DB_HOST is invalid");
  if (!/^\d{1,5}$/u.test(port) || Number(port) > 65_535)
    throw new Error("CORE_DB_PORT is invalid");
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]{0,62}$/u.test(name))
    throw new Error("CORE_DB_NAME is invalid");
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]{0,62}$/u.test(user))
    throw new Error("CORE_DB_USER is invalid");
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}
