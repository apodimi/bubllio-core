import type { ReactNode } from "react";
import type Keycloak from "keycloak-js";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";

import { queryClient } from "@/lib";
import { i18n } from "../../locales";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";

export function AppProvider(props: {
  keycloak: Keycloak;
  children: ReactNode;
}) {
  const { keycloak, children } = props;

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider keycloak={keycloak}>{children}</AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
