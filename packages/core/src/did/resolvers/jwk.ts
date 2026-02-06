/**
 * did:jwk DID Method Resolver
 *
 * Resolves `did:jwk:<base64url-encoded-JWK>` identifiers by decoding
 * the JWK directly from the DID string and constructing a DID Document.
 *
 * Format: did:jwk:<base64url(JSON(JWK))>
 *
 * The simplest DID method — the entire public key is encoded in the identifier.
 * No network I/O, no multicodec, zero external dependencies.
 *
 * @see https://github.com/quartzjer/did-jwk/blob/main/spec.md
 */

import type { DIDDocument, DIDResolutionResult } from '../registry';

/** Key types that support key agreement (ECDH) */
const KEY_AGREEMENT_TYPES = new Set(['X25519', 'EC']);

/** Valid JWK key types */
const VALID_KTY = new Set(['OKP', 'EC', 'RSA']);

export class DidJwkResolver {
  /**
   * Resolve a did:jwk identifier to a DID Document.
   */
  resolve(did: string): Promise<DIDResolutionResult> {
    if (!did.startsWith('did:jwk:')) {
      return Promise.resolve(this.errorResult('invalidDid', `Not a did:jwk identifier: ${did}`));
    }

    const encoded = did.slice('did:jwk:'.length);
    if (!encoded) {
      return Promise.resolve(this.errorResult('invalidDid', 'Empty method-specific identifier'));
    }

    let jwk: Record<string, unknown>;
    try {
      const json = Buffer.from(encoded, 'base64url').toString('utf-8');
      jwk = JSON.parse(json) as Record<string, unknown>;
    } catch {
      return Promise.resolve(
        this.errorResult('invalidDid', 'Failed to decode base64url JWK from DID'),
      );
    }

    const kty = jwk['kty'] as string | undefined;
    if (!kty) {
      return Promise.resolve(this.errorResult('invalidDid', 'JWK missing required "kty" field'));
    }

    if (!VALID_KTY.has(kty)) {
      return Promise.resolve(this.errorResult('invalidDid', `Unsupported JWK key type: ${kty}`));
    }

    const keyId = `${did}#0`;
    const document: DIDDocument = {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
      id: did,
      verificationMethod: [
        {
          id: keyId,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyJwk: jwk,
        },
      ],
      authentication: [keyId],
      assertionMethod: [keyId],
    };

    // Add keyAgreement for key types that support ECDH
    const crv = jwk['crv'] as string | undefined;
    if (KEY_AGREEMENT_TYPES.has(kty) || (crv && KEY_AGREEMENT_TYPES.has(crv))) {
      document.keyAgreement = [keyId];
    }

    return Promise.resolve({
      didDocument: document,
      didDocumentMetadata: {},
      didResolutionMetadata: {},
    });
  }

  private errorResult(error: string, message: string): DIDResolutionResult {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error, message },
    };
  }
}
