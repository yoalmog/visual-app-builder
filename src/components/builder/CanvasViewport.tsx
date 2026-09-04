'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { ComponentRenderer } from './ComponentRenderer';

interface CanvasViewportProps {
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({ onContextMenu }) => {
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const viewport = useBuilderStore((s) => s.viewport);
  const zoom = useBuilderStore((s) => s.zoom);

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

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
    <div
      className="transition-all duration-200 shadow-2xl relative"
      style={{
        width: getViewportWidth(),
        maxWidth: '100%',
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Device Header for Tablet & Mobile */}
      {viewport !== 'desktop' && (
        <div className="w-full bg-[#1A1D27] border border-slate-700/80 rounded-t-xl px-4 py-2 flex items-center justify-between text-xs text-slate-400 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 inline-block" />
          </div>
          <span className="font-mono text-[11px] text-slate-300">
            {viewport === 'tablet' ? 'iPad Air (768px)' : 'iPhone 15 (390px)'}
          </span>
          <div className="w-4" />
        </div>
      )}

      {/* Main Page Application Viewport */}
      <div
        className={`bg-white text-slate-900 min-h-[750px] overflow-hidden ${
          viewport !== 'desktop'
            ? 'rounded-b-xl border border-t-0 border-slate-700/80'
            : 'rounded-lg border border-slate-700/60'
        }`}
      >
        {activePage?.root ? (
          <ComponentRenderer node={activePage.root} isPreview={false} onContextMenu={onContextMenu} />
        ) : (
          <div className="p-12 text-center text-slate-400">No content found.</div>
        )}
      </div>
    </div>
  );
};
