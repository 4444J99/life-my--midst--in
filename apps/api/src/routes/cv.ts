import type { FastifyInstance } from "fastify";
import * as jose from "jose";
import { z } from "zod";
import type { JsonbEntityRepo, CvRepos, AttestationRepo, ContentEdgeRepo, ContentRevisionRepo } from "../repositories/cv";
import { cvRepos } from "../repositories/cv";
import { profileKeyRepo } from "../repositories/profile-keys";
import { signIntegrity } from "@in-midst-my-life/core";
import { profileRepo } from "../repositories/profiles";
import {
  PaginationSchema,
  ExperienceCreateSchema,
  ExperienceUpdateSchema,
  EducationCreateSchema,
  EducationUpdateSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  SkillCreateSchema,
  SkillUpdateSchema,
  PublicationCreateSchema,
  PublicationUpdateSchema,
  AwardCreateSchema,
  AwardUpdateSchema,
  CertificationCreateSchema,
  CertificationUpdateSchema,
  CustomSectionCreateSchema,
  CustomSectionUpdateSchema,
  SocialLinkCreateSchema,
  SocialLinkUpdateSchema,
  TimelineEventCreateSchema,
  TimelineEventUpdateSchema,
  VerificationLogCreateSchema,
  VerificationLogUpdateSchema,
  VerifiableCredentialCreateSchema,
  VerifiableCredentialUpdateSchema,
  AttestationLinkCreateSchema,
  AttestationLinkUpdateSchema,
  ContentEdgeCreateSchema,
  ContentEdgeUpdateSchema,
  ContentRevisionCreateSchema
} from "../validation";

type EntityConfig = {
  name: string;
  repo: JsonbEntityRepo<any>;
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
  profileField: string;
};

interface CvRouteDeps {
  repos?: CvRepos;
}

const RevisionQuerySchema = PaginationSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional()
});

const attachIntegrity = async <T extends Record<string, unknown>>(profileId: string, entity: T) => {
  const existing = await profileKeyRepo.get(profileId);
  if (!existing) {
    const record = await profileKeyRepo.create(profileId);
    const profile = await profileRepo.find(profileId);
    if (profile && !profile.did) {
      await profileRepo.update(profileId, { did: record.did });
    }
  }
  const keyPair = await profileKeyRepo.getKeyPair(profileId);
  const keyRecord = await profileKeyRepo.get(profileId);
  if (!keyPair || !keyRecord) return entity;
  const publicKeyJwk = keyRecord.publicKeyJwk ?? (await jose.exportJWK(keyPair.publicKey as any));
  const integrity = await signIntegrity(entity, keyPair, publicKeyJwk);
  return { ...entity, integrity };
};

const INTEGRITY_COLLECTIONS = new Set([
  "experiences",
  "educations",
  "projects",
  "skills",
  "publications",
  "awards",
  "certifications",
  "custom-sections",
  "social-links"
]);

