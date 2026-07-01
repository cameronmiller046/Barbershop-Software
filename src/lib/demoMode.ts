// Demo mode: the sample portal accounts (test1 = Manager, test2 = Barber) can
// browse everything but must NOT persist changes, so playing in the demo never
// affects the live/showcase site. Their writes are blocked server-side.
const DEMO_EMAILS = new Set(["test1", "test2"]);

export function isDemoAccount(email?: string | null): boolean {
  return !!email && DEMO_EMAILS.has(email.toLowerCase());
}
