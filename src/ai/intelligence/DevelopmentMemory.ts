// D8.12: Development Memory
// Scoped, versioned, auditable project memory storing conventions, successful patterns, and recovery history.

import * as fs from 'fs';
import * as path from 'path';
import { DevelopmentMemoryEntry } from './types';

export class DevelopmentMemory {
  private static entries: Map<string, DevelopmentMemoryEntry> = new Map();
  private static baseDir: string = process.cwd();

  public static setBaseDir(dir: string): void {
    this.baseDir = dir;
  }

  public static getMemoryPath(): string {
    return path.join(this.baseDir, '.phase8', 'memory.json');
  }

  public static addEntry(data: {
    key: string;
    category: DevelopmentMemoryEntry['category'];
    content: string;
  }): DevelopmentMemoryEntry {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const entry: DevelopmentMemoryEntry = {
      id,
      key: data.key,
      category: data.category,
      content: data.content,
      timesReferenced: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.entries.set(id, entry);
    this.save();
    return entry;
  }

  public static getEntries(category?: DevelopmentMemoryEntry['category']): DevelopmentMemoryEntry[] {
    const all = Array.from(this.entries.values());
    if (!category) return all;
    return all.filter((e) => e.category === category);
  }

  public static findByKey(key: string): DevelopmentMemoryEntry | undefined {
    return Array.from(this.entries.values()).find((e) => e.key === key);
  }

  public static deleteEntry(id: string): boolean {
    const removed = this.entries.delete(id);
    if (removed) this.save();
    return removed;
  }

  public static save(): void {
    const memPath = this.getMemoryPath();
    const dir = path.dirname(memPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(this.entries.values());
    fs.writeFileSync(memPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  public static load(): void {
    const memPath = this.getMemoryPath();
    if (!fs.existsSync(memPath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
      if (Array.isArray(raw)) {
        this.entries.clear();
        for (const item of raw) {
          this.entries.set(item.id, item);
        }
      }
    } catch {
      // Graceful load fallback
    }
  }

  public static clear(): void {
    this.entries.clear();
    this.save();
  }
}
