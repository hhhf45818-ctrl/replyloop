// AES-256-GCM decrypt (Web Crypto) — decodes the "iv:tag:ciphertext"
// base64 format produced by lib/crypto.ts in the Next.js app.
// Requires the ENCRYPTION_KEY secret (64 hex chars).

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export async function decrypt(payload: string): Promise<string> {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be set to 64 hex chars (32 bytes).");
  }

  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload.");
  }

  const iv = b64ToBytes(ivB64);
  const tag = b64ToBytes(tagB64);
  const data = b64ToBytes(dataB64);

  // Web Crypto AES-GCM expects ciphertext || authTag.
  const combined = new Uint8Array(data.length + tag.length);
  combined.set(data, 0);
  combined.set(tag, data.length);

  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(keyHex),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined
  );

  return new TextDecoder().decode(plaintext);
}
