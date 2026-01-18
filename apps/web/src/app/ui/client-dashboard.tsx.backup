'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type {
  Profile,
  Experience,
  Education,
  Project,
  Skill,
  Publication,
  Award,
  Certification,
  SocialLink,
  ContentEdge,
  Mask,
  Stage,
  Epoch,
  IntegrityProof,
} from '@in-midst-my-life/schema';
import Image from 'next/image';
import {
  buildForcePositionMap,
  buildGraphNodes,
  buildNodePositionMap,
  type CvData,
  type GraphLayoutMode,
  type GraphNode,
} from './graph-utils';
import { MaskSelector } from '../../components/MaskSelector';
import { Hero } from '../../components/Hero';
import { Timeline } from '../../components/Timeline';
import { GraphView } from '../../components/GraphView';
import { NarrativePreview } from '../../components/NarrativePreview';
import { RelationshipBuilder } from '../../components/RelationshipBuilder';
import { TaxonomyEditor } from '../../components/TaxonomyEditor';
import { ImmersiveModal } from '../../components/ImmersiveModal';
import { ContentEditor } from '../../components/ContentEditor';
import { MermaidView } from '../../components/MermaidView';
import { KeyExportModal } from '../../components/KeyExportModal';
import type { EntityType } from '../../components/EntityForm';
import { useIdentity } from '../../hooks/use-identity';
import { VC } from '@in-midst-my-life/core';

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';
const orchBase = process.env['NEXT_PUBLIC_ORCH_BASE_URL'] || 'http://localhost:3002';
const graphLayoutMode = (process.env['NEXT_PUBLIC_GRAPH_LAYOUT'] || 'radial') as GraphLayoutMode;

type ErrorResponse = { message?: string; error?: string };

type Task = {
  id: string;
  description: string;
  status: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  offset?: number;
  limit?: number;
  total?: number;
  status?: string;
};

type HealthResponse = { status: string };
type TaskListResponse = { ok: boolean; data: Task[] };

export type NarrativeBlock = {
  title: string;
  body: string;
  tags?: string[];
};

export type NarrativeResponse = {
  ok: boolean;
  data?: NarrativeBlock[];
  narrativeId?: string;
  status?: string;
  meta?: Record<string, unknown>;
};

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

type BackupSummary = {
  id: string;
  profileId: string;
  label?: string;
  createdAt: string;
};

type BackupSnapshot = BackupSummary & {
  bundle?: Record<string, unknown>;
};

type AgentToken = {
  id: string;
  label?: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
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

type RestoreResponse = {
  ok: boolean;
  data?: {
    profileId: string;
    dryRun: boolean;
    summary: BundleSummary;
    snapshotId?: string;
  };
};

type TimelineEntry = {
  id: string;
  type: string;
  title: string;
  summary?: string;
  start: string;
  end?: string;
  tags?: string[];
  stageId?: string;
  settingId?: string;
};

type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  kind: 'image' | 'video' | 'fallback';
  integrity?: IntegrityProof;
  payload?: Record<string, unknown>;
  profileId?: string;
  entityType?: string;
};

const STAGE_MAP: Record<string, { stageId: string; settingId: string }> = {
  experience: { stageId: 'stage/construction', settingId: 'setting/production' },
  education: { stageId: 'stage/inquiry', settingId: 'setting/research' },
  project: { stageId: 'stage/design', settingId: 'setting/studio' },
  publication: { stageId: 'stage/transmission', settingId: 'setting/public' },
  award: { stageId: 'stage/transmission', settingId: 'setting/public' },
  certification: { stageId: 'stage/calibration', settingId: 'setting/lab' },
};

const SETTING_LABELS: Record<string, string> = {
  'setting/research': 'Research Lab',
  'setting/studio': 'Studio',
  'setting/production': 'Production Floor',
  'setting/lab': 'Calibration Lab',
  'setting/public': 'Public Stage',
  'setting/retreat': 'Reflection Space',
  'setting/arena': 'Negotiation Table',
  'setting/archive': 'Archive',
};

