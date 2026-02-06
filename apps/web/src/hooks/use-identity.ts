'use client';

import { useState, useEffect } from 'react';
import * as jose from 'jose';

// Type matching @in-midst-my-life/core KeyPair for compatibility
interface KeyPair {
  did: string;
  publicKey: any; // jose.KeyLike is not exported in this version
  privateKey: any; // jose.KeyLike is not exported in this version
}

const STORAGE_KEY = 'midst:identity:v1';

export function useIdentity() {
  const [identity, setIdentity] = useState<KeyPair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadIdentity();
  }, []);

  async function loadIdentity() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          did: string;
          publicKey: jose.JWK;
          privateKey: jose.JWK;
        };
        // We need to re-import the keys from JWK if we stored them as JWK
        // Or if we stored them as exported strings.
        // For simplicity in this prototype, let's assume we store JWKs.
        const publicKey = await jose.importJWK(parsed.publicKey, 'EdDSA');
        const privateKey = await jose.importJWK(parsed.privateKey, 'EdDSA');
        setIdentity({
          did: parsed.did,
          publicKey,
          privateKey,
        });
      }
    } catch (e) {
      console.error('Failed to load identity', e);
    } finally {
      setLoading(false);
    }
  }

  async function generateIdentity() {
    setLoading(true);
    try {
      // Generate EdDSA key pair using Web Crypto
      const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA');

      // Export to JWK for storage
      const pubJwk = await jose.exportJWK(publicKey);
      const privJwk = await jose.exportJWK(privateKey);

      // Generate DID (simplified: use first 16 chars of public key thumbprint)
      const thumbprint = await jose.calculateJwkThumbprint(pubJwk);
      const did = `did:key:${thumbprint.slice(0, 16)}`;

      const storagePayload = {
        did,
        publicKey: pubJwk,
        privateKey: privJwk,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storagePayload));

      const keyPair: KeyPair = {
        did,
        publicKey,
        privateKey,
      };

      setIdentity(keyPair);
    } catch (e) {
      console.error('Failed to generate identity', e);
    } finally {
      setLoading(false);
    }
  }

  async function exportIdentity(): Promise<string> {
    if (!identity) return '';
    const pubJwk = await jose.exportJWK(identity.publicKey);
    const privJwk = await jose.exportJWK(identity.privateKey);
    return JSON.stringify(
      {
        did: identity.did,
        publicKey: pubJwk,
        privateKey: privJwk,
      },
      null,
      2,
    );
  }

  const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

  async function exportIdentityEncrypted(passphrase: string): Promise<string> {
    // allow-secret
    if (!identity) return '';
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    const pubJwk = await jose.exportJWK(identity.publicKey);
    const privJwk = await jose.exportJWK(identity.privateKey);
    const payload = JSON.stringify({ did: identity.did, publicKey: pubJwk, privateKey: privJwk });
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(payload),
    );

    return JSON.stringify(
      {
        version: 1,
        kdf: 'PBKDF2',
        cipher: 'AES-GCM',
        iterations: 100_000,
        salt: toBase64(salt.buffer),
        iv: toBase64(iv.buffer),
        ciphertext: toBase64(ciphertext),
        did: identity.did,
      },
      null,
      2,
    );
  }

  return {
    identity,
    loading,
    generateIdentity,
    exportIdentity,
    exportIdentityEncrypted,
  };
}
