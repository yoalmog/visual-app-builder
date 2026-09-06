import {
  ApiKey,
  ServiceAccount,
  ImmutableAuditLogEntry,
  SecurityEvent,
  SecurityEventType,
} from '../../schema/platform';

// ─── 1. API Key Manager ───────────────────────────────────────────────────────

export class ApiKeyManager {
  private apiKeys: Map<string, ApiKey> = new Map();

  async createApiKey(params: {
    organizationId: string;
    projectId?: string;
    name: string;
    scopes: string[];
    expiresInDays?: number;
  }): Promise<{ apiKey: ApiKey; rawSecret: string }> {
    const id = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomHex = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const prefix = `ak_live_${randomHex.slice(0, 8)}`;
    const rawSecret = `${prefix}_${randomHex}`;

    // Simple deterministic hash simulation for in-memory security
    const hashedSecret = `hash_${rawSecret.split('').reverse().join('')}`;

    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 3600 * 1000).toISOString()
      : undefined;

    const apiKey: ApiKey = {
      id,
      organizationId: params.organizationId,
      projectId: params.projectId,
      name: params.name,
      prefix,
      hashedSecret,
      scopes: params.scopes,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    this.apiKeys.set(id, apiKey);

    // Record audit event
    await defaultAuditLogger.log({
      organizationId: params.organizationId,
      projectId: params.projectId,
      actorId: 'admin',
      actorType: 'user',
      action: 'api_key:created',
      resourceType: 'api_key',
      resourceId: id,
      metadata: { name: params.name, prefix, scopes: params.scopes },
      ipHash: 'local',
      status: 'SUCCESS',
    });

    return { apiKey, rawSecret };
  }

  async revokeApiKey(keyId: string, revokedBy: string): Promise<boolean> {
    const key = this.apiKeys.get(keyId);
    if (!key) return false;

    key.revokedAt = new Date().toISOString();
    key.revokedBy = revokedBy;

    await defaultAuditLogger.log({
      organizationId: key.organizationId,
      projectId: key.projectId,
      actorId: revokedBy,
      actorType: 'user',
      action: 'api_key:revoked',
      resourceType: 'api_key',
      resourceId: keyId,
      ipHash: 'local',
      status: 'SUCCESS',
    });

    return true;
  }

  async validateKey(rawSecret: string, requiredScope: string): Promise<ApiKey | null> {
    const expectedHash = `hash_${rawSecret.split('').reverse().join('')}`;
    for (const key of Array.from(this.apiKeys.values())) {
      if (key.hashedSecret === expectedHash && !key.revokedAt) {
        if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) {
          return null; // Expired
        }
        if (key.scopes.includes('*') || key.scopes.includes(requiredScope)) {
          key.lastUsedAt = new Date().toISOString();
          return key;
        }
      }
    }
    return null;
  }

  async listApiKeys(orgId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter((k) => k.organizationId === orgId);
  }
}

export const defaultApiKeyManager = new ApiKeyManager();

// ─── 2. Service Account Manager ───────────────────────────────────────────────

export class ServiceAccountManager {
  private accounts: Map<string, ServiceAccount> = new Map();

