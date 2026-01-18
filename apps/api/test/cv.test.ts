import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src";
import { createProfileRepo } from "../src/repositories/profiles";
import { createCvRepos } from "../src/repositories/cv";

const profileId = "00000000-0000-0000-0000-000000000001";

describe("cv routes", () => {
  let server: ReturnType<typeof buildServer>;

  beforeAll(async () => {
    const profileRepo = createProfileRepo({ kind: "memory" });
    await profileRepo.reset();
    const cvRepos = createCvRepos({ kind: "memory" });
    server = buildServer({ profileRepo, cvRepos });
  });

  it("creates and lists experiences", async () => {
    const now = new Date().toISOString();
    const payload = {
      id: "00000000-0000-0000-0000-000000000101",
      profileId,
      roleTitle: "Systems Designer",
      organization: "Midst Labs",
      startDate: "2021-01-01T00:00:00Z",
      isCurrent: true,
      createdAt: now,
      updatedAt: now
    };

    const create = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/experiences`,
      payload
    });
    expect(create.statusCode).toBe(200);

    const list = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/experiences`
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data.length).toBeGreaterThan(0);
  });

  it("creates credentials and attestations", async () => {
    const now = new Date().toISOString();
    const credential = {
      id: "00000000-0000-0000-0000-000000000201",
      issuerIdentityId: "00000000-0000-0000-0000-000000000010",
      subjectProfileId: profileId,
      types: ["VerifiableCredential", "EmploymentCredential"],
      issuedAt: now,
      credentialSubject: { summary: "Employment verified" },
      proof: { type: "stub", signature: "none" },
      createdAt: now,
      updatedAt: now
    };

    const createCredential = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/credentials`,
      payload: credential
    });
    expect(createCredential.statusCode).toBe(200);

    const attestation = {
      id: "00000000-0000-0000-0000-000000000202",
      credentialId: credential.id,
      entityType: "experience",
      entityId: "00000000-0000-0000-0000-000000000101",
      visibility: "public",
      createdAt: now,
      updatedAt: now
    };

    const createAttestation = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/attestations`,
      payload: attestation
    });
    expect(createAttestation.statusCode).toBe(200);

    const list = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/attestations`
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data.length).toBeGreaterThan(0);
  });

  it("creates content edges and revisions", async () => {
    const now = new Date().toISOString();
    const edge = {
      id: "00000000-0000-0000-0000-000000000301",
      profileId,
      fromType: "experience",
      fromId: "00000000-0000-0000-0000-000000000101",
      toType: "project",
      toId: "00000000-0000-0000-0000-000000000103",
      relationType: "led",
      metadata: {},
      createdAt: now,
      updatedAt: now
    };

    const createEdge = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/graph/edges`,
      payload: edge
    });
    expect(createEdge.statusCode).toBe(200);

    const listEdges = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/graph/edges`
    });
    expect(listEdges.statusCode).toBe(200);

    const revision = {
      id: "00000000-0000-0000-0000-000000000401",
      profileId,
      entityType: "experience",
      entityId: "00000000-0000-0000-0000-000000000101",
      data: { snapshot: "initial" },
      createdAt: now
    };

    const createRevision = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/revisions`,
      payload: revision
    });
    expect(createRevision.statusCode).toBe(200);

    const listRevisions = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/revisions`
    });
    expect(listRevisions.statusCode).toBe(200);
  });
});
