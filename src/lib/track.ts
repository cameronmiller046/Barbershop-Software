import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Cookieless, privacy-first page-view tracking (Plausible-style).
// We never store IPs. A visitor is identified by a hash salted with a secret
// AND the current day, so the id rotates every 24h and can't be linked across
// days — i.e. visitors are counted, individuals are not tracked.

const BOT = /bot|crawl|spider|slurp|crawler|preview|monitor|curl|wget|headless|lighthouse|pingdom|uptime|facebookexternalhit|whatsapp|telegram|embedly/i;

export function isBot(ua: string): boolean {
  return !ua || BOT.test(ua);
}

/** UTC day bucket, e.g. "2026-06-30". Rotating this salts the visitor hash. */
export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Anonymous, daily-rotating visitor id. IP + UA are hashed, never stored. */
export function visitorHash(ip: string, ua: string, tenantId: string | null): string {
  const salt = `${process.env.AUTH_SECRET || "dev-analytics-salt"}:${dayKey()}`;
  return crypto.createHash("sha256").update(`${salt}|${ip}|${ua}|${tenantId ?? ""}`).digest("hex").slice(0, 16);
}

export function deviceFromUA(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return "tablet";
  if (/Mobi|Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry/i.test(ua)) return "mobile";
  return "desktop";
}

/** Bucket a referrer URL into a coarse, non-identifying source label. */
export function sourceFromReferrer(ref: string, selfHost?: string): string {
  if (!ref) return "direct";
  let host = "";
  try { host = new URL(ref).hostname.replace(/^www\./, ""); } catch { return "direct"; }
  if (!host || (selfHost && host === selfHost)) return "direct";
  if (/google\./.test(host)) return "google";
  if (/instagram\./.test(host)) return "instagram";
  if (/(facebook|fb)\./.test(host)) return "facebook";
  if (/(twitter|t\.co|x\.com)/.test(host)) return "twitter";
  if (/tiktok\./.test(host)) return "tiktok";
  if (/youtube\./.test(host)) return "youtube";
  if (/yelp\./.test(host)) return "yelp";
  if (/(bing|duckduckgo|yahoo)\./.test(host)) return host.split(".")[0];
  return "referral";
}

/** Normalize a path into a coarse page type for grouping. */
export function pageType(path: string): string {
  if (/\/book\/?$/.test(path)) return "book";
  if (/\/services\/?$/.test(path)) return "services";
  if (/\/reviews\/?$/.test(path)) return "reviews";
  if (/\/contact\/?$/.test(path)) return "contact";
  if (/\/faq\/?$/.test(path)) return "faq";
  if (/\/appointments\//.test(path)) return "manage";
  if (/^\/t\/[^/]+\/?$/.test(path)) return "home";
  if (path === "/" || /^\/(features|pricing|about|beta)\/?$/.test(path)) return "marketing";
  return "other";
}

export async function recordPageView(opts: {
  tenantId: string | null;
  path: string;
  referrer: string;
  ua: string;
  ip: string;
  selfHost?: string;
  vid?: string; // persistent visitor id (consented); else cookieless daily hash
}): Promise<void> {
  await prisma.pageView.create({
    data: {
      tenantId: opts.tenantId,
      path: opts.path.slice(0, 200),
      page: pageType(opts.path),
      source: sourceFromReferrer(opts.referrer, opts.selfHost),
      device: deviceFromUA(opts.ua),
      visitorHash: opts.vid ? `c:${opts.vid}` : visitorHash(opts.ip, opts.ua, opts.tenantId),
    },
  });
}
