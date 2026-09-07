'use client';

import React from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { X, Award, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

export const AboutModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);

  if (activeModal !== 'about') return null;

  const isRtl = language === 'he';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'אודות Apex Studio' : 'About Apex Studio'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'סביבת פיתוח יישומים אוטונומית ברמה ארגונית' : 'Autonomous Enterprise Visual Application IDE'}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1E2330] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-[#121624] to-purple-950/40 border border-indigo-900/40 text-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-[10px] font-semibold text-emerald-400 mb-2">
              <CheckCircle2 className="w-3 h-3" />
              <span>CERTIFIED: CP-E12 CONTINUUM</span>
            </div>
            <h3 className="text-base font-extrabold text-white">Apex Studio Enterprise</h3>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous Agent Platform & Visual Application Builder
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#1C212E]">
              <span className="text-slate-400">{isRtl ? 'גרסת יישום' : 'Application Version'}</span>
              <span className="font-mono text-white font-semibold">2.4.0-enterprise</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E]">
              <span className="text-slate-400">{isRtl ? 'גרסת סכימה' : 'Schema Version'}</span>
              <span className="font-mono text-indigo-400 font-semibold">Schema v9</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E]">
              <span className="text-slate-400">{isRtl ? 'גרסת AI Builder' : 'AI Builder Engine'}</span>
              <span className="font-mono text-purple-400 font-semibold">v8.20 / E12</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E]">
              <span className="text-slate-400">{isRtl ? 'הגנות אבטחה' : 'Security Filters'}</span>
              <span className="text-slate-300">NoEvalGuard, SecretFilter, PID</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E]">
              <span className="text-slate-400">{isRtl ? 'סטטוס בדיקות' : 'Regression Baseline'}</span>
              <span className="text-emerald-400 font-semibold">1,350 / 1,350 PASS</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-between text-[11px] text-slate-500">
          <span>© 2026 Apex Studio Platform</span>
          <button
            onClick={closeModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
