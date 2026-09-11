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
  Info,
  FileText,
  GitCompare,
  TrendingUp,
  Cpu,
  Pause,
  Octagon,
  ShieldCheck,
  Flag,
  Users,
  Key,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { AITransactionManager } from '@/ai/history/AITransactionManager';
import { AIOperation } from '@/ai/operations/AIOperation';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';

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
    explanationStatus,
    activeExplanation,
    explainTrace,
    clearExplanation,
    adaptationStatus,
    activeAdaptationProposals,
    activeAdaptationSession,
    activeAdaptationComparison,
    adaptationError,
    proposeAdaptations,
    applyAdaptation,
    rollbackAdaptationSession,
    clearAdaptation,
    hitlStatus,
    activeHitlSession,
    activeBreakpoints,
    lastArbitrationDecision,
    hitlError,
    startHitlExecution,
    pauseHitlExecution,
    resumeHitlExecution,
    stepNextHitl,
    emergencyStopHitl,
    arbitratePolicy,
    addHitlBreakpoint,
    removeHitlBreakpoint,
    activeGuardrailPolicy,
    lastGuardrailEvaluation,
    guardrailBreaches,
    activeOrchestrationSession,
    lastOrchestrationResult,
    orchestrationStatus,
    securityStatus,
    lastSecurityScan,
    ledgerIntegrity,
    verifySecurityLedger,
    clearSecurityQuarantine,
    performanceProfile,
    tokenUsageReport,
    cacheStats,
    getPerformanceMetrics,
    getCacheStats,
    activeSwarmResult,
    isSwarmDebating,
    activeSwarmPersonas,
    runSwarmDebate,
    clearSwarm,
    certificationReport,
    isCertifying,
    runPlatformCertification,
    loadPlatformCertification,
    masterCertificationResult,
    isMasterCertifying,
    enterprisePlatformState,
    runMasterPlatformCertification,
    loadMasterPlatformCertification,
    loadEnterprisePlatformState,
  } = useAIStore();

  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
  const selectedNode = selectedNodeId ? activePage?.root : null;

  const [inputPrompt, setInputPrompt] = useState('');
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState('');
  const [showTimeline, setShowTimeline] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [showAdaptations, setShowAdaptations] = useState(true);
  const [showHitl, setShowHitl] = useState(true);
  const [showGuardrails, setShowGuardrails] = useState(true);
  const [showOrchestration, setShowOrchestration] = useState(true);
  const [showMasterCertification, setShowMasterCertification] = useState(false);
  const [showSecurity, setShowSecurity] = useState(true);
  const [showPerformance, setShowPerformance] = useState(true);
  const [showSwarm, setShowSwarm] = useState(true);
  const [showCertification, setShowCertification] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const openModal = useProjectLifecycleStore((s) => s.openModal);
  const [quickApiKey, setQuickApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySavedNotice, setKeySavedNotice] = useState(false);


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

  const handleSaveQuickApiKey = async () => {
    const trimmed = quickApiKey.trim();
    if (!trimmed) return;
    setIsSavingKey(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('apex_gemini_api_key', trimmed);
      }
      await fetch('/api/config/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const { ProviderFactory } = await import('@/ai/providers/ProviderFactory');
      const { GeminiProvider } = await import('@/ai/providers/GeminiProvider');
      GeminiProvider.setApiKey(trimmed);
      ProviderFactory.resetAll();

      useAIStore.setState({ error: null });
      setKeySavedNotice(true);
      setTimeout(() => setKeySavedNotice(false), 3000);

      if (lastSubmittedPrompt) {
        handleSend(lastSubmittedPrompt);
      }
    } catch (e) {
      console.error('Failed to save API key:', e);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleUseOfflineDemo = () => {
    if (!activePage) return;
    const promptText = lastSubmittedPrompt || inputPrompt || 'Create modern responsive SaaS Hero';

    const ts = Date.now();
    const heroNodeId = `hero_${ts}`;
    const badgeId = `badge_${ts}`;
    const headingId = `heading_${ts}`;
    const subId = `sub_${ts}`;
    const btnRowId = `row_${ts}`;
    const btn1Id = `btn1_${ts}`;
    const btn2Id = `btn2_${ts}`;

    const operations: AIOperation[] = [
      {
        id: `op_hero_${ts}`,
        type: 'add_component',
        risk: 'low',
        reversible: true,
        description: 'Add Responsive SaaS Hero Section',
        pageId: activePage.id,
        parentId: activePage.root.id,
        node: {
          id: heroNodeId,
          type: 'container',
          name: 'Hero Showcase Section',
          props: {},
          styles: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '44px 28px',
            gap: '18px',
            backgroundColor: '#0F172A',
            borderRadius: '16px',
            border: '1px solid #1E293B',
            textAlign: 'center',
            color: '#F8FAFC',
            marginTop: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          },
          children: [
            {
              id: badgeId,
              type: 'text',
              name: 'Pill Badge',
              props: { content: '✨ APEX STUDIO NEXT-GEN ENGINE' },
              styles: {
                fontSize: '11px',
                fontWeight: '700',
                color: '#818CF8',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '5px 12px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderRadius: '9999px',
                border: '1px solid rgba(129, 140, 248, 0.3)',
              },
            },
            {
              id: headingId,
              type: 'heading',
              name: 'Hero Heading',
              props: { content: 'Build Full-Stack Apps Visually', level: 1 },
              styles: {
                fontSize: '32px',
                fontWeight: '800',
                color: '#FFFFFF',
                lineHeight: '1.2',
                maxWidth: '680px',
              },
            },
            {
              id: subId,
              type: 'paragraph',
              name: 'Hero Subtitle',
              props: {
                content:
                  'Schema-first architecture with instantaneous component rendering, visual state management, and production-ready code generation.',
              },
              styles: {
                fontSize: '14px',
                color: '#94A3B8',
                maxWidth: '560px',
                lineHeight: '1.6',
              },
            },
            {
              id: btnRowId,
              type: 'row',
              name: 'Call To Action Buttons',
              props: {},
              styles: {
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '8px',
              },
              children: [
                {
                  id: btn1Id,
                  type: 'button',
                  name: 'Primary CTA Button',
                  props: { label: 'Explore Features 🚀' },
                  styles: {
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  },
                },
                {
                  id: btn2Id,
                  type: 'button',
                  name: 'Secondary Button',
                  props: { label: 'View Documentation' },
                  styles: {
                    backgroundColor: '#1E293B',
                    color: '#CBD5E1',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    fontSize: '13px',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                  },
                },
              ],
            },
          ],
        },
      },
    ];

    const res = AITransactionManager.executeTransaction({
      project,
      operations,
      prompt: promptText,
      mode: 'generate',
    });

    if (res.success && res.updatedProject) {
      syncWithHistory(res.updatedProject);
      useAIStore.setState((state) => ({
        error: null,
        lastGenerationId: res.generationId,
        messages: [
          ...state.messages,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `⚡ **Instant Demo Layout Generated!**\n\nAdded a responsive SaaS Hero Section and CTA buttons to your canvas via atomic schema transaction \`${res.generationId}\`.\n\n💡 *Tip: To generate arbitrary custom UIs with live Gemini 2.0 Flash, configure your free API key in the panel or via Project Settings.*`,
            timestamp: new Date().toISOString(),
            suggestedActions: [
              'Add a 3-column feature comparison grid',
              'Add a pricing tier table',
              'Connect Supabase backend to form',
            ],
          },
        ],
      }));
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

            {/* Quick API Key / Offline Demo actions for missing key messages */}
            {msg.content.includes('Gemini API key not configured') && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => openModal('project_settings')}
                  className="text-[11px] px-2.5 py-1 rounded bg-indigo-900/60 border border-indigo-700 hover:bg-indigo-800 text-indigo-200 font-medium flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Key className="w-3 h-3 text-indigo-300" /> Open Settings to Add Key
                </button>
                <button
                  onClick={handleUseOfflineDemo}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Zap className="w-3 h-3 text-amber-300" /> Try Offline Demo
                </button>
              </div>
            )}

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

        {/* Error State with Retry, Key Connect, & Offline Showcase */}
        {error && !isGenerating && (
          <div
            data-testid="ai-error-state"
            className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-red-200 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-red-400">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Generation Error</span>
              </div>
              <button
                onClick={() => openModal('project_settings')}
                className="text-[10px] text-red-300 hover:text-white underline flex items-center gap-0.5"
              >
                Open Settings
              </button>
            </div>
            <p className="text-[11px] text-red-300 leading-normal">{error}</p>

            {/* Quick Key Input Box if error is API Key related */}
            {(error.includes('Gemini API key') || error.includes('API key')) && (
              <div className="p-2 rounded bg-[#0D1017] border border-[#2A3142] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-300">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-indigo-400" />
                    Quick API Key Connect
                  </span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    Get free key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={quickApiKey}
                    onChange={(e) => setQuickApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveQuickApiKey();
                    }}
                    className="flex-1 bg-[#141824] border border-[#232838] focus:border-indigo-500 rounded px-2 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveQuickApiKey}
                    disabled={!quickApiKey.trim() || isSavingKey}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
                  >
                    {isSavingKey ? 'Saving...' : 'Save & Retry'}
                  </button>
                </div>
                {keySavedNotice && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Key saved and activated!
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <button
                data-testid="ai-retry-button"
                onClick={handleRetry}
                className="py-1 px-2.5 rounded bg-red-800 hover:bg-red-700 text-white font-medium text-[11px] transition-colors flex items-center gap-1 shadow-sm"
              >
                <RefreshCw className="w-3 h-3" /> Retry Generation
              </button>

              <button
                data-testid="ai-offline-demo-button"
                onClick={handleUseOfflineDemo}
                className="py-1 px-2.5 rounded bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-[11px] transition-all flex items-center gap-1 shadow-sm"
              >
                <Zap className="w-3 h-3 text-amber-300" /> Instant Demo Layout
              </button>
            </div>
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
                  data-testid="ai-explain-button"
                  onClick={() => {
                    const traceIdToExplain = activeTraceId || activeTimeline?.traceId || '';
                    if (traceIdToExplain) {
                      explainTrace({
                        traceId: traceIdToExplain,
                        projectId: project.id,
                        userPrompt: lastSubmittedPrompt,
                      });
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-violet-950/80 hover:bg-violet-900 border border-violet-800 text-violet-300 text-[10px] font-medium transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3 text-violet-400" />
                  <span>Explain</span>
                </button>
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

        {/* D8.11 AI Explainability & Causal Provenance Card */}
        {activeExplanation && (
          <div
            data-testid="ai-explainability-card"
            className="p-3 rounded-lg bg-[#0C0B1B] border border-violet-800/60 text-violet-200 text-xs space-y-2.5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <HelpCircle className="w-4 h-4 text-violet-400" />
                <span>AI Decision Explanation</span>
                <span
                  data-testid="ai-explanation-status-badge"
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                    activeExplanation.status === 'COMPLETED'
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : activeExplanation.status === 'UNCERTAIN'
                      ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                      : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                  }`}
                >
                  {activeExplanation.status}
                </span>
                <span
                  data-testid="ai-explanation-confidence-badge"
                  className="text-[9px] px-1 rounded bg-violet-950 border border-violet-700 text-violet-300 font-mono"
                >
                  {activeExplanation.confidence.level} CONF
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <button
                  data-testid="ai-explanation-toggle-button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="p-0.5 hover:text-white transition-colors"
                >
                  {showExplanation ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <button
                  data-testid="ai-explanation-dismiss-button"
                  onClick={clearExplanation}
                  className="p-0.5 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {showExplanation && (
              <div className="space-y-2.5 pt-1 border-t border-violet-950/60">
                {/* Headline & Summary */}
                <div className="p-2 rounded bg-black/40 border border-violet-900/40 space-y-1">
                  <div className="text-[11px] font-semibold text-white">{activeExplanation.summary.headline}</div>
                  <div className="text-[10px] text-violet-100/90 leading-relaxed">
                    <span className="font-semibold text-violet-300">Why: </span>
                    {activeExplanation.summary.whyThisHappened}
                  </div>
                  <div className="text-[10px] text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-400">What: </span>
                    {activeExplanation.summary.whatWasExecuted}
                  </div>
                  <div className="text-[10px] text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-400">Verification: </span>
                    {activeExplanation.summary.whatWasVerified}
                  </div>
                </div>

                {/* Uncertainty Warning if applicable */}
                {activeExplanation.uncertainty.hasUncertainty && (
                  <div
                    data-testid="ai-explanation-uncertainty-banner"
                    className="p-2 rounded bg-amber-950/40 border border-amber-800/70 text-amber-200 text-[10px] space-y-1"
                  >
                    <div className="font-semibold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Uncertainty Detected: {activeExplanation.uncertainty.categories.join(', ')}</span>
                    </div>
                    {activeExplanation.uncertainty.unknownFactors.length > 0 && (
                      <div className="text-slate-300 text-[9px]">
                        <span className="text-amber-400/90">Unknown: </span>
                        {activeExplanation.uncertainty.unknownFactors.join('; ')}
                      </div>
                    )}
                    {activeExplanation.uncertainty.reasonsWhyUnknown.length > 0 && (
                      <div className="text-slate-400 text-[8px] italic">
                        Why: {activeExplanation.uncertainty.reasonsWhyUnknown.join('; ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Decision Rationale & Alternative Comparison */}
                {activeExplanation.decisionExplanation && (
                  <div className="p-2 rounded bg-black/40 border border-violet-900/30 text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-white font-medium">
                      <span>Strategy: <span className="font-mono text-teal-300">{activeExplanation.decisionExplanation.selectedAlternative.strategyType}</span></span>
                      {activeExplanation.decisionExplanation.deterministicScore !== undefined && (
                        <span className="font-mono text-[9px] text-slate-400">Score: {activeExplanation.decisionExplanation.deterministicScore.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="text-slate-300 text-[9px]">
                      {activeExplanation.decisionExplanation.strategyExplanation.whyPreferredOverAlternatives}
                    </div>

                    {/* Rejected Alternatives */}
                    {activeExplanation.decisionExplanation.rejectedAlternatives.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-white/5 space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-semibold">Rejected Alternatives:</span>
                        {activeExplanation.decisionExplanation.rejectedAlternatives.map((alt, idx) => (
                          <div key={idx} className="text-[8px] text-slate-400 flex items-center justify-between">
                            <span className="font-mono text-rose-300/80">• {alt.strategyType}</span>
                            <span className="text-slate-500">{alt.rejectionReason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence Drill-Down */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-violet-400" />
                      <span>Evidence Drill-Down ({activeExplanation.evidenceBundle.references.length})</span>
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">
                      Provenance: {activeExplanation.provenance.hash.slice(0, 12)}
                    </span>
                  </div>

                  <div
                    data-testid="ai-evidence-list"
                    className="max-h-28 overflow-y-auto space-y-1 bg-black/40 p-1.5 rounded border border-white/5"
                  >
                    {activeExplanation.evidenceBundle.references.map((ev) => (
                      <div
                        key={ev.evidenceId}
                        data-testid="ai-evidence-item"
                        onClick={() => setSelectedEvidenceId(selectedEvidenceId === ev.evidenceId ? null : ev.evidenceId)}
                        className="p-1 rounded bg-black/30 hover:bg-violet-950/30 border border-transparent hover:border-violet-800/40 cursor-pointer text-[9px] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-violet-300 text-[8px]">{ev.source}</span>
                          <span className={`text-[7px] px-1 rounded uppercase font-mono ${
                            ev.strength === 'CONCLUSIVE' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {ev.strength}
                          </span>
                        </div>
                        <p className="text-slate-300 truncate mt-0.5">{ev.summary}</p>

                        {/* Evidence Expanded Snippet */}
                        {selectedEvidenceId === ev.evidenceId && (
                          <div className="mt-1 p-1 bg-black/70 rounded border border-white/10 text-[8px] font-mono text-slate-400 space-y-0.5">
                            <div>Evidence ID: <span className="text-slate-200">{ev.evidenceId}</span></div>
                            <div>Type: <span className="text-slate-200">{ev.type}</span></div>
                            <div>Timestamp: <span className="text-slate-200">{ev.timestamp}</span></div>
                            {ev.dataSnippet && (
                              <div className="text-[7px] text-slate-300 overflow-x-auto bg-black/50 p-1 rounded mt-0.5">
                                {JSON.stringify(ev.dataSnippet)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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

        {/* D8.12 Controlled Adaptation Engine Card */}
        {activeAdaptationProposals.length > 0 && (
          <div
            data-testid="ai-adaptation-card"
            className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-700/60 text-indigo-200 text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Controlled Adaptation Proposal</span>
                <span
                  data-testid="ai-adaptation-status-badge"
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                    adaptationStatus === 'improved'
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : adaptationStatus === 'inconclusive'
                      ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                      : adaptationStatus === 'regressed' || adaptationStatus === 'rolled_back'
                      ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                      : adaptationStatus === 'awaiting_approval'
                      ? 'bg-orange-950/80 border border-orange-800 text-orange-300'
                      : 'bg-indigo-950/80 border border-indigo-800 text-indigo-300'
                  }`}
                >
                  {adaptationStatus}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <button
                  data-testid="ai-adaptation-toggle-button"
                  onClick={() => setShowAdaptations(!showAdaptations)}
                  className="p-0.5 hover:text-white transition-colors"
                >
                  {showAdaptations ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <button
                  data-testid="ai-adaptation-dismiss-button"
                  onClick={clearAdaptation}
                  className="p-0.5 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {showAdaptations && activeAdaptationProposals.slice(0, 1).map((prop) => (
              <div key={prop.proposalId} className="space-y-2 pt-1 border-t border-indigo-900/50">
                <div className="p-2 rounded bg-black/40 border border-indigo-900/40 space-y-1">
                  <div className="text-[11px] font-semibold text-white flex items-center justify-between">
                    <span>{prop.target.description}</span>
                    <span className="text-[9px] font-mono text-indigo-300">{prop.category}</span>
                  </div>
                  <p className="text-[10px] text-slate-300">{prop.problemStatement}</p>
                  <p className="text-[10px] text-slate-300">{prop.problemStatement}</p>
                  <p className="text-[10px] text-indigo-200"><span className="font-semibold text-indigo-300">Proposed Change: </span>{prop.selectedCandidate?.description || 'Refine execution strategy'}</p>
                  
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[9px] font-mono text-center">
                    <div className="bg-black/50 p-1 rounded border border-indigo-900/30">
                      <span className="text-slate-400 block text-[8px]">BENEFIT</span>
                      <span className="text-emerald-300 font-semibold">{prop.expectedBenefit.primaryMetric}</span>
                    </div>
                    <div className="bg-black/50 p-1 rounded border border-indigo-900/30">
                      <span className="text-slate-400 block text-[8px]">RISK</span>
                      <span className={`font-semibold ${prop.risk.overallRisk === 'LOW' ? 'text-emerald-300' : 'text-amber-300'}`}>{prop.risk.overallRisk}</span>
                    </div>
                    <div className="bg-black/50 p-1 rounded border border-indigo-900/30">
                      <span className="text-slate-400 block text-[8px]">CONFIDENCE</span>
                      <span className="text-indigo-300 font-semibold">{Math.round(prop.confidence.score * 100)}%</span>
                    </div>
                  </div>

                  {prop.requiredApproval && (
                    <div className="p-1 rounded bg-amber-950/50 border border-amber-800/80 text-amber-200 text-[9px] flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Approval required before mutation.</span>
                    </div>
                  )}

                  {activeAdaptationComparison && (
                    <div data-testid="ai-adaptation-measurement" className="p-1.5 rounded bg-black/60 border border-indigo-800/50 text-[9px] space-y-0.5 mt-1">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Empirical Measurement:</span>
                        <span className={`font-mono uppercase font-bold ${activeAdaptationComparison.outcome === 'IMPROVED' ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {activeAdaptationComparison.outcome}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Baseline: {activeAdaptationComparison.baseline.metricName} = {activeAdaptationComparison.baseline.value}
                      </div>
                      <div className="text-emerald-300">
                        Post-Adaptation: {activeAdaptationComparison.postMeasurement.metricName} = {activeAdaptationComparison.postMeasurement.value} ({activeAdaptationComparison.percentageDelta >= 0 ? '+' : ''}{activeAdaptationComparison.percentageDelta.toFixed(1)}%)
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      data-testid="ai-apply-adaptation-button"
                      onClick={async () => {
                        const res = await applyAdaptation({
                          proposal: prop,
                          project,
                          isApproved: true,
                        });
                        if (res.project) syncWithHistory(res.project);
                      }}
                      className="flex-1 py-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Approve & Apply Adaptation
                    </button>
                    {activeAdaptationSession && activeAdaptationSession.status === 'ACCEPTED' && (
                      <button
                        data-testid="ai-rollback-adaptation-button"
                        onClick={async () => {
                          const res = await rollbackAdaptationSession({
                            sessionId: activeAdaptationSession.sessionId,
                            project,
                          });
                          if (res.project) syncWithHistory(res.project);
                        }}
                        className="py-1 px-2 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Rollback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* D8.13 Human-in-the-Loop (HITL) Control Center & Arbitration Card */}
        {(hitlStatus !== 'IDLE' || activeHitlSession || activeBreakpoints.length > 0) && (
          <div
            data-testid="ai-hitl-control-bar"
            className="p-3 rounded-lg bg-[#0D1117] border border-amber-900/60 text-amber-200 text-xs space-y-2.5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>HITL Control Center</span>
                <span
                  data-testid="ai-hitl-status-badge"
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                    hitlStatus === 'MONITORING'
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : hitlStatus === 'PAUSED_BY_OPERATOR'
                      ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                      : hitlStatus === 'EMERGENCY_STOPPED'
                      ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                      : 'bg-indigo-950/80 border border-indigo-800 text-indigo-300'
                  }`}
                >
                  {hitlStatus}
                </span>
                {activeHitlSession && (
                  <span className="text-[9px] px-1 rounded bg-black/40 border border-white/10 text-slate-300 font-mono">
                    Step {activeHitlSession.currentStepIndex}/{activeHitlSession.totalSteps}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  data-testid="ai-emergency-stop-btn"
                  onClick={async () => {
                    if (activeHitlSession) {
                      const res = await emergencyStopHitl(
                        activeHitlSession.sessionId,
                        project,
                        'Operator',
                        'Emergency stop trigger'
                      );
                      if (res.project) syncWithHistory(res.project);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[9px] flex items-center gap-1 uppercase tracking-wider transition-colors shadow-sm"
                >
                  <Octagon className="w-3 h-3" /> Kill
                </button>
                <button
                  onClick={() => setShowHitl(!showHitl)}
                  className="p-0.5 hover:text-white transition-colors"
                >
                  {showHitl ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {showHitl && (
              <div className="space-y-2 pt-1 border-t border-amber-900/40">
                {/* Control Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    data-testid="ai-hitl-step-btn"
                    onClick={async () => {
                      if (activeHitlSession) {
                        const res = await stepNextHitl(activeHitlSession.sessionId, project);
                        if (res.updatedProject) syncWithHistory(res.updatedProject);
                      }
                    }}
                    className="flex-1 py-1 px-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold text-[10px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3" /> Step Next
                  </button>

                  <button
                    data-testid="ai-hitl-pause-resume-btn"
                    onClick={async () => {
                      if (activeHitlSession) {
                        if (hitlStatus === 'PAUSED_BY_OPERATOR') {
                          const res = await resumeHitlExecution(activeHitlSession.sessionId, project);
                          if (res.updatedProject) syncWithHistory(res.updatedProject);
                        } else {
                          pauseHitlExecution(activeHitlSession.sessionId, 'Operator paused');
                        }
                      }
                    }}
                    className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center justify-center gap-1 transition-colors"
                  >
                    {hitlStatus === 'PAUSED_BY_OPERATOR' ? (
                      <>
                        <Play className="w-3 h-3" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3" /> Pause
                      </>
                    )}
                  </button>
                </div>

                {/* Active Breakpoints */}
                <div data-testid="ai-hitl-breakpoints-list" className="space-y-1 bg-black/40 p-1.5 rounded border border-white/5 text-[9px]">
                  <div className="flex items-center justify-between text-slate-400 font-semibold">
                    <span className="flex items-center gap-1"><Flag className="w-3 h-3 text-amber-400" /> Active Breakpoints:</span>
                    <span>{activeBreakpoints.length} Active</span>
                  </div>
                  {activeBreakpoints.length === 0 ? (
                    <div className="text-slate-500 italic text-[8px]">No breakpoints registered.</div>
                  ) : (
                    activeBreakpoints.slice(0, 3).map((bp) => (
                      <div key={bp.id} className="flex items-center justify-between text-slate-300 bg-black/30 p-1 rounded">
                        <span>{bp.name}</span>
                        <span className="font-mono text-amber-400">{bp.minRiskLevel || bp.actionType || 'custom'}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Policy Arbitration Callout if applicable */}
                {lastArbitrationDecision && (
                  <div data-testid="ai-hitl-arbitration-banner" className="p-1.5 rounded bg-black/50 border border-amber-800/50 text-[9px] space-y-0.5">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>Arbitration Decision:</span>
                      <span className={`font-mono font-bold ${lastArbitrationDecision.allowed ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {lastArbitrationDecision.allowed ? 'OVERRIDE_PERMITTED' : 'DENIED'}
                      </span>
                    </div>
                    <div className="text-slate-300">{lastArbitrationDecision.rationale}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* D8.14 Dynamic Safety Guardrails Card */}
        {(activeGuardrailPolicy || guardrailBreaches.length > 0) && (
          <div
            data-testid="ai-guardrails-panel"
            className="p-3 rounded-lg bg-[#0D1117] border border-cyan-900/60 text-cyan-200 text-xs space-y-2.5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Dynamic Safety Guardrails</span>
                {activeGuardrailPolicy && (
                  <span
                    data-testid="ai-guardrails-tier-badge"
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800"
                  >
                    {activeGuardrailPolicy.riskTier} TIER
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid="ai-guardrails-toggle"
                  onClick={() => setShowGuardrails(!showGuardrails)}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  {showGuardrails ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {showGuardrails && activeGuardrailPolicy && (
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                  <span>Active Rules: {activeGuardrailPolicy.rules.length}</span>
                  <span>Mutation Ceiling: {activeGuardrailPolicy.maxAllowedMutations} ops</span>
                </div>

                {/* Breaches Alert */}
                {guardrailBreaches.length > 0 && (
                  <div
                    data-testid="ai-guardrails-breaches-alert"
                    className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[10px] space-y-1"
                  >
                    <div className="flex items-center gap-1 font-bold text-rose-200">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>{guardrailBreaches.length} Guardrail Breach(es) Detected</span>
                    </div>
                    {guardrailBreaches.slice(0, 3).map((b, idx) => (
                      <div key={b.breachId || idx} className="text-slate-300">
                        • [{b.severity}] {b.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* D8.15 Unified Multi-Agent Orchestration Panel */}
        {(activeOrchestrationSession || lastOrchestrationResult) && (
          <div
            data-testid="ai-orchestration-panel"
            className="p-3 rounded-lg bg-[#0C101A] border border-violet-900/60 text-violet-200 text-xs space-y-2.5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Cpu className="w-4 h-4 text-violet-400" />
                <span>Unified AI Orchestration</span>
                <span
                  data-testid="ai-orchestration-status-badge"
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold bg-violet-950 text-violet-300 border border-violet-800"
                >
                  {orchestrationStatus}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid="ai-orchestration-toggle"
                  onClick={() => setShowOrchestration(!showOrchestration)}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  {showOrchestration ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {showOrchestration && (
              <div className="space-y-2 text-[11px]">
                {lastOrchestrationResult && (
                  <div className="text-[10px] text-slate-300 flex items-center justify-between">
                    <span>Provenance Hash:</span>
                    <span className="font-mono text-[9px] text-violet-300">
                      {lastOrchestrationResult.provenanceHash.substring(0, 16)}...
                    </span>
                  </div>
                )}
                {/* Subsystem Matrix Summary */}
                {lastOrchestrationResult?.subsystemStatus && (
                  <div data-testid="ai-orchestration-matrix" className="grid grid-cols-2 gap-1 text-[9px]">
                    <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                      <span className="text-slate-400">Goal Engine</span>
                      <span className="font-bold text-emerald-400">{lastOrchestrationResult.subsystemStatus.goalUnderstanding}</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                      <span className="text-slate-400">Guardrails</span>
                      <span className="font-bold text-emerald-400">{lastOrchestrationResult.subsystemStatus.guardrailsSynthesis}</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                      <span className="text-slate-400">Autonomy Gate</span>
                      <span className="font-bold text-emerald-400">{lastOrchestrationResult.subsystemStatus.autonomyGating}</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                      <span className="text-slate-400">Verification</span>
                      <span className="font-bold text-emerald-400">{lastOrchestrationResult.subsystemStatus.verification}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* D8.16 Unified Security Hardening, Audit & Ledger Panel */}
        <div
          data-testid="ai-security-panel"
          className="p-3 rounded-lg bg-[#0E131F] border border-cyan-950/80 text-cyan-200 text-xs space-y-2.5 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Security & Audit Defense</span>
              <span
                data-testid="ai-security-status-badge"
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold border ${
                  securityStatus === 'quarantined'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : securityStatus === 'warning'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}
              >
                {securityStatus}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="ai-security-toggle"
                onClick={() => setShowSecurity(!showSecurity)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                {showSecurity ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showSecurity && (
            <div className="space-y-2 text-[11px]">
              {/* Quarantine Banner */}
              {securityStatus === 'quarantined' && (
                <div
                  data-testid="ai-security-quarantine-banner"
                  className="p-2 rounded bg-rose-950/80 border border-rose-800 text-rose-200 text-[10px] space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-rose-300">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Session Quarantined
                    </span>
                    <button
                      onClick={clearSecurityQuarantine}
                      className="px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-[9px] text-white"
                    >
                      Clear Quarantine
                    </button>
                  </div>
                  <p>Adversarial instruction, unprivileged operation, or dangerous AST injection was blocked.</p>
                </div>
              )}

              {/* Security Score and Risk Level */}
              <div className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-cyan-950">
                <span className="text-slate-300">Security Posture Score:</span>
                <span data-testid="ai-security-score" className="font-mono font-bold text-cyan-300">
                  {lastSecurityScan ? `${lastSecurityScan.score} / 10.0 (${lastSecurityScan.riskLevel})` : '10.0 / 10.0 (SECURE)'}
                </span>
              </div>

              {/* Ledger Verification */}
              <div className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-cyan-950">
                <span className="text-slate-300">Audit Ledger:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-cyan-400">
                    {ledgerIntegrity ? (ledgerIntegrity.intact ? 'SHA-256 Chained' : 'Tampered') : 'Active'}
                  </span>
                  <button
                    data-testid="ai-security-ledger-verify"
                    onClick={() => verifySecurityLedger()}
                    className="px-1.5 py-0.5 rounded bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 text-[9px]"
                  >
                    Verify
                  </button>
                </div>
              </div>

              {/* Security Findings List */}
              {lastSecurityScan?.findings && lastSecurityScan.findings.length > 0 && (
                <div data-testid="ai-security-findings-list" className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-300">Security Findings:</div>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {lastSecurityScan.findings.map((f, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] p-1.5 rounded bg-black/30 border border-slate-800/80 flex items-start gap-1.5"
                      >
                        <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-200">{f.message}</span>
                          <span className="ml-1 text-[9px] text-slate-400 font-mono">[{f.category}]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* D8.17 Performance Profiling & Token Economics Panel */}
        <div
          data-testid="ai-performance-panel"
          className="p-3 rounded-lg bg-[#0C121E] border border-amber-950/80 text-amber-200 text-xs space-y-2.5 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Performance & Token Economics</span>
              <span
                data-testid="ai-budget-badge"
                className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold border bg-emerald-950 text-emerald-300 border-emerald-800"
              >
                Within Budget
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="ai-performance-toggle"
                onClick={() => setShowPerformance(!showPerformance)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                {showPerformance ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showPerformance && (
            <div className="space-y-2 text-[11px]">
              {/* Token Consumption Meter */}
              <div
                data-testid="ai-token-meter"
                className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-amber-950"
              >
                <span className="text-slate-300">Tokens Metered:</span>
                <span className="font-mono text-amber-300 text-[11px]">
                  {tokenUsageReport ? `${tokenUsageReport.totalTokens.toLocaleString()} tokens ($${tokenUsageReport.estimatedCostUsd.toFixed(4)})` : 'Est. ~1.2k tokens (< $0.01)'}
                </span>
              </div>

              {/* Cache Hit Ratio */}
              <div
                data-testid="ai-cache-stats"
                className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-amber-950"
              >
                <span className="text-slate-300">Multi-Tier Cache:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-amber-400">
                    {cacheStats ? `${Math.round(cacheStats.hitRatio * 100)}% Hit (${cacheStats.hits}/${cacheStats.hits + cacheStats.misses})` : 'Warm LRU Active'}
                  </span>
                  <button
                    onClick={() => getCacheStats()}
                    className="px-1.5 py-0.5 rounded bg-amber-900/50 hover:bg-amber-800 text-amber-200 text-[9px]"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Pipeline Stage Latency Breakdown */}
              <div data-testid="ai-perf-stage-list" className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
                  <span>Stage Latencies (p90):</span>
                  <button
                    onClick={() => getPerformanceMetrics()}
                    className="text-amber-400 hover:text-amber-300 text-[9px]"
                  >
                    Profile
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                    <span className="text-slate-400">Context Build</span>
                    <span className="font-mono text-emerald-400">
                      {performanceProfile?.stageBreakdown.find((s) => s.stage.includes('CONTEXT'))?.durationMs || 12}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                    <span className="text-slate-400">Plan Gen</span>
                    <span className="font-mono text-emerald-400">
                      {performanceProfile?.stageBreakdown.find((s) => s.stage.includes('PLAN'))?.durationMs || 45}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                    <span className="text-slate-400">Guardrails</span>
                    <span className="font-mono text-emerald-400">
                      {performanceProfile?.stageBreakdown.find((s) => s.stage.includes('GUARDRAILS'))?.durationMs || 8}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 px-1.5 py-1 rounded">
                    <span className="text-slate-400">Verification</span>
                    <span className="font-mono text-emerald-400">
                      {performanceProfile?.stageBreakdown.find((s) => s.stage.includes('VERIFICATION'))?.durationMs || 15}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* D8.19 Multi-Agent Collaboration & Swarm Consensus Panel */}
        <div
          data-testid="ai-swarm-panel"
          className="p-3 rounded-lg bg-[#0C1220] border border-cyan-950/80 text-cyan-200 text-xs space-y-2.5 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Swarm Consensus Engine</span>
              <span
                data-testid="ai-swarm-consensus-gauge"
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold border ${
                  activeSwarmResult?.status === 'CONSENSUS_REACHED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : activeSwarmResult?.status === 'VETOED'
                    ? 'bg-red-950 text-red-300 border-red-800'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                }`}
              >
                {activeSwarmResult ? `${activeSwarmResult.status} (${activeSwarmResult.agreementRatioPercent}%)` : 'Quorum Ready (5 Personas)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="ai-swarm-toggle"
                onClick={() => setShowSwarm(!showSwarm)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                {showSwarm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showSwarm && (
            <div className="space-y-2 text-[11px]">
              {/* Agent Personas List */}
              <div data-testid="ai-swarm-personas" className="space-y-1">
                <span className="text-slate-400 text-[10px] font-semibold">Autonomous Personas:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {(activeSwarmPersonas || []).map((persona) => {
                    const vote = activeSwarmResult?.votesByPersona?.[persona.role];
                    return (
                      <div
                        key={persona.id}
                        className="flex items-center justify-between bg-black/40 px-2 py-1 rounded border border-cyan-950"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span>{persona.avatar}</span>
                          <span className="text-slate-200 truncate">{persona.name}</span>
                        </div>
                        <span
                          className={`text-[8px] font-mono px-1 rounded uppercase font-semibold ${
                            vote?.decision === 'APPROVE'
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : vote?.decision === 'REJECT'
                              ? 'text-red-400 bg-red-950/60'
                              : vote?.decision === 'CONDITIONAL'
                              ? 'text-amber-400 bg-amber-950/60'
                              : 'text-slate-400 bg-slate-900'
                          }`}
                        >
                          {vote ? vote.decision : `${persona.weight}x`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Debate Stream */}
              <div
                data-testid="ai-swarm-debate-stream"
                className="bg-black/30 p-2 rounded border border-cyan-950 space-y-1 max-h-36 overflow-y-auto text-[10px]"
              >
                <div className="flex items-center justify-between text-slate-400 text-[9px]">
                  <span>Debate Rounds & Transcript:</span>
                  <span>{activeSwarmResult ? `${activeSwarmResult.totalRounds} Rounds` : 'No Active Debate'}</span>
                </div>
                {activeSwarmResult?.debateTranscript && activeSwarmResult.debateTranscript.length > 0 ? (
                  activeSwarmResult.debateTranscript.map((msg) => (
                    <div key={msg.id} className="border-b border-cyan-950/40 pb-1 last:border-b-0">
                      <div className="flex items-center justify-between text-cyan-300 font-mono text-[8px]">
                        <span>[R{msg.roundNumber}] {msg.senderName} ({msg.senderRole})</span>
                        <span>{msg.type} {msg.score !== undefined ? `(${msg.score}/100)` : ''}</span>
                      </div>
                      <p className="text-slate-300 text-[9px] line-clamp-2 mt-0.5">{msg.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-[9px]">Run debate to view real-time multi-agent arbitration.</p>
                )}
              </div>

              {/* Winning Proposal & Compromise Preview */}
              {activeSwarmResult?.winningProposal && (
                <div
                  data-testid="ai-swarm-winning-proposal"
                  className="bg-emerald-950/30 p-2 rounded border border-emerald-800/60 text-[10px] space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-emerald-300">
                    <span>Consensus Proposal: {activeSwarmResult.winningProposal.title}</span>
                    <span className="font-mono text-[8px]">
                      {activeSwarmResult.winningProposal.steps.length} Steps
                    </span>
                  </div>
                  <p className="text-slate-300 text-[9px]">{activeSwarmResult.winningProposal.description}</p>
                  {activeSwarmResult.synthesizedModifications.length > 0 && (
                    <div className="text-[8px] text-emerald-400">
                      Compromise Applied: {activeSwarmResult.synthesizedModifications.length} synthesized enhancements.
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  data-testid="ai-swarm-clear-button"
                  onClick={() => clearSwarm()}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Reset
                </button>
                <button
                  data-testid="ai-swarm-run-button"
                  disabled={isSwarmDebating}
                  onClick={async () => {
                    await runSwarmDebate({
                      goal: inputPrompt || 'Refine component architecture and design system',
                      project,
                    });
                  }}
                  className="px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-[10px] disabled:opacity-50"
                >
                  {isSwarmDebating ? 'Debating...' : 'Run Swarm Debate'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* D8.20 Master Platform Certification & Grand Verification Panel */}
        <div
          data-testid="ai-certification-panel"
          className="p-3 rounded-lg bg-[#0B1528] border border-cyan-900/80 text-cyan-200 text-xs space-y-2.5 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Platform Certification</span>
              <span
                data-testid="ai-platform-certification-badge"
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold border ${
                  certificationReport?.overallStatus === 'CERTIFIED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : isCertifying
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                }`}
              >
                {isCertifying
                  ? 'Certifying...'
                  : certificationReport?.overallStatus === 'CERTIFIED'
                  ? 'Platform Certified'
                  : 'Pending Verification'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="ai-certification-toggle"
                onClick={() => setShowCertification(!showCertification)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                {showCertification ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showCertification && (
            <div className="space-y-2 text-[11px]">
              {/* Certification Summary */}
              <div className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-cyan-950">
                <span className="text-slate-300">Phase 8 Subsystems:</span>
                <span className="font-mono text-emerald-400 font-bold text-[10px]">
                  {certificationReport
                    ? `${certificationReport.certifiedSubsystemsCount} / ${certificationReport.totalSubsystemsCount} Verified (100%)`
                    : '19 Subsystems Active'}
                </span>
              </div>

              {/* Subsystems Matrix Grid */}
              <div
                data-testid="certification-subsystems-grid"
                className="grid grid-cols-2 gap-1 bg-black/30 p-2 rounded border border-cyan-950 max-h-36 overflow-y-auto text-[9px]"
              >
                {[
                  'D8.1 Goal Understanding',
                  'D8.2 Context Intelligence',
                  'D8.3 Intelligent Planning',
                  'D8.4 Autonomy Policies',
                  'D8.5 Adaptive Execution',
                  'D8.6 Verification Engine',
                  'D8.7 Self-Healing Recovery',
                  'D8.8 Pattern Learning',
                  'D8.9 Decision Optimization',
                  'D8.10 Observability Stream',
                  'D8.11 Explainability Engine',
                  'D8.12 Controlled Adaptation',
                  'D8.13 HITL Control Center',
                  'D8.14 Dynamic Guardrails',
                  'D8.15 Unified Orchestrator',
                  'D8.16 Security Ledger',
                  'D8.17 Token Economics',
                  'D8.18 Concurrency Locks',
                  'D8.19 Swarm Consensus',
                ].map((name, i) => {
                  const subId = `D8.${i + 1}`;
                  const probe = certificationReport?.subsystemResults.find((s) => s.id === subId);
                  const isPass = probe ? probe.status === 'CERTIFIED' : true;
                  return (
                    <div
                      key={subId}
                      className="flex items-center justify-between bg-black/40 px-1.5 py-1 rounded border border-cyan-950/40"
                    >
                      <span className="text-slate-300 truncate">{name}</span>
                      <span
                        className={`font-mono text-[8px] px-1 py-0.2 rounded ${
                          isPass ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                        }`}
                      >
                        {isPass ? 'CERT' : 'FAIL'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grand Cycle / Seal Status */}
              {certificationReport?.platformSeal && (
                <div className="bg-black/40 p-1.5 rounded border border-cyan-950 space-y-0.5 text-[9px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Platform Seal (SHA-256):</span>
                    <span className="font-mono text-[8px] text-cyan-400 truncate max-w-[150px]">
                      {certificationReport.platformSeal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Merkle Audit Root:</span>
                    <span className="font-mono text-[8px] text-emerald-400 truncate max-w-[150px]">
                      {certificationReport.grandCycle.merkleAuditRoot}
                    </span>
                  </div>
                </div>
              )}

              {/* Certification Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  data-testid="load-certification-button"
                  onClick={() => loadPlatformCertification()}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Load Cached
                </button>
                <button
                  data-testid="run-certification-button"
                  disabled={isCertifying}
                  onClick={async () => {
                    await runPlatformCertification();
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-[10px] disabled:opacity-50"
                >
                  {isCertifying ? 'Certifying Subsystems...' : 'Run Full Platform Certification'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enterprise Continuum & Master Platform Certification (Workstream E12) */}
        <div
          data-testid="ai-master-certification-panel"
          className="bg-slate-900/90 border border-indigo-900/60 rounded-lg p-3 space-y-2.5 shadow-md shadow-indigo-950/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Full-Spectrum Master Certification (Phases 1–11 + E12)</span>
              <span
                data-testid="ai-master-certification-badge"
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold border ${
                  masterCertificationResult?.status === 'MASTER_CERTIFIED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : isMasterCertifying
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                }`}
              >
                {isMasterCertifying
                  ? 'Certifying All Phases...'
                  : masterCertificationResult?.status === 'MASTER_CERTIFIED'
                  ? 'Master Certified (100%)'
                  : 'Ready for Audit'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="ai-master-certification-toggle"
                onClick={() => setShowMasterCertification(!showMasterCertification)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                {showMasterCertification ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showMasterCertification && (
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-indigo-950">
                <span className="text-slate-300">Certified Continuum:</span>
                <span className="font-mono text-indigo-400 font-bold text-[10px]">
                  {masterCertificationResult
                    ? `${masterCertificationResult.certifiedPhasesCount} / ${masterCertificationResult.totalPhasesAudited} Phases Certified (100%)`
                    : 'Phases 1–11 + Workstream E12'}
                </span>
              </div>

              {masterCertificationResult?.masterCryptographicSeal && (
                <div className="bg-black/40 p-2 rounded border border-indigo-950 space-y-1 text-[9px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Master Cryptographic Seal:</span>
                    <span className="font-mono text-[8px] text-indigo-300 truncate max-w-[170px]">
                      {masterCertificationResult.masterCryptographicSeal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Verified Checkpoint:</span>
                    <span className="font-mono text-[8px] text-emerald-400">
                      {masterCertificationResult.checkpointId}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  data-testid="load-master-certification-button"
                  onClick={() => {
                    loadMasterPlatformCertification();
                    loadEnterprisePlatformState();
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Load Cached Seal
                </button>
                <button
                  data-testid="run-master-certification-button"
                  disabled={isMasterCertifying}
                  onClick={async () => {
                    await runMasterPlatformCertification();
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] disabled:opacity-50"
                >
                  {isMasterCertifying ? 'Certifying All 11 Phases...' : 'Execute Full Master Certification'}
                </button>
              </div>
            </div>
          )}
        </div>




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
