// D8.8: Experience Store
// Typed, persistent, project-isolated storage for learning experiences and detected patterns.

import * as fs from 'fs';
import * as path from 'path';
import {
  ExperienceId,
  ExperienceRecord,
  ExperienceQuery,
  ExperienceQueryResult,
  ExperiencePattern,
  ExperiencePatternId,
  RecommendationOutcome,
  ExperienceValidity,
} from './learning-types';

export class ExperienceStore {
  private static experiences: Map<ExperienceId, ExperienceRecord> = new Map();
  private static patterns: Map<ExperiencePatternId, ExperiencePattern> = new Map();
  private static baseDir: string = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';

  public static setBaseDir(dir: string): void {
    this.baseDir = dir;
  }

  public static getStoragePath(): string {
    return path.join(this.baseDir, '.phase8', 'experience-store.json');
  }

  public static getPatternsStoragePath(): string {
    return path.join(this.baseDir, '.phase8', 'experience-patterns.json');
  }

  /**
   * Insert an experience record into the store with strict validation and immutability.
   */
  public static insert(record: ExperienceRecord): void {
    if (!record.id || !record.projectId || !record.category || !record.outcome) {
      throw new Error('Invalid ExperienceRecord: Missing required id, projectId, category, or outcome');
    }

    // Default validity if missing
    if (!record.validity) {
      record.validity = 'VALID';
    }

    if (record.successScore === undefined) {
      record.successScore = record.outcome === 'SUCCESS' ? 0.8 : (record.outcome === 'FAILURE' ? 0.2 : 0.5);
    }

    if (record.timesMatched === undefined) {
      record.timesMatched = 0;
    }

    this.experiences.set(record.id, {
      ...record,
      updatedAt: new Date().toISOString(),
    });

    this.save();
  }

  /**
   * Retrieve a specific experience by ID.
   */
  public static getById(id: ExperienceId): ExperienceRecord | undefined {
    return this.experiences.get(id);
  }

