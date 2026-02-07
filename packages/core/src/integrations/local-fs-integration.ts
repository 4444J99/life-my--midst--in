/**
 * Local Filesystem Cloud Storage Provider
 *
 * Implements CloudStorageProvider interface for local filesystem paths.
 * Useful for:
 * - External USB drives or archives
 * - NAS (Network Attached Storage) mounted locally
 * - iCloud Drive on macOS (mounts at ~/Library/Mobile Documents)
 * - Local backups organized in folders
 * - Development/testing with mock data
 * - Network shares via SMB (smb://) or SFTP (sftp://)
 *
 * Environment variables:
 * - None required (paths passed via credentials.folderPath)
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { homedir } from 'node:os';
import type {
  CloudStorageProvider,
  CloudCredentials,
  CloudFile,
  ListOptions,
  ProviderHealthStatus,
} from './cloud-storage-provider';

// Dynamically load network libraries to keep core light if unused
// We'll import them in methods or use a lazy loader pattern if this were a larger app.
// For now, we import types for TS, but use require/dynamic import at runtime for implementation if desired,
// or just standard import if we accept the deps. We added them as deps, so standard import is fine.
// However, ssh2 and smb2 might not be fully tree-shakable or environment compatible everywhere,
// so dynamic import is safer for "optional" requirement, but given we installed them, we can use them.
// Let's use dynamic import to avoid crashes if they fail to load in some envs.

export class LocalFilesystemProvider implements CloudStorageProvider {
  readonly name = 'local' as const;

  private basePath: string;
  private depth: number = 0;
  private protocol: 'file' | 'smb' | 'sftp' = 'file';
  private credentials: CloudCredentials;

  /**
   * Initialize local filesystem provider.
   */
  constructor(credentials: CloudCredentials, depth?: number) {
    const folderPath = credentials.folderPath;
    if (!folderPath) {
      throw new Error('Local filesystem: Missing folderPath in credentials');
    }

    this.credentials = credentials;
    this.depth = depth || 10; // Max recursion depth

    // Detect protocol
    if (folderPath.startsWith('smb://')) {
      this.protocol = 'smb';
      this.basePath = folderPath; // Keep full URL
    } else if (folderPath.startsWith('sftp://')) {
      this.protocol = 'sftp';
      this.basePath = folderPath;
    } else {
      this.protocol = 'file';
      // Expand ~ if present
      if (folderPath.startsWith('~')) {
        this.basePath = folderPath.replace(/^~/, homedir());
      } else {
        this.basePath = folderPath;
      }
    }
  }

  /**
   * Authenticate.
   * For local: Verify path exists.
   * For SMB/SFTP: Verify connection.
   */
  async authenticate(credentials: CloudCredentials): Promise<void> {
    if (this.protocol === 'file') {
      try {
        const stats = await stat(this.basePath);
        if (!stats.isDirectory()) {
          throw new Error(`Local filesystem: Path is not a directory: ${this.basePath}`);
        }
      } catch (err) {
        throw new Error(`Local filesystem: Cannot access path: ${String(err)}`);
      }
    } else if (this.protocol === 'sftp') {
      await this.checkSftpConnection(credentials);
    } else if (this.protocol === 'smb') {
      await this.checkSmbConnection(credentials);
    }
  }

  getAuthorizationUrl(): string {
    throw new Error('Local filesystem: OAuth not supported');
  }

  exchangeCodeForToken(): Promise<CloudCredentials> {
    return Promise.reject(new Error('Local filesystem: Token exchange not supported'));
  }

  /**
   * List files. Delegates to protocol handler.
   */
  async *listFiles(folderPath: string, options?: ListOptions): AsyncIterable<CloudFile> {
    if (this.protocol === 'file') {
      yield* this.listLocalFiles(folderPath, options);
    } else if (this.protocol === 'sftp') {
      yield* this.listSftpFiles(folderPath, options);
    } else if (this.protocol === 'smb') {
      yield* this.listSmbFiles(folderPath, options);
    }
  }

  /**
   * Get metadata.
   */
  async getMetadata(fileId: string): Promise<CloudFile> {
    if (this.protocol === 'file') {
      const fullPath = join(this.basePath, fileId);
      try {
        const stats = await stat(fullPath);
        const filename = fileId.split('/').pop() || fileId;
        return this.mapLocalFileToCloudFile(fullPath, filename, fileId, stats);
      } catch (err) {
        throw new Error(`Local filesystem: Get metadata error: ${String(err)}`);
      }
    } else {
      // For network protocols, we might need to fetch single file info.
      // Re-using listFiles for simplicity or implementing specific fetch.
      // Here we iterate listFiles for the specific file (inefficient but safe for now)
      // or throw not implemented if strict.
      // Let's try to implement basic stat.
      throw new Error('Metadata fetch not fully implemented for network shares yet.');
    }
  }

  /**
   * Download file.
   */
  async downloadFile(
    fileId: string,
    destinationPath: string,
    onProgress?: (bytesDownloaded: number) => void,
  ): Promise<void> {
    if (this.protocol === 'file') {
      await this.downloadLocalFile(fileId, destinationPath, onProgress);
    } else if (this.protocol === 'sftp') {
      await this.downloadSftpFile(fileId, destinationPath, onProgress);
    } else if (this.protocol === 'smb') {
      await this.downloadSmbFile(fileId, destinationPath, onProgress);
    }
  }

  /**
   * Check health.
   */
  async checkHealth(): Promise<ProviderHealthStatus> {
    try {
      await this.authenticate(this.credentials);
      return {
        healthy: true,
        provider: 'local',
        message: `Path/Connection accessible: ${this.basePath}`,
        lastChecked: new Date().toISOString(),
      };
    } catch (err) {
      return {
        healthy: false,
        provider: 'local',
        message: `Cannot access path/connection: ${String(err)}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  // --- Local Implementation ---

  private async *listLocalFiles(
    folderPath: string,
    options?: ListOptions,
  ): AsyncIterable<CloudFile> {
    const fullPath = join(this.basePath, folderPath);

    // Make this an async generator
    async function* traverse(
      this: LocalFilesystemProvider,
      currentPath: string,
      relativePath: string,
      currentDepth: number,
      options?: ListOptions,
    ): AsyncIterable<CloudFile> {
      if (currentDepth > this.depth) return;

      try {
        const entries = await readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryFullPath = join(currentPath, entry.name);
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

          // Skip hidden files and common exclusions
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === '.git'
          ) {
            continue;
          }

          // Check exclusion patterns
          if (options?.filters?.excludePatterns) {
            if (this.matchesPattern(relPath, options.filters.excludePatterns)) {
              continue;
            }
          }

          if (entry.isDirectory()) {
            if (options?.recursive !== false) {
              yield* traverse.call(this, entryFullPath, relPath, currentDepth + 1, options);
            }
          } else if (entry.isFile()) {
            // Check inclusion patterns
            if (options?.filters?.includePatterns) {
              if (!this.matchesPattern(relPath, options.filters.includePatterns)) {
                continue;
              }
            }

            const stats = await stat(entryFullPath);
            const cloudFile = await this.mapLocalFileToCloudFile(
              entryFullPath,
              entry.name,
              relPath,
              stats,
            );

            // Filter by file size if specified
            if (options?.filters?.maxFileSize && cloudFile.size > options.filters.maxFileSize) {
              continue;
            }

            yield cloudFile;
          }
        }
      } catch (err) {
        throw new Error(`Local filesystem: Traverse error at ${currentPath}: ${String(err)}`);
      }
    }

    yield* traverse.call(this, fullPath, '', 0, options);
  }

  private async downloadLocalFile(
    fileId: string,
    destinationPath: string,
    onProgress?: (bytesDownloaded: number) => void,
  ): Promise<void> {
    const sourcePath = join(this.basePath, fileId);

    try {
      const stats = await stat(sourcePath);

      // Stream copy for memory efficiency
      const readStream = createReadStream(sourcePath);
      const writeStream = createWriteStream(destinationPath);

      let downloadedBytes = 0;
      readStream.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress) {
          onProgress(downloadedBytes);
        }
      });

      await pipeline(readStream, writeStream);

      console.log(`Downloaded ${stats.size} bytes to ${destinationPath}`);
    } catch (err) {
      throw new Error(`Local filesystem: Download error: ${String(err)}`);
    }
  }

  // --- SFTP Implementation ---

  private async checkSftpConnection(credentials: CloudCredentials): Promise<void> {
    const Client = (await import('ssh2')).Client;
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const url = new URL(this.basePath);
      conn
        .on('ready', () => {
          conn.end();
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        })
        .connect({
          host: url.hostname,
          port: parseInt(url.port) || 22,
          username: url.username || (credentials.metadata?.['username'] as string), // allow-secret
          password: url.password || (credentials.metadata?.['password'] as string), // allow-secret
          // Add private key support if needed via metadata
        });
    });
  }

  private async *listSftpFiles(
    folderPath: string,
    options?: ListOptions,
  ): AsyncIterable<CloudFile> {
    const { Client } = await import('ssh2');
    const url = new URL(this.basePath);
    // Determine root path on server from URL path
    const rootPath = url.pathname || '.';
    const targetPath = rootPath + (folderPath ? '/' + folderPath : '');

    const conn = new Client();

    const connectPromise = new Promise<import('ssh2').Client>((resolve, reject) => {
      conn
        .on('ready', () => resolve(conn))
        .on('error', reject)
        .connect({
          host: url.hostname,
          port: parseInt(url.port) || 22,
          username: url.username || (this.credentials.metadata?.['username'] as string), // allow-secret
          password: url.password || (this.credentials.metadata?.['password'] as string), // allow-secret
        });
    });

    try {
      await connectPromise;
      const sftp = await new Promise<import('ssh2').SFTPWrapper>((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) reject(err);
          else resolve(sftp);
        });
      });

      // Recursive traversal helper
      const traverseSftp = async function* (
        this: LocalFilesystemProvider,
        dir: string,
        relDir: string,
        depth: number,
      ): AsyncIterable<CloudFile> {
        if (depth > (options?.recursive ? this.depth || 10 : 0)) return;

        const list = await new Promise<import('ssh2').FileEntry[]>((resolve, reject) => {
          sftp.readdir(dir, (err, list) => {
            if (err) reject(err);
            else resolve(list);
          });
        });

        for (const item of list) {
          const fullPath = dir + '/' + item.filename; // Simple concat, assuming unix
          const relPath = relDir ? relDir + '/' + item.filename : item.filename;

          if (item.filename.startsWith('.') || item.filename === 'node_modules') continue;

          if ((item.attrs.mode & 0o170000) === 0o040000) {
            if (options?.recursive !== false) {
              yield* traverseSftp.call(this, fullPath, relPath, depth + 1);
            }
          } else {
            // File
            const cloudFile: CloudFile = {
              fileId: relPath,
              name: item.filename,
              path: relPath,
              mimeType: this.guessMimeType(item.filename.split('.').pop() || ''),
              size: item.attrs.size,
              createdTime: new Date(item.attrs.mtime * 1000).toISOString(), // ssh2 returns unix timestamp
              modifiedTime: new Date(item.attrs.mtime * 1000).toISOString(),
              checksum: undefined, // SFTP doesn't give checksum easily
              parentId: relDir,
            };

            if (options?.filters?.maxFileSize && cloudFile.size > options.filters.maxFileSize)
              continue;

            yield cloudFile;
          }
        }
      };

      yield* traverseSftp.call(this, targetPath, '', 0);
    } finally {
      conn.end();
    }
  }

  private async downloadSftpFile(
    fileId: string,
    destPath: string,
    onProgress?: (bytes: number) => void,
  ): Promise<void> {
    const { Client } = await import('ssh2');
    const url = new URL(this.basePath);
    const rootPath = url.pathname || '.';
    const targetPath = rootPath + (fileId ? '/' + fileId : ''); // Simplified path joining

    const conn = new Client();
    await new Promise<void>((resolve, reject) => {
      conn
        .on('ready', resolve)
        .on('error', reject)
        .connect({
          host: url.hostname,
          port: parseInt(url.port) || 22,
          username: url.username || (this.credentials.metadata?.['username'] as string), // allow-secret
          password: url.password || (this.credentials.metadata?.['password'] as string), // allow-secret
        });
    });

    try {
      const sftp = await new Promise<import('ssh2').SFTPWrapper>((resolve, reject) => {
        conn.sftp((err, sftp) => (err ? reject(err) : resolve(sftp)));
      });

      await new Promise<void>((resolve, reject) => {
        sftp.fastGet(
          targetPath,
          destPath,
          {
            step: (total_transferred) => {
              if (onProgress) onProgress(total_transferred);
            },
          },
          (err) => (err ? reject(err) : resolve()),
        );
      });
    } finally {
      conn.end();
    }
  }

  // --- SMB Implementation ---

  private async checkSmbConnection(credentials: CloudCredentials): Promise<void> {
    const SMB2 = (await import('smb2')).default;
    const url = new URL(this.basePath);

    const client = new SMB2({
      share: '/' + url.hostname + '/' + (url.pathname.split('/')[1] || 'IPC$'),
      domain: 'WORKGROUP', // Default or from metadata
      username: url.username || (credentials.metadata?.['username'] as string), // allow-secret
      password: url.password || (credentials.metadata?.['password'] as string), // allow-secret
    });

    // Just try to read directory
    await client.readdir('');
  }

  private async *listSmbFiles(folderPath: string, options?: ListOptions): AsyncIterable<CloudFile> {
    const SMB2 = (await import('smb2')).default;
    const url = new URL(this.basePath);
    // path part of smb://host/share/path
    const parts = url.pathname.split('/').filter((p) => p);
    const share = parts[0];
    const rootDir = parts.slice(1).join('\\'); // SMB uses backslash

    const client = new SMB2({
      share: '/' + url.hostname + '/' + share,
      domain: 'WORKGROUP',
      username: url.username || (this.credentials.metadata?.['username'] as string), // allow-secret
      password: url.password || (this.credentials.metadata?.['password'] as string), // allow-secret
    });

    // Recursive traversal
    const traverseSmb = async function* (
      this: LocalFilesystemProvider,
      dir: string,
      relDir: string,
      depth: number,
    ): AsyncIterable<CloudFile> {
      if (depth > (options?.recursive ? this.depth || 10 : 0)) return;

      const fileNames = await client.readdir(dir || '');

      for (const name of fileNames) {
        if (name === '.' || name === '..') continue;

        const fullPath = dir ? dir + '\\\\' + name : name;
        const relPath = relDir ? relDir + '/' + name : name;

        try {
          const stat = await client.stat(fullPath);

          if (stat.isDirectory()) {
            if (options?.recursive !== false) {
              yield* traverseSmb.call(this, fullPath, relPath, depth + 1);
            }
          } else {
            const cloudFile: CloudFile = {
              fileId: relPath,
              name: name,
              path: relPath,
              mimeType: this.guessMimeType(name.split('.').pop() || ''),
              size: stat.size,
              createdTime: stat.birthtime.toISOString(),
              modifiedTime: stat.mtime.toISOString(),
              checksum: undefined,
              parentId: relDir,
            };

            if (options?.filters?.maxFileSize && cloudFile.size > options.filters.maxFileSize)
              continue;

            yield cloudFile;
          }
        } catch (e) {
          // Ignore access errors
          console.warn(`SMB Stat error for ${fullPath}: ${String(e)}`);
        }
      }
    };

    // Normalize folderPath to backslashes
    const startDir = rootDir
      ? folderPath
        ? rootDir + '\\\\' + folderPath.replace(/\//g, '\\\\')
        : rootDir
      : folderPath
        ? folderPath.replace(/\//g, '\\\\')
        : '';

    yield* traverseSmb.call(this, startDir, '', 0);
  }

  private async downloadSmbFile(
    fileId: string,
    destPath: string,
    onProgress?: (bytes: number) => void,
  ): Promise<void> {
    const SMB2 = (await import('smb2')).default;
    const url = new URL(this.basePath);
    const parts = url.pathname.split('/').filter((p) => p);
    const share = parts[0];
    const rootDir = parts.slice(1).join('\\');

    const client = new SMB2({
      share: '/' + url.hostname + '/' + share,
      domain: 'WORKGROUP',
      username: url.username || (this.credentials.metadata?.['username'] as string), // allow-secret
      password: url.password || (this.credentials.metadata?.['password'] as string), // allow-secret
    });

    const smbPath = rootDir
      ? rootDir + '\\\\' + fileId.replace(/\//g, '\\\\')
      : fileId.replace(/\//g, '\\\\');

    // readFile returns buffer. Streaming not fully supported in simple smb2?
    // It supports createReadStream.
    const readStream = client.createReadStream(smbPath);
    const writeStream = createWriteStream(destPath);

    let downloaded = 0;
    readStream.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (onProgress) onProgress(downloaded);
    });

    await pipeline(readStream, writeStream);
  }

  // --- Helpers ---

  private async mapLocalFileToCloudFile(
    fullPath: string,
    filename: string,
    relativePath: string,
    stats: Awaited<ReturnType<typeof stat>>,
  ): Promise<CloudFile> {
    // Use birthtime (file creation time) if available, else mtime (modification time)
    // Note: birthtime is not available on all filesystems (Linux ext4 doesn't have it)
    const createdTime = stats.birthtime?.toISOString() || stats.mtime.toISOString();

    // Guess MIME type from extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeType = this.guessMimeType(ext);

    return {
      fileId: relativePath,
      name: filename,
      path: relativePath,
      mimeType,
      size: Number(stats.size),
      createdTime, // CRUCIAL: File creation time
      modifiedTime: stats.mtime.toISOString(),
      accessedTime: stats.atime.toISOString(),
      checksum: await this.hashFile(fullPath), // SHA256 hash of file content
    };
  }

  private async hashFile(fullPath: string): Promise<string> {
    const content = await readFile(fullPath);
    return createHash('sha256').update(content).digest('hex');
  }

  private matchesPattern(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Glob matching uses basic string includes; upgrade to minimatch if patterns grow complex
      if (pattern === '*/**' || pattern === '**' || path.includes(pattern)) {
        return true;
      }

      // Handle simple wildcards
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      if (regex.test(path)) {
        return true;
      }
    }
    return false;
  }

  private guessMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      xml: 'application/xml',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      mov: 'video/quicktime',
      webm: 'video/webm',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
