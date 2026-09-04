'use client';

import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { RenderComponent } from '../renderer/RenderComponent';
import * as Icons from 'lucide-react';

export const DesignCanvas: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const activePage = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];
  const viewport = useEditorStore((s) => s.viewport);
  const customViewportWidth = useEditorStore((s) => s.customViewportWidth);
  const zoom = useEditorStore((s) => s.zoom);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const copyNode = useEditorStore((s) => s.copyNode);
  const addNode = useEditorStore((s) => s.addNode);
  const draggedComponentType = useEditorStore((s) => s.draggedComponentType);
  const dragOverNodeId = useEditorStore((s) => s.dragOverNodeId);
  const setDragOverNode = useEditorStore((s) => s.setDragOverNode);

  const selectedNode = selectedNodeId ? project.nodes[selectedNodeId] : null;

  // Compute breadcrumbs for selected component
  const getBreadcrumbs = () => {
    if (!selectedNode) return [];
    const crumbs: { id: string; name: string }[] = [];
    let curr: string | null = selectedNode.id;
    while (curr) {
      const node: any = project.nodes[curr];
      if (!node) break;
      crumbs.unshift({ id: node.id, name: node.name });
      curr = node.parentId;
    }
    return crumbs;
  };

  // Determine viewport width style
  const getViewportWidth = () => {
    switch (viewport) {
      case 'tablet':
        return '768px';
      case 'mobile':
        return '375px';
      case 'custom':
        return `${customViewportWidth}px`;
      case 'desktop':
      default:
        return '100%';
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverNodeId !== activePage.rootNodeId) {
      setDragOverNode(activePage.rootNodeId);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(null);

    const internalMoveId = e.dataTransfer.getData('application/node-id');
    const incomingType = e.dataTransfer.getData('application/component-type') || draggedComponentType;

    if (internalMoveId) {
      useEditorStore.getState().moveNode(internalMoveId, activePage.rootNodeId);
      return;
    }

    if (incomingType) {
      addNode(incomingType, activePage.rootNodeId);
    }
  };

  return (
    <div
      className="relative flex-1 h-full overflow-auto bg-[#07080B] flex flex-col items-center justify-start p-8 select-none"
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
      onClick={() => selectNode(null)}
      onDragOver={handleRootDragOver}
      onDrop={handleRootDrop}
    >
      {/* Floating Quick Action Toolbar when a node is selected */}
      {selectedNode && (
        <div
          className="fixed top-16 z-40 flex items-center gap-2 px-3 py-1.5 bg-[#12151F]/90 backdrop-blur-md border border-slate-700/80 rounded-full shadow-2xl text-xs text-white animate-in fade-in slide-in-from-top-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1 text-slate-400 font-medium px-1 border-r border-slate-700/60 pr-2.5">
            {getBreadcrumbs().map((crumb, idx, arr) => (
              <React.Fragment key={crumb.id}>
                <button
                  className="hover:text-indigo-400 transition-colors"
                  onClick={() => selectNode(crumb.id)}
                >
                  {crumb.name}
                </button>
                {idx < arr.length - 1 && <span className="text-slate-600">/</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => copyNode(selectedNode.id)}
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
            title="Copy (Ctrl+C)"
          >
            <Icons.Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => duplicateNode(selectedNode.id)}
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Icons.CopyPlus className="w-3.5 h-3.5" />
          </button>
          {selectedNode.parentId && (
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="p-1.5 hover:bg-red-500/20 rounded-md text-slate-300 hover:text-red-400 transition-colors"
              title="Delete (Del)"
            >
              <Icons.Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Canvas Viewport Frame */}
      <div
        className="transition-all duration-200 shadow-2xl relative"
        style={{
          width: getViewportWidth(),
          maxWidth: viewport === 'desktop' ? '1280px' : getViewportWidth(),
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Device Frame Header for Mobile/Tablet */}
        {viewport !== 'desktop' && (
          <div className="w-full bg-[#161922] border border-slate-800 rounded-t-xl px-4 py-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 inline-block" />
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {viewport === 'tablet' ? 'iPad Pro (768px)' : 'iPhone 15 (375px)'}
            </span>
            <div className="w-4" />
          </div>
        )}

        {/* The Page Root Component Tree */}
        <div
          className={`min-h-[850px] bg-[#07080C] overflow-hidden ${
            viewport !== 'desktop' ? 'rounded-b-xl border border-t-0 border-slate-800' : 'rounded-xl border border-slate-800/80'
          }`}
        >
          {activePage?.rootNodeId ? (
            <RenderComponent nodeId={activePage.rootNodeId} isPreview={false} />
          ) : (
            <div className="p-12 text-center text-slate-500">No root node configured for page.</div>
          )}
        </div>
      </div>
    </div>
  );
};
