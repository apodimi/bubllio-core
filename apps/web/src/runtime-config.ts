export interface BrowserRuntimeConfig {
  coreApiUrl: string;
  keycloakUrl: string;
}

function publicUrl(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label}_MISSING`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label}_INVALID`);
  }

  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${label}_INVALID`);
  }

  return url.toString().replace(/\/$/, "");
}

/** Public deployment endpoints only; credentials never belong in this object. */
export function browserRuntimeConfig(): BrowserRuntimeConfig {
  const runtime = window.__BUBLLIO_CONFIG__;
  const coreApiUrl =
    runtime?.coreApiUrl ??
    import.meta.env.VITE_CORE_API_URL ??
    "http://127.0.0.1:3100";
  const keycloakUrl =
    runtime?.keycloakUrl ??
    import.meta.env.VITE_KEYCLOAK_URL ??
    "http://127.0.0.1:8180";

  return {
    coreApiUrl: publicUrl(coreApiUrl, "CORE_API_URL"),
    keycloakUrl: publicUrl(keycloakUrl, "KEYCLOAK_URL"),
  };
}
