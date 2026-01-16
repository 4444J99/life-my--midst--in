/**
 * Tests for DropboxProvider
 * 
 * Mocks Dropbox API calls to test functionality without real credentials.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DropboxProvider } from '../src/integrations/dropbox-integration';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('DropboxProvider', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set mock env variables
    process.env.DROPBOX_APP_KEY = 'test-app-key';
    process.env.DROPBOX_APP_SECRET = 'test-app-secret';
    process.env.DROPBOX_REDIRECT_URI = 'http://localhost:3001/callback';
  });

  describe('constructor', () => {
    it('should initialize with credentials', () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token',
        refreshToken: 'test-refresh-token'
      });
      expect(provider.name).toBe('dropbox');
    });

    it('should throw error if app key is missing', () => {
      delete process.env.DROPBOX_APP_KEY;
      expect(() => {
        new DropboxProvider({ provider: 'dropbox' });
      }).toThrow('Missing DROPBOX_APP_KEY');
    });
  });

  describe('authenticate', () => {
    it('should accept existing access token', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'existing-token'
      });

      await provider.authenticate({
        provider: 'dropbox',
        accessToken: 'existing-token'
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should exchange auth code for tokens', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 14400
        })
      });

      await provider.authenticate({
        provider: 'dropbox',
        metadata: { authCode: 'test-auth-code' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.dropboxapi.com/oauth2/token',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return OAuth URL', () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      const url = provider.getAuthorizationUrl('http://localhost:3001/callback');
      
      expect(url).toContain('https://www.dropbox.com/oauth2/authorize');
      expect(url).toContain('client_id=test-app-key');
      expect(url).toContain('response_type=code');
      expect(url).toContain('token_access_type=offline');
    });
  });

  describe('listFiles', () => {
    it('should list files with pagination', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      // Mock first page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:file1',
              name: 'test.pdf',
              path_display: '/Documents/test.pdf',
              path_lower: '/documents/test.pdf',
              size: 1024,
              server_modified: '2026-01-01T00:00:00Z',
              client_modified: '2025-12-01T00:00:00Z',
              content_hash: 'abc123'
            }
          ],
          cursor: 'cursor1',
          has_more: true
        })
      });

      // Mock second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:file2',
              name: 'paper.docx',
              path_display: '/Academic/paper.docx',
              path_lower: '/academic/paper.docx',
              size: 2048,
              server_modified: '2026-01-02T00:00:00Z'
            }
          ],
          cursor: 'cursor2',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', { recursive: false })) {
        files.push(file);
      }

      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('test.pdf');
      expect(files[0].mimeType).toBe('application/pdf');
      expect(files[0].size).toBe(1024);
      expect(files[1].name).toBe('paper.docx');
      expect(files[1].mimeType).toContain('wordprocessingml');
    });

    it('should filter by maxFileSize', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:small',
              name: 'small.txt',
              path_display: '/small.txt',
              size: 100,
              server_modified: '2026-01-01T00:00:00Z'
            },
            {
              '.tag': 'file',
              id: 'id:large',
              name: 'large.pdf',
              path_display: '/large.pdf',
              size: 10000,
              server_modified: '2026-01-01T00:00:00Z'
            }
          ],
          cursor: '',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', {
        recursive: false,
        filters: { maxFileSize: 1000 }
      })) {
        files.push(file);
      }

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('small.txt');
    });

    it('should filter by excludePatterns', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:keep',
              name: 'keep.pdf',
              path_display: '/Documents/keep.pdf',
              size: 100,
              server_modified: '2026-01-01T00:00:00Z'
            },
            {
              '.tag': 'file',
              id: 'id:exclude',
              name: 'exclude.txt',
              path_display: '/Private/exclude.txt',
              size: 100,
              server_modified: '2026-01-01T00:00:00Z'
            }
          ],
          cursor: '',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', {
        recursive: false,
        filters: { excludePatterns: ['*/Private/*'] }
      })) {
        files.push(file);
      }

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('keep.pdf');
    });

    it('should skip deleted and folder entries', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:file',
              name: 'file.pdf',
              path_display: '/file.pdf',
              size: 100,
              server_modified: '2026-01-01T00:00:00Z'
            },
            {
              '.tag': 'folder',
              id: 'id:folder',
              name: 'folder',
              path_display: '/folder'
            },
            {
              '.tag': 'deleted',
              id: 'id:deleted',
              name: 'deleted.pdf'
            }
          ],
          cursor: '',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', { recursive: false })) {
        files.push(file);
      }

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('file.pdf');
    });
  });

  describe('getMetadata', () => {
    it('should fetch file metadata', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          '.tag': 'file',
          id: 'id:test',
          name: 'document.pdf',
          path_display: '/Academic/document.pdf',
          size: 5000,
          server_modified: '2026-01-01T12:00:00Z',
          client_modified: '2025-12-15T10:00:00Z',
          content_hash: 'hash123'
        })
      });

      const metadata = await provider.getMetadata('id:test');

      expect(metadata.name).toBe('document.pdf');
      expect(metadata.mimeType).toBe('application/pdf');
      expect(metadata.size).toBe(5000);
      expect(metadata.createdTime).toBe('2025-12-15T10:00:00Z');
      expect(metadata.checksum).toBe('hash123');
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status on success', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account_id: 'test-user' })
      });

      const health = await provider.checkHealth();

      expect(health.healthy).toBe(true);
      expect(health.provider).toBe('dropbox');
      expect(health.lastChecked).toBeDefined();
    });

    it('should return unhealthy status on API error', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const health = await provider.checkHealth();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('401');
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'old-token',
        refreshToken: 'refresh-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 14400
        })
      });

      await provider.refreshToken!();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.dropboxapi.com/oauth2/token',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should throw error without refresh token', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      await expect(provider.refreshToken!()).rejects.toThrow('No refresh token');
    });
  });

  describe('MIME type detection', () => {
    it('should detect common file types', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            { '.tag': 'file', id: '1', name: 'doc.pdf', path_display: '/doc.pdf', server_modified: '2026-01-01T00:00:00Z' },
            { '.tag': 'file', id: '2', name: 'img.jpg', path_display: '/img.jpg', server_modified: '2026-01-01T00:00:00Z' },
            { '.tag': 'file', id: '3', name: 'video.mp4', path_display: '/video.mp4', server_modified: '2026-01-01T00:00:00Z' },
            { '.tag': 'file', id: '4', name: 'audio.mp3', path_display: '/audio.mp3', server_modified: '2026-01-01T00:00:00Z' },
            { '.tag': 'file', id: '5', name: 'unknown.xyz', path_display: '/unknown.xyz', server_modified: '2026-01-01T00:00:00Z' }
          ],
          cursor: '',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', { recursive: false })) {
        files.push(file);
      }

      expect(files[0].mimeType).toBe('application/pdf');
      expect(files[1].mimeType).toBe('image/jpeg');
      expect(files[2].mimeType).toBe('video/mp4');
      expect(files[3].mimeType).toBe('audio/mpeg');
      expect(files[4].mimeType).toBe('application/octet-stream');
    });
  });

  describe('creation time preservation', () => {
    it('should use client_modified as creation time', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:1',
              name: 'old-file.pdf',
              path_display: '/old-file.pdf',
              server_modified: '2026-01-01T00:00:00Z',
              client_modified: '2020-01-01T00:00:00Z'
            }
          ],
          cursor: '',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', { recursive: false })) {
        files.push(file);
      }

      expect(files[0].createdTime).toBe('2020-01-01T00:00:00Z');
      expect(files[0].modifiedTime).toBe('2026-01-01T00:00:00Z');
    });

    it('should fallback to server_modified if client_modified is missing', async () => {
      const provider = new DropboxProvider({
        provider: 'dropbox',
        accessToken: 'test-token'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              '.tag': 'file',
              id: 'id:1',
              name: 'file.pdf',
              path_display: '/file.pdf',
              server_modified: '2026-01-01T00:00:00Z'
            }
          ],
          cursor: '',
          has_more: false
        })
      });

      const files: any[] = [];
      for await (const file of provider.listFiles('', { recursive: false })) {
        files.push(file);
      }

      expect(files[0].createdTime).toBe('2026-01-01T00:00:00Z');
    });
  });
});
