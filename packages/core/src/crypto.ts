import * as jose from 'jose';
import { sha256 } from 'multiformats/hashes/sha2';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { IntegrityProof } from '@in-midst-my-life/schema';

// Broad type for keys to avoid deep namespace issues in jose exports
export type JoseKey = object | Uint8Array;

export interface KeyPair {
  publicKey: JoseKey;
  privateKey: JoseKey;
  did: string;
}

export interface SignedBlock {
  payload: Record<string, unknown>;
  signature: string;
  did: string;
  timestamp: string;
}

// Symmetric encryption types
export type EncryptedPayload = {
  iv: string;
  tag: string;
  ciphertext: string;
};

// Key material management
const getKeyMaterial = (): Buffer => {
  // In a real app, this should come from a secure env var or KMS
  // Fallback to ephemeral key for dev/test if not set
  const raw = process.env["ENCRYPTION_KEY"] || process.env["PROFILE_KEY_ENC_KEY"];
  if (!raw) {
    if (process.env['NODE_ENV'] !== 'test') {
      console.warn("ENCRYPTION_KEY is not set; generating ephemeral key for encryption.");
    }
  }
  const source = raw ?? "ephemeral-key-do-not-use-in-production";
  return createHash("sha256").update(source).digest();
};

/**
 * Encrypts a value using AES-256-GCM.
 */
export const encrypt = (value: string | object): string => {
  const key = getKeyMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  
  const plaintextStr = typeof value === 'string' ? value : JSON.stringify(value);
  const plaintext = Buffer.from(plaintextStr);
  
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
  
  // Return as base64 encoded JSON string for storage
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

/**
 * Decrypts a value using AES-256-GCM.
 */
export const decrypt = <T = string>(encryptedStr: string): T => {
  const key = getKeyMaterial();
  
  // Parse the stored string
  const payloadJson = Buffer.from(encryptedStr, 'base64').toString('utf-8');
  const encrypted = JSON.parse(payloadJson) as EncryptedPayload;
  
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const resultStr = plaintext.toString("utf-8");
  
  try {
    // Try to parse as JSON if T suggests object
    return JSON.parse(resultStr) as T;
  } catch {
    // Return as string if parsing fails
    return resultStr as unknown as T;
  }
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'integrity')
      .sort(([a], [b]) => a.localeCompare(b));
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = canonicalize(val);
      return acc;
    }, {});
  }
  return value;
};

export const hashPayload = async (payload: Record<string, unknown>): Promise<string> => {
  const normalized = canonicalize(payload);
  const bytes = Buffer.from(JSON.stringify(normalized), 'utf-8');
  const digest = await sha256.digest(bytes);
  return Array.from(digest.bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const signIntegrity = async (
  payload: Record<string, unknown>,
  keyPair: KeyPair,
  publicKeyJwk?: jose.JWK
): Promise<IntegrityProof> => {
  const hash = await hashPayload(payload);
  const timestamp = new Date().toISOString();
  const message = JSON.stringify({ hash, did: keyPair.did, timestamp });
  // @ts-ignore
  const signature = await new jose.CompactSign(new TextEncoder().encode(message))
    .setProtectedHeader({ alg: 'EdDSA' })
    // @ts-ignore
    .sign(keyPair.privateKey);

  return {
    hash,
    signature,
    did: keyPair.did,
    publicKeyJwk: publicKeyJwk as Record<string, unknown>,
    timestamp
  };
};

export const verifyIntegrity = async (
  payload: Record<string, unknown>,
  proof: IntegrityProof,
  publicKey: JoseKey
): Promise<boolean> => {
  try {
    const expectedHash = await hashPayload(payload);
    if (expectedHash !== proof.hash) return false;
    const { payload: signed } = await jose.compactVerify(proof.signature, publicKey);
    const decoded = JSON.parse(new TextDecoder().decode(signed));
    return decoded.hash === proof.hash && decoded.did === proof.did && decoded.timestamp === proof.timestamp;
  } catch (e) {
    console.warn('Verification failed', e);
    return false;
  }
};

export class DIDKey {
  /**
   * Generates a new Ed25519 key pair and derived DID.
   */
  static async generate(): Promise<KeyPair> {
    const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { extractable: true });
    const jwk = await jose.exportJWK(publicKey);
    // Simple mock DID:key generation for prototype (in prod use proper multibase encoding)
    const thumbprint = await jose.calculateJwkThumbprint(jwk);
    const did = `did:key:${thumbprint}`;
    return { publicKey, privateKey, did };
  }

  /**
   * Signs a payload with a private key.
   */
  static async sign(
    payload: Record<string, unknown>,
    privateKey: JoseKey,
    did: string
  ): Promise<SignedBlock> {
    const timestamp = new Date().toISOString();
    const content = JSON.stringify({ ...payload, timestamp, did });
    const jws = await new jose.CompactSign(new TextEncoder().encode(content))
      .setProtectedHeader({ alg: 'EdDSA' })
      .sign(privateKey);
    
    return {
      payload,
      signature: jws,
      did,
      timestamp
    };
  }

  /**
   * Verifies a signed block.
   */
  static async verify(
    block: SignedBlock,
    publicKey: JoseKey
  ): Promise<boolean> {
    try {
      const { payload } = await jose.compactVerify(block.signature, publicKey);
      const decoded = new TextDecoder().decode(payload);
      const original = JSON.parse(decoded);
      
      // Verify basic integrity
      return (
        original.did === block.did &&
        original.timestamp === block.timestamp &&
        JSON.stringify(original.payload) === JSON.stringify(block.payload)
      );
    } catch (e) {
      console.warn('Verification failed', e);
      return false;
    }
  }

  /**
   * Imports a private key from a JWK.
   */
  static async importKey(jwk: jose.JWK): Promise<JoseKey> {
    return jose.importJWK(jwk, 'EdDSA');
  }
}
