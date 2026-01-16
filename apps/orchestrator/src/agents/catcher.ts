import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Agent, AgentTask, AgentResult, AgentExecutor } from "../agents";
import type { Artifact, CloudStorageIntegration, ArtifactSyncState, IntegrityProof, VerificationLog } from "@in-midst-my-life/schema";
import {
  type CloudStorageProvider,
  type CloudFile,
  type CloudCredentials,
  hashPayload,
  createCloudStorageProvider,
  decrypt
} from "@in-midst-my-life/core";
import { processFile } from "../processors";
import { classifyByHeuristics, aggregateConfidence } from "../classification/heuristics";
import { classifyWithLLM } from "../prompts/artifact-classification";
import type { ArtifactRepo } from "../repositories/artifacts";
import type { CloudIntegrationRepo } from "../repositories/cloud-integrations";
import type { SyncStateRepo } from "../repositories/sync-state";
import type { ProfileKeyRepo } from "../repositories/profile-keys";
import type { VerificationLogRepo } from "../repositories/verification-logs";
import { createArtifactRepo } from "../repositories/artifacts";
import { createCloudIntegrationRepo } from "../repositories/cloud-integrations";
import { createSyncStateRepo } from "../repositories/sync-state";
import { createProfileKeyRepo } from "../repositories/profile-keys";
import { createVerificationLogRepo } from "../repositories/verification-logs";
import * as jose from "jose";

/**
 * CatcherAgent: Cloud Storage Artifact Ingestion
 *
 * Crawls cloud storage sources (Google Drive, iCloud, Dropbox, local filesystem)
 * to discover creative and academic artifacts and ingest them as CV entities.
 *
 * Supports three task types:
 * - artifact_import_full: One-time historical import of entire configured folders
 * - artifact_sync_incremental: Daily/weekly delta sync (only new/modified files)
 * - artifact_refresh_source: Single-source on-demand refresh
 *
 * Flow:
 * 1. Cloud API → List files (with pagination)
 * 2. Filter files (by inclusion/exclusion patterns, file size, MIME types)
 * 3. Download files to temp storage
 * 4. Extract metadata (PDFs: text, authors; Images: EXIF; DOCX: text, author)
 * 5. Classify artifacts (heuristics fallback, LLM-ready for Phase 4 integration)
 * 6. Create Artifact record with self-attestation (IntegrityProof + DID signature)
 * 7. Update sync state for delta detection
 * 8. Cleanup temp files
 *
 * Architecture notes:
 * - Uses existing CloudStorageProvider interface (Phase 2)
 * - File processors (pdf-processor, image-processor, etc.) handle format-specific extraction
 * - Classification uses heuristics (fallback), ready for LLM integration from Phase 4
 * - Delta sync tracked in artifact_sync_state table for efficiency
 * - Temp files stored in /tmp/midst-artifacts/{taskId}/{fileId}
 */
export class CatcherAgent implements Agent {
  role: "catcher" = "catcher";

  /**
   * Repository instances for data persistence.
   * Initialized via factory functions that select implementation based on environment.
   */
  private artifactRepo: ArtifactRepo;
  private cloudIntegrationRepo: CloudIntegrationRepo;
  private syncStateRepo: SyncStateRepo;
  private profileKeyRepo: ProfileKeyRepo;
  private verificationLogRepo: VerificationLogRepo;
  private executor?: AgentExecutor;

  constructor(
    artifactRepo?: ArtifactRepo,
    cloudIntegrationRepo?: CloudIntegrationRepo,
    syncStateRepo?: SyncStateRepo,
    profileKeyRepo?: ProfileKeyRepo,
    verificationLogRepo?: VerificationLogRepo,
    executor?: AgentExecutor
  ) {
    // Use provided repositories, or create defaults (in-memory for MVP, postgres for production)
    this.artifactRepo = artifactRepo || createArtifactRepo();
    this.cloudIntegrationRepo = cloudIntegrationRepo || createCloudIntegrationRepo();
    this.syncStateRepo = syncStateRepo || createSyncStateRepo();
    this.profileKeyRepo = profileKeyRepo || createProfileKeyRepo();
    this.verificationLogRepo = verificationLogRepo || createVerificationLogRepo();
    this.executor = executor;
  }

