import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionPanel } from '../src/app/ui/ActionPanel';

describe('ActionPanel', () => {
  it('renders export buttons', () => {
    render(
      <ActionPanel
        profileId="test-id"
        exportStatus=""
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText('JSON-LD')).toBeInTheDocument();
    expect(screen.getByText('VC Bundle')).toBeInTheDocument();
    expect(screen.getByText('PDF Snapshot')).toBeInTheDocument();
  });

  it('calls onExport with correct path', () => {
    const mockExport = vi.fn();
    render(
      <ActionPanel
        profileId="test-id"
        exportStatus=""
        onExport={mockExport}
      />,
    );

    fireEvent.click(screen.getByText('JSON-LD'));
    expect(mockExport).toHaveBeenCalledWith('jsonld');

    fireEvent.click(screen.getByText('VC Bundle'));
    expect(mockExport).toHaveBeenCalledWith('vc');

    fireEvent.click(screen.getByText('PDF Snapshot'));
    expect(mockExport).toHaveBeenCalledWith('pdf');
  });

  it('displays export status', () => {
    render(
      <ActionPanel
        profileId="test-id"
        exportStatus="Export complete!"
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText('Export complete!')).toBeInTheDocument();
  });

  it('shows generate identity button when no identity', () => {
    render(
      <ActionPanel
        profileId="test-id"
        exportStatus=""
        onExport={vi.fn()}
        onGenerateIdentity={vi.fn()}
      />,
    );

    expect(screen.getByText('Generate Identity')).toBeInTheDocument();
  });

  it('shows identity DID when present', () => {
    render(
      <ActionPanel
        profileId="test-id"
        exportStatus=""
        onExport={vi.fn()}
        identity={{ did: 'did:example:123' }}
        onMintIdentity={vi.fn()}
        onGenerateIdentity={vi.fn()}
      />,
    );

    expect(screen.getByText('did:example:123')).toBeInTheDocument();
    expect(screen.getByText('Mint Identity Proof')).toBeInTheDocument();
  });

  it('displays minted CID', () => {
    render(
      <ActionPanel
        profileId="test-id"
        exportStatus=""
        onExport={vi.fn()}
        identity={{ did: 'did:example:123' }}
        lastMintedCID="QmTest123"
        onMintIdentity={vi.fn()}
        onGenerateIdentity={vi.fn()}
      />,
    );

    expect(screen.getByText('QmTest123')).toBeInTheDocument();
  });
});
