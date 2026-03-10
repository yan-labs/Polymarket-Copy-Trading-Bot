/**
 * Encryption utilities for securing private keys
 * Uses AES-256-GCM for encryption (recommended for sensitive data)
 */

import crypto from 'crypto';

// Encryption key should be 32 bytes (256 bits) for AES-256
// In production, this should be stored securely (env variable, key management service)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32b!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length
const AUTH_TAG_LENGTH = 16; // GCM authentication tag length
const SALT_LENGTH = 64; // Salt for key derivation
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Derive a encryption key from the master key and salt
 */
function deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
        ENCRYPTION_KEY,
        salt,
        ITERATIONS,
        32, // 32 bytes = 256 bits
        'sha512'
    );
}

/**
 * Encrypt a private key
 * @param privateKey - The private key to encrypt (without 0x prefix)
 * @returns Encrypted string (base64 encoded: salt:iv:authTag:encrypted)
 */
export function encryptPrivateKey(privateKey: string): string {
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const key = deriveKey(salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
        cipher.update(cleanKey, 'utf8'),
        cipher.final()
    ]);

    // Get authentication tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    // Combine salt:iv:authTag:encrypted and encode as base64
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt a private key
 * @param encryptedData - The encrypted data (base64 encoded)
 * @returns Decrypted private key (without 0x prefix)
 */
export function decryptPrivateKey(encryptedData: string): string {
    if (!encryptedData) {
        throw new Error('Encrypted data is required');
    }

    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive key
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

/**
 * Validate a private key format
 * @param privateKey - The private key to validate
 * @returns true if valid, throws error if invalid
 */
export function validatePrivateKey(privateKey: string): boolean {
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Ethereum private keys are 64 hex characters (32 bytes)
    if (!/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
        throw new Error('Invalid private key format. Expected 64 hex characters.');
    }

    return true;
}

/**
 * Mask a private key for display (show only first and last 4 characters)
 * @param privateKey - The private key to mask
 * @returns Masked private key (e.g., "0x1234...abcd")
 */
export function maskPrivateKey(privateKey: string): string {
    if (!privateKey) return '';
    
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    if (cleanKey.length < 8) return '****';
    
    return `0x${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`;
}

export default {
    encryptPrivateKey,
    decryptPrivateKey,
    validatePrivateKey,
    maskPrivateKey
};