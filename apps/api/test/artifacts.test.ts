import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src";
import { createProfileRepo } from "../src/repositories/profiles";
import { createCvRepos } from "../src/repositories/cv";
import { artifactService } from "../src/services/artifact-service";

const profileId = "00000000-0000-0000-0000-000000000001";

describe("artifact routes", () => {
  let server: ReturnType<typeof buildServer>;

  beforeAll(async () => {
    // Mock repositories are not directly used by artifactService (which has its own mock impl)
    // but buildServer requires them
    const profileRepo = createProfileRepo({ kind: "memory" });
    const cvRepos = createCvRepos({ kind: "memory" });
    server = buildServer({ profileRepo, cvRepos });

    // Pre-populate an artifact for testing
    await artifactService.createArtifact({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Test Paper",
      artifactType: "academic_paper",
      status: "pending",
      tags: ["research"],
      sourceProvider: "manual"
    }, profileId);
  });

  it("lists artifacts with pagination", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/artifacts?limit=10`
    });
    
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination.limit).toBe(10);
  });

  it("filters artifacts by status and type", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/artifacts?status=pending&type=academic_paper`
    });
    
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data[0].status).toBe("pending");
    expect(body.data[0].artifactType).toBe("academic_paper");
  });

  it("gets a single artifact", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/artifacts/11111111-1111-1111-1111-111111111111`
    });
    
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe("Test Paper");
  });

  it("returns 404 for non-existent artifact", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/artifacts/00000000-0000-0000-0000-000000009999`
    });
    
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("artifact_not_found");
  });

  it("updates artifact metadata", async () => {
    const res = await server.inject({
      method: "PATCH",
      url: `/profiles/${profileId}/artifacts/11111111-1111-1111-1111-111111111111`,
      payload: {
        title: "Updated Title",
        tags: ["research", "updated"]
      }
    });
    
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe("Updated Title");
    expect(body.data.tags).toContain("updated");
  });

  it("approves an artifact", async () => {
    const res = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/artifacts/11111111-1111-1111-1111-111111111111/approve`
    });
    
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("approved");
  });

  it("rejects an artifact", async () => {
    // Create new artifact for rejection
    const newArtifact = await artifactService.createArtifact({
      title: "To Reject",
      status: "pending"
    }, profileId);

    const res = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/artifacts/${newArtifact.id}/reject`,
      payload: {
        reason: "Duplicate"
      }
    });
    
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("rejected");
    expect(body.data.descriptionMarkdown).toContain("Rejected: Duplicate");
  });

  it("soft deletes an artifact", async () => {
    const res = await server.inject({
      method: "DELETE",
      url: `/profiles/${profileId}/artifacts/11111111-1111-1111-1111-111111111111`
    });
    
    expect(res.statusCode).toBe(200);
    
    // Verify it's archived
    const check = await server.inject({
      method: "GET",
      url: `/profiles/${profileId}/artifacts/11111111-1111-1111-1111-111111111111`
    });
    expect(check.json().data.status).toBe("archived");
  });

  it("validates input types", async () => {
    const res = await server.inject({
      method: "PATCH",
      url: `/profiles/${profileId}/artifacts/11111111-1111-1111-1111-111111111111`,
      payload: {
        title: 123 // Invalid type
      }
    });
    
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("validation_error");
  });
});

describe("integration routes", () => {
  let server: ReturnType<typeof buildServer>;

  beforeAll(async () => {
    const profileRepo = createProfileRepo({ kind: "memory" });
    const cvRepos = createCvRepos({ kind: "memory" });
    server = buildServer({ profileRepo, cvRepos });
  });

  it("initiates oauth flow", async () => {
    // We need to set env vars for config to be valid
    process.env['GOOGLE_DRIVE_CLIENT_ID'] = "test-client-id";

    const res = await server.inject({
      method: "POST",
      url: "/integrations/cloud-storage/connect",
      payload: {
        provider: "google_drive",
        profileId
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.authorizationUrl).toContain("accounts.google.com");
    expect(body.state).toBeDefined();
  });

  it("validates provider", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/integrations/cloud-storage/connect",
      payload: {
        provider: "invalid_provider",
        profileId
      }
    });

    expect(res.statusCode).toBe(400);
  });
});
