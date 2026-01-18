import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { BackupRepo } from "../repositories/backups";
import type { ProfileRepo } from "../repositories/profiles";
import type { CvRepos } from "../repositories/cv";
import { profileRepo as defaultProfileRepo } from "../repositories/profiles";
import { cvRepos as defaultCvRepos } from "../repositories/cv";
import { createBackupRepo } from "../repositories/backups";
import { loadProfileBundle } from "../bundles";

interface BackupRouteDeps {
  profileRepo?: ProfileRepo;
  cvRepos?: CvRepos;
  backupRepo?: BackupRepo;
}

export async function registerBackupRoutes(
  fastify: FastifyInstance,
  deps?: BackupRouteDeps
) {
  const profileRepo = deps?.profileRepo ?? defaultProfileRepo;
  const cvRepos = deps?.cvRepos ?? defaultCvRepos;
  const backupRepo = deps?.backupRepo ?? createBackupRepo({ kind: "memory" });

  /**
   * POST /profiles/:id/import/jsonld
   * Import a profile from JSON-LD bundle
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/import/jsonld",
    async (request, reply) => {
      const { id } = request.params;

      const schema = z.object({
        mode: z.enum(["merge", "replace"]).optional().default("merge"),
        dryRun: z.boolean().optional().default(false),
        bundle: z.object({
          profile: z.record(z.unknown()),
          cv: z.object({
            experiences: z.array(z.record(z.unknown())).optional().default([]),
            educations: z.array(z.record(z.unknown())).optional().default([]),
            skills: z.array(z.record(z.unknown())).optional().default([]),
          }).optional(),
        }),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          details: parsed.error.flatten(),
        });
      }

      const { mode, dryRun, bundle } = parsed.data;

      try {
        try {
          // Import profile
          const importedProfile = bundle.profile as any;
          await profileRepo.add(importedProfile);

          // Import CV data
          const cv = bundle.cv ?? {};
          const importedExperiences = (cv.experiences ?? []) as any[];

          for (const exp of importedExperiences) {
            await cvRepos.experiences.create(exp);
          }

          // Return summary
          return reply.code(200).send({
            ok: true,
            data: {
              profileId: importedProfile.id,
              summary: {
                experiences: importedExperiences.length,
                educations: (cv.educations ?? []).length,
                skills: (cv.skills ?? []).length,
              },
              mode,
              dryRun,
            },
          });
        } catch (innerError) {
          fastify.log.error(innerError);
          throw innerError;
        }
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "import_failed",
          message: error instanceof Error ? error.message : "Import failed",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/backup
   * Create a backup snapshot of a profile
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/backup",
    async (request, reply) => {
      const { id } = request.params;

      try {
        // Load complete ProfileBundle using helper
        const bundle = await loadProfileBundle(id, profileRepo, cvRepos);
        if (!bundle) {
          return reply.code(404).send({
            ok: false,
            error: "profile_not_found",
            message: `Profile ${id} not found`,
          });
        }

        // Create backup snapshot with ProfileBackup shape
        const snapshotId = `snapshot_${Date.now()}`;
        const backup = {
          id: snapshotId,
          profileId: id,
          bundle,
          createdAt: new Date().toISOString(),
        };

        // Store backup
        await backupRepo.create(backup);

        return reply.code(200).send({
          ok: true,
          data: {
            id: snapshotId,
            profileId: id,
            createdAt: backup.createdAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "backup_failed",
          message: error instanceof Error ? error.message : "Backup failed",
        });
      }
    }
  );

  /**
   * GET /profiles/:id/backup/:snapshotId
   * Retrieve a backup snapshot
   */
  fastify.get<{ Params: { id: string; snapshotId: string } }>(
    "/:id/backup/:snapshotId",
    async (request, reply) => {
      const { id, snapshotId } = request.params;

      try {
        // Get backup using snapshotId
        const snapshot = await backupRepo.get(snapshotId);
        if (!snapshot) {
          return reply.code(404).send({
            ok: false,
            error: "snapshot_not_found",
            message: `Snapshot ${snapshotId} not found`,
          });
        }

        // Verify snapshot belongs to this profile
        if (snapshot.profileId !== id) {
          return reply.code(404).send({
            ok: false,
            error: "snapshot_not_found",
            message: `Snapshot ${snapshotId} not found`,
          });
        }

        return reply.code(200).send({
          ok: true,
          data: snapshot,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "restore_failed",
          message: error instanceof Error ? error.message : "Restore failed",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/restore
   * Restore a profile from a backup snapshot
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/restore",
    async (request, reply) => {
      const { id } = request.params;

      const schema = z.object({
        snapshotId: z.string(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          details: parsed.error.flatten(),
        });
      }

      const { snapshotId } = parsed.data;

      try {
        // Get snapshot
        const snapshot = await backupRepo.get(snapshotId);
        if (!snapshot) {
          return reply.code(404).send({
            ok: false,
            error: "snapshot_not_found",
            message: `Snapshot ${snapshotId} not found`,
          });
        }

        // Verify snapshot belongs to this profile
        if (snapshot.profileId !== id) {
          return reply.code(404).send({
            ok: false,
            error: "snapshot_not_found",
            message: `Snapshot ${snapshotId} not found`,
          });
        }

        // Restore profile and CV data
        const bundle = snapshot.bundle;
        fastify.log.info({
          snapshotId,
          bundleStructure: {
            hasProfile: !!bundle.profile,
            hasCv: !!bundle.cv,
            experienceCount: bundle.cv?.experiences?.length ?? 0,
          }
        }, "Restoring from snapshot");

        // Update profile
        await profileRepo.add(bundle.profile as any);

        // Restore experiences (delete old, add new)
        const existingExperiences = await cvRepos.experiences.list(id, 0, 1000);
        for (const exp of existingExperiences.data) {
          await cvRepos.experiences.delete(exp.id);
        }

        const experiencesToRestore = bundle.cv?.experiences ?? [];
        fastify.log.info({ experienceCount: experiencesToRestore.length }, "Restoring experiences");
        for (const exp of experiencesToRestore) {
          // Ensure profileId is set correctly
          const toCreate = { ...exp, profileId: id } as any;
          await cvRepos.experiences.create(toCreate);
        }

        // Restore educations
        const existingEducations = await cvRepos.educations.list(id, 0, 1000);
        for (const edu of existingEducations.data) {
          await cvRepos.educations.delete(edu.id);
        }
        for (const edu of (bundle.cv?.educations ?? [])) {
          const toCreate = { ...edu, profileId: id } as any;
          await cvRepos.educations.create(toCreate);
        }

        // Restore skills
        const existingSkills = await cvRepos.skills.list(id, 0, 1000);
        for (const skill of existingSkills.data) {
          await cvRepos.skills.delete(skill.id);
        }
        for (const skill of (bundle.cv?.skills ?? [])) {
          const toCreate = { ...skill, profileId: id } as any;
          await cvRepos.skills.create(toCreate);
        }

        return reply.code(200).send({
          ok: true,
          data: {
            id,
            restoredFrom: snapshotId,
            restoredAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "restore_failed",
          message: error instanceof Error ? error.message : "Restore failed",
        });
      }
    }
  );
}