  async createServiceAccount(params: {
    organizationId: string;
    name: string;
    description?: string;
    scopes: string[];
  }): Promise<ServiceAccount> {
    const id = `sa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sa: ServiceAccount = {
      id,
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      scopes: params.scopes,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.accounts.set(id, sa);

    await defaultAuditLogger.log({
      organizationId: params.organizationId,
      actorId: 'admin',
      actorType: 'user',
      action: 'service_account:created',
      resourceType: 'service_account',
      resourceId: id,
      metadata: { name: params.name, scopes: params.scopes },
      ipHash: 'local',
      status: 'SUCCESS',
    });

    return sa;
  }

  async listServiceAccounts(orgId: string): Promise<ServiceAccount[]> {
    return Array.from(this.accounts.values()).filter((s) => s.organizationId === orgId);
  }

  async deleteServiceAccount(id: string): Promise<boolean> {
    return this.accounts.delete(id);
  }
}

export const defaultServiceAccountManager = new ServiceAccountManager();

// ─── 3. Immutable Audit Logger ────────────────────────────────────────────────

export class AuditLogger {
  private logs: ImmutableAuditLogEntry[] = [];

  async log(params: Omit<ImmutableAuditLogEntry, 'id' | 'createdAt'>): Promise<ImmutableAuditLogEntry> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanMeta = this.redactSecrets(params.metadata);

    const entry: ImmutableAuditLogEntry = {
      ...params,
      id,
      metadata: cleanMeta,
      createdAt: new Date().toISOString(),
    };

    this.logs.push(entry);
    return entry;
  }

  async query(filter?: {
    organizationId?: string;
    projectId?: string;
    actorId?: string;
    action?: string;
  }): Promise<ImmutableAuditLogEntry[]> {
    let list = [...this.logs];
    if (filter?.organizationId) list = list.filter((l) => l.organizationId === filter.organizationId);
    if (filter?.projectId) list = list.filter((l) => l.projectId === filter.projectId);
    if (filter?.actorId) list = list.filter((l) => l.actorId === filter.actorId);
    if (filter?.action) list = list.filter((l) => l.action.includes(filter.action!));

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private redactSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const clean: any = Array.isArray(obj) ? [] : {};
    const secretKeys = ['password', 'secret', 'token', 'apikey', 'key', 'auth'];

    for (const [k, v] of Object.entries(obj)) {
      if (secretKeys.some((s) => k.toLowerCase().includes(s))) {
        clean[k] = '[REDACTED]';
      } else if (typeof v === 'object') {
        clean[k] = this.redactSecrets(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
}

export const defaultAuditLogger = new AuditLogger();

// ─── 4. Security Event Tracker ────────────────────────────────────────────────

export class SecurityEventTracker {
  private events: SecurityEvent[] = [];

  recordEvent(params: {
    organizationId?: string;
    projectId?: string;
    type: SecurityEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    ipHash?: string;
  }): SecurityEvent {
    const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: SecurityEvent = {
      id,
      organizationId: params.organizationId,
      projectId: params.projectId,
      type: params.type,
      severity: params.severity,
      details: params.details,
      ipHash: params.ipHash || 'unknown',
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    return event;
  }

  listEvents(severity?: SecurityEvent['severity']): SecurityEvent[] {
    let list = [...this.events];
    if (severity) list = list.filter((e) => e.severity === severity);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const defaultSecurityEventTracker = new SecurityEventTracker();

// ─── 5. Rate Limiter ──────────────────────────────────────────────────────────

export class RateLimiter {
  private requestLog: Map<string, number[]> = new Map(); // key -> timestamps[]

  checkLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const timestamps = (this.requestLog.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0];
      const resetMs = windowMs - (now - oldest);
      return { allowed: false, remaining: 0, resetMs };
    }

    timestamps.push(now);
    this.requestLog.set(key, timestamps);
    return { allowed: true, remaining: limit - timestamps.length, resetMs: windowMs };
  }
}

export const defaultRateLimiter = new RateLimiter();

// ─── 6. Observability ─────────────────────────────────────────────────────────

export interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
}

export interface TraceSpan {
  id: string;
  name: string;
  durationMs: number;
  status: 'ok' | 'error';
  timestamp: string;
}

export class PlatformObservability {
  private metrics: MetricPoint[] = [];
  private traces: TraceSpan[] = [];
  private errorReports: Array<{ message: string; stack?: string; context?: Record<string, any>; timestamp: string }> = [];

  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  recordTrace(name: string, durationMs: number, status: 'ok' | 'error' = 'ok') {
    this.traces.push({
      id: `span_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      durationMs,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  reportError(message: string, context?: Record<string, any>, stack?: string) {
    this.errorReports.push({
      message,
      context,
      stack,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics(name?: string): MetricPoint[] {
    if (name) return this.metrics.filter((m) => m.name === name);
    return [...this.metrics];
  }

  getTraces(): TraceSpan[] {
    return [...this.traces];
  }

  getErrors() {
    return [...this.errorReports];
  }
}

export const defaultPlatformObservability = new PlatformObservability();
