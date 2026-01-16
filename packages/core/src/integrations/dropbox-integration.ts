/**
 * Dropbox Cloud Storage Provider
 *
 * Implements CloudStorageProvider interface for Dropbox API v2.
 *
 * Features:
 * - OAuth 2.0 authentication with refresh token rotation
 * - File listing with cursor-based pagination
 * - Streaming file downloads
 * - Metadata extraction with creation date preservation
 * - Delta sync support via content_hash and rev
 * - Automatic token refresh before expiry
 *
 * Authentication:
 * Requires Dropbox app with appropriate permissions.
 * Uses OAuth 2.0 with offline access.
 *
 * Environment variables:
 * - DROPBOX_APP_KEY: OAuth 2.0 App Key
 * - DROPBOX_APP_SECRET: OAuth 2.0 App Secret
 * - DROPBOX_REDIRECT_URI: OAuth 2.0 Redirect URI (e.g., http://localhost:3001/integrations/cloud-storage/callback)
 */

import { randomBytes } from "node:crypto";
import type {
  CloudStorageProvider,
  CloudCredentials,
  CloudFile,
  ListOptions,
  ProviderHealthStatus
} from "./cloud-storage-provider";

/**
 * Dropbox file metadata from Files API.
 * Subset of: https://www.dropbox.com/developers/documentation/http/documentation
 */
interface DropboxFileMetadata {
  ".tag": "file" | "folder" | "deleted";
  id: string; // Unique file ID
  name: string;
  path_display: string;
  path_lower: string;
  size?: number;
  server_modified: string; // ISO 8601 - last modified
  client_modified?: string; // ISO 8601 - client-provided modification time (may be creation time)
  rev?: string; // File revision for change detection
  content_hash?: string; // SHA256 hash for change detection
  is_deleted?: boolean;
  [key: string]: unknown;
}

/**
 * Dropbox API error response.
 */
interface DropboxError {
  error_summary: string;
  error?: Record<string, unknown>;
}

/**
 * Dropbox file list response.
 */
interface DropboxListResponse {
  entries: DropboxFileMetadata[];
  cursor: string;
  has_more: boolean;
}

export class DropboxProvider implements CloudStorageProvider {
  readonly name = "dropbox" as const;

  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiry: Date | null = null;
  private appKey: string;
  private appSecret: string;
  private redirectUri: string;

  /**
   * Initialize Dropbox provider.
   * Credentials can be passed, or will use env variables.
   */
  constructor(
    credentials: CloudCredentials,
    appKey?: string,
    appSecret?: string,
    redirectUri?: string
  ) {
    this.appKey = appKey || process.env['DROPBOX_APP_KEY'] || "";
    this.appSecret = appSecret || process.env['DROPBOX_APP_SECRET'] || "";
    this.redirectUri = redirectUri || process.env['DROPBOX_REDIRECT_URI'] || "";

    if (!this.appKey || !this.appSecret) {
      throw new Error("Dropbox: Missing DROPBOX_APP_KEY or DROPBOX_APP_SECRET");
    }

    this.accessToken = credentials.accessToken || null;
    this.refreshTokenValue = credentials.refreshToken || null;
    if (credentials.metadata?.['tokenExpiry']) {
      this.tokenExpiry = new Date(credentials.metadata['tokenExpiry'] as string);
    }
  }

  /**
   * Authenticate using OAuth authorization code (from redirect callback).
   * Exchanges code for access and refresh tokens.
   */
  async authenticate(credentials: CloudCredentials): Promise<void> {
    if (credentials.accessToken || credentials.refreshToken) {
      // Already have tokens, just store them
      this.accessToken = credentials.accessToken || null;
      this.refreshTokenValue = credentials.refreshToken || null;
      return;
    }

    if (!credentials.metadata?.['authCode']) {
      throw new Error("Dropbox: No authorization code provided");
    }

    await this.exchangeCodeForToken(credentials.metadata['authCode'] as string, this.redirectUri);
  }

