# ADR 014: Blockchain SBT Strategy

**Status:** Accepted
**Date:** 2026-02-07
**Deciders:** Core Team

## Context

The system uses cryptographic attestations (Ed25519 signatures via `AttestationBlockSchema`) to verify CV claims. These attestations are stored in PostgreSQL and are cryptographically valid but not anchored to a public ledger. Users requested the ability to "publish" verified attestations as non-transferable tokens (Soulbound Tokens) on Ethereum, creating a publicly verifiable proof of credential ownership.

## Decision

### ERC-5192 Soulbound Tokens

We chose the ERC-5192 standard (Minimum Interface for Soulbound NFTs) which extends ERC-721 with a `locked()` view function that always returns `true` for soulbound tokens. Key properties:

- **Non-transferable**: Once minted to a wallet, the token cannot be transferred
- **Attestation-linked**: Each SBT stores a `bytes32` attestation hash on-chain
- **Burnable**: The issuer can revoke (burn) the token if the attestation is revoked

### viem over ethers.js

Selected `viem` as the Ethereum interaction library because:

- **TypeScript-first**: Native TypeScript types, no `@types/*` needed
- **Tree-shakeable**: Only the functions used are bundled (~70% smaller than ethers.js)
- **MIT license**: Permissive, no concerns for commercial use
- **Memory-efficient**: Critical for the 16GB RAM constraint

### Architecture

```
packages/schema/src/verification.ts    → SoulboundTokenSchema, WalletConnectionSchema
packages/core/src/evm/                 → viem client, SBT ABI, SBTService
apps/api/src/routes/sbt.ts            → REST endpoints for mint/revoke/query
apps/api/src/repositories/sbt-tokens.ts → InMemory + PostgreSQL persistence
apps/web/src/components/WalletConnect.tsx → MetaMask connection (window.ethereum)
apps/web/src/app/profile/[profileId]/verification/ → SBT management page
```

### Dry-Run Mode

The `SBTService.mint()` method supports a `dryRun` flag that:

1. Validates all inputs (addresses, token ID, attestation hash)
2. Encodes the transaction calldata
3. Returns the encoded data without broadcasting

This allows testing the full flow without testnet ETH or a deployed contract.

### Wallet Connection Flow

1. User clicks "Connect MetaMask" → `eth_requestAccounts`
2. Browser prompts for account selection
3. User signs a challenge message → `personal_sign`
4. Signed message + address posted to `POST /wallet/connect`
5. Server stores the binding (profile ↔ wallet ↔ chain)

No heavy SDK (WalletConnect, RainbowKit) is used — direct `window.ethereum` keeps the bundle small.

### Target Chain

Sepolia testnet (chainId: 11155111) is the primary target. Mainnet (chainId: 1) is supported in the schema but gated behind configuration. The `SBT_CONTRACT_ADDRESS` environment variable determines which contract to interact with.

## Alternatives Considered

1. **ethers.js**: More mature but heavier (2MB+ bundle), less TypeScript-native
2. **wagmi + RainbowKit**: Full wallet toolkit but adds ~500KB to web bundle for a feature used by a small percentage of users
3. **Polygon/L2**: Lower gas but adds bridge complexity; Sepolia is free for testnet use
4. **EAS (Ethereum Attestation Service)**: More complex protocol; our attestation model is simpler and doesn't need EAS's full schema registry

## Consequences

- Users can anchor verified credentials on-chain as non-transferable tokens
- The dry-run mode enables development without blockchain infrastructure
- `viem` adds a runtime dependency to `packages/core` but it's tree-shakeable
- Smart contract deployment is a separate operational step (not covered here)
- Future: could add WalletConnect for mobile wallet support
