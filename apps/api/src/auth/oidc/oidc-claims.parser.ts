import type { OrganizationClaim } from '../identity.types.js'

export function parseRequiredStringClaim(value: unknown, claim: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Token claim '${claim}' must be a non-empty string`)
  }

  return value
}

export function parseOptionalStringClaim(value: unknown, claim: string): string | undefined {
  return value === undefined ? undefined : parseRequiredStringClaim(value, claim)
}

export function parseOptionalBooleanClaim(value: unknown, claim: string): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Token claim '${claim}' must be a boolean`)
  }

  return value
}

export function parseOptionalNumericDateClaim(value: unknown, claim: string): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`Token claim '${claim}' must be a non-negative integer`)
  }

  return value
}

export function parseAudienceClaim(value: unknown): string[] {
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((audience) => typeof audience === 'string' && audience.length > 0)
  ) {
    return value
  }

  throw new Error("Token claim 'aud' must contain at least one audience")
}

export function parseOrganizationClaim(value: unknown): OrganizationClaim {
  // A valid first-run subject has no organization until Core provisions one.
  // Tenant authorization must still reject this empty context at its own boundary.
  if (value === undefined) {
    return {}
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error("Token claim 'organization' must be an object")
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    throw new Error("Token claim 'organization' must not be empty")
  }

  for (const [alias, attributes] of entries) {
    validateOrganizationEntry(alias, attributes)
  }

  return value as OrganizationClaim
}

function validateOrganizationEntry(alias: string, attributes: unknown): void {
  if (
    alias.length === 0 ||
    typeof attributes !== 'object' ||
    attributes === null ||
    Array.isArray(attributes)
  ) {
    throw new Error("Token claim 'organization' contains an invalid entry")
  }

  const id = Reflect.get(attributes, 'id')
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error("Token claim 'organization' must contain a non-empty id")
  }
}
