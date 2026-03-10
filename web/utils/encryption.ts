/**
 * Encryption utilities for securing private keys (Web/Next.js version)
 * Uses AES-256-GCM for encryption
 * 
 * Note: In production, the ENCRYPTION_KEY should be stored in environment variables
 * and should be the same across bot and web processes for decryption to work.
 */

import crypto from 'crypto';

// Encryption key should be 32 bytes (256 bits) for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32b!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const ITERATIONS = 100000;

/**
 * Derive a encryption key from the master key and salt
 */
function deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
        ENCRYPTION_KEY,
        salt,
        ITERATIONS,
        32,
        'sha512'
    );
}

/**
 * Encrypt a private key
 */
export function encryptPrivateKey(privateKey: string): string {
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(cleanKey, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt a private key
 */
export function decryptPrivateKey(encryptedData: string): string {
    if (!encryptedData) {
        throw new Error('Encrypted data is required');
    }

    const combined = Buffer.from(encryptedData, 'base64');
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

/**
 * Validate a private key format
 */
export function validatePrivateKey(privateKey: string): boolean {
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    if (!/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
        throw new Error('Invalid private key format. Expected 64 hex characters.');
    }

    return true;
}

/**
 * Mask a private key for display
 */
export function maskPrivateKey(privateKey: string): string {
    if (!privateKey) return '';
    
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    if (cleanKey.length < 8) return '****';
    
    return `0x${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`;
}