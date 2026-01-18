/**
 * DID Registry Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryDIDRegistry,
  DIDDocumentBuilder,
  getRegistry,
  setRegistry,
  resetRegistry
} from '../../src/did/registry';
import { DIDKey } from '../../src/crypto';

describe('DID Registry', () => {
  let registry: MemoryDIDRegistry;
  let keyPair: Awaited<ReturnType<typeof DIDKey.generate>>;

  beforeEach(async () => {
    registry = new MemoryDIDRegistry();
    keyPair = await DIDKey.generate();
    resetRegistry();
  });

  describe('MemoryDIDRegistry', () => {
    it('should register and resolve DID', async () => {
      const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
      await registry.register(keyPair.did, document);

      const resolution = await registry.resolve(keyPair.did);
      expect(resolution.didDocument).toBeTruthy();
      expect(resolution.didDocument?.id).toBe(keyPair.did);
    });

    it('should update DID document', async () => {
      const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
      await registry.register(keyPair.did, document);

      await registry.update(keyPair.did, {
        controller: 'did:key:controller123'
      });

      const resolution = await registry.resolve(keyPair.did);
      expect(resolution.didDocument?.controller).toBe('did:key:controller123');
    });

    it('should deactivate DID', async () => {
      const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
      await registry.register(keyPair.did, document);
      await registry.deactivate(keyPair.did);

      const resolution = await registry.resolve(keyPair.did);
      expect(resolution.didDocumentMetadata.deactivated).toBe(true);
    });
  });

  describe('Integration with VC', () => {
    it('should support VC issuance workflow', async () => {
      const document = await DIDDocumentBuilder.fromKeyPair(keyPair);
      await registry.register(keyPair.did, document);

      const resolution = await registry.resolve(keyPair.did);
      expect(resolution.didDocument).toBeTruthy();
      expect(resolution.didDocument?.verificationMethod).toHaveLength(1);

      const vm = resolution.didDocument?.verificationMethod?.[0];
      expect(vm?.id).toBe(`${keyPair.did}#keys-1`);
      expect(vm?.type).toBe('Ed25519VerificationKey2018');
    });
  });
});
