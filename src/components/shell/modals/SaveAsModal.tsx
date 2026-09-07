'use client';

import React, { useState } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, Copy, AlertCircle } from 'lucide-react';

export const SaveAsModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const currentProject = useBuilderStore((s) => s.project);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  const [newName, setNewName] = useState(`${currentProject?.name || 'Project'} (Copy)`);
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'save_as') return null;

  const isRtl = language === 'he';

  const handleSaveAs = () => {
    setError(null);
    if (!currentProject) {
      setError('No active project to duplicate.');
      return;
    }

    const result = defaultProjectLifecycleManager.saveAsProject(currentProject, newName);
    if (result.success && result.newProject) {
      // Initialize with new project (complete isolation from old project)
      initializeProject(result.newProject.id);
      useProjectLifecycleStore.getState().setLifecycleState('SAVED');
      useProjectLifecycleStore.getState().refreshRecentProjects();
      closeModal();
    } else {
      setError(result.error || 'Save As failed.');
    }
  };

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
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'שמור בשם חדש' : 'Save Project As'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'יצירת עותק מבודד עם מזהה פרויקט ייחודי' : 'Create an isolated duplicate with a new project identity'}
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
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRtl ? 'שם הפרויקט החדש' : 'New Project Name'}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. My App v2"
              className="w-full px-3 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#141824] border border-[#262E40] text-[11px] text-slate-400">
            <p>
              {isRtl
                ? 'הפרויקט המקורי יישמר במצבו הנוכחי. הפרויקט החדש יהיה מבודד לחלוטין.'
                : 'The original project remains untouched in storage. The new project will have independent branches, configurations, and history.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-end gap-2">
          <button
            onClick={closeModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={handleSaveAs}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
          >
            {isRtl ? 'שמור עותק' : 'Save Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
};
