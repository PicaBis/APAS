/**
 * Data encryption utilities for sensitive data before sending to the database.
 * Uses the Web Crypto API (SubtleCrypto) for AES-GCM encryption.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

const SALT_LENGTH = 16;

// Derive a CryptoKey from a passphrase and salt
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt,
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
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(getPassphrase(), salt);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine version byte + salt + IV + ciphertext
  const ctBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(1 + salt.length + iv.length + ctBytes.length);
  combined[0] = 0x02; // Version byte to distinguish from legacy format
  combined.set(salt, 1);
  combined.set(iv, 1 + salt.length);
  combined.set(ctBytes, 1 + salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded AES-GCM encrypted string
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );

  // New format: version byte (0x02) + salt + IV + ciphertext
  // Legacy format (no version byte): IV + ciphertext
  const isNewFormat = combined.length > 0 && combined[0] === 0x02;
  let salt: Uint8Array;
  let iv: Uint8Array;
  let ciphertext: Uint8Array;

  if (isNewFormat) {
    salt = combined.slice(1, 1 + SALT_LENGTH);
    iv = combined.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
    ciphertext = combined.slice(1 + SALT_LENGTH + IV_LENGTH);
  } else {
    // Legacy fallback: hardcoded salt
    salt = new TextEncoder().encode('apas-salt-v1\0\0\0\0');
    iv = combined.slice(0, IV_LENGTH);
    ciphertext = combined.slice(IV_LENGTH);
  }

  const key = await deriveKey(getPassphrase(), salt);

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
