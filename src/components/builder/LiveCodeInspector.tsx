'use client';

import React, { useMemo, useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { generateNodeJSX, generatePageCode } from '@/builder/codegen/react-code-generator';
import { Code2, X, Copy, Check, FileCode, Sparkles } from 'lucide-react';

interface LiveCodeInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveCodeInspector: React.FC<LiveCodeInspectorProps> = ({ isOpen, onClose }) => {
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);

  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'page' | 'selection'>('page');

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

  // Selected node lookup
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !activePage) return null;
    return findNodeInTree(activePage.root, selectedNodeId);
  }, [selectedNodeId, activePage]);

  // Code generation
  const pageCode = useMemo(() => {
    if (!activePage) return '// No active page';
    return generatePageCode(activePage.name, activePage.root);
  }, [activePage]);

  const selectedCode = useMemo(() => {
    if (!selectedNode) return '// No component selected';
    return generateNodeJSX(selectedNode, 0);
  }, [selectedNode]);

  if (!isOpen) return null;

  const currentCode = viewMode === 'selection' && selectedNode ? selectedCode : pageCode;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="h-64 bg-[#0A0D14] border-t border-[#1D2230] flex flex-col z-20 shadow-2xl shrink-0">
      {/* Inspector Header */}
      <div className="h-9 px-4 bg-[#0E1119] border-b border-[#1A1F2C] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold tracking-tight text-white">Live Code Inspector</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            TSX / Tailwind
          </span>

          <div className="h-3 w-px bg-slate-800 mx-1" />

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#141824] p-0.5 rounded border border-[#202534] text-[11px]">
            <button
              onClick={() => setViewMode('page')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'page'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Page ({activePage?.name || 'Home'})
            </button>
            <button
              onClick={() => setViewMode('selection')}
              disabled={!selectedNode}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'selection'
                  ? 'bg-indigo-600 text-white font-medium'
                  : selectedNode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              Selected Node {selectedNode ? `(${selectedNode.type})` : ''}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161A26] hover:bg-[#1E2436] border border-[#232A3C] text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy TSX'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1B202E] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 p-3 font-mono text-[12px] text-slate-200 bg-[#07090E] overflow-auto select-all leading-relaxed">
        <pre>{currentCode}</pre>
      </div>
    </div>
  );
};

function findNodeInTree(root: any, targetId: string): any {
  if (!root) return null;
  if (root.id === targetId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
}
