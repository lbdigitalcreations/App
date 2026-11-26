import * as crypto from 'crypto';

/**
 * Decrypt a base64‑encoded AES‑256‑GCM payload.
 * Payload format: IV(12) || AuthTag(16) || Ciphertext
 */
export function decryptEnv(payload: string, keyHex: string): string {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  decipher.setAuthTag(tag);
  let plain = decipher.update(ciphertext);
  plain = Buffer.concat([plain, decipher.final()]);
  return plain.toString('utf8');
}
