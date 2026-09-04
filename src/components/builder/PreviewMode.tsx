'use client';

import React, { useState, useEffect } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { useRuntimeStore } from '@/builder/runtime/runtime-store';
import { ComponentRenderer } from './ComponentRenderer';
import { DeviceSelector } from './DeviceSelector';
import { RuntimeDebuggerModal } from './RuntimeDebuggerModal';
import { Eye, Edit3, Bug, RotateCcw } from 'lucide-react';

export const PreviewMode: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const viewport = useBuilderStore((s) => s.viewport);
  const togglePreview = useBuilderStore((s) => s.togglePreview);
  const resetPreviewRuntimeState = useBuilderStore((s) => s.resetPreviewRuntimeState);

  // Runtime Store
  const runtimeActivePageId = useRuntimeStore((s) => s.navigation.activePageId);
  const initRuntime = useRuntimeStore((s) => s.initRuntime);
  const resetRuntime = useRuntimeStore((s) => s.resetRuntime);

  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);

  // Initialize runtime state on preview enter
  useEffect(() => {
    initRuntime(project, activePageId);
    return () => {
      resetPreviewRuntimeState();
    };
  }, [initRuntime, project, activePageId, resetPreviewRuntimeState]);

  const effectivePageId = runtimeActivePageId || activePageId;
  const activePage = project.pages.find((p) => p.id === effectivePageId) || project.pages[0];

  const getViewportWidth = () => {
    switch (viewport) {
      case 'tablet':
        return '768px';
      case 'mobile':
        return '390px';
      case 'desktop':
      default:
        return '1440px';
    }
  };

  return (
    <div data-testid="builder-preview" className="fixed inset-0 z-50 bg-[#07090E] flex flex-col select-none overflow-hidden">
      {/* Top Banner */}
      <header className="h-12 bg-[#0E1018]/90 backdrop-blur-md border-b border-[#1E2330] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Live Preview
          </span>
          <span className="text-xs text-slate-500 font-mono">
            — {activePage?.name || 'Home'}
          </span>
        </div>

        <DeviceSelector />

        <div className="flex items-center gap-2">
          <button
            onClick={() => resetRuntime()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161926] hover:bg-[#202538] text-slate-300 hover:text-white text-xs rounded-lg transition-colors border border-[#262B3D]"
            title="Reset Runtime State"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reset</span>
          </button>

          <button
            data-testid="btn-open-runtime-debugger"
            onClick={() => setIsDebuggerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-medium transition-colors border border-indigo-500/30"
            title="Runtime Debugger & Action Trace"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Debugger</span>
          </button>

          <button
            onClick={() => togglePreview(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-lg shadow-md transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Exit Preview</span>
          </button>
        </div>
      </header>

      {/* Interactive Rendered Surface */}
      <main className="flex-1 overflow-auto flex justify-center p-8 bg-[#07090E]">
        <div
          className="transition-all duration-200 bg-white text-slate-900 shadow-2xl rounded-lg min-h-full overflow-hidden"
          style={{
            width: getViewportWidth(),
            maxWidth: '100%',
          }}
        >
          {activePage?.root ? (
            <ComponentRenderer node={activePage.root} isPreview={true} />
          ) : (
            <div className="p-8 text-center text-slate-400">Empty Page</div>
          )}
        </div>
      </main>

      {/* Runtime Debugger Modal */}
      <RuntimeDebuggerModal
        isOpen={isDebuggerOpen}
        onClose={() => setIsDebuggerOpen(false)}
      />
    </div>
  );
};
