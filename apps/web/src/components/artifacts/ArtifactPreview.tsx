'use client';

import type { Artifact } from '@in-midst-my-life/schema';
import { FileText, Download } from 'lucide-react';

interface ArtifactPreviewProps {
  artifact: Artifact;
  apiBase?: string;
}

export function ArtifactPreview({
  artifact,
  apiBase = 'http://localhost:3001',
}: ArtifactPreviewProps) {
  const isImage = artifact.mimeType.startsWith('image/');
  const isPdf = artifact.mimeType === 'application/pdf';
  const isVideo = artifact.mimeType.startsWith('video/');
  const isAudio = artifact.mimeType.startsWith('audio/');

  const downloadUrl = `${apiBase}/artifacts/${artifact.id}/download`;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3 className="card-title">Preview</h3>
        <a
          href={downloadUrl}
          download
          className="button"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={16} />
          Download
        </a>
      </div>

      {isImage && (
        <div style={{ textAlign: 'center' }}>
          <img
            src={downloadUrl}
            alt={artifact.title || artifact.name}
            style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px' }}
          />
        </div>
      )}

      {isPdf && (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <iframe
            src={`${downloadUrl}#view=FitH`}
            style={{ width: '100%', height: '600px', border: 'none' }}
            title={artifact.title || artifact.name}
          />
        </div>
      )}

      {isVideo && (
        <video controls style={{ width: '100%', maxHeight: '500px', borderRadius: '8px' }}>
          <source src={downloadUrl} type={artifact.mimeType} />
          Your browser does not support video playback.
        </video>
      )}

      {isAudio && (
        <audio controls style={{ width: '100%' }}>
          <source src={downloadUrl} type={artifact.mimeType} />
          Your browser does not support audio playback.
        </audio>
      )}

      {!isImage && !isPdf && !isVideo && !isAudio && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <FileText
            size={48}
            style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}
          />
          <p className="text-muted">Preview not available for this file type.</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {artifact.mimeType}
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          <div>
            <span className="label">File Size</span>
            <p>{(artifact.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div>
            <span className="label">MIME Type</span>
            <p>{artifact.mimeType}</p>
          </div>
          <div>
            <span className="label">Created</span>
            <p>
              {artifact.createdDate ? new Date(artifact.createdDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <span className="label">Modified</span>
            <p>
              {artifact.modifiedDate ? new Date(artifact.modifiedDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
