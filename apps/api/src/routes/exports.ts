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
      jsonLd = generateMinimalJsonLd(profile as Profile);
    } else if (mask) {
      // Mask-filtered export
      jsonLd = generateMaskedJsonLd(
        profile as Profile,
        mask as Mask,
        experiences as Experience[],
        educations as Education[],
        skills as Skill[]
      );
    } else {
      // Full export
      jsonLd = generateProfileJsonLd({
        profile: profile as Profile,
        experiences: experiences as Experience[],
        educations: educations as Education[],
        skills: skills as Skill[]
      });
    }

    // Add breadcrumb context if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      jsonLd = addBreadcrumbContext(
        jsonLd as any,
        breadcrumbs as Array<{ name: string; url: string }>
      );
    }

    const response: Record<string, unknown> = {
      ok: true,
      data: jsonLd,
      format: "application/ld+json",
      context: mask ? "masked" : minimal ? "minimal" : "full"
    };

    if (includeScript) {
      response.scriptTag = jsonLdToScriptTag(jsonLd);
    }

    return response;
  });

  /**
   * GET /export/json-ld/:profileId
   *
   * Retrieves a JSON-LD export of an existing profile by ID.
   * (Requires database integration - returns placeholder for now)
   */
  fastify.get("/json-ld/:profileId", async (request, reply) => {
    const { profileId } = request.params as { profileId: string };

    // TODO: Fetch profile from database using profileId
    // For now, return placeholder error
    return reply.code(501).send({
      ok: false,
      error: "not_implemented",
      message: "Profile lookup requires database integration",
      hint: "Use POST /export/json-ld with profile data instead"
    });
  });

  /**
   * GET /export/json-ld/:profileId/masked/:maskId
   *
   * Retrieves a masked JSON-LD export of a profile.
   * (Requires database integration)
   */
  fastify.get("/json-ld/:profileId/masked/:maskId", async (request, reply) => {
    const { profileId, maskId } = request.params as { profileId: string; maskId: string };

    // TODO: Fetch profile and mask from database
    return reply.code(501).send({
      ok: false,
      error: "not_implemented",
      message: "Masked profile lookup requires database integration",
      context: { profileId, maskId }
    });
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
}