export async function registerCvRoutes(fastify: FastifyInstance, deps?: CvRouteDeps) {
  const repos = deps?.repos ?? cvRepos;

  const entityConfigs: EntityConfig[] = [
    { name: "experiences", repo: repos.experiences, createSchema: ExperienceCreateSchema, updateSchema: ExperienceUpdateSchema, profileField: "profileId" },
    { name: "educations", repo: repos.educations, createSchema: EducationCreateSchema, updateSchema: EducationUpdateSchema, profileField: "profileId" },
    { name: "projects", repo: repos.projects, createSchema: ProjectCreateSchema, updateSchema: ProjectUpdateSchema, profileField: "profileId" },
    { name: "skills", repo: repos.skills, createSchema: SkillCreateSchema, updateSchema: SkillUpdateSchema, profileField: "profileId" },
    { name: "publications", repo: repos.publications, createSchema: PublicationCreateSchema, updateSchema: PublicationUpdateSchema, profileField: "profileId" },
    { name: "awards", repo: repos.awards, createSchema: AwardCreateSchema, updateSchema: AwardUpdateSchema, profileField: "profileId" },
    { name: "certifications", repo: repos.certifications, createSchema: CertificationCreateSchema, updateSchema: CertificationUpdateSchema, profileField: "profileId" },
    { name: "custom-sections", repo: repos.customSections, createSchema: CustomSectionCreateSchema, updateSchema: CustomSectionUpdateSchema, profileField: "profileId" },
    { name: "social-links", repo: repos.socialLinks, createSchema: SocialLinkCreateSchema, updateSchema: SocialLinkUpdateSchema, profileField: "profileId" },
    { name: "timeline-events", repo: repos.timelineEvents, createSchema: TimelineEventCreateSchema, updateSchema: TimelineEventUpdateSchema, profileField: "profileId" },
    { name: "verification-logs", repo: repos.verificationLogs, createSchema: VerificationLogCreateSchema, updateSchema: VerificationLogUpdateSchema, profileField: "profileId" }
  ];

  entityConfigs.forEach((config) => {
    const collectionPath = `/:profileId/${config.name}`;
    const itemPath = `/:profileId/${config.name}/:id`;

    fastify.get(collectionPath, async (request, reply) => {
      const profileId = (request.params as { profileId: string }).profileId;
      const parsed = PaginationSchema.safeParse(request.query ?? {});
      if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
      const result = await config.repo.list(profileId, parsed.data.offset, parsed.data.limit);
      return { ok: true, offset: parsed.data.offset, limit: parsed.data.limit, ...result };
    });

    fastify.post(collectionPath, async (request, reply) => {
      const profileId = (request.params as { profileId: string }).profileId;
      const body = (request.body as Record<string, unknown>) ?? {};
      if (body[config.profileField] && body[config.profileField] !== profileId) {
        return reply.code(400).send({ ok: false, error: "profile_mismatch" });
      }
      const parsed = config.createSchema.safeParse({ ...body, [config.profileField]: profileId });
      if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
      const payload = INTEGRITY_COLLECTIONS.has(config.name)
        ? await attachIntegrity(profileId, parsed.data)
        : parsed.data;
      const created = await config.repo.create(payload);
      return { ok: true, data: created };
    });

    fastify.get(itemPath, async (request, reply) => {
      const { profileId, id } = request.params as { profileId: string; id: string };
      const entity = await config.repo.get(id);
      if (!entity || entity[config.profileField] !== profileId) {
        return reply.code(404).send({ ok: false, error: "not_found" });
      }
      return { ok: true, data: entity };
    });

    fastify.patch(itemPath, async (request, reply) => {
      const { profileId, id } = request.params as { profileId: string; id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (body[config.profileField] && body[config.profileField] !== profileId) {
        return reply.code(400).send({ ok: false, error: "profile_mismatch" });
      }
      const parsed = config.updateSchema.safeParse(body);
      if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
      const updated = await config.repo.update(id, parsed.data);
      if (!updated || updated[config.profileField] !== profileId) {
        return reply.code(404).send({ ok: false, error: "not_found" });
      }
      const signed = INTEGRITY_COLLECTIONS.has(config.name)
        ? await attachIntegrity(profileId, updated as Record<string, unknown>)
        : updated;
      const final = INTEGRITY_COLLECTIONS.has(config.name)
        ? await config.repo.update(id, signed as any)
        : updated;
      return { ok: true, data: final ?? signed };
    });

    fastify.delete(itemPath, async (request, reply) => {
      const { profileId, id } = request.params as { profileId: string; id: string };
      const entity = await config.repo.get(id);
      if (!entity || entity[config.profileField] !== profileId) {
        return reply.code(404).send({ ok: false, error: "not_found" });
      }
      await config.repo.delete(id);
      return { ok: true };
    });
  });

  // Specialized route for project upsert
  fastify.post("/:profileId/projects/upsert", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const body = (request.body as Record<string, unknown>) ?? {};
    const externalId = request.query && (request.query as any).externalId;

    if (!externalId) {
      return reply.code(400).send({ ok: false, error: "missing_external_id" });
    }

    if (body["profileId"] && body["profileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }

    const parsed = ProjectCreateSchema.safeParse({ ...body, profileId });
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });

    if (!repos.projects.createOrUpdateByExternalId) {
       // Fallback to create if repo doesn't support upsert
       const created = await repos.projects.create(parsed.data);
       return { ok: true, data: created };
    }

    const upserted = await repos.projects.createOrUpdateByExternalId(parsed.data, externalId);
    return { ok: true, data: upserted };
  });

  registerCredentialRoutes(fastify, repos.credentials);
  registerAttestationRoutes(fastify, repos.attestations);
  registerEdgeRoutes(fastify, repos.edges);
  registerRevisionRoutes(fastify, repos.revisions);
}

