import { afterEach, describe, expect, it } from 'vitest'

import { readDatabaseUrl } from '../src/prisma/prisma.config.js'

describe('Prisma configuration', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
      return
    }

    process.env.DATABASE_URL = originalDatabaseUrl
  })

  it('returns the configured connection string', () => {
    process.env.DATABASE_URL = 'postgresql://core:test@database:5432/core'

    expect(readDatabaseUrl()).toBe('postgresql://core:test@database:5432/core')
  })

  it('rejects a missing connection string', () => {
    delete process.env.DATABASE_URL

    expect(() => readDatabaseUrl()).toThrow('DATABASE_URL must be configured')
  })
})
