import crypto from "crypto";
import type { Ticket, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── Yggdrasil Link v2 — bridge helpers (server-only) ──
// The Chair pairs with the Yggdrasil management plane over /api/yggdrasil/*.
// We store ONLY the sha256 hash of the pairing token (single yggdrasil_link
// row); every bridge call presents the plaintext token, which we hash and
// compare in constant time. See the Link v2 contract for the full protocol.

export const LINK_APP = "the-chair";
export const LINK_PRODUCT = "The Chair";
export const LINK_CAPABILITIES = ["issues", "users", "users.password"];

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Constant-time compare of two sha256 hex digests (always equal length).
function digestsMatch(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex);
  const b = Buffer.from(bHex);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The token presented on a bridge call: `Authorization: Bearer <token>` or `?token=`. */
export function presentedToken(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim() || null;
  try {
    return new URL(req.url).searchParams.get("token");
  } catch {
    return null;
  }
}

/** True when the request carries the paired token (or the optional env override). */
export async function verifyLink(req: Request): Promise<boolean> {
  const token = presentedToken(req);
  if (!token) return false;
  const presentedHash = sha256Hex(token);

  // Optional operator override — compared via hashes so timing stays constant.
  const override = process.env.YGGDRASIL_LINK_SECRET;
  if (override && digestsMatch(presentedHash, sha256Hex(override))) return true;

  const link = await prisma.yggdrasilLink.findUnique({ where: { id: 1 } });
  if (!link) return false;
  return digestsMatch(presentedHash, link.tokenHash);
}

/** Whether a pairing record exists (safe to expose — no secrets). */
export async function isPaired(): Promise<boolean> {
  return (await prisma.yggdrasilLink.count()) > 0;
}

// ── Ticket ⇄ contract issue mapping ──

export type NormalizedStatus = "open" | "in_progress" | "done";

export const NATIVE_TO_NORMALIZED: Record<TicketStatus, NormalizedStatus> = {
  NEW: "open",
  NEEDS_REVIEW: "open",
  APPROVED: "open",
  BACKLOG: "open",
  READY: "open",
  IN_PROGRESS: "in_progress",
  CODE_REVIEW: "in_progress",
  QA: "in_progress",
  READY_FOR_RELEASE: "in_progress",
  RELEASED: "done",
  CLOSED: "done",
  ARCHIVED: "done",
};

export const NORMALIZED_TO_NATIVE: Record<NormalizedStatus, TicketStatus> = {
  open: "NEW",
  in_progress: "IN_PROGRESS",
  done: "CLOSED",
};

// Native statuses a reporter considers finished (everything else = openIssues).
export const DONE_NATIVE_STATUSES: TicketStatus[] = ["RELEASED", "CLOSED", "ARCHIVED"];

export function isNormalizedStatus(value: unknown): value is NormalizedStatus {
  return value === "open" || value === "in_progress" || value === "done";
}

// Flatten the type-specific `details` JSON (steps, expected, actual, …) into
// readable "key: value" lines for the issue body.
function detailSummary(details: unknown): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  return Object.entries(details as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join("\n");
}

export type IssueAttachment = { id: string; name: string; mime: string; dataUrl: string };
export type TicketWithReporter = Ticket & {
  reporter: { name: string; email: string };
  // Present only when the caller `include`s the relation; base64 image data URLs.
  attachments?: IssueAttachment[];
};

/** Serialize a Ticket into the Link v2 contract issue shape. */
export function toIssue(t: TicketWithReporter) {
  const details = detailSummary(t.details);
  return {
    externalId: t.id,
    code: t.ref,
    title: t.title,
    body:
      t.description +
      (details ? "\n\n" + details : "") +
      (t.route ? "\nRoute: " + t.route : "") +
      (t.appVersion ? "\nApp v" + t.appVersion : ""),
    status: NATIVE_TO_NORMALIZED[t.status],
    nativeStatus: t.status,
    labels: [
      t.type.toLowerCase(),
      t.priority.toLowerCase(),
      ...(t.labels ?? []),
      ...(t.severity ? [t.severity.toLowerCase()] : []),
    ],
    reporter: { name: t.reporter.name, email: t.reporter.email },
    attachments: (t.attachments ?? []).map((a) => ({
      externalId: a.id,
      name: a.name,
      mime: a.mime,
      dataUrl: a.dataUrl,
    })),
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/feedback/${t.id}`,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// ── User → contract shape (NEVER include passwordHash / tokenHash) ──

export type BridgeUserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: Date;
};

export function toBridgeUser(u: BridgeUserRecord) {
  return {
    externalId: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.active ? "active" : "disabled",
    createdAt: u.createdAt.toISOString(),
  };
}
