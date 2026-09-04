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

interface BuilderShellProps {
  projectId: string;
}

export const BuilderShell: React.FC<BuilderShellProps> = ({ projectId }) => {
  const isPreview = useBuilderStore((s) => s.isPreview);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  useEffect(() => {
    initializeProject(projectId);
  }, [projectId, initializeProject]);

  useKeyboardShortcuts();

  if (isPreview) {
    return <PreviewMode />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07090E] text-slate-100 font-sans antialiased">
      {/* Top Application Bar */}
      <TopToolbar />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Activity Sidebar (Insert / Pages / Assets / Library) */}
        <LeftSidebar />

        {/* Center Canvas Workspace */}
        <Canvas onContextMenu={(e, nodeId) => setContextMenu({ x: e.clientX, y: e.clientY, nodeId })} />

        {/* Right Properties Inspector */}
        <Inspector />
      </div>

      {/* Bottom Layers Panel */}
      <LayersPanel />

      {/* Context Menu Modal Overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
