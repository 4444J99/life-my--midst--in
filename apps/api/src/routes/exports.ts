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
   * {\n   "ok": true,\n   "data": {\n     "@context": "https://schema.org",\n     "@type": "Person",\n     "name": "Jane Doe",\n     ...\n   },\n   "scriptTag": "<script type=\"application/ld+json\">...</script>"  // if includeScript=true\n * }\n * ```\n */\n  fastify.post(\"/json-ld\", async (request, reply) => {\n    const parsed = JsonLdExportRequestSchema.safeParse(request.body);\n    if (!parsed.success) {\n      return reply.code(400).send({\n        ok: false,\n        error: \"invalid_request\",\n        details: parsed.error.flatten()\n      });\n    }\n\n    const { profile, mask, experiences, educations, skills, minimal, includeScript, breadcrumbs } = parsed.data;\n\n    let jsonLd: Record<string, unknown>;\n\n    if (minimal) {\n      // Minimal export for web sharing\n      jsonLd = generateMinimalJsonLd(profile as Profile);\n    } else if (mask) {\n      // Mask-filtered export\n      jsonLd = generateMaskedJsonLd(\n        profile as Profile,\n        mask as Mask,\n        experiences as Experience[],\n        educations as Education[],\n        skills as Skill[]\n      );\n    } else {\n      // Full export\n      jsonLd = generateProfileJsonLd({\n        profile: profile as Profile,\n        experiences: experiences as Experience[],\n        educations: educations as Education[],\n        skills: skills as Skill[]\n      });\n    }\n\n    // Add breadcrumb context if provided\n    if (breadcrumbs && breadcrumbs.length > 0) {\n      jsonLd = addBreadcrumbContext(\n        jsonLd as any,\n        breadcrumbs as Array<{ name: string; url: string }>\n      );\n    }\n\n    const response: Record<string, unknown> = {\n      ok: true,\n      data: jsonLd,\n      format: \"application/ld+json\",\n      context: mask ? \"masked\" : minimal ? \"minimal\" : \"full\"\n    };\n\n    if (includeScript) {\n      response.scriptTag = jsonLdToScriptTag(jsonLd);\n    }\n\n    return response;\n  });\n\n  /**\n   * GET /export/json-ld/:profileId\n   * \n   * Retrieves a JSON-LD export of an existing profile by ID.\n   * (Requires database integration - returns placeholder for now)\n   */\n  fastify.get(\"/json-ld/:profileId\", async (request, reply) => {\n    const { profileId } = request.params as { profileId: string };\n\n    // TODO: Fetch profile from database using profileId\n    // For now, return placeholder error\n    return reply.code(501).send({\n      ok: false,\n      error: \"not_implemented\",\n      message: \"Profile lookup requires database integration\",\n      hint: \"Use POST /export/json-ld with profile data instead\"\n    });\n  });\n\n  /**\n   * GET /export/json-ld/:profileId/masked/:maskId\n   * \n   * Retrieves a masked JSON-LD export of a profile.\n   * (Requires database integration)\n   */\n  fastify.get(\"/json-ld/:profileId/masked/:maskId\", async (request, reply) => {\n    const { profileId, maskId } = request.params as { profileId: string; maskId: string };\n\n    // TODO: Fetch profile and mask from database\n    return reply.code(501).send({\n      ok: false,\n      error: \"not_implemented\",\n      message: \"Masked profile lookup requires database integration\",\n      context: { profileId, maskId }\n    });\n  });\n\n  /**\n   * POST /export/sitemap-entry\n   * \n   * Generates a sitemap entry for a profile in JSON format.\n   * Useful for SEO and search engine indexing.\n   */\n  fastify.post(\"/sitemap-entry\", async (request, reply) => {\n    const schema = z.object({\n      url: z.string().url(),\n      lastModified: z.string().datetime().optional(),\n      priority: z.number().min(0).max(1).default(0.8),\n      changeFrequency: z.enum([\"always\", \"hourly\", \"daily\", \"weekly\", \"monthly\", \"yearly\", \"never\"]).default(\"weekly\")\n    });\n\n    const parsed = schema.safeParse(request.body);\n    if (!parsed.success) {\n      return reply.code(400).send({\n        ok: false,\n        error: \"invalid_request\",\n        details: parsed.error.flatten()\n      });\n    }\n\n    const { url, lastModified, priority, changeFrequency } = parsed.data;\n\n    return {\n      ok: true,\n      data: {\n        url,\n        lastModified: lastModified || new Date().toISOString(),\n        priority,\n        changeFrequency\n      },\n      xmlFormat: `<url>\n  <loc>${url}</loc>\n  <lastmod>${lastModified || new Date().toISOString().split(\"T\")[0]}</lastmod>\n  <priority>${priority}</priority>\n  <changefreq>${changeFrequency}</changefreq>\n</url>`\n    };\n  });\n}\n

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