const stripMarkdown = (value?: string) =>
  value
    ? value
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/[`*_>#]/g, '')
        .replace(/\n+/g, ' ')
        .trim()
    : '';

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const formatBundleSummary = (summary?: BundleSummary) => {
  if (!summary) return 'No summary available';
  return `profile ${summary.profile}, exp ${summary.experiences}, projects ${summary.projects}, edges ${summary.edges}`;
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

export default function ClientDashboard() {
  const dashboardToken = process.env['NEXT_PUBLIC_DASHBOARD_TOKEN'];
  const [dashboardInput, setDashboardInput] = useState('');
  const [dashboardUnlocked, setDashboardUnlocked] = useState(!dashboardToken);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cvData, setCvData] = useState<CvData>(createEmptyCv());
  const [edges, setEdges] = useState<ContentEdge[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<string>('checking');
  const [orchHealth, setOrchHealth] = useState<string>('checking');
  const [orchMetrics, setOrchMetrics] = useState<Record<string, number>>({});
  const [timelineType, setTimelineType] = useState<string>('all');
  const [timelineTag, setTimelineTag] = useState<string>('all');
  const [timelineSetting, setTimelineSetting] = useState<string>('all');
  const [graphFilter, setGraphFilter] = useState<string[]>([]);
  const [immersiveItem, setImmersiveItem] = useState<GalleryItem | null>(null);
  const [relationshipStack, setRelationshipStack] = useState<GraphNode[]>([]);
  const [relationType, setRelationType] = useState<string>('advances');
  const [taxonomyMasks, setTaxonomyMasks] = useState<Mask[]>([]);
  const [taxonomyStages, setTaxonomyStages] = useState<Stage[]>([]);
  const [taxonomyEpochs, setTaxonomyEpochs] = useState<Epoch[]>([]);
  const [narrativeBlocks, setNarrativeBlocks] = useState<NarrativeBlock[]>([]);
  const [narrativeDraftId, setNarrativeDraftId] = useState<string>('');
  const [narrativeStatus, setNarrativeStatus] = useState<string>('');
  const [previewMaskId, setPreviewMaskId] = useState<string>('');
  const [previewContexts, setPreviewContexts] = useState<string>('design, architecture');
  const [previewTags, setPreviewTags] = useState<string>('impact, craft');
  const [exportStatus, setExportStatus] = useState<string>('');
  const [nodePositionMap, setNodePositionMap] = useState<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [importBundleText, setImportBundleText] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importDryRun, setImportDryRun] = useState<boolean>(false);
  const [restoreDryRun, setRestoreDryRun] = useState<boolean>(false);
  const [agentAccessEnabled, setAgentAccessEnabled] = useState<boolean>(false);
  const [agentTokens, setAgentTokens] = useState<AgentToken[]>([]);
  const [agentTokenLabel, setAgentTokenLabel] = useState<string>('');
  const [agentTokenStatus, setAgentTokenStatus] = useState<string>('');
  const [agentTokenValue, setAgentTokenValue] = useState<string>('');

  const {
    identity,
    generateIdentity,
    exportIdentityEncrypted,
    loading: identityLoading,
  } = useIdentity();
  const [showKeyExport, setShowKeyExport] = useState(false);
  const [exportedKey, setExportedKey] = useState('');
  const [lastMintedCID, setLastMintedCID] = useState('');

  const handleExportKey = async (passphrase: string) => { // allow-secret
    const key = await exportIdentityEncrypted(passphrase);
    setExportedKey(key);
  };

  const handleMintIdentity = async () => {
    if (!identity) return;
    try {
      const vc = await VC.issue(
        identity,
        {
          id: identity.did,
          name: profile?.displayName || 'Anonymous',
          timestamp: new Date().toISOString(),
        },
        ['IdentityProof'],
      );

      const cid = await VC.calculateCID(vc);
      setLastMintedCID(cid);
      console.log('Minted VC:', vc);
      console.log('CID:', cid);
    } catch (e) {
      console.error('Minting failed', e);
    }
  };

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
        getJson<TaskListResponse>(`${orchBase}/tasks`),
        getJson<HealthResponse>(`${apiBase}/health`),
        getJson<HealthResponse>(`${orchBase}/health`),
      ]);

      setProfiles(profilesRes.data ?? []);
      setTasks(tasksRes.data ?? []);
      setApiHealth(apiHealthRes.status ?? 'unknown');
      setOrchHealth(orchHealthRes.status ?? 'unknown');
      const firstProfile = profilesRes.data?.[0];
      if (firstProfile) {
        setProfileId((current) => current || firstProfile.id);
      }
      await loadMetrics();
      setStatus('ready');
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
          getJson<Envelope<Experience[]>>(
            `${apiBase}/profiles/${selected}/experiences?offset=0&limit=200`,
          ),
          getJson<Envelope<Education[]>>(
            `${apiBase}/profiles/${selected}/educations?offset=0&limit=200`,
          ),
          getJson<Envelope<Project[]>>(
            `${apiBase}/profiles/${selected}/projects?offset=0&limit=200`,
          ),
          getJson<Envelope<Skill[]>>(`${apiBase}/profiles/${selected}/skills?offset=0&limit=200`),
          getJson<Envelope<Publication[]>>(
            `${apiBase}/profiles/${selected}/publications?offset=0&limit=200`,
          ),
          getJson<Envelope<Award[]>>(`${apiBase}/profiles/${selected}/awards?offset=0&limit=200`),
          getJson<Envelope<Certification[]>>(
            `${apiBase}/profiles/${selected}/certifications?offset=0&limit=200`,
          ),
          getJson<Envelope<SocialLink[]>>(
            `${apiBase}/profiles/${selected}/social-links?offset=0&limit=200`,
          ),
          getJson<Envelope<ContentEdge[]>>(
            `${apiBase}/profiles/${selected}/graph/edges?offset=0&limit=400`,
          ),
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
        setBackupStatus('Failed to load backups.');
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

  useEffect(() => {
    void loadBase();
    void loadTaxonomies();
  }, [loadBase, loadTaxonomies]);

  useEffect(() => {
    if (!dashboardToken) return;
    const stored = sessionStorage.getItem('midst:dashboard:token');
    if (stored === dashboardToken) setDashboardUnlocked(true);
  }, [dashboardToken]);

  useEffect(() => {
    if (!profileId) return;
    void loadProfileData(profileId);
    void loadBackups(profileId);
    void loadAgentTokens(profileId);
  }, [loadAgentTokens, loadBackups, loadProfileData, profileId]);

  useEffect(() => {
    setAgentAccessEnabled(profile?.settings?.agentAccess?.enabled ?? false);
  }, [profile]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    cvData.experiences.forEach((exp) => {
      const map = STAGE_MAP['experience']!;
      entries.push({
        id: exp.id,
        type: 'experience',
        title: `${exp.roleTitle} @ ${exp.organization}`,
        summary: stripMarkdown(exp.descriptionMarkdown),
        start: exp.startDate,
        end: exp.endDate,
        tags: exp.tags ?? [],
        stageId: map.stageId,
        settingId: map.settingId,
      });
    });
    cvData.educations.forEach((edu) => {
      const map = STAGE_MAP['education']!;
      entries.push({
        id: edu.id,
        type: 'education',
        title: `${edu.institution}${edu.degree ? ` - ${edu.degree}` : ''}`,
        summary: stripMarkdown(edu.descriptionMarkdown),
        start: edu.startDate ?? '',
        end: edu.endDate,
        tags: edu.fieldOfStudy ? [edu.fieldOfStudy] : [],
        stageId: map.stageId,
        settingId: map.settingId,
      });
    });
    cvData.projects.forEach((project) => {
      const map = STAGE_MAP['project']!;
      entries.push({
        id: project.id,
        type: 'project',
        title: project.name,
        summary: stripMarkdown(project.descriptionMarkdown),
        start: project.startDate ?? project.createdAt,
        end: project.endDate,
        tags: project.tags ?? [],
        stageId: map.stageId,
        settingId: map.settingId,
      });
    });
    cvData.publications.forEach((pub) => {
      const map = STAGE_MAP['publication']!;
      entries.push({
        id: pub.id,
        type: 'publication',
        title: pub.title,
        summary: stripMarkdown(pub.abstractMarkdown),
        start: pub.date ?? pub.createdAt,
        tags: pub.authors ?? [],
        stageId: map.stageId,
        settingId: map.settingId,
      });
    });
    cvData.awards.forEach((award) => {
      const map = STAGE_MAP['award']!;
      entries.push({
        id: award.id,
        type: 'award',
        title: award.title,
        summary: stripMarkdown(award.descriptionMarkdown),
        start: award.date ?? award.createdAt,
        tags: award.issuer ? [award.issuer] : [],
        stageId: map.stageId,
        settingId: map.settingId,
      });
    });
    cvData.certifications.forEach((cert) => {
      const map = STAGE_MAP['certification']!;
      entries.push({
        id: cert.id,
        type: 'certification',
        title: cert.name,
        summary: cert.issuer,
        start: cert.issueDate ?? cert.createdAt,
        end: cert.expiryDate,
        tags: cert.credentialId ? [cert.credentialId] : [],
        stageId: map.stageId,
        settingId: map.settingId,
      });
    });
    return entries.sort((a, b) => (a.start < b.start ? 1 : -1));
  }, [cvData]);

  const timelineTypes = useMemo(() => {
    const types = new Set(timelineEntries.map((entry) => entry.type));
    return Array.from(types).sort();
  }, [timelineEntries]);

  const timelineTags = useMemo(() => {
    const tags = new Set<string>();
    timelineEntries.forEach((entry) => entry.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [timelineEntries]);

  const timelineSettings = useMemo(() => {
    const settings = new Set<string>();
    timelineEntries.forEach((entry) => {
      if (entry.settingId) settings.add(entry.settingId);
    });
    return Array.from(settings).sort();
  }, [timelineEntries]);

  const graphNodes = useMemo<GraphNode[]>(() => buildGraphNodes(cvData), [cvData]);

  const graphTypes = useMemo(() => {
    const types = new Set(graphNodes.map((node) => node.type));
    return Array.from(types).sort();
  }, [graphNodes]);

  const filteredGraphNodes = useMemo(() => {
    if (graphFilter.length === 0) return graphNodes;
    return graphNodes.filter((node) => graphFilter.includes(node.type));
  }, [graphFilter, graphNodes]);

  useEffect(() => {
    let canceled = false;
    const runLayout = async () => {
      if (graphLayoutMode === 'force') {
        const map = await buildForcePositionMap(filteredGraphNodes);
        if (!canceled) setNodePositionMap(map);
        return;
      }
      setNodePositionMap(buildNodePositionMap(filteredGraphNodes));
    };
    void runLayout();
    return () => {
      canceled = true;
    };
  }, [filteredGraphNodes]);

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const items: GalleryItem[] = [];
    cvData.projects.forEach((project) => {
      if (project.mediaGallery && project.mediaGallery.length > 0) {
        project.mediaGallery.forEach((media) => {
          items.push({
            id: media.id,
            title: media.title ?? project.name,
            description: media.description ?? project.subtitle ?? '',
            url: media.thumbnailUrl ?? media.url,
            kind: media.type === 'video' ? 'video' : 'image',
            integrity: project.integrity,
            payload: project as unknown as Record<string, unknown>,
            profileId: project.profileId,
            entityType: 'project',
          });
        });
      } else {
        items.push({
          id: project.id,
          title: project.name,
          description: project.subtitle ?? project.role ?? '',
          kind: 'fallback',
          integrity: project.integrity,
          payload: project as unknown as Record<string, unknown>,
          profileId: project.profileId,
          entityType: 'project',
        });
      }
    });
    if (items.length === 0 && profile?.coverImageUrl) {
      items.push({
        id: profile.id,
        title: profile.displayName,
        description: profile.headline ?? '',
        url: profile.coverImageUrl,
        kind: 'image',
        payload: profile as unknown as Record<string, unknown>,
      });
    }
    return items;
  }, [cvData.projects, profile]);

  const toggleGraphType = (type: string) => {
    setGraphFilter((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  };

  const handleDropToStack = (event: DragEvent<HTMLDivElement>, index?: number) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    const node = graphNodes.find((item) => item.id === id);
    if (!node) return;

    setRelationshipStack((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === id);
      const next = [...prev];
      if (existingIndex >= 0) next.splice(existingIndex, 1);
      if (index === undefined || index >= next.length) next.push(node);
      else next.splice(index, 0, node);
      return next;
    });
  };

  const saveRelationshipEdges = async () => {
    if (!profileId || relationshipStack.length < 2) return;
    const existing = new Set(
      edges.map((edge) => `${edge.fromId}:${edge.toId}:${edge.relationType}`),
    );
    const payloads = relationshipStack.slice(0, -1).map((from, idx) => {
      const to = relationshipStack[idx + 1]!;
      return {
        fromType: from.type,
        fromId: from.id,
        toType: to.type,
        toId: to.id,
        relationType,
        metadata: { source: 'admin-ui', index: idx },
      };
    });

    await Promise.all(
      payloads
        .filter(
          (payload) => !existing.has(`${payload.fromId}:${payload.toId}:${payload.relationType}`),
        )
        .map((payload) =>
          fetch(`${apiBase}/profiles/${profileId}/graph/edges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        ),
    );
    setRelationshipStack([]);
    void loadProfileData(profileId);
  };

  const updateMask = async (mask: Mask) => {
    try {
      const updated = await getJson<Envelope<Mask>>(`${apiBase}/taxonomy/masks/${mask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mask),
      });
      if (updated.data) {
        setTaxonomyMasks((prev) =>
          prev.map((item) => (item.id === mask.id ? updated.data! : item)),
        );
      }
    } catch (err) {
      console.error('Mask update failed', err);
    }
  };

  const updateStage = async (stage: Stage) => {
    try {
      const updated = await getJson<Envelope<Stage>>(`${apiBase}/taxonomy/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage),
      });
      if (updated.data) {
        setTaxonomyStages((prev) =>
          prev.map((item) => (item.id === stage.id ? updated.data! : item)),
        );
      }
    } catch (err) {
      console.error('Stage update failed', err);
    }
  };

  const updateEpoch = async (epoch: Epoch) => {
    try {
      const updated = await getJson<Envelope<Epoch>>(`${apiBase}/taxonomy/epochs/${epoch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epoch),
      });
      if (updated.data) {
        setTaxonomyEpochs((prev) =>
          prev.map((item) => (item.id === epoch.id ? updated.data! : item)),
        );
      }
    } catch (err) {
      console.error('Epoch update failed', err);
    }
  };

  const refreshNarrativePreview = async () => {
    if (!profileId) return;
    const payload = {
      maskId: previewMaskId || undefined,
      contexts: splitList(previewContexts),
      tags: splitList(previewTags),
      timeline: timelineEntries.slice(0, 25).map((entry) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        start: entry.start,
        end: entry.end,
        tags: entry.tags,
        stageId: entry.stageId,
      })),
    };
    try {
      const response = await getJson<NarrativeResponse>(
        `${apiBase}/profiles/${profileId}/narrative`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      setNarrativeBlocks(response.data ?? []);
      setNarrativeDraftId(response.narrativeId ?? '');
      setNarrativeStatus(response.status ?? '');
    } catch (err) {
      console.error(err);
    }
  };

  const approveNarrative = async () => {
    if (!profileId || !narrativeDraftId) return;
    try {
      const res = await fetch(
        `${apiBase}/profiles/${profileId}/narratives/${narrativeDraftId}/approve`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      );
      if (!res.ok) throw new Error('Approval failed');
      setNarrativeStatus('approved');
    } catch (err) {
      console.error(err);
    }
  };

  const saveNarrativeDraft = async (blocks: NarrativeBlock[], revisionNote?: string) => {
    if (!profileId || !narrativeDraftId) return;
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/narratives/${narrativeDraftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, revisionNote }),
      });
      if (!res.ok) throw new Error('Draft update failed');
      const payload = (await res.json()) as {
        data?: { blocks?: NarrativeBlock[]; status?: string };
      };
      if (payload.data?.blocks) setNarrativeBlocks(payload.data.blocks);
      if (payload.data?.status) setNarrativeStatus(payload.data.status);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadExport = async (path: string) => {
    if (!profileId) return;
    setExportStatus(`Preparing ${path} export...`);
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/export/${path}`);
      if (!res.ok) throw new Error(`Export failed with ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      link.href = url;
      link.download = filenameMatch?.[1] ?? `profile-${profileId}-${path}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportStatus('Export ready.');
    } catch (err) {
      setExportStatus((err as Error).message ?? 'Export failed');
    }
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setImportBundleText(typeof result === 'string' ? result : '');
      setImportStatus(`Loaded ${file.name}.`);
    };
    reader.onerror = () => {
      setImportStatus('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!profileId) {
      setImportStatus('Select a profile before importing.');
      return;
    }
    if (!importBundleText.trim()) {
      setImportStatus('Paste or upload a JSON-LD bundle to import.');
      return;
    }
    let bundle: Record<string, unknown>;
    try {
      bundle = JSON.parse(importBundleText) as Record<string, unknown>;
    } catch {
      setImportStatus('Invalid JSON payload.');
      return;
    }

    setImportStatus(importDryRun ? 'Validating bundle...' : 'Importing bundle...');
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/import/jsonld`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: importMode, dryRun: importDryRun, bundle }),
      });
      const payload = (await res.json()) as ImportResponse & ErrorResponse;
      if (!res.ok || !payload.ok) {
        setImportStatus(payload.message ?? payload.error ?? 'Import failed.');
        return;
      }
      setImportStatus(
        `${importDryRun ? 'Validation' : 'Import'} complete: ${formatBundleSummary(payload.data?.summary)}`,
      );
      if (!importDryRun) {
        void loadProfileData(profileId);
        void loadBackups(profileId);
      }
    } catch (err) {
      setImportStatus((err as Error).message ?? 'Import failed.');
    }
  };

  const createBackup = async () => {
    if (!profileId) return;
    setBackupStatus('Creating snapshot...');
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/backup`, { method: 'POST' });
      const payload = (await res.json()) as Envelope<BackupSnapshot> & ErrorResponse;
      if (!res.ok || !payload.ok) {
        setBackupStatus(payload.message ?? payload.error ?? 'Backup failed.');
        return;
      }
      setBackupStatus('Snapshot created.');
      void loadBackups(profileId);
    } catch (err) {
      setBackupStatus((err as Error).message ?? 'Backup failed.');
    }
  };

  const restoreBackup = async (snapshotId: string) => {
    if (!profileId) return;
    setBackupStatus(restoreDryRun ? 'Validating restore...' : 'Restoring snapshot...');
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId, dryRun: restoreDryRun }),
      });
      const payload = (await res.json()) as RestoreResponse & ErrorResponse;
      if (!res.ok || !payload.ok) {
        setBackupStatus(payload.message ?? payload.error ?? 'Restore failed.');
        return;
      }
      setBackupStatus(
        `${restoreDryRun ? 'Restore validation' : 'Restore'} complete: ${formatBundleSummary(payload.data?.summary)}`,
      );
      if (!restoreDryRun) {
        void loadProfileData(profileId);
        void loadBackups(profileId);
      }
    } catch (err) {
      setBackupStatus((err as Error).message ?? 'Restore failed.');
    }
  };

  const toggleAgentAccess = async (enabled: boolean) => {
    if (!profileId || !profile) return;
    try {
      const nextSettings = {
        ...(profile.settings ?? { visibility: 'private', sectionOrder: { sections: [] } }),
        agentAccess: {
          ...(profile.settings?.agentAccess ?? {}),
          enabled,
        },
      };
      const res = await fetch(`${apiBase}/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      if (!res.ok) throw new Error('Failed to update agent access');
      setAgentAccessEnabled(enabled);
    } catch (err) {
      console.error(err);
    }
  };

  const createAgentToken = async () => {
    if (!profileId) return;
    setAgentTokenStatus('Creating token...');
    setAgentTokenValue('');
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/agent-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: agentTokenLabel, scopes: ['agent:query'] }),
      });
      if (!res.ok) throw new Error('Token creation failed');
      const payload = (await res.json()) as { data?: { token?: string } };
      if (payload.data?.token) {
        setAgentTokenValue(payload.data.token);
        setAgentTokenStatus('Token created. Copy and store securely.');
      }
      void loadAgentTokens(profileId);
    } catch (err) {
      setAgentTokenStatus((err as Error).message);
    }
  };

  const revokeAgentToken = async (tokenId: string) => {
    if (!profileId) return;
    try {
      const res = await fetch(`${apiBase}/profiles/${profileId}/agent-tokens/${tokenId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Token revoke failed');
      void loadAgentTokens(profileId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGraphNodeClick = (node: GraphNode) => {
    setImmersiveItem({
      id: node.id,
      title: node.label,
      description: node.subtitle ?? node.type,
      kind: 'fallback',
    });
  };

  const mermaidChart = useMemo(() => {
    if (graphNodes.length === 0) return '';
    const nodeDefs = graphNodes
      .map((n) => {
        const safeId = n.id.replace(/-/g, '_');
        const safeLabel = n.label.replace(/"/g, "'");
        return `${safeId}["${safeLabel}"]`;
      })
      .join('\n');

    const edgeDefs = edges
      .map((e) => {
        const safeFrom = e.fromId.replace(/-/g, '_');
        const safeTo = e.toId.replace(/-/g, '_');
        return `${safeFrom} -->|${e.relationType}| ${safeTo}`;
      })
      .join('\n');

    return `graph TD\n${nodeDefs}\n${edgeDefs}`;
  }, [graphNodes, edges]);

  const handleCreateEntity = async (type: EntityType, data: Record<string, unknown>) => {
    if (!profileId) return;
    const endpointMap: Record<EntityType, string> = {
      experience: 'experiences',
      project: 'projects',
      education: 'educations',
      skill: 'skills',
    };
    try {
      // Add defaults required by schema if missing
      const payload = { ...data, isCurrent: false, isPrimary: false, isOngoing: false };
      await fetch(`${apiBase}/profiles/${profileId}/${endpointMap[type]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      void loadProfileData(profileId);
    } catch (err) {
      console.error('Failed to create entity', err);
    }
  };

  const handleDeleteEntity = async (type: EntityType, id: string) => {
    if (!profileId) return;
    const endpointMap: Record<EntityType, string> = {
      experience: 'experiences',
      project: 'projects',
      education: 'educations',
      skill: 'skills',
    };
    try {
      await fetch(`${apiBase}/profiles/${profileId}/${endpointMap[type]}/${id}`, {
        method: 'DELETE',
      });
      void loadProfileData(profileId);
    } catch (err) {
      console.error('Failed to delete entity', err);
    }
  };

  const [githubUsername, setGithubUsername] = useState<string>('');
  const [ingestStatus, setIngestStatus] = useState<string>('');
  const [resumeTitle, setResumeTitle] = useState<string>('Resume Import');
  const [resumeText, setResumeText] = useState<string>('');
  const [resumeStatus, setResumeStatus] = useState<string>('');

  const [crawlPath, setCrawlPath] = useState<string>('/app');
  const [crawlFilters, setCrawlFilters] = useState<string>('.ts,.tsx,.md');
  const [crawlStatus, setCrawlStatus] = useState<string>('');

  const triggerIngest = async () => {
    if (!githubUsername) return;
    setIngestStatus('Triggering ingest...');
    try {
      const res = await fetch(`${orchBase}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `ingest-${Date.now()}`,
          role: 'ingestor',
          description: `Ingest GitHub repos for ${githubUsername}`,
          payload: { username: githubUsername, source: 'github', profileId },
        }),
      });
      if (!res.ok) throw new Error('Ingest failed');
      setIngestStatus('Ingest task queued. Check Orchestrator Queue.');
    } catch (err) {
      setIngestStatus((err as Error).message);
    }
  };

  const triggerCrawl = async () => {
    if (!crawlPath) return;
    setCrawlStatus('Triggering crawl...');
    try {
      const res = await fetch(`${orchBase}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `crawl-${Date.now()}`,
          role: 'crawler',
          description: `Crawl ${crawlPath} for project artifacts`,
          payload: {
            basePath: crawlPath,
            filters: splitList(crawlFilters),
            depth: 5,
          },
        }),
      });
      if (!res.ok) throw new Error('Crawl failed');
      setCrawlStatus('Crawl task enqueued.');
    } catch (err) {
      setCrawlStatus((err as Error).message);
    }
  };

  const triggerResumeIngest = async () => {
    if (!resumeText || !profileId) return;
    setResumeStatus('Triggering resume ingest...');
    try {
      const res = await fetch(`${orchBase}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `resume-${Date.now()}`,
          role: 'ingestor',
          description: `Ingest resume: ${resumeTitle}`,
          payload: { source: 'resume', resumeText, resumeTitle, profileId },
        }),
      });
      if (!res.ok) throw new Error('Resume ingest failed');
      setResumeStatus('Resume ingest task queued.');
    } catch (err) {
      setResumeStatus((err as Error).message);
    }
  };

  if (dashboardToken && !dashboardUnlocked) {
    return (
      <main
        className="page"
        style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 1.5rem' }}
      >
        <h1 style={{ marginBottom: '0.5rem' }}>Dashboard Access</h1>
        <p className="section-subtitle">Enter the access token to unlock the private dashboard.</p>
        <input
          className="input"
          type="password"
          value={dashboardInput}
          onChange={(event) => setDashboardInput(event.target.value)}
          placeholder="Access token"
        />
        <div className="hero-actions" style={{ marginTop: '1rem' }}>
          <button
            className="button"
            onClick={() => {
              if (dashboardInput === dashboardToken) {
                sessionStorage.setItem('midst:dashboard:token', dashboardInput);
                setDashboardUnlocked(true);
              }
            }}
          >
            Unlock
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <Hero
        profiles={profiles}
        profileId={profileId}
        setProfileId={setProfileId}
        profile={profile}
        apiHealth={apiHealth}
        orchHealth={orchHealth}
        taskCount={tasks.length}
        edgeCount={edges.length}
        onRefresh={loadBase}
        onReloadProfile={() => void loadProfileData(profileId)}
        apiBase={apiBase}
      />

      {error ? (
        <section className="section">
          <h2 className="section-title">Status</h2>
          <p className="section-subtitle">Dashboard state: {status}</p>
          <strong>{error}</strong>
        </section>
      ) : null}

      <MaskSelector value={previewMaskId} onChange={setPreviewMaskId} />

      <Timeline
        entries={timelineEntries}
        types={timelineTypes}
        tags={timelineTags}
        settings={timelineSettings}
        settingLabels={SETTING_LABELS}
        selectedType={timelineType}
        selectedTag={timelineTag}
        selectedSetting={timelineSetting}
        onTypeChange={setTimelineType}
        onTagChange={setTimelineTag}
        onSettingChange={setTimelineSetting}
      />

      <GraphView
        nodes={filteredGraphNodes}
        edges={edges}
        types={graphTypes}
        filter={graphFilter}
        onToggleType={toggleGraphType}
        onResetFilter={() => setGraphFilter([])}
        nodePositionMap={nodePositionMap}
        onNodeClick={handleGraphNodeClick}
      />

      <section className="section">
        <h2 className="section-title">Architectural View</h2>
        <p className="section-subtitle">Visual dependency graph (Mermaid.js).</p>
        <MermaidView chart={mermaidChart} />
      </section>

      <section className="section">
        <h2 className="section-title">Gallery + Immersive Mode</h2>
        <p className="section-subtitle">
          Visual artifacts, project media, and cover imagery. Click to open immersive mode.
        </p>
        <div className="gallery">
          {galleryItems.map((item) => (
            <div
              key={item.id}
              className="gallery-card"
              onClick={() => setImmersiveItem(item)}
              role="button"
              tabIndex={0}
            >
              {item.kind === 'image' && item.url ? (
                <Image
                  src={item.url}
                  alt={item.title}
                  width={300}
                  height={140}
                  style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    height: '140px',
                    background:
                      'linear-gradient(135deg, rgba(211, 107, 60, 0.3), rgba(47, 94, 100, 0.3))',
                  }}
                />
              )}
              <div className="caption">
                <strong>{item.title}</strong>
                <div className="section-subtitle">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Export Pipeline</h2>
        <p className="section-subtitle">
          Generate JSON-LD, verifiable credential bundles, and PDF snapshots.
        </p>
        <div className="hero-actions">
          <button className="button" onClick={() => void downloadExport('jsonld')}>
            JSON-LD
          </button>
          <button className="button secondary" onClick={() => void downloadExport('vc')}>
            VC Bundle
          </button>
          <button className="button ghost" onClick={() => void downloadExport('pdf')}>
            PDF Snapshot
          </button>
          {exportStatus ? <span className="section-subtitle">{exportStatus}</span> : null}
        </div>
      </section>

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
              onChange={(event) => setImportBundleText(event.target.value)}
            />
            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
              <label className="label">Import Mode</label>
              <select
                className="input"
                value={importMode}
                onChange={(event) => setImportMode(event.target.value as 'merge' | 'replace')}
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
                  onChange={(event) => setImportDryRun(event.target.checked)}
                />
                Dry-run import
              </label>
            </div>
            <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
              <button className="button" onClick={() => void runImport()}>
                Run Import
              </button>
              <label className="button ghost" style={{ cursor: 'pointer' }}>
                Load JSON-LD
                <input
                  type="file"
                  accept="application/json,application/ld+json"
                  onChange={handleImportFile}
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
              <button className="button secondary" onClick={() => void createBackup()}>
                Create Snapshot
              </button>
              <button className="button ghost" onClick={() => void loadBackups(profileId)}>
                Refresh
              </button>
            </div>
            <label
              className="label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              <input
                type="checkbox"
                checked={restoreDryRun}
                onChange={(event) => setRestoreDryRun(event.target.checked)}
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
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <strong>{new Date(backup.createdAt).toLocaleString()}</strong>
                      <div className="section-subtitle">{backup.label ?? 'Manual snapshot'}</div>
                    </div>
                    <button className="button ghost" onClick={() => void restoreBackup(backup.id)}>
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

      <section className="section">
        <h2 className="section-title">Admin Studio</h2>

        <p className="section-subtitle">
          Curate edges, update mask/stage taxonomies, and preview narrative blocks.
        </p>

        <div className="editor-grid">
          <RelationshipBuilder
            relationshipStack={relationshipStack}
            availableNodes={graphNodes}
            relationType={relationType}
            setRelationType={setRelationType}
            onDropToStack={handleDropToStack}
            onClear={() => setRelationshipStack([])}
            onSave={() => void saveRelationshipEdges()}
            edges={edges}
          />

          <TaxonomyEditor
            masks={taxonomyMasks}
            stages={taxonomyStages}
            epochs={taxonomyEpochs}
            onUpdateMask={(mask) => {
              void updateMask(mask);
            }}
            onUpdateStage={(stage) => {
              void updateStage(stage);
            }}
            onUpdateEpoch={(epoch) => {
              void updateEpoch(epoch);
            }}
            setMasks={setTaxonomyMasks}
            setStages={setTaxonomyStages}
            setEpochs={setTaxonomyEpochs}
          />
          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>GitHub Ingest</h3>
            <p className="section-subtitle">
              Fetch repositories and map them to your project ledger.
            </p>
            <input
              className="input"
              placeholder="GitHub Username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
            />
            <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
              <button className="button" onClick={() => void triggerIngest()}>
                Start Ingest
              </button>
            </div>
            {ingestStatus ? (
              <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
                {ingestStatus}
              </div>
            ) : null}
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
              onChange={(e) => setResumeTitle(e.target.value)}
            />
            <textarea
              className="input"
              rows={6}
              placeholder="Paste resume text..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
              <button className="button" onClick={() => void triggerResumeIngest()}>
                Parse Resume
              </button>
            </div>
            {resumeStatus ? (
              <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
                {resumeStatus}
              </div>
            ) : null}
          </div>

          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>Agent Access</h3>
            <p className="section-subtitle">
              Issue scoped tokens for external agents to query this profile.
            </p>
            <label
              className="label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <input
                type="checkbox"
                checked={agentAccessEnabled}
                onChange={(event) => toggleAgentAccess(event.target.checked)}
              />
              Enable agent queries
            </label>
            <input
              className="input"
              placeholder="Token label (optional)"
              value={agentTokenLabel}
              onChange={(event) => setAgentTokenLabel(event.target.value)}
            />
            <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
              <button className="button" onClick={() => void createAgentToken()}>
                Create Token
              </button>
              {agentTokenStatus ? (
                <span className="section-subtitle">{agentTokenStatus}</span>
              ) : null}
            </div>
            {agentTokenValue ? (
              <textarea
                readOnly
                className="input"
                value={agentTokenValue}
                style={{ marginTop: '0.75rem', fontFamily: 'monospace' }}
              />
            ) : null}
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
                    <button
                      className="button ghost"
                      onClick={() => void revokeAgentToken(token.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
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
                onChange={(e) => setCrawlPath(e.target.value)}
              />
              <input
                className="input"
                placeholder="Filters (e.g. .ts,.md)"
                value={crawlFilters}
                onChange={(e) => setCrawlFilters(e.target.value)}
              />
            </div>
            <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
              <button className="button" onClick={() => void triggerCrawl()}>
                Start Crawl
              </button>
            </div>
            {crawlStatus ? (
              <div className="section-subtitle" style={{ marginTop: '0.75rem' }}>
                {crawlStatus}
              </div>
            ) : null}
          </div>

          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>Identity Vault</h3>
            <p className="section-subtitle">Manage your DID and cryptographic keys.</p>
            {identityLoading ? (
              <div className="section-subtitle">Loading identity...</div>
            ) : identity ? (
              <div>
                <div className="section-subtitle" style={{ wordBreak: 'break-all' }}>
                  <strong>DID:</strong> {identity.did}
                </div>
                <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
                  <button className="button secondary" onClick={() => setShowKeyExport(true)}>
                    Export Private Key
                  </button>
                  <button className="button ghost" onClick={() => void generateIdentity()}>
                    Regenerate
                  </button>
                  <button className="button" onClick={() => void handleMintIdentity()}>
                    Mint Identity Proof
                  </button>
                </div>
                {lastMintedCID ? (
                  <div
                    className="section-subtitle"
                    style={{ marginTop: '0.5rem', color: 'var(--accent)' }}
                  >
                    <strong>Latest CID:</strong> {lastMintedCID}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
                <button className="button" onClick={() => void generateIdentity()}>
                  Generate Identity
                </button>
              </div>
            )}
          </div>
        </div>

        <NarrativePreview
          maskId={previewMaskId}
          setMaskId={setPreviewMaskId}
          contexts={previewContexts}
          setContexts={setPreviewContexts}
          tags={previewTags}
          setTags={setPreviewTags}
          masks={taxonomyMasks}
          blocks={narrativeBlocks}
          draftId={narrativeDraftId}
          status={narrativeStatus}
          onGenerate={() => void refreshNarrativePreview()}
          onClear={() => {
            setNarrativeBlocks([]);
            setNarrativeDraftId('');
            setNarrativeStatus('');
          }}
          onApprove={() => void approveNarrative()}
          onSaveDraft={(blocks, note) => void saveNarrativeDraft(blocks, note)}
        />
        <ContentEditor
          experiences={cvData.experiences}
          projects={cvData.projects}
          educations={cvData.educations}
          skills={cvData.skills}
          onCreate={handleCreateEntity}
          onDelete={handleDeleteEntity}
        />
      </section>

      <section className="section">
        <h2 className="section-title">Orchestrator Queue</h2>
        <p className="section-subtitle">Recent tasks and orchestration counters.</p>
        {tasks.length === 0 ? (
          <div className="stat-card">
            {status === 'loading'
              ? 'Loading tasks...'
              : 'No tasks yet. Trigger via orchestrator webhook or POST /tasks.'}
          </div>
        ) : (
          <div className="grid two">
            {tasks.slice(0, 6).map((task) => (
              <div key={task.id} className="stat-card">
                <div className="stat-label">{task.status}</div>
                <div className="stat-value">{task.description}</div>
              </div>
            ))}
          </div>
        )}
        {Object.keys(orchMetrics).length > 0 ? (
          <div className="chip-row" style={{ marginTop: '0.75rem' }}>
            <span className="chip">
              Dispatched {orchMetrics['orchestrator_tasks_dispatched'] ?? 0}
            </span>
            <span className="chip">
              Completed {orchMetrics['orchestrator_tasks_completed'] ?? 0}
            </span>
            <span className="chip">Failed {orchMetrics['orchestrator_tasks_failed'] ?? 0}</span>
            <span className="chip">Retries {orchMetrics['orchestrator_tasks_retries'] ?? 0}</span>
          </div>
        ) : null}
      </section>

      <KeyExportModal
        open={showKeyExport}
        did={identity?.did}
        exportPayload={exportedKey}
        reauthToken={dashboardToken}
        onClose={() => {
          setShowKeyExport(false);
          setExportedKey('');
        }}
        onExport={(passphrase) => void handleExportKey(passphrase)}
      />

      <ImmersiveModal item={immersiveItem} onClose={() => setImmersiveItem(null)} />
    </main>
  );
}
