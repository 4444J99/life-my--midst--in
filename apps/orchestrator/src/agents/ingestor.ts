import { randomUUID } from "node:crypto";
import type { Agent, AgentExecutor, AgentResult, AgentTask } from "../agents";
import {
  fetchGitHubEvents,
  fetchGitHubRepoByFullName,
  fetchGitHubRepos,
  mapRepoToProject,
  upsertProjectByExternalId,
  type GitHubEvent,
  type GitHubRepo
} from "../repositories/ingestion";
import type { Education, Experience, JobPosting, Project, Skill } from "@in-midst-my-life/schema";

const DEFAULT_API_BASE_URL = process.env["ORCH_API_BASE_URL"] ?? process.env["API_BASE_URL"] ?? "http://localhost:3001";

type IngestSource = "github" | "resume" | "linkedin" | "job";

type IngestPayload = {
  source?: IngestSource;
  profileId?: string;
  apiBaseUrl?: string;
  username?: string;
  mode?: "repos" | "events";
  resumeText?: string;
  resumeTitle?: string;
  resumeJson?: unknown;
  resumeFormat?: "text" | "json" | "linkedin";
  jobUrl?: string;
  jobText?: string;
};

type ResumeParseOutput = {
  experiences?: Array<Partial<Experience>>;
  educations?: Array<Partial<Education>>;
  projects?: Array<Partial<Project>>;
  skills?: Array<Partial<Skill> | string>;
};

