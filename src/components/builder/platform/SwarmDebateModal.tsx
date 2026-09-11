'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { SwarmConsensusEngine } from '@/ai/swarm/SwarmConsensusEngine';
import {
  SwarmConsensusResult,
  EnterpriseAgentPersonaRole,
  SwarmMessage,
  ProposedModification,
} from '@/ai/swarm/swarm-types';
import { PerformanceProfilerEngine } from '@/ai/performance/PerformanceProfilerEngine';
import { TokenEconomicsEngine } from '@/ai/performance/TokenEconomicsEngine';
import { StageLatencyMetric } from '@/ai/performance/performance-types';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Award,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
  Cpu,
  Zap,
  TrendingDown,
  Check,
} from 'lucide-react';

interface SwarmDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERSONA_BADGES: Record<
  EnterpriseAgentPersonaRole,
  { label: string; icon: string; roleColor: string; specialty: string }
> = {
  ARCHITECT: {
    label: 'Chief Architect',
    icon: '🏛️',
    roleColor: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    specialty: 'AST Structure & Scalability',
  },
  UX_DESIGNER: {
    label: 'Lead UX Designer',
    icon: '🎨',
    roleColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    specialty: 'Design Tokens & Visual Rhythm',
  },
  SECURITY_OFFICER: {
    label: 'Security Officer (Veto)',
    icon: '🛡️',
    roleColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    specialty: 'AST Sandboxing & NoEval Defense',
  },
  DATA_ENGINEER: {
    label: 'Data Systems Lead',
    icon: '💾',
    roleColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    specialty: 'Schema & Referential Integrity',
  },
  QA_SPECIALIST: {
    label: 'Senior QA Engineer',
    icon: '🧪',
    roleColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    specialty: 'Edge Cases & Regression Gates',
  },
  SITE_RELIABILITY_ENGINEER: {
    label: 'Principal SRE',
    icon: '⚡',
    roleColor: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    specialty: 'Failover & Chaos Hardening',
  },
};

