/**
 * AES-256-GCM encryption utilities using Web Crypto API
 */

/**
 * Convert hex string (with or without 0x prefix) to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import a hex key as a CryptoKey for AES-GCM
 */
async function importAesKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random 12-byte IV for AES-GCM
 */
function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt content with AES-256-GCM
 * @param content - The plaintext content to encrypt
 * @param keyHex - The 256-bit key as hex string (with or without 0x prefix)
 * @returns Object containing base64-encoded IV and encrypted content
 */
export async function encryptContent(
  content: string,
  keyHex: string
): Promise<{ iv: string; encryptedContent: string }> {
  const cryptoKey = await importAesKey(keyHex);
  const iv = generateIv();
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);

  const encryptedBytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    contentBytes
  );

  return {
    iv: bytesToBase64(iv),
    encryptedContent: bytesToBase64(new Uint8Array(encryptedBytes)),
  };
}

/**
 * Decrypt content with AES-256-GCM
 * @param encryptedContent - Base64-encoded encrypted content
 * @param iv - Base64-encoded IV
 * @param keyHex - The 256-bit key as hex string (with or without 0x prefix)
 * @returns The decrypted plaintext content
 */
export async function decryptContent(
  encryptedContent: string,
  iv: string,
  keyHex: string
): Promise<string> {
  const cryptoKey = await importAesKey(keyHex);
  const ivBytes = base64ToBytes(iv);
  const encryptedBytes = base64ToBytes(encryptedContent);

  const decryptedBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    encryptedBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}
