import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/index";
import { createProfileRepo, type ProfileRepo } from "../src/repositories/profiles";

let server: ReturnType<typeof buildServer>;
let repo: ProfileRepo;
beforeAll(async () => {
  repo = createProfileRepo({ kind: "memory" });
  await repo.reset();
  server = buildServer({ profileRepo: repo });
});

describe("profiles routes", () => {
  it("returns 200 and parsed profile on valid payload", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/profiles/validate",
      payload: {
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        identityId: "6fa85f64-5717-4562-b3fc-2c963f66afa6",
        slug: "demo",
        displayName: "Demo User",
        title: "Builder",
        headline: "Ship fast",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z"
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.data.displayName).toBe("Demo User");
  });

  it("returns 400 on invalid payload", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/profiles/validate",
      payload: {
        id: "not-a-uuid"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().ok).toBe(false);
  });

  it("creates and fetches a profile", async () => {
    const payload = {
      id: "9fa85f64-5717-4562-b3fc-2c963f66afa6",
      identityId: "9fa85f64-5717-4562-b3fc-2c963f66afa7",
      slug: "demo-2",
      displayName: "Demo Two",
      title: "Engineer",
      headline: "Ships things",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    };

    const create = await server.inject({
      method: "POST",
      url: "/profiles",
      payload
    });
    expect(create.statusCode).toBe(200);

    const list = await server.inject({ method: "GET", url: "/profiles" });
    expect(list.statusCode).toBe(200);
    expect(list.json().data.length).toBeGreaterThan(0);

    const single = await server.inject({ method: "GET", url: `/profiles/${payload.id}` });
    expect(single.statusCode).toBe(200);
    expect(single.json().data.displayName).toBe("Demo Two");
  });

  it("updates and deletes a profile", async () => {
    const payload = {
      id: "5fa85f64-5717-4562-b3fc-2c963f66afa6",
      identityId: "5fa85f64-5717-4562-b3fc-2c963f66afa7",
      slug: "demo-4",
      displayName: "Demo Four",
      title: "Engineer",
      headline: "Ships things",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    };

    await server.inject({ method: "POST", url: "/profiles", payload });

    const patch = await server.inject({
      method: "PATCH",
      url: `/profiles/${payload.id}`,
      payload: { title: "Senior Engineer" }
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().data.title).toBe("Senior Engineer");

    const del = await server.inject({ method: "DELETE", url: `/profiles/${payload.id}` });
    expect(del.statusCode).toBe(200);
  });

  it("selects masks for a profile based on contexts", async () => {
    const payload = {
      id: "7fa85f64-5717-4562-b3fc-2c963f66afa6",
      identityId: "7fa85f64-5717-4562-b3fc-2c963f66afa7",
      slug: "demo-3",
      displayName: "Demo Three",
      title: "Designer",
      headline: "Designs systems",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    };

    await server.inject({ method: "POST", url: "/profiles", payload });
    const select = await server.inject({
      method: "POST",
      url: `/profiles/${payload.id}/masks/select`,
      payload: { contexts: ["design"] }
    });

    expect(select.statusCode).toBe(200);
    const data = select.json().data;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("architect");
  });

  it("builds narrative for profile", async () => {
    const payload = {
      id: "6fa85f64-5717-4562-b3fc-2c963f66afa6",
      identityId: "6fa85f64-5717-4562-b3fc-2c963f66afa7",
      slug: "demo-5",
      displayName: "Demo Five",
      title: "Designer",
      headline: "Designs systems",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    };
    await server.inject({ method: "POST", url: "/profiles", payload });

    const res = await server.inject({
      method: "POST",
      url: `/profiles/${payload.id}/narrative`,
      payload: { contexts: ["design"], tags: ["design"], timeline: [] }
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });

  it("exposes Prometheus metrics", async () => {
    const res = await server.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("# HELP api_requests_total");
  });

  it("returns degraded ready when repo fails", async () => {
    const failingRepo: ProfileRepo = {
      list: async () => {
        throw new Error("down");
      },
      add: async () => {
        throw new Error("down");
      },
      find: async () => {
        throw new Error("down");
      },
      update: async () => {
        throw new Error("down");
      },
      remove: async () => {
        throw new Error("down");
      },
      reset: async () => {
        throw new Error("down");
      }
    };
    const failingServer = buildServer({ profileRepo: failingRepo });
    const res = await failingServer.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
  });
});
