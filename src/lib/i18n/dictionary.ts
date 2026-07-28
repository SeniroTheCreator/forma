import type { Locale } from "@/store/slices/uiSlice";

interface LegalSection {
  heading: string;
  body: string;
}

export interface Dictionary {
  nav: { features: string; about: string; login: string; getStarted: string; privacy: string; terms: string };
  landing: {
    hero: { eyebrow: string; headline: string; subhead: string; primaryCta: string; secondaryCta: string };
    reassurance: string;
    featuresHeading: { title: string; subtitle: string };
    features: { title: string; description: string }[];
    cta: { headline: string; subtext: string; button: string };
  };
  auth: {
    backToHome: string;
    backToLogin: string;
    signup: {
      title: string;
      firstName: string;
      firstNamePlaceholder: string;
      lastName: string;
      lastNamePlaceholder: string;
      email: string;
      emailPlaceholder: string;
      password: string;
      passwordPlaceholder: string;
      confirmPassword: string;
      confirmPasswordPlaceholder: string;
      submit: string;
      submitting: string;
      checkEmail: string;
    };
    login: {
      title: string;
      email: string;
      emailPlaceholder: string;
      password: string;
      passwordPlaceholder: string;
      submit: string;
      submitting: string;
      suspended: string;
    };
    forgotPassword: {
      title: string;
      email: string;
      emailPlaceholder: string;
      submit: string;
      submitting: string;
      checkEmail: string;
    };
    resetPassword: {
      title: string;
      newPassword: string;
      passwordPlaceholder: string;
      confirmPassword: string;
      confirmPasswordPlaceholder: string;
      submit: string;
      submitting: string;
    };
    changePassword: {
      currentPassword: string;
      currentPasswordPlaceholder: string;
      newPassword: string;
      passwordPlaceholder: string;
      submit: string;
      submitting: string;
      successToast: string;
    };
    verifyEmail: {
      title: string;
      sentTo: string;
      yourEmailAddress: string;
      clickLink: string;
      resend: string;
      resendSent: string;
      resendIn: string;
    };
    passwordStrength: { weak: string; good: string; strong: string; suffix: string };
  };
  legal: {
    about: { title: string; paragraphs: string[] };
    privacy: { title: string; draftNotice: { label: string; body: string }; sections: LegalSection[] };
    terms: { title: string; draftNotice: { label: string; body: string }; sections: LegalSection[] };
  };
  footer: { rights: string };
}

