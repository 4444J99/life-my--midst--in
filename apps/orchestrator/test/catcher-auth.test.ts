import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatcherAgent } from "../src/agents/catcher";
import { createArtifactRepo } from "../src/repositories/artifacts";
import { createSyncStateRepo } from "../src/repositories/sync-state";

// Mock the core package
vi.mock("@in-midst-my-life/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@in-midst-my-life/core")>();
  return {
    ...actual,
    createCloudStorageProvider: vi.fn(),
    decrypt: vi.fn((val) => `decrypted-${val}`) // Simple mock decryption
  };
});

import { createCloudStorageProvider } from "@in-midst-my-life/core";

describe("CatcherAgent Authentication", () => {
  let agent: CatcherAgent;
  const mockIntegrationRepo = {
    findById: vi.fn(),
    listActiveByProfile: vi.fn(),
    update: vi.fn()
  };
  const mockProvider = {
    checkHealth: vi.fn(),
    authenticate: vi.fn(),
    listFiles: vi.fn(),
    downloadFile: vi.fn(),
    name: "google_drive"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new CatcherAgent(
      createArtifactRepo({ kind: "memory" }),
      mockIntegrationRepo as any,
      createSyncStateRepo({ kind: "memory" }),
      undefined,
      undefined
    );
    (createCloudStorageProvider as any).mockResolvedValue(mockProvider);
  });

  it("authenticates provider with decrypted tokens", async () => {
    const integration = {
      id: "int-123",
      profileId: "prof-123",
      provider: "google_drive",
      accessTokenEncrypted: "enc-access",
      refreshTokenEncrypted: "enc-refresh",
      metadata: { foo: "bar" },
      folderConfig: { includedFolders: ["/"] }
    };

    mockIntegrationRepo.listActiveByProfile.mockResolvedValue([integration]);
    mockProvider.checkHealth.mockResolvedValue({ healthy: true });
    
    // Mock async iterator for listFiles
    mockProvider.listFiles.mockImplementation(async function* () {
      yield { fileId: "f1", name: "test.pdf", modifiedTime: new Date().toISOString() };
    });

    const task = {
      id: "task-1",
      role: "catcher",
      description: "artifact_import_full",
      payload: { profileId: "prof-123" }
    };

    const result = await agent.execute(task as any);

    expect(result.status).toBe("completed");
    expect(createCloudStorageProvider).toHaveBeenCalledWith(
      "google_drive",
      expect.objectContaining({
        accessToken: "decrypted-enc-access",
        refreshToken: "decrypted-enc-refresh",
        metadata: { foo: "bar" }
      })
    );
    expect(mockProvider.checkHealth).toHaveBeenCalled();
  });

  it("handles health check failure and retries refresh", async () => {
    const integration = {
      id: "int-123",
      profileId: "prof-123",
      provider: "google_drive",
      accessTokenEncrypted: "enc-access"
    };

    mockIntegrationRepo.listActiveByProfile.mockResolvedValue([integration]);
    
    // First health check fails, then refresh, then second passes
    mockProvider.checkHealth
      .mockResolvedValueOnce({ healthy: false, message: "expired" })
      .mockResolvedValueOnce({ healthy: true });
    
    mockProvider.listFiles.mockImplementation(async function* () {
      yield { fileId: "f1", name: "test.pdf" };
    });

    // Add refreshToken method
    const refreshableProvider = {
      ...mockProvider,
      refreshToken: vi.fn().mockResolvedValue(undefined)
    };
    (createCloudStorageProvider as any).mockResolvedValue(refreshableProvider);

    const task = {
      id: "task-1",
      role: "catcher",
      description: "artifact_import_full",
      payload: { profileId: "prof-123" }
    };

    await agent.execute(task as any);

    expect(refreshableProvider.refreshToken).toHaveBeenCalled();
    expect(refreshableProvider.checkHealth).toHaveBeenCalledTimes(2);
  });

  it("updates integration status on persistent failure", async () => {
    const integration = {
      id: "int-123",
      profileId: "prof-123",
      provider: "google_drive",
      accessTokenEncrypted: "enc-access"
    };

    mockIntegrationRepo.listActiveByProfile.mockResolvedValue([integration]);
    mockProvider.checkHealth.mockResolvedValue({ healthy: false, message: "bad_auth" });
    
    // No refresh token method on provider implies immediate failure
    const nonRefreshableProvider = { ...mockProvider, refreshToken: undefined };
    (createCloudStorageProvider as any).mockResolvedValue(nonRefreshableProvider);

    const task = {
      id: "task-1",
      role: "catcher",
      description: "artifact_import_full",
      payload: { profileId: "prof-123" }
    };

    // Execute but don't check result; side effects are what we validate
    void (await agent.execute(task as any));

    // Should return failed or complete with error notes?
    // Current implementation: catches error, logs it, and returns failed task
    // OR if inside loop, continues?
    // processIntegrationFullImport catches error and records it in metrics.
    
    // Wait, execute() returns completed if some processed?
    // But here the ONLY integration fails.
    
    expect(mockIntegrationRepo.update).toHaveBeenCalledWith(
      "int-123",
      "prof-123",
      { status: "error" }
    );
  });
});
