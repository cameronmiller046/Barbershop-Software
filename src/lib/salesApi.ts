// Shared-secret auth for the SWSales-Page → main-app API. The sales app sends
// `x-sales-key: <SALES_API_KEY>`; both services hold the same secret.
export function verifySalesKey(req: Request): boolean {
  const key = process.env.SALES_API_KEY?.trim();
  if (!key) return false;
  const provided = req.headers.get("x-sales-key");
  return Boolean(provided) && provided === key;
}
