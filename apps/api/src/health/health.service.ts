import { Inject, Injectable } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import { InstallationManifestService } from '../installation-manifest/installation-manifest.service.js'
import { PrismaService } from '../prisma/prisma.service.js'

export type DependencyState = 'ready' | 'unavailable'

export interface SystemReadiness {
  status: 'ready' | 'unavailable'
  checks: Readonly<{
    database: DependencyState
    identity: DependencyState
    migrations: DependencyState
    applications: DependencyState
  }>
}

export type PreflightCheckKey = 'database' | 'identity' | 'migrations' | 'applications'

export interface SystemPreflight {
  status: 'ready' | 'attention'
  checks: readonly {
    key: PreflightCheckKey
    status: 'ready' | 'attention'
    messageCode?: string
  }[]
}

const PREFLIGHT_MESSAGE_CODES: Readonly<Record<PreflightCheckKey, string>> = {
  database: 'SYSTEM_DATABASE_UNAVAILABLE',
  identity: 'SYSTEM_IDENTITY_UNAVAILABLE',
  migrations: 'SYSTEM_UPDATE_REQUIRED',
  applications: 'APPLICATION_MANIFEST_UNAVAILABLE',
}

// Bump this with every release migration so readiness proves the running image's
// database contract, not merely the absence of an unfinished migration row.
const REQUIRED_MIGRATION = '20261024010000_application_manifest'

@Injectable()
export class HealthService {
  constructor(
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    private readonly prisma: PrismaService,
    private readonly manifest: InstallationManifestService,
  ) {}

  async readiness(): Promise<SystemReadiness> {
    const [database, identity, migrations] = await Promise.all([
      check(() => this.prisma.$queryRawUnsafe('SELECT 1')),
      check(() => this.checkIdentity()),
      check(() => this.checkMigrationCompatibility()),
    ])
    const applications =
      this.manifest.status().configured || this.config.environment !== 'production'
        ? 'ready'
        : 'unavailable'
    const checks = Object.freeze({ database, identity, migrations, applications })
    return {
      status: Object.values(checks).every((state) => state === 'ready') ? 'ready' : 'unavailable',
      checks,
    }
  }

  async preflight(): Promise<SystemPreflight> {
    const readiness = await this.readiness()
    const checks = (Object.entries(readiness.checks) as [PreflightCheckKey, DependencyState][]).map(
      ([key, state]) =>
        state === 'ready'
          ? { key, status: 'ready' as const }
          : { key, status: 'attention' as const, messageCode: PREFLIGHT_MESSAGE_CODES[key] },
    )
    return { status: readiness.status === 'ready' ? 'ready' : 'attention', checks }
  }

  private async checkMigrationCompatibility(): Promise<void> {
    await this.prisma.$queryRawUnsafe(
      'SELECT "contract_version", "available", "managed_by_manifest" FROM "applications" LIMIT 0',
    )
    const migrationState = await this.prisma.$queryRawUnsafe<
      Array<{
        required_count: bigint | number | string
        incomplete_count: bigint | number | string
      }>
    >(
      `SELECT
        COUNT(*) FILTER (
          WHERE "migration_name" = '${REQUIRED_MIGRATION}'
            AND "finished_at" IS NOT NULL
            AND "rolled_back_at" IS NULL
        ) AS required_count,
        COUNT(*) FILTER (
          WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
        ) AS incomplete_count
      FROM "_prisma_migrations"`,
    )
    const state = migrationState[0]
    if (Number(state?.required_count ?? 0) !== 1 || Number(state?.incomplete_count ?? 0) > 0) {
      throw new Error('Database migrations do not match the running release')
    }
  }

  private async checkIdentity(): Promise<void> {
    const discoveryUrl = deriveDiscoveryUrl(this.config)
    const discovery = await readJson(discoveryUrl)
    if (
      typeof discovery !== 'object' ||
      discovery === null ||
      Reflect.get(discovery, 'issuer') !== this.config.oidc.issuer
    ) {
      throw new Error('Identity discovery is incompatible')
    }

    const advertisedJwks = Reflect.get(discovery, 'jwks_uri')
    const jwksUrl =
      this.config.oidc.jwksUrl ?? (typeof advertisedJwks === 'string' ? advertisedJwks : undefined)
    if (!jwksUrl) throw new Error('Identity signing keys are unavailable')
    const jwks = await readJson(jwksUrl)
    if (typeof jwks !== 'object' || jwks === null || !Array.isArray(Reflect.get(jwks, 'keys'))) {
      throw new Error('Identity signing keys are invalid')
    }
  }
}

async function check(operation: () => Promise<unknown>): Promise<DependencyState> {
  try {
    await operation()
    return 'ready'
  } catch {
    return 'unavailable'
  }
}

function deriveDiscoveryUrl(config: RuntimeConfig): string {
  const jwksUrl = config.oidc.jwksUrl
  if (jwksUrl?.endsWith('/protocol/openid-connect/certs')) {
    return jwksUrl.replace('/protocol/openid-connect/certs', '/.well-known/openid-configuration')
  }
  return `${config.oidc.issuer}/.well-known/openid-configuration`
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(3_000),
  })
  if (!response.ok) throw new Error('Dependency unavailable')
  return response.json()
}
