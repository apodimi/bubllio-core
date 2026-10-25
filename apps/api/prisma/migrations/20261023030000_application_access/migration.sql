CREATE TABLE "applications" (
  "key" VARCHAR(63) NOT NULL,
  "display_name" VARCHAR(80) NOT NULL,
  "launch_url" VARCHAR(2048) NOT NULL,
  "audience" VARCHAR(255) NOT NULL,
  "installed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applications_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "applications_key_format" CHECK ("key" ~ '^[a-z][a-z0-9-]{1,62}$'),
  CONSTRAINT "applications_display_name_not_blank" CHECK (length(btrim("display_name")) > 0),
  CONSTRAINT "applications_audience_not_blank" CHECK (length(btrim("audience")) > 0)
);

CREATE TABLE "organization_applications" (
  "organization_id" UUID NOT NULL,
  "application_key" VARCHAR(63) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "entitled" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_applications_pkey" PRIMARY KEY ("organization_id", "application_key"),
  CONSTRAINT "organization_applications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_applications_application_key_fkey"
    FOREIGN KEY ("application_key") REFERENCES "applications"("key")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "member_application_grants" (
  "organization_id" UUID NOT NULL,
  "application_key" VARCHAR(63) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_application_grants_pkey"
    PRIMARY KEY ("organization_id", "application_key", "subject"),
  CONSTRAINT "member_application_grants_organization_app_fkey"
    FOREIGN KEY ("organization_id", "application_key")
    REFERENCES "organization_applications"("organization_id", "application_key")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "member_application_grants_member_fkey"
    FOREIGN KEY ("organization_id", "subject")
    REFERENCES "organization_role_assignments"("organization_id", "subject")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "member_application_grants_subject_idx"
  ON "member_application_grants"("subject");
