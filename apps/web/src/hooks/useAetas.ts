/**
 * useAetas Hook
 *
 * Manages aetas (life-stage) data including:
 * - Canonical aetas definitions (immutable 8-stage arc)
 * - Profile-specific aetas progression
 * - Create/update/delete operations
 */

import { useEffect, useState, useCallback } from 'react';
import type { Aetas } from '@in-midst-my-life/schema';

interface UseAetasReturn {
  canonicalAetas: Aetas[];
  profileAetas: Aetas[];
  currentAetasId: string | null;
  loading: boolean;
  error: string | null;
  addProfileAetas: (aetas: Omit<Aetas, 'id'>) => Promise<Aetas | null>;
  updateProfileAetas: (id: string, patch: Partial<Aetas>) => Promise<Aetas | null>;
  deleteProfileAetas: (id: string) => Promise<boolean>;
  setCurrentAetas: (id: string) => void;
  refetch: () => Promise<void>;
  // Aliases for test compatibility
  addAetas?: (aetas: Omit<Aetas, 'id'>) => Promise<Aetas | null>;
  updateAetas?: (id: string, patch: Partial<Aetas>) => Promise<Aetas | null>;
  deleteAetas?: (id: string) => Promise<boolean>;
  completedAetasIds?: string[];
  getAetasDuration?: (id: string) => number;
  getCurrentAetas?: () => string | null;
}

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';

export function useAetas(profileId: string | null): UseAetasReturn {
  const [canonicalAetas, setCanonicalAetas] = useState<Aetas[]>([]);
  const [profileAetas, setProfileAetas] = useState<Aetas[]>([]);
  const [currentAetasId, setCurrentAetasId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);  // Start loading since we auto-fetch
  const [error, setError] = useState<string | null>(null);

  const fetchAetas = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const [canonicalRes, profileRes] = await Promise.all([
        fetch(`${apiBase}/taxonomy/aetas`),
        fetch(`${apiBase}/profiles/${profileId}/aetas`),
      ]);

      if (!canonicalRes.ok || !profileRes.ok) {
        throw new Error('Failed to fetch aetas');
      }

      const canonicalData = await canonicalRes.json();
      const profileData = await profileRes.json();

      setCanonicalAetas(canonicalData.aetas ?? []);
      // Handle both response formats: { profileAetas: [...] } or { aetas: [...] }
      const pAetas = profileData.profileAetas ?? profileData.aetas ?? [];
      setProfileAetas(pAetas);

      // Determine current aetas - find the one WITHOUT endDate
      const currentAeta = pAetas.find((a: any) => !a.endDate);
      if (currentAeta) {
        setCurrentAetasId(currentAeta.id ?? currentAeta.aetasId ?? null);
      } else if (profileData.current_aetas) {
        // Fallback to explicit current_aetas field
        const found = pAetas.find((a: Aetas) => a.name === profileData.current_aetas);
        setCurrentAetasId(found?.id ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void fetchAetas();
  }, [fetchAetas]);

  const addProfileAetas = useCallback(
    async (aetas: Omit<Aetas, 'id'>) => {
      if (!profileId) return null;
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/aetas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aetas),
        });
        if (!res.ok) throw new Error('Failed to add aetas');

        const data = await res.json();
        void fetchAetas();
        return data.aetas ?? null;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [profileId, fetchAetas],
  );

  const updateProfileAetas = useCallback(
    async (id: string, patch: Partial<Aetas>) => {
      if (!profileId) return null;
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/aetas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update aetas');

        const data = await res.json();
        void fetchAetas();
        return data.aetas ?? null;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [profileId, fetchAetas],
  );

  const deleteProfileAetas = useCallback(
    async (id: string) => {
      if (!profileId) return false;
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/aetas/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete aetas');
        void fetchAetas();
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [profileId, fetchAetas],
  );

  return {
    canonicalAetas,
    profileAetas,
    currentAetasId,
    loading,
    error,
    addProfileAetas,
    updateProfileAetas,
    deleteProfileAetas,
    setCurrentAetas: setCurrentAetasId,
    refetch: fetchAetas,
    // Aliases for test compatibility
    addAetas: addProfileAetas,
    updateAetas: updateProfileAetas,
    deleteAetas: deleteProfileAetas,
    // Completed aetas are those WITH an endDate (finished stages)
    completedAetasIds: profileAetas.filter((a: any) => a.endDate !== undefined).map((a) => a.id ?? a.aetasId),
    getAetasDuration: (id: string) => {
      const aeta = canonicalAetas.find((a) => a.id === id);
      // Handle both duration_years and duration_months fields
      const years = (aeta as any)?.duration_years;
      if (years !== undefined) return years;
      return (aeta?.duration_months ?? 0) / 12;
    },
    // Return the actual Aetas object, not just the ID
    getCurrentAetas: () => {
      if (!currentAetasId) return null;
      const current = canonicalAetas.find((a) => a.id === currentAetasId);
      return current ?? null;
    },
  };
}
