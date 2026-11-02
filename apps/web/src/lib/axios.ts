import axios, { type AxiosRequestConfig } from "axios";

import { env } from "@/config/env";
import { keycloak } from "./keycloak";

export class CoreHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const coreHttp = axios.create({
  baseURL: env.coreApiUrl,
  allowAbsoluteUrls: false,
  adapter: "fetch",
  fetchOptions: { cache: "no-store" },
  responseType: "text",
  withCredentials: false,
  withXSRFToken: false,
});

type BearerRequestConfig = AxiosRequestConfig & { requiresBearer?: boolean };

coreHttp.interceptors.request.use(async (config) => {
  if (!(config as BearerRequestConfig).requiresBearer) {
    return config;
  }
  try {
    await keycloak.updateToken(30);
  } catch {
    throw new Error("SESSION_EXPIRED");
  }
  if (!keycloak.token) {
    throw new Error("SESSION_EXPIRED");
  }
  config.headers.set("Authorization", `Bearer ${keycloak.token}`);

  return config;
});

coreHttp.interceptors.response.use(
  (response) => {
    response.data = JSON.parse(response.data as string);

    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const { data, status } = error.response;
        let body: unknown;
        try {
          body = JSON.parse(data as string);
        } catch {
          body = undefined;
        }
        const code =
          body && typeof body === "object"
            ? Reflect.get(body, "code")
            : undefined;
        // Axios errors retain request config; expose only the safe code/status.
        return Promise.reject(
          new CoreHttpError(
            typeof code === "string" ? code : `HTTP_${status}`,
            status,
          ),
        );
      }

      return Promise.reject(new Error(error.message));
    }

    return Promise.reject(error);
  },
);

/** Sends a Core API request; bearer credentials are attached only when required. */
export async function requestCore(
  path: string,
  requiresBearer = false,
  config: Pick<
    AxiosRequestConfig,
    "method" | "headers" | "data" | "signal"
  > = {},
): Promise<unknown> {
  const { data } = await coreHttp.request<unknown>({
    ...config,
    url: path,
    requiresBearer,
  } as BearerRequestConfig);

  return data;
}
