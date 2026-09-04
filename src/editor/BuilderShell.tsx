'use client';

import React from 'react';
import { useEditorStore } from './store/useEditorStore';
import { TopBar } from './panels/TopBar';
import { ComponentLibrary } from './panels/ComponentLibrary';
import { DesignCanvas } from './canvas/DesignCanvas';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { BottomPanel } from './panels/BottomPanel';
import { CodeView } from './panels/CodeView';
import { LivePreview } from './panels/LivePreview';
import { PublishModal } from './panels/PublishModal';
import { ToastNotification } from './panels/ToastNotification';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const BuilderShell: React.FC = () => {
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const activeMode = useEditorStore((s) => s.activeMode);

  // Activate global keyboard hotkeys
  useKeyboardShortcuts();

  if (isPreviewMode) {
    return (
      <>
        <LivePreview />
        <ToastNotification />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07080B] text-slate-100 font-sans antialiased">
      {/* Top Application Bar */}
      <TopBar />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {activeMode === 'code' ? (
          <CodeView />
        ) : (
          <>
            {/* Left Component Library */}
            <ComponentLibrary />

            {/* Central Design Canvas */}
            <DesignCanvas />

            {/* Right Properties Inspector */}
            <PropertiesPanel />
          </>
        )}
      </div>

      {/* Bottom Drawer (Pages, Layers, Database, Workflows, Assets, AI) */}
      <BottomPanel />

      {/* Global Modals & Notifications */}
      <PublishModal />
      <ToastNotification />
    </div>
  );
};
