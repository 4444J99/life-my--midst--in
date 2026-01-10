import { describe, expect, it } from "vitest";
import { generatePersonJsonLd } from "../src/json-ld";
import type { Profile, Experience, Education, SocialLink } from "@in-midst-my-life/schema";

const mockProfile: Profile = {
  id: "p1",
  identityId: "i1",
  slug: "jdoe",
  displayName: "Jane Doe",
  title: "Software Architect",
  summaryMarkdown: "Building scalable systems.",
  avatarUrl: "https://example.com/me.jpg",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
};

const mockExp: Experience = {
  id: "e1",
  profileId: "p1",
  roleTitle: "Senior Engineer",
  organization: "Tech Corp",
  startDate: "2022-01-01",
  isCurrent: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
};

const mockEdu: Education = {
  id: "ed1",
  profileId: "p1",
  institution: "University of Code",
  startDate: "2018-01-01",
  endDate: "2022-01-01",
  isCurrent: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
};

const mockSocial: SocialLink = {
  id: "s1",
  profileId: "p1",
  platform: "github",
  url: "https://github.com/jdoe",
  sortOrder: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
};

describe("JSON-LD Generator", () => {
  it("generates basic Person schema", () => {
    const json = generatePersonJsonLd(mockProfile);
    expect(json["@type"]).toBe("Person");
    expect(json["name"]).toBe("Jane Doe");
    expect(json["jobTitle"]).toBe("Software Architect");
  });

  it("includes social links in sameAs", () => {
    const json = generatePersonJsonLd(mockProfile, { socialLinks: [mockSocial] });
    expect(json["sameAs"]).toEqual(["https://github.com/jdoe"]);
  });

  it("maps experience to hasOccupation", () => {
    const json = generatePersonJsonLd(mockProfile, { experiences: [mockExp] }, { includeCV: true });
    const occupations = json["hasOccupation"] as any[];
    expect(occupations).toHaveLength(1);
    expect(occupations[0]["@type"]).toBe("EmployeeRole");
    expect(occupations[0]["roleName"]).toBe("Senior Engineer");
  });

  it("maps education to alumniOf", () => {
    const json = generatePersonJsonLd(mockProfile, { educations: [mockEdu] }, { includeCV: true });
    const alumni = json["alumniOf"] as any[];
    expect(alumni).toHaveLength(1);
    expect(alumni[0]["name"]).toBe("University of Code");
  });
});
