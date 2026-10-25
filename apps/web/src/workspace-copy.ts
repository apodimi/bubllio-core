export type Locale = "en" | "el";

export const workspaceCopy = {
  en: {
    applications: "Your applications",
    chooseOrganization: "Organization",
    emptyApps: "No applications are assigned to you in this organization yet.",
    emptyOrganizations: "You do not have an active Core organization yet.",
    emptyOrganizationsHelp:
      "Ask an organization administrator for an invitation. Creating an account alone does not grant workspace access.",
    error: "Core could not load your workspace. Please try again.",
    loading: "Loading your workspace…",
    open: "Open application",
    retry: "Try again",
    sessionExpired: "Your session has expired. Please sign in again.",
    signOut: "Sign out",
    subtitle: "The apps available to you in this organization.",
    unavailable: "Application link unavailable",
    workspace: "Workspace",
  },
  el: {
    applications: "Οι εφαρμογές σου",
    chooseOrganization: "Οργανισμός",
    emptyApps:
      "Δεν σου έχει δοθεί ακόμη πρόσβαση σε εφαρμογές αυτού του οργανισμού.",
    emptyOrganizations: "Δεν έχεις ακόμη ενεργό οργανισμό στο Core.",
    emptyOrganizationsHelp:
      "Ζήτησε πρόσκληση από διαχειριστή οργανισμού. Η δημιουργία λογαριασμού από μόνη της δεν δίνει πρόσβαση στο workspace.",
    error: "Δεν ήταν δυνατή η φόρτωση του workspace. Δοκίμασε ξανά.",
    loading: "Φόρτωση του workspace…",
    open: "Άνοιγμα εφαρμογής",
    retry: "Δοκίμασε ξανά",
    sessionExpired: "Η σύνδεσή σου έληξε. Συνδέσου ξανά.",
    signOut: "Αποσύνδεση",
    subtitle: "Οι εφαρμογές στις οποίες έχεις πρόσβαση σε αυτόν τον οργανισμό.",
    unavailable: "Ο σύνδεσμος της εφαρμογής δεν είναι διαθέσιμος",
    workspace: "Workspace",
  },
} as const;
