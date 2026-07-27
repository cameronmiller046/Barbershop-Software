import { createHash, timingSafeEqual } from "node:crypto";

// Shared-secret auth for the SWSales-Page → main-app API. The sales app sends
// `x-sales-key: <SALES_API_KEY>`; both services hold the same secret. Compared
// in constant time (over sha256 digests) so it isn't a timing side-channel.
export function verifySalesKey(req: Request): boolean {
  const key = process.env.SALES_API_KEY?.trim();
  if (!key) return false;
  const provided = req.headers.get("x-sales-key");
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(key).digest();
  return timingSafeEqual(a, b);
}
