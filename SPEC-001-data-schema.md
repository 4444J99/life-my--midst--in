# Create schema specification

**User:** Anthony Padavano (padavano.anthony@gmail.com)  
**Created:** 11/25/2025 15:05:08  
**Updated:** 11/25/2025 15:06:43  
**Exported:** 12/26/2025 13:34:14  
**Link:** [https://chatgpt.com/g/g-p-692604860ac48191a223bf20aeb4ce69-in-midst-my-life/c/69260bf0-f720-8329-a97c-ba76944db36f](https://chatgpt.com/g/g-p-692604860ac48191a223bf20aeb4ce69-in-midst-my-life/c/69260bf0-f720-8329-a97c-ba76944db36f)  

## Status (Planned vs Implemented)
- Implemented: Identity/Profile schemas and storage; ExternalId + ProfileSettings; CV entity schemas; custom sections + timeline events; verifiable credential + attestation link types; verification logs; relationship graph + revision tracking.
- Planned: None.

## Prompt:
create: A schema specification

## Response:
Here is a first-pass schema specification for an interactive CV/résumé system, aligned with the “blockchain as CV / verifiable credentials” direction you’ve been exploring.

* * *

1\. Scope and assumptions
-------------------------

This schema covers:

*   A **profile** (the “person object”).
*   Standard CV sections: experience, education, projects, skills, etc.
*   **Verifiable credentials / attestations** bound to profile elements.
*   **Identity layer** (DID, wallet, handles).
*   **Presentation layer** (ordering, visibility, theming).

Notation: I will use TypeScript-style interfaces as a concise, implementation-friendly schema. You can translate this directly into JSON Schema, DB schema, GraphQL, etc.

* * *

2\. High-level data model
-------------------------

Core entities and their key relationships:

*   `Profile`
    *   has many: `Experience`, `Education`, `Project`, `Skill`, `Publication`, `Award`, `Certification`, `SocialLink`, `ProfileSectionOrder`.
    *   linked to: `Identity`, `Settings`.
*   `Identity`
    *   one per `Profile`.
    *   fields for DID, primary wallet, ENS/name, off-chain identifiers.
*   `VerifiableCredential`
    *   issued by an `Issuer` (another identity) about the `Profile` or a specific entity (e.g., a particular `Experience`).
    *   cryptographically verifiable proof payload.
*   `AttestationLink`
    *   joins `VerifiableCredential` to any CV entity (experience, education, project, etc.).

* * *

3\. Core schema (TypeScript-style)
----------------------------------

### 3.1 Identity & profile

```ts
type UUID = string;    // e.g. "b1b52df0-..."
type ISODate = string; // e.g. "2025-11-25"
type ISODateTime = string; // e.g. "2025-11-25T14:30:00Z"

interface Identity {
  id: UUID;
  did?: string;                    // e.g. "did:ethr:0x..."
  primaryWalletAddress?: string;   // e.g. "0x1234..."
  ensName?: string;                // or other name system handle
  emailHash?: string;              // optional, hashed for privacy
  externalIds?: ExternalId[];
}

interface ExternalId {
  system: "linkdin" | "github" | "orcid" | "twitter" | "custom";
  value: string;         // e.g. profile URL or handle
  label?: string;        // human-readable label
}

interface Profile {
  id: UUID;
  identityId: UUID;

  slug: string;          // URL handle: "4444jjp"
  displayName: string;   // "4444jjP"
  title?: string;        // "Multimedia Artist & Scholar"
  headline?: string;     // short top-line pitch
  summaryMarkdown?: string;

  avatarUrl?: string;
  coverImageUrl?: string;

  locationText?: string; // freeform: "Berlin / Online"
  isActive: boolean;

  settings: ProfileSettings;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

### 3.2 Profile settings & presentation

```ts
interface ProfileSettings {
  visibility: "public" | "unlisted" | "private";
  defaultThemeId?: string;
  defaultLanguage?: string; // "en", "fr", etc.

  sectionOrder: ProfileSectionOrder; // ordering & toggles
}

interface ProfileSectionOrder {
  sections: ProfileSectionEntry[];
}

type ProfileSectionType =
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "publications"
  | "awards"
  | "certifications"
  | "socialLinks"
  | "timeline"
  | "customSection";

interface ProfileSectionEntry {
  type: ProfileSectionType;
  labelOverride?: string;    // e.g. "Practice", "Research"
  isVisible: boolean;
  sortOrder: number;
  customSectionId?: UUID;    // for type === "customSection"
}
```

### 3.3 CV entities

#### 3.3.1 Experience

```ts
interface Experience {
  id: UUID;
  profileId: UUID;

  roleTitle: string;
  organization: string;
  organizationUrl?: string;
  locationText?: string;

  startDate: ISODate;
  endDate?: ISODate;          // omitted if current
  isCurrent: boolean;

  employmentType?:
    | "full_time"
    | "part_time"
    | "freelance"
    | "contract"
    | "internship"
    | "self_employed"
    | "volunteer";

  descriptionMarkdown?: string;
  highlights?: string[];      // bullet points

  tags?: string[];            // for search & filtering
  skillsUsed?: SkillRef[];

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface SkillRef {
  skillId?: UUID;
  label: string;          // textual fallback
  weight?: number;        // 0–1, relative importance
}
```

#### 3.3.2 Education

```ts
interface Education {
  id: UUID;
  profileId: UUID;

  institution: string;
  institutionUrl?: string;
  degree?: string;        // "MFA", "PhD", etc.
  fieldOfStudy?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  isCurrent: boolean;

  thesisTitle?: string;
  descriptionMarkdown?: string;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

#### 3.3.3 Projects

```ts
interface Project {
  id: UUID;
  profileId: UUID;

  name: string;
  subtitle?: string;
  role?: string;

  startDate?: ISODate;
  endDate?: ISODate;
  isOngoing: boolean;

  url?: string;
  repoUrl?: string;
  mediaGallery?: MediaItem[];

  descriptionMarkdown?: string;
  highlights?: string[];

  tags?: string[];
  skillsUsed?: SkillRef[];

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface MediaItem {
  id: UUID;
  type: "image" | "video" | "audio" | "embed" | "file";
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
}
```

#### 3.3.4 Skills

```ts
interface Skill {
  id: UUID;
  profileId: UUID;

  name: string;                // canonical label
  category?:
    | "technical"
    | "artistic"
    | "theoretical"
    | "research"
    | "soft"
    | "other";

  level?: "novice" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
  lastUsedDate?: ISODate;

  isPrimary: boolean;          // for top-level display

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

#### 3.3.5 Publications, awards, certifications

```ts
interface Publication {
  id: UUID;
  profileId: UUID;

  title: string;
  venue?: string;          // journal, conference, exhibition
  publicationType?:
    | "journal"
    | "conference"
    | "book"
    | "chapter"
    | "exhibition"
    | "other";

  date?: ISODate;
  url?: string;
  doi?: string;

  authors?: string[];
  abstractMarkdown?: string;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface Award {
  id: UUID;
  profileId: UUID;

  title: string;
  issuer?: string;
  date?: ISODate;
  url?: string;

  descriptionMarkdown?: string;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface Certification {
  id: UUID;
  profileId: UUID;

  name: string;
  issuer: string;
  issueDate?: ISODate;
  expiryDate?: ISODate;
  credentialId?: string;
  credentialUrl?: string;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

#### 3.3.6 Social links & custom sections

```ts
interface SocialLink {
  id: UUID;
  profileId: UUID;

  platform:
    | "website"
    | "github"
    | "linkedin"
    | "twitter"
    | "instagram"
    | "mastodon"
    | "bluesky"
    | "youtube"
    | "custom";

  label?: string;
  url: string;
  sortOrder: number;
}

interface CustomSection {
  id: UUID;
  profileId: UUID;

  title: string;
  contentMarkdown: string;
  sortOrder: number;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

* * *

4\. Verifiable credentials & attestations
-----------------------------------------

### 4.1 Verifiable credential (abstract)

```ts
interface VerifiableCredential {
  id: UUID;
  issuerIdentityId: UUID;   // Identity of issuer
  subjectProfileId: UUID;   // Profile this VC is about

  // W3C VC type(s)
  types: string[];          // e.g. ["VerifiableCredential", "EmploymentCredential"]

  issuedAt: ISODateTime;
  expiresAt?: ISODateTime;

  // Canonical VC JSON payload (opaque to our app, but storable and indexable)
  credentialSubject: any;
  proof: any;               // cryptographic proof object

  // Convenience fields for querying
  summary?: string;         // human-readable short description
  status?: "valid" | "revoked" | "expired" | "unknown";

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

### 4.2 Linking credentials to CV entities

```ts
type CvEntityType =
  | "profile"
  | "experience"
  | "education"
  | "project"
  | "publication"
  | "award"
  | "certification"
  | "skill"
  | "customSection";

interface AttestationLink {
  id: UUID;

  credentialId: UUID;
  entityType: CvEntityType;
  entityId: UUID;

  // Display options
  visibility: "public" | "private" | "issuer_only";
  labelOverride?: string; // e.g. "Verified by X"

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

* * *

5\. Timeline / interaction layer (optional but useful)
------------------------------------------------------

For an “interactive CV” with a unified, time-ordered view and interactions:

```ts
type TimelineEntityKind =
  | "experience"
  | "education"
  | "project"
  | "publication"
  | "award"
  | "certification"
  | "custom";

interface TimelineEvent {
  id: UUID;
  profileId: UUID;

  entityKind: TimelineEntityKind;
  entityId?: UUID;           // Present if mapping to a CV entity

  title: string;             // event title
  startDate: ISODate;
  endDate?: ISODate;

  descriptionMarkdown?: string;
  tags?: string[];

  // Derived visual parameters (for rendering without recomputation)
  lane?: number;             // for timeline tracks
  importance?: number;       // 0–1, for emphasis control

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

* * *

6\. Next steps
--------------

If you tell me your preferred implementation target (e.g., JSON Schema, Prisma, SQL DDL, GraphQL, or Solidity struct layout for the on-chain subset), I can translate this schema into that format and tighten constraints (required fields, enums, indexes) for you.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)
