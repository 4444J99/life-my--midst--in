import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GoogleDriveProvider } from '../../src/integrations/google-drive-integration';
import { google } from 'googleapis';
import { Readable, PassThrough } from 'stream';
import * as fs from 'fs';

// Mock googleapis
vi.mock('googleapis', () => {
  const mDrive = {
    files: {
      list: vi.fn(),
      get: vi.fn(),
    },
    about: {
      get: vi.fn(),
    },
  };
  const mAuth = {
    setCredentials: vi.fn(),
  };
  return {
    google: {
      drive: vi.fn(() => mDrive),
      auth: {
        OAuth2: vi.fn().mockImplementation(function () {
          return mAuth;
        }),
      },
    },
  };
});

// Mock fs
vi.mock('fs', () => {
  return {
    createWriteStream: vi.fn().mockImplementation(() => {
      const pt = new PassThrough();
      // Mock close as PassThrough doesn't have it exactly like WriteStream (which emits close)
      // But for pipe it should be fine.
      // We can add a 'close' method if needed.
      (pt as any).close = vi.fn();
      return pt;
    }),
  };
});

describe('GoogleDriveProvider', () => {
  let provider: GoogleDriveProvider;
  const mockDrive = google.drive({} as any) as any;
  const mockAuth = new google.auth.OAuth2() as any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GoogleDriveProvider({
      provider: 'google_drive',
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      clientId: 'mock_client_id',
      clientSecret: 'mock_client_secret',
    });
  });

  it('should authenticate and set credentials', async () => {
    await provider.authenticate({
      provider: 'google_drive',
      accessToken: 'new_token',
    });
    // Implementation uses checkHealth to verify
    expect(mockDrive.about.get).toHaveBeenCalled();
  });

  it('should list files with pagination', async () => {
    mockDrive.files.list.mockResolvedValueOnce({
      data: {
        files: [{ id: '1', name: 'file1.txt', mimeType: 'text/plain', size: '100' }],
        nextPageToken: 'next_page',
      },
    });
    mockDrive.files.list.mockResolvedValueOnce({
      data: {
        files: [{ id: '2', name: 'file2.txt', mimeType: 'text/plain', size: '200' }],
      },
    });

    const iterator = provider.listFiles('root');
    const files = [];
    for await (const file of iterator) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    expect(files[0].fileId).toBe('1');
    expect(files[1].fileId).toBe('2');
    expect(mockDrive.files.list).toHaveBeenCalledTimes(2);
  });

  it('should filter by maxFileSize', async () => {
    mockDrive.files.list.mockResolvedValue({
      data: { files: [] },
    });

    const iterator = provider.listFiles('root', {
      filters: { maxFileSize: 1000 },
    });
    await iterator.next();

    const callArgs = mockDrive.files.list.mock.calls[0][0];
    expect(callArgs.q).toContain('size <= 1000');
  });

  it('should stream download file', async () => {
    const mockStream = new Readable();
    mockStream.push('content');
    mockStream.push(null);

    mockDrive.files.get.mockResolvedValue({
      data: mockStream,
    });

    // We mocked fs above to return PassThrough

    await provider.downloadFile('file_id', '/tmp/test');

    expect(mockDrive.files.get).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'file_id', alt: 'media' }),
      expect.objectContaining({ responseType: 'stream' }),
    );
  });

  it('should get metadata', async () => {
    mockDrive.files.get.mockResolvedValue({
      data: {
        id: '1',
        name: 'test',
        mimeType: 'text/plain',
        size: '123',
        createdTime: '2023-01-01T00:00:00Z',
      },
    });

    const meta = await provider.getMetadata('1');
    expect(meta.fileId).toBe('1');
    expect(meta.name).toBe('test');
  });

  it('should check health', async () => {
    mockDrive.about.get.mockResolvedValue({ data: { user: {} } });
    const health = await provider.checkHealth();
    expect(health.healthy).toBe(true);
  });
});
