#!/usr/bin/env node

// Disposable localhost rehearsal. Only a digest and machine secret are saved
// in ignored, mode-0600 local configuration; the human setup secret prints once.
import { randomBytes, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const local = resolve(root, '.local')
const configPath = resolve(local, 'setup-rehearsal.env')
const realmPath = resolve(local, 'realm-bubllio.setup.json')
const project = 'bubllio-core-setup-rehearsal'
const ports = { keycloak: '8280', api: '3200', web: '5274', mail: '8125' }
const identityScopes = JSON.parse(await readFile(resolve(root, 'infrastructure/keycloak/realm-bubllio.local.json'), 'utf8')).clientScopes.filter((scope) => ['profile', 'email'].includes(scope.name))
const resume = process.argv.includes('--resume')
const prepareOnly = process.argv.includes('--prepare-only')
if (process.argv.slice(2).some((value) => !['--resume', '--prepare-only'].includes(value))) {
  throw new Error('Usage: node scripts/bootstrap-local-setup.mjs [--resume]')
}

await mkdir(local, { recursive: true, mode: 0o700 })
const existingConfig = await readFile(configPath, 'utf8').catch(() => undefined)
if (existingConfig && !resume) {
  throw new Error('Local rehearsal already exists. Resume it; do not generate a second setup secret.')
}
if (!existingConfig && resume) throw new Error('No local rehearsal exists to resume')

let setupSecret
let runtimeSecret
let expiresAt
if (resume) {
  runtimeSecret = readEnvValue(existingConfig, 'CORE_KEYCLOAK_CLIENT_SECRET')
  expiresAt = readEnvValue(existingConfig, 'CORE_SETUP_SECRET_EXPIRES_AT')
} else {
  setupSecret = randomBytes(32).toString('base64url')
  runtimeSecret = randomBytes(32).toString('base64url')
  const digest = createHash('sha256').update(setupSecret).digest('hex')
  expiresAt = new Date(Date.now() + 30 * 60_000).toISOString()
  const realm = JSON.parse(await readFile(resolve(root, 'infrastructure/keycloak/realm-bubllio.local.json'), 'utf8'))
  // Keep the general identity registration policy in the isolated rehearsal.
  realm.registrationAllowed = true
  realm.registrationEmailAsUsername = true
  realm.verifyEmail = true
  realm.clientScopes.push(...identityScopes)
  const webClient = realm.clients.find((client) => client.clientId === 'bubllio-core-web')
  webClient.redirectUris = [`http://127.0.0.1:${ports.web}/*`]
  webClient.webOrigins = [`http://127.0.0.1:${ports.web}`]
  webClient.attributes['post.logout.redirect.uris'] = `http://127.0.0.1:${ports.web}/*`
  await writeFile(realmPath, JSON.stringify(realm, null, 2), { mode: 0o600 })
  const lines = [
    `KEYCLOAK_PORT=${ports.keycloak}`,
    `CORE_API_PORT=${ports.api}`,
    `CORE_WEB_PORT=${ports.web}`,
    `MAILPIT_UI_PORT=${ports.mail}`,
    `KEYCLOAK_REALM_FILE=${realmPath}`,
    'CORE_SETUP_LOCAL_REHEARSAL=true',
    'CORE_SETUP_CLAIM_ENABLED=true',
    `CORE_SETUP_SECRET_SHA256=${digest}`,
    `CORE_SETUP_SECRET_EXPIRES_AT=${expiresAt}`,
    `CORE_KEYCLOAK_CLIENT_SECRET=${runtimeSecret}`,
  ]
  await writeFile(configPath, `${lines.join('\n')}\n`, { mode: 0o600 })
  await chmod(configPath, 0o600)
  if (process.env.CORE_SETUP_SHOW_SECRET !== 'false') {
    console.log(`One-time setup secret (expires ${expiresAt}): ${setupSecret}`)
    console.log('This secret will not be shown again. Keep it out of chat, URLs, and files.')
  }
}
if (prepareOnly) {
  process.exit(0)
}
await command('docker', ['compose', '--project-name', project, '--profile', 'setup-rehearsal', '--env-file', '.env.example', '--env-file', configPath, 'up', '-d', '--build'], root)
await waitFor(`http://127.0.0.1:${ports.keycloak}/realms/bubllio/.well-known/openid-configuration`)
await waitFor(`http://127.0.0.1:${ports.web}/setup`)

const adminPassword = readEnvValue(await readFile(resolve(root, '.env.example'), 'utf8'), 'KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD')
const adminUsername = readEnvValue(await readFile(resolve(root, '.env.example'), 'utf8'), 'KEYCLOAK_BOOTSTRAP_ADMIN_USERNAME')
const adminTokenResponse = await fetch(`http://127.0.0.1:${ports.keycloak}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: adminUsername, password: adminPassword }),
})
if (!adminTokenResponse.ok) throw new Error('Local Keycloak bootstrap login failed')
const { access_token: adminToken } = await adminTokenResponse.json()
const base = `http://127.0.0.1:${ports.keycloak}/admin/realms/bubllio`
async function admin(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${adminToken}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) throw new Error(`Keycloak bootstrap operation failed: ${method} ${path.split('?')[0]} (${response.status})`)
  return response
}

// Existing rehearsal volumes may predate browser registration. Realm updates
// make --resume upgrade that isolated realm without recreating its users.
const realmSettings = await (await admin('GET', '')).json()
if (!realmSettings.registrationAllowed || !realmSettings.registrationEmailAsUsername || !realmSettings.verifyEmail) {
  await admin('PUT', '', {
    registrationAllowed: true,
    registrationEmailAsUsername: true,
    verifyEmail: true,
  })
}

const clientScopes = await (await admin('GET', '/client-scopes')).json()
for (const scope of identityScopes) {
  if (!clientScopes.some((existing) => existing.name === scope.name)) {
    await admin('POST', '/client-scopes', scope)
  }
}
const availableScopes = await (await admin('GET', '/client-scopes')).json()
for (const definition of identityScopes) {
  const scope = availableScopes.find((candidate) => candidate.name === definition.name)
  if (!scope?.id) throw new Error(`Required local identity scope missing: ${definition.name}`)
  const existingMappers = await (await admin('GET', `/client-scopes/${scope.id}/protocol-mappers/models`)).json()
  for (const mapper of definition.protocolMappers) {
    const existing = existingMappers.find((candidate) => candidate.name === mapper.name)
    if (existing) {
      if (existing.protocolMapper !== mapper.protocolMapper || Object.entries(mapper.config).some(([key, value]) => existing.config?.[key] !== value)) {
        throw new Error(`Local identity mapper differs from expected configuration: ${mapper.name}`)
      }
    } else {
      await admin('POST', `/client-scopes/${scope.id}/protocol-mappers/models`, mapper)
    }
  }
}
const webClient = (await (await admin('GET', '/clients?clientId=bubllio-core-web')).json())[0]
if (!webClient?.id) throw new Error('Core web client lookup failed')
const assignedScopes = await (await admin('GET', `/clients/${webClient.id}/default-client-scopes`)).json()
for (const name of ['profile', 'email', 'organization']) {
  const scope = availableScopes.find((candidate) => candidate.name === name)
  if (!scope?.id) throw new Error(`Required local identity scope missing: ${name}`)
  if (!assignedScopes.some((assigned) => assigned.id === scope.id)) {
    await admin('PUT', `/clients/${webClient.id}/default-client-scopes/${scope.id}`)
  }
}

const runtimeClientId = 'bubllio-core-runtime'
const existingClients = await (await admin('GET', `/clients?clientId=${runtimeClientId}`)).json()
if (!existingClients.length) {
  await admin('POST', '/clients', {
    clientId: runtimeClientId, name: 'Bubllio Core runtime', enabled: true,
    publicClient: false, serviceAccountsEnabled: true, standardFlowEnabled: false,
    directAccessGrantsEnabled: false, secret: runtimeSecret,
  })
}
const runtimeClient = (await (await admin('GET', `/clients?clientId=${runtimeClientId}`)).json())[0]
const managementClient = (await (await admin('GET', '/clients?clientId=realm-management')).json())[0]
if (!runtimeClient?.id || !managementClient?.id) throw new Error('Keycloak client lookup failed')
const serviceUser = await (await admin('GET', `/clients/${runtimeClient.id}/service-account-user`)).json()
const roles = []
for (const name of ['query-organizations', 'view-organizations', 'manage-organizations', 'view-users']) {
  roles.push(await (await admin('GET', `/clients/${managementClient.id}/roles/${name}`)).json())
}
await admin('POST', `/users/${serviceUser.id}/role-mappings/clients/${managementClient.id}`, roles)

const runtimeTokenResponse = await fetch(`http://127.0.0.1:${ports.keycloak}/realms/bubllio/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: runtimeClientId, client_secret: runtimeSecret,
    grant_type: 'client_credentials',
  }),
})
if (!runtimeTokenResponse.ok) throw new Error('Local Core runtime credential could not authenticate')
const runtimeToken = (await runtimeTokenResponse.json()).access_token
const restricted = await fetch(`${base}/clients`, { headers: { Authorization: `Bearer ${runtimeToken}` } })
if (restricted.status !== 403) throw new Error('Core runtime unexpectedly has client-administration visibility')

console.log(`Local setup services are ready. Register your first owner through the browser; verification email arrives at http://127.0.0.1:${ports.mail}.`)
console.log(`Open Core setup at http://127.0.0.1:${ports.web}/setup.`)

function readEnvValue(contents, name) {
  const line = contents.split('\n').find((item) => item.startsWith(`${name}=`))
  if (!line) throw new Error(`Missing ${name} in local example configuration`)
  return line.slice(name.length + 1)
}

async function command(binary, args, cwd) {
  await new Promise((resolveCommand, rejectCommand) => {
    const process = spawn(binary, args, { cwd, stdio: 'inherit' })
    process.on('error', rejectCommand)
    process.on('exit', (code) => code === 0 ? resolveCommand() : rejectCommand(new Error(`${binary} exited with ${code}`)))
  })
}

async function waitFor(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(url)).ok) return
    } catch { /* Keycloak is still starting. */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000))
  }
  throw new Error('Local Keycloak did not become ready')
}
