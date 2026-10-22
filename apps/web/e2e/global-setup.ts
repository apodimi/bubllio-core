const keycloakUrl = process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8180";
const realm = "bubllio";

interface KeycloakResource {
  id: string;
  name?: string;
  alias?: string;
  username?: string;
  config?: Record<string, string>;
}

async function globalSetup(): Promise<void> {
  const accessToken = await getAdminAccessToken();
  const authorization = { Authorization: `Bearer ${accessToken}` };

  await ensureOrganizationMapperIncludesIds(authorization);

  const organization = await ensureDemoOrganization(authorization);
  const user = await findOne<KeycloakResource>(
    `/admin/realms/${realm}/users?username=spike-user&exact=true`,
    authorization,
    "spike-user",
  );

  const response = await fetch(
    `${keycloakUrl}/admin/realms/${realm}/organizations/${organization.id}/members`,
    {
      method: "POST",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify(user.id),
    },
  );

  // Conflict means the fixture was already prepared by an earlier test run.
  if (!response.ok && response.status !== 409) {
    throw new Error(
      `Could not add spike-user to Demo Workspace (${response.status})`,
    );
  }
}

async function getAdminAccessToken(): Promise<string> {
  const response = await fetch(
    `${keycloakUrl}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: process.env.KEYCLOAK_BOOTSTRAP_ADMIN_USERNAME ?? "admin",
        password:
          process.env.KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD ??
          "local-keycloak-admin-password",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Could not authenticate the local Keycloak test administrator (${response.status})`,
    );
  }

  return ((await response.json()) as { access_token: string }).access_token;
}

async function ensureOrganizationMapperIncludesIds(
  authorization: Record<string, string>,
): Promise<void> {
  const scope = await findOne<KeycloakResource>(
    `/admin/realms/${realm}/client-scopes`,
    authorization,
    "organization",
    (item) => item.name === "organization",
  );
  const mapper = await findOne<KeycloakResource>(
    `/admin/realms/${realm}/client-scopes/${scope.id}/protocol-mappers/models`,
    authorization,
    "organization mapper",
    (item) => item.name === "organization",
  );

  if (mapper.config?.addOrganizationId === "true") {
    return;
  }

  const response = await fetch(
    `${keycloakUrl}/admin/realms/${realm}/client-scopes/${scope.id}/protocol-mappers/models/${mapper.id}`,
    {
      method: "PUT",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...mapper,
        config: {
          ...mapper.config,
          "jsonType.label": "JSON",
          addOrganizationId: "true",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Could not configure the organization mapper (${response.status})`,
    );
  }
}

async function ensureDemoOrganization(
  authorization: Record<string, string>,
): Promise<KeycloakResource> {
  const organizations = await getResources<KeycloakResource>(
    `/admin/realms/${realm}/organizations?briefRepresentation=false`,
    authorization,
  );
  const existing = organizations.find(
    (item) => item.alias === "demo-workspace",
  );

  if (existing) {
    return existing;
  }

  const response = await fetch(
    `${keycloakUrl}/admin/realms/${realm}/organizations`,
    {
      method: "POST",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Demo Workspace",
        alias: "demo-workspace",
        enabled: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not create Demo Workspace (${response.status})`);
  }

  return findOne<KeycloakResource>(
    `/admin/realms/${realm}/organizations?briefRepresentation=false`,
    authorization,
    "Demo Workspace",
    (item) => item.alias === "demo-workspace",
  );
}

async function findOne<T extends KeycloakResource>(
  path: string,
  authorization: Record<string, string>,
  label: string,
  predicate: (item: T) => boolean = () => true,
): Promise<T> {
  const match = (await getResources<T>(path, authorization)).find(predicate);

  if (!match) {
    throw new Error(`${label} was not found in the local Keycloak realm`);
  }

  return match;
}

async function getResources<T>(
  path: string,
  authorization: Record<string, string>,
): Promise<T[]> {
  const response = await fetch(`${keycloakUrl}${path}`, {
    headers: authorization,
  });

  if (!response.ok) {
    throw new Error(
      `Keycloak fixture request failed for ${path} (${response.status})`,
    );
  }

  return response.json() as Promise<T[]>;
}

export default globalSetup;
