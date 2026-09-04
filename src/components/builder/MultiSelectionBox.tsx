'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';

export const MultiSelectionBox: React.FC = () => {
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const zoom = useBuilderStore((s) => s.zoom);

  if (selectedNodeIds.length <= 1) return null;

  // Compute bounding box from DOM elements
  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  let foundAny = false;

  for (const id of selectedNodeIds) {
    const el = document.getElementById(`builder-node-${id}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
      foundAny = true;
    }
  }

  if (!foundAny) return null;

  const width = Math.max(maxRight - minLeft, 10);
  const height = Math.max(maxBottom - minTop, 10);

  return (
    <div
      data-testid="selection-box"
      style={{
        position: 'fixed',
        left: `${minLeft}px`,
        top: `${minTop}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 40,
      }}
      className="border-2 border-indigo-500 border-dashed rounded bg-indigo-500/10 transition-all duration-75"
    >
      <div className="absolute -top-6 left-0 px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-mono shadow-md font-semibold whitespace-nowrap">
        {selectedNodeIds.length} items selected ({Math.round(width)} × {Math.round(height)})
      </div>
    </div>
  );
};
