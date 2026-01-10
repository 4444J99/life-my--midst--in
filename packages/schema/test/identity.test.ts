import { describe, expect, it } from "vitest";
import { IdentityCoreSchema, IdentitySchema } from "../src/identity";

describe("Identity Schema", () => {
  it("validates a valid identity core", () => {
    const validCore = {
      thesis: "Core professional identity statement",
      invariants: ["Attribute 1", "Attribute 2"],
      master_keywords: ["keyword1", "keyword2"],
      intellectual_lineage: ["influence1"],
      strategic_differentiators: ["differentiator1"],
      tensions: [],
      constraints: []
    };

    const result = IdentityCoreSchema.safeParse(validCore);
    expect(result.success).toBe(true);
  });

  it("rejects invalid identity core (thesis too short)", () => {
    const invalidCore = {
      thesis: "short",
      invariants: [],
      master_keywords: [],
      intellectual_lineage: [],
      strategic_differentiators: [],
      tensions: [],
      constraints: []
    };

    const result = IdentityCoreSchema.safeParse(invalidCore);
    expect(result.success).toBe(false);
  });

  it("validates identity metadata", () => {
    const validIdentity = {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      did: "did:example:123",
      primaryWalletAddress: "0x123",
      ensName: "user.eth",
      emailHash: "hash"
    };

    const result = IdentitySchema.safeParse(validIdentity);
    expect(result.success).toBe(true);
  });
});

