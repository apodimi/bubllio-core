#!/usr/bin/env node

// Realm imports are one-time. Apply the current browser-registration policy to
// an existing disposable localhost realm without removing users or organizations.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const example = await readFile(resolve(root, '.env.example'), 'utf8')
const port = process.env.KEYCLOAK_PORT ?? '8180'
if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('KEYCLOAK_PORT must be a localhost TCP port')
}
const base = `http://127.0.0.1:${port}`
const username = envValue(example, 'KEYCLOAK_BOOTSTRAP_ADMIN_USERNAME')
const password = envValue(example, 'KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD')

const tokenResponse = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: 'admin-cli',
    grant_type: 'password',
    username,
    password,
  }),
})
if (!tokenResponse.ok) throw new Error(`Local Keycloak admin login failed (${tokenResponse.status})`)
const { access_token: token } = await tokenResponse.json()
const realmUrl = `${base}/admin/realms/bubllio`
const authorization = { Authorization: `Bearer ${token}` }
const realmResponse = await fetch(realmUrl, { headers: authorization })
if (!realmResponse.ok) throw new Error(`Local realm lookup failed (${realmResponse.status})`)
const realm = await realmResponse.json()
if (!realm.smtpServer?.host) {
  throw new Error('Configure local SMTP before enabling verified browser registration')
}

if (realm.registrationAllowed && realm.registrationEmailAsUsername && realm.verifyEmail) {
  console.log('Local browser registration already configured')
  process.exit(0)
}

const update = await fetch(realmUrl, {
  method: 'PUT',
  headers: { ...authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    registrationAllowed: true,
    registrationEmailAsUsername: true,
    verifyEmail: true,
  }),
})
if (!update.ok) throw new Error(`Local realm update failed (${update.status})`)
console.log('Local browser registration enabled with email verification')

function envValue(source, name) {
  const line = source.split('\n').find((entry) => entry.startsWith(`${name}=`))
  if (!line) throw new Error(`Missing ${name} in .env.example`)
  return line.slice(name.length + 1)
}
