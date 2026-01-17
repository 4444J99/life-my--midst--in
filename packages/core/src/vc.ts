import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { type KeyPair } from './crypto';
import * as jose from 'jose';
import { getRegistry, DIDDocumentBuilder } from './did/registry';

export interface VerifiableCredentialPayload {
  '@context'?: string[];
  context?: string[]; // Backward compatibility - mirrors @context
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
  expirationDate?: string;
}

export interface W3CVerifiableCredential extends VerifiableCredentialPayload {
  id?: string;
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  verifiableCredential: W3CVerifiableCredential[];
  holder?: string;
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

export class VC {
  /**
   * Calculates the IPFS Content Identifier (CID) for a JSON object.
   * Uses JSON codec and SHA-256 hash.
   */
  static async calculateCID(data: unknown): Promise<string> {
    const bytes = Buffer.from(JSON.stringify(data), 'utf-8');
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, 0x71, hash); // 0x71 is the JSON codec code
    return cid.toString();
  }

  /**
   * Register issuer DID in the registry if not already present
   */
  static async ensureIssuerRegistered(keyPair: KeyPair): Promise<void> {
    const registry = getRegistry();
    const resolution = await registry.resolve(keyPair.did);
    
    if (resolution.didResolutionMetadata.error === 'notFound') {
      const didDocument = await DIDDocumentBuilder.fromKeyPair(keyPair);
      await registry.register(keyPair.did, didDocument);
    }
  }

  /**
   * Wraps data in a W3C Verifiable Credential envelope and signs it.
   * Automatically registers issuer DID if not present.
   */
  static async issue(
    keyPair: KeyPair,
    subjectData: Record<string, unknown>,
    types: string[] = ['VerifiableCredential'],
    options?: {
      expirationDate?: string;
      credentialId?: string;
      additionalContext?: string[];
    }
  ): Promise<W3CVerifiableCredential> {
    await this.ensureIssuerRegistered(keyPair);

    const issuanceDate = new Date().toISOString();
    const credentialId = options?.credentialId || `urn:uuid:${await this.calculateCID({ ...subjectData, issuanceDate })}`;
    
    const contextArray = [
      'https://www.w3.org/2018/credentials/v1',
      ...(options?.additionalContext || [])
    ];
    
    const payload: VerifiableCredentialPayload = {
      '@context': contextArray,
      context: contextArray, // Backward compatibility
      type: types,
      issuer: keyPair.did,
      issuanceDate,
      credentialSubject: subjectData,
      expirationDate: options?.expirationDate
    };

    // @ts-ignore
    const jws = await new jose.CompactSign(new TextEncoder().encode(JSON.stringify(payload)))
      .setProtectedHeader({ alg: 'EdDSA' })
      // @ts-ignore
      .sign(keyPair.privateKey);

    return {
      id: credentialId,
      ...payload,
      proof: {
        type: 'Ed25519Signature2018',
        created: issuanceDate,
        verificationMethod: `${keyPair.did}#keys-1`,
        proofPurpose: 'assertionMethod',
        jws
      }
    };
  }

  /**
   * Verify a Verifiable Credential
   */
  static async verify(credential: W3CVerifiableCredential): Promise<boolean> {
    try {
      const registry = getRegistry();
      const resolution = await registry.resolve(credential.issuer);

      if (resolution.didResolutionMetadata.error) {
        console.warn(`DID resolution failed: ${resolution.didResolutionMetadata.error}`);
        return false;
      }

      if (!resolution.didDocument) {
        return false;
      }

      // Find the verification method
      const verificationMethod = resolution.didDocument.verificationMethod?.find(
        vm => vm.id === credential.proof.verificationMethod
      );

      if (!verificationMethod || !verificationMethod.publicKeyJwk) {
        console.warn('Verification method not found or missing public key');
        return false;
      }

      // Reconstruct payload (everything except proof and id)
      const { proof, id, ...payloadFields } = credential;
      const payload = payloadFields;
      
      const publicKey = await jose.importJWK(verificationMethod.publicKeyJwk, 'EdDSA');

      // Verify the JWS
      const { payload: verified } = await jose.compactVerify(proof.jws, publicKey);
      const decoded = JSON.parse(new TextDecoder().decode(verified));

      // Compare payloads (decoded won't have id field)
      return JSON.stringify(decoded) === JSON.stringify(payload);
    } catch (e) {
      console.warn('Verification failed:', e);
      return false;
    }
  }

  /**
   * Create a Verifiable Presentation containing multiple credentials
   */
  static async createPresentation(
    credentials: W3CVerifiableCredential[],
    holderKeyPair?: KeyPair,
    options?: {
      challenge?: string;
      domain?: string;
    }
  ): Promise<VerifiablePresentation> {
    const presentation: VerifiablePresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: credentials,
      holder: holderKeyPair?.did
    };

    if (holderKeyPair && options) {
      await this.ensureIssuerRegistered(holderKeyPair);

      const proofPayload = {
        ...presentation,
        challenge: options.challenge,
        domain: options.domain
      };

      // @ts-ignore
      const jws = await new jose.CompactSign(new TextEncoder().encode(JSON.stringify(proofPayload)))
        .setProtectedHeader({ alg: 'EdDSA' })
        // @ts-ignore
        .sign(holderKeyPair.privateKey);

      presentation.proof = {
        type: 'Ed25519Signature2018',
        created: new Date().toISOString(),
        verificationMethod: `${holderKeyPair.did}#keys-1`,
        proofPurpose: 'authentication',
        jws
      };
    }

    return presentation;
  }

  /**
   * Verify all credentials in a presentation
   */
  static async verifyPresentation(presentation: VerifiablePresentation): Promise<boolean> {
    try {
      // Verify each credential
      for (const credential of presentation.verifiableCredential) {
        const valid = await this.verify(credential);
        if (!valid) {
          return false;
        }
      }

      // Verify presentation proof if present
      if (presentation.proof && presentation.holder) {
        const registry = getRegistry();
        const resolution = await registry.resolve(presentation.holder);

        if (resolution.didResolutionMetadata.error || !resolution.didDocument) {
          return false;
        }

        const verificationMethod = resolution.didDocument.verificationMethod?.find(
          vm => vm.id === presentation.proof!.verificationMethod
        );

        if (!verificationMethod || !verificationMethod.publicKeyJwk) {
          return false;
        }

        const publicKey = await jose.importJWK(verificationMethod.publicKeyJwk, 'EdDSA');
        await jose.compactVerify(presentation.proof.jws, publicKey);
      }

      return true;
    } catch (e) {
      console.warn('Presentation verification failed:', e);
      return false;
    }
  }
}