export const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: { features: "Features", about: "About", login: "Log in", getStarted: "Get started", privacy: "Privacy", terms: "Terms" },
    landing: {
      hero: {
        eyebrow: "A foundation for what you build next",
        headline: "Every action, checked. Every change, on record.",
        subhead:
          "Sign-in, permissions, and an admin panel that just works — so you can spend your time on the product, not the plumbing underneath it.",
        primaryCta: "Create an account",
        secondaryCta: "Log in",
      },
      reassurance: "Built once, built right — so you don't have to think about it again.",
      featuresHeading: {
        title: "Everything a new product needs on day one",
        subtitle: "The pieces every application needs, already in place, so you can spend your time on what makes yours different.",
      },
      features: [
        { title: "Sign in, securely", description: "Sign up, log in, verify your email, reset a forgotten password — all handled." },
        { title: "Roles that mean something", description: "Give people exactly the access they need — nothing they don't." },
        { title: "An admin panel, ready-made", description: "Search your users, change a role, pause an account — no extra build." },
        { title: "Files, handled", description: "Profile photos and uploads, stored safely and only visible to the right person." },
        { title: "Notifications built in", description: "A place for people to see what changed, without you building one." },
        { title: "A full record, always", description: "Every admin change is logged — who did what, and when." },
      ],
      cta: {
        headline: "Start building on solid ground.",
        subtext: "Free to start. No credit card.",
        button: "Create your account",
      },
    },
    auth: {
      backToHome: "Back to home",
      backToLogin: "Back to log in",
      signup: {
        title: "Create an account",
        firstName: "First name",
        firstNamePlaceholder: "e.g. John",
        lastName: "Last name",
        lastNamePlaceholder: "e.g. Smith",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Password",
        passwordPlaceholder: "At least 8 characters",
        confirmPassword: "Confirm password",
        confirmPasswordPlaceholder: "Type your password again",
        submit: "Sign up",
        submitting: "Creating account...",
        checkEmail: "Check your email to verify your account.",
      },
      login: {
        title: "Log in",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Password",
        passwordPlaceholder: "Your password",
        submit: "Log in",
        submitting: "Logging in...",
        suspended: "Your account has been suspended. Contact support if you believe this is a mistake.",
      },
      forgotPassword: {
        title: "Forgot password",
        email: "Email",
        emailPlaceholder: "you@example.com",
        submit: "Send reset link",
        submitting: "Sending...",
        checkEmail: "Check your email for a link to reset your password.",
      },
      resetPassword: {
        title: "Reset password",
        newPassword: "New password",
        passwordPlaceholder: "At least 8 characters",
        confirmPassword: "Confirm password",
        confirmPasswordPlaceholder: "Type your password again",
        submit: "Reset password",
        submitting: "Resetting...",
      },
      changePassword: {
        currentPassword: "Current password",
        currentPasswordPlaceholder: "Your current password",
        newPassword: "New password",
        passwordPlaceholder: "At least 8 characters",
        submit: "Change password",
        submitting: "Changing...",
        successToast: "Password changed successfully",
      },
      verifyEmail: {
        title: "Verify your email",
        sentTo: "We sent a verification link to",
        yourEmailAddress: "your email address",
        clickLink: "Click the link to activate your account.",
        resend: "Resend verification email",
        resendSent: "Verification email sent",
        resendIn: "Resend available in",
      },
      passwordStrength: { weak: "Weak", good: "Good", strong: "Strong", suffix: "password" },
    },
    legal: {
      about: {
        title: "About Forma",
        paragraphs: [
          "Forma is a foundation for building web products — the account, permissions, and admin plumbing that nearly every application needs, already built, tested, and running.",
          "Instead of starting from a blank page every time, Forma gives you a working sign-in flow, role-based access control, an admin panel, file storage, and notifications from day one — so the work you do goes into the parts of the product that are actually yours.",
          "Every permission check is enforced twice: once in the application, and once again at the database level, so a mistake in one place doesn't become a security hole.",
        ],
      },
      privacy: {
        title: "Privacy Policy",
        draftNotice: {
          label: "Draft, not legal advice.",
          body: "This is placeholder text describing what a privacy policy typically covers. It has not been reviewed by a lawyer and should not be relied on before this product handles real user data.",
        },
        sections: [
          {
            heading: "Information we collect",
            body: "When you create an account, we collect your name, email address, and password (stored as a secure hash, never in plain text). If you upload a profile photo, we store that file and a record of who uploaded it.",
          },
          {
            heading: "How we use it",
            body: "We use your information to operate your account: to sign you in, to show you your own data, and to send you account-related email such as verification and password-reset messages. We do not sell your information to third parties.",
          },
          {
            heading: "Cookies",
            body: "We use a small number of cookies required to keep you signed in. We do not use advertising or cross-site tracking cookies.",
          },
          {
            heading: "Data retention",
            body: "We keep your account information for as long as your account is active. You can request deletion of your account and associated data at any time.",
          },
          { heading: "Contact", body: "Questions about this policy can be sent to the site administrator." },
        ],
      },
      terms: {
        title: "Terms of Service",
        draftNotice: {
          label: "Draft, not legal advice.",
          body: "This is placeholder text describing what terms of service typically cover. It has not been reviewed by a lawyer and should not be relied on before this product handles real users at scale.",
        },
        sections: [
          {
            heading: "Accepting these terms",
            body: "By creating an account, you agree to use this service in accordance with these terms.",
          },
          {
            heading: "Your account",
            body: "You're responsible for keeping your password secure and for activity that happens under your account. Tell us if you believe your account has been accessed without your permission.",
          },
          {
            heading: "Acceptable use",
            body: "Don't use this service to break the law, to interfere with other users, or to attempt to access data or accounts that aren't yours.",
          },
          {
            heading: "Suspension & termination",
            body: "We may suspend or close an account that violates these terms. You can close your own account at any time.",
          },
          {
            heading: "Changes to these terms",
            body: "We may update these terms from time to time. Continued use of the service after a change means you accept the updated terms.",
          },
        ],
      },
    },
    footer: { rights: "All rights reserved." },
  },
  el: {
    nav: { features: "Δυνατότητες", about: "Σχετικά", login: "Σύνδεση", getStarted: "Ξεκινήστε", privacy: "Απόρρητο", terms: "Όροι" },
    landing: {
      hero: {
        eyebrow: "Μια βάση για ό,τι χτίσετε στη συνέχεια",
        headline: "Κάθε ενέργεια, ελεγμένη. Κάθε αλλαγή, καταγεγραμμένη.",
        subhead:
          "Σύνδεση, δικαιώματα πρόσβασης και ένα πάνελ διαχείρισης που απλά δουλεύει — ώστε να αφιερώνετε τον χρόνο σας στο προϊόν, όχι στα θεμέλιά του.",
        primaryCta: "Δημιουργία λογαριασμού",
        secondaryCta: "Σύνδεση",
      },
      reassurance: "Χτισμένο μια φορά, χτισμένο σωστά — για να μην το ξανασκεφτείτε ποτέ.",
      featuresHeading: {
        title: "Ό,τι χρειάζεται ένα νέο προϊόν από την πρώτη μέρα",
        subtitle: "Όσα χρειάζεται κάθε εφαρμογή, έτοιμα εξ αρχής, ώστε να αφιερώνετε τον χρόνο σας σε ό,τι κάνει τη δική σας ξεχωριστή.",
      },
      features: [
        { title: "Ασφαλής σύνδεση", description: "Εγγραφή, σύνδεση, επιβεβαίωση email, επαναφορά κωδικού — όλα έτοιμα." },
        { title: "Ρόλοι με νόημα", description: "Δώστε στον καθένα ακριβώς την πρόσβαση που χρειάζεται — τίποτα παραπάνω." },
        { title: "Έτοιμο πάνελ διαχείρισης", description: "Αναζητήστε χρήστες, αλλάξτε ρόλο, αναστείλτε λογαριασμό — χωρίς επιπλέον ανάπτυξη." },
        { title: "Αρχεία, καλυμμένα", description: "Φωτογραφίες προφίλ και μεταφορτώσεις, αποθηκευμένα με ασφάλεια και ορατά μόνο στον σωστό χρήστη." },
        { title: "Ενσωματωμένες ειδοποιήσεις", description: "Ένα σημείο για να βλέπουν οι χρήστες τι άλλαξε, χωρίς να το χτίσετε εσείς." },
        { title: "Πλήρες ιστορικό, πάντα", description: "Κάθε ενέργεια διαχειριστή καταγράφεται — ποιος, τι και πότε." },
      ],
      cta: {
        headline: "Ξεκινήστε να χτίζετε σε στέρεο έδαφος.",
        subtext: "Δωρεάν για να ξεκινήσετε. Χωρίς πιστωτική κάρτα.",
        button: "Δημιουργήστε τον λογαριασμό σας",
      },
    },
    auth: {
      backToHome: "Πίσω στην αρχική",
      backToLogin: "Πίσω στη σύνδεση",
      signup: {
        title: "Δημιουργία λογαριασμού",
        firstName: "Όνομα",
        firstNamePlaceholder: "π.χ. Γιάννης",
        lastName: "Επώνυμο",
        lastNamePlaceholder: "π.χ. Παπαδόπουλος",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Κωδικός πρόσβασης",
        passwordPlaceholder: "Τουλάχιστον 8 χαρακτήρες",
        confirmPassword: "Επιβεβαίωση κωδικού",
        confirmPasswordPlaceholder: "Πληκτρολογήστε ξανά τον κωδικό σας",
        submit: "Εγγραφή",
        submitting: "Δημιουργία λογαριασμού...",
        checkEmail: "Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό σας.",
      },
      login: {
        title: "Σύνδεση",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Κωδικός πρόσβασης",
        passwordPlaceholder: "Ο κωδικός σας",
        submit: "Σύνδεση",
        submitting: "Σύνδεση...",
        suspended: "Ο λογαριασμός σας έχει ανασταλεί. Επικοινωνήστε με την υποστήριξη αν πιστεύετε πως πρόκειται για λάθος.",
      },
      forgotPassword: {
        title: "Ξεχάσατε τον κωδικό σας",
        email: "Email",
        emailPlaceholder: "you@example.com",
        submit: "Αποστολή συνδέσμου επαναφοράς",
        submitting: "Αποστολή...",
        checkEmail: "Ελέγξτε το email σας για έναν σύνδεσμο επαναφοράς του κωδικού σας.",
      },
      resetPassword: {
        title: "Επαναφορά κωδικού",
        newPassword: "Νέος κωδικός",
        passwordPlaceholder: "Τουλάχιστον 8 χαρακτήρες",
        confirmPassword: "Επιβεβαίωση κωδικού",
        confirmPasswordPlaceholder: "Πληκτρολογήστε ξανά τον κωδικό σας",
        submit: "Επαναφορά κωδικού",
        submitting: "Γίνεται επαναφορά...",
      },
      changePassword: {
        currentPassword: "Τρέχων κωδικός",
        currentPasswordPlaceholder: "Ο τρέχων κωδικός σας",
        newPassword: "Νέος κωδικός",
        passwordPlaceholder: "Τουλάχιστον 8 χαρακτήρες",
        submit: "Αλλαγή κωδικού",
        submitting: "Αλλαγή...",
        successToast: "Ο κωδικός άλλαξε με επιτυχία",
      },
      verifyEmail: {
        title: "Επιβεβαιώστε το email σας",
        sentTo: "Στείλαμε έναν σύνδεσμο επιβεβαίωσης στο",
        yourEmailAddress: "τη διεύθυνση email σας",
        clickLink: "Πατήστε τον σύνδεσμο για να ενεργοποιήσετε τον λογαριασμό σας.",
        resend: "Επαναποστολή email επιβεβαίωσης",
        resendSent: "Το email επιβεβαίωσης στάλθηκε",
        resendIn: "Επαναποστολή διαθέσιμη σε",
      },
      passwordStrength: { weak: "Αδύναμος", good: "Καλός", strong: "Ισχυρός", suffix: "κωδικός" },
    },
    legal: {
      about: {
        title: "Σχετικά με το Forma",
        paragraphs: [
          "Το Forma είναι μια βάση για την ανάπτυξη web προϊόντων — ο λογαριασμός, τα δικαιώματα πρόσβασης και η υποδομή διαχείρισης που χρειάζεται σχεδόν κάθε εφαρμογή, ήδη χτισμένη, ελεγμένη και σε λειτουργία.",
          "Αντί να ξεκινάτε από το μηδέν κάθε φορά, το Forma σας δίνει από την πρώτη μέρα μια λειτουργική ροή σύνδεσης, έλεγχο πρόσβασης βάσει ρόλων, ένα πάνελ διαχείρισης, αποθήκευση αρχείων και ειδοποιήσεις — ώστε ο χρόνος σας να πηγαίνει σε ό,τι κάνει πραγματικά το προϊόν σας ξεχωριστό.",
          "Κάθε έλεγχος δικαιωμάτων επιβάλλεται δύο φορές: μία στην εφαρμογή και ξανά στο επίπεδο της βάσης δεδομένων, ώστε ένα λάθος σε ένα σημείο να μη μετατρέπεται σε τρύπα ασφαλείας.",
        ],
      },
      privacy: {
        title: "Πολιτική Απορρήτου",
        draftNotice: {
          label: "Πρόχειρο κείμενο, όχι νομική συμβουλή.",
          body: "Αυτό είναι ενδεικτικό κείμενο που περιγράφει τι συνήθως καλύπτει μια πολιτική απορρήτου. Δεν έχει ελεγχθεί από δικηγόρο και δεν πρέπει να χρησιμοποιηθεί πριν αυτό το προϊόν διαχειριστεί πραγματικά δεδομένα χρηστών.",
        },
        sections: [
          {
            heading: "Πληροφορίες που συλλέγουμε",
            body: "Όταν δημιουργείτε λογαριασμό, συλλέγουμε το όνομά σας, τη διεύθυνση email και τον κωδικό πρόσβασης (αποθηκευμένο ως ασφαλές hash, ποτέ σε απλό κείμενο). Αν ανεβάσετε φωτογραφία προφίλ, αποθηκεύουμε το αρχείο και μια καταγραφή του ποιος το ανέβασε.",
          },
          {
            heading: "Πώς τις χρησιμοποιούμε",
            body: "Χρησιμοποιούμε τις πληροφορίες σας για τη λειτουργία του λογαριασμού σας: για να σας συνδέουμε, να σας δείχνουμε τα δικά σας δεδομένα και να σας στέλνουμε email σχετικά με τον λογαριασμό, όπως επιβεβαίωση και επαναφορά κωδικού. Δεν πουλάμε τις πληροφορίες σας σε τρίτους.",
          },
          {
            heading: "Cookies",
            body: "Χρησιμοποιούμε έναν μικρό αριθμό cookies απαραίτητων για να παραμένετε συνδεδεμένοι. Δεν χρησιμοποιούμε διαφημιστικά cookies ή cookies παρακολούθησης μεταξύ ιστότοπων.",
          },
          {
            heading: "Διατήρηση δεδομένων",
            body: "Διατηρούμε τα στοιχεία του λογαριασμού σας για όσο διάστημα ο λογαριασμός σας είναι ενεργός. Μπορείτε να ζητήσετε διαγραφή του λογαριασμού σας και των σχετικών δεδομένων ανά πάσα στιγμή.",
          },
          { heading: "Επικοινωνία", body: "Ερωτήσεις σχετικά με αυτή την πολιτική μπορούν να σταλούν στον διαχειριστή του ιστότοπου." },
        ],
      },
      terms: {
        title: "Όροι Χρήσης",
        draftNotice: {
          label: "Πρόχειρο κείμενο, όχι νομική συμβουλή.",
          body: "Αυτό είναι ενδεικτικό κείμενο που περιγράφει τι συνήθως καλύπτουν οι όροι χρήσης. Δεν έχει ελεγχθεί από δικηγόρο και δεν πρέπει να χρησιμοποιηθεί πριν αυτό το προϊόν εξυπηρετεί πραγματικούς χρήστες σε κλίμακα.",
        },
        sections: [
          {
            heading: "Αποδοχή αυτών των όρων",
            body: "Δημιουργώντας λογαριασμό, συμφωνείτε να χρησιμοποιείτε αυτή την υπηρεσία σύμφωνα με αυτούς τους όρους.",
          },
          {
            heading: "Ο λογαριασμός σας",
            body: "Είστε υπεύθυνοι για τη διατήρηση του κωδικού σας ασφαλή και για τη δραστηριότητα που πραγματοποιείται μέσω του λογαριασμού σας. Ενημερώστε μας αν πιστεύετε ότι κάποιος απέκτησε πρόσβαση στον λογαριασμό σας χωρίς την άδειά σας.",
          },
          {
            heading: "Αποδεκτή χρήση",
            body: "Μη χρησιμοποιείτε αυτή την υπηρεσία για να παραβιάσετε τον νόμο, να παρέμβετε σε άλλους χρήστες ή να αποκτήσετε πρόσβαση σε δεδομένα ή λογαριασμούς που δεν σας ανήκουν.",
          },
          {
            heading: "Αναστολή & τερματισμός",
            body: "Μπορούμε να αναστείλουμε ή να κλείσουμε έναν λογαριασμό που παραβιάζει αυτούς τους όρους. Μπορείτε να κλείσετε τον δικό σας λογαριασμό ανά πάσα στιγμή.",
          },
          {
            heading: "Αλλαγές σε αυτούς τους όρους",
            body: "Ενδέχεται να ενημερώνουμε αυτούς τους όρους κατά καιρούς. Η συνέχιση της χρήσης της υπηρεσίας μετά από μια αλλαγή σημαίνει ότι αποδέχεστε τους ενημερωμένους όρους.",
          },
        ],
      },
    },
    footer: { rights: "Με επιφύλαξη παντός δικαιώματος." },
  },
};
