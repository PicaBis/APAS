/**
 * Data encryption utilities for sensitive data before sending to the database.
 * Uses the Web Crypto API (SubtleCrypto) for AES-GCM encryption.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Derive a CryptoKey from a passphrase
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('apas-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Get or create a persistent encryption key
function getPassphrase(): string {
  const stored = localStorage.getItem('apas_enc_key');
  if (stored) return stored;

  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const key = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('apas_enc_key', key);
  return key;
}

/**
 * Encrypt a string value using AES-GCM
 * Returns a base64-encoded string containing the IV + ciphertext
 */
export async function encryptData(plaintext: string): Promise<string> {
  const key = await deriveKey(getPassphrase());
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded AES-GCM encrypted string
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  const key = await deriveKey(getPassphrase());
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Hash sensitive data (one-way) for comparison purposes
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
}
