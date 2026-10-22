import type { GetSubject, GetTemplate } from "keycloakify-emails";

import { renderEmail, renderPlainText } from "./email-layout";

const copy = {
  el: {
    body: [
      "Το Bubllio Identity συνδέθηκε επιτυχώς με τον email provider αυτού του περιβάλλοντος.",
    ],
    footer: "Bubllio Identity · Ένας λογαριασμός για όλο το Bubllio suite.",
    heading: "Το email λειτουργεί",
    preheader: "Η δοκιμή αποστολής από το Bubllio Identity ολοκληρώθηκε.",
    purpose: "Έλεγχος παράδοσης",
    securityNote:
      "Αυτό είναι δοκιμαστικό μήνυμα διαχειριστή και δεν απαιτεί καμία ενέργεια.",
    subject: "Επιτυχής δοκιμή email Bubllio",
  },
  en: {
    body: [
      "Bubllio Identity connected successfully to this environment's email provider.",
    ],
    footer: "Bubllio Identity · One account across the Bubllio suite.",
    heading: "Email is working",
    preheader: "The Bubllio Identity delivery test completed successfully.",
    purpose: "Delivery test",
    securityNote:
      "This is an administrator test message. No action is required.",
    subject: "Bubllio email test succeeded",
  },
} as const;

export const getTemplate: GetTemplate = async ({ locale, plainText }) => {
  const content = { ...copy[locale === "el" ? "el" : "en"], locale };

  return plainText ? renderPlainText(content) : await renderEmail(content);
};

export const getSubject: GetSubject = async ({ locale }) =>
  copy[locale === "el" ? "el" : "en"].subject;