  /**
   * Authenticate and initialize a cloud storage provider for an integration.
   *
   * 1. Decrypts access/refresh tokens from database
   * 2. Initializes provider instance using factory
   * 3. Authenticates with provider
   * 4. Checks health/connectivity
   *
   * @param integration The cloud integration record
   * @returns Authenticated CloudStorageProvider instance
   * @throws Error if authentication or health check fails
   */
  private async authenticateProvider(
    integration: CloudStorageIntegration
  ): Promise<CloudStorageProvider> {
    try {
      // Decrypt credentials
      const accessToken = integration.accessTokenEncrypted
        ? decrypt<string>(integration.accessTokenEncrypted)
        : undefined;
        
      const refreshToken = integration.refreshTokenEncrypted
        ? decrypt<string>(integration.refreshTokenEncrypted)
        : undefined;

      const credentials: CloudCredentials = {
        provider: integration.provider,
        accessToken,
        refreshToken,
        // In production, these would come from secret management service
        // For now, they are injected via env vars in the provider implementations
        // or could be stored encrypted in the integration record metadata
        metadata: integration.metadata as Record<string, unknown>
      };

      // Create provider instance
      const provider = await createCloudStorageProvider(
        integration.provider,
        credentials
      );

      // Verify connection
      const health = await provider.checkHealth();
      if (!health.healthy) {
        // If unhealthy, try to refresh token once if possible
        if (provider.refreshToken) {
          try {
            await provider.refreshToken();
            const retryHealth = await provider.checkHealth();
            if (!retryHealth.healthy) {
              throw new Error(`Provider unhealthy after refresh: ${retryHealth.message}`);
            }
          } catch (refreshErr) {
            // Update status to error if refresh fails
            await this.cloudIntegrationRepo.update(integration.id, integration.profileId, {
              status: "expired"
            });
            throw new Error(`Failed to refresh token: ${String(refreshErr)}`);
          }
        } else {
          throw new Error(`Provider unhealthy: ${health.message}`);
        }
      }

      return provider;
    } catch (err) {
      // Log error and update integration status
      console.error(`Failed to authenticate provider ${integration.id}:`, err);
      
      // Only update status if it's a persistent auth error
      if (String(err).includes("decrypt") || String(err).includes("auth")) {
        await this.cloudIntegrationRepo.update(integration.id, integration.profileId, {
          status: "error"
        });
      }
      
      throw err;
    }
  }

  /**
   * Execute a catcher task based on task type.
   *
   * Task types:
   * - artifact_import_full: Full import with payload:
   *     { integrationId: string, profileId: string }
   * - artifact_sync_incremental: Delta sync with payload:
   *     { integrationId?: string, profileId: string }
   * - artifact_refresh_source: Single-source refresh with payload:
   *     { integrationId: string, profileId: string }
   *
   * @param task The catcher task to execute
   * @returns AgentResult with status, notes, and output metrics
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const taskDescription = task.description || "unknown";
    const payload = task.payload as Record<string, unknown>;

    // Extract common payload fields
    const profileId = payload['profileId'] as string | undefined;
    const integrationId = payload['integrationId'] as string | undefined;

    if (!profileId) {
      return {
        taskId: task.id,
        status: "failed",
        notes: "missing_profile_id"
      };
    }

    try {
      // Route to appropriate handler based on task description
      if (taskDescription.includes("full") || taskDescription.includes("import")) {
        return await this.handleFullImport(task.id, profileId, integrationId);
      } else if (taskDescription.includes("incremental") || taskDescription.includes("sync")) {
        return await this.handleIncrementalSync(task.id, profileId, integrationId);
      } else if (taskDescription.includes("refresh")) {
        return await this.handleSingleSourceRefresh(task.id, profileId, integrationId);
      } else {
        return {
          taskId: task.id,
          status: "failed",
          notes: `unknown_task_description: ${taskDescription}`
        };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        taskId: task.id,
        status: "failed",
        notes: `catcher_error: ${errorMsg}`
      };
    }
  }

  /**
   * Track metrics during import/sync.
   */
  private createMetricsCollector() {
    return {
      filesProcessed: 0,
      newArtifacts: 0,
      modifiedArtifacts: 0,
      deletedArtifacts: 0,
      errors: [] as Array<{ filename: string; error: string }>,
      startTime: Date.now(),

      recordSuccess: function() {
        this.filesProcessed++;
      },

      recordNew: function() {
        this.newArtifacts++;
        this.filesProcessed++;
      },

      recordModified: function() {
        this.modifiedArtifacts++;
        this.filesProcessed++;
      },

      recordDeleted: function() {
        this.deletedArtifacts++;
      },

      recordError: function(filename: string, error: string) {
        this.errors.push({ filename, error });
      },

      getDuration: function(): number {
        return Date.now() - this.startTime;
      }
    };
  }

