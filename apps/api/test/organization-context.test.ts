import { describe, expect, it } from 'vitest'

import { hasOrganizationContext } from '../src/authorization/organization-context.js'
import type { VerifiedSubject } from '../src/auth/identity.types.js'

const organizationId = '00000000-0000-0000-0000-000000000001'

function createSubject(organization: VerifiedSubject['organization']): VerifiedSubject {
  return {
    audience: ['bubllio-core-api'],
    authenticatedAt: undefined,
    email: undefined,
    emailVerified: undefined,
    issuer: 'https://identity.example.test/realms/bubllio',
    organization,
    subject: '00000000-0000-0000-0000-000000000002',
  }
}

describe('hasOrganizationContext', () => {
  it('denies an authenticated subject without an organization', () => {
    expect(hasOrganizationContext(createSubject({}), organizationId)).toBe(false)
  })

  it('allows only the exact immutable organization identifier', () => {
    const subject = createSubject({
      mutableAlias: { id: organizationId },
    })

    expect(hasOrganizationContext(subject, organizationId)).toBe(true)
    expect(hasOrganizationContext(subject, 'mutableAlias')).toBe(false)
    expect(hasOrganizationContext(subject, '00000000-0000-0000-0000-000000000099')).toBe(false)
  })
})
