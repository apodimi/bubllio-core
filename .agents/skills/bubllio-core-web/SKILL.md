---
name: bubllio-core-web
description: Change the React/Vite client in Bubllio Core apps/web using its feature-based structure, Zod API boundaries, Keycloak, TanStack Query, and MUI.
---

# Bubllio Core web

Use this skill for work inside `apps/web/`. Read the repository `AGENTS.md`,
`PRODUCT.md`, the relevant architecture or workflow page, and the affected code.
Follow the workspace `bubllio-react-architecture` skill for shared React/Vite
structure and naming rules.
Use `bubllio-onboarding-ux` as well when changing the first-run journey.

## Structure

Put domain code in `src/features/<feature>/`. Each feature owns its API fetchers,
query and mutation hooks, components, pages, Zod schemas, local state, and an
`index.ts` public API. Other features import only from that public API. Within a
feature, import sibling files directly when it avoids a barrel cycle.

Current features are `auth/` for Keycloak initialization and access,
`setup/` for preflight, email delivery, and first organization setup, and
`workspace/` for organization selection and application access. Keep reusable
presentation in top-level `components/`, page shells in `layouts/`, public
environment configuration in `config/`, third-party clients in `lib/`, React
wrappers in `providers/`, paths and the route map in `routes/`, and MUI tokens
and fonts in `theme/` (`palette.ts`, `typography.ts`, and `index.ts`). The
shared `BrandLogo` lives in `components/ui/`. Add `utils/` only for a pure helper with real use across
features. Do not create an application-wide `types/`, `services/`, `api/`, or
`hooks/` folder.

Use `@/*` for imports across `src` modules and relative paths inside a feature.
Vite 8 resolves the TypeScript path mapping directly through
`resolve.tsconfigPaths`; TypeScript 7 requires a relative `./src/*` target and
does not accept `baseUrl`. Keep the existing port 5174 for the local journey.
Name component, layout, and provider files `PascalCase.tsx`. Use `camelCase`
for other project-owned TypeScript files, including helpers, hooks, API actions,
tests, and config qualifiers; keep role suffixes such as `.schema.ts`,
`.reducer.ts`, `.spec.ts`, and `.config.ts`. Preserve conventional tooling
filenames and externally referenced public URLs.

Keep localized UI text in `apps/web/locales/en.json` and `el.json`, outside
`src/`. Initialize the bundled i18next instance before React mounts. Use
`useTranslation().t` for messages and `i18n.changeLanguage` for the one shared
locale state; do not add page-local locale state. Keep keys and i18next
placeholders aligned. Global assets stay in `src/assets/`. Use MUI `sx` and theme overrides;
avoid new custom CSS. The inline boot status in `index.html` works before React
mounts and must remain visible during initialization.

## Boundaries

- Treat every API response as `unknown` until a co-located Zod schema validates
  it inside the feature API fetcher. Infer API types with `z.infer` from those
  schemas; reserve interfaces for local UI or state contracts. Do not log raw
  validation errors or response data that could contain identity or SMTP input.
- Validate `import.meta.env` and public runtime endpoints in `config/env.ts`.
  Production accepts only the validated public runtime endpoints supplied by
  the container, so one immutable web image can be promoted across domains.
  Vite endpoint values are for local development only. Permit HTTP only for
  localhost development. Never put secrets in Vite or browser runtime
  configuration.
- Send Core requests through `lib/axios.ts`. Its request interceptor refreshes
  the Keycloak token only for authenticated requests and attaches it only to
  that request. A failed
  refresh must stop the request. Keep `allowAbsoluteUrls: false`, no-store,
  no browser credentials, safe error mapping, and TanStack `AbortSignal`.
- Keep setup secrets and idempotency keys on their exact mutation calls; never
  place them in Axios defaults, logs, URLs, storage, or query keys. Do not add
  automatic retries for setup mutations.
