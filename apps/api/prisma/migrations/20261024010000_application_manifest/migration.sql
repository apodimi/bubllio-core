ALTER TABLE "applications"
ADD COLUMN "contract_version" VARCHAR(32) NOT NULL DEFAULT '1',
ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "managed_by_manifest" BOOLEAN NOT NULL DEFAULT false;
