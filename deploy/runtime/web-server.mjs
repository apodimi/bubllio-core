#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const publicDirectory = "/app/public";
const port = parsePort(process.env.PORT ?? "8080");
const runtimeConfig = Object.freeze({
  coreApiUrl: parseHttpsOrigin(process.env.CORE_API_URL, "CORE_API_URL"),
  keycloakUrl: parseHttpsOrigin(process.env.KEYCLOAK_URL, "KEYCLOAK_URL"),
});
const runtimeConfigBody = `window.__BUBLLIO_CONFIG__ = ${JSON.stringify(runtimeConfig).replaceAll("<", "\\u003c")};\n`;
const allowedConnections = [
  runtimeConfig.coreApiUrl,
  runtimeConfig.keycloakUrl,
].join(" ");

const server = createServer(async (request, response) => {
  try {
    setSecurityHeaders(response);
    const method = request.method ?? "GET";
    if (!["GET", "HEAD"].includes(method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (pathname === "/health/live" || pathname === "/health/ready") {
      send(
        response,
        method,
        200,
        "application/json; charset=utf-8",
        '{"status":"ok"}\n',
        "no-store",
      );
      return;
    }
    if (pathname === "/runtime-config.js") {
      send(
        response,
        method,
        200,
        "text/javascript; charset=utf-8",
        runtimeConfigBody,
        "no-store",
      );
      return;
    }
    const candidate = safePublicPath(pathname);
    const filePath = (await regularFile(candidate))
      ? candidate
      : extname(pathname)
        ? undefined
        : join(publicDirectory, "index.html");
    if (!filePath || !(await regularFile(filePath))) {
      send(
        response,
        method,
        404,
        "text/plain; charset=utf-8",
        "Not found\n",
        "no-store",
      );
      return;
    }
    const cacheControl = filePath.endsWith("index.html")
      ? "no-cache"
      : filePath.includes("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
    const metadata = await stat(filePath);
    response.writeHead(200, {
      "Cache-Control": cacheControl,
      "Content-Length": metadata.size,
      "Content-Type": contentType(filePath),
    });
    if (method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    if (!response.headersSent) {
      send(
        response,
        request.method ?? "GET",
        500,
        "text/plain; charset=utf-8",
        "Internal error\n",
        "no-store",
      );
    } else {
      response.destroy();
    }
  }
});

server.listen(port, "0.0.0.0");
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

function setSecurityHeaders(response) {
  response.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; base-uri 'self'; connect-src 'self' ${allowedConnections}; font-src 'self' data:; form-action 'self' ${runtimeConfig.keycloakUrl}; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'`,
  );
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function safePublicPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return join(publicDirectory, "__invalid__");
  }
  const candidate = resolve(publicDirectory, `.${normalize(decoded)}`);
  return candidate.startsWith(`${publicDirectory}/`)
    ? candidate
    : join(publicDirectory, "__invalid__");
}

async function regularFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function send(response, method, status, type, body, cacheControl) {
  response.writeHead(status, {
    "Cache-Control": cacheControl,
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": type,
  });
  response.end(method === "HEAD" ? undefined : body);
}

function parseHttpsOrigin(value, name) {
  if (!value) throw new Error(`${name} must be configured`);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    value.endsWith("/")
  ) {
    throw new Error(`${name} must be an exact HTTPS origin`);
  }
  return value;
}

function parsePort(value) {
  if (
    !/^\d{1,5}$/u.test(value) ||
    Number(value) < 1 ||
    Number(value) > 65_535
  ) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  return Number(value);
}

function contentType(path) {
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".ico": "image/x-icon",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    }[extname(path)] ?? "application/octet-stream"
  );
}
