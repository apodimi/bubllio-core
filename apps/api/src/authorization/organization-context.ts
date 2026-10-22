import type { VerifiedSubject } from '../auth/identity.types.js'

/**
 * Proves token membership through an immutable organization ID.
 * Aliases are display metadata and must never authorize tenant access.
 */
export function hasOrganizationContext(subject: VerifiedSubject, organizationId: string): boolean {
  return Object.values(subject.organization).some(({ id }) => id === organizationId)
}
