const DATABASE_URL_NAME = 'DATABASE_URL'

/** Reads the server-only Core database connection string. */
export function readDatabaseUrl(): string {
  const databaseUrl = process.env[DATABASE_URL_NAME]

  if (!databaseUrl) {
    throw new Error(`${DATABASE_URL_NAME} must be configured`)
  }

  return databaseUrl
}
