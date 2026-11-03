import { BadRequestException } from '@nestjs/common'

import type { OrganizationRole } from '../generated/prisma/enums.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const APP_KEY = /^[a-z][a-z0-9-]{1,62}$/u

export interface AccessInput {
  role: OrganizationRole
  applicationKeys: string[]
}

export interface InvitationInput extends AccessInput {
  email: string
}

export function parseAccessInput(value: unknown): AccessInput {
  if (!isRecord(value) || Object.keys(value).sort().join() !== 'applicationKeys,role') {
    throw new BadRequestException('Invalid access selection')
  }
  const { role, applicationKeys } = value
  if (
    (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MEMBER') ||
    !Array.isArray(applicationKeys) ||
    applicationKeys.length > 50 ||
    applicationKeys.some((key) => typeof key !== 'string' || !APP_KEY.test(key)) ||
    new Set(applicationKeys).size !== applicationKeys.length
  ) {
    throw new BadRequestException('Invalid access selection')
  }
  return { role, applicationKeys }
}

export function parseInvitationInput(value: unknown): InvitationInput {
  if (!isRecord(value) || Object.keys(value).sort().join() !== 'applicationKeys,email,role') {
    throw new BadRequestException('Invalid invitation')
  }
  const { email, ...access } = value
  if (typeof email !== 'string') throw new BadRequestException('Invalid invitation')
  const normalized = email.trim().toLowerCase()
  if (normalized.length > 320 || !EMAIL.test(normalized)) {
    throw new BadRequestException('Invalid invitation')
  }
  const selection = parseAccessInput(access)
  if (selection.role === 'OWNER') throw new BadRequestException('Invalid invitation')
  return { ...selection, role: selection.role, email: normalized }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
