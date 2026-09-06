// D8.18: Concurrency & Idempotency Manager
// Prevents race conditions and guarantees idempotency across concurrent operations and resumes.

export interface LockEntry {
  resourceId: string;
  holderId: string;
  expiresAt: number;
}

export class ConcurrencyManager {
  private static locks: Map<string, LockEntry> = new Map();
  private static idempotencyStore: Map<string, { result: any; timestamp: number }> = new Map();

  /**
   * Attempts to acquire an exclusive lock on a resource.
   */
  public static acquireLock(resourceId: string, holderId: string, ttlMs: number = 30000): boolean {
    const now = Date.now();
    const existing = this.locks.get(resourceId);

    if (existing && existing.expiresAt > now) {
      if (existing.holderId === holderId) {
        // Re-entrant lock extension
        existing.expiresAt = now + ttlMs;
        return true;
      }
      return false; // Locked by another actor
    }

    this.locks.set(resourceId, {
      resourceId,
      holderId,
      expiresAt: now + ttlMs,
    });
    return true;
  }

  /**
   * Releases a held lock.
   */
  public static releaseLock(resourceId: string, holderId: string): boolean {
    const existing = this.locks.get(resourceId);
    if (!existing) return true;

    if (existing.holderId === holderId || existing.expiresAt <= Date.now()) {
      this.locks.delete(resourceId);
      return true;
    }
    return false;
  }

  public static isLocked(resourceId: string): boolean {
    const existing = this.locks.get(resourceId);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(resourceId);
      return false;
    }
    return true;
  }

  /**
   * Stores the result of an operation for idempotency caching.
   */
  public static recordIdempotency(key: string, result: any): void {
    this.idempotencyStore.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves previous result if operation with key was already completed.
   */
  public static getIdempotentResult<T = any>(key: string): T | undefined {
    const entry = this.idempotencyStore.get(key);
    return entry ? (entry.result as T) : undefined;
  }

  public static clear(): void {
    this.locks.clear();
    this.idempotencyStore.clear();
  }
}
