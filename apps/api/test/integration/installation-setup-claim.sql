\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  first_claim_count INTEGER;
  second_claim_count INTEGER;
  replay_exists BOOLEAN;
BEGIN
  UPDATE "installation_setup"
  SET
    "status" = 'CLAIMED',
    "claimed_by_subject" = '00000000-0000-0000-0000-000000000002',
    "claim_idempotency_key" = '019a12ea-9518-73cc-9634-58ac624d6eab',
    "claimed_at" = CURRENT_TIMESTAMP,
    "claim_expires_at" = CURRENT_TIMESTAMP + INTERVAL '30 minutes',
    "version" = "version" + 1,
    "updated_at" = CURRENT_TIMESTAMP
  WHERE "id" = 1 AND "status" = 'NOT_STARTED' AND "version" = 1;
  GET DIAGNOSTICS first_claim_count = ROW_COUNT;

  UPDATE "installation_setup"
  SET
    "status" = 'CLAIMED',
    "claimed_by_subject" = '00000000-0000-0000-0000-000000000003',
    "claim_idempotency_key" = '019a12ea-9518-73cc-9634-58ac624d6eac',
    "claimed_at" = CURRENT_TIMESTAMP,
    "claim_expires_at" = CURRENT_TIMESTAMP + INTERVAL '30 minutes',
    "version" = "version" + 1,
    "updated_at" = CURRENT_TIMESTAMP
  WHERE "id" = 1 AND "status" = 'NOT_STARTED' AND "version" = 1;
  GET DIAGNOSTICS second_claim_count = ROW_COUNT;

  SELECT EXISTS (
    SELECT 1
    FROM "installation_setup"
    WHERE
      "id" = 1
      AND "status" = 'CLAIMED'
      AND "claimed_by_subject" = '00000000-0000-0000-0000-000000000002'
      AND "claim_idempotency_key" = '019a12ea-9518-73cc-9634-58ac624d6eab'
  ) INTO replay_exists;

  IF first_claim_count <> 1 OR second_claim_count <> 0 OR NOT replay_exists THEN
    RAISE EXCEPTION 'installation claim compare-and-set invariant failed';
  END IF;
END
$$;

ROLLBACK;
