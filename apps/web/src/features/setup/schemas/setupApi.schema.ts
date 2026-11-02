import { z } from "zod";

export const EmailDeliverySafeErrorCodeSchema = z.enum({
  Unavailable: "EMAIL_DELIVERY_UNAVAILABLE",
  AuthenticationFailed: "EMAIL_DELIVERY_AUTHENTICATION_FAILED",
  TlsFailed: "EMAIL_DELIVERY_TLS_FAILED",
  Rejected: "EMAIL_DELIVERY_REJECTED",
  ConfirmationExpired: "EMAIL_CONFIRMATION_EXPIRED",
  ConfirmationInvalid: "EMAIL_CONFIRMATION_INVALID",
  IdentityActivationFailed: "IDENTITY_ACTIVATION_FAILED",
});
export const EmailDeliverySafeErrorCode = EmailDeliverySafeErrorCodeSchema.enum;
export type EmailDeliverySafeErrorCode = z.infer<
  typeof EmailDeliverySafeErrorCodeSchema
>;

export const SystemCheckKeySchema = z.enum({
  Database: "database",
  Identity: "identity",
  Migrations: "migrations",
  Applications: "applications",
});
export const SystemCheckKey = SystemCheckKeySchema.enum;
export type SystemCheckKey = z.infer<typeof SystemCheckKeySchema>;

const checkSchema = z.strictObject({
  key: SystemCheckKeySchema,
  status: z.enum(["ready", "attention"]),
  messageCode: z.string().optional(),
});

export const SystemPreflightSchema = z
  .strictObject({
    status: z.enum(["ready", "attention"]),
    checks: z.array(checkSchema),
  })
  .superRefine((value, context) => {
    const expected = Object.values(SystemCheckKey).length;
    if (
      value.checks.length !== expected ||
      new Set(value.checks.map((check) => check.key)).size !== expected ||
      (value.status === "ready" &&
        value.checks.some((check) => check.status !== "ready"))
    ) {
      context.addIssue({ code: "custom", message: "SYSTEM_PREFLIGHT_INVALID" });
    }
  });
export type SystemPreflight = z.infer<typeof SystemPreflightSchema>;

export const SetupStatusWireSchema = z.object({
  setupRequired: z.boolean(),
  phase: z.enum(["new", "in_progress", "ready"]).optional(),
  registrationRequired: z.boolean().optional(),
});

export const SetupStatusSchema = z
  .strictObject({
    setupRequired: z.boolean(),
    phase: z.enum(["new", "in_progress", "ready"]),
    registrationRequired: z.boolean(),
  })
  .refine(
    (status) =>
      (status.phase === "ready") === !status.setupRequired &&
      (!status.registrationRequired || status.phase === "new"),
    "SETUP_STATUS_INVALID",
  );
export type SetupStatus = z.infer<typeof SetupStatusSchema>;

export const SetupOperationSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "pending",
    "processing",
    "awaiting_owner",
    "succeeded",
    "needs_attention",
  ]),
  stages: z.array(z.object({ name: z.string(), status: z.string() })),
  safeErrorCode: z.string().nullable(),
  organizationId: z.string().min(1),
  reauthenticationRequired: z.boolean(),
  correlationId: z.string().min(1),
});
export type SetupOperation = z.infer<typeof SetupOperationSchema>;

export const CurrentSetupSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("unclaimed") }),
  z.object({ state: z.literal("claimed") }),
  z.object({ state: z.literal("operation"), operation: SetupOperationSchema }),
]);
export type CurrentSetup = z.infer<typeof CurrentSetupSchema>;

export const ClaimSetupResultSchema = z.object({
  status: z.literal("claimed"),
});

export const EmailDeliverySettingsSchema = z.object({
  senderName: z.string(),
  senderEmail: z.string(),
  replyToEmail: z.string().optional(),
  host: z.string(),
  port: z.number().int(),
  security: z.enum(["starttls", "tls", "none"]),
  authentication: z.boolean(),
  username: z.string().optional(),
  password: z.string().optional(),
  testRecipient: z.string(),
});
export type EmailDeliverySettings = z.infer<typeof EmailDeliverySettingsSchema>;
export type EmailDeliverySecurity = EmailDeliverySettings["security"];

export const EmailDeliveryReadyStatusSchema = z.strictObject({
  status: z.literal("ready"),
  testedAt: z.string().refine(isDate).optional(),
  configuredAt: z.string().refine(isDate).optional(),
});
export const EmailDeliveryStatusSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("required") }),
  z.strictObject({
    status: z.literal("awaiting_confirmation"),
    safeErrorCode: EmailDeliverySafeErrorCodeSchema.optional(),
  }),
  EmailDeliveryReadyStatusSchema,
  z.strictObject({
    status: z.literal("attention"),
    safeErrorCode: EmailDeliverySafeErrorCodeSchema,
    confirmationRetryable: z.boolean(),
  }),
]);
export type EmailDeliveryStatus = z.infer<typeof EmailDeliveryStatusSchema>;

export const EmailDeliveryTestResultSchema = z.strictObject({
  status: z.literal("awaiting_confirmation"),
  maskedRecipient: z.string().min(1),
});
export type EmailDeliveryTestResult = z.infer<
  typeof EmailDeliveryTestResultSchema
>;

function isDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
