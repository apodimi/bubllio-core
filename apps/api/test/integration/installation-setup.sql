\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  setup_status "InstallationSetupStatus";
  setup_count INTEGER;
BEGIN
  SELECT count(*), min("status")
    INTO setup_count, setup_status
    FROM "installation_setup";

  IF setup_count <> 1 OR setup_status <> 'NOT_STARTED' THEN
    RAISE EXCEPTION 'expected one NOT_STARTED installation setup row';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO "installation_setup" ("id", "updated_at") VALUES (2, CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'a second singleton row was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE "installation_setup"
      SET "status" = 'CLAIMED', "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = 1;
    RAISE EXCEPTION 'CLAIMED state without a claimant was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$$;

INSERT INTO "organizations" (
  "id",
  "slug",
  "display_name",
  "updated_at"
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  'first-organization',
  'First Organization',
  CURRENT_TIMESTAMP
);

UPDATE "installation_setup"
SET
  "status" = 'CLAIMED',
  "claimed_by_subject" = '00000000-0000-0000-0000-000000000002',
  "claim_idempotency_key" = '019a12ea-9518-73cc-9634-58ac624d6eab',
  "claimed_at" = CURRENT_TIMESTAMP,
  "claim_expires_at" = CURRENT_TIMESTAMP + INTERVAL '30 minutes',
  "version" = 2,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 1;

UPDATE "installation_setup"
SET
  "status" = 'PROVISIONING',
  "organization_id" = '00000000-0000-0000-0000-000000000010',
  "version" = 3,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 1;

UPDATE "installation_setup"
SET
  "status" = 'READY',
  "completed_at" = CURRENT_TIMESTAMP,
  "version" = 4,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 1;

DO $$
DECLARE
  mutation_blocked BOOLEAN := FALSE;
BEGIN
  BEGIN
    UPDATE "installation_setup"
      SET "status" = 'NOT_STARTED', "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = 1;
  EXCEPTION
    WHEN raise_exception THEN mutation_blocked := TRUE;
  END;

  IF NOT mutation_blocked THEN
    RAISE EXCEPTION 'READY installation setup was reopened';
  END IF;
END
$$;

ROLLBACK;
