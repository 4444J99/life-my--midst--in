import type {
  Profile,
  Experience,
  Education,
  SocialLink
} from "@in-midst-my-life/schema";

export interface JsonLdOptions {
  includeCV?: boolean;
  maskName?: string;
}

const formatDate = (date?: string) => date ? date.split("T")[0] : undefined;

export function generatePersonJsonLd(
  profile: Profile,
  cvData?: {
    experiences?: Experience[];
    educations?: Education[];
    socialLinks?: SocialLink[];
  },
  options: JsonLdOptions = {}
): Record<string, unknown> {
  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.displayName,
    "description": profile.summaryMarkdown,
    "image": profile.avatarUrl,
    "jobTitle": profile.title,
    "url": profile.slug ? `https://midst.life/${profile.slug}` : undefined,
  };

  if (cvData?.socialLinks?.length) {
    person["sameAs"] = cvData.socialLinks.map(l => l.url);
  }

  if (options.includeCV && cvData) {
    if (cvData.experiences?.length) {
      person["worksFor"] = cvData.experiences
        .filter(e => e.isCurrent)
        .map(e => ({
          "@type": "Organization",
          "name": e.organization,
          "url": e.organizationUrl
        }));

      person["hasOccupation"] = cvData.experiences.map(e => ({
        "@type": "EmployeeRole",
        "roleName": e.roleTitle,
        "startDate": formatDate(e.startDate),
        "endDate": formatDate(e.endDate),
        "description": e.descriptionMarkdown
      }));
    }

    if (cvData.educations?.length) {
      person["alumniOf"] = cvData.educations.map(e => ({
        "@type": "EducationalOrganization",
        "name": e.institution,
        "url": e.institutionUrl
      }));
    }
  }

  return person;
}
