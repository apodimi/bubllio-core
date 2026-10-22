ALTER TABLE "installation_setup"
  ADD COLUMN "claim_idempotency_key" VARCHAR(255);

ALTER TABLE "installation_setup"
  DROP CONSTRAINT "installation_setup_state_shape";

ALTER TABLE "installation_setup"
  ADD CONSTRAINT "installation_setup_state_shape" CHECK (
    (
      "status" = 'NOT_STARTED'
      AND "claimed_by_subject" IS NULL
      AND "claim_idempotency_key" IS NULL
      AND "organization_id" IS NULL
      AND "claimed_at" IS NULL
      AND "claim_expires_at" IS NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" = 'CLAIMED'
      AND "claimed_by_subject" IS NOT NULL
      AND "claim_idempotency_key" IS NOT NULL
      AND "organization_id" IS NULL
      AND "claimed_at" IS NOT NULL
      AND "claim_expires_at" IS NOT NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" IN ('PROVISIONING', 'NEEDS_ATTENTION')
      AND "claimed_by_subject" IS NOT NULL
      AND "claim_idempotency_key" IS NOT NULL
      AND "organization_id" IS NOT NULL
      AND "claimed_at" IS NOT NULL
      AND "claim_expires_at" IS NOT NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" = 'READY'
      AND "claimed_by_subject" IS NOT NULL
      AND "claim_idempotency_key" IS NOT NULL
      AND "organization_id" IS NOT NULL
      AND "claimed_at" IS NOT NULL
      AND "claim_expires_at" IS NOT NULL
      AND "completed_at" IS NOT NULL
    )
  );
