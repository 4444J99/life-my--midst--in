import type { Profile, Mask, Experience, Education, Skill } from "@in-midst-my-life/schema";

/**
 * Service for generating JSON-LD exports of profiles.
 * JSON-LD is a structured data format compatible with schema.org,
 * enabling profiles to be consumed by semantic web tools like Google, LinkedIn, etc.
 */

export interface JsonLdExportRequest {
  profile: Profile;
  mask?: Mask;
  experiences?: Experience[];
  educations?: Education[];
  skills?: Skill[];
  includeVerification?: boolean;
  maskContext?: boolean;
}

export interface JsonLdPerson {
  "@context": string | string[];
  "@type": "Person";
  "@id"?: string;
  name: string;
  description?: string;
  image?: string;
  jobTitle?: string;
  url?: string;
  sameAs?: string[];
  worksFor?: JsonLdOrganization[];
  hasOccupation?: JsonLdEmployeeRole[];
  alumniOf?: JsonLdEducationalOrganization[];
  knowsLanguage?: string[];
  hasSkill?: JsonLdSkill[];
  creativeWork?: JsonLdCreativeWork[];
  potentialAction?: Record<string, unknown>;
  "mask:presentation"?: JsonLdMaskPresentation;
}

export interface JsonLdOrganization {
  "@type": "Organization";
  name: string;
  url?: string;
  description?: string;
}

export interface JsonLdEmployeeRole {
  "@type": "EmployeeRole";
  roleName: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  "mask:tags"?: string[];
}

export interface JsonLdEducationalOrganization {
  "@type": "EducationalOrganization";
  name: string;
  url?: string;
  description?: string;
  fieldOfStudy?: string;
}

export interface JsonLdSkill {
  "@type": "Thing";
  name: string;
  category?: string;
  proficiency?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

export interface JsonLdCreativeWork {
  "@type": "CreativeWork";
  name: string;
  url?: string;
  description?: string;
  datePublished?: string;
}

export interface JsonLdMaskPresentation {
  maskId: string;
  maskName: string;
  maskOntology: string;
  functionalScope: string;
  activationContexts: string[];
  priorityTags: string[];
}

/**
 * Formats an ISO date string to YYYY-MM-DD format for schema.org compliance.
 */
function formatDate(date?: string): string | undefined {
  if (!date) return undefined;
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return date;
  }
}

/**
 * Generates a comprehensive JSON-LD profile export.
 * 
 * Features:
 * - Full schema.org Person type with embedded properties
 * - Structured work history (worksFor, hasOccupation)
 * - Educational background (alumniOf)
 * - Skills as schema.org Thing objects
 * - Optional mask context for presentation-specific exports
 * - Verification metadata integration
 * - Social/contact links as sameAs
 */
export function generateProfileJsonLd(request: JsonLdExportRequest): JsonLdPerson {
  const { profile, mask, experiences = [], educations = [], skills = [], maskContext = false } = request;

  const jsonLd: JsonLdPerson = {
    "@context": ["https://schema.org", maskContext ? "https://in-midst-my-life.schema/" : undefined].filter(Boolean),
    "@type": "Person",
    name: profile.displayName,
    description: profile.summaryMarkdown,
    image: profile.avatarUrl,
    jobTitle: profile.title,
    url: profile.slug ? `https://in-midst-my-life.app/profile/${profile.slug}` : undefined
  };

  // Add social/contact links
  const socialUrls: string[] = [];
  if (profile.email) socialUrls.push(`mailto:${profile.email}`);
  if (profile.website) socialUrls.push(profile.website);
  if (socialUrls.length > 0) {
    jsonLd.sameAs = socialUrls;
  }

  // Work history
  if (experiences.length > 0) {
    // Current employer(s)
    const currentRoles = experiences.filter((e) => e.isCurrent);
    if (currentRoles.length > 0) {
      jsonLd.worksFor = currentRoles.map((e) => ({
        "@type": "Organization",
        name: e.organization,
        url: e.organizationUrl,
        description: e.descriptionMarkdown?.split("\n")[0] // First line as description
      }));
    }

    // All roles as hasOccupation
    jsonLd.hasOccupation = experiences.map((e) => ({
      "@type": "EmployeeRole",
      roleName: e.roleTitle,
      startDate: formatDate(e.startDate),
      endDate: formatDate(e.endDate),
      description: e.descriptionMarkdown,
      "mask:tags": e.tags
    }));
  }

  // Educational background
  if (educations.length > 0) {
    jsonLd.alumniOf = educations.map((e) => ({
      "@type": "EducationalOrganization",
      name: e.institution,
      url: e.institutionUrl,
      description: e.fieldOfStudy,
      fieldOfStudy: e.fieldOfStudy
    }));
  }

  // Skills
  if (skills.length > 0) {
    jsonLd.hasSkill = skills.map((s) => ({
      "@type": "Thing",
      name: s.name,
      category: s.category,
      proficiency: s.proficiencyLevel as "Beginner" | "Intermediate" | "Advanced" | "Expert"
    }));
  }

  // Mask presentation context
  if (mask && maskContext) {
    jsonLd["mask:presentation"] = {
      maskId: mask.id,
      maskName: mask.name,
      maskOntology: mask.ontology,
      functionalScope: mask.functional_scope,
      activationContexts: mask.activation_rules.contexts,
      priorityTags: Object.keys(mask.filters.priority_weights || {})
    };
  }

  return jsonLd;
}