- Let TanStack Query own server state, polling, cache updates, and invalidation.
  Keep UI state local until more than one component needs it. React Hook Form with localized Zod
  schemas owns the two email setup forms; clear passwords, the setup secret,
  and confirmation code after requests.
- Preserve the setup-status compatibility fallback for older Core APIs and the
  four distinct preflight checks. The public HTTP contract remains the versioned
  OpenAPI file; do not change it merely to make a client parser convenient.

## Readability

Write every `if` branch as a block with braces, even for a single `return`,
`throw`, `continue`, or function call. Put the action on its own line so
conditions and effects are easy to scan. Keep `else if` chains when useful.
For React components, accept a typed `props` parameter and destructure it at
the start of the function body. Keep component prop types in the same file.
Leave exactly one blank line before every `return` that follows another
statement in the same block, including early returns in components, hooks,
helpers, and tests. A `return` that begins a block stays directly after `{`;
Prettier removes leading blank lines there.
Destructure the fields a hook or query consumer actually uses at the call site,
with clear aliases such as `data: organizations`. Avoid a second assignment from
`query.data`; keep the complete result when it is passed onward or makes the
code shorter to read.
Leave a blank line between logical phases such as hook setup, derived values,
effects or handlers, and rendering. Keep tightly related statements together
instead of adding space after every line.
Before adding `useEffect`, name the external system it must synchronize with.
Compute derived values during render, handle user actions in event handlers, and
fetch server data with TanStack Query. For a necessary Effect, include every
reactive dependency, make setup and cleanup symmetric, and verify Strict Mode
re-runs do not duplicate work. Never silence dependency warnings to force a
chosen run count.

## Avoid

- Do not move domain API calls, hooks, schemas, types, or state into global
  technical folders. Do not create empty folders just to mirror a template.
- Do not define a second interface for an API model already described by a Zod
  schema, cast unvalidated responses to a model, or parse responses in components.
- Do not import a feature's private files from another feature. Do not use a
  barrel inside its own feature when that creates an import cycle.
- Do not put network URLs, token handling, query keys, or cache policy in page
  and presentation components. Do not create a global store for one page's UI state.
- Do not swallow token refresh failures, attach bearer tokens or setup secrets
  globally, or expose raw API errors to the browser UI.

## Navigation and UI

Bootstrap reads setup status before initializing Keycloak because that decides
whether anonymous first-run screens are reachable. Keycloak consumes the OIDC
callback before React mounts, so initialization happens before the providers
render. `routes/` maps URLs to the active setup or workspace page without
changing the server-driven setup gate. Use Authorization Code with PKCE and keep
tokens only in memory. The permanent Core runtime has no realm mutation role.
The current route gate follows Core setup status; do not insert a role-only
`ProtectedRoute` or move that gate into pathname checks without a real role
contract and corresponding denied-path tests. `DashboardLayout` receives the
feature page as children because its locale and actions are page-owned.

Keep page components focused on presentation and local hooks. API URLs, query
keys, cache policy, and response parsing belong to feature API and hook files.
UI components use `features/auth`'s `useAuth()` actions and never receive the
raw Keycloak instance. Bootstrap and providers may access the adapter to consume
the OIDC callback before React renders.
Preserve loading, denial, expiry, retry, and empty states. Use the MUI theme and
the workspace `docs/design-system.md` for product controls. The ordinary local
stack has setup disabled; use the first-run runbook to rehearse setup behavior.

## Verification

For structure changes, run `npm run format:check` and `npm run build` from
`apps/web/`. Run the focused Playwright journey when imports, bootstrap,
authentication, queries, or behavior change. The complete journey requires the
ordinary local stack and Google Chrome. Report skipped checks and remaining
identity, tenant, compatibility, or deployment risk.

## References

- [React: Thinking in React](https://react.dev/learn/thinking-in-react)
- [TanStack Query v5 query options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
- [Zod basics](https://zod.dev/basics)
