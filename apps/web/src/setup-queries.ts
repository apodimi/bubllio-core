import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type Keycloak from "keycloak-js";

import {
  claimSetup,
  confirmEmailDelivery,
  createFirstOrganization,
  currentSetup,
  emailDeliveryStatus,
  readSetupOperation,
  retrySetupOperation,
  setupStatus,
  systemPreflight,
  testEmailDelivery,
  type EmailDeliverySettings,
  type EmailDeliveryStatus,
  type SetupOperation,
} from "./setup-api";

export const setupKeys = {
  preflight: ["system", "preflight"] as const,
  email: ["setup", "email"] as const,
  status: ["setup", "status"] as const,
  current: (subject: string | undefined) =>
    ["setup", subject, "current"] as const,
  operation: (subject: string | undefined, id: string) =>
    ["setup", subject, "operation", id] as const,
};

export function useEmailDeliveryStatus() {
  return useQuery({
    queryKey: setupKeys.email,
    queryFn: ({ signal }) => emailDeliveryStatus(signal),
    retry: false,
    staleTime: 0,
  });
}

export function useTestEmailDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      settings,
      setupSecret,
      idempotencyKey,
    }: {
      settings: EmailDeliverySettings;
      setupSecret: string;
      idempotencyKey: string;
    }) => testEmailDelivery(settings, setupSecret, idempotencyKey),
    onSuccess: (result) => {
      queryClient.setQueryData(setupKeys.email, {
        status: result.status,
      } as EmailDeliveryStatus);
    },
  });
}

export function useConfirmEmailDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      confirmationCode,
      setupSecret,
      idempotencyKey,
    }: {
      confirmationCode: string;
      setupSecret: string;
      idempotencyKey: string;
    }) => confirmEmailDelivery(confirmationCode, setupSecret, idempotencyKey),
    onSuccess: (status: EmailDeliveryStatus) => {
      queryClient.setQueryData(setupKeys.email, status);
    },
  });
}

export function useSystemPreflight() {
  return useQuery({
    queryKey: setupKeys.preflight,
    queryFn: ({ signal }) => systemPreflight(signal),
    retry: false,
    staleTime: 0,
  });
}

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
    mutationFn: ({ id }: { id: string }) => retrySetupOperation(keycloak, id),
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
