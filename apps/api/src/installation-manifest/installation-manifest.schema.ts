import type { RuntimeEnvironment } from '../config/runtime-config.js'

const APP_KEY_PATTERN = /^[a-z][a-z0-9-]{1,62}$/u
const AUDIENCE_PATTERN = /^[a-zA-Z0-9_.:-]{2,255}$/u
const CONTRACT_VERSION_PATTERN = /^[1-9][0-9]*(?:\.[0-9]+){0,2}$/u
const MANIFEST_KEYS = ['schemaVersion', 'applications']
const APPLICATION_KEYS = ['key', 'displayName', 'launchUrl', 'audience', 'contractVersion']

export interface InstallationApplication {
  readonly key: string
  readonly displayName: string
  readonly launchUrl: string
  readonly audience: string
  readonly contractVersion: string
}

export interface InstallationManifest {
  readonly schemaVersion: '1'
  readonly applications: readonly InstallationApplication[]
}

/** Validates the deliberately data-only deployment input and rejects every unknown field. */
export function parseInstallationManifest(
  input: unknown,
  environment: RuntimeEnvironment,
): InstallationManifest {
  if (!isExactRecord(input, MANIFEST_KEYS) || input.schemaVersion !== '1') {
    throw new Error('Application manifest must use schemaVersion 1 and contain only applications')
  }
  if (!Array.isArray(input.applications) || input.applications.length > 100) {
    throw new Error('Application manifest applications must be an array of at most 100 entries')
  }

  const keys = new Set<string>()
  const applications = input.applications.map((entry: unknown) => {
    if (!isExactRecord(entry, APPLICATION_KEYS)) {
      throw new Error('Application manifest entry contains unknown or missing fields')
    }
    const { key, displayName, launchUrl, audience, contractVersion } = entry
    if (
      typeof key !== 'string' ||
      !APP_KEY_PATTERN.test(key) ||
      typeof displayName !== 'string' ||
      displayName.trim().length < 2 ||
      displayName.trim().length > 80 ||
      typeof audience !== 'string' ||
      !AUDIENCE_PATTERN.test(audience) ||
      typeof contractVersion !== 'string' ||
      !CONTRACT_VERSION_PATTERN.test(contractVersion) ||
      typeof launchUrl !== 'string'
    ) {
      throw new Error('Application manifest entry is invalid')
    }
    if (keys.has(key)) throw new Error(`Application manifest contains duplicate key ${key}`)
    keys.add(key)

    validateLaunchUrl(launchUrl, environment)
    return Object.freeze({
      key,
      displayName: displayName.trim(),
      launchUrl,
      audience,
      contractVersion,
    })
  })

  return Object.freeze({ schemaVersion: '1', applications: Object.freeze(applications) })
}

function validateLaunchUrl(value: string, environment: RuntimeEnvironment): void {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Application launchUrl is invalid')
  }
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  if (
    (url.protocol !== 'https:' &&
      !(environment !== 'production' && loopback && url.protocol === 'http:')) ||
    (environment === 'production' && loopback) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    value.length > 2048
  ) {
    throw new Error('Application launchUrl must be a secure URL without credentials or query data')
  }
}

function isExactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => actualKeys.includes(key))
}
