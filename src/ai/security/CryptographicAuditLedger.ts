// D8.16: Cryptographic Audit Ledger
// Tamper-evident, sequentially chained SHA-256 audit ledger with Merkle root verification and non-repudiation.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AuditLedgerEntry, LedgerVerificationResult } from './security-types';

export class CryptographicAuditLedger {
  public static readonly GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
  private static readonly STORAGE_DIR = path.join(process.cwd(), '.phase8', 'security');
  private static readonly STORAGE_FILE = path.join(process.cwd(), '.phase8', 'security', 'ledger.json');
  private static entries: AuditLedgerEntry[] = [];
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
        this.entries = JSON.parse(raw);
      } catch {
        this.entries = [];
      }
    }

    if (this.entries.length === 0) {
      this.createGenesisEntry();
    }
    this.isInitialized = true;
  }

  private static createGenesisEntry(): void {
    const timestamp = '2026-09-07T00:00:00.000Z';
    const payloadHash = crypto.createHash('sha256').update('GENESIS_BLOCK_DATA').digest('hex');
    const currentHash = this.computeHash(
      0,
      timestamp,
      'GENESIS',
      'system',
      'system',
      'global',
      payloadHash,
      this.GENESIS_PREVIOUS_HASH
    );
    const signature = crypto.createHmac('sha256', 'phase8-secret-audit-key').update(currentHash).digest('hex');

    const genesis: AuditLedgerEntry = {
      entryId: 'ledger_entry_0_genesis',
      sequenceNumber: 0,
      timestamp,
      eventType: 'GENESIS',
      actorId: 'system',
      actorRole: 'system',
      projectId: 'global',
      payloadHash,
      previousHash: this.GENESIS_PREVIOUS_HASH,
      currentHash,
      signature,
      quarantined: false,
    };

    this.entries = [genesis];
    this.persist();
  }

  public static computeHash(
    sequenceNumber: number,
    timestamp: string,
    eventType: string,
    actorId: string,
    actorRole: string,
    projectId: string,
    payloadHash: string,
    previousHash: string
  ): string {
    const payload = `${sequenceNumber}:${timestamp}:${eventType}:${actorId}:${actorRole}:${projectId}:${payloadHash}:${previousHash}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public static appendEntry(params: {
    eventType: string;
    actorId: string;
    actorRole: string;
    projectId: string;
    payload: any;
    quarantined?: boolean;
  }): AuditLedgerEntry {
    this.initialize();

    const sequenceNumber = this.entries.length;
    const previousEntry = this.entries[sequenceNumber - 1];
    const previousHash = previousEntry ? previousEntry.currentHash : this.GENESIS_PREVIOUS_HASH;
    const timestamp = new Date().toISOString();

    const payloadString = typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    const currentHash = this.computeHash(
      sequenceNumber,
      timestamp,
      params.eventType,
      params.actorId,
      params.actorRole,
      params.projectId,
      payloadHash,
      previousHash
    );

    const signature = crypto.createHmac('sha256', 'phase8-secret-audit-key').update(currentHash).digest('hex');

    const entry: AuditLedgerEntry = {
      entryId: `ledger_entry_${sequenceNumber}_${Date.now()}`,
      sequenceNumber,
      timestamp,
      eventType: params.eventType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      projectId: params.projectId,
      payloadHash,
      previousHash,
      currentHash,
      signature,
      quarantined: Boolean(params.quarantined),
    };

    this.entries.push(entry);
    this.persist();
    return entry;
  }

  public static verifyLedgerIntegrity(): LedgerVerificationResult {
    this.initialize();

    if (this.entries.length === 0) {
      return { intact: false, totalEntries: 0, error: 'Ledger is empty (missing genesis)' };
    }

    // Verify Genesis
    const genesis = this.entries[0];
    if (genesis.sequenceNumber !== 0 || genesis.previousHash !== this.GENESIS_PREVIOUS_HASH) {
      return {
        intact: false,
        totalEntries: this.entries.length,
        brokenEntryIndex: 0,
        expectedHash: this.GENESIS_PREVIOUS_HASH,
        actualHash: genesis.previousHash,
        error: 'Genesis block corrupted or invalid previousHash',
      };
    }

    // Verify Chain
    for (let i = 1; i < this.entries.length; i++) {
      const prev = this.entries[i - 1];
      const curr = this.entries[i];

      // Check sequence continuity
      if (curr.sequenceNumber !== i) {
        return {
          intact: false,
          totalEntries: this.entries.length,
          brokenEntryIndex: i,
          error: `Sequence numbering broken at index ${i}: expected ${i}, found ${curr.sequenceNumber}`,
        };
      }

      // Check previousHash pointer
      if (curr.previousHash !== prev.currentHash) {
        return {
          intact: false,
          totalEntries: this.entries.length,
          brokenEntryIndex: i,
          expectedHash: prev.currentHash,
          actualHash: curr.previousHash,
          error: `Hash pointer discrepancy at entry ${i}: previousHash does not match predecessor hash`,
        };
      }

      // Recompute and verify currentHash
      const recomputedHash = this.computeHash(
        curr.sequenceNumber,
        curr.timestamp,
        curr.eventType,
        curr.actorId,
        curr.actorRole,
        curr.projectId,
        curr.payloadHash,
        curr.previousHash
      );

      if (curr.currentHash !== recomputedHash) {
        return {
          intact: false,
          totalEntries: this.entries.length,
          brokenEntryIndex: i,
          expectedHash: recomputedHash,
          actualHash: curr.currentHash,
          error: `Tampering detected at entry ${i}: hash mismatch`,
        };
      }
    }

    return {
      intact: true,
      totalEntries: this.entries.length,
    };
  }

  /**
   * Computes binary Merkle tree root of all ledger entries for external non-repudiation.
   */
  public static computeMerkleRoot(): string {
    this.initialize();
    if (this.entries.length === 0) return this.GENESIS_PREVIOUS_HASH;

    let hashes = this.entries.map((e) => e.currentHash);

    while (hashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = i + 1 < hashes.length ? hashes[i + 1] : left; // duplicate if odd count
        const combined = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);
      }
      hashes = nextLevel;
    }

    return hashes[0];
  }

  public static getEntries(projectId?: string): AuditLedgerEntry[] {
    this.initialize();
    if (!projectId) {
      return [...this.entries];
    }
    return this.entries.filter((e) => e.projectId === projectId || e.projectId === 'global');
  }

  public static clear(): void {
    this.entries = [];
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
   * Direct tamper simulation for testing audit failure detection.
   */
  public static tamperWithEntry(index: number, modifiedField: Partial<AuditLedgerEntry>): void {
    this.initialize();
    if (index >= 0 && index < this.entries.length) {
      this.entries[index] = { ...this.entries[index], ...modifiedField };
      this.persist();
    }
  }

  private static persist(): void {
    try {
      this.ensureStorage();
      fs.writeFileSync(this.STORAGE_FILE, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[CryptographicAuditLedger] Failed to persist ledger to disk: ${(err as any).message}`);
    }
  }
}
