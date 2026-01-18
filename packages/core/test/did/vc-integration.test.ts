/**
 * Enhanced VC Integration Tests
 * Tests VC issuance, verification, and presentation with DID registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VC, DIDKey, type W3CVerifiableCredential } from '../../src';
import { getRegistry, resetRegistry } from '../../src/did/registry';

describe('VC Integration with DID Registry', () => {
  let issuerKeyPair: Awaited<ReturnType<typeof DIDKey.generate>>;
  let holderKeyPair: Awaited<ReturnType<typeof DIDKey.generate>>;

  beforeEach(async () => {
    issuerKeyPair = await DIDKey.generate();
    holderKeyPair = await DIDKey.generate();
    resetRegistry();
  });

  describe('Automatic DID Registration', () => {
    it('should automatically register issuer DID on credential issuance', async () => {
      const registry = getRegistry();
      const subjectData = { id: 'did:example:123', name: 'Test User' };

      await VC.issue(issuerKeyPair, subjectData);

      const resolution = await registry.resolve(issuerKeyPair.did);
      expect(resolution.didDocument).toBeTruthy();
      expect(resolution.didResolutionMetadata.error).toBeUndefined();
    });

    it('should not duplicate registrations', async () => {
      const registry = getRegistry();
      
      await VC.issue(issuerKeyPair, { id: '1' });
      await VC.issue(issuerKeyPair, { id: '2' });

      const dids = await registry.list();
      const issuerDids = dids.filter(d => d === issuerKeyPair.did);
      expect(issuerDids).toHaveLength(1);
    });
  });

  describe('Credential Verification', () => {
    it('should verify valid credential', async () => {
      const subjectData = { id: 'did:example:123', name: 'Test User' };
      const credential = await VC.issue(issuerKeyPair, subjectData);

      const isValid = await VC.verify(credential);
      expect(isValid).toBe(true);
    });

    it('should reject tampered credentials', async () => {
      const credential = await VC.issue(issuerKeyPair, { id: '123' });
      const tampered = {
        ...credential,
        credentialSubject: { id: '456' }
      };

      const isValid = await VC.verify(tampered);
      expect(isValid).toBe(false);
    });

    it('should reject credentials from unknown issuers', async () => {
      const credential = await VC.issue(issuerKeyPair, { id: '123' });
      resetRegistry();

      const isValid = await VC.verify(credential);
      expect(isValid).toBe(false);
    });
  });

  describe('Verifiable Presentations', () => {
    let credential1: W3CVerifiableCredential;
    let credential2: W3CVerifiableCredential;

    beforeEach(async () => {
      credential1 = await VC.issue(issuerKeyPair, { 
        id: 'did:example:holder', 
        skill: 'TypeScript',
        level: 'Expert'
      });
      credential2 = await VC.issue(issuerKeyPair, { 
        id: 'did:example:holder', 
        skill: 'React',
        level: 'Advanced'
      });
    });

    it('should create presentation without holder proof', async () => {
      const presentation = await VC.createPresentation([credential1, credential2]);

      expect(presentation.type).toContain('VerifiablePresentation');
      expect(presentation.verifiableCredential).toHaveLength(2);
      expect(presentation.proof).toBeUndefined();
      expect(presentation.holder).toBeUndefined();
    });

    it('should create presentation with holder proof', async () => {
      const presentation = await VC.createPresentation(
        [credential1, credential2],
        holderKeyPair,
        { challenge: 'challenge123', domain: 'example.com' }
      );

      expect(presentation.holder).toBe(holderKeyPair.did);
      expect(presentation.proof).toBeTruthy();
      expect(presentation.proof?.proofPurpose).toBe('authentication');
    });

    it('should automatically register holder DID when creating proof', async () => {
      const registry = getRegistry();
      
      await VC.createPresentation(
        [credential1],
        holderKeyPair,
        { challenge: 'test' }
      );

      const resolution = await registry.resolve(holderKeyPair.did);
      expect(resolution.didDocument).toBeTruthy();
    });

    it('should verify presentation without holder proof', async () => {
      const presentation = await VC.createPresentation([credential1]);
      const isValid = await VC.verifyPresentation(presentation);
      expect(isValid).toBe(true);
    });

    it('should verify presentation with holder proof', async () => {
      const presentation = await VC.createPresentation(
        [credential1, credential2],
        holderKeyPair,
        { challenge: 'test', domain: 'example.com' }
      );

      const isValid = await VC.verifyPresentation(presentation);
      expect(isValid).toBe(true);
    });

    it('should reject presentation with invalid credential', async () => {
      const invalidCred = { ...credential1, issuer: 'did:fake:unknown' };
      const presentation = await VC.createPresentation([invalidCred]);
      
      const isValid = await VC.verifyPresentation(presentation);
      expect(isValid).toBe(false);
    });
  });

  describe('Extended Credential Options', () => {
    it('should support expiration date', async () => {
      const expirationDate = new Date(Date.now() + 86400000).toISOString();
      
      const credential = await VC.issue(issuerKeyPair, { id: '123' }, undefined, {
        expirationDate
      });

      expect(credential.expirationDate).toBe(expirationDate);
    });

    it('should generate unique credential IDs', async () => {
      const cred1 = await VC.issue(issuerKeyPair, { name: 'User1' });
      const cred2 = await VC.issue(issuerKeyPair, { name: 'User2' });

      expect(cred1.id).toBeTruthy();
      expect(cred2.id).toBeTruthy();
      expect(cred1.id).not.toBe(cred2.id);
    });

    it('should support custom credential ID', async () => {
      const customId = 'urn:custom:credential:12345';
      
      const credential = await VC.issue(issuerKeyPair, { id: '123' }, undefined, {
        credentialId: customId
      });

      expect(credential.id).toBe(customId);
    });

    it('should support additional context URLs', async () => {
      const credential = await VC.issue(issuerKeyPair, { id: '123' }, undefined, {
        additionalContext: ['https://schema.org', 'https://example.com/context']
      });

      expect(credential['@context']).toContain('https://schema.org');
      expect(credential['@context']).toContain('https://example.com/context');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full VC lifecycle', async () => {
      // 1. Issue credential
      const credential = await VC.issue(
        issuerKeyPair,
        {
          id: 'did:example:holder',
          name: 'Alice Developer',
          skills: ['TypeScript', 'React', 'Node.js'],
          yearsExperience: 5
        },
        ['VerifiableCredential', 'SkillCredential'],
        {
          expirationDate: new Date(Date.now() + 365 * 86400000).toISOString()
        }
      );

      expect(credential).toBeTruthy();

      // 2. Verify credential
      const isCredentialValid = await VC.verify(credential);
      expect(isCredentialValid).toBe(true);

      // 3. Create presentation with holder proof
      const presentation = await VC.createPresentation(
        [credential],
        holderKeyPair,
        {
          challenge: 'interview-2024-01',
          domain: 'jobs.example.com'
        }
      );

      expect(presentation.holder).toBe(holderKeyPair.did);

      // 4. Verify presentation
      const isPresentationValid = await VC.verifyPresentation(presentation);
      expect(isPresentationValid).toBe(true);

      // 5. Verify DID registrations
      const registry = getRegistry();
      const issuerResolution = await registry.resolve(issuerKeyPair.did);
      const holderResolution = await registry.resolve(holderKeyPair.did);

      expect(issuerResolution.didDocument).toBeTruthy();
      expect(holderResolution.didDocument).toBeTruthy();
    });
  });
});
