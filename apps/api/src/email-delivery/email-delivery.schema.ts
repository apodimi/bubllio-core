import type { RuntimeEnvironment } from '../config/runtime-config.js'
import type { EmailConfirmInput, EmailTestInput } from './email-delivery.types.js'

const EMAIL = /^[\x21-\x7e]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/u
const HOST =
  /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/u
const CONTROL = /[\u0000-\u001f\u007f]/u
const TEST_KEYS = [
  'senderName',
  'senderEmail',
  'replyToEmail',
  'host',
  'port',
  'security',
  'authentication',
  'username',
  'password',
  'testRecipient',
] as const

export function parseEmailTestInput(
  input: unknown,
  environment: RuntimeEnvironment,
): EmailTestInput {
  if (!isRecord(input) || Object.keys(input).some((key) => !TEST_KEYS.includes(key as never))) {
    throw new Error('EMAIL_SETUP_INVALID')
  }
  const senderName = text(input.senderName, 1, 80)
  const senderEmail = email(input.senderEmail)
  const replyToEmail = input.replyToEmail === undefined ? undefined : email(input.replyToEmail)
  const host = typeof input.host === 'string' && HOST.test(input.host) ? input.host : invalid()
  const port =
    typeof input.port === 'number' &&
    Number.isInteger(input.port) &&
    input.port >= 1 &&
    input.port <= 65_535
      ? input.port
      : invalid()
  const security = input.security
  if (!['starttls', 'tls', 'none'].includes(String(security))) invalid()
  if (environment === 'production' && security === 'none') invalid()
  if (typeof input.authentication !== 'boolean') invalid()

  let username: string | undefined
  let password: string | undefined
  if (input.authentication) {
    username = text(input.username, 1, 320)
    password = text(input.password, 1, 512)
  } else if (input.username !== undefined || input.password !== undefined) {
    invalid()
  }

  return Object.freeze({
    senderName,
    senderEmail,
    ...(replyToEmail ? { replyToEmail } : {}),
    host,
    port,
    security: security as EmailTestInput['security'],
    authentication: input.authentication,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    testRecipient: email(input.testRecipient),
  })
}

export function parseEmailConfirmInput(input: unknown): EmailConfirmInput {
  if (
    !isRecord(input) ||
    Object.keys(input).length !== 1 ||
    typeof input.code !== 'string' ||
    !/^\d{6}$/u.test(input.code)
  ) {
    throw new Error('EMAIL_SETUP_INVALID')
  }
  return { code: input.code }
}

function email(value: unknown): string {
  return typeof value === 'string' && value.length <= 254 && EMAIL.test(value) ? value : invalid()
}

function text(value: unknown, minimum: number, maximum: number): string {
  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    value.length < minimum ||
    value.length > maximum ||
    CONTROL.test(value)
  ) {
    return invalid()
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(): never {
  throw new Error('EMAIL_SETUP_INVALID')
}
