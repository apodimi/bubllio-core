CREATE TYPE "InstallationSetupStatus" AS ENUM (
  'NOT_STARTED',
  'CLAIMED',
  'PROVISIONING',
  'READY',
  'NEEDS_ATTENTION'
);

CREATE TABLE "installation_setup" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "status" "InstallationSetupStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "claimed_by_subject" VARCHAR(255),
  "organization_id" UUID,
  "claimed_at" TIMESTAMPTZ(3),
  "claim_expires_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "installation_setup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "installation_setup_singleton" CHECK ("id" = 1),
  CONSTRAINT "installation_setup_version_positive" CHECK ("version" > 0),
  CONSTRAINT "installation_setup_claimant_not_blank" CHECK (
    "claimed_by_subject" IS NULL OR length(btrim("claimed_by_subject")) > 0
  ),
  CONSTRAINT "installation_setup_state_shape" CHECK (
    (
      "status" = 'NOT_STARTED'
      AND "claimed_by_subject" IS NULL
      AND "organization_id" IS NULL
      AND "claimed_at" IS NULL
      AND "claim_expires_at" IS NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" = 'CLAIMED'
      AND "claimed_by_subject" IS NOT NULL
      AND "organization_id" IS NULL
      AND "claimed_at" IS NOT NULL
      AND "claim_expires_at" IS NOT NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" IN ('PROVISIONING', 'NEEDS_ATTENTION')
      AND "claimed_by_subject" IS NOT NULL
      AND "organization_id" IS NOT NULL
      AND "claimed_at" IS NOT NULL
      AND "claim_expires_at" IS NOT NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" = 'READY'
      AND "claimed_by_subject" IS NOT NULL
      AND "organization_id" IS NOT NULL
      AND "claimed_at" IS NOT NULL
      AND "claim_expires_at" IS NOT NULL
      AND "completed_at" IS NOT NULL
    )
  ),
  CONSTRAINT "installation_setup_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "installation_setup_organization_id_key"
  ON "installation_setup"("organization_id");

INSERT INTO "installation_setup" ("id") VALUES (1);

CREATE FUNCTION "prevent_ready_installation_setup_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'READY' THEN
    RAISE EXCEPTION 'READY installation setup is immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "installation_setup_ready_is_terminal"
BEFORE UPDATE OR DELETE ON "installation_setup"
FOR EACH ROW
EXECUTE FUNCTION "prevent_ready_installation_setup_mutation"();
