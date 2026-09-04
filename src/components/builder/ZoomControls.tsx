'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Minus, Plus, Maximize2 } from 'lucide-react';

export const ZoomControls: React.FC = () => {
  const zoom = useBuilderStore((s) => s.zoom);
  const setZoom = useBuilderStore((s) => s.setZoom);

  return (
    <div data-testid="zoom-control" className="flex items-center gap-1 text-slate-400 text-xs">
      <button
        onClick={() => setZoom(zoom - 0.15)}
        className="p-1 hover:bg-[#1A1F2C] rounded hover:text-white transition-colors"
        title="Zoom Out"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <select
        value={zoom}
        onChange={(e) => setZoom(parseFloat(e.target.value))}
        className="bg-[#12141F] text-slate-300 font-mono text-[11px] px-2 py-0.5 rounded border border-[#1E2330] hover:border-slate-700 outline-none cursor-pointer"
        aria-label="Zoom preset"
      >
        <option value={0.25}>25%</option>
        <option value={0.5}>50%</option>
        <option value={0.75}>75%</option>
        <option value={1.0}>100%</option>
        <option value={1.25}>125%</option>
        <option value={1.5}>150%</option>
        <option value={2.0}>200%</option>
      </select>

      <button
        onClick={() => setZoom(zoom + 0.15)}
        className="p-1 hover:bg-[#1A1F2C] rounded hover:text-white transition-colors"
        title="Zoom In"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setZoom(1.0)}
        className="px-2 py-0.5 hover:bg-[#1A1F2C] rounded hover:text-white transition-colors ml-0.5 text-[11px] flex items-center gap-1"
        title="Fit View"
      >
        <Maximize2 className="w-3 h-3" />
        <span>Fit</span>
      </button>
    </div>
  );
};
