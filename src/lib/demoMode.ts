// Demo mode: the sample portal accounts (test1 = Manager, test2 = Barber) can
// browse everything but must NOT persist changes, so playing in the demo never
// affects the live/showcase site. Their writes are blocked server-side.
// The permanent flagship demo logins. Excluded from platform-wide metrics so
// the showcase accounts never skew real business numbers.
export const DEMO_ACCOUNT_EMAILS = ["test1", "test2"];
const DEMO_EMAILS = new Set(DEMO_ACCOUNT_EMAILS);

export function isDemoAccount(email?: string | null): boolean {
  return !!email && DEMO_EMAILS.has(email.toLowerCase());
}
