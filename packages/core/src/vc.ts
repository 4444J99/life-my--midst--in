import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { type KeyPair } from './crypto';
import * as jose from 'jose';

export interface VerifiableCredentialPayload {
  context?: string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
}

export interface W3CVerifiableCredential extends VerifiableCredentialPayload {
  proof: {
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
   * Wraps data in a W3C Verifiable Credential envelope and signs it.
   */
  static async issue(
    keyPair: KeyPair,
    subjectData: Record<string, unknown>,
    types: string[] = ['VerifiableCredential']
  ): Promise<W3CVerifiableCredential> {
    const issuanceDate = new Date().toISOString();
    
    const payload: VerifiableCredentialPayload = {
      context: ['https://www.w3.org/2018/credentials/v1'],
      type: types,
      issuer: keyPair.did,
      issuanceDate,
      credentialSubject: subjectData
    };

    // Cast keys because our broad 'JoseKey' type might not perfectly match 'jose' library strict types
    // In a real app, strict type guards would be better.
    // @ts-ignore
    const jws = await new jose.CompactSign(new TextEncoder().encode(JSON.stringify(payload)))
      .setProtectedHeader({ alg: 'EdDSA' })
      // @ts-ignore
      .sign(keyPair.privateKey);

    return {
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
}
