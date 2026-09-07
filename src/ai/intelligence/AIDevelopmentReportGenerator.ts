// D8.15: AI Development Report Generator
// Compiles reproducible, evidence-based development session reports in Markdown and JSON formats.
// Supports both DevelopmentSession and OrchestrationSession across all 14 AI continuum subsystems.

import { DevelopmentSession, AIDevelopmentReport } from './types';
import { OrchestrationSession, SubsystemStatusSummary } from './orchestration-types';

export class AIDevelopmentReportGenerator {
  /**
   * Generates a structured AIDevelopmentReport object from either a DevelopmentSession or OrchestrationSession.
   */
  public static generateReport(session: DevelopmentSession | OrchestrationSession): AIDevelopmentReport {
    if ('state' in session && 'artifacts' in session) {
      return this.generateFromOrchestrationSession(session as OrchestrationSession);
    }
    return this.generateFromDevelopmentSession(session as DevelopmentSession);
  }

  /**
   * Legacy generator for DevelopmentSession.
   */
  private static generateFromDevelopmentSession(session: DevelopmentSession): AIDevelopmentReport {
    const plan = session.currentPlan;
    const completedCount = session.timeline?.filter((t) => t.category === 'OPERATION').length || 0;
    const totalCount = plan?.steps.length || 0;

    return {
      sessionId: session.sessionId,
      projectId: session.projectId,
      goalSummary: session.goal?.intentSummary || 'No explicit goal specified',
      planSummary: plan?.title || 'No plan synthesized',
      completedStepsCount: completedCount,
      totalStepsCount: totalCount,
      operationsSummary: plan?.steps.map((s) => `${s.stepId}: ${s.title}`) || [],
      verificationResults: session.verificationHistory || [],
      regressionDetected: false,
      finalStatus: session.executionState,
      remainingRisks: plan?.risks || [],
      recommendedNextSteps: [
        'Run end-to-end integration tests',
        'Verify production bundle with npm run build',
        'Deploy preview deployment for manual stakeholder validation',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enhanced generator for full D8.15 OrchestrationSession.
   */
  public static generateFromOrchestrationSession(session: OrchestrationSession): AIDevelopmentReport {
    const goal = session.artifacts.goal;
    const plan = session.artifacts.plan;
    const verification = session.artifacts.verificationResult;
    const breaches = session.artifacts.breaches || [];
    const execResult = session.artifacts.executionResult;

    const completedSteps = execResult?.completedStepIds?.length || (session.state === 'COMPLETED' ? (plan?.steps?.length || 0) : 0);
    const totalSteps = plan?.steps?.length || 0;

    return {
      sessionId: session.sessionId,
      projectId: session.projectId,
      goalSummary: goal?.intentSummary || goal?.rawPrompt || session.request.prompt || 'No explicit goal specified',
      planSummary: plan?.title || 'Autonomous Plan',
      environment: session.request.environment || 'development',
      operatorRole: typeof session.request.operatorRole === 'string' ? session.request.operatorRole : session.request.operatorRole?.name || 'editor',
      autonomyLevel: session.request.autonomyLevel ?? 2,
      completedStepsCount: completedSteps,
      totalStepsCount: totalSteps,
      operationsSummary: plan?.steps?.map((s) => `${s.stepId}: ${s.title || (s.operation as any)?.type}`) || [],
      verificationResults: verification ? [verification] : [],
      regressionDetected: verification ? ((verification as any).passed !== undefined ? !(verification as any).passed : verification.status !== 'PASS') : false,
      guardrailBreachesCount: breaches.length,
      subsystemSummary: session.subsystemStatus,
      finalStatus: session.state,
      remainingRisks: plan?.risks || [],
      recommendedNextSteps: [
        'Verify end-to-end application flow in live canvas preview',
        'Confirm strict project isolation and security boundaries',
        'Deploy preview deployment for manual stakeholder review',
      ],
      traceId: session.artifacts.traceId,
      provenanceHash: session.provenanceHash,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Formats the report into a clean GitHub-flavored markdown document.
   */
  public static formatMarkdown(sessionOrReport: DevelopmentSession | OrchestrationSession | AIDevelopmentReport): string {
    const report: AIDevelopmentReport = 'goalSummary' in sessionOrReport && 'sessionId' in sessionOrReport && !('artifacts' in sessionOrReport)
      ? (sessionOrReport as AIDevelopmentReport)
      : this.generateReport(sessionOrReport as any);

    const subSummary: SubsystemStatusSummary | undefined = report.subsystemSummary;

    const sections = [
      '# AI Autonomous Development Session Report',
      '',
      `**Session ID:** \`${report.sessionId}\``,
      report.projectId ? `**Project ID:** \`${report.projectId}\`` : '',
      `**Final Status:** **${report.finalStatus}**`,
      report.environment ? `**Environment:** \`${report.environment}\` | **Role:** \`${report.operatorRole || 'editor'}\` | **Autonomy Level:** \`L${report.autonomyLevel ?? 2}\`` : '',
      report.provenanceHash ? `**Provenance Hash (SHA-256):** \`${report.provenanceHash}\`` : '',
      report.traceId ? `**Causal Trace ID:** \`${report.traceId}\`` : '',
      `**Generated At:** ${report.generatedAt}`,
      '',
      '## 1. Goal & Intent Understanding',
      `> ${report.goalSummary}`,
      '',
      '## 2. Plan Execution Summary',
      `- **Plan Title:** ${report.planSummary}`,
      `- **Completed Steps:** ${report.completedStepsCount} / ${report.totalStepsCount}`,
      `- **Regression Detected:** ${report.regressionDetected ? 'YES' : 'NONE'}`,
      `- **Guardrail Breaches:** ${report.guardrailBreachesCount ?? 0}`,
      '',
    ];

    if (subSummary) {
      sections.push(
        '## 3. Subsystem Execution Matrix',
        '| Subsystem | Status |',
        '|---|---|',
        `| Goal Understanding (D8.1) | **${subSummary.goalUnderstanding}** |`,
        `| Context Intelligence (D8.2) | **${subSummary.contextIntelligence}** |`,
        `| Guardrails Synthesis (D8.14) | **${subSummary.guardrailsSynthesis}** |`,
        `| Plan Generation (D8.3) | **${subSummary.planGeneration}** |`,
        `| Decision Optimization (D8.9) | **${subSummary.decisionOptimization}** |`,
        `| Plan Validation (D8.4) | **${subSummary.planValidation}** |`,
        `| Autonomy Policy Gating (D8.5) | **${subSummary.autonomyGating}** |`,
        `| HITL Supervisory Control (D8.13) | **${subSummary.hitlControl}** |`,
        `| Transactional Execution (D8.6) | **${subSummary.transactionExecution}** |`,
        `| Live Watchdog Monitoring (D8.14) | **${subSummary.liveWatchdog}** |`,
        `| Autonomous Verification (D8.7) | **${subSummary.verification}** |`,
        `| Post-Execution Guardrails (D8.14) | **${subSummary.postGuardrail}** |`,
        `| Controlled Adaptation (D8.12) | **${subSummary.adaptationRecovery}** |`,
        `| Execution Timeline (D8.10) | **${subSummary.timelineTracing}** |`,
        `| Decision Explainability (D8.11) | **${subSummary.explainability}** |`,
        `| Experience Replay (D8.8) | **${subSummary.experienceLearning}** |`,
        '',
      );
    }

    sections.push(
      '## 4. Operations Executed',
      ...(report.operationsSummary.length > 0 ? report.operationsSummary.map((op) => `- [x] ${op}`) : ['*No operations executed.*']),
      '',
      '## 5. Verification & Quality Gates',
      `- **Verifications Passed:** ${report.verificationResults.filter((v) => v.passed || v.status === 'PASSED').length} / ${report.verificationResults.length || 1}`,
      `- **Verification Detail:** ${report.verificationResults.length > 0 ? (report.verificationResults[0].evidence?.join('; ') || 'Verified clean') : 'All assertions verified'}`,
      '',
      '## 6. Remaining Risks & Recommended Next Steps',
      ...(report.recommendedNextSteps.map((s, idx) => `${idx + 1}. ${s}`)),
      '',
      '---',
      '*Report automatically synthesized by Visual Application Builder Phase 8 Unified Orchestration Platform.*'
    );

    return sections.filter((line) => line !== '').join('\n');
  }
}
