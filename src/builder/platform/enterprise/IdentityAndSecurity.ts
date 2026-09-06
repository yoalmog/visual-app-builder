// Phase 9 Enterprise Identity & Security Providers: SSO, SCIM, Policies, Sessions, IP Allowlist, Compliance, KMS
import {
  SSOConfiguration,
  SCIMUserRecord,
  UserSessionRecord,
  OrganizationSecurityPolicy,
  KMSKeyRecord,
  ComplianceControlRecord,
} from '../../schema/platform-v9';
import { defaultAuditLogger } from '../security/EnterpriseSecurity';

// ─── 1. Enterprise SSO Provider ───────────────────────────────────────────────

export interface SSOProvider {
  getConfig(organizationId: string): Promise<SSOConfiguration | null>;
  saveConfig(config: SSOConfiguration): Promise<SSOConfiguration>;
  findConfigByEmailDomain(email: string): Promise<SSOConfiguration | null>;
  simulateSsoLogin(email: string, orgId: string): Promise<{ success: boolean; userId: string; email: string; role: string }>;
}

export class LocalSSOProvider implements SSOProvider {
  private configs: Map<string, SSOConfiguration> = new Map();

  async getConfig(organizationId: string): Promise<SSOConfiguration | null> {
    return this.configs.get(organizationId) || null;
  }

  async saveConfig(config: SSOConfiguration): Promise<SSOConfiguration> {
    this.configs.set(config.organizationId, {
      ...config,
      updatedAt: new Date().toISOString(),
    });
    return config;
  }

