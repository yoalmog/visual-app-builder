'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Map, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';

export const CanvasMinimap: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const zoom = useBuilderStore((s) => s.zoom);
  const panOffset = useBuilderStore((s) => s.panOffset);
  const setPanOffset = useBuilderStore((s) => s.setPanOffset);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Center viewport on clicked minimap coordinate
    const targetX = -(clickX * 6 - rect.width * 3);
    const targetY = -(clickY * 6 - rect.height * 3);

    setPanOffset({
      x: Math.round(targetX),
      y: Math.round(targetY),
    });
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-[#0B0D14]/90 backdrop-blur-md border border-[#202636] rounded-xl overflow-hidden shadow-2xl transition-all select-none">
      {/* Header */}
      <div className="px-2.5 py-1.5 bg-[#101420] border-b border-[#1A2030] flex items-center justify-between gap-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Map className="w-3 h-3 text-indigo-400" />
          <span>Navigator</span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <span>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 rounded hover:bg-[#1C2234] text-slate-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Minimap Canvas */}
      {!isCollapsed && (
        <div
          onClick={handleMinimapClick}
          className="w-40 h-28 p-2 relative bg-[#07090E] cursor-crosshair overflow-hidden group"
          title="Click to pan viewport"
        >
          {/* Miniature representations of nodes */}
          <div className="w-full h-full border border-dashed border-slate-700/50 rounded flex flex-col items-center justify-center relative p-1.5 gap-1 opacity-75">
            <div className="w-full h-3 bg-indigo-500/30 rounded-sm" />
            <div className="w-full flex-1 bg-slate-800/40 rounded-sm flex flex-col gap-1 p-1">
              <div className="w-3/4 h-2 bg-slate-700/50 rounded-xs" />
              <div className="w-1/2 h-2 bg-indigo-500/20 rounded-xs" />
            </div>
            <div className="w-full h-2.5 bg-slate-800/30 rounded-sm" />

            {/* Viewport Bounds Indicator Frame */}
            <div
              style={{
                transform: `translate(${Math.min(20, Math.max(-20, panOffset.x / 40))}px, ${Math.min(
                  20,
                  Math.max(-20, panOffset.y / 40)
                )}px) scale(${Math.max(0.6, Math.min(1.4, 1 / zoom))})`,
              }}
              className="absolute inset-2 border-2 border-indigo-500/80 bg-indigo-500/10 rounded pointer-events-none transition-transform duration-75 shadow-sm"
            />
          </div>

          <div className="absolute bottom-1 right-1.5 text-[8px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to Pan
          </div>
        </div>
      )}
    </div>
  );
};
