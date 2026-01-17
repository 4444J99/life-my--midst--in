import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Profile, Mask, Experience, Education, Skill } from "@in-midst-my-life/schema";
import {
  generateProfileJsonLd,
  generateMaskedJsonLd,
  generateMinimalJsonLd,
  jsonLdToScriptTag,
  addBreadcrumbContext
} from "../services/jsonld-export";
import { generatePdfResume, generateMinimalPdfResume } from "../services/pdf-export";

interface ExportRouteDeps {
  // Service dependencies (optional - for future DB integration)
  profiles?: any;
  masks?: any;
}

/**
 * Request schema for JSON-LD export.
 * Accepts profile data and optional mask/context for filtering.
 */
const JsonLdExportRequestSchema = z.object({
  profile: z.record(z.unknown()).describe("Profile object to export"),
  mask: z.record(z.unknown()).optional().describe("Optional mask for filtering"),
  experiences: z.array(z.record(z.unknown())).default([]),
  educations: z.array(z.record(z.unknown())).default([]),
  skills: z.array(z.record(z.unknown())).default([]),
  minimal: z.boolean().default(false).describe("Generate minimal export for web sharing"),
  includeScript: z.boolean().default(false).describe("Wrap output in script tag for HTML embedding"),
  breadcrumbs: z
    .array(
      z.object({
        name: z.string(),
        url: z.string()
      })
    )
    .optional()
    .describe("Optional breadcrumb navigation for SEO context")
});

