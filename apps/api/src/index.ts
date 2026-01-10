import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerProfileRoutes } from "./routes/profiles";
import { registerMaskRoutes } from "./routes/masks";
import { registerCvRoutes } from "./routes/cv";
import { registerCurriculumVitaeMultiplexRoutes } from "./routes/curriculum-vitae-multiplex";
import { registerNarrativeRoutes } from "./routes/narratives";
import { registerAetasRoutes } from "./routes/aetas";
import { registerExportRoutes } from "./routes/exports";
import { registerAgentRoutes } from "./routes/agent-interface";
import { registerAttestationBlockRoutes } from "./routes/attestation-blocks";
import { jobRoutes } from "./routes/jobs";
import { interviewRoutes } from "./routes/interviews";
import { registerHunterProtocolRoutes } from "./routes/hunter-protocol";
import type { ProfileRepo } from "./repositories/profiles";
import type { MaskRepo, EpochRepo, StageRepo } from "./repositories/masks";
import { createMaskRepo } from "./repositories/masks";
import { profileRepo } from "./repositories/profiles";
import type { CvRepos } from "./repositories/cv";
import { cvRepos } from "./repositories/cv";
import type { BackupRepo } from "./repositories/backups";

export interface ApiServerOptions {
  profileRepo?: ProfileRepo;
  maskRepo?: MaskRepo;
  epochRepo?: EpochRepo;
  stageRepo?: StageRepo;
  cvRepos?: CvRepos;
  backupRepo?: BackupRepo;
}

export function buildServer(options: ApiServerOptions = {}) {
  const fastify = Fastify({
    logger: true
  });
  const metrics = { requests: 0, errors: 0 };

  const maskRepoDefaults = createMaskRepo();
  const maskRepo = options.maskRepo ?? maskRepoDefaults.masks;
  const epochRepo = options.epochRepo ?? maskRepoDefaults.epochs;
  const stageRepo = options.stageRepo ?? maskRepoDefaults.stages;

  fastify.register(cors);

  fastify.addHook("onRequest", async () => {
    metrics.requests += 1;
  });

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, "request_error");
    metrics.errors += 1;
    const status = (error as any).statusCode ?? 500;
    return reply.status(status).send({
      ok: false,
      error: (error as any).code ?? "internal_error",
      message: error.message
    });
  });

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.get("/ready", async (request, reply) => {
    try {
      await (options.profileRepo ?? profileRepo).list(0, 1);
      return { status: "ready" };
    } catch (err) {
      request.log.error({ err }, "readiness_failed");
      return reply.code(503).send({ status: "degraded" });
    }
  });

  fastify.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", "text/plain; version=0.0.4");
    return [
      "# HELP api_requests_total Total API requests processed.",
      "# TYPE api_requests_total counter",
      `api_requests_total ${metrics.requests}`,
      "# HELP api_errors_total Total API requests resulting in error.",
      "# TYPE api_errors_total counter",
      `api_errors_total ${metrics.errors}`
    ].join("\n");
  });

  fastify.register(registerProfileRoutes, {
    prefix: "/profiles",
    repo: options.profileRepo,
    maskRepo,
    epochRepo,
    stageRepo
  });
  fastify.register(registerCvRoutes, { prefix: "/profiles", repos: options.cvRepos ?? cvRepos });
  fastify.register(registerCurriculumVitaeMultiplexRoutes, { prefix: "/profiles" });
  fastify.register(registerNarrativeRoutes, { prefix: "/profiles" });
  fastify.register(registerAetasRoutes, { prefix: "/profiles" });
  fastify.register(registerExportRoutes, {
    prefix: "/profiles",
    profileRepo: options.profileRepo ?? profileRepo,
    cvRepos: options.cvRepos ?? cvRepos,
    backupRepo: options.backupRepo,
    maskRepo,
    epochRepo,
    stageRepo
  });
  fastify.register(registerAgentRoutes, { prefix: "/agent" });
  fastify.register(registerMaskRoutes, {
    prefix: "/taxonomy",
    masks: maskRepo,
    epochs: epochRepo,
    stages: stageRepo
  });
  fastify.register(registerAttestationBlockRoutes);
  fastify.register(jobRoutes);
  fastify.register(interviewRoutes);
  fastify.register(registerHunterProtocolRoutes, { prefix: "/profiles" });

  return fastify;
}

export async function start() {
  const fastify = buildServer();
  try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

if (process.env["NODE_ENV"] !== "test") {
  start();
}
