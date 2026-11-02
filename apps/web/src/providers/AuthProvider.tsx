import type { ReactNode } from "react";
import type Keycloak from "keycloak-js";

import { AuthContext, type AuthSession } from "@/features/auth";

export function AuthProvider(props: {
  keycloak: Keycloak;
  children: ReactNode;
}) {
  const { keycloak, children } = props;
  const session: AuthSession = {
    authenticated: Boolean(keycloak.authenticated),
    subject: keycloak.subject,
    signIn: () => keycloak.login({ redirectUri: window.location.origin }),
    register: () => keycloak.register({ redirectUri: window.location.origin }),
    reauthenticate: () =>
      keycloak.login({ redirectUri: window.location.origin, prompt: "login" }),
    signOut: (toSetup = false) =>
      keycloak.logout({
        redirectUri: `${window.location.origin}${toSetup ? "/setup" : ""}`,
      }),
  };

  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}
