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
  } = useAIStore();

  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
  const selectedNode = selectedNodeId ? activePage?.root : null;

  const [inputPrompt, setInputPrompt] = useState('');
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState('');

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
              <span data-testid="ai-generation-status">{streamStage || 'AI processing...'}</span>
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
