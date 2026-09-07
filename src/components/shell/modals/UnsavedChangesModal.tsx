'use client';

import React from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { AlertTriangle, X } from 'lucide-react';

export const UnsavedChangesModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const pendingAction = useProjectLifecycleStore((s) => s.pendingAction);
  const pendingTargetProjectId = useProjectLifecycleStore((s) => s.pendingTargetProjectId);
  const language = useProjectLifecycleStore((s) => s.language);
  const project = useBuilderStore((s) => s.project);
  const save = useBuilderStore((s) => s.save);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  if (activeModal !== 'unsaved_changes') return null;

  const isRtl = language === 'he';

  const proceedWithPendingAction = () => {
    closeModal();
    if (pendingAction === 'new') {
      useProjectLifecycleStore.getState().openModal('new_project');
    } else if (pendingAction === 'open') {
      if (pendingTargetProjectId) {
        defaultProjectLifecycleManager.openProject(pendingTargetProjectId);
        initializeProject(pendingTargetProjectId);
        useProjectLifecycleStore.getState().setLifecycleState('OPEN');
      } else {
        useProjectLifecycleStore.getState().openModal('open_project');
      }
    } else if (pendingAction === 'close') {
      useProjectLifecycleStore.getState().setLifecycleState('NO_PROJECT');
    } else if (pendingAction === 'exit') {
      if (typeof window !== 'undefined') {
        window.close();
      }
    }
  };

  const handleSaveAndProceed = () => {
    // Save current project changes
    save();
    if (project) {
      defaultProjectLifecycleManager.recordRecentProject(project);
    }
    proceedWithPendingAction();
  };

  const handleDontSaveAndProceed = () => {
    // Discard unsaved changes by reloading last stable state from storage
    if (project?.id) {
      const stable = defaultProjectLifecycleManager.openProject(project.id);
      if (stable.success && stable.project) {
        initializeProject(stable.project.id);
      }
    }
    proceedWithPendingAction();
  };

  const handleCancel = () => {
    closeModal();
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
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'האם לשמור שינויים?' : 'Save Changes?'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'קיימים שינויים שלא נשמרו בפרויקט הנוכחי' : 'You have unsaved changes in your workspace'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1E2330] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-xs text-slate-300 leading-relaxed">
            {isRtl ? (
              <>
                בפרויקט <strong className="text-white font-semibold">&quot;{project?.name || 'נוכחי'}&quot;</strong> ישנם
                שינויים שלא נשמרו. האם ברצונך לשמור את השינויים לפני המעבר לפעולה הבאה?
              </>
            ) : (
              <>
                Project <strong className="text-white font-semibold">&quot;{project?.name || 'Untitled'}&quot;</strong> contains
                unsaved modifications. Do you want to save them before proceeding?
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={handleDontSaveAndProceed}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-850/60 transition-colors"
          >
            {isRtl ? 'אל תשמור' : "Don't Save"}
          </button>
          <button
            onClick={handleSaveAndProceed}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
          >
            {isRtl ? 'שמור' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
