/** Builds an external app link. The organization ID is a navigation hint, not access proof. */
export function buildApplicationLaunchUrl(
  value: string,
  organizationId: string,
  isDevelopment: boolean,
): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const isLocalHttp =
    isDevelopment &&
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    return undefined;
  }

  url.searchParams.set("organization_id", organizationId);

  return url.href;
}
