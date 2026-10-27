import { generateKeyPair, SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import { verifyAccessToken } from '../src/auth/oidc/oidc-token.verifier.js'
import type { OidcConfig } from '../src/auth/oidc/oidc.types.js'

const config: OidcConfig = {
  audience: 'bubllio-core-api',
  issuer: 'https://identity.example.test/realms/bubllio',
}

async function createToken(overrides: Record<string, unknown> = {}): Promise<{
  publicKey: CryptoKey
  token: string
}> {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const token = await new SignJWT({
    auth_time: 1_798_800_000,
    email: 'owner@example.test',
    email_verified: true,
    organization: {
      demo: { id: '00000000-0000-0000-0000-000000000001' },
    },
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setSubject('00000000-0000-0000-0000-000000000002')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey)

  return { publicKey, token }
}

describe('verifyAccessToken', () => {
  it('returns the validated identity and organization context', async () => {
    const { publicKey, token } = await createToken()

    await expect(verifyAccessToken(token, config, async () => publicKey)).resolves.toEqual({
      audience: ['bubllio-core-api'],
      authenticatedAt: 1_798_800_000,
      email: 'owner@example.test',
      emailVerified: true,
      issuer: config.issuer,
      organization: {
        demo: { id: '00000000-0000-0000-0000-000000000001' },
      },
      subject: '00000000-0000-0000-0000-000000000002',
    })
  })

  it('rejects a token issued for another audience', async () => {
    const { publicKey, token } = await createToken()

    await expect(
      verifyAccessToken(token, { ...config, audience: 'another-api' }, async () => publicKey),
    ).rejects.toThrow()
  })

  it('rejects a token from another issuer', async () => {
    const { publicKey, token } = await createToken()

    await expect(
      verifyAccessToken(
        token,
        { ...config, issuer: 'https://attacker.example.test/realms/bubllio' },
        async () => publicKey,
      ),
    ).rejects.toThrow()
  })

  it('returns a verified subject without granting organization context', async () => {
    const { publicKey, token } = await createToken({ organization: undefined })

    await expect(verifyAccessToken(token, config, async () => publicKey)).resolves.toEqual({
      audience: ['bubllio-core-api'],
      authenticatedAt: 1_798_800_000,
      email: 'owner@example.test',
      emailVerified: true,
      issuer: config.issuer,
      organization: {},
      subject: '00000000-0000-0000-0000-000000000002',
    })
  })

  it('accepts an empty organization claim during first-run setup', async () => {
    const { publicKey, token } = await createToken({ organization: {} })

    await expect(verifyAccessToken(token, config, async () => publicKey)).resolves.toMatchObject({
      organization: {},
      subject: '00000000-0000-0000-0000-000000000002',
    })
  })

  it('rejects malformed organization entries', async () => {
    const { publicKey, token } = await createToken({ organization: { demo: 'not-an-object' } })

    await expect(verifyAccessToken(token, config, async () => publicKey)).rejects.toThrow(
      "Token claim 'organization' contains an invalid entry",
    )
  })

  it('rejects malformed organization identifiers', async () => {
    const { publicKey, token } = await createToken({ organization: { demo: { id: 42 } } })

    await expect(verifyAccessToken(token, config, async () => publicKey)).rejects.toThrow(
      "Token claim 'organization' must contain a non-empty id",
    )
  })

  it('rejects organization entries without immutable identifiers', async () => {
    const { publicKey, token } = await createToken({ organization: { demo: {} } })

    await expect(verifyAccessToken(token, config, async () => publicKey)).rejects.toThrow(
      "Token claim 'organization' must contain a non-empty id",
    )
  })

  it('rejects malformed identity assurance claims', async () => {
    const invalidVerification = await createToken({ email_verified: 'true' })
    const invalidAuthenticationTime = await createToken({ auth_time: 1.5 })

    await expect(
      verifyAccessToken(
        invalidVerification.token,
        config,
        async () => invalidVerification.publicKey,
      ),
    ).rejects.toThrow("Token claim 'email_verified' must be a boolean")

    await expect(
      verifyAccessToken(
        invalidAuthenticationTime.token,
        config,
        async () => invalidAuthenticationTime.publicKey,
      ),
    ).rejects.toThrow("Token claim 'auth_time' must be a non-negative integer")
  })

  it('rejects an expired token', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await new SignJWT({
      organization: { demo: { id: '00000000-0000-0000-0000-000000000001' } },
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setSubject('00000000-0000-0000-0000-000000000002')
      .setIssuedAt(1)
      .setExpirationTime(2)
      .sign(privateKey)

    await expect(verifyAccessToken(token, config, async () => publicKey)).rejects.toThrow()
  })
})
