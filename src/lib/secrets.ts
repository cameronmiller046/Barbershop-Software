import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// At-rest encryption for tenant-provided secrets (Twilio auth token, SendGrid
// API key). AES-256-GCM with a key derived from ENCRYPTION_KEY.
//
// Fully back-compatible and fail-safe:
//  - No ENCRYPTION_KEY set  → encrypt is a no-op (stores plaintext, as before).
//  - Value not "enc:v1:"    → treated as legacy plaintext and passed through.
//  - Undecryptable value    → returned as-is rather than throwing.
// So a DB leak with the key configured exposes ciphertext, not live credentials,
// and nothing breaks whether or not the key is present.

const PREFIX = "enc:v1:";

const KEY: Buffer | null = (() => {
  const raw = process.env.ENCRYPTION_KEY;
  return raw ? createHash("sha256").update(raw).digest() : null; // 32 bytes from any-length key
})();

/** Whether at-rest encryption is active (an ENCRYPTION_KEY is configured). */
export function secretsEncryptionEnabled(): boolean {
  return KEY !== null;
}

export function encryptSecret(plain: string | null | undefined): string | null | undefined {
  if (plain == null || plain === "" || !KEY || plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

export function decryptSecret(value: string | null | undefined): string | null | undefined {
  if (value == null || !value.startsWith(PREFIX) || !KEY) return value;
  try {
    const [ivB, tagB, ctB] = value.slice(PREFIX.length).split(":");
    const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return value;
  }
}
