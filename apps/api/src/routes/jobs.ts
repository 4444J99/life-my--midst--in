import type { FastifyPluginAsync } from "fastify";
import { 
  JobPostingSchema, 
  JobApplicationSchema,
  type JobPosting,
  type JobApplication 
} from "@in-midst-my-life/schema";
import { NotFoundError } from "@in-midst-my-life/core";
import { jobRepo } from "../repositories/jobs";
import { randomUUID } from "crypto";

export const jobRoutes: FastifyPluginAsync = async (server) => {
  // --- JOB POSTINGS ---

  server.post("/postings", async (req, reply) => {
    // Check if ID is provided in body (e.g. from IngestorAgent)
    // If not, rely on schema parsing without ID and generate one.
    const bodyAny = req.body as any;
    const providedId = bodyAny.id;

    // We allow passing the ID if it's valid UUID, otherwise generate
    const id = providedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedId) 
      ? providedId 
      : randomUUID();

    const body = JobPostingSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    }).parse(req.body);

    const now = new Date().toISOString();
    
    const posting: JobPosting = {
      id,
      ...body,
      createdAt: now,
      updatedAt: now
    };

    const saved = await jobRepo.addPosting(posting);
    return reply.status(201).send(saved);
  });

  server.get("/postings", async (_req, _reply) => {
    return jobRepo.listPostings();
  });

  server.get("/postings/:id", async (req, _reply) => {
    const { id } = req.params as { id: string };
    const posting = await jobRepo.findPosting(id);
    if (!posting) throw new NotFoundError(`Job posting ${id} not found`);
    return posting;
  });

  // --- JOB APPLICATIONS ---

  server.post("/applications", async (req, reply) => {
    const body = JobApplicationSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    }).parse(req.body);

    const id = randomUUID();
    const now = new Date().toISOString();

    const application: JobApplication = {
      id,
      ...body,
      createdAt: now,
      updatedAt: now
    };

    const saved = await jobRepo.addApplication(application);
    return reply.status(201).send(saved);
  });

  server.get("/applications", async (_req, _reply) => {
    return jobRepo.listApplications();
  });
};
