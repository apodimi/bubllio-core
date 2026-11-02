import { createContext } from "react";

export type AuthSession = {
  authenticated: boolean;
  subject: string | undefined;
  signIn: () => Promise<void>;
  register: () => Promise<void>;
  reauthenticate: () => Promise<void>;
  signOut: (toSetup?: boolean) => Promise<void>;
};

export const AuthContext = createContext<AuthSession | null>(null);
