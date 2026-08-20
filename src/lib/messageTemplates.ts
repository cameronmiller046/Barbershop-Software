/**
 * Shop message templates — the reusable SMS/email copy a barber picks from when
 * messaging a client, plus the {{variable}} renderer shared by the composer
 * preview (client) and the send path (server).
 *
 * Rendering is deliberately dumb: a literal {{key}} swap with no expressions or
 * nesting, so a shop owner can safely edit template bodies without being able
 * to inject logic. Unknown placeholders are left untouched rather than blanked,
 * which makes a typo visible in the preview instead of silently vanishing.
 */

export type Channel = "SMS" | "EMAIL";

export const TEMPLATE_CATEGORIES = ["Follow-up", "Feedback", "Reminder", "Win-back", "Promotion", "General"] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/** Placeholders offered in the composer's "insert variable" menu. */
export const TEMPLATE_VARIABLES: { key: string; label: string; sample: string }[] = [
  { key: "client_name", label: "Client first name", sample: "Jordan" },
  { key: "shop_name", label: "Shop name", sample: "The Chair" },
  { key: "barber_name", label: "Barber name", sample: "Andre" },
  { key: "last_service", label: "Last service", sample: "Skin Fade" },
  { key: "last_visit", label: "Last visit date", sample: "Aug 20" },
  { key: "next_visit", label: "Next appointment", sample: "Tue, Sep 2 at 10:00 AM" },
  { key: "booking_link", label: "Booking link", sample: "https://thechair.app/t/demo/book" },
  { key: "shop_phone", label: "Shop phone", sample: "(555) 300-1000" },
];

export type TemplateVars = Record<string, string | null | undefined>;

/** Replace {{key}} with vars[key]. Unknown or empty keys are left as-is. */
export function renderTemplate(text: string, vars: TemplateVars): string {
  return (text || "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (whole, key: string) => {
    const v = vars[key.toLowerCase()];
    return v == null || v === "" ? whole : String(v);
  });
}

/** Placeholders in `text` that `vars` can't fill — surfaced as a composer warning. */
export function unresolvedVariables(text: string, vars: TemplateVars): string[] {
  const out = new Set<string>();
  for (const m of (text || "").matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    const key = m[1].toLowerCase();
    const v = vars[key];
    if (v == null || v === "") out.add(key);
  }
  return [...out];
}

// SMS billing is per 160-char GSM segment (70 if any non-GSM char forces UCS-2).
// Showing the segment count keeps a shop from unknowingly sending a 4-part text.
const GSM = /^[A-Za-z0-9@£$¥èéùìòÇØøÅåÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\r\n^{}\\[~\]|€]*$/;
export function smsSegments(body: string): { chars: number; segments: number; unicode: boolean } {
  const chars = body.length;
  const unicode = !GSM.test(body);
  const per = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153; // concatenated parts lose 7 chars to the UDH
  const segments = chars === 0 ? 0 : chars <= per ? 1 : Math.ceil(chars / multi);
  return { chars, segments, unicode };
}

/** Every SMS must carry an opt-out (TCPA). Appended at send time when missing. */
export const SMS_OPT_OUT_SUFFIX = " Reply STOP to opt out.";
export function withOptOut(body: string): string {
  return /\bstop\b/i.test(body) ? body : body.trimEnd() + SMS_OPT_OUT_SUFFIX;
}

export type SeedTemplate = {
  seedKey: string; name: string; channel: Channel; category: TemplateCategory;
  subject?: string; body: string;
};

/**
 * The starter set every shop gets. seedKey is the idempotency handle — adding a
 * new entry here backfills it for existing shops on their next visit to the
 * templates page; editing copy here never overwrites a shop's own version.
 */
export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    seedKey: "followup_thanks_sms", name: "Thanks for coming in", channel: "SMS", category: "Follow-up",
    body: "Hey {{client_name}}, thanks for stopping by {{shop_name}} today! Hope you're happy with the {{last_service}}. Book your next one anytime: {{booking_link}}",
  },
  {
    seedKey: "followup_thanks_email", name: "Thanks for coming in", channel: "EMAIL", category: "Follow-up",
    subject: "Thanks for visiting {{shop_name}}, {{client_name}}",
    body: "Hi {{client_name}},\n\nThanks for coming in today — it was great to see you. {{barber_name}} hopes you're loving the {{last_service}}.\n\nWhen you're ready for the next one, you can book in a few taps:\n{{booking_link}}\n\nSee you soon,\n{{shop_name}}",
  },
  {
    seedKey: "feedback_review_sms", name: "Ask for a review", channel: "SMS", category: "Feedback",
    body: "Hi {{client_name}} — {{barber_name}} here at {{shop_name}}. If you enjoyed your visit, would you mind leaving us a quick review? It really helps: {{booking_link}}",
  },
  {
    seedKey: "feedback_how_did_we_do_email", name: "How did we do?", channel: "EMAIL", category: "Feedback",
    subject: "How did we do, {{client_name}}?",
    body: "Hi {{client_name}},\n\nWe'd love to hear how your last visit went. Just reply to this email and let us know — good or bad, it all helps us get better.\n\nIf you have a minute to leave a public review, that means the world to a small shop.\n\nThanks,\n{{shop_name}}",
  },
  {
    seedKey: "reminder_upcoming_sms", name: "Appointment reminder", channel: "SMS", category: "Reminder",
    body: "Reminder: {{client_name}}, you're booked at {{shop_name}} on {{next_visit}} with {{barber_name}}. Need to change it? Call {{shop_phone}}.",
  },
  {
    seedKey: "reminder_due_for_cut_sms", name: "Due for a cut", channel: "SMS", category: "Reminder",
    body: "Hey {{client_name}}, it's been a few weeks since your {{last_service}}. Want to get back in the chair? Book here: {{booking_link}}",
  },
  {
    seedKey: "winback_miss_you_sms", name: "We miss you", channel: "SMS", category: "Win-back",
    body: "{{client_name}}, we haven't seen you at {{shop_name}} since {{last_visit}}. Come back in and we'll take good care of you: {{booking_link}}",
  },
  {
    seedKey: "winback_miss_you_email", name: "We miss you", channel: "EMAIL", category: "Win-back",
    subject: "It's been a while, {{client_name}}",
    body: "Hi {{client_name}},\n\nYour chair's been empty since {{last_visit}} and we'd love to get you back in.\n\n{{barber_name}} still has your notes on file, so you'll get the same cut you like without having to explain it again.\n\nBook whenever suits you: {{booking_link}}\n\n{{shop_name}}",
  },
  {
    seedKey: "promo_slot_open_sms", name: "Open slot today", channel: "SMS", category: "Promotion",
    body: "{{client_name}} — we just had a cancellation open up at {{shop_name}} today. Want it? Reply or book: {{booking_link}}",
  },
  {
    seedKey: "general_quick_note_sms", name: "Quick note", channel: "SMS", category: "General",
    body: "Hi {{client_name}}, {{barber_name}} from {{shop_name}} here. ",
  },
];