  /**
   * Get OAuth authorization URL for user to click.
   * User grants permission, redirects to callback with authorization code.
   */
  getAuthorizationUrl(redirectUri: string, _scopes?: string[]): string {
    const state = randomBytes(16).toString("hex"); // CSRF protection

    const params = new URLSearchParams({
      client_id: this.appKey,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      token_access_type: "offline" // Request refresh token
    });

    return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth authorization code for tokens.
   * Called by API callback handler.
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<CloudCredentials> {
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: this.appKey,
      client_secret: this.appSecret,
      redirect_uri: redirectUri
    });

    try {
      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (!response.ok) {
        const error: DropboxError = await response.json();
        throw new Error(`Dropbox: Token exchange failed: ${error.error_summary}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshTokenValue = data.refresh_token;
      }
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return {
        provider: "dropbox",
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenValue || undefined,
        metadata: { tokenExpiry: this.tokenExpiry.toISOString() }
      };
    } catch (err) {
      throw new Error(`Dropbox: Token exchange error: ${String(err)}`);
    }
  }

  /**
   * Refresh OAuth access token using refresh token.
   * Called automatically if token is near expiry.
   */
  async refreshToken(): Promise<void> {
    if (!this.refreshTokenValue) {
      throw new Error("Dropbox: No refresh token available");
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshTokenValue || "",
      client_id: this.appKey,
      client_secret: this.appSecret
    });

    try {
      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (!response.ok) {
        const error: DropboxError = await response.json();
        throw new Error(`Dropbox: Token refresh failed: ${error.error_summary}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };

      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    } catch (err) {
      throw new Error(`Dropbox: Token refresh error: ${String(err)}`);
    }
  }

