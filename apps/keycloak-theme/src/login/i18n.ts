import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

const { useI18n, ofTypeI18n } = i18nBuilder
  .withThemeName<ThemeName>()
  .withCustomTranslations({
    en: {
      doRegister: "Create account",
      loginAccountTitle: "Welcome back.",
      bubllioSignInDescription: "Sign in to your Bubllio account.",
      bubllioHeroTitle: "One account. Every Bubllio workspace.",
      bubllioHeroDescription:
        "Sign in once to access the Bubllio products and organizations available to you.",
      bubllioTagline: "Bubllio Identity · One account across the suite",
      bubllioAccessHelp:
        "Use your existing Bubllio account. Need access? Contact your workspace owner.",
      bubllioRegistrationHelp:
        "Verify your email first. An organization administrator can then invite you to a workspace.",
      bubllioRegistrationTitle: "Create your Bubllio account",
      bubllioRegistrationDescription:
        "One verified account for every Bubllio workspace you are invited to.",
      bubllioSetupRegistrationHelp:
        "Use your own email address. Complete verification before returning to Core setup.",
      bubllioSetupRegistrationTitle: "Create administrator account",
      bubllioSetupRegistrationDescription:
        "Verify the first administrator account to begin setting up your Bubllio workspace.",
    },
    el: {
      doRegister: "Δημιουργία λογαριασμού",
      loginAccountTitle: "Καλώς ήρθες ξανά.",
      bubllioSignInDescription: "Συνδέσου στον λογαριασμό Bubllio.",
      bubllioHeroTitle: "Ένας λογαριασμός. Κάθε χώρος εργασίας Bubllio.",
      bubllioHeroDescription:
        "Συνδέσου μία φορά για πρόσβαση στα προϊόντα και στους οργανισμούς Bubllio που είναι διαθέσιμα για εσένα.",
      bubllioTagline: "Bubllio Identity · Ένας λογαριασμός για όλη τη σουίτα",
      bubllioAccessHelp:
        "Χρησιμοποίησε τον υπάρχοντα λογαριασμό Bubllio. Χρειάζεσαι πρόσβαση; Επικοινώνησε με τον ιδιοκτήτη του χώρου εργασίας σου.",
      bubllioRegistrationHelp:
        "Επαλήθευσε πρώτα το email σου. Έπειτα ένας διαχειριστής οργανισμού μπορεί να σε προσκαλέσει στο workspace.",
      bubllioRegistrationTitle: "Δημιούργησε λογαριασμό Bubllio",
      bubllioRegistrationDescription:
        "Ένας επαληθευμένος λογαριασμός για κάθε Bubllio workspace στο οποίο προσκαλείσαι.",
      bubllioSetupRegistrationHelp:
        "Χρησιμοποίησε το δικό σου email και ολοκλήρωσε την επαλήθευση πριν επιστρέψεις στην εγκατάσταση του Core.",
      bubllioSetupRegistrationTitle: "Δημιουργία λογαριασμού διαχειριστή",
      bubllioSetupRegistrationDescription:
        "Επαλήθευσε τον πρώτο λογαριασμό διαχειριστή για να ξεκινήσεις τη ρύθμιση του Bubllio workspace.",
    },
  })
  .build();

export type I18n = typeof ofTypeI18n;
export { useI18n };
