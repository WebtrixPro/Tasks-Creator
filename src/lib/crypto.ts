import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGO = "aes-256-gcm";

// Development fallback key derived from a fixed seed - ONLY for local development
// In production, TOKEN_ENCRYPTION_KEY must be set as an environment variable
const DEV_FALLBACK_SEED = "tasks-creator-dev-only-key-do-not-use-in-production";

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  
  if (hex) {
    if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error("TOKEN_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes).");
    }
    return Buffer.from(hex, "hex");
  }
  
  // Use deterministic fallback key for development
  if (process.env.NODE_ENV !== "production") {
    console.warn("[crypto] TOKEN_ENCRYPTION_KEY not set - using development fallback. Set this in production!");
    return createHash("sha256").update(DEV_FALLBACK_SEED).digest();
  }
  
  throw new Error("TOKEN_ENCRYPTION_KEY must be set in production (64 hexadecimal characters).");
}

/** Returns base64: iv(12) + tag(16) + ciphertext */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
