import { useContext } from "react";

import { AuthContext } from "../authContext";

export function useAuth() {
  const keycloak = useContext(AuthContext);
  if (!keycloak) {
    throw new Error("AUTH_PROVIDER_MISSING");
  }

  return keycloak;
}
