export type SetupLocale = "en" | "el";

export const setupCopy = {
  en: {
    progressLabel: "Setup progress",
    progressSteps: [
      "System check",
      "Email delivery",
      "Administrator",
      "Installation access",
      "Organization",
      "Activate workspace",
    ],
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    stepStatus: {
      complete: "Complete",
      current: "Current step",
    },
    title: "Set up your Bubllio workspace",
    intro: "Create the first organization for this installation.",
    loading: "Checking setup status…",
    preflightTitle: "Check that Bubllio is ready",
    preflightBody:
      "We will verify the essentials before you create the administrator account. Nothing is changed during this check.",
    preflightLoading: "Checking the installation…",
    preflightReady: "Everything is ready for setup.",
    preflightAttention:
      "One or more checks need attention. Ask the installation operator to review them, then run the check again.",
    preflightUnavailable:
      "The system check could not finish. Confirm that Bubllio is available, then try again.",
    preflightContinue: "Continue setup",
    preflightRetry: "Run check again",
    checkStatus: { ready: "Ready", attention: "Needs attention" },
    systemChecks: {
      database: "Workspace data",
      identity: "Account service",
      migrations: "System version",
      applications: "Application catalog",
    },
    emailTitle: "Set up email delivery",
    emailBody:
      "Bubllio uses email to verify accounts, send invitations, and recover access. Test delivery before creating the administrator.",
    emailLoading: "Checking email delivery…",
    emailSenderName: "Sender name",
    emailSenderEmail: "Sender email",
    emailReplyTo: "Reply-to email (optional)",
    emailHost: "SMTP host",
    emailPort: "Port",
    emailSecurity: "Connection security",
    emailSecurityStarttls: "STARTTLS (recommended)",
    emailSecurityTls: "TLS",
    emailSecurityNone: "None",
    emailInsecureWarning:
      "Unencrypted email delivery is only appropriate for an isolated local environment.",
    emailAuthentication: "The server requires authentication",
    emailUsername: "Username",
    emailPassword: "Password",
    emailTestRecipient: "Send the test to",
    emailSetupSecret: "One-time setup secret",
    emailAdvancedShow: "Show advanced settings",
    emailAdvancedHide: "Hide advanced settings",
    emailSendTest: "Send test email",
    emailSendingTest: "Sending a secure test…",
    emailTestSent: "Enter the confirmation code",
    emailTestSentBody:
      "A six-digit code was sent to {recipient}. Enter it below to prove that email delivery works.",
    emailRecipientHidden: "your test address",
    emailConfirmationCode: "Confirmation code",
    emailConfirm: "Confirm email delivery",
    emailConfirming: "Confirming…",
    emailSendAgain: "Send another test",
    emailConnectionFailed:
      "The email server could not be reached. Check its address, port, and firewall.",
    emailAuthenticationFailed:
      "The email server rejected the credentials. Enter the password again and retry.",
    emailTlsFailed:
      "A secure connection could not be established. Check the connection security setting.",
    emailSenderRejected: "The email server did not accept this sender address.",
    emailCodeInvalid:
      "That confirmation code is not valid or has expired. Send another test if needed.",
    emailIdentityActivationFailed:
      "Email was confirmed, but the account service could not activate it. Check the service and retry the same confirmation.",
    emailUnavailable:
      "Email delivery could not be configured. Check the settings and try again.",
    fieldRequired: (field: string) => `Enter ${field.toLowerCase()}.`,
    validEmail: "Enter a valid email address.",
    validPort: "Enter a port from 1 to 65,535.",
    validSetupSecret: "Enter the setup secret (at least 32 characters).",
    validConfirmationCode: "Enter the 6-digit confirmation code.",
    validOrganizationName: "Enter an organization name with 2–120 characters.",
    signOut: "Sign out",
    unavailableTitle: "Setup could not load",
    unavailableHelp: "Confirm that Bubllio is available, then try again.",
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
      "You will become its first owner. Member and application administration is not available in this technical alpha.",
    organizationLabel: "Organization name",
    create: "Create organization",
    progressTitle: "Creating your organization",
    progressBody:
      "This may take a moment. You can return to this page with the same account.",
    attentionTitle: "Setup needs attention",
    attentionBody:
      "Check that Bubllio services are healthy, then retry this same operation. Do not start another organization.",
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
    progressSteps: [
      "Έλεγχος συστήματος",
      "Αποστολή email",
      "Διαχειριστής",
      "Πρόσβαση εγκατάστασης",
      "Οργανισμός",
      "Ενεργοποίηση workspace",
    ],
    stepOf: (current: number, total: number) => `Βήμα ${current} από ${total}`,
    stepStatus: {
      complete: "Ολοκληρώθηκε",
      current: "Τώρα",
    },
    title: "Ρύθμισε το Bubllio workspace",
    intro: "Δημιούργησε τον πρώτο οργανισμό αυτής της εγκατάστασης.",
    loading: "Έλεγχος εγκατάστασης…",
    preflightTitle: "Έλεγξε ότι το Bubllio είναι έτοιμο",
    preflightBody:
      "Θα ελέγξουμε τα απαραίτητα πριν δημιουργήσεις τον λογαριασμό διαχειριστή. Δεν αλλάζει καμία ρύθμιση σε αυτό το βήμα.",
    preflightLoading: "Γίνεται έλεγχος της εγκατάστασης…",
    preflightReady: "Όλα είναι έτοιμα για τη ρύθμιση.",
    preflightAttention:
      "Ένας ή περισσότεροι έλεγχοι χρειάζονται προσοχή. Ζήτησε από τον χειριστή της εγκατάστασης να τους ελέγξει και δοκίμασε ξανά.",
    preflightUnavailable:
      "Ο έλεγχος συστήματος δεν ολοκληρώθηκε. Επιβεβαίωσε ότι το Bubllio είναι διαθέσιμο και δοκίμασε ξανά.",
    preflightContinue: "Συνέχεια ρύθμισης",
    preflightRetry: "Νέος έλεγχος",
    checkStatus: { ready: "Έτοιμο", attention: "Χρειάζεται προσοχή" },
    systemChecks: {
      database: "Δεδομένα workspace",
      identity: "Υπηρεσία λογαριασμών",
      migrations: "Έκδοση συστήματος",
      applications: "Κατάλογος εφαρμογών",
    },
    emailTitle: "Ρύθμισε την αποστολή email",
    emailBody:
      "Το Bubllio χρησιμοποιεί email για επαλήθευση λογαριασμών, προσκλήσεις και ανάκτηση πρόσβασης. Δοκίμασε την αποστολή πριν δημιουργήσεις τον διαχειριστή.",
    emailLoading: "Έλεγχος αποστολής email…",
    emailSenderName: "Όνομα αποστολέα",
    emailSenderEmail: "Email αποστολέα",
    emailReplyTo: "Email απάντησης (προαιρετικό)",
    emailHost: "SMTP host",
    emailPort: "Θύρα",
    emailSecurity: "Ασφάλεια σύνδεσης",
    emailSecurityStarttls: "STARTTLS (προτείνεται)",
    emailSecurityTls: "TLS",
    emailSecurityNone: "Χωρίς κρυπτογράφηση",
    emailInsecureWarning:
      "Η αποστολή χωρίς κρυπτογράφηση είναι κατάλληλη μόνο για απομονωμένο τοπικό περιβάλλον.",
    emailAuthentication: "Ο server απαιτεί ταυτοποίηση",
    emailUsername: "Όνομα χρήστη",
    emailPassword: "Κωδικός πρόσβασης",
    emailTestRecipient: "Αποστολή δοκιμής στο",
    emailSetupSecret: "Μυστικό εγκατάστασης",
    emailAdvancedShow: "Εμφάνιση προχωρημένων ρυθμίσεων",
    emailAdvancedHide: "Απόκρυψη προχωρημένων ρυθμίσεων",
    emailSendTest: "Αποστολή δοκιμαστικού email",
    emailSendingTest: "Στέλνεται ασφαλές δοκιμαστικό…",
    emailTestSent: "Βάλε τον κωδικό επιβεβαίωσης",
    emailTestSentBody:
      "Στάλθηκε εξαψήφιος κωδικός στο {recipient}. Βάλ' τον παρακάτω για να επιβεβαιώσεις ότι η αποστολή email λειτουργεί.",
    emailRecipientHidden: "τη διεύθυνση δοκιμής σου",
    emailConfirmationCode: "Κωδικός επιβεβαίωσης",
    emailConfirm: "Επιβεβαίωση αποστολής email",
    emailConfirming: "Γίνεται επιβεβαίωση…",
    emailSendAgain: "Νέα δοκιμή",
    emailConnectionFailed:
      "Δεν ήταν δυνατή η σύνδεση με τον email server. Έλεγξε τη διεύθυνση, τη θύρα και το firewall.",
    emailAuthenticationFailed:
      "Ο email server απέρριψε τα στοιχεία σύνδεσης. Βάλε ξανά τον κωδικό και δοκίμασε.",
    emailTlsFailed:
      "Δεν ήταν δυνατή η ασφαλής σύνδεση. Έλεγξε τη ρύθμιση ασφάλειας σύνδεσης.",
    emailSenderRejected:
      "Ο email server δεν αποδέχτηκε αυτή τη διεύθυνση αποστολέα.",
    emailCodeInvalid:
      "Ο κωδικός επιβεβαίωσης δεν είναι έγκυρος ή έχει λήξει. Στείλε νέα δοκιμή αν χρειάζεται.",
    emailIdentityActivationFailed:
      "Το email επιβεβαιώθηκε, αλλά η υπηρεσία λογαριασμών δεν μπόρεσε να το ενεργοποιήσει. Έλεγξε την υπηρεσία και επανάλαβε την ίδια επιβεβαίωση.",
    emailUnavailable:
      "Δεν ολοκληρώθηκε η ρύθμιση email. Έλεγξε τα στοιχεία και δοκίμασε ξανά.",
    fieldRequired: (field: string) =>
      `Συμπλήρωσε το πεδίο «${field.toLocaleLowerCase("el-GR")}».`,
    validEmail: "Βάλε έγκυρη διεύθυνση email.",
    validPort: "Βάλε θύρα από 1 έως 65.535.",
    validSetupSecret:
      "Βάλε το μυστικό εγκατάστασης (τουλάχιστον 32 χαρακτήρες).",
    validConfirmationCode: "Βάλε τον εξαψήφιο κωδικό επιβεβαίωσης.",
    validOrganizationName: "Βάλε όνομα οργανισμού από 2 έως 120 χαρακτήρες.",
    signOut: "Αποσύνδεση",
    unavailableTitle: "Δεν φορτώθηκε η εγκατάσταση",
    unavailableHelp:
      "Επιβεβαίωσε ότι το Bubllio είναι διαθέσιμο και δοκίμασε ξανά.",
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
      "Θα γίνεις ο πρώτος ιδιοκτήτης του. Η διαχείριση μελών και εφαρμογών δεν είναι ακόμη διαθέσιμη σε αυτή την τεχνική alpha έκδοση.",
    organizationLabel: "Όνομα οργανισμού",
    create: "Δημιουργία οργανισμού",
    progressTitle: "Δημιουργία οργανισμού",
    progressBody:
      "Ίσως χρειαστεί λίγο χρόνο. Μπορείς να επιστρέψεις με τον ίδιο λογαριασμό.",
    attentionTitle: "Η εγκατάσταση χρειάζεται έλεγχο",
    attentionBody:
      "Έλεγξε ότι οι υπηρεσίες Bubllio λειτουργούν και ξαναδοκίμασε την ίδια εργασία. Μην ξεκινήσεις άλλον οργανισμό.",
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
