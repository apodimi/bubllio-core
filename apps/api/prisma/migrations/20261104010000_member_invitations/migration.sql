CREATE TYPE "MemberInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERY_FAILED', 'RESENDING', 'REVOCATION_PENDING', 'REVOKED');

ALTER TABLE "organization_role_assignments" ADD COLUMN "email" VARCHAR(320);

CREATE TABLE "member_invitations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "application_keys" TEXT[] NOT NULL,
  "status" "MemberInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invited_by" VARCHAR(255) NOT NULL,
  "accepted_subject" VARCHAR(255),
  "keycloak_invitation_id" UUID,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "member_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "member_invitations_organization_id_email_key" ON "member_invitations"("organization_id", "email");
CREATE INDEX "member_invitations_email_status_idx" ON "member_invitations"("email", "status");
