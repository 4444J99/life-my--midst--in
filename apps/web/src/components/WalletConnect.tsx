'use client';

import { useState, useCallback } from 'react';

interface WalletState {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  error: string | null;
}

interface WalletConnectProps {
  profileId: string;
  onConnect?: (address: string, chainId: number) => void;
}

/**
 * MetaMask wallet connection component.
 *
 * Uses window.ethereum directly (no heavy SDK). Requests account access,
 * signs a challenge message, and posts the connection to the API.
 */
export function WalletConnect({ profileId, onConnect }: WalletConnectProps) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
    error: null,
  });
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    const ethereum = (
      window as unknown as {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      }
    ).ethereum;

    if (!ethereum) {
      setWallet((prev) => ({ ...prev, error: 'MetaMask not detected. Please install MetaMask.' }));
      return;
    }

    setConnecting(true);
    setWallet((prev) => ({ ...prev, error: null }));

    try {
      // Request account access
      const accounts = (await ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];
      const address = accounts[0];
      if (!address) throw new Error('No account selected');

      // Get chain ID
      const chainHex = (await ethereum.request({
        method: 'eth_chainId',
      })) as string;
      const chainId = parseInt(chainHex, 16);

      // Sign a challenge message
      const message = `Connect wallet to profile ${profileId}\nTimestamp: ${new Date().toISOString()}`;
      const signature = (await ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      })) as string;

      // Post to API
      const res = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          walletAddress: address,
          chainId,
          signature,
          message,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Connection failed');
      }

      setWallet({ address, chainId, connected: true, error: null });
      onConnect?.(address, chainId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setWallet((prev) => ({ ...prev, error: message }));
    } finally {
      setConnecting(false);
    }
  }, [profileId, onConnect]);

  const chainName =
    wallet.chainId === 1
      ? 'Ethereum'
      : wallet.chainId === 11155111
        ? 'Sepolia'
        : wallet.chainId
          ? `Chain ${wallet.chainId}`
          : '';

  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 1rem',
        }}
      >
        Wallet Connection
      </h3>

      {wallet.connected ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
              }}
            />
            <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>Connected</span>
            <span
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 8,
                background: 'rgba(139,92,246,0.2)',
                color: '#a78bfa',
              }}
            >
              {chainName}
            </span>
          </div>
          <code
            style={{
              display: 'block',
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              background: 'rgba(0,0,0,0.3)',
              padding: '8px 12px',
              borderRadius: 8,
              wordBreak: 'break-all',
            }}
          >
            {wallet.address}
          </code>
        </div>
      ) : (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>
            Connect your Ethereum wallet to mint Soulbound Tokens for verified attestations.
          </p>
          <button
            onClick={() => {
              void connectWallet();
            }}
            disabled={connecting}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              background: connecting
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #7c3aed, #db2777)',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: connecting ? 'wait' : 'pointer',
              fontSize: 14,
            }}
          >
            {connecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        </div>
      )}

      {wallet.error && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{wallet.error}</p>
      )}
    </div>
  );
}
