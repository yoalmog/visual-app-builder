'use client';

import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { RenderComponent } from '../renderer/RenderComponent';
import * as Icons from 'lucide-react';
import { ViewportMode } from '@/types/schema';

export const LivePreview: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const activePage = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const togglePreview = useEditorStore((s) => s.togglePreview);

  const getViewportWidth = () => {
    switch (viewport) {
      case 'tablet':
        return '768px';
      case 'mobile':
        return '375px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07080B] flex flex-col select-none overflow-hidden">
      {/* Floating Preview Banner */}
      <div className="h-12 bg-[#0E1017]/90 backdrop-blur-md border-b border-[#1E2230] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide uppercase">
            Live Preview Mode — {activePage?.name}
          </span>
        </div>

        {/* Viewport switch in preview */}
        <div className="flex items-center bg-[#141620] p-0.5 rounded-lg border border-[#202536]">
          {(['desktop', 'tablet', 'mobile'] as ViewportMode[]).map((v) => {
            const Icon = v === 'desktop' ? Icons.Monitor : v === 'tablet' ? Icons.Tablet : Icons.Smartphone;
            return (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewport === v ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={`Switch to ${v} preview`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => togglePreview(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg shadow-md transition-colors"
        >
          <Icons.Edit3 className="w-3.5 h-3.5" />
          <span>Exit Preview</span>
        </button>
      </div>

      {/* Interactive App Canvas */}
      <div className="flex-1 overflow-auto flex justify-center p-6 bg-[#07080B]">
        <div
          className="transition-all duration-200 bg-[#07080C] shadow-2xl min-h-full"
          style={{
            width: getViewportWidth(),
            maxWidth: viewport === 'desktop' ? '1280px' : getViewportWidth(),
          }}
        >
          {activePage?.rootNodeId ? (
            <RenderComponent nodeId={activePage.rootNodeId} isPreview={true} />
          ) : (
            <div className="p-8 text-center text-slate-500">No content on this page.</div>
          )}
        </div>
      </div>
    </div>
  );
};
