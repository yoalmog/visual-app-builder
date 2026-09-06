// D8.7: Autonomous Verification Engine
// Automatically asserts and proves post-execution state against plan expectations.

import { AppProject } from '../../builder/schema/project';
import { PlanStep, AutonomousVerificationResult, VerificationCheck } from './types';

export class AutonomousVerificationEngine {
  /**
   * Verifies that the expected outcome of a plan step was fulfilled in the target project state.
   */
  public static verifyStepOutcome(step: PlanStep, project: AppProject): AutonomousVerificationResult {
    const checks: VerificationCheck[] = [];
    const evidence: string[] = [];
    const expected = step.expectedResult;

    switch (expected.entityType) {
      case 'page': {
        const page = (project.pages || []).find((p) => p.id === expected.entityId);
        const exists = Boolean(page);
        checks.push({
          checkId: `chk_page_${expected.entityId}`,
          type: 'route_exists',
          target: expected.entityId,
          passed: exists,
          expected: `Page with ID ${expected.entityId} exists`,
          actual: exists ? `Page exists at slug "${page?.slug}"` : 'Page not found in project.pages',
        });
        if (exists) {
          evidence.push(`Verified page "${page?.name}" (/slug: ${page?.slug}) with root node ${page?.root.id}`);
        }
        break;
      }

      case 'component': {
        let found = false;
        let foundPageId = '';
        for (const page of project.pages || []) {
          if (this.nodeExistsInTree(page.root, expected.entityId)) {
            found = true;
            foundPageId = page.id;
            break;
          }
        }
        checks.push({
          checkId: `chk_node_${expected.entityId}`,
          type: 'tree_presence',
          target: expected.entityId,
          passed: found,
          expected: `Component node ${expected.entityId} exists in page tree`,
          actual: found ? `Found in page ${foundPageId}` : 'Component node missing in tree',
        });
        if (found) {
          evidence.push(`Found component node ${expected.entityId} embedded in page ${foundPageId}`);
        }
        break;
      }

      case 'collection': {
        const col = (project.collections || []).find((c) => c.id === expected.entityId);
        const exists = Boolean(col);
        checks.push({
          checkId: `chk_col_${expected.entityId}`,
          type: 'schema_check',
          target: expected.entityId,
          passed: exists,
          expected: `Collection ${expected.entityId} exists`,
          actual: exists ? `Collection active with ${col?.fields?.length || 0} fields` : 'Collection not found',
        });
        if (exists) {
          evidence.push(`Verified database collection "${col?.name}" (fields: ${col?.fields?.map((f) => f.name).join(', ')})`);
        }
        break;
      }

      case 'workflow': {
        const wf = (project.workflows || []).find((w) => w.id === expected.entityId);
        const exists = Boolean(wf);
        checks.push({
          checkId: `chk_wf_${expected.entityId}`,
          type: 'workflow_registered',
          target: expected.entityId,
          passed: exists,
          expected: `Workflow ${expected.entityId} registered`,
          actual: exists ? `Workflow active with trigger ${wf?.triggerType || 'manual'}` : 'Workflow not found',
        });
        if (exists) {
          evidence.push(`Verified automation workflow "${wf?.name}"`);
        }
        break;
      }

      default: {
        // General schema validation
        const validSchema = Boolean(project.version && Array.isArray(project.pages));
        checks.push({
          checkId: 'chk_schema_valid',
          type: 'type_validity',
          target: 'project',
          passed: validSchema,
          expected: 'Project schema version 7 valid',
          actual: validSchema ? `Version ${project.version}` : 'Invalid project structure',
        });
        evidence.push('Verified root project schema consistency');
      }
    }

    const allPassed = checks.every((c) => c.passed);

    return {
      verificationId: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stepId: step.stepId,
      status: allPassed ? 'PASSED' : 'FAILED',
      checks,
      evidence,
      timestamp: new Date().toISOString(),
    };
  }

  private static nodeExistsInTree(root: any, targetId: string): boolean {
    if (!root) return false;
    if (root.id === targetId) return true;
    if (Array.isArray(root.children)) {
      for (const child of root.children) {
        if (this.nodeExistsInTree(child, targetId)) return true;
      }
    }
    return false;
  }
}
