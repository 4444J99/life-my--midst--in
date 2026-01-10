import { describe, expect, it } from "vitest";
import {
  ProfileSchema,
  MaskSchema,
  EpochSchema,
  StageSchema,
  ExperienceSchema,
  EducationSchema,
  SkillSchema,
  NarrativeBlockSchema,
  NarrativeSnapshotSchema,
  VerificationLogSchema,
  type Profile,
  type Mask,
  type Epoch,
  type Stage
} from "../src/index";

describe("Schema Validation Suite", () => {
  describe("Profile Schema", () => {
    const validProfile = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      displayName: "Jane Doe",
      title: "Senior Engineer",
      summaryMarkdown: "Experienced software engineer",
      email: "jane@example.com",
      phone: "+1234567890",
      location: "San Francisco, CA",
      website: "https://example.com",
      avatarUrl: "https://example.com/avatar.png",
      slug: "jane-doe",
      visibility: { default: "everyone" },
      sectionOrder: ["experience", "education", "skills"],
      agentSettings: { enabled: false }
    };

    it("validates a valid profile", () => {
      const result = ProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it("requires displayName", () => {
      const { displayName, ...invalid } = validProfile;
      const result = ProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("requires a UUID id", () => {
      const invalid = { ...validProfile, id: "not-a-uuid" };
      const result = ProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("allows minimal profile with just displayName", () => {
      const minimal = { displayName: "John Doe" };
      const result = ProfileSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it("validates email format if provided", () => {
      const invalidEmail = { ...validProfile, email: "not-an-email" };
      const result = ProfileSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });

    it("validates website URL if provided", () => {
      const invalidUrl = { ...validProfile, website: "not-a-url" };
      const result = ProfileSchema.safeParse(invalidUrl);
      expect(result.success).toBe(false);
    });
  });

  describe("Mask Schema", () => {
    const validMask: Mask = {
      id: "analyst",
      name: "Analyst",
      ontology: "cognitive",
      functional_scope: "precision reasoning",
      stylistic_parameters: {
        tone: "neutral",
        rhetorical_mode: "deductive",
        compression_ratio: 0.55
      },
      activation_rules: {
        contexts: ["analysis"],
        triggers: ["metric"]
      },
      filters: {
        include_tags: ["analysis"],
        exclude_tags: [],
        priority_weights: { metric: 2 }
      }
    };

    it("validates a valid mask", () => {
      const result = MaskSchema.safeParse(validMask);
      expect(result.success).toBe(true);
    });

    it("validates all ontology types", () => {
      const ontologies = ["cognitive", "expressive", "operational"];
      ontologies.forEach((ontology) => {
        const mask = { ...validMask, ontology };
        const result = MaskSchema.safeParse(mask);
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid ontology", () => {
      const invalid = { ...validMask, ontology: "invalid" };
      const result = MaskSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("requires valid compression ratio (0-1)", () => {
      const tooHigh = {
        ...validMask,
        stylistic_parameters: { ...validMask.stylistic_parameters, compression_ratio: 1.5 }
      };
      const result = MaskSchema.safeParse(tooHigh);
      expect(result.success).toBe(false);
    });

    it("validates priority weights are positive", () => {
      const invalid = {
        ...validMask,
        filters: { ...validMask.filters, priority_weights: { test: -1 } }
      };
      const result = MaskSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Epoch Schema", () => {
    const validEpoch: Epoch = {
      id: "mastery",
      name: "Mastery",
      order: 5,
      summary: "Peak competence phase"
    };

    it("validates a valid epoch", () => {
      const result = EpochSchema.safeParse(validEpoch);
      expect(result.success).toBe(true);
    });

    it("requires id, name, and order", () => {
      const minimal = { id: "test", name: "Test" };
      const result = EpochSchema.safeParse(minimal);
      expect(result.success).toBe(false);
    });

    it("accepts optional stages array", () => {
      const withStages = {
        ...validEpoch,
        stages: [
          { id: "stage-1", title: "Stage 1", order: 1 }
        ]
      };
      const result = EpochSchema.safeParse(withStages);
      expect(result.success).toBe(true);
    });

    it("order must be an integer", () => {
      const invalid = { ...validEpoch, order: 5.5 };
      const result = EpochSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Stage Schema", () => {
    const validStage: Stage = {
      id: "stage-leadership",
      title: "Team Leadership",
      summary: "Led engineering teams",
      tags: ["leadership", "mentoring"],
      order: 2
    };

    it("validates a valid stage", () => {
      const result = StageSchema.safeParse(validStage);
      expect(result.success).toBe(true);
    });

    it("requires id and title", () => {
      const minimal = { id: "test" };
      const result = StageSchema.safeParse(minimal);
      expect(result.success).toBe(false);
    });

    it("accepts optional epochId", () => {
      const withEpoch = { ...validStage, epochId: "epoch-mastery" };
      const result = StageSchema.safeParse(withEpoch);
      expect(result.success).toBe(true);
    });

    it("validates tags as array of strings", () => {
      const invalid = { ...validStage, tags: ["valid", 123] };
      const result = StageSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Experience Schema", () => {
    const validExperience = {
      id: "exp-001",
      roleTitle: "Senior Engineer",
      organization: "Tech Corp",
      startDate: "2020-01-01T00:00:00Z",
      isCurrent: true,
      tags: ["leadership", "engineering"],
      descriptionMarkdown: "Led the engineering team"
    };

    it("validates a valid experience", () => {
      const result = ExperienceSchema.safeParse(validExperience);
      expect(result.success).toBe(true);
    });

    it("requires roleTitle and organization", () => {
      const invalid = { id: "exp-001" };
      const result = ExperienceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("validates ISO datetime for startDate", () => {
      const invalid = { ...validExperience, startDate: "2020-01-01" };
      const result = ExperienceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("allows optional endDate", () => {
      const withEnd = { ...validExperience, endDate: "2023-12-31T23:59:59Z", isCurrent: false };
      const result = ExperienceSchema.safeParse(withEnd);
      expect(result.success).toBe(true);
    });
  });

  describe("Education Schema", () => {
    const validEducation = {
      id: "edu-001",
      institution: "MIT",
      fieldOfStudy: "Computer Science",
      degreeType: "Bachelor",
      startDate: "2016-09-01T00:00:00Z"
    };

    it("validates a valid education entry", () => {
      const result = EducationSchema.safeParse(validEducation);
      expect(result.success).toBe(true);
    });

    it("requires institution and fieldOfStudy", () => {
      const invalid = { id: "edu-001" };
      const result = EducationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("allows optional graduationDate", () => {
      const withGraduation = { ...validEducation, graduationDate: "2020-05-30T00:00:00Z" };
      const result = EducationSchema.safeParse(withGraduation);
      expect(result.success).toBe(true);
    });
  });

  describe("Skill Schema", () => {
    const validSkill = {
      id: "skill-typescript",
      name: "TypeScript",
      category: "Programming Languages",
      proficiencyLevel: "Expert"
    };

    it("validates a valid skill", () => {
      const result = SkillSchema.safeParse(validSkill);
      expect(result.success).toBe(true);
    });

    it("requires name and category", () => {
      const invalid = { id: "skill-001" };
      const result = SkillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("validates proficiency levels", () => {
      const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];
      levels.forEach((level) => {
        const skill = { ...validSkill, proficiencyLevel: level };
        const result = SkillSchema.safeParse(skill);
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid proficiency level", () => {
      const invalid = { ...validSkill, proficiencyLevel: "Superhero" };
      const result = SkillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Narrative Schema", () => {
    const validBlock = {
      title: "Summary",
      body: "Professional summary text",
      tags: ["summary"]
    };

    it("validates a narrative block", () => {
      const result = NarrativeBlockSchema.safeParse(validBlock);
      expect(result.success).toBe(true);
    });

    it("requires title and body", () => {
      const invalid = { title: "Summary" };
      const result = NarrativeBlockSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("allows optional tags", () => {
      const withTags = { ...validBlock, tags: ["work", "professional"] };
      const result = NarrativeBlockSchema.safeParse(withTags);
      expect(result.success).toBe(true);
    });
  });

  describe("Narrative Snapshot Schema", () => {
    const validSnapshot = {
      id: "750e8400-e29b-41d4-a716-446655440002",
      profileId: "550e8400-e29b-41d4-a716-446655440000",
      maskId: "analyst",
      status: "approved" as const,
      blocks: [
        { title: "Summary", body: "Summary text", tags: [] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it("validates a valid narrative snapshot", () => {
      const result = NarrativeSnapshotSchema.safeParse(validSnapshot);
      expect(result.success).toBe(true);
    });

    it("validates status enum", () => {
      const statuses = ["draft", "approved", "rejected"];
      statuses.forEach((status) => {
        const snapshot = { ...validSnapshot, status };
        const result = NarrativeSnapshotSchema.safeParse(snapshot);
        expect(result.success).toBe(true);
      });
    });

    it("requires profileId and blocks", () => {
      const invalid = { id: "123" };
      const result = NarrativeSnapshotSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("allows optional approvalMetadata", () => {
      const approved = {
        ...validSnapshot,
        approvedAt: new Date().toISOString(),
        approvedBy: "user-123"
      };
      const result = NarrativeSnapshotSchema.safeParse(approved);
      expect(result.success).toBe(true);
    });
  });

  describe("Verification Schema", () => {
    const validLog = {
      id: "verif-001",
      profileId: "550e8400-e29b-41d4-a716-446655440000",
      status: "verified" as const,
      verifiedAt: new Date().toISOString(),
      verificationMethod: "email"
    };

    it("validates a verification log", () => {
      const result = VerificationLogSchema.safeParse(validLog);
      expect(result.success).toBe(true);
    });

    it("validates status enum", () => {
      const statuses = ["pending", "verified", "rejected", "expired", "revoked"];
      statuses.forEach((status) => {
        const log = { ...validLog, status };
        const result = VerificationLogSchema.safeParse(log);
        expect(result.success).toBe(true);
      });
    });

    it("requires profileId and status", () => {
      const invalid = { id: "verif-001" };
      const result = VerificationLogSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
