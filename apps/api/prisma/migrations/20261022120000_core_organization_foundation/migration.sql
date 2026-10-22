CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "OrganizationStatus" AS ENUM (
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'NEEDS_ATTENTION'
);

CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TYPE "ProvisioningOperationType" AS ENUM (
  'CREATE_ORGANIZATION',
  'ADD_MEMBER',
  'REMOVE_MEMBER'
);

CREATE TYPE "ProvisioningOperationStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(63) NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "keycloak_organization_id" UUID,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'PROVISIONING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organizations_slug_format" CHECK (
    "slug" ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
  ),
  CONSTRAINT "organizations_version_positive" CHECK ("version" > 0),
  CONSTRAINT "organizations_active_has_identity" CHECK (
    "status" <> 'ACTIVE' OR "keycloak_organization_id" IS NOT NULL
  )
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organizations_keycloak_organization_id_key"
  ON "organizations"("keycloak_organization_id");

CREATE TABLE "organization_role_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_role_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_role_assignments_subject_not_blank"
    CHECK (length(btrim("subject")) > 0),
  CONSTRAINT "organization_role_assignments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "organization_role_assignments_organization_id_subject_key"
  ON "organization_role_assignments"("organization_id", "subject");
CREATE INDEX "organization_role_assignments_subject_idx"
  ON "organization_role_assignments"("subject");

CREATE TABLE "provisioning_operations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "actor_subject" VARCHAR(255) NOT NULL,
  "type" "ProvisioningOperationType" NOT NULL,
  "status" "ProvisioningOperationStatus" NOT NULL DEFAULT 'PENDING',
  "idempotency_key" VARCHAR(255) NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(3),
  "error_code" VARCHAR(100),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "provisioning_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provisioning_operations_attempt_count_nonnegative"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "provisioning_operations_request_hash_format"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "provisioning_operations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "provisioning_operations_idempotency_key"
  ON "provisioning_operations"(
    "actor_subject",
    "organization_id",
    "type",
    "idempotency_key"
  );
CREATE INDEX "provisioning_operations_status_next_attempt_at_idx"
  ON "provisioning_operations"("status", "next_attempt_at");

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "actor_subject" VARCHAR(255) NOT NULL,
  "target_type" VARCHAR(100) NOT NULL,
  "target_id" VARCHAR(255) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "outcome" VARCHAR(50) NOT NULL,
  "correlation_id" VARCHAR(255) NOT NULL,
  "idempotency_key" VARCHAR(255),
  "before_state" JSONB,
  "after_state" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "audit_events_organization_id_created_at_idx"
  ON "audit_events"("organization_id", "created_at");
CREATE INDEX "audit_events_correlation_id_idx"
  ON "audit_events"("correlation_id");
