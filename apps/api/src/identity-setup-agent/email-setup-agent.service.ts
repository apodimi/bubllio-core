import { randomUUID } from 'node:crypto'
import { chmod, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Inject, Injectable } from '@nestjs/common'
import nodemailer from 'nodemailer'

import { parseEmailTestInput } from '../email-delivery/email-delivery.schema.js'
import type { EmailTestInput } from '../email-delivery/email-delivery.types.js'
import {
  IDENTITY_SETUP_AGENT_CONFIG,
  type IdentitySetupAgentConfig,
} from './identity-setup-agent.config.js'
import { KeycloakEmailSetupClient } from './keycloak-email-setup.client.js'

export const SMTP_PASSWORD_VAULT_FILENAME = 'bubllio_smtp__password'

@Injectable()
export class EmailSetupAgentService {
  constructor(
    @Inject(IDENTITY_SETUP_AGENT_CONFIG) private readonly config: IdentitySetupAgentConfig,
    private readonly keycloak: KeycloakEmailSetupClient,
  ) {}

  async test(raw: unknown, confirmationCode: string, fingerprint: string): Promise<void> {
    let input: EmailTestInput
    try {
      input = parseEmailTestInput(raw, this.config.allowInsecureSmtp ? 'development' : 'production')
    } catch {
      throw new AgentOperationError('EMAIL_DELIVERY_REJECTED')
    }
    const transport = nodemailer.createTransport({
      host: input.host,
      port: input.port,
      secure: input.security === 'tls',
      requireTLS: input.security === 'starttls',
      ignoreTLS: input.security === 'none',
      auth: input.authentication ? { user: input.username!, pass: input.password! } : undefined,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
      disableFileAccess: true,
      disableUrlAccess: true,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    })
    try {
      await transport.sendMail({
        from: { name: input.senderName, address: input.senderEmail },
        to: input.testRecipient,
        ...(input.replyToEmail ? { replyTo: input.replyToEmail } : {}),
        subject: 'Bubllio email setup confirmation',
        text: `Your Bubllio email setup confirmation code is ${confirmationCode}. It expires in 10 minutes.`,
        headers: { 'X-Auto-Response-Suppress': 'All' },
      })
    } catch (error) {
      throw smtpError(error)
    } finally {
      transport.close()
    }
    await this.storePassword(input.authentication ? input.password! : undefined)
    try {
      await this.keycloak.configureTest(input, fingerprint)
    } catch {
      throw new AgentOperationError('IDENTITY_ACTIVATION_FAILED')
    }
  }

  async finalize(fingerprint: string): Promise<void> {
    try {
      await this.keycloak.finalize(fingerprint)
    } catch {
      throw new AgentOperationError('IDENTITY_ACTIVATION_FAILED')
    }
  }

  private async storePassword(password: string | undefined): Promise<void> {
    const destination = join(this.config.vaultDirectory, SMTP_PASSWORD_VAULT_FILENAME)
    if (password === undefined) {
      await unlink(destination).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      })
      return
    }
    const temporary = join(
      this.config.vaultDirectory,
      `.${SMTP_PASSWORD_VAULT_FILENAME}.${randomUUID()}`,
    )
    try {
      await writeFile(temporary, password, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      await chmod(temporary, 0o600)
      await rename(temporary, destination)
    } catch {
      await unlink(temporary).catch(() => undefined)
      throw new AgentOperationError('IDENTITY_ACTIVATION_FAILED')
    }
  }
}

export class AgentOperationError extends Error {
  constructor(
    readonly safeCode:
      | 'EMAIL_DELIVERY_AUTHENTICATION_FAILED'
      | 'EMAIL_DELIVERY_TLS_FAILED'
      | 'EMAIL_DELIVERY_REJECTED'
      | 'IDENTITY_ACTIVATION_FAILED',
  ) {
    super(safeCode)
  }
}

function smtpError(error: unknown): AgentOperationError {
  const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined
  if (code === 'EAUTH') return new AgentOperationError('EMAIL_DELIVERY_AUTHENTICATION_FAILED')
  if (['ESOCKET', 'ETLS', 'ECONNECTION'].includes(String(code)))
    return new AgentOperationError('EMAIL_DELIVERY_TLS_FAILED')
  return new AgentOperationError('EMAIL_DELIVERY_REJECTED')
}
