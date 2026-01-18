'use client';

import type { ChangeEvent } from 'react';

type ErrorResponse = { message?: string; error?: string };
type BundleSummary = {
  profile: number;
  experiences: number;
  educations: number;
  projects: number;
  skills: number;
  publications: number;
  awards: number;
  certifications: number;
  customSections: number;
  socialLinks: number;
  timelineEvents: number;
  verificationLogs: number;
  credentials: number;
  attestations: number;
  edges: number;
  revisions: number;
  masks: number;
  epochs: number;
  stages: number;
};

type ImportResponse = {
  ok: boolean;
  data?: {
    profileId: string;
    mode: string;
    dryRun: boolean;
    summary: BundleSummary;
    snapshotId?: string;
  };
};

type BackupPanelProps = {
  profileId: string;
  importBundleText: string;
  importMode: 'merge' | 'replace';
  importDryRun: boolean;
  importStatus: string;
  onImportTextChange: (text: string) => void;
  onImportModeChange: (mode: 'merge' | 'replace') => void;
  onImportDryRunChange: (dryRun: boolean) => void;
  onRunImport: () => Promise<void>;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  backups: Array<{ id: string; label?: string; createdAt: string }>;
  backupStatus: string;
  restoreDryRun: boolean;
  onRestoreDryRunChange: (dryRun: boolean) => void;
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: (snapshotId: string) => Promise<void>;
  onRefreshBackups: () => void;
};

export function BackupPanel({
  importBundleText,
  importMode,
  importDryRun,
  importStatus,
  onImportTextChange,
  onImportModeChange,
  onImportDryRunChange,
  onRunImport,
  onFileUpload,
  backups,
  backupStatus,
  restoreDryRun,
  onRestoreDryRunChange,
  onCreateBackup,
  onRestoreBackup,
  onRefreshBackups,
}: BackupPanelProps) {
  return (
    <section className="section">
      <h2 className="section-title">Backups + Import</h2>
      <p className="section-subtitle">
        Capture snapshots, restore profile data, or import a JSON-LD bundle.
      </p>
      <div className="grid two" style={{ gap: '1rem' }}>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Import JSON-LD</h3>
          <p className="section-subtitle">
            Paste a bundle or load a file, then choose merge or replace.
          </p>
          <textarea
            className="input"
            rows={6}
            placeholder="Paste JSON-LD bundle..."
            value={importBundleText}
            onChange={(e) => onImportTextChange(e.target.value)}
          />
          <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
            <label className="label">Import Mode</label>
            <select
              className="input"
              value={importMode}
              onChange={(e) => onImportModeChange(e.target.value as 'merge' | 'replace')}
            >
              <option value="merge">Merge (upsert)</option>
              <option value="replace">Replace (wipe + import)</option>
            </select>
            <label
              className="label"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <input
                type="checkbox"
                checked={importDryRun}
                onChange={(e) => onImportDryRunChange(e.target.checked)}
              />
              Dry-run import
            </label>
          </div>
          <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
            <button className="button" onClick={() => void onRunImport()}>
              Run Import
            </button>
            <label className="button ghost" style={{ cursor: 'pointer' }}>
              Load JSON-LD
              <input
                type="file"
                accept="application/json,application/ld+json"
                onChange={onFileUpload}
                hidden
              />
            </label>
            {importStatus ? <span className="section-subtitle">{importStatus}</span> : null}
          </div>
        </div>
        <div className="stat-card">
          <h3 style={{ marginTop: 0 }}>Snapshot Log</h3>
          <p className="section-subtitle">Create backups and restore from recent snapshots.</p>
          <div className="hero-actions">
            <button className="button secondary" onClick={() => void onCreateBackup()}>
              Create Snapshot
            </button>
            <button className="button ghost" onClick={onRefreshBackups}>
              Refresh
            </button>
          </div>
          <label
            className="label"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
          >
            <input
              type="checkbox"
              checked={restoreDryRun}
              onChange={(e) => onRestoreDryRunChange(e.target.checked)}
            />
            Dry-run restore
          </label>
          <div className="stack" style={{ marginTop: '0.75rem' }}>
            {backups.length === 0 ? (
              <span className="section-subtitle">No snapshots yet.</span>
            ) : (
              backups.map((backup) => (
                <div
                  key={backup.id}
                  className="stack-item"
                  style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
                >
                  <div>
                    <strong>{new Date(backup.createdAt).toLocaleString()}</strong>
                    <div className="section-subtitle">{backup.label ?? 'Manual snapshot'}</div>
                  </div>
                  <button className="button ghost" onClick={() => void onRestoreBackup(backup.id)}>
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
          {backupStatus ? <span className="section-subtitle">{backupStatus}</span> : null}
        </div>
      </div>
    </section>
  );
}
