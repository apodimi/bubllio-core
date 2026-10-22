import type { GetSubject, GetTemplate } from "keycloakify-emails";
import { createVariablesHelper } from "keycloakify-emails/variables";

import { renderEmail, renderPlainText } from "./email-layout";

const { exp } = createVariablesHelper("email-verification.ftl");

const copy = {
  el: {
    actionLabel: "Επιβεβαίωση email",
    body: [
      "Επιβεβαίωσε ότι αυτή η διεύθυνση email ανήκει στον λογαριασμό σου.",
    ],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Ο σύνδεσμος λήγει σε",
    footer: "Bubllio Identity · Ένας λογαριασμός για όλο το Bubllio suite.",
    heading: "Επιβεβαίωσε το email σου",
    oneTimeLabel: "Μία χρήση",
    preheader: "Επιβεβαίωσε τη διεύθυνση email του Bubllio λογαριασμού σου.",
    purpose: "Επιβεβαίωση email",
    securityLabel: "Προστασία",
    securityNote:
      "Δεν δημιούργησες εσύ αυτόν τον λογαριασμό; Αγνόησε αυτό το email.",
    subject: "Επιβεβαίωσε το email σου στο Bubllio",
  },
  en: {
    actionLabel: "Verify email",
    body: ["Confirm that this email address belongs to your account."],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Link expires in",
    footer: "Bubllio Identity · One account across the Bubllio suite.",
    heading: "Verify your email",
    oneTimeLabel: "One use",
    preheader: "Verify the email address connected to your Bubllio account.",
    purpose: "Email verification",
    securityLabel: "Protection",
    securityNote:
      "Didn't create this account? Ignore this email and no action will be taken.",
    subject: "Verify your email for Bubllio",
  },
} as const;

export const getTemplate: GetTemplate = async ({ locale, plainText }) => {
  const content = copy[locale === "el" ? "el" : "en"];
  const email = { ...content, actionUrl: exp("link"), locale };

  return plainText ? renderPlainText(email) : await renderEmail(email);
};

export const getSubject: GetSubject = async ({ locale }) =>
  copy[locale === "el" ? "el" : "en"].subject;
