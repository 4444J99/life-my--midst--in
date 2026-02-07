'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { WalletConnect } from '@/components/WalletConnect';

interface AttestationItem {
  id: string;
  entityType: string;
  entityId: string;
  signerDid: string;
  signerLabel?: string;
  status: string;
  hash: string;
  timestamp: string;
  context?: string;
}

interface SBTItem {
  id: string;
  attestationId: string;
  contractAddress: string;
  tokenId: string;
  chainId: number;
  walletAddress: string;
  status: string;
  mintedAt?: string;
  txHash?: string;
}

function getExplorerUrl(chainId: number, txHash: string): string {
  if (chainId === 1) return `https://etherscan.io/tx/${txHash}`;
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
  return '#';
}

const STATUS_COLORS: Record<string, string> = {
  verified: '#22c55e',
  self_attested: '#eab308',
  revoked: '#ef4444',
  pending: '#3b82f6',
  minted: '#22c55e',
  failed: '#ef4444',
};

export default function VerificationPage() {
  const params = useParams();
  const profileId = params['profileId'] as string;
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [attestations, setAttestations] = useState<AttestationItem[]>([]);
  const [sbts, setSbts] = useState<SBTItem[]>([]);
  const [minting, setMinting] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/profiles/${profileId}/attestation-blocks`);
        if (res.ok) {
          const data = (await res.json()) as AttestationItem[];
          setAttestations(data);
        }
      } catch {
        // Best-effort
      }
    })();
  }, [profileId]);

  const loadSBTs = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`/api/sbt/${addr}`);
      if (res.ok) {
        const data = (await res.json()) as SBTItem[];
        setSbts(data);
      }
    } catch {
      // Best-effort
    }
  }, []);

  const handleWalletConnect = useCallback(
    (address: string) => {
      setWalletAddress(address);
      void loadSBTs(address);
    },
    [loadSBTs],
  );

  const handleMint = useCallback(
    async (attestationId: string) => {
      if (!walletAddress) return;
      setMinting(attestationId);
      try {
        const res = await fetch(`/api/attestations/${attestationId}/mint-sbt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            chainId: 11155111, // Sepolia
            dryRun: false,
          }),
        });
        if (res.ok) {
          void loadSBTs(walletAddress);
        }
      } catch {
        // Handle error
      } finally {
        setMinting(null);
      }
    },
    [walletAddress, loadSBTs],
  );

  const sbtByAttestation = new Map(sbts.map((s) => [s.attestationId, s]));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Verification & SBT
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Manage attestations and mint Soulbound Tokens for profile {profileId.slice(0, 8)}...
          </p>
        </div>

        {/* Wallet Connection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <WalletConnect profileId={profileId} onConnect={handleWalletConnect} />
        </div>

        {/* Existing SBTs */}
        {sbts.length > 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 1rem',
              }}
            >
              Your Soulbound Tokens
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sbts.map((sbt) => (
                <div
                  key={sbt.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                      Token #{sbt.tokenId.slice(0, 12)}...
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: `${STATUS_COLORS[sbt.status] ?? '#9ca3af'}22`,
                        color: STATUS_COLORS[sbt.status] ?? '#9ca3af',
                      }}
                    >
                      {sbt.status}
                    </span>
                    {sbt.mintedAt && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 8 }}>
                        Minted {new Date(sbt.mintedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {sbt.txHash && (
                    <a
                      href={getExplorerUrl(sbt.chainId, sbt.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#a78bfa',
                        textDecoration: 'underline',
                      }}
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attestation List */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 1rem',
            }}
          >
            Attestations
          </h2>
          {attestations.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>
              No attestations yet. Create attestations for your profile claims to mint SBTs.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attestations.map((att) => {
                const existingSBT = sbtByAttestation.get(att.id);
                const canMint =
                  walletAddress &&
                  att.status === 'verified' &&
                  (!existingSBT || existingSBT.status === 'failed');

                return (
                  <div
                    key={att.id}
                    style={{
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                          {att.entityType}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: `${STATUS_COLORS[att.status] ?? '#9ca3af'}22`,
                            color: STATUS_COLORS[att.status] ?? '#9ca3af',
                          }}
                        >
                          {att.status}
                        </span>
                      </div>
                      {canMint && (
                        <button
                          onClick={() => {
                            void handleMint(att.id);
                          }}
                          disabled={minting === att.id}
                          style={{
                            padding: '6px 16px',
                            borderRadius: 8,
                            background:
                              minting === att.id
                                ? 'rgba(255,255,255,0.1)'
                                : 'linear-gradient(135deg, #7c3aed, #db2777)',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            cursor: minting === att.id ? 'wait' : 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {minting === att.id ? 'Minting...' : 'Mint SBT'}
                        </button>
                      )}
                      {existingSBT && existingSBT.status === 'minted' && (
                        <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                          SBT Minted
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      <span>Signer: {att.signerLabel ?? att.signerDid.slice(0, 30)}...</span>
                      {att.context && (
                        <span style={{ marginLeft: 12 }}>Context: {att.context}</span>
                      )}
                      <span style={{ marginLeft: 12 }}>
                        {new Date(att.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
