import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmEmailDelivery,
  getEmailDeliveryStatus,
  testEmailDelivery,
} from "../api";
import type {
  EmailDeliverySettings,
  EmailDeliveryStatus,
} from "../schemas/setupApi.schema";
import { setupKeys } from "./setupKeys";

export function useEmailDeliveryStatus() {
  return useQuery({
    queryKey: setupKeys.email,
    queryFn: ({ signal }) => getEmailDeliveryStatus(signal),
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
      const status = {
        status: result.status,
      } satisfies EmailDeliveryStatus;

      queryClient.setQueryData(setupKeys.email, status);
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
