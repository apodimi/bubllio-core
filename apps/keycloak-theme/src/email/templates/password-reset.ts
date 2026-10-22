import type { GetSubject, GetTemplate } from "keycloakify-emails";
import { createVariablesHelper } from "keycloakify-emails/variables";

import { renderEmail, renderPlainText } from "./email-layout";

const { exp } = createVariablesHelper("password-reset.ftl");

const copy = {
  el: {
    actionLabel: "Αλλαγή κωδικού",
    body: [
      "Λάβαμε αίτημα αλλαγής του κωδικού πρόσβασης για τον λογαριασμό σου.",
    ],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Ο σύνδεσμος λήγει σε",
    footer: "Bubllio Identity · Ένας λογαριασμός για όλο το Bubllio suite.",
    heading: "Άλλαξε τον κωδικό σου",
    oneTimeLabel: "Μία χρήση",
    preheader:
      "Χρησιμοποίησε τον ασφαλή σύνδεσμο για να αλλάξεις τον κωδικό σου.",
    purpose: "Αλλαγή κωδικού",
    securityLabel: "Προστασία",
    securityNote:
      "Δεν έκανες εσύ το αίτημα; Αγνόησε αυτό το email. Ο κωδικός σου δεν θα αλλάξει.",
    subject: "Αλλαγή κωδικού Bubllio",
  },
  en: {
    actionLabel: "Reset password",
    body: ["We received a request to reset the password for your account."],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Link expires in",
    footer: "Bubllio Identity · One account across the Bubllio suite.",
    heading: "Reset your password",
    oneTimeLabel: "One use",
    preheader: "Use the secure link to reset your Bubllio password.",
    purpose: "Password reset",
    securityLabel: "Protection",
    securityNote:
      "Didn't request this? Ignore this email. Your password will not change.",
    subject: "Reset your Bubllio password",
  },
} as const;

export const getTemplate: GetTemplate = async ({ locale, plainText }) => {
  const content = copy[locale === "el" ? "el" : "en"];
  const email = { ...content, actionUrl: exp("link"), locale };

  return plainText ? renderPlainText(email) : await renderEmail(email);
};

export const getSubject: GetSubject = async ({ locale }) =>
  copy[locale === "el" ? "el" : "en"].subject;