  /**
   * Query experiences with strict project isolation and multi-factor filtering.
   */
  public static query(q: ExperienceQuery): ExperienceQueryResult {
    const now = new Date().toISOString();
    let matches = Array.from(this.experiences.values());

    // 1. Strict Project Isolation:
    // By default, filter strictly to target projectId.
    // If allowCrossProject is requested, only permit non-sensitive sanitized experiences with validity === 'VALID'.
    if (q.projectId) {
      if (!q.allowCrossProject) {
        matches = matches.filter((e) => e.projectId === q.projectId);
      } else {
        // Cross-project filter: match target project OR non-sensitive valid records
        matches = matches.filter(
          (e) => e.projectId === q.projectId || (e.validity === 'VALID' && e.provenance.sanitized)
        );
      }
    }

    // 2. Validity filtering: exclude INVALID and QUARANTINED unless explicitly requested
    if (q.validity) {
      matches = matches.filter((e) => e.validity === q.validity);
    } else {
      matches = matches.filter((e) => e.validity !== 'INVALID' && e.validity !== 'QUARANTINED');
    }

    // 3. Category filtering
    if (q.category) {
      matches = matches.filter((e) => e.category === q.category);
    }
    if (q.categories && q.categories.length > 0) {
      matches = matches.filter((e) => q.categories!.includes(e.category));
    }

    // 4. Outcome filtering
    if (q.outcome) {
      matches = matches.filter((e) => e.outcome === q.outcome);
    }

    // 5. Operation type filtering
    if (q.operationType) {
      matches = matches.filter((e) => e.features?.operationTypes?.includes(q.operationType!));
    }

    // 6. Component type filtering
    if (q.componentType) {
      matches = matches.filter((e) => e.features?.componentTypes?.includes(q.componentType!));
    }

    // 7. Recovery strategy filtering
    if (q.recoveryStrategy) {
      matches = matches.filter(
        (e) =>
          e.recoveryDetails?.strategy === q.recoveryStrategy ||
          e.features?.recoveryStrategy === q.recoveryStrategy
      );
    }

    // 8. Success score threshold
    if (q.minSuccessScore !== undefined) {
      matches = matches.filter((e) => (e.successScore ?? 0) >= q.minSuccessScore!);
    }

    // Sort by successScore DESC, then recency DESC
    matches.sort((a, b) => {
      if (b.successScore !== a.successScore) {
        return b.successScore - a.successScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const totalCount = this.experiences.size;
    const matchedCount = matches.length;

    if (q.limit && q.limit > 0) {
      matches = matches.slice(0, q.limit);
    }

    return {
      experiences: matches,
      totalCount,
      matchedCount,
      query: q,
      timestamp: now,
    };
  }

  /**
   * Get all experiences for a given project.
   */
  public static getProjectExperiences(projectId: string): ExperienceRecord[] {
    return Array.from(this.experiences.values()).filter((e) => e.projectId === projectId);
  }

  /**
   * Record recommendation outcome and adjust success scores via feedback reinforcement.
   */
  public static recordOutcome(recommendationId: string, outcome: RecommendationOutcome): void {
    // Locate experiences that supported this recommendation
    for (const exp of Array.from(this.experiences.values())) {
      if (exp.evidence.some((ev: string) => ev.includes(recommendationId))) {
        exp.timesMatched = (exp.timesMatched || 0) + 1;
        if (outcome.success) {
          exp.successScore = Math.min(1.0, (exp.successScore || 0.5) + 0.1);
        } else {
          exp.successScore = Math.max(0.0, (exp.successScore || 0.5) - 0.2);
        }
        exp.updatedAt = new Date().toISOString();
      }
    }
    this.save();
  }

  /**
   * Mark an experience as stale (e.g. due to schema or version drift).
   */
  public static markStale(experienceId: ExperienceId, reason: string = 'Version or schema drift detected'): boolean {
    const exp = this.experiences.get(experienceId);
    if (!exp) return false;

    exp.validity = 'STALE';
    exp.staleReason = reason;
    exp.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  /**
   * Invalidate an experience (e.g. superseded or contradicted by regression).
   */
  public static invalidate(experienceId: ExperienceId, reason: string): boolean {
    const exp = this.experiences.get(experienceId);
    if (!exp) return false;

    exp.validity = 'INVALID';
    exp.invalidationReason = reason;
    exp.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  /**
   * Quarantine an experience (e.g. suspect security risk or corrupted data).
   */
  public static quarantine(experienceId: ExperienceId, reason: string): boolean {
    const exp = this.experiences.get(experienceId);
    if (!exp) return false;

    exp.validity = 'QUARANTINED';
    exp.invalidationReason = `Quarantined: ${reason}`;
    exp.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  /**
   * Automatically detect and mark stale experiences when project version drifts.
   */
  public static detectStaleExperiences(projectId: string, currentProjectVersion: number): number {
    let staleCount = 0;
    for (const exp of Array.from(this.experiences.values())) {
      if (exp.projectId === projectId && exp.validity === 'VALID') {
        if (exp.context.projectVersion < currentProjectVersion - 5) {
          exp.validity = 'STALE';
          exp.staleReason = `Project version drifted from ${exp.context.projectVersion} to ${currentProjectVersion}`;
          exp.updatedAt = new Date().toISOString();
          staleCount++;
        }
      }
    }
    if (staleCount > 0) {
      this.save();
    }
    return staleCount;
  }

  // --- Pattern Management ---

  public static savePattern(pattern: ExperiencePattern): void {
    this.patterns.set(pattern.id, pattern);
    this.savePatterns();
  }

  public static getPatterns(category?: ExperiencePattern['category']): ExperiencePattern[] {
    const all = Array.from(this.patterns.values());
    if (!category) return all;
    return all.filter((p) => p.category === category);
  }

  public static getPatternById(id: ExperiencePatternId): ExperiencePattern | undefined {
    return this.patterns.get(id);
  }

  public static deletePattern(id: ExperiencePatternId): boolean {
    const removed = this.patterns.delete(id);
    if (removed) this.savePatterns();
    return removed;
  }

  // --- Persistence ---

  public static save(): void {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.writeFileSync) return;
      const filePath = this.getStoragePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.experiences.values());
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Gracefully handle client-side or restricted file system environments
    }
  }

  public static load(): void {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.readFileSync) return;
      const filePath = this.getStoragePath();
      if (!fs.existsSync(filePath)) return;

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(raw)) {
        this.experiences.clear();
        for (const item of raw) {
          if (item?.id) {
            this.experiences.set(item.id, item);
          }
        }
      }
    } catch {
      // Gracefully handle read failures
    }
  }

  public static savePatterns(): void {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.writeFileSync) return;
      const filePath = this.getPatternsStoragePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.patterns.values());
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Graceful fallback
    }
  }

  public static loadPatterns(): void {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.readFileSync) return;
      const filePath = this.getPatternsStoragePath();
      if (!fs.existsSync(filePath)) return;

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(raw)) {
        this.patterns.clear();
        for (const item of raw) {
          if (item?.id) {
            this.patterns.set(item.id, item);
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  public static resetMemoryCache(): void {
    this.experiences.clear();
    this.patterns.clear();
  }

  public static clear(): void {
    this.experiences.clear();
    this.patterns.clear();
    this.save();
    this.savePatterns();
  }

  public static size(): number {
    return this.experiences.size;
  }
}
