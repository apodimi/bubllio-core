---
name: bubllio-onboarding-ux
description: Design or revise Bubllio Core welcome, first administrator enrollment, setup tasks, and login recovery across desktop and mobile.
---

# Bubllio onboarding UX

Use this for Core first-run interface work. Read `PRODUCT.md`, the current
`apps/web/src/setup/` implementation, and the workspace's `docs/design-system.md` before
proposing a different journey. Product decisions belong in Core docs; do not
let UI copy claim unfinished admin or member features are available.

## Journey to preserve

- Before the first account: a welcoming entry, the necessary email-delivery
  check, and one clear first-account action.
- After the first verified administrator signs in: a short task list inside the
  Core shell. Do not send that person through an unrelated second setup wizard.
- After installation reaches `READY`: root and `/setup` lead to ordinary login
  or workspace. Logout must not reopen first-run tasks.
- A later person joins through an administrator invitation. Ordinary login
  should not offer general self-registration once public realm registration is
  closed.

Keep progress and recovery understandable on phone and desktop. Show which
step is current, what is waiting on email or Keycloak, and one next action.
Loading states must be visible before React and identity initialization finish;
expired sessions should provide a clear sign-in action. Do not ask for the
one-time setup secret again after Core has durably bound the operation to the
same subject.

Use MUI components and the suite's existing theme for controls. Use the local
Iconify wrapper with `@iconify-icons/keyline-icons` for product icons. A welcome
animation should communicate arrival and respect reduced motion; it must not
delay the account action or conceal loading and error states.

When changing the flow, check the server state and Keycloak behavior behind
each screen, then verify the relevant browser journey at desktop and mobile
sizes. Treat screenshots of old UI as possible deployment evidence before
redesigning source that may already be fixed.
