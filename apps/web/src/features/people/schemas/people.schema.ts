import { z } from "zod";

const role = z.enum(["OWNER", "ADMIN", "MEMBER"]);
const invitedRole = z.enum(["ADMIN", "MEMBER"]);

export const InvitationSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: invitedRole,
  applicationKeys: z.array(z.string()),
  status: z.enum([
    "PENDING",
    "EXPIRED",
    "DELIVERY_FAILED",
    "REVOCATION_PENDING",
    "RESENDING",
  ]),
  expiresAt: z.string(),
});
export const InvitationsSchema = z.array(InvitationSchema);
export type Invitation = z.infer<typeof InvitationSchema>;

export const MemberSchema = z.object({
  subject: z.string(),
  email: z.string().nullable().optional(),
  role,
  applicationKeys: z.array(z.string()),
});
export const MembersSchema = z.array(MemberSchema);
export type Member = z.infer<typeof MemberSchema>;

export const CatalogAppSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  launchUrl: z.string(),
  selectable: z.boolean(),
});
export const CatalogSchema = z.array(CatalogAppSchema);
export type CatalogApp = z.infer<typeof CatalogAppSchema>;

export const MyInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  role: invitedRole,
  applicationKeys: z.array(z.string()),
  expiresAt: z.string(),
});
export const MyInvitationsSchema = z.array(MyInvitationSchema);
export type MyInvitation = z.infer<typeof MyInvitationSchema>;

export const invitationInputSchema = z.object({
  email: z.email(),
  role: invitedRole,
  applicationKeys: z.array(z.string()),
});
export type InvitationInput = z.infer<typeof invitationInputSchema>;
export type MemberAccessInput = {
  role: z.infer<typeof role>;
  applicationKeys: string[];
};
