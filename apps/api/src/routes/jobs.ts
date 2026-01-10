import type { FastifyPluginAsync } from "fastify";
import { 
  JobPostingSchema, 
  JobApplicationSchema,
  type JobPosting,
  type JobApplication 
} from "@in-midst-my-life/schema";
import { NotFoundError } from "@in-midst-my-life/core";

// Mock in-memory storage for now
const postings = new Map<string, JobPosting>();
const applications = new Map<string, JobApplication>();

export const jobRoutes: FastifyPluginAsync = async (server) => {
  // --- JOB POSTINGS ---

  server.post("/postings", async (req, reply) => {
    const body = JobPostingSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    }).parse(req.body);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const posting: JobPosting = {
      id,
      ...body,
      createdAt: now,
      updatedAt: now
    };

    postings.set(id, posting);
    return reply.status(201).send(posting);
  });

  server.get("/postings", async (_req, _reply) => {
    return Array.from(postings.values());
  });

  server.get("/postings/:id", async (req, _reply) => {
    const { id } = req.params as { id: string };
    const posting = postings.get(id);
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

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const application: JobApplication = {
      id,
      ...body,
      createdAt: now,
      updatedAt: now
    };

    applications.set(id, application);
    return reply.status(201).send(application);
  });

  server.get("/applications", async (_req, _reply) => {
    return Array.from(applications.values());
  });
};
