// ════════════════════════════════════════════════════════════════
// AES-256-GCM encryption for credentials stored at rest (server-only).
// Used by API routes to encrypt customer Freshdesk / Anthropic keys
// before writing them to the settings table.
//
// Requires ENCRYPTION_KEY = 64 hex chars (32 bytes).
// Generate with:  openssl rand -hex 32
// ════════════════════════════════════════════════════════════════

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to 64 hex chars (32 bytes). Run: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext string. Returns "iv:authTag:ciphertext" (all base64). */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Decrypt a value produced by encrypt(). */
export function decrypt(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload.");
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
