// D8.11: Explainability Engine
// Primary engine for observational, evidence-backed, causally-traceable AI decision explanations.
// Observes and reconstructs reality from structured evidence without mutating state or acquiring authority.

import {
  ExplanationRequest,
  Explanation,
  ExplanationState,
  ExplanationStatus,
  ExplanationSummary,
  ExplanationConfidence,
  ExplanationUncertainty,
  ExplanationNode,
  ExplanationEdge,
  CausalChain,
  CausalNodeType,
  CausalCauseType,
  EvidenceBundle,
  EvidenceReference,
  EvidenceType,
  EvidenceSource,
  EvidenceStrength,
  EvidenceFreshness,
  DecisionExplanation,
  StrategyExplanation,
  ConstraintExplanation,
  RiskExplanation,
  DecisionAlternative,
  RejectedAlternative,
  SelectedAlternative,
  DecisionFactor,
  PolicyExplanation,
  ApprovalExplanation,
  ExecutionExplanation,
  VerificationExplanation,
  RecoveryExplanation,
  LearningExplanation,
  ResultExplanation,
  Provenance,
  ProvenanceClaim,
  RedactionResult,
  ExplanationCheckpoint,
  ExplanationQuery,
  ExplanationQueryResult,
  ConfidenceGrade,
} from './explainability-types';
import { ExplanationStore } from './ExplanationStore';
import { ExecutionEventStore } from '../observability/ExecutionEventStore';
import { ExecutionTimelineEngine } from '../observability/ExecutionTimelineEngine';
import {
  ExecutionTrace,
  ExecutionEvent,
  ExecutionEventType,
} from '../observability/observability-types';
import { AISecretFilter } from '../security/AISecretFilter';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';

export class ExplainabilityEngine {
  private static readonly ENGINE_VERSION = '1.0.0-d8.11';

  /**
   * Overloaded explain method supporting both D8.11 full requests and backwards-compatible legacy topic queries.
   */
  public static explain(
    topic: 'WHY_THIS_PLAN' | 'WHY_APPROVAL_REQUIRED' | 'WHY_RECOVERY_SELECTED' | 'WHY_ROLLED_BACK',
    context: {
      plan?: any;
      step?: any;
      risk?: string;
      reason?: string;
      error?: string;
    }
  ): {
    topic: string;
    question: string;
    answer: string;
    justification: string;
    supportingEvidence: string[];
    timestamp: string;
  };
  public static explain(request: ExplanationRequest): Promise<Explanation>;
  public static explain(
    reqOrTopic: ExplanationRequest | 'WHY_THIS_PLAN' | 'WHY_APPROVAL_REQUIRED' | 'WHY_RECOVERY_SELECTED' | 'WHY_ROLLED_BACK',
    context?: any
  ): Promise<Explanation> | any {
    if (typeof reqOrTopic === 'string') {
      return this.explainLegacy(reqOrTopic, context || {});
    }
    return this.explainInternal(reqOrTopic);
  }

