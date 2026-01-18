import { describe, it, expect } from "vitest";
import { DocumentGenerator } from "../../src/hunter-protocol/document-generator";
import { Profile } from "@in-midst-my-life/schema";
import { v4 as uuidv4 } from "uuid";

describe("DocumentGenerator Integration", () => {
  const generator = new DocumentGenerator();

  const mockProfile: Profile = {
    id: uuidv4(),
    identityId: uuidv4(),
    slug: "test-user",
    displayName: "Test User",
    title: "Senior Engineer",
    headline: "Building things",
    summaryMarkdown: "Experienced engineer with a passion for testing.",
    locationText: "New York, NY",
    email: "test@example.com",
    phone: "555-0123",
    website: "https://example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    skills: [
      {
        id: uuidv4(),
        profileId: uuidv4(),
        name: "TypeScript",
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        profileId: uuidv4(),
        name: "Vitest",
        isPrimary: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    experiences: [
      {
        id: uuidv4(),
        profileId: uuidv4(),
        roleTitle: "Lead Developer",
        organization: "Tech Corp",
        startDate: "2020-01-01T00:00:00Z",
        isCurrent: true,
        highlights: ["Built the core platform", "Managed team of 5"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        profileId: uuidv4(),
        roleTitle: "Junior Dev",
        organization: "Startup Inc",
        startDate: "2018-01-01T00:00:00Z",
        endDate: "2019-12-31T00:00:00Z",
        isCurrent: false,
        highlights: ["Fixed bugs"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    education: [
      {
        id: uuidv4(),
        profileId: uuidv4(),
        institution: "State University",
        degree: "BS Computer Science",
        startDate: "2014-09-01T00:00:00Z",
        endDate: "2018-05-01T00:00:00Z",
        isCurrent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const mockJob = {
    id: "job-123",
    title: "Senior Engineer",
    company: "Big Tech",
    description: "We need a senior engineer who knows TypeScript.",
    requirements: "TypeScript, Node.js",
    location: "Remote",
    postedAt: new Date().toISOString(),
  };

  it("should generate a resume with real profile data", async () => {
    const result = await generator.generateResume(mockProfile, mockJob);

    // Header
    expect(result.content).toContain("Test User");
    expect(result.content).toContain("test@example.com");
    expect(result.content).toContain("555-0123");
    expect(result.content).toContain("New York, NY");
    expect(result.content).toContain("https://example.com");

    // Summary
    expect(result.content).toContain("Experienced engineer with a passion for testing.");

    // Experience
    expect(result.content).toContain("Lead Developer | Tech Corp");
    expect(result.content).toContain("Built the core platform");
    expect(result.content).toContain("Junior Dev | Startup Inc");
    expect(result.content).toContain("Fixed bugs");

    // Skills
    expect(result.content).toContain("- TypeScript");
    expect(result.content).toContain("- Vitest");

    // Education
    expect(result.content).toContain("BS Computer Science | State University");
    expect(result.content).toContain("2018");
  });

  it("should handle missing optional data gracefully", async () => {
    const minimalProfile: Profile = {
      id: uuidv4(),
      identityId: uuidv4(),
      slug: "minimal-user",
      displayName: "Minimal User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    const result = await generator.generateResume(minimalProfile, mockJob);

    expect(result.content).toContain("Minimal User");
    expect(result.content).toContain("Remote"); // Default location
    expect(result.content).toContain("No experience data available.");
  });
});
