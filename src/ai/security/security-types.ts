// D8.16: Multi-Agent Security, Audit & Vulnerability Types

export type SecurityThreatCategory =
  | 'CODE_INJECTION'
  | 'PROMPT_INJECTION'
  | 'CREDENTIAL_LEAK'
  | 'PRIVILEGE_ESCALATION'
  | 'CROSS_PROJECT_ACCESS'
  | 'PATH_TRAVERSAL'
  | 'PROTOTYPE_POLLUTION'
  | 'UNSAFE_COMPONENT_PROPS'
  | 'MALICIOUS_DEPENDENCY';

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SecurityRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface VulnerabilityFinding {
  findingId: string;
  category: SecurityThreatCategory;
  severity: SecuritySeverity;
  message: string;
  target: string; // e.g. path, prop, node ID, operation ID, variable name
  snippet?: string;
  remediation?: string;
  detectedAt: string;
}

export interface SecurityScanResult {
  safe: boolean;
  score: number; // 0.0 - 10.0 (10.0 = completely secure, 0.0 = critical compromises)
  riskLevel: SecurityRiskLevel;
  findings: VulnerabilityFinding[];
  quarantineRecommended: boolean;
  scanTimestamp: string;
  durationMs: number;
}

export interface AuditLedgerEntry {
  entryId: string;
  sequenceNumber: number;
  timestamp: string;
  eventType: string;
  actorId: string;
  actorRole: string;
  projectId: string;
  payloadHash: string;
  previousHash: string;
  currentHash: string;
  signature: string;
  quarantined?: boolean;
}

export interface LedgerVerificationResult {
  intact: boolean;
  totalEntries: number;
  brokenEntryIndex?: number;
  expectedHash?: string;
  actualHash?: string;
  error?: string;
}

export interface SecurityPolicyConfig {
  allowedRolesForMutation: string[];
  maxRiskThreshold: SecuritySeverity;
  enforceZeroDynamicExec: boolean;
  enforceStrictProjectIsolation: boolean;
  enableDeepAstInspection: boolean;
  enableObfuscationScanning: boolean;
}

export interface SecurityAuditContext {
  projectId: string;
  actorId?: string;
  actorRole?: string;
  environment?: string;
}
