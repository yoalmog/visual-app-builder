'use client';

import React from 'react';
import { ComponentNode } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Trash2, CopyPlus } from 'lucide-react';

interface SelectionOverlayProps {
  node: ComponentNode;
  isMulti?: boolean;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ node, isMulti = false }) => {
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);
  const removeNode = useBuilderStore((s) => s.removeNode);

  return (
    <>
      {/* Component Name Badge */}
      <div className="absolute -top-5 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 text-[10px] font-semibold text-white rounded-t shadow-md z-30 pointer-events-none uppercase tracking-wider">
        <span>{node.name}</span>
        {isMulti && <span className="bg-indigo-700 px-1 rounded text-[9px]">Multi</span>}
      </div>

      {/* Quick Action Floating Bar */}
      {!isMulti && (
        <div
          className="absolute -top-7 right-0 flex items-center gap-1 bg-[#12151F] border border-slate-700/80 rounded px-1 py-0.5 shadow-lg z-30 text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => duplicateNode(node.id)}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <CopyPlus className="w-3 h-3" />
          </button>
          {node.parentId && (
            <button
              onClick={() => removeNode(node.id)}
              className="p-1 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
              title="Delete (Del)"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </>
  );
};
