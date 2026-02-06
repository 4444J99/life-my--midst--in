import type { CvData } from './graph-utils';

export type TimelineEntry = {
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

const STAGE_MAP: Record<string, { stageId: string; settingId: string }> = {
  experience: { stageId: 'stage/construction', settingId: 'setting/production' },
  education: { stageId: 'stage/inquiry', settingId: 'setting/research' },
  project: { stageId: 'stage/design', settingId: 'setting/studio' },
  publication: { stageId: 'stage/transmission', settingId: 'setting/public' },
  award: { stageId: 'stage/transmission', settingId: 'setting/public' },
  certification: { stageId: 'stage/calibration', settingId: 'setting/lab' },
};

const stripMarkdown = (value?: string) =>
  value
    ? value
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/[`*_>#]/g, '')
        .replace(/\n+/g, ' ')
        .trim()
    : '';

export function buildTimelineEntries(cvData: CvData): TimelineEntry[] {
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
}
