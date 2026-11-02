import { z } from "zod";

import { i18n, type SetupCopy as Copy } from "../../../../locales";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function required(label: string) {
  return i18n.t("setup.fieldRequired", {
    field: label.toLocaleLowerCase(i18n.language),
  });
}

function requiredEmail(copy: Copy, label: string) {
  return z
    .string()
    .trim()
    .min(1, required(label))
    .refine((value) => !value || EMAIL_PATTERN.test(value), copy.validEmail);
}

export function emailSettingsSchema(copy: Copy) {
  return z
    .object({
      senderName: z.string().trim().min(1, required(copy.emailSenderName)),
      senderEmail: requiredEmail(copy, copy.emailSenderEmail),
      replyToEmail: z
        .string()
        .trim()
        .refine(
          (value) => !value || EMAIL_PATTERN.test(value),
          copy.validEmail,
        ),
      host: z.string().trim().min(1, required(copy.emailHost)),
      port: z.string().refine((value) => {
        const port = Number(value);

        return (
          value.trim() !== "" &&
          Number.isInteger(port) &&
          port >= 1 &&
          port <= 65_535
        );
      }, copy.validPort),
      security: z.enum(["starttls", "tls", "none"]),
      authentication: z.boolean(),
      username: z.string(),
      password: z.string(),
      testRecipient: requiredEmail(copy, copy.emailTestRecipient),
      setupSecret: z.string().min(32, copy.validSetupSecret),
    })
    .superRefine((values, context) => {
      if (!values.authentication) {
        return;
      }
      if (!values.username.trim()) {
        context.addIssue({
          code: "custom",
          path: ["username"],
          message: required(copy.emailUsername),
        });
      }
      if (!values.password) {
        context.addIssue({
          code: "custom",
          path: ["password"],
          message: required(copy.emailPassword),
        });
      }
    });
}

export function emailConfirmationSchema(copy: Copy) {
  return z.object({
    confirmationCode: z.string().regex(/^\d{6}$/u, copy.validConfirmationCode),
    setupSecret: z.string().min(32, copy.validSetupSecret),
  });
}

export type EmailSettingsValues = z.input<
  ReturnType<typeof emailSettingsSchema>
>;
export type EmailConfirmationValues = z.input<
  ReturnType<typeof emailConfirmationSchema>
>;

export const initialEmailSettingsValues: EmailSettingsValues = {
  senderName: "Bubllio",
  senderEmail: "",
  replyToEmail: "",
  host: "",
  port: "587",
  security: "starttls",
  authentication: true,
  username: "",
  password: "",
  testRecipient: "",
  setupSecret: "",
};