export async function registerExportRoutes(fastify: FastifyInstance, _deps?: ExportRouteDeps) {
  /**
   * POST /export/json-ld
   *
   * Generates a JSON-LD export of a profile in schema.org format.
   *
   * Features:
   * - Full semantic structure compatible with Google, LinkedIn, etc.
   * - Optional mask-based filtering for context-specific exports
   * - Minimal mode for web sharing
   * - HTML script tag embedding for SEO
   * - Breadcrumb navigation context
   *
   * Example request:
   * ```json
   * {
   *   "profile": { "displayName": "Jane Doe", ... },
   *   "mask": { "id": "analyst", "name": "Analyst", ... },
   *   "experiences": [ ... ],
   *   "includeScript": true
   * }
   * ```
   *
   * Returns:
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "@context": "https://schema.org",
   *     "@type": "Person",
   *     "name": "Jane Doe",
   *     ...
   *   },
   *   "scriptTag": "<script type=\"application/ld+json\">...</script>"
   * }
   * ```
   */
  fastify.post("/json-ld", async (request, reply) => {
    const parsed = JsonLdExportRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: "invalid_request",
        details: parsed.error.flatten()
      });
    }

    const { profile, mask, experiences, educations, skills, minimal, includeScript, breadcrumbs } = parsed.data;

    let jsonLd: Record<string, unknown>;

    if (minimal) {
      // Minimal export for web sharing
      jsonLd = generateMinimalJsonLd(profile as Profile) as any;
    } else if (mask) {
      // Mask-filtered export
      jsonLd = generateMaskedJsonLd(
        profile as Profile,
        mask as Mask,
        experiences as Experience[],
        educations as Education[],
        skills as Skill[]
      ) as any;
    } else {
      // Full export
      jsonLd = generateProfileJsonLd({
        profile: profile as Profile,
        experiences: experiences as Experience[],
        educations: educations as Education[],
        skills: skills as Skill[]
      }) as any;
    }

    // Add breadcrumb context if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      jsonLd = addBreadcrumbContext(
        jsonLd as any,
        breadcrumbs as Array<{ name: string; url: string }>
      ) as any;
    }

    const response: Record<string, unknown> = {
      ok: true,
      data: jsonLd,
      format: "application/ld+json",
      context: mask ? "masked" : minimal ? "minimal" : "full"
    };

    if (includeScript) {
      response['scriptTag'] = jsonLdToScriptTag(jsonLd);
    }

    return response;
  });

  /**
   * GET /export/json-ld/:profileId
   *
   * Retrieves a JSON-LD export of an existing profile by ID.
   * Integrates with PostgreSQL and Redis caching.
   */
  fastify.get("/json-ld/:profileId", async (request, reply) => {
    const { profileId } = request.params as { profileId: string };

    try {
      // Check cache first
      const cacheKey = `export:jsonld:${profileId}`;
      const { getCache } = await import('../services/cache');
      const cache = getCache();
      const cached = cache?.get<string>(cacheKey);

      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.type('application/ld+json').send(cached);
      }

      // Fetch profile from database
      const { getPool } = await import('../db');
      const pool = getPool();
      const profileResult = await pool.query(
        'SELECT * FROM profiles WHERE id = $1 AND is_active = true',
        [profileId]
      );

      if (profileResult.rows.length === 0) {
        return reply.code(404).send({
          ok: false,
          error: "profile_not_found",
          message: `Profile ${profileId} not found or inactive`
        });
      }

      const profile = profileResult.rows[0];

      // Fetch related data
      const [experiencesResult, educationsResult, skillsResult] = await Promise.all([
        pool.query('SELECT * FROM experiences WHERE profile_id = $1 ORDER BY start_date DESC', [profileId]),
        pool.query('SELECT * FROM educations WHERE profile_id = $1 ORDER BY start_date DESC', [profileId]),
        pool.query('SELECT * FROM skills WHERE profile_id = $1', [profileId])
      ]);

      // Generate JSON-LD
      const jsonLd = generateProfileJsonLd({
        profile,
        experiences: experiencesResult.rows as any[],
        educations: educationsResult.rows as any[],
        skills: skillsResult.rows as any[]
      });

      const jsonLdString = JSON.stringify(jsonLd, null, 2);

      // Cache for 5 minutes
      if (cache) {
        cache.set(cacheKey, jsonLdString, 300);
      }

      reply.header('X-Cache', 'MISS');
      return reply.type('application/ld+json').send(jsonLdString);
    } catch (error: unknown) {
      request.log.error({ err: error }, 'JSON-LD export error:');
      return reply.code(500).send({
        ok: false,
        error: "export_failed",
        message: error instanceof Error ? error.message : "Failed to generate JSON-LD export"
      });
    }
  });

  /**
   * GET /export/json-ld/:profileId/masked/:maskId
   *
   * Retrieves a masked JSON-LD export of a profile.
   * Integrates with PostgreSQL and Redis caching.
   */
  fastify.get("/json-ld/:profileId/masked/:maskId", async (request, reply) => {
    const { profileId, maskId } = request.params as { profileId: string; maskId: string };

    try {
      // Check cache first
      const cacheKey = `export:jsonld:${profileId}:mask:${maskId}`;
      const { getCache } = await import('../services/cache');
      const cache = getCache();
      const cached = cache?.get<string>(cacheKey);

      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.type('application/ld+json').send(cached);
      }

      // Fetch profile and mask from database
      const { getPool } = await import('../db');
      const pool = getPool();
      
      const [profileResult, maskResult] = await Promise.all([
        pool.query('SELECT * FROM profiles WHERE id = $1 AND is_active = true', [profileId]),
        pool.query('SELECT * FROM masks WHERE id = $1', [maskId])
      ]);

      if (profileResult.rows.length === 0) {
        return reply.code(404).send({
          ok: false,
          error: "profile_not_found",
          message: `Profile ${profileId} not found`
        });
      }

      if (maskResult.rows.length === 0) {
        return reply.code(404).send({
          ok: false,
          error: "mask_not_found",
          message: `Mask ${maskId} not found`
        });
      }

      const profile = profileResult.rows[0];
      const mask = maskResult.rows[0];

      // Fetch related data
      const [experiencesResult, educationsResult, skillsResult] = await Promise.all([
        pool.query('SELECT * FROM experiences WHERE profile_id = $1 ORDER BY start_date DESC', [profileId]),
        pool.query('SELECT * FROM educations WHERE profile_id = $1 ORDER BY start_date DESC', [profileId]),
        pool.query('SELECT * FROM skills WHERE profile_id = $1', [profileId])
      ]);

      // Generate masked JSON-LD
      const jsonLd = generateMaskedJsonLd(
        profile,
        mask,
        experiencesResult.rows as any[],
        educationsResult.rows as any[],
        skillsResult.rows as any[]
      );

      const jsonLdString = JSON.stringify(jsonLd, null, 2);

      // Cache for 5 minutes
      if (cache) {
        cache.set(cacheKey, jsonLdString, 300);
      }

      reply.header('X-Cache', 'MISS');
      return reply.type('application/ld+json').send(jsonLdString);
    } catch (error: unknown) {
      request.log.error({ err: error }, 'Masked JSON-LD export error:');
      return reply.code(500).send({
        ok: false,
        error: "export_failed",
        message: error instanceof Error ? error.message : "Failed to generate masked JSON-LD export"
      });
    }
  });

  /**
   * POST /export/sitemap-entry
   *
   * Generates a sitemap entry for a profile in JSON format.
   * Useful for SEO and search engine indexing.
   */
  fastify.post("/sitemap-entry", async (request, reply) => {
    const schema = z.object({
      url: z.string().url(),
      lastModified: z.string().datetime().optional(),
      priority: z.number().min(0).max(1).default(0.8),
      changeFrequency: z.enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]).default("weekly")
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: "invalid_request",
        details: parsed.error.flatten()
      });
    }

    const { url, lastModified, priority, changeFrequency } = parsed.data;

    return {
      ok: true,
      data: {
        url,
        lastModified: lastModified || new Date().toISOString(),
        priority,
        changeFrequency
      },
      xmlFormat: `<url>
  <loc>${url}</loc>
  <lastmod>${lastModified || new Date().toISOString().split("T")[0]}</lastmod>
  <priority>${priority}</priority>
  <changefreq>${changeFrequency}</changefreq>
</url>`
    };
  });

  /**
   * POST /export/pdf
   * Generates a PDF résumé from profile data with multiple color schemes.
   */
  fastify.post("/pdf", async (request, reply) => {
    const PdfExportRequestSchema = z.object({
      profile: z.record(z.unknown()),
      mask: z.record(z.unknown()).optional(),
      experiences: z.array(z.record(z.unknown())).default([]),
      educations: z.array(z.record(z.unknown())).default([]),
      skills: z.array(z.record(z.unknown())).default([]),
      narrativeBlocks: z.array(z.record(z.unknown())).default([]),
      minimal: z.boolean().default(false),
      colorScheme: z.enum(["classic", "modern", "minimal"]).default("modern")
    });

    const parsed = PdfExportRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: "invalid_request",
        details: parsed.error.flatten()
      });
    }

    try {
      const { profile, minimal, ...rest } = parsed.data;

      let result;
      if (minimal) {
        result = await generateMinimalPdfResume({
          profile: profile as Profile,
          ...rest
        });
      } else {
        result = await generatePdfResume({
          profile: profile as Profile,
          ...rest
        });
      }

      const download = (request.query as { download?: string }).download === "true";

      reply
        .type(result.contentType)
        .header(
          "Content-Disposition",
          download ? `attachment; filename="${result.filename}"` : `inline; filename="${result.filename}"`
        )
        .send(result.buffer);
    } catch (error) {
      return reply.code(500).send({
        ok: false,
        error: "pdf_generation_failed",
        message: error instanceof Error ? error.message : "Failed to generate PDF"
      });
    }
  });

  /**
   * GET /export/vc/:profileId
   *
   * Exports a profile as a Verifiable Credential.
   * Integrates with PostgreSQL and Redis caching.
   */
  fastify.get("/vc/:profileId", async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    const { types, expiresIn } = request.query as { types?: string; expiresIn?: string };

    try {
      // Check cache first
      const cacheKey = `export:vc:${profileId}:${types || 'default'}`;
      const { getCache } = await import('../services/cache');
      const cache = getCache();
      const cached = cache.get<string>(cacheKey);

      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.type('application/json').send(cached);
      }

      // Fetch profile from database
      const { getPool } = await import('../db');
      const pool = getPool();
      const profileResult = await pool.query(
        'SELECT * FROM profiles WHERE id = $1 AND is_active = true',
        [profileId]
      );

      if (profileResult.rows.length === 0) {
        return reply.code(404).send({
          ok: false,
          error: "profile_not_found",
          message: `Profile ${profileId} not found`
        });
      }

      const profile = profileResult.rows[0];

      // Generate or fetch issuer key pair
      const { DIDKey, VC } = await import("@in-midst-my-life/core");
      const keyPair = await DIDKey.generate();

      // Prepare credential subject
      const credentialSubject = {
        id: `did:profile:${profileId}`,
        name: profile.display_name,
        email: profile.email,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location
      };

      // Parse credential types
      const credentialTypes = types 
        ? ['VerifiableCredential', ...types.split(',')]
        : ['VerifiableCredential', 'ProfileCredential'];

      // Calculate expiration
      const expirationDate = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString()
        : undefined;

      // Issue credential
      const credential = await VC.issue(keyPair, credentialSubject, credentialTypes, {
        expirationDate,
        credentialId: `urn:profile:vc:${profileId}`
      });

      const credentialString = JSON.stringify(credential, null, 2);

      // Cache for 10 minutes (shorter than profile data)
      cache.set(cacheKey, credentialString, 600);

      reply.header('X-Cache', 'MISS');
      return reply.type('application/json').send(credentialString);
    } catch (error: unknown) {
      request.log.error({ err: error }, 'VC export error:');
      return reply.code(500).send({
        ok: false,
        error: "vc_export_failed",
        message: error instanceof Error ? error.message : "Failed to generate Verifiable Credential"
      });
    }
  });
}
