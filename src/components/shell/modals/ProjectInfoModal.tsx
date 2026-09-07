'use client';

import React from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, Info, Layers, Database, ShieldCheck, Box } from 'lucide-react';

export const ProjectInfoModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const project = useBuilderStore((s) => s.project);

  if (activeModal !== 'project_info') return null;

  const isRtl = language === 'he';

  const pageCount = project?.pages?.length || 0;
  const componentCount = project?.components?.length || 0;
  const collectionCount = project?.collections?.length || 0;
  const tokenCount = project?.tokens?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'מידע על הפרויקט' : 'Project Information'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'מזהים, מבנה וסטטיסטיקת פרויקט' : 'Identity, architecture, and node statistics'}
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
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-[#1C212E] text-xs">
              <span className="text-slate-400">{isRtl ? 'שם הפרויקט' : 'Name'}</span>
              <span className="font-semibold text-white">{project?.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E] text-xs">
              <span className="text-slate-400">{isRtl ? 'מזהה פרויקט' : 'Project ID'}</span>
              <span className="font-mono text-slate-300 text-[11px]">{project?.id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E] text-xs">
              <span className="text-slate-400">{isRtl ? 'גרסת סכימה' : 'Schema Version'}</span>
              <span className="font-mono text-indigo-400 font-semibold">v{project?.version || 9}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E] text-xs">
              <span className="text-slate-400">{isRtl ? 'גרסת עריכה' : 'Project Version'}</span>
              <span className="font-mono text-slate-300">{project?.projectVersion || 1}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1C212E] text-xs">
              <span className="text-slate-400">{isRtl ? 'ענף פעיל' : 'Active Branch'}</span>
              <span className="font-mono text-slate-300">{project?.branch || 'main'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-3 rounded-lg bg-[#141824] border border-[#202636] flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">{pageCount}</div>
                <div className="text-[10px] text-slate-400">{isRtl ? 'עמודים' : 'Pages'}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#141824] border border-[#202636] flex items-center gap-2.5">
              <Box className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">{componentCount}</div>
                <div className="text-[10px] text-slate-400">{isRtl ? 'רכיבים' : 'Components'}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#141824] border border-[#202636] flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">{collectionCount}</div>
                <div className="text-[10px] text-slate-400">{isRtl ? 'אוספי נתונים' : 'Collections'}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#141824] border border-[#202636] flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">{tokenCount}</div>
                <div className="text-[10px] text-slate-400">{isRtl ? 'טוקני עיצוב' : 'Tokens'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-end">
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