/**
 * Generates a masked JSON-LD export filtered through a specific mask.
 * Masks are identity filters that emphasize certain aspects of the profile.
 * 
 * For example, the "Analyst" mask would:
 * - Prioritize roles with "analysis", "metrics", or "impact" tags
 * - Exclude roles with "speculation" tags
 * - Reorder skills/experiences by relevance to analytical work
 */
export function generateMaskedJsonLd(
  profile: Profile,
  mask: Mask,
  experiences: Experience[] = [],
  educations: Education[] = [],
  skills: Skill[] = []
): JsonLdPerson {
  // Filter and reorder experiences based on mask
  const filteredExperiences = experiences.filter((e) => {
    const tags = new Set((e.tags || []).map((t) => t.toLowerCase()));
    const excludeTags = new Set(mask.filters.exclude_tags.map((t) => t.toLowerCase()));

    // Exclude if any excluded tag matches
    if ([...tags].some((t) => excludeTags.has(t))) return false;

    // If include tags are specified, must match at least one
    const includeTags = new Set(mask.filters.include_tags.map((t) => t.toLowerCase()));
    if (includeTags.size > 0) {
      return [...tags].some((t) => includeTags.has(t));
    }

    return true;
  });

  // Score and sort experiences by mask priority
  const scoredExperiences = filteredExperiences.map((e) => {
    let score = 0;
    const tags = new Set((e.tags || []).map((t) => t.toLowerCase()));

    // Score based on priority weights
    Object.entries(mask.filters.priority_weights || {}).forEach(([tag, weight]) => {
      if (tags.has(tag.toLowerCase())) {
        score += weight;
      }
    });

    // Boost recent experiences
    if (e.isCurrent) score += 5;
    if (e.startDate) {
      const startDate = new Date(e.startDate);
      const monthsAgo = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const recencyBoost = Math.max(0, 3 - monthsAgo / 12); // Decay over years
      score += recencyBoost;
    }

    return { experience: e, score };
  });

  scoredExperiences.sort((a, b) => b.score - a.score);
  const reorderedExperiences = scoredExperiences.map((item) => item.experience);

  // Filter skills by mask tags
  const filteredSkills = skills.filter((s) => {
    const skillCategory = s.category?.toLowerCase() || "";
    const includeTags = mask.filters.include_tags.map((t) => t.toLowerCase());
    return includeTags.some((tag) => skillCategory.includes(tag) || s.name.toLowerCase().includes(tag));
  });

  return generateProfileJsonLd({
    profile,
    mask,
    experiences: reorderedExperiences,
    educations,
    skills: filteredSkills,
    maskContext: true
  });
}

/**
 * Generates a minimal JSON-LD export suitable for web sharing.
 * Includes only the most relevant information to avoid over-sharing.
 */
export function generateMinimalJsonLd(profile: Profile, currentRole?: string): JsonLdPerson {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.displayName,
    description: profile.summaryMarkdown,
    image: profile.avatarUrl,
    jobTitle: currentRole || profile.title,
    url: profile.slug ? `https://in-midst-my-life.app/profile/${profile.slug}` : undefined,
    sameAs: profile.email ? [`mailto:${profile.email}`] : []
  };
}

/**
 * Converts a JSON-LD object to a JSON-LD script tag suitable for embedding in HTML.
 * Useful for SEO and social media sharing.
 */
export function jsonLdToScriptTag(jsonLd: Record<string, unknown>): string {
  return `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
}

/**
 * Adds breadcrumb navigation context to JSON-LD for SEO.
 * Helps search engines understand site hierarchy.
 */
export function addBreadcrumbContext(jsonLd: JsonLdPerson, breadcrumbs: Array<{ name: string; url: string }>): JsonLdPerson {
  return {
    ...jsonLd,
    potentialAction: {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    }
  };
}
