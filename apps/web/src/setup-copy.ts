export type SetupLocale = "en" | "el";

export const setupCopy = {
  en: {
    progressLabel: "Setup progress",
    railSteps: [
      "Your account",
      "Installation access",
      "Organization",
      "Activate workspace",
    ],
    stepStatus: {
      complete: "Complete",
      current: "Current step",
      upcoming: "Up next",
    },
    title: "Set up your Bubllio workspace",
    intro: "Create the first organization for this installation.",
    loading: "Checking setup status…",
    signOut: "Sign out",
    unavailableTitle: "Setup could not load",
    unavailableHelp:
      "Check that the local Core API and Keycloak are running, then try again.",
    tryAgain: "Try again",
    beginTitle: "Create the administrator account",
    beginBody:
      "The IT administrator creates the first verified account and sets up the first organization. Team access comes after setup.",
    createAccount: "Create administrator account",
    resumeTitle: "Continue installation setup",
    resumeBody:
      "The installation has already been claimed. Continue with the same verified administrator account that started it.",
    resume: "Continue setup",
    takenTitle: "Setup belongs to another administrator",
    takenBody:
      "Only the verified administrator who started this installation can continue. Sign out and use that account.",
    authorityTitle: "Confirm installation authority",
    authorityBody:
      "Enter the one-time setup secret from the installation terminal. It is separate from your account password.",
    secretLabel: "One-time setup secret",
    continue: "Continue",
    organizationTitle: "Name your first organization",
    organizationBody:
      "You will become its first owner. You can add members and applications later.",
    organizationLabel: "Organization name",
    create: "Create organization",
    progressTitle: "Creating your organization",
    progressBody:
      "This may take a moment. You can return to this page with the same account.",
    attentionTitle: "Setup needs attention",
    attentionBody:
      "Check that the local services are healthy, then retry this same operation. Do not start another organization.",
    reference: "Reference",
    errorCode: "Code",
    unknown: "Unknown",
    retrySecret: "Enter the setup secret again",
    retry: "Retry setup",
    invitationTitle: "Accept your owner invitation",
    invitationBody:
      "A membership invitation was sent to your email. Accept it, return here, enter the setup secret again, and continue the same operation.",
    doneTitle: "Your organization is ready",
    doneBody:
      "Sign in again to refresh your organization access and enter the workspace.",
    enterWorkspace: "Sign in to workspace",
    closedTitle: "Setup is already complete",
    closedBody: "Open your workspace with your organization account.",
    openWorkspace: "Open workspace",
    conflict:
      "Another setup claim or organization request already exists. Sign in with the original owner account.",
    invalid: "Check the information and try again.",
    unavailable:
      "Setup is unavailable. Check the local services or ask the installation operator.",
    sessionExpired: "Your session expired. Sign in again.",
    working: "Working…",
    stage: {
      core_organization: "Core organization",
      identity_organization: "Identity organization",
      owner_membership: "Owner membership",
      token_refresh: "Fresh sign-in",
    },
    stageStatus: {
      queued: "waiting",
      in_progress: "in progress",
      complete: "complete",
      needs_attention: "needs attention",
    },
  },
  el: {
    progressLabel: "Πρόοδος εγκατάστασης",
    railSteps: [
      "Ο λογαριασμός σου",
      "Πρόσβαση εγκατάστασης",
      "Οργανισμός",
      "Ενεργοποίηση workspace",
    ],
    stepStatus: {
      complete: "Ολοκληρώθηκε",
      current: "Τώρα",
      upcoming: "Ακολουθεί",
    },
    title: "Ρύθμισε το Bubllio workspace",
    intro: "Δημιούργησε τον πρώτο οργανισμό αυτής της εγκατάστασης.",
    loading: "Έλεγχος εγκατάστασης…",
    signOut: "Αποσύνδεση",
    unavailableTitle: "Δεν φορτώθηκε η εγκατάσταση",
    unavailableHelp:
      "Έλεγξε ότι λειτουργούν το τοπικό Core API και το Keycloak και δοκίμασε ξανά.",
    tryAgain: "Δοκίμασε ξανά",
    beginTitle: "Δημιούργησε τον λογαριασμό διαχειριστή",
    beginBody:
      "Ο IT admin δημιουργεί τον πρώτο επαληθευμένο λογαριασμό και ρυθμίζει τον πρώτο οργανισμό. Η πρόσβαση της ομάδας ακολουθεί μετά την εγκατάσταση.",
    createAccount: "Δημιουργία λογαριασμού",
    resumeTitle: "Συνέχισε την εγκατάσταση",
    resumeBody:
      "Η εγκατάσταση έχει ήδη δεσμευτεί. Συνέχισε με τον ίδιο επαληθευμένο λογαριασμό διαχειριστή που την ξεκίνησε.",
    resume: "Συνέχεια εγκατάστασης",
    takenTitle: "Η εγκατάσταση ανήκει σε άλλον διαχειριστή",
    takenBody:
      "Μόνο ο επαληθευμένος διαχειριστής που ξεκίνησε την εγκατάσταση μπορεί να συνεχίσει. Αποσυνδέσου και χρησιμοποίησε εκείνον τον λογαριασμό.",
    authorityTitle: "Επιβεβαίωσε την εγκατάσταση",
    authorityBody:
      "Βάλε το μοναδικό μυστικό εγκατάστασης που εμφανίστηκε στο terminal. Δεν είναι ο κωδικός του λογαριασμού σου.",
    secretLabel: "Μυστικό εγκατάστασης",
    continue: "Συνέχεια",
    organizationTitle: "Ονόμασε τον πρώτο οργανισμό",
    organizationBody:
      "Θα γίνεις ο πρώτος ιδιοκτήτης του. Μέλη και εφαρμογές θα προστεθούν αργότερα.",
    organizationLabel: "Όνομα οργανισμού",
    create: "Δημιουργία οργανισμού",
    progressTitle: "Δημιουργία οργανισμού",
    progressBody:
      "Ίσως χρειαστεί λίγο χρόνο. Μπορείς να επιστρέψεις με τον ίδιο λογαριασμό.",
    attentionTitle: "Η εγκατάσταση χρειάζεται έλεγχο",
    attentionBody:
      "Έλεγξε τις τοπικές υπηρεσίες και ξαναδοκίμασε την ίδια εργασία. Μην ξεκινήσεις άλλον οργανισμό.",
    reference: "Αναφορά",
    errorCode: "Κωδικός",
    unknown: "Άγνωστο",
    retrySecret: "Βάλε ξανά το μυστικό εγκατάστασης",
    retry: "Επανάληψη",
    invitationTitle: "Αποδέξου την πρόσκληση ιδιοκτήτη",
    invitationBody:
      "Στάλθηκε πρόσκληση στο email σου. Αποδέξου την, γύρνα εδώ, βάλε ξανά το μυστικό εγκατάστασης και συνέχισε την ίδια εργασία.",
    doneTitle: "Ο οργανισμός είναι έτοιμος",
    doneBody:
      "Συνδέσου ξανά για να ανανεωθεί η πρόσβασή σου και να μπεις στο workspace.",
    enterWorkspace: "Σύνδεση στο workspace",
    closedTitle: "Η εγκατάσταση ολοκληρώθηκε",
    closedBody: "Άνοιξε το workspace με τον λογαριασμό του οργανισμού σου.",
    openWorkspace: "Άνοιγμα workspace",
    conflict:
      "Υπάρχει ήδη αίτημα εγκατάστασης ή δημιουργίας οργανισμού. Συνδέσου με τον αρχικό λογαριασμό ιδιοκτήτη.",
    invalid: "Έλεγξε τα στοιχεία και δοκίμασε ξανά.",
    unavailable:
      "Η εγκατάσταση δεν είναι διαθέσιμη. Έλεγξε τις τοπικές υπηρεσίες ή μίλησε με τον χειριστή.",
    sessionExpired: "Η σύνδεσή σου έληξε. Συνδέσου ξανά.",
    working: "Γίνεται επεξεργασία…",
    stage: {
      core_organization: "Οργανισμός Core",
      identity_organization: "Οργανισμός Identity",
      owner_membership: "Ιδιοκτησία",
      token_refresh: "Νέα σύνδεση",
    },
    stageStatus: {
      queued: "σε αναμονή",
      in_progress: "σε εξέλιξη",
      complete: "ολοκληρώθηκε",
      needs_attention: "χρειάζεται έλεγχο",
    },
  },
} as const;
