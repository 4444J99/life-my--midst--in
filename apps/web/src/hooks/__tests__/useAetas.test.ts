import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAetas } from '../useAetas';
import type { Aetas } from '@in-midst-my-life/schema';

global.fetch = vi.fn();

const mockCanonicalAetas: Aetas[] = [
  {
    id: 'aetas-1',
    nomen: 'Initium',
    label: 'Initiation',
    age_range: '18-25',
    description: 'Beginning phase',
    capability_profile: { primary: ['learning'] },
    duration_years: 7,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'aetas-2',
    nomen: 'Emergens',
    label: 'Emergence',
    age_range: '25-32',
    description: 'Finding voice',
    capability_profile: { primary: ['expression'] },
    duration_years: 7,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockProfileAetas = [
  {
    id: 'aetas-1',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2024-01-01'),
  },
  {
    id: 'aetas-2',
    startDate: new Date('2024-01-01'),
  },
];

describe('useAetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { result } = renderHook(() => useAetas('profile-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.canonicalAetas).toEqual([]);
    expect(result.current.profileAetas).toEqual([]);
  });

  it('fetches canonical and profile aetas on mount', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canonicalAetas).toHaveLength(2);
    expect(result.current.profileAetas).toHaveLength(2);
  });

  it('provides all 8 canonical aetas definitions', async () => {
    const fullCanonicalAetas = Array.from({ length: 8 }, (_, i) => ({
      ...mockCanonicalAetas[0],
      id: `aetas-${i}`,
      label: `Stage ${i + 1}`,
    }));

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: fullCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: [] }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canonicalAetas).toHaveLength(8);
  });

  it('identifies current aetas from profile progression', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Current aetas should be the one without endDate
    expect(result.current.currentAetasId).toBe('aetas-2');
  });

  it('provides function to add aetas to profile', async () => {
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes('/profiles/profile-1/aetas') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'aetas-3',
            aetasId: 'aetas-3',
            startDate: new Date(),
          }),
        });
      }
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const added = await result.current.addAetas('aetas-3');
    expect(added).toBeDefined();
  });

  it('provides function to update aetas', async () => {
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes('/profiles/profile-1/aetas/aetas-1') && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            aetas: {
              id: 'aetas-1',
              startDate: new Date('2020-01-01'),
              endDate: new Date('2024-06-01'),
            },
          }),
        });
      }
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updated = await result.current.updateAetas('aetas-1', {
      endDate: new Date('2024-06-01'),
    });
    expect(updated).toBeDefined();
    expect(updated?.endDate).toBeDefined();
  });

  it('provides function to delete aetas', async () => {
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes('/profiles/profile-1/aetas/aetas-1') && options.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const deleted = await result.current.deleteAetas('aetas-1');
    expect(deleted).toBe(true);
  });

  it('calculates completed aetas from profile progression', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should identify completed aetas (those with endDate)
    expect(result.current.completedAetasIds).toContain('aetas-1');
    expect(result.current.completedAetasIds).not.toContain('aetas-2');
  });

  it('provides function to get aetas duration', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const duration = result.current.getAetasDuration('aetas-1');
    expect(duration).toBeDefined();
    expect(duration).toBeGreaterThan(0);
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.canonicalAetas).toHaveLength(0);
  });

  it('provides get current aetas function', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/taxonomy/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ aetas: mockCanonicalAetas }),
        });
      }
      if (url.includes('/profiles/profile-1/aetas')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profileAetas: mockProfileAetas }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useAetas('profile-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const current = result.current.getCurrentAetas();
    expect(current).toBeDefined();
    expect(current?.label).toBe('Emergence');
  });
});
