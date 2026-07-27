import type { Locale } from "@/store/slices/uiSlice";

export const landingCopy: Record<
  Locale,
  {
    nav: { features: string; about: string; login: string; getStarted: string; privacy: string; terms: string };
    activity: string[];
    hero: { eyebrow: string; headline: string; subhead: string; primaryCta: string; secondaryCta: string };
    reassurance: string;
    featuresHeading: { title: string; subtitle: string };
    features: { title: string; description: string }[];
    cta: { headline: string; subtext: string; button: string };
    footer: { rights: string };
  }
> = {
  en: {
    nav: { features: "Features", about: "About", login: "Log in", getStarted: "Get started", privacy: "Privacy", terms: "Terms" },
    activity: [
      "New account created",
      "Access granted to a teammate",
      "A suspicious login was blocked",
      "Password changed securely",
    ],
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
    footer: { rights: "All rights reserved." },
  },
  el: {
    nav: { features: "Δυνατότητες", about: "Σχετικά", login: "Σύνδεση", getStarted: "Ξεκινήστε", privacy: "Απόρρητο", terms: "Όροι" },
    activity: [
      "Δημιουργήθηκε νέος λογαριασμός",
      "Παραχωρήθηκε πρόσβαση σε συνεργάτη",
      "Μπλοκαρίστηκε ύποπτη σύνδεση",
      "Ο κωδικός πρόσβασης άλλαξε με ασφάλεια",
    ],
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
    footer: { rights: "Με επιφύλαξη παντός δικαιώματος." },
  },
};
