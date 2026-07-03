import crypto from "crypto";
import { env } from "../config/env.js";

function keyFromEnv() {
  const raw = env.dataEncryptionKey;
  if (/^[A-Za-z0-9+/=]{43,44}$/.test(raw)) {
    const key = Buffer.from(raw, "base64");
    if (key.length === 32) return key;
  }
  if (/^[a-fA-F0-9]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

const algorithm = "aes-256-gcm";
const key = keyFromEnv();

export function encryptString(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptString(payload) {
  const [ivText, tagText, ciphertextText] = String(payload).split(":");
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
