// Accepted payment methods (client-safe, shared by checkout UI + reporting).
export const PAYMENT_METHODS = ["Card", "Cash", "Digital wallet", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(v: string): v is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v);
}
