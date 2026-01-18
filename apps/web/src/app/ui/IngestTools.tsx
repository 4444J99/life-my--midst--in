'use client';

type AgentToken = {
  id: string;
  label?: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

type IngestToolsProps = {
  githubUsername: string;
  ingestStatus: string;
  resumeTitle: string;
  resumeText: string;
  resumeStatus: string;
  crawlPath: string;
  crawlFilters: string;
  crawlStatus: string;
  agentAccessEnabled: boolean;
  agentTokens: AgentToken[];
  agentTokenLabel: string;
  agentTokenStatus: string;
  agentTokenValue: string;
  onGithubUsernameChange: (username: string) => void;
  onTriggerIngest: () => void;
  onResumeTitleChange: (title: string) => void;
  onResumeTextChange: (text: string) => void;
  onTriggerResumeIngest: () => void;
  onCrawlPathChange: (path: string) => void;
  onCrawlFiltersChange: (filters: string) => void;
  onTriggerCrawl: () => void;
  onToggleAgentAccess: (enabled: boolean) => void;
  onAgentTokenLabelChange: (label: string) => void;
  onCreateAgentToken: () => void;
  onRevokeAgentToken: (tokenId: string) => void;
};

export function IngestTools({
  githubUsername,
  ingestStatus,
  resumeTitle,
  resumeText,
  resumeStatus,
  crawlPath,
  crawlFilters,
  crawlStatus,
  agentAccessEnabled,
  agentTokens,
  agentTokenLabel,
  agentTokenStatus,
  agentTokenValue,
  onGithubUsernameChange,
  onTriggerIngest,
  onResumeTitleChange,
  onResumeTextChange,
  onTriggerResumeIngest,
  onCrawlPathChange,
  onCrawlFiltersChange,
  onTriggerCrawl,
  onToggleAgentAccess,
  onAgentTokenLabelChange,
  onCreateAgentToken,
  onRevokeAgentToken,
}: IngestToolsProps) {
  return (
    <section className="section">
      <h2 className="section-title">Data Ingest &amp; Agent Tools</h2>
      <p className="section-subtitle">
        GitHub, resume parsing, project crawlers, and agent tokens.
      </p>
      <div className="editor-grid">
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>GitHub Ingest</h3>
          <p className="section-subtitle">
            Fetch repositories and map them to your project ledger.
          </p>
          <input
            className="input"
            placeholder="GitHub Username"
            value={githubUsername}
            onChange={(e) => onGithubUsernameChange(e.target.value)}
          />
          <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
            <button className="button" onClick={onTriggerIngest}>
              Start Ingest
            </button>
          </div>
          {ingestStatus && (
            <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
              {ingestStatus}
            </div>
          )}
        </div>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Resume Parser</h3>
          <p className="section-subtitle">
            Paste a resume to generate experience, education, projects, and skills.
          </p>
          <input
            className="input"
            placeholder="Resume Label"
            value={resumeTitle}
            onChange={(e) => onResumeTitleChange(e.target.value)}
          />
          <textarea
            className="input"
            rows={6}
            placeholder="Paste resume text..."
            value={resumeText}
            onChange={(e) => onResumeTextChange(e.target.value)}
          />
          <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
            <button className="button" onClick={onTriggerResumeIngest}>
              Parse Resume
            </button>
          </div>
          {resumeStatus && (
            <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
              {resumeStatus}
            </div>
          )}
        </div>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Project Crawler</h3>
          <p className="section-subtitle">
            Scan local/cloud paths to ingest artifacts and documentation.
          </p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="Base Path (e.g. /app)"
              value={crawlPath}
              onChange={(e) => onCrawlPathChange(e.target.value)}
            />
            <input
              className="input"
              placeholder="Filters (e.g. .ts,.md)"
              value={crawlFilters}
              onChange={(e) => onCrawlFiltersChange(e.target.value)}
            />
          </div>
          <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
            <button className="button" onClick={onTriggerCrawl}>
              Start Crawl
            </button>
          </div>
          {crawlStatus && (
            <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
              {crawlStatus}
            </div>
          )}
        </div>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Agent Access</h3>
          <p className="section-subtitle">
            Issue scoped tokens for external agents to query this profile.
          </p>
          <label
            className="label"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
          >
            <input
              type="checkbox"
              checked={agentAccessEnabled}
              onChange={(e) => onToggleAgentAccess(e.target.checked)}
            />
            Enable agent queries
          </label>
          <input
            className="input"
            placeholder="Token label (optional)"
            value={agentTokenLabel}
            onChange={(e) => onAgentTokenLabelChange(e.target.value)}
          />
          <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
            <button className="button" onClick={onCreateAgentToken}>
              Create Token
            </button>
            {agentTokenStatus && <span className="section-subtitle">{agentTokenStatus}</span>}
          </div>
          {agentTokenValue && (
            <textarea
              readOnly
              className="input"
              value={agentTokenValue}
              style={{ marginTop: '0.75rem', fontFamily: 'monospace' }}
            />
          )}
          <div className="stack" style={{ marginTop: '0.75rem' }}>
            {agentTokens.length === 0 ? (
              <span className="section-subtitle">No active tokens.</span>
            ) : (
              agentTokens.map((token) => (
                <div
                  key={token.id}
                  className="stack-item"
                  style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
                >
                  <div>
                    <strong>{token.label ?? 'Agent Token'}</strong>
                    <div className="section-subtitle">
                      Created {new Date(token.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button className="button ghost" onClick={() => onRevokeAgentToken(token.id)}>
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
