/**
 * Minimal ERC-5192 Soulbound Token ABI.
 *
 * ERC-5192 extends ERC-721 with a `locked()` view that always returns true
 * for soulbound tokens (non-transferable). The mint/burn functions are
 * issuer-only operations.
 *
 * This is a subset — only the functions we call from the API. The full
 * contract would include ERC-721 view functions (ownerOf, balanceOf, etc.)
 * but we don't need those for minting and verification flows.
 */
export const SBT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'attestationHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'burn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'locked',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'attestationHash',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'Locked',
    type: 'event',
    inputs: [{ name: 'tokenId', type: 'uint256', indexed: true }],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;
