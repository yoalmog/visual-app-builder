// D8.17: Intelligent Cache Engine
// Multi-tier LRU memory cache with entity-aware mutation invalidation, TTL expiration, and disk snapshot persistence.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { CacheEntry, CacheStats } from './performance-types';

export class IntelligentCacheEngine {
  private static readonly STORAGE_DIR = path.join(process.cwd(), '.phase8', 'performance');
  private static readonly STORAGE_FILE = path.join(process.cwd(), '.phase8', 'performance', 'cache.json');
  private static readonly DEFAULT_MAX_ENTRIES = 500;
  private static readonly DEFAULT_TTL_MS = 1000 * 60 * 30; // 30 minutes

  private static cache: Map<string, CacheEntry> = new Map();
  private static hits = 0;
  private static misses = 0;
  private static evictions = 0;
  private static isInitialized = false;

  private static ensureStorage(): void {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  public static initialize(): void {
    if (this.isInitialized) return;
    this.ensureStorage();

    if (fs.existsSync(this.STORAGE_FILE)) {
      try {
        const raw = fs.readFileSync(this.STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            if (entry && entry.expiresAt > now) {
              this.cache.set(entry.key, entry);
            }
          }
        }
      } catch {
        this.cache.clear();
      }
    }
    this.isInitialized = true;
  }

  /**
   * Generates a deterministic hash key from input string or object.
   */
  public static computeKey(namespace: string, payload: any): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 24);
    return `${namespace}:${hash}`;
  }

  /**
   * Retrieves an item from cache if present and unexpired. Updates LRU position and hit count.
   */
  public static get<T = any>(key: string): T | undefined {
    this.initialize();
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update hits and LRU order (delete & re-insert)
    entry.hits++;
    this.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  /**
   * Stores an item in cache with TTL and optional tag. Enforces LRU capacity limits.
   */
  public static set<T = any>(
    key: string,
    value: T,
    options?: { ttlMs?: number; tag?: string; maxEntries?: number }
  ): void {
    this.initialize();
    const ttlMs = options?.ttlMs ?? this.DEFAULT_TTL_MS;
    const maxEntries = options?.maxEntries ?? this.DEFAULT_MAX_ENTRIES;
    const now = Date.now();

    // Evict oldest if capacity exceeded
    if (this.cache.size >= maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(serialized, 'utf-8');

    const entry: CacheEntry<T> = {
      key,
      value,
      sizeBytes,
      createdAt: now,
      expiresAt: now + ttlMs,
      hits: 0,
      ttlMs,
      tag: options?.tag,
    };

    // If key already exists, delete first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, entry);
    this.persistDebounced();
  }

  public static has(key: string): boolean {
    this.initialize();
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  public static invalidate(key: string): boolean {
    this.initialize();
    const deleted = this.cache.delete(key);
    if (deleted) this.persistDebounced();
    return deleted;
  }

  /**
   * Invalidates all entries matching a specific tag (e.g. "project:proj_123" or "ast_validation").
   */
  public static invalidateByTag(tag: string): number {
    this.initialize();
    let count = 0;
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, k) => {
      if (entry.tag === tag || (entry.tag && entry.tag.startsWith(tag))) {
        keysToDelete.push(k);
      }
    });
    for (const k of keysToDelete) {
      this.cache.delete(k);
      count++;
    }
    if (count > 0) this.persistDebounced();
    return count;
  }

  public static getStats(): CacheStats {
    this.initialize();
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests === 0 ? 0.0 : Math.round((this.hits / totalRequests) * 1000) / 1000;

    let totalMemory = 0;
    this.cache.forEach((entry) => {
      totalMemory += entry.sizeBytes;
    });

    return {
      totalEntries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      memoryUsedBytes: totalMemory,
      evictions: this.evictions,
    };
  }

  public static clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.isInitialized = false;
    this.ensureStorage();
    if (fs.existsSync(this.STORAGE_FILE)) {
      try {
        fs.unlinkSync(this.STORAGE_FILE);
      } catch {}
    }
    this.initialize();
  }

  /**
   * Resets in-memory cache without removing disk snapshot, simulating process restart.
   */
  public static resetMemoryOnly(): void {
    this.cache.clear();
    this.isInitialized = false;
  }

  public static isMemoryInitialized(): boolean {
    return this.isInitialized;
  }

  private static persistTimeout: NodeJS.Timeout | null = null;
  private static persistDebounced(): void {
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(() => {
      this.persistToDisk();
    }, 500);
  }

  public static persistToDisk(): void {
    try {
      this.ensureStorage();
      const entries: CacheEntry<any>[] = [];
      this.cache.forEach((e) => {
        if (e.expiresAt > Date.now()) {
          entries.push(e);
        }
      });
      fs.writeFileSync(this.STORAGE_FILE, JSON.stringify(entries, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[IntelligentCacheEngine] Cache snapshot persistence failed: ${(err as any).message}`);
    }
  }
}
