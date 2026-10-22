import type { GetSubject, GetTemplate } from "keycloakify-emails";
import { createVariablesHelper } from "keycloakify-emails/variables";

import { renderEmail, renderPlainText } from "./email-layout";

const { exp } = createVariablesHelper("executeActions.ftl");

const copy = {
  el: {
    actionLabel: "Συνέχεια στο Bubllio",
    body: [
      "Χρειάζεται να ολοκληρώσεις μια ενέργεια ασφαλείας για τον λογαριασμό σου.",
    ],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Ο σύνδεσμος λήγει σε",
    footer: "Bubllio Identity · Ένας λογαριασμός για όλο το Bubllio suite.",
    heading: "Ολοκλήρωσε την ενέργεια",
    oneTimeLabel: "Μία χρήση",
    preheader: "Μια ενέργεια ασφαλείας περιμένει στον Bubllio λογαριασμό σου.",
    purpose: "Ενέργεια λογαριασμού",
    securityLabel: "Προστασία",
    securityNote:
      "Αν δεν περίμενες αυτό το email, μην ανοίξεις τον σύνδεσμο και ενημέρωσε τον διαχειριστή σου.",
    subject: "Απαιτείται ενέργεια στον Bubllio λογαριασμό σου",
  },
  en: {
    actionLabel: "Continue to Bubllio",
    body: ["You need to complete a security action for your account."],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Link expires in",
    footer: "Bubllio Identity · One account across the Bubllio suite.",
    heading: "Complete your account action",
    oneTimeLabel: "One use",
    preheader: "A security action is waiting on your Bubllio account.",
    purpose: "Account action",
    securityLabel: "Protection",
    securityNote:
      "If you weren't expecting this email, don't open the link and contact your administrator.",
    subject: "Action required for your Bubllio account",
  },
} as const;

export const getTemplate: GetTemplate = async ({ locale, plainText }) => {
  const content = copy[locale === "el" ? "el" : "en"];
  const email = { ...content, actionUrl: exp("link"), locale };

  return plainText ? renderPlainText(email) : await renderEmail(email);
};

export const getSubject: GetSubject = async ({ locale }) =>
  copy[locale === "el" ? "el" : "en"].subject;
