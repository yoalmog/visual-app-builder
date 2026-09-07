// D8.20: Platform Certification Types & Contracts
// Unifying all 19 Phase 8 Subsystems into an auditable, verifiable certification record

export type SubsystemCategory = 
  | 'COGNITIVE'
  | 'GOVERNANCE'
  | 'OPTIMIZATION'
  | 'ENTERPRISE'
  | 'SECURITY'
  | 'CONSENSUS';

export type SubsystemCertificationStatus = 
  | 'CERTIFIED'
  | 'FAILED'
  | 'SKIPPED'
  | 'NOT_EVALUATED';

export interface SubsystemMetadata {
  id: string; // e.g. 'D8.1', 'D8.2', ... 'D8.19'
  name: string;
  deliverableTitle: string;
  category: SubsystemCategory;
  version: string;
  engineClass: string;
  sourceFile: string;
}

export interface SubsystemProbeResult {
  id: string;
  name: string;
  category: SubsystemCategory;
  status: SubsystemCertificationStatus;
  latencyMs: number;
  invariantsChecked: string[];
  checksPassed: number;
  totalChecks: number;
  error?: string;
  details?: Record<string, any>;
}

export interface MasterGrandCycleResult {
  status: 'COMPLETED' | 'FAILED';
  sessionId: string;
  goalTitle: string;
  executionLatencyMs: number;
  swarmConsensusReached: boolean;
  swarmConsensusMode: string;
  winningProposalRole: string;
  guardrailsPassed: boolean;
  securityRiskScore: number;
  merkleAuditRoot: string;
  tokenSavingsPercent: number;
  tokenReport: {
    totalPromptTokens: number;
    tokensSaved: number;
    estimatedCostUsd: number;
  };
  stageLatencies: Record<string, number>;
  memoryConventionsLearned: number;
  reportGenerated: boolean;
  verifiedPagesCount: number;
}

export interface PlatformCertificationReport {
  certificationId: string;
  timestamp: string;
  overallStatus: 'CERTIFIED' | 'FAILED';
  certifiedSubsystemsCount: number;
  totalSubsystemsCount: number;
  subsystemResults: SubsystemProbeResult[];
  grandCycle: MasterGrandCycleResult;
  regressionBaseline: {
    baseline776: 'PASS' | 'FAIL';
    phase7: 'PASS' | 'FAIL';
    phase7_39: 'PASS' | 'FAIL';
    phase7_40: 'PASS' | 'FAIL';
  };
  platformSeal: string; // Deterministic SHA-256 certification seal
  certifiedBy: string;
}
