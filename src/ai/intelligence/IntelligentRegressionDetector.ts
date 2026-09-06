// D8.8: Intelligent Regression Detector
// Detects unintended breakage or removal of pre-existing functionality across mutations.

import { AppProject } from '../../builder/schema/project';
import { IntelligentRegressionReport } from './types';

export class IntelligentRegressionDetector {
  /**
   * Compares pre-mutation baseline with post-mutation state to detect regressions.
   */
  public static detectRegression(
    before: AppProject,
    after: AppProject,
    plannedRemovals: string[] = []
  ): IntelligentRegressionReport {
    const brokenEntities: string[] = [];
    const unexpectedRemovals: string[] = [];
    const schemaIssues: string[] = [];

    // 1. Schema version check
    if (Number(after.version) !== 7) {
      schemaIssues.push(`Schema version downgraded from 7 to ${after.version}`);
    }

    // 2. Unexpected page removals
    const beforePages = new Map((before.pages || []).map((p) => [p.id, p]));
    const afterPages = new Map((after.pages || []).map((p) => [p.id, p]));

    beforePages.forEach((page, id) => {
      if (!afterPages.has(id)) {
        if (!plannedRemovals.includes(id)) {
          unexpectedRemovals.push(`Page "${page.name}" (${id}) was unexpectedly removed`);
        }
      } else {
        // Check root node presence
        const afterPage = afterPages.get(id)!;
        if (!afterPage.root || !afterPage.root.id) {
          brokenEntities.push(`Page "${page.name}" lost its root component node`);
        }
      }
    });

    // 3. Unexpected collection removals
    const beforeCols = new Map((before.collections || []).map((c) => [c.id, c]));
    const afterCols = new Map((after.collections || []).map((c) => [c.id, c]));

    beforeCols.forEach((col, id) => {
      if (!afterCols.has(id)) {
        if (!plannedRemovals.includes(id)) {
          unexpectedRemovals.push(`Data collection "${col.name}" (${id}) was unexpectedly removed`);
        }
      }
    });

    const detected = brokenEntities.length > 0 || unexpectedRemovals.length > 0 || schemaIssues.length > 0;
    const summary = detected
      ? `Regression detected: ${brokenEntities.length} broken entities, ${unexpectedRemovals.length} unexpected removals, ${schemaIssues.length} schema issues.`
      : 'No regressions detected. Prior baseline functionality intact.';

    return {
      detected,
      brokenEntities,
      unexpectedRemovals,
      schemaIssues,
      summary,
    };
  }
}
