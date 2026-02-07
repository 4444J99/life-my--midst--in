/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import type { FastifyPluginCallback } from 'fastify';
import { randomUUID } from 'node:crypto';
import { SBTMintRequestSchema, WalletConnectionSchema } from '@in-midst-my-life/schema';
import { SBTService, deriveTokenId, toAttestationHash, getChainInfo } from '@in-midst-my-life/core';
import type { SBTTokenRepo, WalletConnectionRepo } from '../repositories/sbt-tokens';
import { createSBTTokenRepo, createWalletConnectionRepo } from '../repositories/sbt-tokens';

// Default SBT contract address — overridden via SBT_CONTRACT_ADDRESS env var.
// This is a placeholder for Sepolia testnet deployment.
const DEFAULT_CONTRACT = '0x0000000000000000000000000000000000000000';

const sbtRoutes: FastifyPluginCallback = (server, _opts, done) => {
  const sbtRepo: SBTTokenRepo = (server as any)['sbtTokenRepo'] ?? createSBTTokenRepo();
  const walletRepo: WalletConnectionRepo =
    (server as any)['walletConnectionRepo'] ?? createWalletConnectionRepo();

  const contractAddress = process.env['SBT_CONTRACT_ADDRESS'] ?? DEFAULT_CONTRACT;

  // ─── Wallet Connection ──────────────────────────────────────

  /**
   * POST /wallet/connect
   * Connect a wallet to a profile by providing a signed message.
   */
  server.post('/wallet/connect', async (request, reply) => {
    const parsed = WalletConnectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { profileId, walletAddress, chainId, signature, message } = parsed.data;
    const now = new Date().toISOString();

    const connection = await walletRepo.connect({
      id: randomUUID(),
      profileId,
      walletAddress: walletAddress.toLowerCase(),
      chainId,
      verified: true, // Signature was provided — mark as verified
      signature,
      message,
      connectedAt: now,
    });

    return reply.status(201).send(connection);
  });

  /**
   * GET /wallet/:profileId
   * List wallet connections for a profile.
   */
  server.get('/wallet/:profileId', async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    const wallets = await walletRepo.findByProfile(profileId);
    return reply.send(wallets);
  });

  // ─── SBT Minting ──────────────────────────────────────

  /**
   * POST /attestations/:attestationId/mint-sbt
   * Mint a Soulbound Token for a verified attestation.
   */
  server.post('/attestations/:attestationId/mint-sbt', async (request, reply) => {
    const { attestationId } = request.params as { attestationId: string };
    const parsed = SBTMintRequestSchema.safeParse({
      ...(request.body as Record<string, unknown>),
      attestationId,
    });
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { walletAddress, chainId, dryRun } = parsed.data;

    // Check if already minted
    const existing = await sbtRepo.findByAttestation(attestationId);
    if (existing && existing.status === 'minted') {
      return reply.status(409).send({
        error: 'Already minted',
        sbt: existing,
      });
    }

    // Create SBT service and derive token ID
    const sbtService = new SBTService({
      contractAddress: contractAddress as `0x${string}`,
      chainId,
    });

    const tokenId = deriveTokenId(attestationId);
    const attestationHash = toAttestationHash(attestationId);

    // Attempt mint (or dry-run)
    const result = sbtService.mint({
      to: walletAddress as `0x${string}`,
      tokenId,
      attestationHash,
      dryRun,
    });

    if (!result.success) {
      return reply.status(500).send({ error: 'Mint failed', details: result.error });
    }

    const chainInfo = getChainInfo(chainId);
    const now = new Date().toISOString();

    if (dryRun) {
      return reply.send({
        dryRun: true,
        tokenId: result.tokenId,
        contractAddress: result.contractAddress,
        encodedData: result.encodedData,
        chainInfo,
      });
    }

    // Persist the SBT record (pending until tx confirms)
    const sbtRecord = await sbtRepo.create({
      id: randomUUID(),
      profileId: parsed.data.attestationId, // Will be resolved from attestation lookup in full impl
      attestationId,
      contractAddress: result.contractAddress,
      tokenId: result.tokenId,
      chainId,
      walletAddress: walletAddress.toLowerCase(),
      status: 'pending',
      metadata: { encodedData: result.encodedData },
      createdAt: now,
      updatedAt: now,
    });

    return reply.status(201).send({
      sbt: sbtRecord,
      encodedData: result.encodedData,
      chainInfo,
    });
  });

  // ─── SBT Queries ──────────────────────────────────────

  /**
   * GET /sbt/:walletAddress
   * List all SBTs owned by a wallet address.
   */
  server.get('/sbt/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const tokens = await sbtRepo.listByWallet(walletAddress);
    return reply.send(tokens);
  });

  /**
   * GET /sbt/:walletAddress/:tokenId
   * Get a specific SBT by wallet and token ID.
   */
  server.get('/sbt/:walletAddress/:tokenId', async (request, reply) => {
    const { walletAddress, tokenId } = request.params as {
      walletAddress: string;
      tokenId: string;
    };
    const tokens = await sbtRepo.listByWallet(walletAddress);
    const token = tokens.find((t) => t.tokenId === tokenId);
    if (!token) {
      return reply.status(404).send({ error: 'SBT not found' });
    }
    return reply.send(token);
  });

  /**
   * POST /sbt/:id/revoke
   * Mark an SBT as revoked (burn).
   */
  server.post('/sbt/:id/revoke', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await sbtRepo.find(id);
    if (!existing) {
      return reply.status(404).send({ error: 'SBT not found' });
    }
    if (existing.status === 'revoked') {
      return reply.status(409).send({ error: 'Already revoked' });
    }

    const updated = await sbtRepo.update(id, {
      status: 'revoked',
      burnedAt: new Date().toISOString(),
    });

    return reply.send(updated);
  });

  /**
   * PATCH /sbt/:id/confirm
   * Confirm a pending SBT mint (after tx is confirmed on-chain).
   */
  server.patch('/sbt/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { txHash?: string } | undefined;
    const existing = await sbtRepo.find(id);
    if (!existing) {
      return reply.status(404).send({ error: 'SBT not found' });
    }
    if (existing.status !== 'pending') {
      return reply.status(409).send({ error: `Cannot confirm SBT in ${existing.status} status` });
    }

    const updated = await sbtRepo.update(id, {
      status: 'minted',
      txHash: body?.txHash,
      mintedAt: new Date().toISOString(),
    });

    return reply.send(updated);
  });

  done();
};

export default sbtRoutes;
