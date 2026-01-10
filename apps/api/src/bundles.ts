import type {
  Profile,
  Experience,
  Education,
  Project,
  Skill,
  Publication,
  Award,
  Certification,
  CustomSection,
  SocialLink,
  TimelineEvent,
  VerificationLog,
  VerifiableCredential,
  AttestationLink,
  ContentEdge,
  ContentRevision,
  Mask,
  Epoch,
  Stage
} from "@in-midst-my-life/schema";
import type { CvRepos, ContentRevisionRepo, ContentEdgeRepo, AttestationRepo, JsonbEntityRepo } from "./repositories/cv";
import type { ProfileRepo } from "./repositories/profiles";
import type { MaskRepo, EpochRepo, StageRepo } from "./repositories/masks";

export const BUNDLE_VERSION = "2025-12-29";
export const BUNDLE_CONTEXT: Record<string, string> = {
  "@vocab": "https://schema.org/",
  inMidst: "https://in-midst.my-life/schema#"
};

export type CvBundle = {
  experiences: Experience[];
  educations: Education[];
  projects: Project[];
  skills: Skill[];
  publications: Publication[];
  awards: Award[];
  certifications: Certification[];
  customSections: CustomSection[];
  socialLinks: SocialLink[];
  timelineEvents: TimelineEvent[];
  verificationLogs: VerificationLog[];
  credentials: VerifiableCredential[];
  attestations: AttestationLink[];
  edges: ContentEdge[];
  revisions: ContentRevision[];
};

export type TaxonomyBundle = {
  masks: Mask[];
  epochs: Epoch[];
  stages: Stage[];
};

export type ProfileBundle = {
  "@context": Record<string, string>;
  bundleVersion: string;
  exportedAt: string;
  profile: Profile;
  cv: CvBundle;
  taxonomy?: TaxonomyBundle;
};

export type BundleSummary = {
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

const BUNDLE_PAGE_LIMIT = 500;

async function listAll<T>(repo: JsonbEntityRepo<T> | AttestationRepo | ContentEdgeRepo, profileId: string) {
  const data: T[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await repo.list(profileId, offset, BUNDLE_PAGE_LIMIT);
    data.push(...(result.data as T[]));
    total = result.total;
    offset += result.data.length;
  } while (offset < total && total > 0);
  return data;
}

async function listAllRevisions(repo: ContentRevisionRepo, profileId: string) {
  const data: ContentRevision[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await repo.list(profileId, undefined, undefined, offset, BUNDLE_PAGE_LIMIT);
    data.push(...result.data);
    total = result.total;
    offset += result.data.length;
  } while (offset < total && total > 0);
  return data;
}

async function listAllMasks(repo: MaskRepo) {
  const data: Mask[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await repo.list(offset, BUNDLE_PAGE_LIMIT);
    data.push(...result.data);
    total = result.total;
    offset += result.data.length;
  } while (offset < total && total > 0);
  return data;
}

async function listAllStages(repo: StageRepo) {
  const data: Stage[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await repo.list(undefined, offset, BUNDLE_PAGE_LIMIT);
    data.push(...result.data);
    total = result.total;
    offset += result.data.length;
  } while (offset < total && total > 0);
  return data;
}

export async function loadProfileBundle(
  profileId: string,
  profiles: ProfileRepo,
  repos: CvRepos,
  taxonomy?: { masks: MaskRepo; epochs: EpochRepo; stages: StageRepo }
): Promise<ProfileBundle | undefined> {
  const profile = await profiles.find(profileId);
  if (!profile) return undefined;

  const [
    experiences,
    educations,
    projects,
    skills,
    publications,
    awards,
    certifications,
    customSections,
    socialLinks,
    timelineEvents,
    verificationLogs,
    credentials,
    attestations,
    edges,
    revisions
  ] = await Promise.all([
    listAll(repos.experiences, profileId),
    listAll(repos.educations, profileId),
    listAll(repos.projects, profileId),
    listAll(repos.skills, profileId),
    listAll(repos.publications, profileId),
    listAll(repos.awards, profileId),
    listAll(repos.certifications, profileId),
    listAll(repos.customSections, profileId),
    listAll(repos.socialLinks, profileId),
    listAll(repos.timelineEvents, profileId),
    listAll(repos.verificationLogs, profileId),
    listAll(repos.credentials, profileId),
    listAll(repos.attestations, profileId),
    listAll(repos.edges, profileId),
    listAllRevisions(repos.revisions, profileId)
  ]);

  const bundle: ProfileBundle = {
    "@context": BUNDLE_CONTEXT,
    bundleVersion: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    cv: {
      experiences,
      educations,
      projects,
      skills,
      publications,
      awards,
      certifications,
      customSections,
      socialLinks,
      timelineEvents,
      verificationLogs,
      credentials,
      attestations,
      edges,
      revisions
    }
  };

  if (taxonomy) {
    const [masks, epochs, stages] = await Promise.all([
      listAllMasks(taxonomy.masks),
      taxonomy.epochs.list(),
      listAllStages(taxonomy.stages)
    ]);
    bundle.taxonomy = { masks, epochs, stages };
  }

  return bundle;
}

export function summarizeBundle(bundle: ProfileBundle): BundleSummary {
  return {
    profile: 1,
    experiences: bundle.cv.experiences.length,
    educations: bundle.cv.educations.length,
    projects: bundle.cv.projects.length,
    skills: bundle.cv.skills.length,
    publications: bundle.cv.publications.length,
    awards: bundle.cv.awards.length,
    certifications: bundle.cv.certifications.length,
    customSections: bundle.cv.customSections.length,
    socialLinks: bundle.cv.socialLinks.length,
    timelineEvents: bundle.cv.timelineEvents.length,
    verificationLogs: bundle.cv.verificationLogs.length,
    credentials: bundle.cv.credentials.length,
    attestations: bundle.cv.attestations.length,
    edges: bundle.cv.edges.length,
    revisions: bundle.cv.revisions.length,
    masks: bundle.taxonomy?.masks.length ?? 0,
    epochs: bundle.taxonomy?.epochs.length ?? 0,
    stages: bundle.taxonomy?.stages.length ?? 0
  };
}
