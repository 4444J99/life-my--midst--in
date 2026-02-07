/**
 * Minimal type declarations for the `smb2` package.
 * Only the subset used by LocalFilesystemProvider is declared here.
 */
declare module 'smb2' {
  interface SMB2Options {
    share: string;
    domain?: string;
    username?: string;
    password?: string;
    port?: number;
    packetConcurrency?: number;
    autoCloseTimeout?: number;
  }

  interface SMB2Stats {
    isDirectory(): boolean;
    size: number;
    birthtime: Date;
    mtime: Date;
  }

  class SMB2 {
    constructor(options: SMB2Options);
    readdir(path: string): Promise<string[]>;
    readFile(path: string): Promise<Buffer>;
    createReadStream(path: string): NodeJS.ReadableStream;
    stat(path: string): Promise<SMB2Stats>;
    writeFile(path: string, data: Buffer | string, callback: (err?: Error) => void): void;
    close(): void;
  }

  export default SMB2;
}
