'use client';

import React, { useEffect, useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { LayersPanel } from './LayersPanel';
import { PreviewMode } from './PreviewMode';
import { ContextMenu } from './ContextMenu';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { OrganizationSettingsModal } from './platform/OrganizationSettingsModal';
import { ScaleDashboardModal } from './platform/ScaleDashboardModal';
import { EnterpriseSecurityModal } from './platform/EnterpriseSecurityModal';
import { DeveloperPortalModal } from './platform/DeveloperPortalModal';
import { ExperimentationModal } from './platform/ExperimentationModal';
import { AdvancedDeploymentsModal } from './platform/AdvancedDeploymentsModal';
import { usePlatformStore } from '@/builder/state/platform-store';

import { AppMenuBar } from '@/components/shell/AppMenuBar';
import { StatusBar } from '@/components/shell/StatusBar';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { NewProjectModal } from '@/components/shell/modals/NewProjectModal';
import { OpenProjectModal } from '@/components/shell/modals/OpenProjectModal';
import { SaveAsModal } from '@/components/shell/modals/SaveAsModal';
import { UnsavedChangesModal } from '@/components/shell/modals/UnsavedChangesModal';
import { ProjectSettingsModal } from '@/components/shell/modals/ProjectSettingsModal';
import { ProjectInfoModal } from '@/components/shell/modals/ProjectInfoModal';
import { AboutModal } from '@/components/shell/modals/AboutModal';
import { KeyboardShortcutsModal } from '@/components/shell/modals/KeyboardShortcutsModal';
import { ExportProjectModal } from '@/components/shell/modals/ExportProjectModal';
import { ImportProjectModal } from '@/components/shell/modals/ImportProjectModal';
import { BuildDiagnosticsModal } from '@/components/shell/modals/BuildDiagnosticsModal';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { FolderPlus, FolderOpen, Clock, Layers as LayersIcon } from 'lucide-react';

interface BuilderShellProps {
  projectId: string;
}

export const BuilderShell: React.FC<BuilderShellProps> = ({ projectId }) => {
  const isPreview = useBuilderStore((s) => s.isPreview);
  const initializeProject = useBuilderStore((s) => s.initializeProject);
  const lifecycleState = useProjectLifecycleStore((s) => s.lifecycleState);
  const openModal = useProjectLifecycleStore((s) => s.openModal);
  const recentProjects = useProjectLifecycleStore((s) => s.recentProjects);
  const language = useProjectLifecycleStore((s) => s.language);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  useEffect(() => {
    // Check for crash recovery first
    const recovery = defaultProjectLifecycleManager.recoverInterruptedOperation();
    if (recovery.recovered && recovery.project) {
      initializeProject(recovery.project.id);
      useProjectLifecycleStore.getState().setLifecycleState('OPEN');
    } else {
      initializeProject(projectId);
      useProjectLifecycleStore.getState().setLifecycleState('OPEN');
    }
    usePlatformStore.getState().initializePlatform(projectId);
  }, [projectId, initializeProject]);

  useKeyboardShortcuts();

  const isRtl = language === 'he';

  if (isPreview) {
    return <PreviewMode />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07090E] text-slate-100 font-sans antialiased">
      {/* 1. Persistent Top Menu Bar (File, Edit, Project, View, AI, Run, Build, Help) */}
      <AppMenuBar />

      {lifecycleState === 'NO_PROJECT' ? (
        /* Empty / No-Project Desktop IDE Welcome Workspace */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090B10] text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl mb-4">
            <LayersIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">
            {isRtl ? 'ברוכים הבאים ל-Apex Studio' : 'Welcome to Apex Studio'}
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            {isRtl
              ? 'פתח פרויקט קיים או צור פרויקט חדש כדי להתחיל בעיצוב ובפיתוח יישומים'
              : 'Select a project to open or create a new visual application to start designing.'}
          </p>

          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => openModal('new_project')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-2 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isRtl ? 'פרויקט חדש (Ctrl+N)' : 'New Project (Ctrl+N)'}</span>
            </button>
            <button
              onClick={() => openModal('open_project')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#161B26] hover:bg-[#1E2436] text-slate-200 border border-[#232A3C] flex items-center gap-2 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{isRtl ? 'פתח פרויקט... (Ctrl+O)' : 'Open Project... (Ctrl+O)'}</span>
            </button>
          </div>

          {recentProjects.length > 0 && (
            <div className="w-full max-w-sm text-left rtl:text-right">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{isRtl ? 'פרויקטים אחרונים' : 'Recent Workspaces'}</span>
              </h3>
              <div className="space-y-1">
                {recentProjects.slice(0, 4).map((rp) => (
                  <button
                    key={rp.id}
                    onClick={() => {
                      const res = defaultProjectLifecycleManager.openProject(rp.id);
                      if (res.success && res.project) {
                        initializeProject(res.project.id);
                        useProjectLifecycleStore.getState().setLifecycleState('OPEN');
                      }
                    }}
                    className="w-full p-2.5 rounded-lg bg-[#11141E] hover:bg-[#181D2B] border border-[#1E2436] flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="truncate">{rp.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">v{rp.schemaVersion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 2. Top Application Bar */}
          <TopToolbar />

          {/* 3. Main Workspace Body */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Activity Sidebar (Insert / Pages / Assets / Library) */}
            <LeftSidebar />

            {/* Center Canvas Workspace */}
            <Canvas onContextMenu={(e, nodeId) => setContextMenu({ x: e.clientX, y: e.clientY, nodeId })} />

            {/* Right Properties Inspector */}
            <Inspector />
          </div>

          {/* 4. Bottom Layers Panel */}
          <LayersPanel />
        </>
      )}

      {/* 5. Persistent IDE Status Bar */}
      <StatusBar />

      {/* Context Menu Modal Overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Application Shell Modals */}
      <NewProjectModal />
      <OpenProjectModal />
      <SaveAsModal />
      <UnsavedChangesModal />
      <ProjectSettingsModal />
      <ProjectInfoModal />
      <AboutModal />
      <KeyboardShortcutsModal />
      <ExportProjectModal />
      <ImportProjectModal />
      <BuildDiagnosticsModal />

      {/* Organization Settings Modal */}
      <OrganizationSettingsModal />

      {/* Phase 9 Platform & Enterprise Modals */}
      <ScaleDashboardModal />
      <EnterpriseSecurityModal />
      <DeveloperPortalModal />
      <ExperimentationModal />
      <AdvancedDeploymentsModal />
    </div>
  );
};

