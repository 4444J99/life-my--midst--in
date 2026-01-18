import { useState, useCallback } from 'react';
import type { Profile, ContentEdge, Mask, Stage, Epoch } from '@in-midst-my-life/schema';
import type { CvData } from '../app/ui/graph-utils';

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';
const orchBase = process.env['NEXT_PUBLIC_ORCH_BASE_URL'] || 'http://localhost:3002';

type Task = { id: string; description: string; status: string };
type Envelope<T> = { ok: boolean; data?: T; offset?: number; limit?: number; total?: number; status?: string };
type BackupSummary = { id: string; profileId: string; label?: string; createdAt: string };
type AgentToken = {
  id: string;
  label?: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

const createEmptyCv = (): CvData => ({
  experiences: [],
  educations: [],
  projects: [],
  skills: [],
  publications: [],
  awards: [],
  certifications: [],
  socialLinks: [],
});

export function useDashboardData() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cvData, setCvData] = useState<CvData>(createEmptyCv());
  const [edges, setEdges] = useState<ContentEdge[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<string>('checking');
  const [orchHealth, setOrchHealth] = useState<string>('checking');
  const [orchMetrics, setOrchMetrics] = useState<Record<string, number>>({});
  const [taxonomyMasks, setTaxonomyMasks] = useState<Mask[]>([]);
  const [taxonomyStages, setTaxonomyStages] = useState<Stage[]>([]);
  const [taxonomyEpochs, setTaxonomyEpochs] = useState<Epoch[]>([]);
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [agentTokens, setAgentTokens] = useState<AgentToken[]>([]);

  const getJson = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return (await res.json()) as T;
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const metricsRes = await fetch(`${orchBase}/metrics`);
      if (!metricsRes.ok) return;
      const metricsText = await metricsRes.text();
      const metricsMap: Record<string, number> = {};
      metricsText.split('\n').forEach((line) => {
        if (!line || line.startsWith('#')) return;
        const [key, value] = line.split(' ');
        if (key && value) metricsMap[key] = Number(value);
      });
      setOrchMetrics(metricsMap);
    } catch (err) {
      console.warn('metrics unavailable', err);
    }
  }, []);

  const loadBase = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [profilesRes, tasksRes, apiHealthRes, orchHealthRes] = await Promise.all([
        getJson<Envelope<Profile[]>>(`${apiBase}/profiles`),
        getJson<{ ok: boolean; data: Task[] }>(`${orchBase}/tasks`),
        getJson<{ status: string }>(`${apiBase}/health`),
        getJson<{ status: string }>(`${orchBase}/health`),
      ]);

      setProfiles(profilesRes.data ?? []);
      setTasks(tasksRes.data ?? []);
      setApiHealth(apiHealthRes.status ?? 'unknown');
      setOrchHealth(orchHealthRes.status ?? 'unknown');
      await loadMetrics();
      setStatus('ready');
      return profilesRes.data?.[0]?.id;
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? 'Failed to load data');
      setStatus('error');
    }
  }, [getJson, loadMetrics]);

  const loadTaxonomies = useCallback(async () => {
    try {
      const [masksRes, epochsRes, stagesRes] = await Promise.all([
        getJson<Envelope<Mask[]>>(`${apiBase}/taxonomy/masks?offset=0&limit=200`),
        getJson<Envelope<Epoch[]>>(`${apiBase}/taxonomy/epochs`),
        getJson<Envelope<Stage[]>>(`${apiBase}/taxonomy/stages?offset=0&limit=200`),
      ]);
      setTaxonomyMasks(masksRes.data ?? []);
      setTaxonomyEpochs(epochsRes.data ?? []);
      setTaxonomyStages(stagesRes.data ?? []);
    } catch (err) {
      console.warn('taxonomy load failed', err);
    }
  }, [getJson]);

  const loadProfileData = useCallback(
    async (selected: string) => {
      try {
        const [
          profileRes,
          experiencesRes,
          educationsRes,
          projectsRes,
          skillsRes,
          publicationsRes,
          awardsRes,
          certificationsRes,
          socialLinksRes,
          edgesRes,
        ] = await Promise.all([
          getJson<Envelope<Profile>>(`${apiBase}/profiles/${selected}`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/experiences?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/educations?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/projects?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/skills?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/publications?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/awards?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/certifications?offset=0&limit=200`),
          getJson<Envelope<any[]>>(`${apiBase}/profiles/${selected}/social-links?offset=0&limit=200`),
          getJson<Envelope<ContentEdge[]>>(`${apiBase}/profiles/${selected}/graph/edges?offset=0&limit=400`),
        ]);

        setProfile(profileRes.data ?? null);
        setCvData({
          experiences: experiencesRes.data ?? [],
          educations: educationsRes.data ?? [],
          projects: projectsRes.data ?? [],
          skills: skillsRes.data ?? [],
          publications: publicationsRes.data ?? [],
          awards: awardsRes.data ?? [],
          certifications: certificationsRes.data ?? [],
          socialLinks: socialLinksRes.data ?? [],
        });
        setEdges(edgesRes.data ?? []);
      } catch (err) {
        console.error(err);
      }
    },
    [getJson],
  );

  const loadBackups = useCallback(
    async (selected: string) => {
      try {
        const res = await getJson<Envelope<BackupSummary[]>>(
          `${apiBase}/profiles/${selected}/backups?offset=0&limit=20`,
        );
        setBackups(res.data ?? []);
      } catch (err) {
        console.warn('backup load failed', err);
      }
    },
    [getJson],
  );

  const loadAgentTokens = useCallback(
    async (selected: string) => {
      try {
        const res = await getJson<Envelope<AgentToken[]>>(
          `${apiBase}/profiles/${selected}/agent-tokens`,
        );
        setAgentTokens(res.data ?? []);
      } catch (err) {
        console.warn('agent tokens load failed', err);
      }
    },
    [getJson],
  );

  return {
    profiles,
    profile,
    cvData,
    edges,
    tasks,
    status,
    error,
    apiHealth,
    orchHealth,
    orchMetrics,
    taxonomyMasks,
    setTaxonomyMasks,
    taxonomyStages,
    setTaxonomyStages,
    taxonomyEpochs,
    setTaxonomyEpochs,
    backups,
    agentTokens,
    setAgentTokens,
    loadBase,
    loadTaxonomies,
    loadProfileData,
    loadBackups,
    loadAgentTokens,
  };
}
