/**
 * Server-only exports for @in-midst-my-life/core
 *
 * This module exports functionality that requires server-only dependencies
 * like ssh2, smb2, and other native modules that don't work in browser/webpack environments.
 *
 * Usage:
 * - Server code (API, Orchestrator): import { ... } from '@in-midst-my-life/core/server'
 * - Client code (Web): import { ... } from '@in-midst-my-life/core' (no server-only exports)
 *
 * This separation prevents webpack from trying to bundle native modules into the web build.
 */

export * from './integrations/cloud-storage-provider';
export { LocalFilesystemProvider } from './integrations/local-fs-integration';
export { GoogleDriveProvider } from './integrations/google-drive-integration';
export { DropboxProvider } from './integrations/dropbox-integration';
export { iCloudProvider } from './integrations/icloud-integration';
export { createCloudStorageProvider } from './integrations/cloud-storage-provider';
