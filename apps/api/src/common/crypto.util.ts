import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFrom(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase, "utf8").digest();
}

export function encryptSecret(plaintext: string, passphrase: string): string {
  if (!passphrase) throw new Error("Kunci enkripsi belum dikonfigurasi");
  const key = keyFrom(passphrase);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string, passphrase: string): string {
  if (!passphrase) throw new Error("Kunci enkripsi belum dikonfigurasi");
  const key = keyFrom(passphrase);
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}