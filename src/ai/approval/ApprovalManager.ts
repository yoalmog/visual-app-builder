// Approval Manager & Risk Classification Engine
import { AIOperation } from '../operations/AIOperation';
import { AIRisk, AISafetyMode } from '../../builder/schema/ai';

export interface ApprovalRequest {
  id: string;
  generationId: string;
  operations: AIOperation[];
  highestRisk: AIRisk;
  reason: string;
  environment: 'development' | 'preview' | 'production';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export class ApprovalManager {
  /**
   * Assesses the highest risk level across an array of operations.
   */
  public static assessRisk(operations: AIOperation[]): AIRisk {
    if (operations.length === 0) return 'low';

    const riskLevels: Record<AIRisk, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    let maxLevel = 1;

    for (const op of operations) {
      let opRisk = op.risk;

      // Ensure proper classification
      if (op.type === 'delete_page' || op.type === 'remove_component') {
        opRisk = 'high';
      } else if (op.type === 'create_role' || op.type === 'assign_permission') {
        opRisk = 'high';
      } else if (op.type === 'create_collection' || op.type === 'create_workflow') {
        opRisk = 'medium';
      } else if (op.type === 'update_theme' || op.type === 'create_token') {
        opRisk = 'low';
      }

      const lvl = riskLevels[opRisk] || 1;
      if (lvl > maxLevel) {
        maxLevel = lvl;
      }
    }

    const mapBack: Record<number, AIRisk> = {
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'critical',
    };

    return mapBack[maxLevel] || 'low';
  }

  /**
   * Determines if human approval is required before applying operations.
   */
  public static requiresApproval(params: {
    operations: AIOperation[];
    safetyMode: AISafetyMode;
    environment: 'development' | 'preview' | 'production';
    autoApplyLowRisk?: boolean;
  }): { required: boolean; highestRisk: AIRisk; reason: string } {
    const highestRisk = this.assessRisk(params.operations);

    // Production environment strictly enforces approval for ANY non-low changes
    if (params.environment === 'production') {
      if (highestRisk !== 'low') {
        return {
          required: true,
          highestRisk,
          reason: `Production environment guardrail: operations with ${highestRisk.toUpperCase()} risk require explicit approval.`,
        };
      }
    }

    // Safe mode requires approval for medium, high, and critical
    if (params.safetyMode === 'safe') {
      if (highestRisk !== 'low') {
        return {
          required: true,
          highestRisk,
          reason: `Safe mode active: ${highestRisk.toUpperCase()} risk operations require user confirmation.`,
        };
      }
    }

    // Approval mode requires approval for high and critical
    if (params.safetyMode === 'approval') {
      if (highestRisk === 'high' || highestRisk === 'critical') {
        return {
          required: true,
          highestRisk,
          reason: `Approval mode: High-risk mutations require approval before execution.`,
        };
      }
    }

    // Developer mode allows auto-apply for low and medium, but critical still requires confirmation
    if (highestRisk === 'critical') {
      return {
        required: true,
        highestRisk,
        reason: 'Critical risk operations (e.g. destructive permissions or publishing) always require approval.',
      };
    }

    return {
      required: false,
      highestRisk,
      reason: 'Operations are within safe automated threshold.',
    };
  }
}
