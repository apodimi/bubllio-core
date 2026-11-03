import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptInvitation,
  getCatalog,
  getInvitations,
  getMyInvitations,
  getPeople,
  resendInvitation,
  revokeInvitation,
  saveMemberAccess,
  sendInvitation,
} from "../api/peopleApi";
import type {
  InvitationInput,
  MemberAccessInput,
} from "../schemas/people.schema";

const peopleKey = (subject: string | undefined, organizationId: string) =>
  ["people", subject, organizationId] as const;

export function usePeople(
  subject: string | undefined,
  organizationId: string,
  allowed: boolean,
) {
  const key = peopleKey(subject, organizationId);

  return {
    members: useQuery({
      queryKey: [...key, "members"],
      queryFn: ({ signal }) => getPeople(organizationId, signal),
      enabled: Boolean(organizationId) && allowed,
    }),
    invitations: useQuery({
      queryKey: [...key, "invitations"],
      queryFn: ({ signal }) => getInvitations(organizationId, signal),
      enabled: Boolean(organizationId) && allowed,
      refetchInterval: (query) =>
        query.state.data?.some(
          (invitation) => invitation.status === "RESENDING",
        )
          ? 5_000
          : false,
    }),
    catalog: useQuery({
      queryKey: [...key, "catalog"],
      queryFn: ({ signal }) => getCatalog(organizationId, signal),
      enabled: Boolean(organizationId) && allowed,
    }),
  };
}

export function useSendInvitation(
  subject: string | undefined,
  organizationId: string,
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: InvitationInput) =>
      sendInvitation(organizationId, input),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: [...peopleKey(subject, organizationId), "invitations"],
      }),
  });
}

export function useInvitationActions(
  subject: string | undefined,
  organizationId: string,
) {
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({
      queryKey: [...peopleKey(subject, organizationId), "invitations"],
    });

  return {
    resend: useMutation({
      mutationFn: (invitationId: string) =>
        resendInvitation(organizationId, invitationId),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (invitationId: string) =>
        revokeInvitation(organizationId, invitationId),
      onSuccess: refresh,
    }),
  };
}

export function useSaveMemberAccess(
  subject: string | undefined,
  organizationId: string,
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberSubject,
      input,
    }: {
      memberSubject: string;
      input: MemberAccessInput;
    }) => saveMemberAccess(organizationId, memberSubject, input),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: [...peopleKey(subject, organizationId), "members"],
      });
      await client.invalidateQueries({
        queryKey: ["workspace", subject, organizationId, "applications"],
      });
    },
  });
}

export function useMyInvitations(subject: string | undefined) {
  return useQuery({
    queryKey: ["people", subject, "mine"],
    queryFn: ({ signal }) => getMyInvitations(signal),
  });
}

export function useAcceptInvitation(subject: string | undefined) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["people", subject, "mine"] });
      await client.invalidateQueries({
        queryKey: ["workspace", subject, "organizations"],
      });
    },
  });
}
