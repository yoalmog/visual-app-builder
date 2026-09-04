/**
 * Phase 5: StorageProvider Interface and MockStorageProvider
 *
 * File upload/management abstraction.
 * In production this would proxy to Supabase Storage via /api/storage.
 * The mock implementation handles files in-memory for testing and local preview.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StorageVisibility = 'public' | 'private';

export interface StorageUploadOptions {
  visibility?: StorageVisibility;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  onProgress?: (percent: number) => void;
}

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface StorageDeleteResult {
  success: boolean;
  error?: string;
}

export interface StorageGetUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface StorageProvider {
  upload(file: File | Blob, path: string, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(path: string): Promise<StorageDeleteResult>;
  getUrl(path: string): Promise<string | StorageGetUrlResult>;
}

// ─── MockStorageProvider ──────────────────────────────────────────────────────

const DISALLOWED_MIME_PATTERNS = [
  'msdownload',
  'executable',
  'dosexec',
  'x-sh',
  'x-bat',
  'x-cmd',
];

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/pdf',
];
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export class MockStorageProvider implements StorageProvider {
  private store: Map<string, { url: string; mimeType: string; sizeBytes: number; visibility: StorageVisibility }> = new Map();
  private baseUrl: string;

  constructor(baseUrl = 'mock://storage') {
    this.baseUrl = baseUrl;
  }

  async upload(file: File | Blob, path: string, options?: StorageUploadOptions): Promise<StorageUploadResult> {
    const maxSize = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    const allowedTypes = options?.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;

    if (file.size > maxSize) {
      return { success: false, error: `File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB` };
    }

    const mimeType = file.type || 'application/octet-stream';
    if (DISALLOWED_MIME_PATTERNS.some((p) => mimeType.includes(p)) || path.endsWith('.exe') || path.endsWith('.bat')) {
      return { success: false, error: `File type '${mimeType}' is not allowed for security reasons` };
    }

    if (options?.allowedMimeTypes && options.allowedMimeTypes.length > 0 && !allowedTypes.includes(mimeType)) {
      return { success: false, error: `File type '${mimeType}' is not allowed` };
    }

    // Simulate progress
    if (options?.onProgress) {
      options.onProgress(50);
      options.onProgress(100);
    }

    const url = `${this.baseUrl}/${path}`;
    this.store.set(path, {
      url,
      mimeType,
      sizeBytes: file.size,
      visibility: options?.visibility ?? 'public',
    });

    return { success: true, url, path };
  }

  async delete(path: string): Promise<StorageDeleteResult> {
    this.store.delete(path);
    return { success: true };
  }

  async getUrl(path: string): Promise<any> {
    const entry = this.store.get(path);
    return entry ? entry.url : `${this.baseUrl}/${path}`;
  }

  /** For test introspection */
  getStoredFiles(): Map<string, { url: string; mimeType: string; sizeBytes: number; visibility: StorageVisibility }> {
    return this.store;
  }
}

export const mockStorageProvider = new MockStorageProvider();
