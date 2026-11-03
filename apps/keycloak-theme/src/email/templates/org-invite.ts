import type { GetSubject, GetTemplate } from "keycloakify-emails";
import { createVariablesHelper } from "keycloakify-emails/variables";

import { renderEmail, renderPlainText } from "./email-layout";

const { exp } = createVariablesHelper("org-invite.ftl");

const copy = {
  el: {
    actionLabel: "Αποδοχή πρόσκλησης",
    body: [
      `Έχεις προσκληθεί στον οργανισμό ${exp("organization.name")} του Bubllio.`,
      "Άνοιξε τον σύνδεσμο και συνδέσου ή δημιούργησε λογαριασμό με τη διεύθυνση email στην οποία έλαβες αυτή την πρόσκληση.",
      "Όταν επιβεβαιωθεί η συμμετοχή σου και η πρόσβασή σου, οι εφαρμογές που σου έχουν ανατεθεί θα εμφανιστούν στον χώρο εργασίας σου.",
    ],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Ο σύνδεσμος λήγει σε",
    footer: "Bubllio Identity · Ένας λογαριασμός για όλο το Bubllio suite.",
    heading: "Πρόσκληση στο Bubllio",
    oneTimeLabel: "Πρόσκληση μέλους",
    preheader: `Αποδέξου την πρόσκληση στον οργανισμό ${exp("organization.name")}.`,
    purpose: "Πρόσκληση",
    securityLabel: "Πρόσβαση",
    securityNote:
      "Αν δεν περίμενες αυτή την πρόσκληση, αγνόησε το email ή επικοινώνησε με τον διαχειριστή του οργανισμού.",
    subject: "Πρόσκληση σε οργανισμό του Bubllio",
  },
  en: {
    actionLabel: "Accept invitation",
    body: [
      `You've been invited to join ${exp("organization.name")} on Bubllio.`,
      "Open the link and sign in or create an account with the email address that received this invitation.",
      "Once your membership and access are confirmed, your assigned apps will appear in your workspace.",
    ],
    expiration: exp("linkExpirationFormatter(linkExpiration)"),
    expirationLabel: "Link expires in",
    footer: "Bubllio Identity · One account across the Bubllio suite.",
    heading: "You're invited to Bubllio",
    oneTimeLabel: "Member invitation",
    preheader: `Accept your invitation to ${exp("organization.name")}.`,
    purpose: "Invitation",
    securityLabel: "Access",
    securityNote:
      "If you weren't expecting this invitation, ignore this email or contact the organization administrator.",
    subject: "Invitation to join an organization on Bubllio",
  },
} as const;

export const getTemplate: GetTemplate = async ({ locale, plainText }) => {
  const content = copy[locale === "el" ? "el" : "en"];
  const email = { ...content, actionUrl: exp("link"), locale };

  return plainText ? renderPlainText(email) : await renderEmail(email);
};

export const getSubject: GetSubject = async ({ locale }) =>
  copy[locale === "el" ? "el" : "en"].subject;
