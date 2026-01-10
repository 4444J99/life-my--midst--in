import { describe, expect, it } from "vitest";
import { buildServer } from "../src";
import { createMaskRepo } from "../src/repositories/masks";

describe("mask taxonomy routes", () => {
  const repos = createMaskRepo();
  const app = buildServer({
    maskRepo: repos.masks,
    epochRepo: repos.epochs,
    stageRepo: repos.stages
  });

  it("lists masks with pagination", async () => {
    const res = await app.inject({ method: "GET", url: "/taxonomy/masks?offset=0&limit=5" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.ok).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
  });

  it("filters masks by ontology and tag", async () => {
    const res = await app.inject({ method: "GET", url: "/taxonomy/masks?ontology=cognitive&tag=analysis&limit=5" });
    const body = res.json() as any;
    expect(body.data.every((m: any) => m.ontology === "cognitive")).toBe(true);
    expect(body.filters.tag).toBe("analysis");
  });

  it("returns epochs with stages", async () => {
    const res = await app.inject({ method: "GET", url: "/taxonomy/epochs" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.data[0].stages.length).toBeGreaterThan(0);
  });

  it("paginates stages independently", async () => {
    const res = await app.inject({ method: "GET", url: "/taxonomy/stages?offset=0&limit=1" });
    const body = res.json() as any;
    expect(body.data.length).toBe(1);
    expect(body.total).toBeGreaterThan(1);
  });

  it("returns offset/limit metadata and filters for masks", async () => {
    const res = await app.inject({ method: "GET", url: "/taxonomy/masks?ontology=cognitive&offset=1&limit=2" });
    const body = res.json() as any;
    expect(body.offset).toBe(1);
    expect(body.limit).toBe(2);
    expect(body.filters.ontology).toBe("cognitive");
  });

  it("searches masks by name or functional scope", async () => {
    const res = await app.inject({ method: "GET", url: "/taxonomy/masks?search=design&limit=3" });
    const body = res.json() as any;
    expect(body.filters.search).toBe("design");
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.some((m: any) => m.functional_scope.toLowerCase().includes("design"))).toBe(true);
  });

  it("filters stages by epoch and preserves ordering", async () => {
    const epochsRes = await app.inject({ method: "GET", url: "/taxonomy/epochs" });
    const epochId = (epochsRes.json() as any).data[0].id;
    const res = await app.inject({ method: "GET", url: `/taxonomy/stages?epochId=${epochId}&limit=5` });
    const body = res.json() as any;
    const orders = body.data.map((s: any) => s.order);
    expect(body.filters.epochId).toBe(epochId);
    expect(body.data.every((s: any) => s.epochId === epochId)).toBe(true);
    expect([...orders].sort((a: number, b: number) => a - b)).toEqual(orders);
  });
});
