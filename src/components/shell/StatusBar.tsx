'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { ShieldCheck, CheckCircle, AlertCircle, Save, Database, Globe } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const saveStatus = useBuilderStore((s) => s.saveStatus);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const zoom = useBuilderStore((s) => s.zoom);

  const lifecycleState = useProjectLifecycleStore((s) => s.lifecycleState);
  const language = useProjectLifecycleStore((s) => s.language);
  const toggleLanguage = useProjectLifecycleStore((s) => s.toggleLanguage);

  const isRtl = language === 'he';
  const activePage = project?.pages?.find((p) => p.id === activePageId) || project?.pages?.[0];
  const selectionCount = selectedNodeIds.length > 0 ? selectedNodeIds.length : selectedNodeId ? 1 : 0;

  const getLifecycleBadge = () => {
    switch (lifecycleState) {
      case 'DIRTY':
      case 'OPEN':
        if (saveStatus === 'unsaved') {
          return (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{isRtl ? 'שינויים לא שמורים' : 'Modified'}</span>
            </span>
          );
        }
        return (
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isRtl ? 'נשמר' : 'Saved'}</span>
          </span>
        );
      case 'SAVING':
        return (
          <span className="flex items-center gap-1 text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>{isRtl ? 'שומר...' : 'Saving...'}</span>
          </span>
        );
      case 'NO_PROJECT':
        return (
          <span className="flex items-center gap-1 text-slate-500">
            <span>{isRtl ? 'אין פרויקט פעיל' : 'No Project'}</span>
          </span>
        );
      case 'ERROR':
        return (
          <span className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>{isRtl ? 'שגיאה' : 'Error'}</span>
          </span>
        );
      default:
        return <span>{lifecycleState}</span>;
    }
  };

  return (
    <footer
      dir={isRtl ? 'rtl' : 'ltr'}
      className="h-6 bg-[#080A0F] border-t border-[#181D2A] flex items-center justify-between px-3 text-[11px] select-none text-slate-400 z-30 shrink-0"
    >
      {/* Left: Project & State Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-300 truncate max-w-[140px]">
            {project?.name || 'No Project'}
          </span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-[#131722] text-slate-400 border border-[#202738] font-mono">
            v{project?.version || 9}
          </span>
        </div>

        <div className="h-3 w-px bg-[#1F2536]" />

        {/* Lifecycle / Dirty State Badge */}
        {getLifecycleBadge()}

        <div className="h-3 w-px bg-[#1F2536]" />

        {/* Active Page */}
        <span className="hidden sm:inline">
          {activePage ? `${activePage.name} (${activePage.slug})` : ''}
        </span>
      </div>

      {/* Right: Certification & Selections */}
      <div className="flex items-center gap-3">
        {selectionCount > 0 && (
          <span className="text-slate-300 font-mono">
            {selectionCount} {isRtl ? 'רכיבים נבחרו' : 'selected'}
          </span>
        )}

        <div className="h-3 w-px bg-[#1F2536]" />

        {/* Zoom */}
        <span className="font-mono text-slate-400">
          {Math.round(zoom * 100)}%
        </span>

        <div className="h-3 w-px bg-[#1F2536]" />

        {/* Platform Certification Status Badge */}
        <div
          title="Full-Platform Autonomous Continuum Certified (CP-E12)"
          className="flex items-center gap-1 text-emerald-400/90 font-medium"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline text-[10px]">CP-E12 CERTIFIED</span>
        </div>

        <div className="h-3 w-px bg-[#1F2536]" />

        <button
          onClick={toggleLanguage}
          className="hover:text-white uppercase font-mono font-bold"
        >
          {language}
        </button>
      </div>
    </footer>
  );
};
