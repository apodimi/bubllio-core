import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { AuthSession } from "@/features/auth";

import {
  claimSetup,
  createFirstOrganization,
  getCurrentSetup,
  getSetupOperation,
  retrySetupOperation,
  getSetupStatus,
  getSystemPreflight,
} from "../api";
import type { SetupOperation } from "../schemas/setupApi.schema";
import { setupKeys } from "./setupKeys";

export function useSystemPreflight() {
  return useQuery({
    queryKey: setupKeys.preflight,
    queryFn: ({ signal }) => getSystemPreflight(signal),
    retry: false,
    staleTime: 0,
  });
}

export function useSetupStatus() {
  return useQuery({
    queryKey: setupKeys.status,
    queryFn: ({ signal }) => getSetupStatus(signal),
    staleTime: 0,
  });
}

export function useCurrentSetup(auth: AuthSession) {
  return useQuery({
    queryKey: setupKeys.current(auth.subject),
    queryFn: ({ signal }) => getCurrentSetup(signal),
    enabled: auth.authenticated,
    staleTime: 0,
  });
}

export function useSetupOperation(auth: AuthSession, id: string | undefined) {
  return useQuery({
    queryKey: setupKeys.operation(auth.subject, id ?? ""),
    queryFn:
      auth.authenticated && auth.subject && id
        ? ({ signal }) => getSetupOperation(id, signal)
        : skipToken,
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      return status === "pending" || status === "processing" ? 3_000 : false;
    },
  });
}

export function useClaimSetup(subject: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ secret, key }: { secret: string; key: string }) =>
      claimSetup(secret, key),
    onSuccess: () => invalidateSetupOverview(queryClient, subject),
  });
}

export function useCreateFirstOrganization(subject: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ displayName, key }: { displayName: string; key: string }) =>
      createFirstOrganization(displayName, key),
    onSuccess: (operation: SetupOperation) =>
      cacheOperationAndInvalidate(queryClient, subject, operation),
  });
}

export function useRetrySetupOperation(subject: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => retrySetupOperation(id),
    onSuccess: (operation: SetupOperation) =>
      cacheOperationAndInvalidate(queryClient, subject, operation),
  });
}

function cacheOperationAndInvalidate(
  queryClient: QueryClient,
  subject: string | undefined,
  operation: SetupOperation,
): Promise<void> {
  queryClient.setQueryData(
    setupKeys.operation(subject, operation.id),
    operation,
  );

  return invalidateSetupOverview(queryClient, subject);
}

async function invalidateSetupOverview(
  queryClient: QueryClient,
  subject: string | undefined,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: setupKeys.status }),
    queryClient.invalidateQueries({ queryKey: setupKeys.current(subject) }),
  ]);
}