  /**
   * List files from Dropbox folder with cursor-based pagination.
   * Async iterable for memory efficiency.
   *
   * Critical: Extracts client_modified (or server_modified as fallback)
   * to preserve original artifact creation dates.
   */
  async *listFiles(folderPath: string, options?: ListOptions): AsyncIterable<CloudFile> {
    await this.ensureTokenValid();

    let cursor: string | null = null;

    while (true) {
      try {
        const body: Record<string, unknown> = {
          path: folderPath,
          recursive: options?.recursive ?? false,
          include_media_info: false,
          include_deleted: false,
          include_mounted_folders: true,
          limit: options?.pageSize ?? 100
        };

        if (cursor) {
          body['cursor'] = cursor;
        }

        const endpoint = cursor
          ? "https://api.dropboxapi.com/2/files/list_folder/continue"
          : "https://api.dropboxapi.com/2/files/list_folder";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const error: DropboxError = await response.json();
          throw new Error(`Dropbox: List files failed: ${error.error_summary}`);
        }

        const data: DropboxListResponse = await response.json();

        for (const entry of data.entries) {
          if (entry[".tag"] === "deleted" || entry.is_deleted) continue;
          if (entry[".tag"] === "folder") {
            // Optionally skip folders or include them
            continue;
          }

          // Apply maxFileSize filter
          if (options?.filters?.maxFileSize && entry.size && entry.size > options.filters.maxFileSize) {
            continue;
          }

          // Apply excludePatterns filter
          if (options?.filters?.excludePatterns) {
            const shouldExclude = options.filters.excludePatterns.some(pattern => {
              return this.matchesPattern(entry.path_display, pattern);
            });
            if (shouldExclude) continue;
          }

          yield this.mapDropboxFileToCloudFile(entry);
        }

        if (!data.has_more) break;
        cursor = data['cursor'];
      } catch (err) {
        throw new Error(`Dropbox: Listing error: ${String(err)}`);
      }
    }
  }

  /**
   * Get metadata for a specific file.
   * Used for delta sync: check if file has been modified since last sync.
   */
  async getMetadata(fileId: string): Promise<CloudFile> {
    await this.ensureTokenValid();

    try {
      const response = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          path: fileId,
          include_media_info: false,
          include_deleted: false
        })
      });

      if (!response.ok) {
        const error: DropboxError = await response.json();
        throw new Error(`Dropbox: Get metadata failed: ${error.error_summary}`);
      }

      const file: DropboxFileMetadata = await response.json();
      return this.mapDropboxFileToCloudFile(file);
    } catch (err) {
      throw new Error(`Dropbox: Metadata error: ${String(err)}`);
    }
  }

  /**
   * Download file from Dropbox to local filesystem.
   * Streams for memory efficiency.
   */
  async downloadFile(
    fileId: string,
    destinationPath: string,
    onProgress?: (bytesDownloaded: number) => void
  ): Promise<void> {
    await this.ensureTokenValid();

    try {
      const response = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path: fileId })
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Dropbox: Download failed: ${error}`);
      }

      // Stream to filesystem
      const { createWriteStream } = await import("node:fs");
      const { pipeline } = await import("node:stream/promises");
      const { Readable } = await import("node:stream");

      const writeStream = createWriteStream(destinationPath);
      let downloadedBytes = 0;

      // Convert web ReadableStream to Node.js Readable
      if (!response.body) {
        throw new Error("Dropbox: No response body");
      }

      const reader = response.body.getReader();
      const nodeStream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              this.push(null);
            } else {
              downloadedBytes += value.length;
              if (onProgress) {
                onProgress(downloadedBytes);
              }
              this.push(Buffer.from(value));
            }
          } catch (err) {
            this.destroy(err as Error);
          }
        }
      });

      await pipeline(nodeStream, writeStream);
      console.log(`Downloaded ${downloadedBytes} bytes to ${destinationPath}`);
    } catch (err) {
      throw new Error(`Dropbox: Download error: ${String(err)}`);
    }
  }

  /**
   * Check if provider is healthy and credentials are valid.
   */
  async checkHealth(): Promise<ProviderHealthStatus> {
    try {
      await this.ensureTokenValid();

      // Try a simple API call to verify access
      const response = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });

      if (response.ok) {
        return {
          healthy: true,
          provider: "dropbox",
          lastChecked: new Date().toISOString(),
          tokenExpiry: this.tokenExpiry?.toISOString()
        };
      } else {
        return {
          healthy: false,
          provider: "dropbox",
          message: `Dropbox API returned ${response.status}`,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (err) {
      return {
        healthy: false,
        provider: "dropbox",
        message: String(err),
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Private helper: Ensure access token is valid, refresh if needed.
   */
  private async ensureTokenValid(): Promise<void> {
    if (!this.accessToken) {
      throw new Error("Dropbox: Not authenticated");
    }

    // Refresh if token expires within 5 minutes
    if (this.tokenExpiry && Date.now() > this.tokenExpiry.getTime() - 5 * 60 * 1000) {
      await this.refreshToken();
    }
  }

  /**
   * Private helper: Map Dropbox file to CloudFile.
   * CRUCIAL: Preserves client_modified (or server_modified as fallback).
   */
  private mapDropboxFileToCloudFile(file: DropboxFileMetadata): CloudFile {
    // Use client_modified (creation time) if available, else server_modified
    const createdTime = file.client_modified || file.server_modified;

    // Guess MIME type from file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = this.guessMimeType(ext);

    return {
      fileId: file.id,
      name: file.name,
      path: file.path_display,
      mimeType,
      size: file.size || 0,
      createdTime, // CRUCIAL: Original creation date
      modifiedTime: file.server_modified,
      checksum: file.content_hash,
      isFolder: file[".tag"] === "folder"
    };
  }

  /**
   * Private helper: Match file path against glob pattern.
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob matching (same as LocalFilesystemProvider)
    if (pattern === "*/**" || pattern === "**" || path.includes(pattern)) {
      return true;
    }

    // Handle simple wildcards
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return regex.test(path);
  }

  /**
   * Private helper: Guess MIME type from file extension.
   */
  private guessMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      xml: "application/xml",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      flac: "audio/flac",
      mp4: "video/mp4",
      mkv: "video/x-matroska",
      mov: "video/quicktime",
      webm: "video/webm"
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}