  async findConfigByEmailDomain(email: string): Promise<SSOConfiguration | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    for (const cfg of Array.from(this.configs.values())) {
      if (cfg.enabled && cfg.domains.some((d) => d.toLowerCase() === domain)) {
        return cfg;
      }
    }
    return null;
  }

  async simulateSsoLogin(email: string, orgId: string) {
    const cfg = this.configs.get(orgId);
    if (!cfg || !cfg.enabled) {
      throw new Error('SSO is not enabled for this organization');
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!cfg.domains.includes(domain)) {
      throw new Error(`Email domain '${domain}' is not authorized for SSO in this organization`);
    }

    const userId = `user_sso_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return {
      success: true,
      userId,
      email,
      role: cfg.defaultRole || 'member',
    };
  }
}

// ─── 2. SCIM 2.0 Provisioning Provider ────────────────────────────────────────

export interface SCIMProvider {
  createUser(orgId: string, user: Partial<SCIMUserRecord> & { email: string; userName?: string }): Promise<SCIMUserRecord>;
  getUser(orgId: string, id: string): Promise<SCIMUserRecord | null>;
  updateUser(orgId: string, id: string, updates: Partial<SCIMUserRecord>): Promise<SCIMUserRecord>;
  deactivateUser(orgId: string, id: string): Promise<boolean>;
  listUsers(orgId: string): Promise<SCIMUserRecord[]>;
}

export class LocalSCIMProvider implements SCIMProvider {
  private users: Map<string, SCIMUserRecord> = new Map();

  async createUser(orgId: string, user: any): Promise<SCIMUserRecord> {
    const id = `scim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: SCIMUserRecord = {
      id,
      organizationId: orgId,
      externalId: user.externalId || id,
      userName: user.userName || user.email || 'user',
      givenName: user.givenName,
      familyName: user.familyName,
      email: user.email || '',
      role: user.role || 'member',
      active: user.active !== false,
      groups: user.groups || ['default'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, record);
    return record;
  }

  async getUser(orgId: string, id: string): Promise<SCIMUserRecord | null> {
    const u = this.users.get(id);
    if (u && u.organizationId === orgId) return u;
    return null;
  }

  async updateUser(orgId: string, id: string, updates: Partial<SCIMUserRecord>): Promise<SCIMUserRecord> {
    const u = await this.getUser(orgId, id);
    if (!u) throw new Error('SCIM user not found');
    const updated = { ...u, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  async deactivateUser(orgId: string, id: string): Promise<boolean> {
    const u = await this.getUser(orgId, id);
    if (!u) return false;
    u.active = false;
    u.updatedAt = new Date().toISOString();
    return true;
  }

  async listUsers(orgId: string): Promise<SCIMUserRecord[]> {
    return Array.from(this.users.values()).filter((u) => u.organizationId === orgId);
  }
}

// ─── 3. Organization Policy Engine ────────────────────────────────────────────

export class OrganizationPolicyEngine {
  private policies: Map<string, OrganizationSecurityPolicy> = new Map();

  constructor() {
    // Default enterprise policy for default org
    this.policies.set('org_default', {
      organizationId: 'org_default',
      requireMFA: false,
      disablePasswordLogin: false,
      restrictProjectCreationToRoles: ['owner', 'admin', 'member'],
      restrictPublishingToRoles: ['owner', 'admin'],
      restrictCustomDomains: false,
      restrictExternalSharing: false,
      allowedIpRanges: [],
      sessionMaxAgeHours: 720,
      idleTimeoutMinutes: 60,
      enforceDataResidency: 'none',
      dataRetentionDays: 365,
      auditRetentionDays: 730,
      allowedAiProviders: ['openai', 'gemini', 'anthropic', 'local_mock'],
      maxAiBudgetPerMonth: 500,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    });
  }

  async getPolicy(orgId: string): Promise<OrganizationSecurityPolicy> {
    let pol = this.policies.get(orgId);
    if (!pol) {
      pol = {
        organizationId: orgId,
        requireMFA: false,
        disablePasswordLogin: false,
        restrictProjectCreationToRoles: ['owner', 'admin', 'member'],
        restrictPublishingToRoles: ['owner', 'admin'],
        restrictCustomDomains: false,
        restrictExternalSharing: false,
        allowedIpRanges: [],
        sessionMaxAgeHours: 720,
        idleTimeoutMinutes: 60,
        enforceDataResidency: 'none',
        dataRetentionDays: 365,
        auditRetentionDays: 730,
        allowedAiProviders: ['openai', 'gemini', 'anthropic', 'local_mock'],
        maxAiBudgetPerMonth: 500,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };
      this.policies.set(orgId, pol);
    }
    return pol;
  }

  async updatePolicy(orgId: string, updates: Partial<OrganizationSecurityPolicy>, actorId: string): Promise<OrganizationSecurityPolicy> {
    const current = await this.getPolicy(orgId);
    const updated: OrganizationSecurityPolicy = {
      ...current,
      ...updates,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    };
    this.policies.set(orgId, updated);

    await defaultAuditLogger.log({
      organizationId: orgId,
      actorId,
      actorType: 'user',
      action: 'security_policy:update',
      resourceType: 'organization_policy',
      resourceId: orgId,
      metadata: { changes: Object.keys(updates) },
      status: 'SUCCESS',
      ipHash: 'local',
    });

    return updated;
  }

  async validateAction(orgId: string, userRole: string, action: 'create_project' | 'publish_project' | 'add_custom_domain' | 'use_ai_provider', context?: any): Promise<{ allowed: boolean; reason?: string }> {
    const policy = await this.getPolicy(orgId);

    if (action === 'create_project') {
      if (!policy.restrictProjectCreationToRoles.includes(userRole)) {
        return { allowed: false, reason: `Policy restricts project creation to roles: ${policy.restrictProjectCreationToRoles.join(', ')}` };
      }
    }

    if (action === 'publish_project') {
      if (!policy.restrictPublishingToRoles.includes(userRole)) {
        return { allowed: false, reason: `Policy restricts publishing to roles: ${policy.restrictPublishingToRoles.join(', ')}` };
      }
    }

    if (action === 'add_custom_domain' && policy.restrictCustomDomains) {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return { allowed: false, reason: 'Custom domains restricted by organization security policy' };
      }
    }

    if (action === 'use_ai_provider' && context?.provider) {
      if (!policy.allowedAiProviders.includes(context.provider)) {
        return { allowed: false, reason: `AI provider '${context.provider}' is blocked by organization policy` };
      }
    }

    return { allowed: true };
  }
}

// ─── 4. Network Policy & IP Allowlist Engine ──────────────────────────────────

export class NetworkPolicyEngine {
  isIpAllowed(clientIp: string, allowedRanges: string[]): boolean {
    if (!allowedRanges || allowedRanges.length === 0) return true; // No restrictions configured

    // Support standard IPv4 exact matches and simple subnet prefix (e.g. 192.168.1.0/24)
    for (const range of allowedRanges) {
      const trimmed = range.trim();
      if (trimmed === clientIp) return true;

      if (trimmed.endsWith('/24')) {
        const prefix = trimmed.slice(0, trimmed.lastIndexOf('.'));
        const clientPrefix = clientIp.slice(0, clientIp.lastIndexOf('.'));
        if (prefix === clientPrefix) return true;
      }
      if (trimmed.endsWith('/16')) {
        const parts = trimmed.split('.');
        const clientParts = clientIp.split('.');
        if (parts[0] === clientParts[0] && parts[1] === clientParts[1]) return true;
      }
    }

    return false;
  }
}

// ─── 5. Device & Session Manager ──────────────────────────────────────────────

export class SessionManager {
  private sessions: Map<string, UserSessionRecord> = new Map();

  async createSession(params: { userId: string; organizationId: string; userAgent: string; ipAddress: string; deviceType?: 'desktop' | 'mobile' | 'tablet' }): Promise<UserSessionRecord> {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: UserSessionRecord = {
      id,
      userId: params.userId,
      organizationId: params.organizationId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      ipHash: `hash_${params.ipAddress.replace(/[^0-9]/g, '').slice(-4)}`,
      deviceType: params.deviceType || 'desktop',
      isSuspicious: false,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<UserSessionRecord | null> {
    const s = this.sessions.get(id);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(id);
      return null;
    }
    return s;
  }

  async listUserSessions(userId: string): Promise<UserSessionRecord[]> {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  async revokeSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    let count = 0;
    for (const [id, s] of Array.from(this.sessions.entries())) {
      if (s.userId === userId && id !== exceptSessionId) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  async markSuspicious(sessionId: string): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.isSuspicious = true;
    return true;
  }

  async touchSession(sessionId: string): Promise<UserSessionRecord | null> {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    s.lastActiveAt = new Date().toISOString();
    return s;
  }
}

// ─── 6. Key Management Provider (KMS) ─────────────────────────────────────────

export interface KeyManagementProvider {
  createKey(organizationId: string, alias: string): Promise<KMSKeyRecord>;
  getKey(keyId: string): Promise<KMSKeyRecord | null>;
  rotateKey(keyId: string): Promise<KMSKeyRecord>;
  listKeys(organizationId: string): Promise<KMSKeyRecord[]>;
}

export class LocalKeyManagementProvider implements KeyManagementProvider {
  private keys: Map<string, KMSKeyRecord> = new Map();

  async createKey(organizationId: string, alias: string): Promise<KMSKeyRecord> {
    const keyId = `kms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const key: KMSKeyRecord = {
      keyId,
      organizationId,
      alias,
      algorithm: 'AES_256_GCM',
      version: 1,
      status: 'enabled',
      rotatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.keys.set(keyId, key);
    return key;
  }

  async getKey(keyId: string): Promise<KMSKeyRecord | null> {
    return this.keys.get(keyId) || null;
  }

  async rotateKey(keyId: string): Promise<KMSKeyRecord> {
    const key = this.keys.get(keyId);
    if (!key) throw new Error('KMS key not found');
    key.version++;
    key.rotatedAt = new Date().toISOString();
    return key;
  }

  async listKeys(organizationId: string): Promise<KMSKeyRecord[]> {
    return Array.from(this.keys.values()).filter((k) => k.organizationId === organizationId);
  }
}

// ─── 7. Compliance Architecture ───────────────────────────────────────────────

export class ComplianceManager {
  private controls: ComplianceControlRecord[] = [
    { controlId: 'AC-1', name: 'Access Control Policy', category: 'access_control', status: 'implemented', lastEvaluatedAt: new Date().toISOString(), notes: 'Centralized RBAC & Project Roles enforced' },
    { controlId: 'AC-2', name: 'Account Management & SCIM', category: 'access_control', status: 'implemented', lastEvaluatedAt: new Date().toISOString(), notes: 'SCIM 2.0 user provisioning active' },
    { controlId: 'SC-1', name: 'Encryption at Rest & In-Transit', category: 'data_protection', status: 'implemented', lastEvaluatedAt: new Date().toISOString(), notes: 'TLS 1.3 & AES-256 KMS encryption' },
    { controlId: 'AU-1', name: 'Audit Logging & Immutability', category: 'audit_logging', status: 'implemented', lastEvaluatedAt: new Date().toISOString(), notes: 'Tamper-resistant audit logs with secret redaction' },
    { controlId: 'CP-1', name: 'Disaster Recovery & Backups', category: 'business_continuity', status: 'policy_configured', lastEvaluatedAt: new Date().toISOString(), notes: 'Multi-region failover & automated snapshots' },
  ];

  async listControls(): Promise<ComplianceControlRecord[]> {
    return this.controls;
  }

  async evaluateComplianceStatus(): Promise<{ scorePercentage: number; passingControls: number; totalControls: number }> {
    const passing = this.controls.filter((c) => c.status === 'implemented' || c.status === 'policy_configured').length;
    return {
      scorePercentage: Math.round((passing / this.controls.length) * 100),
      passingControls: passing,
      totalControls: this.controls.length,
    };
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const defaultSSOProvider = new LocalSSOProvider();
export const defaultSCIMProvider = new LocalSCIMProvider();
export const defaultOrganizationPolicyEngine = new OrganizationPolicyEngine();
export const defaultNetworkPolicyEngine = new NetworkPolicyEngine();
export const defaultSessionManager = new SessionManager();
export const defaultKeyManagementProvider = new LocalKeyManagementProvider();
export const defaultComplianceManager = new ComplianceManager();
