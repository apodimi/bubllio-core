import { z } from "zod";

const viteEnvSchema = z.object({
  VITE_CORE_API_URL: z.string().optional(),
  VITE_KEYCLOAK_URL: z.string().optional(),
});

const runtimeEnvSchema = z.strictObject({
  coreApiUrl: z.string().optional(),
  keycloakUrl: z.string().optional(),
});

const publicEndpointSchema = z.url().superRefine((value, context) => {
  const url = new URL(value);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (
    (url.protocol !== "https:" &&
      !(import.meta.env.DEV && local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    value.endsWith("/")
  ) {
    context.addIssue({ code: "custom", message: "PUBLIC_ENDPOINT_INVALID" });
  }
});

export const browserRuntimeConfigSchema = z.object({
  coreApiUrl: publicEndpointSchema,
  keycloakUrl: publicEndpointSchema,
});
export type BrowserRuntimeConfig = z.infer<typeof browserRuntimeConfigSchema>;

const viteEnv = viteEnvSchema.safeParse(import.meta.env);
const runtimeEnv = runtimeEnvSchema.safeParse(window.__BUBLLIO_CONFIG__ ?? {});
if (!viteEnv.success || !runtimeEnv.success) {
  throw new Error("WEB_ENV_INVALID");
}

const configured = browserRuntimeConfigSchema.safeParse(
  import.meta.env.PROD
    ? runtimeEnv.data
    : {
        coreApiUrl:
          runtimeEnv.data.coreApiUrl ??
          viteEnv.data.VITE_CORE_API_URL ??
          "http://127.0.0.1:3100",
        keycloakUrl:
          runtimeEnv.data.keycloakUrl ??
          viteEnv.data.VITE_KEYCLOAK_URL ??
          "http://127.0.0.1:8180",
      },
);
if (!configured.success) {
  throw new Error("WEB_ENV_INVALID");
}

/** Public deployment endpoints only; credentials never belong in this object. */
export const env: BrowserRuntimeConfig = {
  coreApiUrl: configured.data.coreApiUrl.replace(/\/$/u, ""),
  keycloakUrl: configured.data.keycloakUrl.replace(/\/$/u, ""),
};

export function browserRuntimeConfig(): BrowserRuntimeConfig {
  return env;
}
