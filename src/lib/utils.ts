export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function dayName(d: number) {
  return DAY_NAMES[d] ?? "";
}

export function minutesToLabel(min: number) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// minutes-from-midnight → "HH:MM" (24h), for <input type="time"> values
export function minutesToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

// "#C9A24B" -> "201 162 75", for use in `rgb(var(--brass) / <alpha-value>)`.
export function hexToRgbTriple(hex: string): string {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return "240 234 217"; // fallback ivory
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Serialize an object for embedding in a <script type="application/ld+json">.
 * JSON.stringify alone is NOT safe here: it leaves `<`, `>`, `&` and the U+2028/
 * U+2029 line separators intact, so tenant-controlled text (review bodies, shop
 * name, service names) containing `</script>` can break out of the tag and
 * execute — stored XSS. Escaping these to their \uXXXX forms keeps the JSON
 * valid while making script-context breakout impossible.
 */
export function jsonLdSafe(data: unknown): string {
  // Escape <, >, & and the U+2028/U+2029 line separators so tenant-controlled
  // text cannot break out of a <script type="application/ld+json"> block.
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) =>
    "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

/**
 * Validate an image URL submitted from the client before persisting it. Allows
 * http(s) URLs and reasonably-sized `data:image/*;base64` URLs; rejects anything
 * else (data:text/html, javascript:, oversized blobs) to prevent stored-XSS via
 * SVG/HTML data URLs and DB bloat from multi-MB payloads. Returns null when
 * empty or invalid.
 */
export function safeImageUrl(raw: unknown, maxBytes = 2_000_000): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s.slice(0, 2048);
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(s)) {
    return s.length > Math.ceil((maxBytes * 4) / 3) + 128 ? null : s; // base64 → bytes
  }
  return null;
}

/** Escape user-supplied text before interpolating it into HTML (e.g. emails). */
export function escapeHtml(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a tenant/user-supplied URL before using it as an <a href>. Blocks
 * `javascript:`, `data:`, `vbscript:` and other script-capable schemes (stored
 * XSS on the public shop site); allows http(s), protocol-relative, site-relative,
 * mailto/tel, and bare domains (which are upgraded to https). Returns undefined
 * for anything unsafe so the link can be dropped.
 */
export function safeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const t = url.trim();
  if (!t) return undefined;
  if (/^(https?:)?\/\//i.test(t)) return t;      // https://…, http://…, //…
  if (/^(mailto:|tel:)/i.test(t)) return t;       // contact links
  if (/^\/[^/]/.test(t)) return t;                // site-relative (not //)
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(t)) return `https://${t}`; // bare domain
  return undefined;                               // javascript:, data:, vbscript:, unknown
}

// Pick readable foreground (black/white) for a tenant's brand color.
export function readableOn(hex: string) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#0f0f10";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f0f10" : "#ffffff";
}
