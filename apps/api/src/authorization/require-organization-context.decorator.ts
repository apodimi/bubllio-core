import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'

import { OrganizationContextGuard } from './organization-context.guard.js'
import { ORGANIZATION_PARAM_KEY } from './organization-context.metadata.js'

export { ORGANIZATION_PARAM_KEY } from './organization-context.metadata.js'

/**
 * Protects a tenant route through the immutable organization ID in a route parameter.
 * Setup routes must not use this decorator because their subject has no organization yet.
 */
export function RequireOrganizationContext(
  organizationParam = 'organizationId',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(ORGANIZATION_PARAM_KEY, organizationParam),
    UseGuards(OrganizationContextGuard),
  )
}
