import type { FastifyInstance } from "fastify";
import type { AttestationBlock } from "@in-midst-my-life/schema";
import { AttestationBlockSchema } from "@in-midst-my-life/schema";
import { attestationBlockRepo } from "../repositories/attestation-blocks";
import { profileRepo } from "../repositories/profiles";

export async function registerAttestationBlockRoutes(fastify: FastifyInstance) {
  fastify.get("/profiles/:profileId/attestation-blocks", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "not_found" });
    const data = await attestationBlockRepo.list(profileId);
    return { ok: true, data };
  });

  fastify.get("/profiles/:profileId/attestation-blocks/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "not_found" });
    const block = await attestationBlockRepo.get(id);
    if (!block || block.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: block };
  });

  fastify.get("/profiles/:profileId/attestation-blocks/entity/:entityType/:entityId", async (request, reply) => {
    const { profileId, entityType, entityId } = request.params as {
      profileId: string;
      entityType: string;
      entityId: string;
    };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "not_found" });
    const data = await attestationBlockRepo.listByEntity(profileId, entityType, entityId);
    return { ok: true, data };
  });

  fastify.post("/profiles/:profileId/attestation-blocks", async (request, reply) => {
    const profileId = (request.params as { profileId: string }).profileId;
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "not_found" });
    const parsed = AttestationBlockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
    }
    const input = parsed.data;
    const status =
      input.signerDid && profile.did && input.signerDid !== profile.did ? "verified" : input.status;
    const created = await attestationBlockRepo.create({
      ...input,
      profileId,
      status
    });
    return { ok: true, data: created };
  });

  fastify.patch("/profiles/:profileId/attestation-blocks/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "not_found" });
    const patch = request.body as Partial<AttestationBlock>;
    const updated = await attestationBlockRepo.update(id, patch);
    if (!updated || updated.profileId !== profileId) {
      return reply.code(404).send({ ok: false, error: "not_found" });
    }
    return { ok: true, data: updated };
  });

  fastify.delete("/profiles/:profileId/attestation-blocks/:id", async (request, reply) => {
    const { profileId, id } = request.params as { profileId: string; id: string };
    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "not_found" });
    const removed = await attestationBlockRepo.delete(id);
    if (!removed) return reply.code(404).send({ ok: false, error: "not_found" });
    return { ok: true };
  });
}