export const SwarmDebateModal: React.FC<SwarmDebateModalProps> = ({ isOpen, onClose }) => {
  const project = useBuilderStore((s) => s.project);
  const [activeTab, setActiveTab] = useState<'debate' | 'profiler'>('debate');
  const [isRunning, setIsRunning] = useState(false);
  const [debateResult, setDebateResult] = useState<SwarmConsensusResult | null>(null);
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const handleRunDebate = async () => {
    if (!project) return;
    setIsRunning(true);
    setApplied(false);

    try {
      PerformanceProfilerEngine.clear();
      const timerId = PerformanceProfilerEngine.startStage('SWARM_DEBATE');

      const result = await SwarmConsensusEngine.runDebate({
        goal: `Perform comprehensive architectural, UX, and security consensus review on "${project.name}"`,
        project,
        config: {
          maxRounds: 3,
          consensusMode: 'WEIGHTED_MAJORITY',
          consensusThreshold: 0.7,
        },
      });

      PerformanceProfilerEngine.endStage(timerId, 'SUCCESS');
      setDebateResult(result);
    } catch (err) {
      console.error('Swarm debate failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const performanceProfile = PerformanceProfilerEngine.computeProfile();
  const tokenReport = TokenEconomicsEngine.buildUsageReport({
    prompt: project ? JSON.stringify(project) : '',
    modelId: 'gemini-1.5-flash',
  });

  const isVetoed = debateResult?.status === 'VETOED';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0B0E17] border border-[#202638] rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] max-h-[800px] overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1A2030] bg-[#0E121E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Swarm Consensus Debate Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  D8.19 Swarm Continuum
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-agent persona collaboration with BFT consensus voting & Security Officer binding veto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDebate}
              disabled={isRunning}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                isRunning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/25'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Debating Rounds...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Swarm Review</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C2334] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="px-6 py-2 border-b border-[#1A2030] bg-[#0A0D16] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('debate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                activeTab === 'debate'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141A28]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Multi-Agent Debate Round</span>
              {debateResult && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200">
                  {debateResult.status}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('profiler')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                activeTab === 'profiler'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141A28]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Performance & Token Economics</span>
            </button>
          </div>

          {debateResult && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-slate-400">Consensus Ratio:</span>
              <span className="font-mono font-bold text-emerald-400">
                {Math.round(debateResult.agreementRatioPercent)}%
              </span>
              <span className="text-slate-600">|</span>
              <span
                className={`flex items-center gap-1 font-semibold text-[11px] ${
                  isVetoed ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {isVetoed ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Security Veto</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Security Approved</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#07090F]">
          {activeTab === 'debate' ? (
            <div className="space-y-6">
              {/* Personas Strip */}
              <div className="grid grid-cols-5 gap-3">
                {(['ARCHITECT', 'UX_DESIGNER', 'SECURITY_OFFICER', 'DATA_ENGINEER', 'QA_SPECIALIST'] as EnterpriseAgentPersonaRole[]).map(
                  (role) => {
                    const badge = PERSONA_BADGES[role];
                    const vote = debateResult?.votesByPersona?.[role]?.decision;

                    return (
                      <div
                        key={role}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          vote === 'APPROVE'
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : vote === 'REJECT'
                            ? 'border-red-500/40 bg-red-500/5'
                            : 'border-[#1C2334] bg-[#0E121E]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{badge.icon}</span>
                          {vote && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                vote === 'APPROVE'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : vote === 'REJECT'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {vote}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white truncate">{badge.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{badge.specialty}</div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Debate Transcript & Rounds */}
              {debateResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0D111D] border border-[#1E2536] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1E2536] pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">Winning Consensus Proposal</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Audit Hash: {debateResult.auditHash?.slice(0, 16)}...
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-indigo-300">
                        {debateResult.winningProposal?.title || 'Consensus Architecture Agreement'}
                      </h4>
                      <p className="text-xs text-slate-300">
                        {debateResult.winningProposal?.description || 'Personas successfully reached BFT quorum.'}
                      </p>
                    </div>

                    {/* Proposed Modifications */}
                    {debateResult.synthesizedModifications && debateResult.synthesizedModifications.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Synthesized AST Modifications ({debateResult.synthesizedModifications.length})
                        </span>
                        <div className="space-y-1">
                          {debateResult.synthesizedModifications.map((m: ProposedModification, idx: number) => (
                            <div
                              key={m.id || idx}
                              className="p-2 rounded-lg bg-[#121624] border border-[#1E2538] flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                                  {m.action}
                                </span>
                                <span className="text-slate-200">{m.description}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{m.targetEntity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-Round Debate Transcript */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Debate Rounds ({debateResult.totalRounds})
                    </span>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {debateResult.debateTranscript?.map((msg: SwarmMessage, idx: number) => {
                        const badge = PERSONA_BADGES[msg.senderRole] || PERSONA_BADGES.ARCHITECT;
                        return (
                          <div
                            key={msg.id || idx}
                            className="p-3 rounded-xl bg-[#0E121E] border border-[#1A2234] flex flex-col gap-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span>{badge.icon}</span>
                                <span className="font-bold text-slate-200">{msg.senderName}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#161D2E] text-slate-400">
                                  Round {msg.roundNumber} · {msg.type}
                                </span>
                              </div>
                              {msg.voteDecision && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    msg.voteDecision === 'APPROVE'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}
                                >
                                  {msg.voteDecision}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300 pl-6 text-[11px] leading-relaxed">{msg.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 border border-dashed border-[#1C2334] rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-white">No Swarm Debate Executed Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Click &quot;Launch Swarm Review&quot; to initiate a multi-round debate among the 5 personas to analyze layout, responsive tokens, data models, and security boundaries.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Performance & Token Economics Tab */
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0E121E] border border-[#1A2234] flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Total Pipeline Latency</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400">
                    {performanceProfile.totalDurationMs.toFixed(1)} ms
                  </span>
                  <span className="text-[10px] text-slate-500">P90: {performanceProfile.percentiles.p90Ms.toFixed(1)} ms</span>
                </div>

                <div className="p-4 rounded-xl bg-[#0E121E] border border-[#1A2234] flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Semantic Token Compression</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">
                    {tokenReport.compressionRatioPercent.toFixed(1)}% Saved
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Savings: {tokenReport.compressionSavingsTokens.toLocaleString()} tokens
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0E121E] border border-[#1A2234] flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Estimated Execution Cost</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    ${(tokenReport.estimatedCostUsd).toFixed(4)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Tokens: {tokenReport.totalTokens.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Stage Latency Breakdown */}
              <div className="p-4 rounded-xl bg-[#0E121E] border border-[#1A2234] space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Stage Latency Breakdown
                </span>

                <div className="space-y-2">
                  {performanceProfile.stageBreakdown.map((stage: StageLatencyMetric, sIdx: number) => (
                    <div key={`${stage.stage}_${sIdx}`} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300">{stage.stage}</span>
                        <span className="font-mono text-cyan-400">{stage.durationMs.toFixed(1)} ms</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#141A28] rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, (stage.durationMs / (performanceProfile.totalDurationMs || 1)) * 100)}%`,
                          }}
                          className="h-full bg-cyan-500 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#1A2030] bg-[#0A0D15] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Continuum D8.19 Certified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1A2030] transition-colors"
            >
              Close
            </button>

            {debateResult && (
              <button
                onClick={() => setApplied(true)}
                disabled={applied || isVetoed}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                  applied
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default'
                    : isVetoed
                    ? 'bg-red-600/30 text-red-300 border border-red-500/40 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {applied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Consensus Applied</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Consensus Proposal</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
