/**
 * useProfileData Hook
 *
 * Fetches and manages profile CV data including:
 * - Master curriculum vitae
 * - CV entries with filtering
 * - Profile metadata
 */

import { useEffect, useState, useCallback } from 'react';
import type { CVEntry, Profile } from '@in-midst-my-life/schema';

interface CVFilter {
  includePersonae?: string[];
  excludePersonae?: string[];
  includeAetas?: string[];
  excludeAetas?: string[];
  includeScaenae?: string[];
  excludeScaenae?: string[];
  minPriority?: number;
  includeTags?: string[];
  excludeTags?: string[];
  offset?: number;
  limit?: number;
}

interface CVData {
  id?: string;
  profileId?: string;
  version?: number;
  entries: CVEntry[];
  total?: number;
  offset?: number;
  limit?: number;
}

interface UseProfileDataReturn {
  profile: Profile | null;
  cv: CVData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  filterEntries: (filter: CVFilter) => Promise<void>;
  addEntry: (entry: Omit<CVEntry, 'id'>) => Promise<CVEntry | null>;
  updateEntry: (id: string, patch: Partial<CVEntry>) => Promise<CVEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
}

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';

export function useProfileData(profileId: string | null): UseProfileDataReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cv, setCV] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);  // Start with loading=true since we auto-fetch on mount
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, cvRes] = await Promise.all([
        fetch(`${apiBase}/profiles/${profileId}`),
        fetch(`${apiBase}/profiles/${profileId}/cv`),
      ]);

      if (!profileRes.ok || !cvRes.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const profileData = await profileRes.json();
      const cvData = await cvRes.json();

      // Handle both { profile: ... } and { data: ... } response formats
      setProfile(profileData.profile ?? profileData.data ?? null);
      // Handle both direct CV response and nested { data: ... } format
      // Preserve exact response shape when possible
      const rawCv = cvData.data ?? cvData;
      // Only add pagination fields if they exist in the response
      const cvResult: CVData = {
        entries: rawCv.entries ?? [],
      };
      if (rawCv.id !== undefined) cvResult.id = rawCv.id;
      if (rawCv.profileId !== undefined) cvResult.profileId = rawCv.profileId;
      if (rawCv.version !== undefined) cvResult.version = rawCv.version;
      if (rawCv.total !== undefined) cvResult.total = rawCv.total;
      if (rawCv.offset !== undefined) cvResult.offset = rawCv.offset;
      if (rawCv.limit !== undefined) cvResult.limit = rawCv.limit;
      setCV(cvResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const filterEntries = useCallback(
    async (filter: CVFilter) => {
      if (!profileId) return;
      setLoading(true);
      try {
        // Use POST to /filter endpoint with filter as body
        const res = await fetch(`${apiBase}/profiles/${profileId}/cv/filter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filter),
        });
        if (!res.ok) throw new Error('Failed to filter entries');

        const data = await res.json();
        const entries = data.data ?? data.entries ?? [];
        setCV((prev) => ({
          ...prev,
          entries,
          total: data.total ?? entries.length,
        }));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [profileId],
  );

  const addEntry = useCallback(
    async (entry: Omit<CVEntry, 'id'>) => {
      if (!profileId) return null;
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/cv/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error('Failed to add entry');

        const data = await res.json();
        void fetchProfile();
        // Handle both { data: entry } and direct entry response formats
        // Check for entry-specific fields to distinguish from CV object
        if (data.data) return data.data;
        if (data.type !== undefined) return data;  // It's an entry, has type field
        return null;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [profileId, fetchProfile],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<CVEntry>) => {
      if (!profileId) return null;
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/cv/entries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update entry');

        const data = await res.json();
        void fetchProfile();
        // Handle both { data: entry } and direct entry response formats
        const result = data.data ?? (data.id ? data : null);
        return result;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [profileId, fetchProfile],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!profileId) return false;
      try {
        const res = await fetch(`${apiBase}/profiles/${profileId}/cv/entries/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete entry');
        void fetchProfile();
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [profileId, fetchProfile],
  );

  return {
    profile,
    cv,
    loading,
    error,
    refetch: fetchProfile,
    filterEntries,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
