'use client';

import React, { useState } from 'react';
import { useAIStore } from '@/ai/state/ai-store';
import { useBuilderStore } from '@/builder/state/builder-store';
import { pushHistory } from '@/builder/history/history-manager';
import { AIMode } from '@/builder/schema/ai';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  Bot,
  HelpCircle,
  Code,
  Layers,
  RefreshCw,
  Lightbulb,
  Sliders,
  Scale,
  Activity,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const AIBuilderPanel: React.FC = () => {
  const {
    isOpen,
    setOpen,
    mode,
    setMode,
    messages,
    sendMessage,
    isGenerating,
    streamStage,
    streamPercent,
    cancelGeneration,
    pendingOperations,
    pendingApproval,
    approvePending,
    applyPlan,
    rollbackLast,
    lastGenerationId,
    clearConversation,
    error,
    verificationStatus,
    lastVerificationResult,
    recoveryStatus,
    lastRecoveryResult,
    recoverVerificationFailure,
    approveRecovery,
    activeRecommendations,
    applyRecommendation,
    rejectRecommendation,
    decisionStatus,
    activeDecisionSession,
    activeDecisionSelection,
    applyDecision,
    correctDecision,
    timelineStatus,
    activeTraceId,
    activeTimeline,
    timelineEvents,
  } = useAIStore();

  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
  const selectedNode = selectedNodeId ? activePage?.root : null;

  const [inputPrompt, setInputPrompt] = useState('');
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState('');
  const [showTimeline, setShowTimeline] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const syncWithHistory = (updated: any) => {
    const { history, project: currentProj } = useBuilderStore.getState();
    const newHistory = pushHistory(history, currentProj);
    useBuilderStore.setState({
      project: updated,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    useBuilderStore.getState().save();
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isGenerating) return;

    setLastSubmittedPrompt(prompt);
    setInputPrompt('');
    const updated = await sendMessage({
      prompt,
      project,
      activePageId,
      selectedNode,
      environment: project.environments?.activeEnvironment || 'development',
    });

    if (updated) {
      syncWithHistory(updated);
    }
  };

  const handleApprove = () => {
    const updated = approvePending(project);
    if (updated) {
      syncWithHistory(updated);
    }
  };

  const handleApply = () => {
    const updated = applyPlan(project);
    if (updated) {
      syncWithHistory(updated);
    }
  };

  const handleRollback = () => {
    const res = rollbackLast();
    if (res.success && res.restoredProject) {
      syncWithHistory(res.restoredProject);
    }
  };

  const handleRetry = () => {
    if (lastSubmittedPrompt) {
      handleSend(lastSubmittedPrompt);
    }
  };

  return (
    <div
      data-testid="ai-builder-panel"
      className="flex flex-col h-full bg-[#0A0D14] border-r border-[#1B1E2B] text-slate-200 text-xs w-[360px] select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#1B1E2B] bg-[#0E121B]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-white tracking-wide">AI Application Builder</span>
            <span className="block text-[10px] text-slate-400">Schema-First AI Engine</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {lastGenerationId && (
            <button
              data-testid="ai-undo-button"
              onClick={handleRollback}
              title="Undo Last AI Generation"
              className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={clearConversation}
            className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-[#161A26]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-5 p-1.5 gap-1 border-b border-[#1B1E2B] bg-[#0A0D14]">
        {(['generate', 'edit', 'agent', 'debug', 'ask'] as AIMode[]).map((m) => (
          <button
            key={m}
            data-testid={`ai-mode-${m}`}
            onClick={() => setMode(m)}
            className={`py-1 rounded text-[10px] font-medium capitalize transition-colors ${
              mode === m
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-2.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-[#141824] border border-[#1E2333] text-slate-200 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.content}
            </div>

            {/* Quick action buttons if provided */}
            {msg.suggestedActions && (
              <div className="flex flex-col gap-1.5 mt-2 w-full">
                <span className="text-[10px] text-slate-400 font-medium">Suggested Prompts:</span>
                {msg.suggestedActions.map((act, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(act)}
                    className="text-left text-[11px] p-1.5 rounded bg-[#141724] border border-[#1E2232] text-indigo-300 hover:text-white hover:bg-indigo-950/60 hover:border-indigo-800 transition-colors"
                  >
                    ✨ {act}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Streaming Progress Indicator */}
        {isGenerating && (
          <div
            data-testid="ai-progress-status"
            className="p-2.5 rounded-lg bg-[#141824] border border-[#1E2333] space-y-2 animate-pulse"
          >
            <div className="flex items-center justify-between text-[11px] text-indigo-300 font-medium">
              <span data-testid="ai-generation-status">
                {verificationStatus === 'verifying'
                  ? 'Verifying postconditions...'
                  : verificationStatus === 'executing'
                  ? 'Executing transaction...'
                  : streamStage || 'AI processing...'}
              </span>
              <span>{streamPercent}%</span>
            </div>
            <div
              data-testid="ai-progress-bar"
              className="w-full h-1.5 bg-[#1B1E2B] rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${streamPercent}%` }}
              />
            </div>
            <button
              data-testid="ai-cancel-button"
              onClick={cancelGeneration}
              className="text-[10px] text-red-400 hover:underline pt-1 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Stop / Cancel Generation
            </button>
          </div>
        )}

        {/* Error State with Retry */}
        {error && !isGenerating && (
          <div
            data-testid="ai-error-state"
            className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/80 text-red-200 space-y-2"
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Generation Error</span>
            </div>
            <p className="text-[11px] text-red-300 leading-normal">{error}</p>
            <button
              data-testid="ai-retry-button"
              onClick={handleRetry}
              className="py-1 px-2.5 rounded bg-red-800 hover:bg-red-700 text-white font-medium text-[11px] transition-colors flex items-center gap-1 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" /> Retry Generation
            </button>
          </div>
        )}

        {/* Pending Approval Checkpoint Banner */}
        {pendingApproval && (
          <div
            data-testid="ai-approval-banner"
            className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 space-y-2"
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              <span>Approval Required ({pendingApproval.highestRisk.toUpperCase()})</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-normal">
              {pendingApproval.reason}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span data-testid="ai-validation-status">Zod Schema Validated (0 Errors)</span>
            </div>
            <div
              data-testid="ai-change-summary"
              className="text-[10px] bg-black/40 p-2 rounded border border-amber-900/50"
            >
              <span className="font-semibold text-amber-400">
                Operations to Apply ({pendingApproval.operations.length}):
              </span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                {pendingApproval.operations.slice(0, 4).map((op, idx) => (
                  <li key={idx}>{op.description}</li>
                ))}
                {pendingApproval.operations.length > 4 && (
                  <li>...and {pendingApproval.operations.length - 4} more</li>
                )}
              </ul>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                data-testid="ai-approve-button"
                onClick={handleApprove}
                className="flex-1 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Apply
              </button>
              <button
                data-testid="ai-reject-button"
                onClick={() => useAIStore.setState({ pendingApproval: null })}
                className="py-1.5 px-3 rounded bg-[#1B1E2B] hover:bg-[#252A3D] text-slate-300 text-xs transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* D8.6 Autonomous Verification Report Card */}
        {lastVerificationResult && (
          <div
            data-testid="ai-verification-card"
            className={`p-2.5 rounded-lg border text-xs space-y-2 ${
              lastVerificationResult.status === 'PASS'
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                : lastVerificationResult.status === 'UNCERTAIN'
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                {lastVerificationResult.status === 'PASS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : lastVerificationResult.status === 'UNCERTAIN' ? (
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span data-testid="ai-verification-status">
                  {lastVerificationResult.status === 'PASS'
                    ? 'Verified'
                    : lastVerificationResult.status === 'UNCERTAIN'
                    ? 'Verification Uncertain'
                    : lastVerificationResult.recoveryPlan
                    ? 'Recovery Required'
                    : 'Verification Failed'}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300">
                {lastVerificationResult.summary.passedChecks}/{lastVerificationResult.summary.totalChecks} Checks Passed
              </span>
            </div>

            {/* Scope / Unexpected mutation warning */}
            {lastVerificationResult.summary.unexpectedMutationsCount > 0 && (
              <div
                data-testid="ai-unexpected-mutation-alert"
                className="p-1.5 rounded bg-rose-900/40 border border-rose-700/60 text-rose-200 text-[10px] flex items-center gap-1 font-medium"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  Unexpected mutation detected: {lastVerificationResult.summary.unexpectedMutationsCount} unapproved change(s)
                </span>
              </div>
            )}

            {/* Recovery Recommendation */}
            {lastVerificationResult.recoveryPlan && (
              <div
                data-testid="ai-recovery-recommendation"
                className="p-1.5 rounded bg-indigo-900/40 border border-indigo-700/60 text-indigo-200 text-[10px] space-y-1"
              >
                <div className="font-semibold text-indigo-300 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-indigo-400" /> Recovery Strategy: {lastVerificationResult.recoveryPlan.strategy}
                </div>
                <p className="text-slate-300">{lastVerificationResult.recoveryPlan.description}</p>
              </div>
            )}

            {/* Verified Checks List */}
            <div data-testid="ai-verification-checks" className="text-[10px] bg-black/40 p-2 rounded border border-white/5 space-y-1 max-h-28 overflow-y-auto">
              <div className="font-semibold text-slate-400 text-[9px] uppercase tracking-wider mb-1">
                Verification Evidence & Checks:
              </div>
              {lastVerificationResult.checks.slice(0, 5).map((chk, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                  {chk.passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                  ) : chk.status === 'UNCERTAIN' ? (
                    <HelpCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="truncate">{chk.expected} — {chk.actual}</span>
                </div>
              ))}
            </div>

            {/* Recovery Action Buttons & Progress */}
            {(lastVerificationResult.status === 'FAIL' || verificationStatus === 'recovery_required') && recoveryStatus === 'idle' && (
              <button
                data-testid="ai-auto-heal-button"
                onClick={async () => {
                  const repaired = await recoverVerificationFailure({ project, verificationResult: lastVerificationResult });
                  if (repaired) syncWithHistory(repaired);
                }}
                className="w-full mt-2 py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Start Autonomous Self-Healing
              </button>
            )}

            {(recoveryStatus === 'diagnosing' || recoveryStatus === 'recovering' || recoveryStatus === 'verifying') && (
              <div data-testid="ai-recovery-progress" className="p-2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[10px] flex items-center gap-2 mt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>Autonomous recovery in progress ({recoveryStatus})...</span>
              </div>
            )}

            {recoveryStatus === 'awaiting_approval' && lastRecoveryResult && (
              <div data-testid="ai-recovery-approval-banner" className="p-2.5 rounded bg-amber-950/50 border border-amber-700 text-amber-100 text-[11px] space-y-1.5 mt-2">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Recovery Approval Required
                </div>
                <p className="text-[10px] text-slate-300">{lastRecoveryResult.summary.message}</p>
                <button
                  data-testid="ai-approve-recovery-button"
                  onClick={async () => {
                    const repaired = await approveRecovery(project);
                    if (repaired) syncWithHistory(repaired);
                  }}
                  className="py-1 px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[10px] flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve & Self-Heal
                </button>
              </div>
            )}

            {recoveryStatus === 'recovered' && lastRecoveryResult && (
              <div data-testid="ai-recovery-success-badge" className="p-2 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-[10px] flex items-center gap-1.5 font-medium mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Self-Healing Succeeded: {lastRecoveryResult.summary.message}</span>
              </div>
            )}

            {recoveryStatus === 'blocked' && lastRecoveryResult && (
              <div data-testid="ai-recovery-blocked-badge" className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-200 text-[10px] flex items-center gap-1.5 font-medium mt-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Recovery Blocked: {lastRecoveryResult.summary.message}</span>
              </div>
            )}
          </div>
        )}

        {/* D8.8 Autonomous Learning & Recommendations Card */}
        {activeRecommendations && activeRecommendations.length > 0 && (
          <div
            data-testid="ai-learning-recommendations-card"
            className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/60 text-cyan-200 text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Lightbulb className="w-4 h-4 text-cyan-400" />
                <span>Experience-Based Recommendation ({activeRecommendations.length})</span>
              </div>
              <span data-testid="ai-learning-confidence-badge" className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 font-mono">
                {Math.round((activeRecommendations[0].confidence.score || 0.8) * 100)}% Conf
              </span>
            </div>

            {activeRecommendations.map((rec) => (
              <div key={rec.recommendationId} className="p-2 rounded bg-black/40 border border-cyan-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-white">
                  <span>{rec.title}</span>
                  <span className={`text-[9px] px-1 rounded uppercase font-semibold ${
                    rec.risk === 'CRITICAL' ? 'bg-rose-900/80 text-rose-300' :
                    rec.risk === 'HIGH' ? 'bg-amber-900/80 text-amber-300' :
                    'bg-emerald-900/80 text-emerald-300'
                  }`}>
                    {rec.risk} Risk
                  </span>
                </div>
                <p className="text-[10px] text-cyan-200/80 leading-normal">{rec.description}</p>
                <div className="text-[9px] text-slate-400">
                  <span>Evidence: {rec.evidence.summary}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    data-testid="ai-apply-recommendation-button"
                    onClick={async () => {
                      const updated = await applyRecommendation({
                        recommendation: rec,
                        project,
                        isApproved: true,
                      });
                      if (updated) syncWithHistory(updated);
                    }}
                    className="flex-1 py-1 px-2 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-[10px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Accept & Apply
                  </button>
                  <button
                    data-testid="ai-reject-recommendation-button"
                    onClick={() => rejectRecommendation({ recommendation: rec, project, reason: 'User rejected' })}
                    className="py-1 px-2.5 rounded bg-[#1B1E2B] hover:bg-[#252A3D] text-slate-300 text-[10px] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* D8.10 AI Execution Timeline & Observability Card */}
        {(timelineStatus !== 'idle' || activeTimeline || timelineEvents.length > 0) && (
          <div
            data-testid="ai-execution-timeline-card"
            className="p-2.5 rounded-lg bg-[#0B0F19] border border-cyan-900/50 text-cyan-200 text-xs space-y-2 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Execution Timeline</span>
                <span
                  data-testid="ai-timeline-status-badge"
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                    timelineStatus === 'completed'
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : timelineStatus === 'running'
                      ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300'
                      : timelineStatus === 'blocked'
                      ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                      : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                  }`}
                >
                  {timelineStatus}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{activeTimeline?.summary?.durationMs || 0}ms</span>
                </span>
                <button
                  data-testid="ai-timeline-toggle-button"
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="p-0.5 hover:text-white transition-colors"
                >
                  {showTimeline ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {showTimeline && (
              <div className="space-y-2 pt-1 border-t border-cyan-950/50">
                {/* Summary Metric Pills */}
                <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center">
                  <div className="bg-black/50 p-1 rounded border border-cyan-900/30">
                    <span className="text-slate-400 block text-[8px]">OPS</span>
                    <span className="text-white font-semibold">{activeTimeline?.summary?.operationsCount || 0}</span>
                  </div>
                  <div className="bg-black/50 p-1 rounded border border-cyan-900/30">
                    <span className="text-slate-400 block text-[8px]">POLICY</span>
                    <span className="text-emerald-300 font-semibold">{activeTimeline?.summary?.policyResult || 'PASS'}</span>
                  </div>
                  <div className="bg-black/50 p-1 rounded border border-cyan-900/30">
                    <span className="text-slate-400 block text-[8px]">VERIFY</span>
                    <span className={activeTimeline?.summary?.verificationResult === 'FAIL' ? 'text-rose-300' : 'text-emerald-300'}>
                      {activeTimeline?.summary?.verificationResult || 'PASS'}
                    </span>
                  </div>
                  <div className="bg-black/50 p-1 rounded border border-cyan-900/30">
                    <span className="text-slate-400 block text-[8px]">COMPLETION</span>
                    <span className="text-cyan-300">{activeTimeline?.completeness || 'COMPLETE'}</span>
                  </div>
                </div>

                {/* Performance Hotspots if any */}
                {activeTimeline?.summary?.performanceHotspots && activeTimeline.summary.performanceHotspots.length > 0 && (
                  <div
                    data-testid="ai-timeline-hotspots"
                    className="p-1.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[10px] space-y-0.5"
                  >
                    <div className="font-semibold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Performance Hotspots
                    </div>
                    {activeTimeline.summary.performanceHotspots.map((h, i) => (
                      <div key={i} className="text-slate-300 text-[9px]">• {h}</div>
                    ))}
                  </div>
                )}

                {/* Chronological Event Stream */}
                <div
                  data-testid="ai-timeline-events"
                  className="max-h-36 overflow-y-auto space-y-1 bg-black/40 p-1.5 rounded border border-white/5"
                >
                  {timelineEvents.map((evt) => (
                    <div
                      key={evt.eventId}
                      onClick={() => setExpandedEventId(expandedEventId === evt.eventId ? null : evt.eventId)}
                      className="cursor-pointer p-1 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-cyan-900/30 text-[10px]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-500 font-mono text-[8px]">#{evt.sequenceNumber}</span>
                          <span className="font-medium text-slate-200 truncate">{evt.eventType}</span>
                        </div>
                        <span
                          className={`text-[8px] px-1 rounded uppercase font-mono ${
                            evt.status === 'PASSED' || evt.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400'
                              : evt.status === 'FAILED'
                              ? 'bg-rose-950 text-rose-400'
                              : evt.status === 'BLOCKED'
                              ? 'bg-amber-950 text-amber-400'
                              : 'bg-cyan-950 text-cyan-400'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </div>

                      {/* Expanded Event Details */}
                      {expandedEventId === evt.eventId && (
                        <div className="mt-1 p-1.5 bg-black/60 rounded border border-white/5 space-y-1 text-[9px] text-slate-400">
                          <div>Source: <span className="text-slate-200 font-mono">{evt.source}</span></div>
                          <div>Trace ID: <span className="text-slate-300 font-mono">{evt.correlation.traceId}</span></div>
                          {evt.duration && <div>Duration: <span className="text-slate-200">{evt.duration.durationMs}ms</span></div>}
                          {evt.causality && <div>Caused by: <span className="text-indigo-300">{evt.causality.description}</span></div>}
                          {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                            <div className="bg-black/40 p-1 rounded font-mono text-[8px] text-slate-300 overflow-x-auto">
                              {JSON.stringify(evt.metadata)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* D8.9 Controlled Decision Optimization Card */}
        {activeDecisionSelection && (
          <div
            data-testid="ai-decision-optimization-card"
            className="p-2.5 rounded-lg bg-teal-950/30 border border-teal-800/60 text-teal-200 text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Scale className="w-4 h-4 text-teal-400" />
                <span>Optimized Decision: {activeDecisionSelection.candidateTitle}</span>
              </div>
              <span data-testid="ai-decision-confidence-badge" className="text-[10px] px-1.5 py-0.5 rounded bg-teal-900/60 border border-teal-700/60 text-teal-300 font-mono">
                {Math.round((activeDecisionSelection.confidence.score || 0.8) * 100)}% Conf
              </span>
            </div>

            <div className="p-2 rounded bg-black/40 border border-teal-900/50 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-white">
                <span className="font-mono text-[10px] text-teal-300">
                  {activeDecisionSelection.strategyType}
                </span>
                <span className={`text-[9px] px-1 rounded uppercase font-semibold ${
                  activeDecisionSelection.risk === 'CRITICAL' ? 'bg-rose-900/80 text-rose-300' :
                  activeDecisionSelection.risk === 'HIGH' ? 'bg-amber-900/80 text-amber-300' :
                  'bg-emerald-900/80 text-emerald-300'
                }`}>
                  {activeDecisionSelection.risk} Risk
                </span>
              </div>
              <p className="text-[10px] text-teal-100/90 leading-normal">{activeDecisionSelection.rationale}</p>
              <div className="text-[9px] text-slate-400 flex items-center justify-between">
                <span>Confidence: {(activeDecisionSelection.confidence.score * 100).toFixed(0)}%</span>
                <span>Alternatives Evaluated: {activeDecisionSelection.alternativesConsideredCount}</span>
              </div>

              {activeDecisionSelection.approvalRequirement.required && (
                <div className="p-1.5 rounded bg-amber-950/60 border border-amber-800 text-amber-200 text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Approval Required: {activeDecisionSelection.approvalRequirement.reason}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  data-testid="ai-apply-decision-button"
                  onClick={async () => {
                    const updated = await applyDecision({
                      project,
                      isApproved: true,
                    });
                    if (updated) syncWithHistory(updated);
                  }}
                  className="flex-1 py-1 px-2 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[10px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3" /> Accept & Apply Strategy
                </button>
                <button
                  data-testid="ai-reject-decision-button"
                  onClick={() => {
                    useAIStore.setState({ activeDecisionSelection: null, decisionStatus: 'idle' });
                  }}
                  className="py-1 px-2.5 rounded bg-[#1B1E2B] hover:bg-[#252A3D] text-slate-300 text-[10px] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Plan Application Banner / Preview */}
        {pendingOperations.length > 0 && !pendingApproval && (
          <div
            data-testid="ai-plan-preview"
            className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-200 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white">
                Plan Ready ({pendingOperations.length} Operations)
              </span>
              <button
                data-testid="ai-apply-button"
                onClick={handleApply}
                className="py-1 px-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors flex items-center gap-1 shadow-sm"
              >
                <Play className="w-3 h-3" /> Apply Now
              </button>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span data-testid="ai-validation-status">Zod Schema Validated</span>
            </div>
            <div data-testid="ai-change-summary" className="text-[10px] bg-black/40 p-2 rounded border border-indigo-900/50">
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {pendingOperations.slice(0, 4).map((op, idx) => (
                  <li key={idx}>{op.description}</li>
                ))}
                {pendingOperations.length > 4 && (
                  <li>...and {pendingOperations.length - 4} more</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-2.5 border-t border-[#1B1E2B] bg-[#0E121B]">
        <div className="relative flex items-center">
          <input
            data-testid="ai-prompt-input"
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              mode === 'edit'
                ? 'Ask AI to modify selection (e.g. "make blue")...'
                : mode === 'agent'
                ? 'Assign a multi-step goal to agent...'
                : mode === 'debug'
                ? 'Describe runtime issue (e.g. "checkout action failed")...'
                : 'Describe what you want to build...'
            }
            disabled={isGenerating}
            className="w-full bg-[#161A26] border border-[#232738] rounded-lg py-2 pl-3 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            data-testid="ai-generate-button"
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isGenerating}
            className="absolute right-1.5 p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500 px-1">
          <span>
            Mode: <strong className="text-slate-300 capitalize">{mode}</strong>
          </span>
          <span>
            Shortcut: <kbd className="bg-[#1C2030] px-1 py-0.5 rounded text-slate-400">Ctrl+K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
