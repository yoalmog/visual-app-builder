// D8.16: Phase 8 Security Auditor
// Static code and plan security scanner preventing dynamic execution, path traversal, injection, and secret leakage.
// Fully integrated with MultiAgentSecurityAuditor for deep AST, RBAC, obfuscation, and isolation analysis.

import { IntelligentPlan } from './types';
import { MultiAgentSecurityAuditor } from '../security/MultiAgentSecurityAuditor';
import { SecurityScanResult } from '../security/security-types';

export class Phase8SecurityAuditor {
  /**
   * Scans a string for dangerous execution or injection patterns.
   * Backward-compatible interface returning { safe: boolean; violations: string[] }.
   */
  public static auditCodeString(input: string): { safe: boolean; violations: string[] } {
    const scan = MultiAgentSecurityAuditor.auditCodeString(input);
    return {
      safe: scan.safe,
      violations: scan.findings.map((f) => `${f.message} (${f.severity})`),
    };
  }

  /**
   * Audits an entire intelligent plan before execution.
   * Backward-compatible interface returning { safe: boolean; violations: string[] }.
   */
  public static auditPlan(plan: IntelligentPlan): { safe: boolean; violations: string[] } {
    const scan = MultiAgentSecurityAuditor.auditPlan(plan);
    return {
      safe: scan.safe,
      violations: scan.findings.map((f) => `${f.message} (${f.severity})`),
    };
  }

  /**
   * Deep multi-agent security audit returning complete SecurityScanResult.
   */
  public static deepAudit(planOrCode: IntelligentPlan | string): SecurityScanResult {
    if (typeof planOrCode === 'string') {
      return MultiAgentSecurityAuditor.auditCodeString(planOrCode);
    }
    return MultiAgentSecurityAuditor.auditPlan(planOrCode);
  }
}
