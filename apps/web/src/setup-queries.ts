import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type Keycloak from "keycloak-js";

import {
  claimSetup,
  createFirstOrganization,
  currentSetup,
  readSetupOperation,
  retrySetupOperation,
  setupStatus,
  type SetupOperation,
} from "./setup-api";

export const setupKeys = {
  status: ["setup", "status"] as const,
  current: (subject: string | undefined) =>
    ["setup", subject, "current"] as const,
  operation: (subject: string | undefined, id: string) =>
    ["setup", subject, "operation", id] as const,
};

export function useSetupStatus() {
  return useQuery({
    queryKey: setupKeys.status,
    queryFn: ({ signal }) => setupStatus(signal),
    staleTime: 0,
  });
}

export function useCurrentSetup(keycloak: Keycloak) {
  return useQuery({
    queryKey: setupKeys.current(keycloak.subject),
    queryFn: ({ signal }) => currentSetup(keycloak, signal),
    enabled: Boolean(keycloak.authenticated),
    staleTime: 0,
  });
}

export function useSetupOperation(keycloak: Keycloak, id: string | undefined) {
  return useQuery({
    queryKey: setupKeys.operation(keycloak.subject, id ?? ""),
    queryFn: ({ signal }) => readSetupOperation(keycloak, id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3_000 : false;
    },
  });
}

export function useClaimSetup(keycloak: Keycloak) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ secret, key }: { secret: string; key: string }) =>
      claimSetup(keycloak, secret, key),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: setupKeys.status }),
        queryClient.invalidateQueries({
          queryKey: setupKeys.current(keycloak.subject),
        }),
      ]);
    },
  });
}

export function useCreateFirstOrganization(keycloak: Keycloak) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ displayName, key }: { displayName: string; key: string }) =>
      createFirstOrganization(keycloak, displayName, key),
    onSuccess: async (operation: SetupOperation) => {
      queryClient.setQueryData(
        setupKeys.operation(keycloak.subject, operation.id),
        operation,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: setupKeys.status }),
        queryClient.invalidateQueries({
          queryKey: setupKeys.current(keycloak.subject),
        }),
      ]);
    },
  });
}

export function useRetrySetupOperation(keycloak: Keycloak) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, secret }: { id: string; secret: string }) =>
      retrySetupOperation(keycloak, id, secret),
    onSuccess: async (operation: SetupOperation) => {
      queryClient.setQueryData(
        setupKeys.operation(keycloak.subject, operation.id),
        operation,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: setupKeys.status }),
        queryClient.invalidateQueries({
          queryKey: setupKeys.current(keycloak.subject),
        }),
      ]);
    },
  });
}
