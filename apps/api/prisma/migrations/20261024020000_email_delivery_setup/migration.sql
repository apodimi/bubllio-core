CREATE TYPE "EmailDeliverySetupStatus" AS ENUM (
  'REQUIRED',
  'TEST_PENDING',
  'AWAITING_CONFIRMATION',
  'READY',
  'ATTENTION'
);

CREATE TABLE "email_delivery_setup" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "status" "EmailDeliverySetupStatus" NOT NULL DEFAULT 'REQUIRED',
  "configuration_fingerprint" CHAR(64),
  "code_hmac" CHAR(64),
  "code_expires_at" TIMESTAMPTZ(3),
  "code_attempt_count" INTEGER NOT NULL DEFAULT 0,
  "test_idempotency_key" VARCHAR(255),
  "confirm_idempotency_key" VARCHAR(255),
  "safe_error_code" VARCHAR(100),
  "confirmation_retryable" BOOLEAN NOT NULL DEFAULT FALSE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "tested_at" TIMESTAMPTZ(3),
  "confirmed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "email_delivery_setup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_delivery_setup_singleton" CHECK ("id" = 1),
  CONSTRAINT "email_delivery_setup_attempts" CHECK (
    "code_attempt_count" >= 0 AND "code_attempt_count" <= 5
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "installation_setup"
    WHERE "status" NOT IN ('NOT_STARTED', 'READY')
  ) THEN
    RAISE EXCEPTION
      'Email delivery setup cannot be introduced while installation setup is incomplete';
  END IF;
END $$;

-- Completed pre-alpha installations keep their terminal state. This is an
-- upgrade-compatibility marker, not new evidence that their SMTP was retested.
INSERT INTO "email_delivery_setup" (
  "id",
  "status",
  "confirmed_at",
  "updated_at"
)
SELECT
  1,
  CASE
    WHEN "status" = 'READY' THEN 'READY'::"EmailDeliverySetupStatus"
    ELSE 'REQUIRED'::"EmailDeliverySetupStatus"
  END,
  CASE WHEN "status" = 'READY' THEN CURRENT_TIMESTAMP ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "installation_setup"
WHERE "id" = 1;