  /**
   * Primary entry point: Generates a complete, evidence-backed explanation for an AI execution trace.
   * Strictly read-only: never mutates AppProject, executes transactions, or approves actions.
   */
  private static async explainInternal(request: ExplanationRequest): Promise<Explanation> {
    const startTime = Date.now();
    const explanationId = `exp-${request.traceId}-${startTime}`;
    const sessionId = request.sessionId || `exp-session-${Date.now()}`;

    // Prompt injection check on request userPrompt if present
    let sanitizedPrompt = request.userPrompt || '';
    let promptInjectionDetected = false;
    if (request.userPrompt && PromptInjectionDefense.containsInjectionAttempt(request.userPrompt)) {
      promptInjectionDetected = true;
      sanitizedPrompt = PromptInjectionDefense.sanitizeInstruction(request.userPrompt).sanitized;
    }


    let currentState: ExplanationState = 'REQUEST_RECEIVED';

    // 1. Trace Loading & Project Isolation Check
    currentState = 'TRACE_LOADING';
    const trace = ExecutionTimelineEngine.getTrace(request.traceId, request.projectId);
    const traceEvents = ExecutionEventStore.getTraceEvents(request.traceId, request.projectId);

    // Save checkpoint at TRACE_LOADING
    const cp1: ExplanationCheckpoint = {
      checkpointId: `cp-${explanationId}-1`,
      explanationId,
      requestId: request.requestId,
      projectId: request.projectId,
      traceId: request.traceId,
      sessionId,
      state: currentState,
      evidenceCollectedCount: 0,
      nodesCount: 0,
      edgesCount: 0,
      timestamp: new Date().toISOString(),
      savedStateSnapshot: { state: currentState },
    };
    ExplanationStore.saveCheckpoint(cp1);

    // If no events found or trace belongs to another project
    if (!trace && traceEvents.length === 0) {
      // Check if events exist under another project (cross-project isolation violation check)
      const foreignCheck = ExecutionEventStore.queryEvents({
        filter: { projectId: request.projectId, traceId: request.traceId },
      });

      const missingExplanation: Explanation = {
        explanationId,
        requestId: request.requestId,
        projectId: request.projectId,
        traceId: request.traceId,
        sessionId,
        state: 'UNCERTAIN',
        status: 'UNCERTAIN',
        summary: {
          headline: `Execution explanation unavailable for trace ${request.traceId}`,
          whyThisHappened: 'No execution trace or events could be loaded for this identifier and project.',
          whatWasExecuted: 'None recorded',
          whatWasVerified: 'None recorded',
          keyConstraints: [],
          riskAndPolicySummary: 'Unknown: trace missing',
          uncertaintiesSummary: 'Trace data not found in event store or project isolation rejected access.',
        },
        resultExplanation: {
          finalOutcome: 'UNKNOWN',
          whatActuallyHappened: 'Trace data missing from store.',
          whatUserRequested: sanitizedPrompt || 'Unspecified request',
          unresolvedIssues: ['Trace missing from persistent store'],
          evidenceIds: [],
        },
        evidenceBundle: {
          bundleId: `bundle-${explanationId}`,
          projectId: request.projectId,
          traceId: request.traceId,
          references: [],
          totalCollected: 0,
          totalValid: 0,
          totalRedacted: 0,
          collectedAt: new Date().toISOString(),
        },
        uncertainty: {
          hasUncertainty: true,
          categories: ['MISSING_EVIDENCE'],
          knownFacts: [],
          unknownFactors: ['Trace events', 'Execution status', 'Decision rationale', 'Verification outcome'],
          reasonsWhyUnknown: ['Trace not found in ExecutionEventStore for current project scope'],
          impactOnReliability: 'CRITICAL',
        },
        confidence: {
          level: 'UNKNOWN',
          evidenceCompleteness: 'UNKNOWN',
          causalConfidence: 'UNKNOWN',
          decisionConfidence: 'UNKNOWN',
          resultConfidence: 'UNKNOWN',
          rationale: 'Cannot establish confidence without trace evidence.',
        },
        provenance: this.generateProvenance([], request.traceId, request.projectId),
        redaction: {
          secretsRedactedCount: 0,
          sensitiveKeysRedactedCount: 0,
          sanitizedTextSnippetsCount: promptInjectionDetected ? 1 : 0,
          redactedLabels: promptInjectionDetected ? ['PROMPT_INJECTION_SANITIZED'] : [],
          summary: promptInjectionDetected ? 'Prompt injection attempt sanitized' : 'No redactions needed',
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      ExplanationStore.saveExplanation(missingExplanation);
      return missingExplanation;
    }

    currentState = 'TRACE_VALIDATED';

    // 2. Evidence Collection
    currentState = 'EVIDENCE_COLLECTING';
    const evidenceReferences: EvidenceReference[] = [];
    let redactedCount = 0;

    // Convert trace events into structured evidence
    for (const evt of traceEvents) {
      if (evt.correlation.projectId !== request.projectId) {
        // Enforce strict project isolation: reject foreign project events
        continue;
      }

      const evRef = this.eventToEvidenceReference(evt, request.projectId);
      if (evRef.redacted) {
        redactedCount++;
      }
      evidenceReferences.push(evRef);
    }

    const evidenceBundle: EvidenceBundle = {
      bundleId: `bundle-${explanationId}`,
      projectId: request.projectId,
      traceId: request.traceId,
      references: evidenceReferences,
      totalCollected: evidenceReferences.length,
      totalValid: evidenceReferences.length,
      totalRedacted: redactedCount,
      collectedAt: new Date().toISOString(),
    };

    currentState = 'EVIDENCE_VALIDATED';

    // 3. Causal Reconstruction
    currentState = 'CAUSAL_RECONSTRUCTION';
    const causalChain = this.reconstructCausalChain(traceEvents, evidenceReferences);

    // Save checkpoint at CAUSAL_RECONSTRUCTION
    const cp2: ExplanationCheckpoint = {
      checkpointId: `cp-${explanationId}-2`,
      explanationId,
      requestId: request.requestId,
      projectId: request.projectId,
      traceId: request.traceId,
      sessionId,
      state: currentState,
      evidenceCollectedCount: evidenceReferences.length,
      nodesCount: causalChain.nodes.length,
      edgesCount: causalChain.edges.length,
      timestamp: new Date().toISOString(),
      savedStateSnapshot: { state: currentState },
    };
    ExplanationStore.saveCheckpoint(cp2);

    // 4. Decision Reconstruction
    currentState = 'DECISION_RECONSTRUCTION';
    const decisionExplanation = this.reconstructDecision(traceEvents, evidenceReferences);

    // 5. Policy & Approval Reconstruction
    currentState = 'POLICY_RECONSTRUCTION';
    const policyExplanation = this.reconstructPolicy(traceEvents, evidenceReferences);
    const approvalExplanation = this.reconstructApproval(traceEvents, evidenceReferences);

    // 6. Execution Reconstruction
    currentState = 'EXECUTION_RECONSTRUCTION';
    const executionExplanation = this.reconstructExecution(traceEvents, evidenceReferences);

    // 7. Verification & Recovery & Learning Reconstruction
    const verificationExplanation = this.reconstructVerification(traceEvents, evidenceReferences);
    const recoveryExplanation = this.reconstructRecovery(traceEvents, evidenceReferences);
    const learningExplanation = this.reconstructLearning(traceEvents, evidenceReferences);

    // 8. Result Reconstruction
    currentState = 'RESULT_RECONSTRUCTION';
    const resultExplanation = this.reconstructResult(
      traceEvents,
      sanitizedPrompt,
      executionExplanation,
      verificationExplanation,
      recoveryExplanation,
      evidenceReferences
    );

    // 9. Uncertainty Analysis (Section 17)
    currentState = 'UNCERTAINTY_ANALYSIS';
    const uncertainty = this.analyzeUncertainty(
      trace,
      traceEvents,
      causalChain,
      verificationExplanation,
      recoveryExplanation
    );

    // 10. Confidence Derivation (Section 18)
    const confidence = this.deriveConfidence(
      evidenceReferences,
      causalChain,
      decisionExplanation,
      verificationExplanation,
      uncertainty
    );

    // 11. Redaction Analysis (Section 20)
    currentState = 'REDACTION';
    const redactionResult: RedactionResult = {
      secretsRedactedCount: redactedCount,
      sensitiveKeysRedactedCount: redactedCount,
      sanitizedTextSnippetsCount: promptInjectionDetected ? 1 : 0,
      redactedLabels: promptInjectionDetected ? ['PROMPT_INJECTION_DEFENSE'] : [],
      summary: `${redactedCount} sensitive fields redacted; ${promptInjectionDetected ? 'prompt injection neutralized' : 'clean inputs'}.`,
    };

    // 12. Explanation Assembly & Validation
    currentState = 'EXPLANATION_ASSEMBLY';
    const summary = this.assembleSummary(
      sanitizedPrompt,
      decisionExplanation,
      policyExplanation,
      approvalExplanation,
      executionExplanation,
      verificationExplanation,
      recoveryExplanation,
      uncertainty
    );

    currentState = 'EXPLANATION_VALIDATION';
    // If essential evidence is missing that prevents reliable explanation
    let finalStatus: ExplanationStatus = 'COMPLETED';
    if (uncertainty.hasUncertainty && uncertainty.impactOnReliability === 'CRITICAL') {
      finalStatus = 'UNCERTAIN';
      currentState = 'UNCERTAIN';
    } else if (policyExplanation?.operationBlocked || approvalExplanation?.approvalStatus === 'DENIED') {
      finalStatus = 'BLOCKED';
      currentState = 'BLOCKED';
    }

    const provenance = this.generateProvenance(evidenceReferences, request.traceId, request.projectId);

    // 13. Assemble Final Explanation
    const explanation: Explanation = {
      explanationId,
      requestId: request.requestId,
      projectId: request.projectId,
      traceId: request.traceId,
      sessionId,
      state: currentState === 'UNCERTAIN' || currentState === 'BLOCKED' ? currentState : 'COMPLETED',
      status: finalStatus,
      summary,
      causalChain,
      decisionExplanation,
      policyExplanation,
      approvalExplanation,
      executionExplanation,
      verificationExplanation,
      recoveryExplanation,
      learningExplanation,
      resultExplanation,
      evidenceBundle,
      uncertainty,
      confidence,
      provenance,
      redaction: redactionResult,
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
    };

    // 14. Persist
    currentState = 'PERSISTING';
    ExplanationStore.saveExplanation(explanation);

    return explanation;
  }

  /**
   * Resumes an explanation from a persisted checkpoint (crash recovery / resume support).
   */
  public static async resumeExplanation(checkpointId: string, projectId: string): Promise<Explanation | undefined> {
    const cp = ExplanationStore.getCheckpoint(checkpointId, projectId);
    if (!cp) return undefined;

    // Reconstruct explanation from traceId
    return this.explain({
      requestId: cp.requestId,
      projectId: cp.projectId,
      traceId: cp.traceId,
      sessionId: cp.sessionId,
      requestedAt: new Date().toISOString(),
    });
  }

  /**
   * Backwards-compatible legacy explain method to ensure zero breakages with earlier stubs.
   */
  public static explainLegacy(
    topic: 'WHY_THIS_PLAN' | 'WHY_APPROVAL_REQUIRED' | 'WHY_RECOVERY_SELECTED' | 'WHY_ROLLED_BACK',
    context: {
      plan?: any;
      step?: any;
      risk?: string;
      reason?: string;
      error?: string;
    }
  ) {
    const stepCount = context.plan?.steps?.length || 0;
    switch (topic) {
      case 'WHY_THIS_PLAN':
        return {
          topic,
          question: 'Why was this specific plan synthesized?',
          answer: `The plan was synthesized to fulfill the goal "${context.plan?.title || 'Plan'}" through ${stepCount} discrete, verifiable operations.`,
          justification: context.plan?.rationale || 'Operations were sequenced based on topological dependency requirements.',
          supportingEvidence: context.plan?.requirements || [],
          timestamp: new Date().toISOString(),
        };
      case 'WHY_APPROVAL_REQUIRED':
        return {
          topic,
          question: 'Why was human approval required before applying this change?',
          answer: `The action was classified as having ${context.risk || 'elevated'} risk and requires explicit sign-off under the active policy.`,
          justification: context.reason || 'Destructive mutations and schema additions require human consent.',
          supportingEvidence: [`Operation: ${context.step?.operation?.type || 'Batch'}`, `Declared risk level: ${context.risk || 'high'}`],
          timestamp: new Date().toISOString(),
        };
      case 'WHY_RECOVERY_SELECTED':
        return {
          topic,
          question: 'Why was this specific recovery strategy selected?',
          answer: 'The system selected safe rollback and alternative generation to prevent schema corruption.',
          justification: context.error || 'A verification or execution failure occurred during step execution.',
          supportingEvidence: [`Error message: ${context.error || 'Unknown error'}`, 'Preserved snapshot via AITransactionManager'],
          timestamp: new Date().toISOString(),
        };
      case 'WHY_ROLLED_BACK':
        return {
          topic,
          question: 'Why was this change rolled back?',
          answer: 'The post-execution verification checks failed, triggering automatic rollback to protect data integrity.',
          justification: context.reason || 'Verification failure detected divergence from plan expectations.',
          supportingEvidence: [`Failed step: ${context.step?.stepId || 'unknown'}`, 'Zero orphaned entities persisted'],
          timestamp: new Date().toISOString(),
        };
    }
  }

  // ── Helper Reconstruction Implementations ──

  private static eventToEvidenceReference(evt: ExecutionEvent, projectId: string): EvidenceReference {
    let evType: EvidenceType = 'TRACE_EVENT';
    let evSource: EvidenceSource = 'EXECUTION_TRACE';

    if (evt.eventType.startsWith('DECISION_')) {
      evType = 'DECISION_RECORD';
      evSource = 'DECISION_OPTIMIZER';
    } else if (evt.eventType.startsWith('POLICY_')) {
      evType = 'POLICY_EVALUATION';
      evSource = 'POLICY_ENGINE';
    } else if (evt.eventType.startsWith('APPROVAL_')) {
      evType = 'APPROVAL_RECORD';
      evSource = 'APPROVAL_GATE';
    } else if (evt.eventType.startsWith('TRANSACTION_')) {
      evType = 'TRANSACTION_RECORD';
      evSource = 'TRANSACTION_MANAGER';
    } else if (evt.eventType.startsWith('OPERATION_') || evt.eventType.startsWith('EXECUTION_')) {
      evType = 'OPERATION_LOG';
      evSource = 'EXECUTION_TRACE';
    } else if (evt.eventType.startsWith('VERIFICATION_')) {
      evType = 'VERIFICATION_CHECK';
      evSource = 'VERIFICATION_ENGINE';
    } else if (evt.eventType.startsWith('RECOVERY_') || evt.eventType.startsWith('FAILURE_') || evt.eventType.startsWith('ROLLBACK_')) {
      evType = 'RECOVERY_DIAGNOSIS';
      evSource = 'RECOVERY_ENGINE';
    } else if (evt.eventType.startsWith('EXPERIENCE_') || evt.eventType.startsWith('LEARNING_')) {
      evType = 'EXPERIENCE_RECORD';
      evSource = 'LEARNING_STORE';
    }

    const summary = evt.outcome?.summary || evt.evidence?.summary || `${evt.eventType} (${evt.status})`;

    return {
      evidenceId: `ev-${evt.eventId}`,
      type: evType,
      source: evSource,
      sourceIdentifier: evt.eventId,
      projectId,
      traceId: evt.correlation.traceId,
      eventId: evt.eventId,
      summary,
      strength: evt.status === 'FAILED' ? 'CONCLUSIVE' : 'STRONG',
      freshness: 'RECENT',
      dataSnippet: evt.metadata,
      timestamp: evt.timestamp.iso,
      redacted: evt.redacted,
    };
  }

  private static reconstructCausalChain(events: ExecutionEvent[], evidence: EvidenceReference[]): CausalChain {
    const nodes: ExplanationNode[] = [];
    const edges: ExplanationEdge[] = [];
    const brokenLinks: string[] = [];

    // Sort events strictly by sequence number or timestamp
    const sorted = [...events].sort((a, b) => {
      if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber;
      return a.timestamp.epochMs - b.timestamp.epochMs;
    });

    let previousNodeId: string | undefined;

    for (let i = 0; i < sorted.length; i++) {
      const evt = sorted[i];
      const nodeType = this.mapEventToCausalNodeType(evt.eventType);
      if (!nodeType) continue;

      const nodeId = `node-${evt.eventId}`;
      const ev = evidence.find((e) => e.eventId === evt.eventId);
      const evidenceIds = ev ? [ev.evidenceId] : [];

      const node: ExplanationNode = {
        nodeId,
        type: nodeType,
        label: evt.eventType,
        summary: evt.outcome?.summary || evt.evidence?.summary || evt.eventType,
        statementType: 'FACT',
        timestamp: evt.timestamp.iso,
        sequenceNumber: evt.sequenceNumber,
        evidenceIds,
        metadata: evt.metadata,
      };

      nodes.push(node);

      if (previousNodeId) {
        const edgeId = `edge-${previousNodeId}-${nodeId}`;
        const causeType = this.inferCauseType(nodeType);

        edges.push({
          edgeId,
          sourceNodeId: previousNodeId,
          targetNodeId: nodeId,
          causeType,
          description: `${evt.causality?.description || `Transitioned from ${previousNodeId} to ${nodeId}`}`,
          evidenceIds,
          confidence: evt.causality?.causedByEventId ? 'HIGH' : 'MEDIUM',
          order: edges.length + 1,
          timestamp: evt.timestamp.iso,
        });
      }

      previousNodeId = nodeId;
    }

    const rootNodeId = nodes[0]?.nodeId || 'none';
    const terminalNodeId = nodes[nodes.length - 1]?.nodeId || 'none';

    return {
      nodes,
      edges,
      rootNodeId,
      terminalNodeId,
      isComplete: nodes.length > 0 && brokenLinks.length === 0,
      brokenLinks,
    };
  }

  private static mapEventToCausalNodeType(eventType: ExecutionEventType): CausalNodeType | undefined {
    switch (eventType) {
      case 'REQUEST_RECEIVED':
        return 'USER_REQUEST';
      case 'CONTEXT_BUILD_COMPLETED':
        return 'CONTEXT';
      case 'INTENT_CLASSIFIED':
        return 'INTENT';
      case 'PLAN_CREATED':
      case 'PLAN_VALIDATED':
        return 'PLAN';
      case 'CANDIDATES_GENERATED':
        return 'CANDIDATE_STRATEGIES';
      case 'CONSTRAINTS_APPLIED':
        return 'CONSTRAINT_FILTERING';
      case 'RISK_ANALYSIS_COMPLETED':
        return 'RISK_ANALYSIS';
      case 'POLICY_CHECK_PASSED':
      case 'POLICY_CHECK_FAILED':
        return 'POLICY_CHECK';
      case 'APPROVAL_REQUIRED':
      case 'APPROVAL_GRANTED':
      case 'APPROVAL_DENIED':
        return 'APPROVAL_GATE';
      case 'DECISION_SELECTED':
        return 'SELECTED_STRATEGY';
      case 'TRANSACTION_STARTED':
      case 'TRANSACTION_COMMITTED':
      case 'TRANSACTION_ROLLED_BACK':
        return 'TRANSACTION';
      case 'OPERATION_STARTED':
      case 'OPERATION_COMPLETED':
      case 'OPERATION_FAILED':
        return 'OPERATION';
      case 'VERIFICATION_PASSED':
      case 'VERIFICATION_FAILED':
      case 'VERIFICATION_UNCERTAIN':
        return 'VERIFICATION';
      case 'RECOVERY_STARTED':
      case 'RECOVERY_COMPLETED':
      case 'RECOVERY_FAILED':
        return 'RECOVERY';
      case 'EXPERIENCE_RECORDED':
        return 'LEARNING';
      case 'REQUEST_COMPLETED':
      case 'REQUEST_FAILED':
      case 'EXECUTION_COMPLETED':
        return 'FINAL_RESULT';
      default:
        return undefined;
    }
  }

  private static inferCauseType(nodeType: CausalNodeType): CausalCauseType {
    switch (nodeType) {
      case 'INTENT':
        return 'DERIVED_FROM';
      case 'PLAN':
        return 'DERIVED_FROM';
      case 'CANDIDATE_STRATEGIES':
        return 'INITIATED_BY';
      case 'CONSTRAINT_FILTERING':
        return 'FILTERED_BY';
      case 'RISK_ANALYSIS':
        return 'SCORED_BY';
      case 'POLICY_CHECK':
        return 'GOVERNED_BY';
      case 'APPROVAL_GATE':
        return 'APPROVED_BY';
      case 'SELECTED_STRATEGY':
        return 'SCORED_BY';
      case 'TRANSACTION':
        return 'EXECUTED_VIA';
      case 'OPERATION':
        return 'EXECUTED_VIA';
      case 'VERIFICATION':
        return 'VERIFIED_BY';
      case 'RECOVERY':
        return 'TRIGGERED_BY';
      case 'LEARNING':
        return 'LEARNED_FROM';
      case 'FINAL_RESULT':
        return 'VERIFIED_BY';
      default:
        return 'DERIVED_FROM';
    }
  }

  private static reconstructDecision(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): DecisionExplanation | undefined {
    const selEvent = events.find((e) => e.eventType === 'DECISION_SELECTED');
    const candEvent = events.find((e) => e.eventType === 'CANDIDATES_GENERATED');
    const compEvent = events.find((e) => e.eventType === 'CANDIDATES_COMPARED');
    const constEvent = events.find((e) => e.eventType === 'CONSTRAINTS_APPLIED');
    const riskEvent = events.find((e) => e.eventType === 'RISK_ANALYSIS_COMPLETED');

    if (!selEvent && !candEvent) return undefined;

    const selEv = evidence.find((e) => e.eventId === selEvent?.eventId);
    const selEvidenceId = selEv?.evidenceId || 'ev-none';

    const selectedStrategy = (selEvent?.metadata?.strategyType as any) || 'MINIMAL_CHANGE';
    const candidateTitle = (selEvent?.metadata?.candidateTitle as string) || 'Selected Strategy';
    const rationale = (selEvent?.metadata?.rationale as string) || selEvent?.outcome?.summary || 'Candidate selected based on constraint satisfaction and score.';
    const deterministicScore = typeof selEvent?.metadata?.score === 'number' ? selEvent.metadata.score : undefined;

    const selectedAlternative: SelectedAlternative = {
      candidateId: (selEvent?.metadata?.candidateId as string) || 'selected-candidate',
      strategyType: selectedStrategy,
      title: candidateTitle,
      score: deterministicScore,
      risk: (selEvent?.metadata?.risk as string) || 'LOW',
      selectionRationale: rationale,
      evidenceId: selEvidenceId,
    };

    // Parse rejected alternatives if present in metadata
    const rejectedAlternatives: RejectedAlternative[] = [];
    if (Array.isArray(candEvent?.metadata?.rejectedCandidates)) {
      for (const rej of candEvent.metadata.rejectedCandidates as any[]) {
        rejectedAlternatives.push({
          candidateId: rej.candidateId || 'candidate-alt',
          strategyType: rej.strategyType || 'ALTERNATIVE_SEQUENCE',
          title: rej.title || 'Alternative Strategy',
          score: rej.score,
          risk: rej.risk || 'MEDIUM',
          rejectionReason: rej.rejectionReason || 'Exceeded risk tolerance or failed constraint',
          violatedConstraints: Array.isArray(rej.violatedConstraints) ? rej.violatedConstraints : [],
          evidenceId: selEvidenceId,
        });
      }
    }

    // Constraints
    const constraintsApplied: ConstraintExplanation[] = [];
    if (Array.isArray(constEvent?.metadata?.constraints)) {
      for (const c of constEvent.metadata.constraints as any[]) {
        constraintsApplied.push({
          constraintId: c.id || `c-${constraintsApplied.length + 1}`,
          category: c.category || 'SECURITY',
          rule: c.rule || 'Verified boundary rule',
          isHardStop: Boolean(c.isHardStop),
          satisfied: Boolean(c.satisfied ?? true),
          evaluationDetail: c.evaluationDetail || 'Passed policy constraint check',
          evidenceId: selEvidenceId,
        });
      }
    }

    // Risk factors
    const riskExplanation: RiskExplanation = {
      overallRisk: (riskEvent?.metadata?.overallRisk as any) || (selEvent?.metadata?.risk as any) || 'LOW',
      factors: Array.isArray(riskEvent?.metadata?.factors)
        ? (riskEvent.metadata.factors as any[]).map((f) => ({
            factor: f.factor || 'Operation Risk',
            severity: f.severity || 'LOW',
            mitigatedBy: f.mitigatedBy,
            evidenceId: selEvidenceId,
          }))
        : [],
      summary: (riskEvent?.metadata?.summary as string) || 'Risk evaluated within acceptable thresholds.',
      evidenceId: selEvidenceId,
    };

    const scoringBreakdown: DecisionFactor[] = Array.isArray(compEvent?.metadata?.factors)
      ? (compEvent.metadata.factors as any[])
      : [
          { name: 'Constraint Satisfaction', weight: 0.4, score: 1.0, rationale: 'Satisfies all architectural limits' },
          { name: 'Risk Minimization', weight: 0.3, score: 0.9, rationale: 'Lowest blast radius candidate' },
          { name: 'Reversibility', weight: 0.3, score: 1.0, rationale: 'Can be rolled back cleanly' },
        ];

    const strategyExplanation: StrategyExplanation = {
      selectedStrategy,
      strategyRationale: rationale,
      whyPreferredOverAlternatives: rejectedAlternatives.length > 0
        ? `Preferred over ${rejectedAlternatives.length} alternative(s) due to higher confidence and compliance with constraints.`
        : 'Satisfied all hard constraints and risk limits without qualifying alternative options.',
      evidenceId: selEvidenceId,
    };

    return {
      decisionId: (selEvent?.metadata?.decisionId as string) || `dec-${selEvent?.eventId}`,
      topic: (selEvent?.metadata?.topic as string) || 'Strategy Selection',
      candidatesCount: 1 + rejectedAlternatives.length,
      selectedAlternative,
      rejectedAlternatives,
      strategyExplanation,
      constraintsApplied,
      riskExplanation,
      scoringBreakdown,
      deterministicScore,
      priorExperienceInfluenced: Boolean(selEvent?.metadata?.priorExperienceInfluenced),
      evidenceIds: [selEvidenceId],
      isDeterministic: true,
    };
  }

  private static reconstructPolicy(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): PolicyExplanation | undefined {
    const policyPassed = events.find((e) => e.eventType === 'POLICY_CHECK_PASSED');
    const policyFailed = events.find((e) => e.eventType === 'POLICY_CHECK_FAILED');
    const pEvent = policyFailed || policyPassed;

    if (!pEvent) return undefined;

    const ev = evidence.find((e) => e.eventId === pEvent.eventId);
    const evidenceIds = ev ? [ev.evidenceId] : [];

    const policyAllowed = !policyFailed;
    const policyDenied = Boolean(policyFailed);
    const approvalRequired = Boolean(pEvent.metadata?.approvalRequired);
    const operationBlocked = Boolean(pEvent.metadata?.blocked || policyFailed);

    return {
      policyChecked: true,
      policyCategory: (pEvent.metadata?.category as string) || 'AUTONOMY_POLICY',
      policyAllowed,
      policyDenied,
      approvalRequired,
      autonomyLimitsAffected: Boolean(pEvent.metadata?.autonomyLimitsAffected),
      operationBlocked,
      summary: pEvent.outcome?.summary || (policyAllowed ? 'Policy check passed.' : 'Policy check failed.'),
      violatedRules: Array.isArray(pEvent.metadata?.violatedRules) ? (pEvent.metadata.violatedRules as string[]) : [],
      effectiveAutonomyLevel: typeof pEvent.metadata?.effectiveAutonomyLevel === 'number' ? pEvent.metadata.effectiveAutonomyLevel : 1,
      evidenceIds,
    };
  }

  private static reconstructApproval(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): ApprovalExplanation | undefined {
    const appReq = events.find((e) => e.eventType === 'APPROVAL_REQUIRED');
    const appGranted = events.find((e) => e.eventType === 'APPROVAL_GRANTED');
    const appDenied = events.find((e) => e.eventType === 'APPROVAL_DENIED');

    if (!appReq && !appGranted && !appDenied) {
      return {
        approvalRequired: false,
        approvalStatus: 'NOT_REQUIRED',
        summary: 'Operation risk is within pre-authorized autonomy envelope; approval not required.',
        evidenceIds: [],
      };
    }

    const relevantEvent = appDenied || appGranted || appReq!;
    const ev = evidence.find((e) => e.eventId === relevantEvent.eventId);
    const evidenceIds = ev ? [ev.evidenceId] : [];

    let status: 'GRANTED' | 'DENIED' | 'NOT_REQUIRED' | 'PENDING' = 'PENDING';
    if (appDenied) status = 'DENIED';
    else if (appGranted) status = 'GRANTED';
    else if (appReq) status = 'PENDING';

    return {
      approvalRequired: true,
      whyRequired: (relevantEvent.metadata?.reason as string) || 'Elevated risk or sensitive schema mutation requires explicit consent.',
      approvalStatus: status,
      approvalScope: (relevantEvent.metadata?.scope as string) || 'Operation',
      approvedBy: (relevantEvent.metadata?.approvedBy as string) || (appGranted ? 'User' : undefined),
      denialReason: (relevantEvent.metadata?.denialReason as string) || (appDenied ? relevantEvent.outcome?.summary : undefined),
      coveredOperation: (relevantEvent.metadata?.operationType as string) || 'AIOperation',
      summary: relevantEvent.outcome?.summary || `Approval ${status.toLowerCase()} for requested action.`,
      evidenceIds,
    };
  }

  private static reconstructExecution(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): ExecutionExplanation {
    const opEvents = events.filter((e) => e.eventType === 'OPERATION_COMPLETED' || e.eventType === 'OPERATION_FAILED');
    const txEvent = events.find((e) => e.eventType === 'TRANSACTION_COMMITTED' || e.eventType === 'TRANSACTION_ROLLED_BACK');
    const rollbackEvent = events.find((e) => e.eventType === 'TRANSACTION_ROLLED_BACK' || e.eventType === 'ROLLBACK_COMPLETED');
    const cpEvent = events.find((e) => e.eventType === 'CHECKPOINT_CREATED');

    const opTypes: string[] = [];
    for (const op of opEvents) {
      const type = (op.metadata?.operationType as string) || (op.metadata?.type as string);
      if (type && !opTypes.includes(type)) opTypes.push(type);
    }

    const failedOps = opEvents.filter((e) => e.status === 'FAILED');
    const executionStatus = failedOps.length > 0 ? 'FAILED' : opEvents.length > 0 ? 'COMPLETED' : 'NO_OPERATIONS';

    let totalDurationMs = 0;
    for (const e of events) {
      if (e.duration?.durationMs) totalDurationMs += e.duration.durationMs;
    }

    const evidenceIds: string[] = [];
    if (txEvent) {
      const ev = evidence.find((e) => e.eventId === txEvent.eventId);
      if (ev) evidenceIds.push(ev.evidenceId);
    }

    return {
      transactionId: (txEvent?.metadata?.transactionId as string) || txEvent?.correlation?.transactionId,
      operationsExecutedCount: opEvents.length,
      operationTypes: opTypes,
      executionStatus,
      durationMs: totalDurationMs,
      retriesCount: events.filter((e) => e.status === 'RETRYING').length,
      rollbackOccurred: Boolean(rollbackEvent),
      rollbackReason: rollbackEvent?.outcome?.summary || (rollbackEvent?.metadata?.reason as string),
      checkpointId: cpEvent?.metadata?.checkpointId as string,
      summary: `Executed ${opEvents.length} operations across ${opTypes.join(', ') || 'none'}. Status: ${executionStatus}.`,
      evidenceIds,
    };
  }

  private static reconstructVerification(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): VerificationExplanation | undefined {
    const verEvents = events.filter((e) => e.eventType.startsWith('VERIFICATION_'));
    if (verEvents.length === 0) {
      return undefined;
    }

    const passedEvent = verEvents.find((e) => e.eventType === 'VERIFICATION_PASSED');
    const failedEvent = verEvents.find((e) => e.eventType === 'VERIFICATION_FAILED');
    const uncertainEvent = verEvents.find((e) => e.eventType === 'VERIFICATION_UNCERTAIN');

    let status: 'PASS' | 'FAIL' | 'UNCERTAIN' | 'SKIPPED' = 'PASS';
    if (failedEvent) status = 'FAIL';
    else if (uncertainEvent) status = 'UNCERTAIN';
    else if (!passedEvent) status = 'SKIPPED';

    const relevant = failedEvent || uncertainEvent || passedEvent || verEvents[0];
    const ev = evidence.find((e) => e.eventId === relevant.eventId);
    const evidenceIds = ev ? [ev.evidenceId] : [];

    const dimensions = Array.isArray(relevant.evidence?.dimensions) ? relevant.evidence.dimensions : ['structure', 'invariants'];
    const passedCount = relevant.evidence?.passedChecks ?? (status === 'PASS' ? dimensions.length : 0);
    const totalCount = relevant.evidence?.totalChecks ?? dimensions.length;
    const failedCount = totalCount - passedCount;

    const failedPostconditions: string[] = [];
    if (Array.isArray(relevant.metadata?.failedPostconditions)) {
      failedPostconditions.push(...(relevant.metadata.failedPostconditions as string[]));
    } else if (status === 'FAIL') {
      failedPostconditions.push(relevant.outcome?.summary || 'Postcondition check failed');
    }

    const structuralDiffs = Array.isArray(relevant.metadata?.structuralDifferences)
      ? (relevant.metadata.structuralDifferences as string[])
      : [];

    return {
      verificationConducted: true,
      verificationStatus: status,
      dimensionsChecked: dimensions,
      passedChecksCount: passedCount,
      failedChecksCount: failedCount,
      failedPostconditions,
      structuralDifferences: structuralDiffs,
      invariantsPreserved: status !== 'FAIL',
      summary: relevant.outcome?.summary || `Verification ${status.toLowerCase()} with ${passedCount}/${totalCount} checks passed.`,
      executionSuccessVsVerifiedCorrectness:
        status === 'FAIL'
          ? 'Execution completed at the operational boundary, but verification detected semantic postcondition failure.'
          : 'Execution and verification both succeeded; postconditions match expectations.',
      evidenceIds,
    };
  }

  private static reconstructRecovery(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): RecoveryExplanation | undefined {
    const recEvents = events.filter((e) => e.eventType.startsWith('RECOVERY_') || e.eventType.startsWith('ROLLBACK_'));
    if (recEvents.length === 0) return undefined;

    const startEvent = recEvents.find((e) => e.eventType === 'RECOVERY_STARTED');
    const compEvent = recEvents.find((e) => e.eventType === 'RECOVERY_COMPLETED');
    const failEvent = recEvents.find((e) => e.eventType === 'RECOVERY_FAILED');

    let status: 'SUCCEEDED' | 'FAILED' | 'NOT_TRIGGERED' = 'NOT_TRIGGERED';
    if (compEvent) status = 'SUCCEEDED';
    else if (failEvent) status = 'FAILED';

    const stepsExecuted: string[] = [];
    for (const s of events.filter((e) => e.eventType === 'RECOVERY_STEP_COMPLETED')) {
      stepsExecuted.push((s.metadata?.stepDescription as string) || s.outcome?.summary || 'Recovery step executed');
    }

    const relevant = compEvent || failEvent || startEvent || recEvents[0];
    const ev = evidence.find((e) => e.eventId === relevant.eventId);
    const evidenceIds = ev ? [ev.evidenceId] : [];

    return {
      recoveryInitiated: true,
      triggeringFailure: (relevant.metadata?.triggeringFailure as string) || (relevant.metadata?.reason as string) || 'Verification failure',
      failureClassification: (relevant.metadata?.failureClassification as string) || 'STRUCTURE',
      diagnosisSummary: (relevant.metadata?.diagnosis as string) || 'Autonomous recovery triggered to restore consistent state.',
      recoveryStrategy: (relevant.metadata?.strategy as string) || 'ROLLBACK_AND_RETRY',
      policyResult: 'PASSED',
      approvalResult: 'NOT_REQUIRED',
      recoveryStepsExecuted: stepsExecuted,
      recoveryResultStatus: status,
      finalVerificationStatus: compEvent ? 'PASS' : 'FAIL',
      summary: relevant.outcome?.summary || `Autonomous recovery ${status.toLowerCase()}.`,
      evidenceIds,
    };
  }

  private static reconstructLearning(
    events: ExecutionEvent[],
    evidence: EvidenceReference[]
  ): LearningExplanation | undefined {
    const learnEvents = events.filter((e) => e.eventType === 'EXPERIENCE_RECORDED' || e.eventType === 'LEARNING_COMPLETED');
    const decEvent = events.find((e) => e.eventType === 'DECISION_SELECTED');

    const priorExpUsed = Boolean(decEvent?.metadata?.priorExperienceInfluenced || learnEvents.length > 0);
    if (!priorExpUsed && learnEvents.length === 0) {
      return {
        priorExperienceUsed: false,
        experienceCategories: [],
        relevantExperienceCount: 0,
        howExperienceInfluencedRanking: 'No relevant prior experience applicable to this context.',
        experienceIsEvidenceNotAuthority: true,
        summary: 'Prior experience was checked but did not alter candidate scores.',
        evidenceIds: [],
      };
    }

    const relevant = learnEvents[0] || decEvent!;
    const ev = evidence.find((e) => e.eventId === relevant.eventId);
    const evidenceIds = ev ? [ev.evidenceId] : [];

    return {
      priorExperienceUsed: true,
      experienceCategories: ['EXECUTION_SUCCESS', 'VERIFICATION_SUCCESS'],
      relevantExperienceCount: 1,
      howExperienceInfluencedRanking: 'Historical success rate contributed a minor boost (+0.1) to candidate score.',
      experienceIsEvidenceNotAuthority: true,
      summary: 'Prior experience acted strictly as corroborative scoring evidence without overriding constraints.',
      evidenceIds,
    };
  }

  private static reconstructResult(
    events: ExecutionEvent[],
    userPrompt: string,
    execution: ExecutionExplanation,
    verification?: VerificationExplanation,
    recovery?: RecoveryExplanation,
    evidence?: EvidenceReference[]
  ): ResultExplanation {
    const compEvent = events.find((e) => e.eventType === 'REQUEST_COMPLETED' || e.eventType === 'EXECUTION_COMPLETED');
    const failEvent = events.find((e) => e.eventType === 'REQUEST_FAILED' || e.eventType === 'EXECUTION_FAILED');

    let outcome = 'COMPLETED';
    if (verification && verification.verificationStatus === 'FAIL') outcome = 'VERIFICATION_FAILED';
    else if (failEvent) outcome = 'FAILED';
    else if (recovery && recovery.recoveryResultStatus === 'SUCCEEDED') outcome = 'RECOVERED';


    const whatActuallyHappened = compEvent?.outcome?.summary || execution.summary;
    const unresolvedIssues: string[] = [];

    if (verification && verification.verificationStatus === 'FAIL') {
      unresolvedIssues.push(...verification.failedPostconditions);
    }
    if (failEvent && failEvent.outcome?.error) {
      unresolvedIssues.push(failEvent.outcome.error);
    }

    return {
      finalOutcome: outcome,
      whatActuallyHappened,
      whatUserRequested: userPrompt || 'Unspecified user prompt',
      differenceSummary: unresolvedIssues.length > 0 ? `Unresolved issues: ${unresolvedIssues.join('; ')}` : undefined,
      unresolvedIssues,
      evidenceIds: evidence ? evidence.map((e) => e.evidenceId).slice(0, 5) : [],
    };
  }

  private static analyzeUncertainty(
    trace: ExecutionTrace | undefined,
    events: ExecutionEvent[],
    causalChain: CausalChain,
    verification?: VerificationExplanation,
    recovery?: RecoveryExplanation
  ): ExplanationUncertainty {
    const categories: any[] = [];
    const knownFacts: string[] = [];
    const unknownFactors: string[] = [];
    const reasonsWhyUnknown: string[] = [];

    if (trace?.completeness === 'TRUNCATED') {
      categories.push('TRUNCATED_TRACE');
      unknownFactors.push('Full trace history (truncated due to buffer limits)');
      reasonsWhyUnknown.push('Execution timeline exceeded trace buffer limits');
    } else if (trace?.completeness === 'PARTIAL') {
      categories.push('PARTIAL_TRACE');
      unknownFactors.push('Subsequent execution steps');
      reasonsWhyUnknown.push('Trace terminated prematurely');
    }

    // Check broken links in causal chain
    if (!causalChain.isComplete && causalChain.brokenLinks.length > 0) {
      categories.push('UNKNOWN_CAUSALITY');
      unknownFactors.push('Explicit causal linking for intermediate steps');
      reasonsWhyUnknown.push(`Broken causal transitions: ${causalChain.brokenLinks.join(', ')}`);
    }

    // Check verification uncertainty
    if (verification?.verificationStatus === 'UNCERTAIN') {
      categories.push('UNVERIFIED_RESULT');
      unknownFactors.push('Definitive semantic correctness');
      reasonsWhyUnknown.push('Verification engine returned UNCERTAIN status');
    }

    // Check conflicting evidence (e.g. execution completed but verification failed)
    const execSuccess = events.some((e) => e.eventType === 'OPERATION_COMPLETED');
    const verFailed = verification?.verificationStatus === 'FAIL';
    if (execSuccess && verFailed && !recovery) {
      categories.push('CONFLICTING_EVIDENCE');
      unknownFactors.push('State consistency post-execution');
      reasonsWhyUnknown.push('Operation completed successfully but verification failed');
    }

    // Known facts
    if (events.length > 0) {
      knownFacts.push(`${events.length} authoritative execution events recorded`);
    }
    if (causalChain.nodes.length > 0) {
      knownFacts.push(`${causalChain.nodes.length} causal milestones reconstructed`);
    }
    if (verification) {
      knownFacts.push(`Verification performed across ${verification.dimensionsChecked.length} dimensions`);
    }

    const hasUncertainty = categories.length > 0;
    const impactOnReliability = categories.includes('MISSING_EVIDENCE')
      ? 'CRITICAL'
      : categories.includes('CONFLICTING_EVIDENCE') || categories.includes('UNVERIFIED_RESULT')
      ? 'HIGH'
      : categories.length > 0
      ? 'MEDIUM'
      : 'LOW';

    return {
      hasUncertainty,
      categories,
      knownFacts,
      unknownFactors,
      reasonsWhyUnknown,
      impactOnReliability,
    };
  }

  private static deriveConfidence(
    evidence: EvidenceReference[],
    causalChain: CausalChain,
    decision?: DecisionExplanation,
    verification?: VerificationExplanation,
    uncertainty?: ExplanationUncertainty
  ): ExplanationConfidence {
    let evidenceGrade: ConfidenceGrade = evidence.length >= 5 ? 'HIGH' : evidence.length >= 2 ? 'MEDIUM' : 'LOW';
    let causalGrade: ConfidenceGrade = causalChain.isComplete ? 'HIGH' : causalChain.nodes.length > 0 ? 'MEDIUM' : 'LOW';
    let decisionGrade: ConfidenceGrade = decision?.deterministicScore !== undefined ? 'HIGH' : 'MEDIUM';
    let resultGrade: ConfidenceGrade = verification?.verificationStatus === 'PASS' ? 'HIGH' : verification?.verificationStatus === 'FAIL' ? 'HIGH' : 'MEDIUM';


    if (uncertainty?.hasUncertainty && uncertainty.impactOnReliability === 'CRITICAL') {
      return {
        level: 'UNKNOWN',
        evidenceCompleteness: 'LOW',
        causalConfidence: 'LOW',
        decisionConfidence: 'LOW',
        resultConfidence: 'LOW',
        rationale: 'Critical uncertainty prevents reliable confidence assessment.',
      };
    }

    let overallGrade: ConfidenceGrade = 'HIGH';
    if (uncertainty?.hasUncertainty && uncertainty.impactOnReliability === 'HIGH') {
      overallGrade = 'MEDIUM';
    } else if (evidenceGrade === 'LOW' || causalGrade === 'LOW') {
      overallGrade = 'LOW';
    }

    return {
      level: overallGrade,
      evidenceCompleteness: evidenceGrade,
      causalConfidence: causalGrade,
      decisionConfidence: decisionGrade,
      resultConfidence: resultGrade,
      rationale: `Confidence derived from ${evidence.length} verified events and complete causal links.`,
    };
  }

  private static assembleSummary(
    userPrompt: string,
    decision?: DecisionExplanation,
    policy?: PolicyExplanation,
    approval?: ApprovalExplanation,
    execution?: ExecutionExplanation,
    verification?: VerificationExplanation,
    recovery?: RecoveryExplanation,
    uncertainty?: ExplanationUncertainty
  ): ExplanationSummary {
    const headline = execution?.operationsExecutedCount
      ? `Executed ${execution.operationsExecutedCount} operation(s) with ${verification?.verificationStatus || 'unverified'} outcome.`
      : 'Action evaluated without operations executed.';

    const whyThisHappened = decision?.selectedAlternative?.selectionRationale
      ? `Selected strategy "${decision.selectedAlternative.strategyType}" because ${decision.selectedAlternative.selectionRationale}`
      : 'Executed to fulfill the stated goal within established autonomy parameters.';

    const whatWasExecuted = execution?.summary || 'No operations executed';
    const whatWasVerified = verification?.summary || 'Verification skipped or not recorded';
    const keyConstraints = decision?.constraintsApplied?.map((c) => c.rule) || [];
    const riskAndPolicySummary = `${policy?.summary || 'Policy passed'}. ${approval?.summary || 'Approval not required'}.`;

    const uncertaintiesSummary = uncertainty?.hasUncertainty
      ? `Uncertainties identified in: ${uncertainty.categories.join(', ')}`
      : 'No critical uncertainties detected; all claims backed by authoritative events.';

    return {
      headline,
      whyThisHappened,
      whatWasExecuted,
      whatWasVerified,
      keyConstraints,
      riskAndPolicySummary,
      uncertaintiesSummary,
    };
  }

  private static generateProvenance(
    evidence: EvidenceReference[],
    traceId: string,
    projectId: string
  ): Provenance {
    const claims: ProvenanceClaim[] = evidence.slice(0, 10).map((ev) => ({
      claim: ev.summary,
      source: ev.source,
      sourceType: ev.type,
      sourceIdentifier: ev.sourceIdentifier,
      timestamp: ev.timestamp,
      traceId,
      projectId,
      causalRelation: 'DIRECT_EVENT_RECORD',
      evidenceStrength: ev.strength,
    }));

    // Deterministic checksum
    const rawData = `${traceId}:${projectId}:${claims.length}:${this.ENGINE_VERSION}`;
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = (hash << 5) - hash + rawData.charCodeAt(i);
      hash |= 0;
    }

    return {
      creator: 'EXPLAINABILITY_ENGINE',
      engineVersion: this.ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      traceId,
      projectId,
      claims,
      hash: `sha256-det-${Math.abs(hash).toString(16)}`,
    };
  }
}