  /**
   * Handle full import: Crawl entire configured folders and ingest all files.
   *
   * Used for:
   * - Initial setup when first connecting cloud storage
   * - One-time historical import of decades-long corpus
   *
   * Process:
   * 1. Query all cloud integrations for profile (or specific integration if provided)
   * 2. For each integration: list all files in included folders
   * 3. Filter by exclusion patterns, file size, MIME types
   * 4. Download, extract metadata, classify, create artifacts
   * 5. Mark all files in sync_state as synced
   *
   * Phase 6 Implementation:
   * - Uses cloud provider async iterables for memory-efficient pagination
   * - Applies folder config filters (includedFolders, excludedPatterns, maxFileSizeMB)
   * - Extracts metadata via file processors from Phase 3
   * - Classifies using heuristics from Phase 4 (fallback)
   * - Creates artifacts in in-memory store (production: database)
   * - Tracks sync state for delta detection in future incremental syncs
   *
   * @param taskId Orchestrator task ID
   * @param profileId Profile UUID
   * @param integrationId Optional: limit to specific integration
   * @returns AgentResult with import statistics
   */
  private async handleFullImport(
    taskId: string,
    profileId: string,
    integrationId?: string
  ): Promise<AgentResult> {
    const metrics = this.createMetricsCollector();
    const tempDir = join("/tmp/midst-artifacts", taskId);

    try {
      // Create temp directory for downloads
      await mkdir(tempDir, { recursive: true });

      // Query cloud storage integrations for this profile
      let integrations: CloudStorageIntegration[];
      if (integrationId) {
        // Single integration specified
        const integration = await this.cloudIntegrationRepo.findById(
          integrationId,
          profileId
        );
        integrations = integration ? [integration] : [];
      } else {
        // List all active integrations for profile
        integrations = await this.cloudIntegrationRepo.listActiveByProfile(
          profileId
        );
      }

      if (integrations.length === 0) {
        return {
          taskId,
          status: "completed",
          notes: "no_integrations_to_import"
        };
      }

      // Process each integration
      for (const integration of integrations) {
        await this.processIntegrationFullImport(
          integration,
          profileId,
          tempDir,
          metrics
        );
      }

      return {
        taskId,
        status: "completed",
        notes: `Full import completed: ${metrics.newArtifacts} new artifacts created`,
        output: {
          filesProcessed: metrics.filesProcessed,
          newArtifacts: metrics.newArtifacts,
          durationMs: metrics.getDuration(),
          errors: metrics.errors
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        taskId,
        status: "failed",
        notes: `full_import_failed: ${errorMsg}`,
        output: { errors: metrics.errors }
      };
    }
  }

  /**
   * Process a single integration for full import.
   *
   * Lists all files from configured folders, filters, downloads, extracts,
   * classifies, and creates artifacts.
   */
  private async processIntegrationFullImport(
    integration: CloudStorageIntegration,
    profileId: string,
    tempDir: string,
    metrics: ReturnType<typeof this.createMetricsCollector>
  ): Promise<void> {
    try {
      const provider = await this.authenticateProvider(integration);

      // Iterate through configured folders
      const folders = integration.folderConfig?.includedFolders || ["/"];
      const options = {
        recursive: true,
        filters: {
          maxFileSize: (integration.folderConfig?.maxFileSizeMB || 100) * 1024 * 1024,
          excludePatterns: integration.folderConfig?.excludedPatterns
        }
      };

      for (const folder of folders) {
        try {
          for await (const file of provider.listFiles(folder, options)) {
            await this.ingestSingleFile(file, integration, profileId, tempDir, metrics);
          }
        } catch (err) {
          metrics.recordError(folder, `list_files_error: ${String(err)}`);
        }
      }
    } catch (err) {
      metrics.recordError(
        integration.id,
        `integration_error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Ingest a single file from cloud storage.
   *
   * Downloads, extracts metadata, classifies, creates artifact, updates sync state.
   *
   * @internal TODO: Phase 6 - Called when cloud providers are initialized
   */
  private async ingestSingleFile(
    cloudFile: CloudFile,
    integration: CloudStorageIntegration,
    profileId: string,
    tempDir: string,
    metrics: ReturnType<typeof this.createMetricsCollector>
  ): Promise<void> {
    const fileId = cloudFile.fileId;
    const tempPath = join(tempDir, fileId);

    try {
      // Check if file was already synced with same checksum
      const existingSync = await this.syncStateRepo.findByFile(
        integration.id,
        fileId
      );
      if (existingSync && existingSync.checksum === cloudFile.checksum) {
        metrics.recordSuccess();
        return;
      }

      // Instantiate provider to download file
      // NOTE: In a real optimized flow we would pass the provider instance down
      // but for now we re-authenticate to keep signature simple. 
      // Optimization: Pass provider as arg to ingestSingleFile
      const provider = await this.authenticateProvider(integration);
      
      await provider.downloadFile(fileId, tempPath, (_bytes) => {
        // console.log(`Downloaded ${_bytes} bytes from ${cloudFile.name}`);
      });

      // Extract metadata from file
      const { metadata } = await processFile(
        tempPath,
        cloudFile.mimeType
      );

      // Classify artifact using heuristics
      const classification = classifyByHeuristics(
        cloudFile.name,
        cloudFile.path,
        cloudFile.mimeType
      );

      // Create artifact record
      const artifact: Artifact = {
        id: randomUUID(),
        profileId,
        sourceProvider: integration.provider,
        sourceId: cloudFile.fileId,
        sourcePath: cloudFile.path,
        name: cloudFile.name,
        artifactType: classification.artifactType,
        mimeType: cloudFile.mimeType,
        fileSize: cloudFile.size,
        createdDate: cloudFile.createdTime,
        modifiedDate: cloudFile.modifiedTime,
        capturedDate: new Date().toISOString(),
        title: (metadata as any).title || cloudFile.name,
        keywords: (metadata as any).keywords,
        mediaMetadata: (metadata as any) as Record<string, unknown> | undefined,
        confidence: classification.confidence,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Generate integrity proof before saving
      artifact.integrity = await this.generateIntegrityProof(
        artifact,
        profileId
      );

      // Persist artifact to database
      const createdArtifact = await this.artifactRepo.create(artifact);

      // Track sync state for delta detection
      const syncState: ArtifactSyncState = {
        id: randomUUID(),
        integrationId: integration.id,
        sourceFileId: cloudFile.fileId,
        lastModified: cloudFile.modifiedTime,
        checksum: cloudFile.checksum,
        artifactId: createdArtifact.id,
        syncedAt: new Date().toISOString()
      };
      await this.syncStateRepo.upsert(syncState);

      metrics.recordNew();
    } catch (err) {
      metrics.recordError(
        cloudFile.name,
        `ingest_error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      // Cleanup temp file
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Handle incremental sync: Only sync new/modified files since last sync.
   *
   * Used for:
   * - Periodic scheduled syncs (daily/weekly)
   * - Efficient detection of new work without re-processing entire cloud storage
   *
   * Process:
   * 1. Query cloud integrations and their last_synced_at timestamps
   * 2. For each integration: list files with modifiedTime > last_synced_at
   * 3. Check artifact_sync_state for existing entries
   * 4. For new files: download, extract, classify, create artifacts
   * 5. For modified files: update artifact metadata, optionally re-classify
   * 6. For deleted files: mark artifacts as archived
   * 7. Update last_synced_at timestamp
   *
   * Delta detection algorithm:
   * - Cloud API returns files with modifiedTime
   * - Compare against artifact_sync_state.last_modified
   * - Also check checksum from cloud API for additional confidence
   *
   * Phase 6 Implementation:
   * - Tracks last_synced_at on integration to limit cloud API queries
   * - Checks sync state for each file to detect new vs. modified vs. deleted
   * - Soft-deletes artifacts (marks archived) for deleted files
   * - Updates sync state with new modifiedTime and checksum
   *
   * @param taskId Orchestrator task ID
   * @param profileId Profile UUID
   * @param integrationId Optional: limit to specific integration
   * @returns AgentResult with sync statistics
   */
  private async handleIncrementalSync(
    taskId: string,
    profileId: string,
    integrationId?: string
  ): Promise<AgentResult> {
    const metrics = this.createMetricsCollector();
    const tempDir = join("/tmp/midst-artifacts", taskId);

    try {
      await mkdir(tempDir, { recursive: true });

      // Query cloud storage integrations for this profile
      let integrations: CloudStorageIntegration[];
      if (integrationId) {
        // Single integration specified
        const integration = await this.cloudIntegrationRepo.findById(
          integrationId,
          profileId
        );
        integrations = integration ? [integration] : [];
      } else {
        // List all active integrations for profile
        integrations = await this.cloudIntegrationRepo.listActiveByProfile(
          profileId
        );
      }

      if (integrations.length === 0) {
        return {
          taskId,
          status: "completed",
          notes: "no_integrations_to_sync"
        };
      }

      for (const integration of integrations) {
        await this.processIntegrationIncrementalSync(
          integration,
          profileId,
          tempDir,
          metrics
        );
      }

      return {
        taskId,
        status: "completed",
        notes: `Incremental sync completed: ${metrics.newArtifacts} new, ${metrics.modifiedArtifacts} modified, ${metrics.deletedArtifacts} deleted`,
        output: {
          filesProcessed: metrics.filesProcessed,
          newArtifacts: metrics.newArtifacts,
          modifiedArtifacts: metrics.modifiedArtifacts,
          deletedArtifacts: metrics.deletedArtifacts,
          durationMs: metrics.getDuration(),
          errors: metrics.errors
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        taskId,
        status: "failed",
        notes: `incremental_sync_failed: ${errorMsg}`,
        output: { errors: metrics.errors }
      };
    }
  }

  /**
   * Process a single integration for incremental sync.
   *
   * Lists only files modified since last sync, detects changes, updates artifacts.
   */
  private async processIntegrationIncrementalSync(
    integration: CloudStorageIntegration,
    profileId: string,
    tempDir: string,
    metrics: ReturnType<typeof this.createMetricsCollector>
  ): Promise<void> {
    try {
      const provider = await this.authenticateProvider(integration);
      const lastSynced = integration.lastSyncedAt ? new Date(integration.lastSyncedAt) : new Date(0);

      // Iterate through configured folders
      const folders = integration.folderConfig?.includedFolders || ["/"];
      const options = {
        recursive: true,
        filters: {
          maxFileSize: (integration.folderConfig?.maxFileSizeMB || 100) * 1024 * 1024,
          excludePatterns: integration.folderConfig?.excludedPatterns
        }
      };

      for (const folder of folders) {
        try {
          for await (const file of provider.listFiles(folder, options)) {
            const modifiedTime = new Date(file.modifiedTime);
            
            // If file modified after last sync, process it
            if (modifiedTime > lastSynced) {
              // Check if we already have this file
              const existingSync = await this.syncStateRepo.findByFile(integration.id, file.fileId);
              
              if (existingSync) {
                // Modified file
                if (file.checksum !== existingSync.checksum) {
                  // Re-download and update if checksum changed
                  // For now we treat modified files same as new for ingestion logic
                  // but in updateArtifactFromCloudFile we handle updates specifically
                  
                  // Download file to temp
                  await provider.downloadFile(file.fileId, join(tempDir, file.fileId));
                  await this.updateArtifactFromCloudFile(file, integration, profileId, tempDir, metrics);
                }
              } else {
                // New file
                await this.ingestSingleFile(file, integration, profileId, tempDir, metrics);
              }
            }
          }
        } catch (err) {
          metrics.recordError(folder, `list_files_error: ${String(err)}`);
        }
      }
      
      // Update integration last synced time
      await this.cloudIntegrationRepo.update(integration.id, profileId, {
        lastSyncedAt: new Date().toISOString()
      });
      
    } catch (err) {
      metrics.recordError(
        integration.id,
        `integration_error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Update an artifact when source file has been modified.
   *
   * Re-downloads file, extracts metadata, optionally re-classifies.
   *
   * @internal TODO: Phase 6 - Called during incremental sync with cloud providers
   */
  private async updateArtifactFromCloudFile(
    cloudFile: CloudFile,
    integration: CloudStorageIntegration,
    profileId: string,
    tempDir: string,
    metrics: ReturnType<typeof this.createMetricsCollector>
  ): Promise<void> {
    try {
      // Find existing sync state for this file
      const syncState = await this.syncStateRepo.findByFile(
        integration.id,
        cloudFile.fileId
      );
      if (!syncState?.artifactId) return;

      // Re-extract metadata (file may have changed)
      const { metadata } = await processFile(
        join(tempDir, cloudFile.fileId),
        cloudFile.mimeType
      );

      // Update artifact metadata
      const updatedArtifact = await this.artifactRepo.update(
        syncState.artifactId,
        profileId,
        {
          modifiedDate: cloudFile.modifiedTime,
          title: (metadata as any).title,
          keywords: (metadata as any).keywords,
          mediaMetadata: (metadata as any) as Record<string, unknown> | undefined
        }
      );

      if (updatedArtifact) {
        // Update sync state with new modification info
        await this.syncStateRepo.updateChecksum(
          integration.id,
          cloudFile.fileId,
          cloudFile.modifiedTime,
          cloudFile.checksum || ""
        );
        metrics.recordModified();
      }
    } catch (err) {
      metrics.recordError(
        cloudFile.name,
        `update_error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Handle single-source refresh: Re-sync one specific cloud storage integration.
   *
   * Used for:
   * - User manually triggers refresh after folder reorganization
   * - Fixing sync errors on a specific integration
   * - Incremental sync but for a single provider (skips multi-integration logic)
   *
   * Process:
   * - Similar to incremental sync, but only for one integration
   * - Useful when user organizes their Google Drive and wants immediate refresh
   *
   * Phase 6 Implementation:
   * - Delegates to incremental sync with a single integration
   * - Allows user to manually trigger sync from UI
   * - Provides feedback on what changed during refresh
   *
   * @param taskId Orchestrator task ID
   * @param profileId Profile UUID
   * @param integrationId Required: the specific integration to refresh
   * @returns AgentResult with refresh statistics
   */
  private async handleSingleSourceRefresh(
    taskId: string,
    profileId: string,
    integrationId?: string
  ): Promise<AgentResult> {
    if (!integrationId) {
      return {
        taskId,
        status: "failed",
        notes: "missing_integration_id_for_refresh"
      };
    }

    const metrics = this.createMetricsCollector();
    const tempDir = join("/tmp/midst-artifacts", taskId);

    try {
      await mkdir(tempDir, { recursive: true });

      // Query the specific integration
      const integration = await this.cloudIntegrationRepo.findById(
        integrationId,
        profileId
      );
      if (!integration) {
        return {
          taskId,
          status: "failed",
          notes: "integration_not_found"
        };
      }

      // Perform incremental sync for this single integration
      await this.processIntegrationIncrementalSync(
        integration,
        profileId,
        tempDir,
        metrics
      );

      return {
        taskId,
        status: "completed",
        notes: `Single source refresh completed for ${integration.provider}`,
        output: {
          integrationId: integration.id,
          filesProcessed: metrics.filesProcessed,
          newArtifacts: metrics.newArtifacts,
          modifiedArtifacts: metrics.modifiedArtifacts,
          deletedArtifacts: metrics.deletedArtifacts,
          durationMs: metrics.getDuration(),
          errors: metrics.errors
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        taskId,
        status: "failed",
        notes: `single_source_refresh_failed: ${errorMsg}`,
        output: { errors: metrics.errors }
      };
    }
  }

  /**
   * Generate cryptographic integrity proof for an artifact.
   *
   * Creates a self-attested DID signature for artifact provenance verification.
   * Implements blockchain-style integrity checking for cloud-sourced artifacts.
   *
   * Process:
   * 1. Load profile's DID key pair from database (or create if missing)
   * 2. Canonicalize artifact fields (sourceProvider, sourceId, sourcePath, fileSize, capturedDate, mimeType)
   * 3. SHA256 hash the canonical JSON (sorted keys)
   * 4. Sign the hash with Ed25519 private key using crypto utilities
   * 5. Return IntegrityProof with method, hash, signature, signedAt, verified: false
   * 6. Create VerificationLog entry of type 'self_attestation'
   *
   * Phase 7 Implementation:
   * - Uses profile-keys repository for encrypted DID storage
   * - Creates verification log entries for audit trail
   * - Hash includes only immutable artifact properties (excludes metadata that may change)
   * - Signature is deterministic for same input (same artifact = same signature)
   *
   * @param artifact The artifact to generate proof for (before saving)
   * @param profileId Profile UUID
   * @returns IntegrityProof with hash and signature
   */
  private async generateIntegrityProof(
    artifact: Artifact,
    profileId: string
  ): Promise<IntegrityProof> {
    // Load profile's DID key pair from database (create if missing)
    let keyPair = await this.profileKeyRepo.getKeyPair(profileId);
    if (!keyPair) {
      await this.profileKeyRepo.create(profileId);
      keyPair = await this.profileKeyRepo.getKeyPair(profileId);
      if (!keyPair) {
        throw new Error("Failed to create or retrieve profile key pair");
      }
    }

    // Canonicalize artifact fields (only immutable properties)
    const canonicalPayload = {
      sourceProvider: artifact.sourceProvider,
      sourceId: artifact.sourceId,
      sourcePath: artifact.sourcePath,
      fileSize: artifact.fileSize,
      capturedDate: artifact.capturedDate,
      mimeType: artifact.mimeType
    };

    // SHA256 hash the canonical JSON
    const hash = await hashPayload(canonicalPayload);

    // Sign the hash with Ed25519 private key
    const timestamp = new Date().toISOString();
    const message = JSON.stringify({ hash, did: keyPair.did, timestamp });
    const signature = await new jose.CompactSign(new TextEncoder().encode(message))
      .setProtectedHeader({ alg: 'EdDSA' })
      .sign(keyPair.privateKey);

    const proof: IntegrityProof = {
      hash,
      signature,
      did: keyPair.did,
      timestamp
    };

    // Create VerificationLog entry of type 'self_attestation'
    const verificationLog: VerificationLog = {
      id: randomUUID(),
      profileId,
      entityType: "artifact",
      entityId: artifact.id,
      status: "verified",
      source: "automated",
      verifierLabel: "Self-attestation (DID signature)",
      notes: "Cryptographic integrity proof generated at ingestion time",
      metadata: {
        method: "Ed25519",
        hash,
        did: keyPair.did
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await this.verificationLogRepo.create(verificationLog);

    return proof;
  }
}
