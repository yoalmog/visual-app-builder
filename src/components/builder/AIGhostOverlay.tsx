'use client';

import React from 'react';
import { useAIStore } from '@/ai/state/ai-store';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Sparkles, Check, X, RotateCcw, Eye, ShieldAlert, Cpu } from 'lucide-react';

export const AIGhostOverlay: React.FC = () => {
  const isGenerating = useAIStore((s) => s.isGenerating);
  const streamStage = useAIStore((s) => s.streamStage);
  const streamPercent = useAIStore((s) => s.streamPercent);
  const pendingOperations = useAIStore((s) => s.pendingOperations);
  const pendingApproval = useAIStore((s) => s.pendingApproval);
  const approvePending = useAIStore((s) => s.approvePending);
  const applyPlan = useAIStore((s) => s.applyPlan);
  const rollbackLast = useAIStore((s) => s.rollbackLast);
  const lastGenerationId = useAIStore((s) => s.lastGenerationId);
  const activeAdaptationProposals = useAIStore((s) => s.activeAdaptationProposals);

  const project = useBuilderStore((s) => s.project);
  const setProject = useBuilderStore((s) => s.setProject);

  const handleApprove = () => {
    if (!project) return;
    const updated = approvePending(project) || applyPlan(project);
    if (updated) {
      setProject(updated);
      useAIStore.setState({ error: null });
    }
  };

  const hasPending = (pendingOperations && pendingOperations.length > 0) || Boolean(pendingApproval);
  const hasAdaptation = activeAdaptationProposals && activeAdaptationProposals.length > 0;

  if (!isGenerating && !hasPending && !hasAdaptation) {
    return null;
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto select-none">
      {/* 1. Active Generation HUD */}
      {isGenerating && (
        <div className="bg-[#0D1017]/95 backdrop-blur-md border border-indigo-500/40 rounded-full px-4 py-2 shadow-2xl flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <Cpu className="w-3 h-3 animate-spin" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                AI Continuum Working...
              </span>
              <span className="text-[10px] font-mono text-indigo-400">
                {streamPercent}%
              </span>
            </div>
            {streamStage && (
              <span className="text-[10px] text-slate-400 truncate max-w-xs capitalize">
                {streamStage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Staging / Pending Approval Ghost Mode Floating Bar */}
      {hasPending && !isGenerating && (
        <div className="bg-[#0B0E17]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-2.5 px-4 shadow-2xl shadow-emerald-950/40 flex items-center gap-4 text-xs text-white">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-emerald-400 block">
                Ghost Staging Active
              </span>
              <span className="text-[11px] text-slate-400">
                {pendingOperations.length} proposed visual mutation{pendingOperations.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1E2436]" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all hover:scale-[1.02]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>

            {lastGenerationId && (
              <button
                onClick={rollbackLast}
                className="px-2.5 py-1.5 rounded-lg bg-[#151926] hover:bg-[#1E2436] border border-[#242C40] text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                title="Rollback mutations"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Rollback</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
