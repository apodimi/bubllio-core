import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

const { useI18n, ofTypeI18n } = i18nBuilder
  .withThemeName<ThemeName>()
  .withCustomTranslations({
    en: {
      loginAccountTitle: "Welcome back.",
      bubllioSignInDescription: "Sign in to your Bubllio account.",
      bubllioHeroTitle: "One account. Every Bubllio workspace.",
      bubllioHeroDescription:
        "Sign in once to access the Bubllio products and organizations available to you.",
      bubllioTagline: "Bubllio Identity · One account across the suite",
      bubllioAccessHelp:
        "Use your existing Bubllio account. Need access? Contact your workspace owner.",
    },
    el: {
      loginAccountTitle: "Καλώς ήρθες ξανά.",
      bubllioSignInDescription: "Συνδέσου στον λογαριασμό Bubllio.",
      bubllioHeroTitle: "Ένας λογαριασμός. Κάθε χώρος εργασίας Bubllio.",
      bubllioHeroDescription:
        "Συνδέσου μία φορά για πρόσβαση στα προϊόντα και στους οργανισμούς Bubllio που είναι διαθέσιμα για εσένα.",
      bubllioTagline: "Bubllio Identity · Ένας λογαριασμός για όλη τη σουίτα",
      bubllioAccessHelp:
        "Χρησιμοποίησε τον υπάρχοντα λογαριασμό Bubllio. Χρειάζεσαι πρόσβαση; Επικοινώνησε με τον ιδιοκτήτη του χώρου εργασίας σου.",
    },
  })
  .build();

export type I18n = typeof ofTypeI18n;
export { useI18n };
