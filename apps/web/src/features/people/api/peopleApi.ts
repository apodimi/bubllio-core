import { parseResponse, requestCore } from "@/lib";
import {
  CatalogSchema,
  InvitationsSchema,
  MembersSchema,
  MyInvitationsSchema,
  type InvitationInput,
  type MemberAccessInput,
} from "../schemas/people.schema";

const organizationPath = (id: string) =>
  `/api/v1/organizations/${encodeURIComponent(id)}`;

export async function getPeople(organizationId: string, signal?: AbortSignal) {
  const response = await requestCore(
    `${organizationPath(organizationId)}/members`,
    true,
    { signal },
  );

  return parseResponse(MembersSchema, response, "CORE_RESPONSE_INVALID");
}

export async function getInvitations(
  organizationId: string,
  signal?: AbortSignal,
) {
  const response = await requestCore(
    `${organizationPath(organizationId)}/invitations`,
    true,
    { signal },
  );

  return parseResponse(InvitationsSchema, response, "CORE_RESPONSE_INVALID");
}

export async function getCatalog(organizationId: string, signal?: AbortSignal) {
  const response = await requestCore(
    `${organizationPath(organizationId)}/application-catalog`,
    true,
    { signal },
  );

  return parseResponse(CatalogSchema, response, "CORE_RESPONSE_INVALID");
}

export async function sendInvitation(
  organizationId: string,
  input: InvitationInput,
) {
  await requestCore(`${organizationPath(organizationId)}/invitations`, true, {
    method: "POST",
    data: input,
  });
}

export async function resendInvitation(
  organizationId: string,
  invitationId: string,
) {
  await requestCore(
    `${organizationPath(organizationId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
    true,
    { method: "POST" },
  );
}

export async function revokeInvitation(
  organizationId: string,
  invitationId: string,
) {
  await requestCore(
    `${organizationPath(organizationId)}/invitations/${encodeURIComponent(invitationId)}`,
    true,
    { method: "DELETE" },
  );
}

export async function saveMemberAccess(
  organizationId: string,
  subject: string,
  input: MemberAccessInput,
) {
  await requestCore(
    `${organizationPath(organizationId)}/members/${encodeURIComponent(subject)}/access`,
    true,
    { method: "PUT", data: input },
  );
}

export async function getMyInvitations(signal?: AbortSignal) {
  const response = await requestCore("/api/v1/invitations/mine", true, {
    signal,
  });

  return parseResponse(MyInvitationsSchema, response, "CORE_RESPONSE_INVALID");
}

export async function acceptInvitation(invitationId: string) {
  await requestCore(
    `/api/v1/invitations/${encodeURIComponent(invitationId)}/accept`,
    true,
    {
      method: "POST",
    },
  );
}
