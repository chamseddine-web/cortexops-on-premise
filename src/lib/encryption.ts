/**
 * Enterprise-grade encryption utilities for CortexOps
 * Implements AES-256-GCM encryption for sensitive data at rest
 */

/**
 * Data Encryption Wrapper
 * Uses Web Crypto API for browser-native encryption
 */
export class DataVault {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly TAG_LENGTH = 128; // 128 bits authentication tag

  /**
   * Generate a cryptographic key from a password
   */
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export key to JSON for storage
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  /**
   * Import key from JSON
   */
  static async importKey(keyData: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyData);
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   * Returns base64-encoded: iv:encrypted:tag
   */
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.TAG_LENGTH
      },
      key,
      dataBuffer
    );

    // Convert to base64
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ivBase64 = this.arrayBufferToBase64(iv);
    const encryptedBase64 = this.arrayBufferToBase64(encryptedArray);

    return `${ivBase64}:${encryptedBase64}`;
  }

  /**
   * Decrypt data
   */
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const [ivBase64, encryptedBase64] = encryptedData.split(':');

    if (!ivBase64 || !encryptedBase64) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = this.base64ToArrayBuffer(ivBase64);
    const encrypted = this.base64ToArrayBuffer(encryptedBase64);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.TAG_LENGTH
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Hash data using SHA-256 (for API keys, tokens)
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(new Uint8Array(hashBuffer));
  }

  /**
   * Generate secure random string (for tokens, salts)
   */
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array);
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode.apply(null, Array.from(buffer));
    return btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Field-level encryption for sensitive database fields
 */
export class FieldEncryption {
  private static masterKey: CryptoKey | null = null;

  /**
   * Initialize with master encryption key
   */
  static async initialize(masterKeyData?: string) {
    if (masterKeyData) {
      this.masterKey = await DataVault.importKey(masterKeyData);
    } else {
      this.masterKey = await DataVault.generateKey();
    }
  }

  /**
   * Encrypt a field value
   */
  static async encryptField(value: string): Promise<string> {
    if (!this.masterKey) {
      await this.initialize();
    }
    return DataVault.encrypt(value, this.masterKey!);
  }

  /**
   * Decrypt a field value
   */
  static async decryptField(encryptedValue: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }
    return DataVault.decrypt(encryptedValue, this.masterKey);
  }

  /**
   * Encrypt multiple fields in an object
   */
  static async encryptFields(
    obj: Record<string, any>,
    fieldsToEncrypt: string[]
  ): Promise<Record<string, any>> {
    const result = { ...obj };

    for (const field of fieldsToEncrypt) {
      if (result[field]) {
        result[field] = await this.encryptField(String(result[field]));
      }
    }

    return result;
  }

  /**
   * Decrypt multiple fields in an object
   */
  static async decryptFields(
    obj: Record<string, any>,
    fieldsToDecrypt: string[]
  ): Promise<Record<string, any>> {
    const result = { ...obj };

    for (const field of fieldsToDecrypt) {
      if (result[field]) {
        try {
          result[field] = await this.decryptField(result[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          result[field] = '[DECRYPTION ERROR]';
        }
      }
    }

    return result;
  }
}

/**
 * Secure token generator for API keys
 */
export class TokenGenerator {
  /**
   * Generate a secure API key
   * Format: cortex_live_[32 random bytes]
   */
  static generateAPIKey(): string {
    const randomPart = DataVault.generateSecureToken(32);
    return `cortex_live_${randomPart}`;
  }

  /**
   * Generate a test API key
   */
  static generateTestAPIKey(): string {
    const randomPart = DataVault.generateSecureToken(32);
    return `cortex_test_${randomPart}`;
  }

  /**
   * Validate API key format
   */
  static validateAPIKeyFormat(key: string): boolean {
    return /^cortex_(live|test)_[A-Za-z0-9+/=]{40,}$/.test(key);
  }

  /**
   * Hash API key for storage (SHA-256)
   */
  static async hashAPIKey(key: string): Promise<string> {
    return DataVault.hash(key);
  }

  /**
   * Generate session token
   */
  static generateSessionToken(): string {
    return DataVault.generateSecureToken(48);
  }
}

/**
 * Password utilities
 */
export class PasswordUtils {
  /**
   * Generate salt for password hashing
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Hash password with salt using PBKDF2
   */
  static async hashPassword(password: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return DataVault.arrayBufferToBase64(new Uint8Array(derivedBits));
  }

  /**
   * Verify password
   */
  static async verifyPassword(
    password: string,
    salt: Uint8Array,
    hashedPassword: string
  ): Promise<boolean> {
    const newHash = await this.hashPassword(password, salt);
    return newHash === hashedPassword;
  }
}

/**
 * Secure memory handling for sensitive data
 */
export class SecureMemory {
  /**
   * Overwrite string in memory (best effort)
   */
  static wipeString(str: string): void {
    if (typeof str !== 'string') return;

    // Note: JavaScript doesn't allow direct memory manipulation
    // This is a best-effort approach
    try {
      // @ts-ignore - Attempt to overwrite
      for (let i = 0; i < str.length; i++) {
        str = str.substring(0, i) + '\0' + str.substring(i + 1);
      }
    } catch (e) {
      // Strings are immutable in JS, this will fail but worth trying
    }
  }

  /**
   * Create temporary secure context for sensitive operations
   */
  static async withSecureContext<T>(
    fn: () => Promise<T>,
    cleanup: () => void
  ): Promise<T> {
    try {
      return await fn();
    } finally {
      cleanup();
      // Hint to GC
      if (global.gc) {
        global.gc();
      }
    }
  }
}

/**
 * TLS/SSL Certificate Pinning Info
 */
export const SecurityConfig = {
  TLS_VERSION: 'TLS 1.3',
  CIPHER_SUITES: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ],
  HSTS_MAX_AGE: 31536000, // 1 year
  CERTIFICATE_TRANSPARENCY: true,
  PERFECT_FORWARD_SECRECY: true
};

/**
 * Data sanitization for logging
 */
export class DataSanitizer {
  private static SENSITIVE_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /cortex_(live|test)_[A-Za-z0-9+/=]+/g, // API keys
    /Bearer\s+[A-Za-z0-9\-._~+/]+/g, // Bearer tokens
    /password["\s:=]+[^\s"]+/gi, // Passwords
    /secret["\s:=]+[^\s"]+/gi, // Secrets
  ];

  /**
   * Sanitize sensitive data from logs
   */
  static sanitize(data: string): string {
    let sanitized = data;

    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Sanitize object for logging
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive keys
      if (/password|secret|token|key|credential/i.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
