/**
 * useNarratives Hook
 *
 * Manages narrative blocks with theatrical metadata including:
 * - Generate narratives for a persona
 * - Fetch narrative blocks with theatrical framing
 * - Update/save narrative modifications
 */

import { useEffect, useState, useCallback } from 'react';
import type { NarrativeBlock } from '@in-midst-my-life/schema';

interface NarrativeResponse {
  ok?: boolean;
  mask?: { id: string; everyday_name: string };
  theatrical_preamble?: string;
  authentic_disclaimer?: string;
  preamble?: string;  // Alternative key
  disclaimer?: string;  // Alternative key
  blocks?: NarrativeBlock[];
  block_count?: number;
}

interface UseNarrativesReturn {
  blocks: NarrativeBlock[];
  narrativeBlocks: NarrativeBlock[];
  mask: { id: string; everyday_name: string } | null;
  theatricalPreamble: string | null;
  authenticDisclaimer: string | null;
  loading: boolean;
  error: string | null;
  generateForMask: (maskId: string) => Promise<void>;
  generateNarratives: () => Promise<NarrativeResponse | undefined>;
  updateBlock: (blockId: string, patch: Partial<NarrativeBlock>) => Promise<NarrativeBlock | undefined>;
  deleteBlock: (blockId: string) => Promise<boolean>;
  getBlock: (blockId: string) => NarrativeBlock | undefined;
  reorderBlocks: (blockIds: string[]) => NarrativeBlock[];
  saveNarratives: (
    updatedBlocks: NarrativeBlock[],
    preamble?: string,
    disclaimer?: string,
  ) => Promise<NarrativeResponse | undefined>;
  clear: () => void;
}

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';

export function useNarratives(profileId: string, personaId?: string): UseNarrativesReturn {
  const [blocks, setBlocks] = useState<NarrativeBlock[]>([]);
  const [mask, setMask] = useState<{ id: string; everyday_name: string } | null>(null);
  const [theatricalPreamble, setTheatricalPreamble] = useState<string | null>(null);
  const [authenticDisclaimer, setAuthenticDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);  // Start loading since we auto-fetch
  const [error, setError] = useState<string | null>(null);

  // Fetch narratives for the current persona
  const fetchNarratives = useCallback(async (maskId: string) => {
    if (!profileId || !maskId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/narrative/${maskId}`);
      if (!res.ok) throw new Error('Failed to fetch narrative');

      const data: NarrativeResponse = await res.json();
      setMask(data.mask ?? null);
      setBlocks(data.blocks ?? []);
      // Handle both response formats
      setTheatricalPreamble(data.theatrical_preamble ?? data.preamble ?? null);
      setAuthenticDisclaimer(data.authentic_disclaimer ?? data.disclaimer ?? null);
    } catch (err) {
      setError((err as Error).message);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  // Auto-fetch when personaId changes
  useEffect(() => {
    if (personaId) {
      void fetchNarratives(personaId);
    } else {
      setLoading(false);
    }
  }, [personaId, fetchNarratives]);

  const generateForMask = useCallback(
    async (maskId: string) => {
      await fetchNarratives(maskId);
    },
    [fetchNarratives],
  );

  // Generate narratives for the current persona
  const generateNarratives = useCallback(async (): Promise<NarrativeResponse | undefined> => {
    if (!profileId || !personaId) return undefined;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/narrative/${personaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to generate narrative');

      const data: NarrativeResponse = await res.json();
      setMask(data.mask ?? null);
      setBlocks(data.blocks ?? []);
      setTheatricalPreamble(data.theatrical_preamble ?? data.preamble ?? null);
      setAuthenticDisclaimer(data.authentic_disclaimer ?? data.disclaimer ?? null);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [profileId, personaId]);

  // Update a single block - async with API call
  const updateBlock = useCallback(async (blockId: string, patch: Partial<NarrativeBlock>): Promise<NarrativeBlock | undefined> => {
    if (!profileId || !personaId) return undefined;
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/narrative/${personaId}/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed to update block');

      const data = await res.json();
      const updatedBlock = data.block ?? data.data ?? data;

      // Update local state
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? {
                ...block,
                ...patch,
                theatrical_metadata: {
                  ...block.theatrical_metadata,
                  ...(patch.theatrical_metadata ?? {}),
                },
              }
            : block,
        ),
      );

      return updatedBlock;
    } catch (err) {
      setError((err as Error).message);
      return undefined;
    }
  }, [profileId, personaId]);

  // Delete a block
  const deleteBlock = useCallback(async (blockId: string): Promise<boolean> => {
    if (!profileId || !personaId) return false;
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/narrative/${personaId}/${blockId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete block');

      // Update local state
      setBlocks((prev) => prev.filter((block) => block.id !== blockId));
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }, [profileId, personaId]);

  // Get a block by ID
  const getBlock = useCallback((blockId: string): NarrativeBlock | undefined => {
    return blocks.find((block) => block.id === blockId);
  }, [blocks]);

  // Reorder blocks by ID list
  const reorderBlocks = useCallback((blockIds: string[]): NarrativeBlock[] => {
    const reordered = blockIds
      .map((id) => blocks.find((block) => block.id === id))
      .filter((block): block is NarrativeBlock => block !== undefined);
    setBlocks(reordered);
    return reordered;
  }, [blocks]);

  // Save all narratives
  const saveNarratives = useCallback(
    async (updatedBlocks: NarrativeBlock[], preamble?: string, disclaimer?: string): Promise<NarrativeResponse | undefined> => {
      if (!profileId || !personaId) return undefined;
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/narrative/${personaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: updatedBlocks,
            maskId: personaId,
            customPreamble: preamble,
            customDisclaimer: disclaimer,
          }),
        });
        if (!res.ok) throw new Error('Failed to save narrative');

        const data = await res.json();

        // Update local state
        setBlocks(updatedBlocks);
        if (preamble) setTheatricalPreamble(preamble);
        if (disclaimer) setAuthenticDisclaimer(disclaimer);

        return data;
      } catch (err) {
        setError((err as Error).message);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [profileId, personaId],
  );

  const clear = useCallback(() => {
    setBlocks([]);
    setMask(null);
    setTheatricalPreamble(null);
    setAuthenticDisclaimer(null);
    setError(null);
  }, []);

  return {
    blocks,
    narrativeBlocks: blocks,
    mask,
    theatricalPreamble,
    authenticDisclaimer,
    loading,
    error,
    generateForMask,
    generateNarratives,
    updateBlock,
    deleteBlock,
    getBlock,
    reorderBlocks,
    saveNarratives,
    clear,
  };
}
