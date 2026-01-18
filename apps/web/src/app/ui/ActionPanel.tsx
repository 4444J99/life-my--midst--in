'use client';

type ActionPanelProps = {
  profileId: string;
  exportStatus: string;
  onExport: (path: string) => void;
  onGenerateIdentity?: () => void;
  onMintIdentity?: () => void;
  identity?: { did: string } | null;
  lastMintedCID?: string;
};

export function ActionPanel({
  exportStatus,
  onExport,
  onGenerateIdentity,
  onMintIdentity,
  identity,
  lastMintedCID,
}: ActionPanelProps) {
  return (
    <section className="section">
      <h2 className="section-title">Action Panel</h2>
      <p className="section-subtitle">Export profile data and manage identity credentials.</p>
      <div className="grid two" style={{ gap: '1rem' }}>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Export Pipeline</h3>
          <p className="section-subtitle">
            Generate JSON-LD, verifiable credential bundles, and PDF snapshots.
          </p>
          <div className="hero-actions">
            <button className="button" onClick={() => onExport('jsonld')}>
              JSON-LD
            </button>
            <button className="button secondary" onClick={() => onExport('vc')}>
              VC Bundle
            </button>
            <button className="button ghost" onClick={() => onExport('pdf')}>
              PDF Snapshot
            </button>
          </div>
          {exportStatus && (
            <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
              {exportStatus}
            </div>
          )}
        </div>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Identity Vault</h3>
          <p className="section-subtitle">Manage your DID and cryptographic keys.</p>
          {identity ? (
            <>
              <div
                className="section-subtitle"
                style={{ wordBreak: 'break-all', marginBottom: '0.75rem' }}
              >
                <strong>DID:</strong> {identity.did}
              </div>
              <div className="hero-actions">
                <button className="button" onClick={onMintIdentity}>
                  Mint Identity Proof
                </button>
                <button className="button ghost" onClick={onGenerateIdentity}>
                  Regenerate
                </button>
              </div>
              {lastMintedCID && (
                <div
                  className="section-subtitle"
                  style={{ marginTop: '0.5rem', color: 'var(--accent)' }}
                >
                  <strong>Latest CID:</strong> {lastMintedCID}
                </div>
              )}
            </>
          ) : (
            <div className="hero-actions">
              <button className="button" onClick={onGenerateIdentity}>
                Generate Identity
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
