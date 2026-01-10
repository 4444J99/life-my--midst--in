import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/index";
import { createProfileRepo, type ProfileRepo } from "../src/repositories/profiles";
import { createCvRepos, type CvRepos } from "../src/repositories/cv";
import { createBackupRepo, type BackupRepo } from "../src/repositories/backups";

let server: ReturnType<typeof buildServer>;
let profileRepo: ProfileRepo;
let cvRepos: CvRepos;
let backupRepo: BackupRepo;

beforeAll(async () => {
  profileRepo = createProfileRepo({ kind: "memory" });
  cvRepos = createCvRepos({ kind: "memory" });
  backupRepo = createBackupRepo({ kind: "memory" });
  await profileRepo.reset();
  await cvRepos.experiences.reset();
  await backupRepo.reset();
  server = buildServer({ profileRepo, cvRepos, backupRepo });
});

describe("profile backups and import", () => {
  it("imports a bundle and creates profile data", async () => {
    const profileId = "11111111-1111-1111-1111-111111111111";
    const now = new Date().toISOString();
    const profile = {
      id: profileId,
      identityId: "22222222-2222-2222-2222-222222222222",
      slug: "import-demo",
      displayName: "Import Demo",
      title: "Builder",
      headline: "Ship fast",
      createdAt: now,
      updatedAt: now
    };
    const experienceId = "33333333-3333-3333-3333-333333333333";
    const bundle = {
      "@context": { "@vocab": "https://schema.org/" },
      bundleVersion: "2025-12-29",
      exportedAt: now,
      profile,
      cv: {
        experiences: [
          {
            id: experienceId,
            profileId,
            roleTitle: "Engineer",
            organization: "Acme",
            startDate: "2024-01-01",
            isCurrent: true,
            createdAt: now,
            updatedAt: now
          }
        ],
        educations: [],
        projects: [],
        skills: [],
        publications: [],
        awards: [],
        certifications: [],
        customSections: [],
        socialLinks: [],
        timelineEvents: [],
        verificationLogs: [],
        credentials: [],
        attestations: [],
        edges: [],
        revisions: []
      }
    };

    const res = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/import/jsonld`,
      payload: { mode: "merge", dryRun: false, bundle }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.summary.experiences).toBe(1);

    const profileRes = await server.inject({ method: "GET", url: `/profiles/${profileId}` });
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.json().data.displayName).toBe("Import Demo");

    const expRes = await server.inject({ method: "GET", url: `/profiles/${profileId}/experiences` });
    expect(expRes.statusCode).toBe(200);
    expect(expRes.json().data).toHaveLength(1);
  });

  it("backs up and restores a profile", async () => {
    const profileId = "44444444-4444-4444-4444-444444444444";
    const now = new Date().toISOString();
    const profile = {
      id: profileId,
      identityId: "55555555-5555-5555-5555-555555555555",
      slug: "backup-demo",
      displayName: "Backup Demo",
      title: "Engineer",
      headline: "Builds systems",
      createdAt: now,
      updatedAt: now
    };
    await server.inject({ method: "POST", url: "/profiles", payload: profile });

    const experienceId = "66666666-6666-6666-6666-666666666666";
    await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/experiences`,
      payload: {
        id: experienceId,
        profileId,
        roleTitle: "Engineer",
        organization: "Acme",
        startDate: "2024-01-01",
        isCurrent: true,
        createdAt: now,
        updatedAt: now
      }
    });

    const backup = await server.inject({ method: "POST", url: `/profiles/${profileId}/backup` });
    expect(backup.statusCode).toBe(200);
    const snapshotId = backup.json().data.id as string;

    await server.inject({ method: "DELETE", url: `/profiles/${profileId}/experiences/${experienceId}` });
    const afterDelete = await server.inject({ method: "GET", url: `/profiles/${profileId}/experiences` });
    expect(afterDelete.json().data).toHaveLength(0);

    const restore = await server.inject({
      method: "POST",
      url: `/profiles/${profileId}/restore`,
      payload: { snapshotId }
    });
    expect(restore.statusCode).toBe(200);

    const afterRestore = await server.inject({ method: "GET", url: `/profiles/${profileId}/experiences` });
    expect(afterRestore.json().data).toHaveLength(1);
  });
});
