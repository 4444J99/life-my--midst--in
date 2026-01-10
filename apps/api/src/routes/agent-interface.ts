import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { profileRepo } from "../repositories/profiles";
import { cvRepos } from "../repositories/cv";
import { agentTokenRepo } from "../repositories/agent-tokens";
import { createMaskRepo } from "../repositories/masks";
import { applyMaskRedaction } from "@in-midst-my-life/core";

const AgentQuerySchema = z.object({
  profileId: z.string().uuid(),
  query: z.string().min(1),
  maskId: z.string().optional()
});

const REQUIRED_SCOPE = "agent:query";
const rateLimitWindowMs = Number(process.env["AGENT_RATE_LIMIT_WINDOW_MS"] ?? 60_000);
const rateLimitMax = Number(process.env["AGENT_RATE_LIMIT_MAX"] ?? 30);
const rateLimitHistory = new Map<string, number[]>();

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const history = rateLimitHistory.get(key) ?? [];
  const fresh = history.filter((ts) => now - ts < rateLimitWindowMs);
  if (fresh.length >= rateLimitMax) {
    return { allowed: false, resetAt: (fresh[0] ?? now) + rateLimitWindowMs };
  }
  fresh.push(now);
  rateLimitHistory.set(key, fresh);
  return { allowed: true, resetAt: (fresh[0] ?? now) + rateLimitWindowMs };
};

const extractToken = (authHeader?: string) => {
  if (!authHeader) return undefined;
  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer") return undefined;
  return token;
};

const hasScope = (scopes: string[], required: string) =>
  scopes.includes(required) || scopes.includes("*") || scopes.includes("agent:*");

export async function registerAgentRoutes(fastify: FastifyInstance) {
  fastify.get("/v1/query", async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = extractToken(authHeader); // allow-secret
    if (!token) return reply.code(401).send({ ok: false, error: "missing_token" });

    const tokenRecord = await agentTokenRepo.findByToken(token);
    if (!tokenRecord) return reply.code(401).send({ ok: false, error: "invalid_token" });
    if (!hasScope(tokenRecord.scopes, REQUIRED_SCOPE)) {
      return reply.code(403).send({ ok: false, error: "insufficient_scope" });
    }

    const parsed = AgentQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
    }

    const { profileId, query, maskId } = parsed.data;
    if (tokenRecord.profileId !== profileId) {
      return reply.code(403).send({ ok: false, error: "token_profile_mismatch" });
    }

    const rateKey = `agent:${tokenRecord.id}`;
    const rateResult = checkRateLimit(rateKey);
    if (!rateResult.allowed) {
      fastify.log.info({ rateKey, profileId }, "agent_rate_limited");
      const retryAfter = Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000));
      reply.header("Retry-After", retryAfter);
      return reply.code(429).send({ ok: false, error: "rate_limited", retryAfter });
    }

    const profile = await profileRepo.find(profileId);
    if (!profile) return reply.code(404).send({ ok: false, error: "profile_not_found" });
    if (!profile.settings?.agentAccess?.enabled) {
      return reply.code(403).send({ ok: false, error: "agent_access_disabled" });
    }

    const taxonomy = createMaskRepo();
    const mask = maskId ? await taxonomy.masks.get(maskId) : undefined;

    const [experiences, projects, skills] = await Promise.all([
      cvRepos.experiences.list(profileId, 0, 200),
      cvRepos.projects.list(profileId, 0, 200),
      cvRepos.skills.list(profileId, 0, 200)
    ]);

    const redactedExperiences = applyMaskRedaction(experiences.data, mask, {
      dateKeys: ["startDate", "endDate"]
    });
    const redactedProjects = applyMaskRedaction(projects.data, mask, {
      dateKeys: ["startDate", "endDate"]
    });
    const redactedSkills = applyMaskRedaction(skills.data, mask);

    const normalizedQuery = query.toLowerCase();
    const skillMatches = redactedSkills.filter((skill) => normalizedQuery.includes(skill.name.toLowerCase()));
    const projectMatches = redactedProjects.filter((project) =>
      [project.name, ...(project.tags ?? [])].some((value) => normalizedQuery.includes(value.toLowerCase()))
    );
    const experienceMatches = redactedExperiences.filter((exp) =>
      [exp.roleTitle, exp.organization, ...(exp.tags ?? [])].some((value) =>
        normalizedQuery.includes(value.toLowerCase())
      )
    );

    const hasMatch = skillMatches.length + projectMatches.length + experienceMatches.length > 0;
    const answer = hasMatch
      ? `Yes. Found ${skillMatches.length} skill matches, ${projectMatches.length} project matches, and ${experienceMatches.length} experience matches.`
      : `No explicit matches found for "${query}".`;

    await agentTokenRepo.markUsed(tokenRecord.id);
    fastify.log.info(
      { profileId, tokenId: tokenRecord.id, maskId, query },
      "agent_query"
    );

    return {
      ok: true,
      agent: "midst-agent-v1",
      timestamp: new Date().toISOString(),
      context: {
        profile: { name: profile.displayName, headline: profile.headline },
        mask: mask ? { id: mask.id, name: mask.name } : undefined,
        stats: {
          experienceCount: redactedExperiences.length,
          projectCount: redactedProjects.length,
          skillCount: redactedSkills.length
        }
      },
      answer,
      matches: {
        skills: skillMatches.map((skill) => ({ id: skill.id, name: skill.name })),
        projects: projectMatches.map((project) => ({ id: project.id, name: project.name })),
        experiences: experienceMatches.map((exp) => ({ id: exp.id, title: exp.roleTitle }))
      }
    };
  });
}