function registerCredentialRoutes(fastify: FastifyInstance, repo: JsonbEntityRepo<any>) {
  fastify.get("/:profileId/credentials", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const parsed = PaginationSchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const result = await repo.list(profileId, parsed.data.offset, parsed.data.limit);
    return { ok: true, offset: parsed.data.offset, limit: parsed.data.limit, ...result };
  });

  fastify.post("/:profileId/credentials", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["subjectProfileId"] && body["subjectProfileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = VerifiableCredentialCreateSchema.safeParse({ ...body, subjectProfileId: profileId });
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const created = await repo.create(parsed.data);
    return { ok: true, data: created };
  });

  fastify.get("/:profileId/credentials/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const credential = await repo.get(id);
    if (!credential || credential.subjectProfileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: credential };
  });

  fastify.patch("/:profileId/credentials/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["subjectProfileId"] && body["subjectProfileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = VerifiableCredentialUpdateSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const updated = await repo.update(id, parsed.data);
    if (!updated || updated.subjectProfileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: updated };
  });

  fastify.delete("/:profileId/credentials/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const credential = await repo.get(id);
    if (!credential || credential.subjectProfileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    await repo.delete(id);
    return { ok: true };
  });
}

function registerAttestationRoutes(fastify: FastifyInstance, repo: AttestationRepo) {
  fastify.get("/:profileId/attestations", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const parsed = PaginationSchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const result = await repo.list(profileId, parsed.data.offset, parsed.data.limit);
    return { ok: true, offset: parsed.data.offset, limit: parsed.data.limit, ...result };
  });

  fastify.post("/:profileId/attestations", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["profileId"] && body["profileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = AttestationLinkCreateSchema.safeParse({ ...body, profileId, visibility: body["visibility"] ?? "public" });
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const created = await repo.create(profileId, parsed.data);
    return { ok: true, data: created };
  });

  fastify.get("/:profileId/attestations/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const attestation = await repo.get(id);
    if (!attestation || attestation.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: attestation };
  });

  fastify.patch("/:profileId/attestations/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["profileId"] && body["profileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = AttestationLinkUpdateSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const updated = await repo.update(id, profileId, parsed.data);
    if (!updated || updated.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: updated };
  });

  fastify.delete("/:profileId/attestations/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const attestation = await repo.get(id);
    if (!attestation || attestation.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    await repo.delete(id);
    return { ok: true };
  });
}

function registerEdgeRoutes(fastify: FastifyInstance, repo: ContentEdgeRepo) {
  fastify.get("/:profileId/graph/edges", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const parsed = PaginationSchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const result = await repo.list(profileId, parsed.data.offset, parsed.data.limit);
    return { ok: true, offset: parsed.data.offset, limit: parsed.data.limit, ...result };
  });

  fastify.post("/:profileId/graph/edges", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["profileId"] && body["profileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = ContentEdgeCreateSchema.safeParse({ ...body, profileId });
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const created = await repo.create(parsed.data);
    return { ok: true, data: created };
  });

  fastify.get("/:profileId/graph/edges/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const edge = await repo.get(id);
    if (!edge || edge.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: edge };
  });

  fastify.patch("/:profileId/graph/edges/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["profileId"] && body["profileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = ContentEdgeUpdateSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const updated = await repo.update(id, parsed.data);
    if (!updated || updated.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: updated };
  });

  fastify.delete("/:profileId/graph/edges/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const edge = await repo.get(id);
    if (!edge || edge.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    await repo.delete(id);
    return { ok: true };
  });
}

function registerRevisionRoutes(fastify: FastifyInstance, repo: ContentRevisionRepo) {
  fastify.get("/:profileId/revisions", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const parsed = RevisionQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const result = await repo.list(profileId, parsed.data.entityType, parsed.data.entityId, parsed.data.offset, parsed.data.limit);
    return { ok: true, offset: parsed.data.offset, limit: parsed.data.limit, ...result };
  });

  fastify.post("/:profileId/revisions", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const body = (request.body as Record<string, unknown>) ?? {};
    if (body["profileId"] && body["profileId"] !== profileId) {
      return reply.code(400).send({ ok: false, error: "profile_mismatch" });
    }
    const parsed = ContentRevisionCreateSchema.safeParse({ ...body, profileId });
    if (!parsed.success) return reply.code(400).send({ ok: false, errors: parsed.error.flatten() });
    const created = await repo.create(parsed.data);
    return { ok: true, data: created };
  });

  fastify.get("/:profileId/revisions/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const revision = await repo.get(id);
    if (!revision || revision.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: revision };
  });
}