const extractJson = (value: string): any | null => {
  const fenced = value.match(/```json\s*([\s\S]*?)```/i) ?? value.match(/```([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
};

const toStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item));
  }
  const asString = toStringValue(value);
  return asString ? [asString] : [];
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const formatYearMonth = (year?: number, month?: number): string | undefined => {
  if (!year) return undefined;
  if (month && Number.isFinite(month)) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  return `${year}`;
};

const parseDateValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!isRecord(value)) return undefined;
  const year = toNumberValue(value["year"] ?? value["Year"] ?? value["startYear"]);
  const month = toNumberValue(value["month"] ?? value["Month"] ?? value["startMonth"]);
  return formatYearMonth(year, month);
};

const parseTimePeriod = (value: unknown): { start?: string; end?: string } => {
  if (!isRecord(value)) return { start: undefined, end: undefined };
  const start = parseDateValue(value["startDate"] ?? value["start"] ?? value["from"]);
  const end = parseDateValue(value["endDate"] ?? value["end"] ?? value["to"]);
  return { start, end };
};

const coerceJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (isRecord(value)) return value;
  if (Array.isArray(value)) return { work: value };
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return coerceJsonObject(parsed);
    } catch {
      return null;
    }
  }
  return null;
};

const pickString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = toStringValue(record[key]);
    if (value) return value;
  }
  return undefined;
};

const pickStringArray = (record: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = toStringArray(record[key]);
    if (values.length) return values;
  }
  return [];
};

const collectArray = (record: Record<string, unknown>, keys: string[]): unknown[] => {
  const items: unknown[] = [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      items.push(...value);
    } else if (value) {
      items.push(value);
    }
  }
  return items;
};

const SKILL_CATEGORIES = new Set<Skill["category"]>([
  "technical",
  "artistic",
  "theoretical",
  "research",
  "soft",
  "other"
]);

const SKILL_LEVELS = new Set<Skill["level"]>(["novice", "intermediate", "advanced", "expert"]);

const normalizeSkillCategory = (value: unknown): Skill["category"] | undefined => {
  if (!value) return undefined;
  const candidate = String(value).trim().toLowerCase();
  return SKILL_CATEGORIES.has(candidate as Skill["category"]) ? (candidate as Skill["category"]) : undefined;
};

const normalizeSkillLevel = (value: unknown): Skill["level"] | undefined => {
  if (!value) return undefined;
  const candidate = String(value).trim().toLowerCase();
  return SKILL_LEVELS.has(candidate as Skill["level"]) ? (candidate as Skill["level"]) : undefined;
};

const SKILL_KEYWORDS = {
  technical: [
    "javascript",
    "typescript",
    "python",
    "go",
    "golang",
    "rust",
    "java",
    "kotlin",
    "c#",
    "c++",
    "node",
    "react",
    "next",
    "vue",
    "angular",
    "svelte",
    "postgres",
    "mysql",
    "redis",
    "graphql",
    "docker",
    "kubernetes",
    "terraform",
    "aws",
    "gcp",
    "azure",
    "git",
    "ci",
    "cd"
  ],
  research: ["research", "analysis", "analytics", "data science", "machine learning", "ai", "ml", "statistics"],
  artistic: ["design", "ux", "ui", "visual", "illustration", "creative", "writing", "storytelling", "brand"],
  theoretical: ["architecture", "systems thinking", "theory", "modeling"],
  soft: ["leadership", "communication", "collaboration", "mentorship", "management", "strategy", "negotiation", "planning"]
};

const inferSkillCategory = (name: string, hint?: string): Skill["category"] => {
  const haystack = `${name} ${hint ?? ""}`.toLowerCase();
  if (SKILL_KEYWORDS.soft.some((key) => haystack.includes(key))) return "soft";
  if (SKILL_KEYWORDS.artistic.some((key) => haystack.includes(key))) return "artistic";
  if (SKILL_KEYWORDS.research.some((key) => haystack.includes(key))) return "research";
  if (SKILL_KEYWORDS.theoretical.some((key) => haystack.includes(key))) return "theoretical";
  if (SKILL_KEYWORDS.technical.some((key) => haystack.includes(key))) return "technical";
  return "other";
};

const parseExperienceRecord = (record: Record<string, unknown>): Partial<Experience> => {
  const roleTitle = pickString(record, ["roleTitle", "title", "position", "role"]);
  const organization = pickString(record, ["organization", "company", "companyName", "employer", "name"]);
  const organizationUrl = pickString(record, ["organizationUrl", "companyUrl", "url", "website"]);
  const locationText = pickString(record, ["location", "locationName", "geoLocationName"]);
  const summary = pickString(record, ["summary", "description"]);
  const highlights = pickStringArray(record, ["highlights", "achievements", "bullets"]);
  const tags = pickStringArray(record, ["tags", "keywords", "skills"]);
  const timePeriod = record["timePeriod"] ?? record["dateRange"] ?? record["dates"];
  const startDate = pickString(record, ["startDate", "start", "from"]) ?? parseDateValue(record["startDate"]);
  const endDate = pickString(record, ["endDate", "end", "to"]) ?? parseDateValue(record["endDate"]);
  const { start, end } = parseTimePeriod(timePeriod);
  const descriptionMarkdown = [summary, ...highlights].filter(Boolean).join("\n");

  return {
    roleTitle,
    organization,
    organizationUrl,
    locationText,
    startDate: startDate ?? start,
    endDate: endDate ?? end,
    descriptionMarkdown: descriptionMarkdown || summary,
    highlights: highlights.length ? highlights : undefined,
    tags: tags.length ? tags : undefined
  };
};

const parseEducationRecord = (record: Record<string, unknown>): Partial<Education> => {
  const institution = pickString(record, ["institution", "school", "name"]);
  const degree = pickString(record, ["degree", "studyType", "credential"]);
  const fieldOfStudy = pickString(record, ["fieldOfStudy", "area", "major", "field"]);
  const description = pickString(record, ["description", "summary"]);
  const timePeriod = record["timePeriod"] ?? record["dateRange"] ?? record["dates"];
  const startDate = pickString(record, ["startDate", "start", "from"]) ?? parseDateValue(record["startDate"]);
  const endDate = pickString(record, ["endDate", "end", "to"]) ?? parseDateValue(record["endDate"]);
  const { start, end } = parseTimePeriod(timePeriod);

  return {
    institution,
    degree,
    fieldOfStudy,
    startDate: startDate ?? start,
    endDate: endDate ?? end,
    descriptionMarkdown: description
  };
};

const parseProjectRecord = (record: Record<string, unknown>): Partial<Project> => {
  const name = pickString(record, ["name", "title", "projectName"]);
  const description = pickString(record, ["description", "summary"]);
  const highlights = pickStringArray(record, ["highlights", "achievements"]);
  const tags = pickStringArray(record, ["tags", "keywords"]);
  const url = pickString(record, ["url", "website"]);
  const repoUrl = pickString(record, ["repoUrl", "repository", "repo", "github"]);
  const timePeriod = record["timePeriod"] ?? record["dateRange"] ?? record["dates"];
  const startDate = pickString(record, ["startDate", "start", "from"]) ?? parseDateValue(record["startDate"]);
  const endDate = pickString(record, ["endDate", "end", "to"]) ?? parseDateValue(record["endDate"]);
  const { start, end } = parseTimePeriod(timePeriod);

  return {
    name,
    descriptionMarkdown: [description, ...highlights].filter(Boolean).join("\n") || description,
    highlights: highlights.length ? highlights : undefined,
    tags: tags.length ? tags : undefined,
    url,
    repoUrl,
    startDate: startDate ?? start,
    endDate: endDate ?? end
  };
};

const parseSkillEntries = (value: unknown): Array<Partial<Skill> | string> => {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const results: Array<Partial<Skill> | string> = [];

  for (const item of items) {
    if (typeof item === "string") {
      results.push(item);
      continue;
    }
    if (!isRecord(item)) continue;
    const groupLabel = pickString(item, ["category", "name", "group", "label"]);
    const keywords = toStringArray(item["keywords"] ?? item["skills"] ?? item["values"] ?? item["items"]);
    if (keywords.length) {
      keywords.forEach((keyword) => {
        results.push({ name: keyword, category: inferSkillCategory(keyword, groupLabel) });
      });
      continue;
    }
    const name = pickString(item, ["name", "skill", "label"]);
    if (name) {
      results.push({ name, category: inferSkillCategory(name, groupLabel), level: normalizeSkillLevel(item["level"]) });
    }
  }

  return results;
};

const parseStructuredResume = (input: Record<string, unknown>): ResumeParseOutput => {
  const experienceItems = collectArray(input, ["work", "experience", "experiences", "positions", "jobs"]);
  const experiences: Array<Partial<Experience>> = [];
  experienceItems.forEach((item) => {
    if (isRecord(item)) {
      experiences.push(parseExperienceRecord(item));
      return;
    }
    const value = toStringValue(item);
    if (value) {
      experiences.push({ roleTitle: value, organization: "Unknown", descriptionMarkdown: value });
    }
  });

  const educationItems = collectArray(input, ["education", "educations", "schools"]);
  const educations: Array<Partial<Education>> = [];
  educationItems.forEach((item) => {
    if (isRecord(item)) {
      educations.push(parseEducationRecord(item));
      return;
    }
    const value = toStringValue(item);
    if (value) {
      educations.push({ institution: value, descriptionMarkdown: value });
    }
  });

  const projectItems = collectArray(input, ["projects", "project"]);
  const projects: Array<Partial<Project>> = [];
  projectItems.forEach((item) => {
    if (isRecord(item)) {
      projects.push(parseProjectRecord(item));
      return;
    }
    const value = toStringValue(item);
    if (value) {
      projects.push({ name: value, descriptionMarkdown: value });
    }
  });

  const skills = parseSkillEntries(input["skills"] ?? input["skill"] ?? input["skillset"] ?? input["keywords"] ?? input["tools"]);

  return { experiences, educations, projects, skills };
};

const parseYearRange = (value: string) => {
  const years = value.match(/\b(19|20)\d{2}\b/g);
  if (!years || years.length === 0) return { start: undefined, end: undefined };
  const start = years[0];
  const end = years.length > 1 ? years[1] : undefined;
  return { start, end };
};

const parseSection = (text: string, heading: string) => {
  const regex = new RegExp(`(^|\\n)\\s*${heading}\\s*(\\n|$)`, "i");
  const match = text.match(regex);
  if (!match) return "";
  const start = match.index ?? 0;
  const rest = text.slice(start + match[0].length);
  const nextHeading = rest.match(/\n\s*[A-Z][A-Za-z ]{2,}\n/);
  return nextHeading ? rest.slice(0, nextHeading.index) : rest;
};

const parseResumeFallback = (text: string): ResumeParseOutput => {
  const experienceSection = parseSection(text, "Experience|Work Experience");
  const educationSection = parseSection(text, "Education");
  const projectSection = parseSection(text, "Projects");
  const skillsSection = parseSection(text, "Skills");

  const parseExperienceLines = (section: string) =>
    section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 3)
      .slice(0, 12)
      .map((line) => {
        const [role, org] = line.split(" @ ").length > 1 ? line.split(" @ ") : line.split(" - ");
        const { start, end } = parseYearRange(line);
        return {
          roleTitle: role?.trim() ?? line,
          organization: org?.trim() ?? "Unknown",
          startDate: start ?? new Date().getFullYear().toString(),
          endDate: end,
          descriptionMarkdown: line
        };
      });

  const parseEducationLines = (section: string) =>
    section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 3)
      .slice(0, 8)
      .map((line) => {
        const { start, end } = parseYearRange(line);
        return {
          institution: line,
          startDate: start,
          endDate: end,
          descriptionMarkdown: line
        };
      });

  const parseProjectLines = (section: string) =>
    section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 3)
      .slice(0, 10)
      .map((line) => ({
        name: line,
        descriptionMarkdown: line
      }));

  const skills =
    skillsSection
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];

  return {
    experiences: experienceSection ? parseExperienceLines(experienceSection) : [],
    educations: educationSection ? parseEducationLines(educationSection) : [],
    projects: projectSection ? parseProjectLines(projectSection) : [],
    skills
  };
};

const buildExperience = (profileId: string, entry: Partial<Experience>): Experience => {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    profileId,
    roleTitle: entry.roleTitle ?? "Role",
    organization: entry.organization ?? "Organization",
    organizationUrl: entry.organizationUrl,
    locationText: entry.locationText,
    startDate: entry.startDate ?? now.slice(0, 10),
    endDate: entry.endDate,
    isCurrent: Boolean(entry.isCurrent),
    employmentType: entry.employmentType,
    descriptionMarkdown: entry.descriptionMarkdown,
    highlights: entry.highlights,
    tags: entry.tags,
    skillsUsed: entry.skillsUsed,
    createdAt: now,
    updatedAt: now
  };
};

const buildEducation = (profileId: string, entry: Partial<Education>): Education => {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    profileId,
    institution: entry.institution ?? "Institution",
    institutionUrl: entry.institutionUrl,
    degree: entry.degree,
    fieldOfStudy: entry.fieldOfStudy,
    startDate: entry.startDate,
    endDate: entry.endDate,
    isCurrent: Boolean(entry.isCurrent),
    thesisTitle: entry.thesisTitle,
    descriptionMarkdown: entry.descriptionMarkdown,
    createdAt: now,
    updatedAt: now
  };
};

const buildSkill = (profileId: string, entry: Partial<Skill> | string): Skill => {
  const now = new Date().toISOString();
  const name = typeof entry === "string" ? entry : entry.name ?? "Skill";
  const categoryHint = typeof entry === "string" ? undefined : toStringValue(entry.category);
  const category =
    typeof entry === "string"
      ? inferSkillCategory(name)
      : normalizeSkillCategory(entry.category) ?? inferSkillCategory(name, categoryHint);
  const level = typeof entry === "string" ? undefined : normalizeSkillLevel(entry.level);
  return {
    id: randomUUID(),
    profileId,
    name,
    category,
    level,
    yearsOfExperience: typeof entry === "string" ? undefined : entry.yearsOfExperience,
    lastUsedDate: typeof entry === "string" ? undefined : entry.lastUsedDate,
    isPrimary: typeof entry === "string" ? false : Boolean(entry.isPrimary),
    createdAt: now,
    updatedAt: now
  };
};

const buildProject = (profileId: string, entry: Partial<Project>): Project => {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    profileId,
    name: entry.name ?? "Project",
    subtitle: entry.subtitle,
    role: entry.role,
    startDate: entry.startDate,
    endDate: entry.endDate,
    isOngoing: Boolean(entry.isOngoing),
    url: entry.url,
    repoUrl: entry.repoUrl,
    externalId: entry.externalId,
    mediaGallery: entry.mediaGallery,
    descriptionMarkdown: entry.descriptionMarkdown,
    highlights: entry.highlights,
    tags: entry.tags,
    skillsUsed: entry.skillsUsed,
    createdAt: now,
    updatedAt: now
  };
};

const buildJobPosting = (profileId: string, entry: Partial<JobPosting>): JobPosting => {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    profileId,
    title: entry.title ?? "Unknown Job",
    company: entry.company ?? "Unknown Company",
    descriptionMarkdown: entry.descriptionMarkdown,
    url: entry.url,
    salaryRange: entry.salaryRange,
    location: entry.location,
    vectors: entry.vectors,
    status: entry.status ?? "active",
    createdAt: now,
    updatedAt: now
  };
};

const describeRepoWithEvents = (repo: GitHubRepo, events: GitHubEvent[]) => {
  const related = events.filter((event) => event.repo?.name === repo.full_name);
  const messages = related
    .map((event) => {
      if (event.type === "PushEvent") {
        const commit = event.payload?.commits?.[0]?.message;
        return commit ? `Pushed: ${commit}` : "Recent push activity";
      }
      if (event.type === "PullRequestEvent") {
        const title = event.payload?.pull_request?.title;
        return title ? `PR: ${title}` : "Pull request activity";
      }
      return undefined;
    })
    .filter(Boolean) as string[];
  return messages.length > 0 ? messages.slice(0, 3).join(" • ") : undefined;
};

export class IngestorAgent implements Agent {
  role: "ingestor" = "ingestor";
  private executor?: AgentExecutor;

  constructor(executor?: AgentExecutor) {
    this.executor = executor;
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const payload = task.payload as IngestPayload;
    const source = payload.source ?? "github";

    if (source === "github") {
      return this.ingestGitHub(task, payload);
    }
    if (source === "resume") {
      return this.ingestResume(task, payload, "resume");
    }
    if (source === "linkedin") {
      return this.ingestResume(task, payload, "linkedin");
    }
    if (source === "job") {
      return this.ingestJob(task, payload);
    }

    return { taskId: task.id, status: "failed", notes: `unsupported_source:${source}` };
  }

  private async ingestGitHub(task: AgentTask, payload: IngestPayload): Promise<AgentResult> {
    const username = payload.username;
    const profileId = payload.profileId;
    const apiBaseUrl = payload.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    if (!username || !profileId) {
      return { taskId: task.id, status: "failed", notes: "missing_username_or_profile" };
    }

    try {
      const mode = payload.mode ?? "repos";
      const repos =
        mode === "events"
          ? await this.fetchReposFromEvents(username)
          : await fetchGitHubRepos(username);
      const events = mode === "events" ? await fetchGitHubEvents(username) : [];
      const summaries = await this.generateRepoSummaries(repos);
      const created: Project[] = [];

      for (const repo of repos) {
        const externalId = `github_repo_${repo.id}`;
        const summary = summaries.get(repo.id) ?? describeRepoWithEvents(repo, events);
        const tags = [repo.language, ...(repo.description?.includes("tool") ? ["tooling"] : [])].filter(Boolean) as string[];
        const project = mapRepoToProject(repo, profileId, { summary, tags });
        const upserted = await upsertProjectByExternalId(apiBaseUrl, profileId, project, externalId);
        created.push(upserted);
      }

      return {
        taskId: task.id,
        status: "completed",
        notes: `Ingested ${created.length} GitHub repositories for ${username}.`,
        output: { projects: created }
      };
    } catch (err) {
      return { taskId: task.id, status: "failed", notes: `ingest_error:${String(err)}` };
    }
  }

  private async fetchReposFromEvents(username: string): Promise<GitHubRepo[]> {
    const events = await fetchGitHubEvents(username);
    const relevant = events.filter((event) => event.type === "PushEvent" || event.type === "PullRequestEvent");
    const repoNames = Array.from(new Set(relevant.map((event) => event.repo?.name).filter(Boolean))) as string[];
    const repos: GitHubRepo[] = [];
    for (const name of repoNames) {
      const repo = await fetchGitHubRepoByFullName(name);
      if (repo) repos.push(repo);
    }
    return repos;
  }

  private async generateRepoSummaries(repos: GitHubRepo[]) {
    const summaries = new Map<number, string>();
    if (!this.executor) return summaries;

    for (const repo of repos) {
      try {
        const result = await this.executor.invoke({
          id: `summary-${repo.id}`,
          role: "implementer",
          description: `Summarize repository ${repo.name}`,
          payload: {
            context: {
              summary: "Summarize the repository into a one-sentence project description.",
              notes: [
                `Repository: ${repo.name}`,
                `Description: ${repo.description ?? "none"}`,
                `Language: ${repo.language ?? "unknown"}`,
                `Stars: ${repo.stargazers_count}`
              ],
              constraints: ["Keep it under 200 characters.", "No bullet points."]
            }
          }
        });
        if (result.status === "completed" && result.notes && !result.notes.startsWith("Stub executor handled")) {
          summaries.set(repo.id, result.notes.replace(/^\"|\"$/g, ""));
        }
      } catch {
        // Ignore summary errors.
      }
    }

    return summaries;
  }

  private async ingestResume(
    task: AgentTask,
    payload: IngestPayload,
    source: "resume" | "linkedin" = "resume"
  ): Promise<AgentResult> {
    const resumeText = payload.resumeText;
    const profileId = payload.profileId;
    const apiBaseUrl = payload.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    const format = payload.resumeFormat ?? source;
    const jsonFromPayload = coerceJsonObject(payload.resumeJson);
    const trimmedResume = resumeText?.trim();
    const jsonFromText =
      trimmedResume && (trimmedResume.startsWith("{") || trimmedResume.startsWith("["))
        ? coerceJsonObject(trimmedResume)
        : null;
    const structured = jsonFromPayload ?? jsonFromText;

    if (!profileId || (!resumeText && !structured)) {
      return { taskId: task.id, status: "failed", notes: "missing_resume_or_profile" };
    }

    let parsed: ResumeParseOutput | null = null;
    if (structured) {
      parsed = parseStructuredResume(structured);
    }

    if (!parsed && resumeText && format !== "json") {
      if (this.executor) {
        try {
          const result = await this.executor.invoke({
            id: `resume-${task.id}`,
            role: "ingestor",
            description: "Parse resume into experience, education, projects, and skills.",
            payload: {
              context: {
                summary: "Return JSON with experiences, educations, projects, skills.",
                notes: [
                  "Output keys: experiences, educations, projects, skills.",
                  "Each experience should include roleTitle, organization, startDate, endDate, descriptionMarkdown, tags.",
                  "Each education should include institution, degree, fieldOfStudy, startDate, endDate, descriptionMarkdown.",
                  "Each project should include name, descriptionMarkdown, tags.",
                  "Skills can be string list or objects with name and optional category.",
                  `Resume title: ${payload.resumeTitle ?? "Resume"}`,
                  `Resume source: ${format}`
                ],
                constraints: ["Return JSON only.", "No markdown or commentary."]
              },
              rawResume: resumeText.slice(0, 8000)
            }
          });
          if (result.notes?.startsWith("Stub executor handled")) {
            parsed = null;
          } else {
            parsed = result.output ? (result.output as ResumeParseOutput) : extractJson(result.notes ?? "");
          }
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed && resumeText) {
      parsed = parseResumeFallback(resumeText);
    }

    if (!parsed) {
      return { taskId: task.id, status: "failed", notes: "resume_parse_failed" };
    }

    const experiences = (parsed.experiences ?? []).map((entry) => buildExperience(profileId, entry));
    const educations = (parsed.educations ?? []).map((entry) => buildEducation(profileId, entry));
    const projects = (parsed.projects ?? []).map((entry) => buildProject(profileId, entry));
    const skills = (parsed.skills ?? []).map((entry) => buildSkill(profileId, entry));

    try {
      await Promise.all(
        experiences.map((entry) =>
          fetch(`${apiBaseUrl}/profiles/${profileId}/experiences`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
          })
        )
      );
      await Promise.all(
        educations.map((entry) =>
          fetch(`${apiBaseUrl}/profiles/${profileId}/educations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
          })
        )
      );
      await Promise.all(
        projects.map((entry) =>
          fetch(`${apiBaseUrl}/profiles/${profileId}/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
          })
        )
      );
      await Promise.all(
        skills.map((entry) =>
          fetch(`${apiBaseUrl}/profiles/${profileId}/skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
          })
        )
      );
    } catch (err) {
      return { taskId: task.id, status: "failed", notes: `resume_ingest_failed:${String(err)}` };
    }

    return {
      taskId: task.id,
      status: "completed",
      notes: `Parsed resume into ${experiences.length} experiences, ${educations.length} educations, ${projects.length} projects.`,
      output: { experiences, educations, projects, skills }
    };
  }

  private async ingestJob(task: AgentTask, payload: IngestPayload): Promise<AgentResult> {
    const profileId = payload.profileId;
    const apiBaseUrl = payload.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    let jobText = payload.jobText;
    const jobUrl = payload.jobUrl;

    if (!profileId) {
      return { taskId: task.id, status: "failed", notes: "missing_profile_id" };
    }

    if (!jobText && jobUrl) {
      try {
        const response = await fetch(jobUrl);
        if (response.ok) {
          jobText = await response.text();
          // Extremely basic HTML stripping if it's HTML
          jobText = jobText.replace(/<[^>]*>/g, " ").slice(0, 10000);
        }
      } catch {
        // Failed to fetch, continue if jobText provided, else fail
      }
    }

    if (!jobText) {
      return { taskId: task.id, status: "failed", notes: "missing_job_text_or_url" };
    }

    let parsedJob: Partial<JobPosting> | null = null;

    if (this.executor) {
      try {
        const result = await this.executor.invoke({
          id: `job-parse-${task.id}`,
          role: "ingestor",
          description: "Parse job posting into structured data.",
          payload: {
            context: {
              summary: "Return JSON with title, company, location, salaryRange, descriptionMarkdown.",
              notes: [
                "Extract job title, company name, location, salary if available.",
                "Format description as markdown.",
                `Job URL: ${jobUrl ?? "N/A"}`
              ],
              constraints: ["Return JSON only."]
            },
            rawJob: jobText.slice(0, 5000)
          }
        });
        
        if (result.output) {
          parsedJob = result.output as Partial<JobPosting>;
        } else if (result.notes) {
          parsedJob = extractJson(result.notes);
        }
      } catch {
        parsedJob = null;
      }
    }

    if (!parsedJob) {
      // Fallback: very basic regex
      const titleMatch = jobText.match(/(?:title|role):?\s*([^\n]+)/i);
      const companyMatch = jobText.match(/(?:company|at):?\s*([^\n]+)/i);
      parsedJob = {
        title: titleMatch?.[1] ?? "Unknown Job",
        company: companyMatch?.[1] ?? "Unknown Company",
        descriptionMarkdown: jobText.slice(0, 2000)
      };
    }

    const jobPosting = buildJobPosting(profileId, {
      ...parsedJob,
      url: jobUrl,
    });

    try {
      const response = await fetch(`${apiBaseUrl}/jobs/postings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobPosting)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const created = await response.json() as JobPosting;
      
      return {
        taskId: task.id,
        status: "completed",
        notes: `Ingested job posting: ${created.title} at ${created.company}`,
        output: { jobPosting: created }
      };
    } catch (err) {
      return { taskId: task.id, status: "failed", notes: `job_ingest_failed:${String(err)}` };
    }
  }

}
