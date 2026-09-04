'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import {
  Component as ComponentIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ComponentsLibraryPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const createComponentDefinition = useBuilderStore((s) => s.createComponentDefinition);
  const insertComponentInstance = useBuilderStore((s) => s.insertComponentInstance);
  const renameComponentDefinition = useBuilderStore((s) => s.renameComponentDefinition);
  const deleteComponentDefinition = useBuilderStore((s) => s.deleteComponentDefinition);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const components = project.components || [];

  const handleCreateFromSelected = () => {
    if (!selectedNodeId) {
      alert('Please select a component on the canvas to save as a reusable component.');
      return;
    }
    const name = prompt('Enter a name for the new reusable component:');
    if (name) {
      createComponentDefinition(name, selectedNodeId);
    }
  };

  const handleInsert = (defId: string) => {
    const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
    const targetParentId = selectedNodeId || activePage.root.id;
    insertComponentInstance(targetParentId, defId);
  };

  return (
    <aside data-testid="components-library-panel" className="w-64 bg-[#0D0F17] border-r border-[#1E2330] flex flex-col select-none shrink-0 z-20 h-full">
      {/* Header */}
      <div className="p-3 border-b border-[#1E2330] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ComponentIcon className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Library ({components.length})
          </span>
        </div>

        <button
          onClick={handleCreateFromSelected}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
          title="Create component from selection"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {components.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs gap-2">
            <Sparkles className="w-8 h-8 text-slate-600" />
            <span>No reusable components yet. Select any component tree and click Create.</span>
          </div>
        ) : (
          components.map((comp) => {
            const isEditing = editingId === comp.id;

            if (isEditing) {
              return (
                <div key={comp.id} className="p-2 rounded-lg bg-[#161926] border border-purple-500/50 space-y-1.5 text-xs">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#0F111A] border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-purple-500"
                    placeholder="Component name..."
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 rounded text-slate-400 hover:text-white text-[10px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (editName.trim()) renameComponentDefinition(comp.id, editName);
                        setEditingId(null);
                      }}
                      className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={comp.id}
                className="group flex items-center justify-between px-3 py-2 rounded-lg bg-[#131522] border border-[#1E2235] hover:border-purple-500/50 transition-all text-xs"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-purple-900/30 text-purple-400 flex items-center justify-center">
                    <ComponentIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-slate-200 block truncate">{comp.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {comp.variants?.length || 1} variant(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleInsert(comp.id)}
                    className="px-2 py-1 rounded bg-[#1C1F2E] hover:bg-purple-600 hover:text-white text-slate-300 text-[10px] font-medium transition-colors"
                    title="Insert component instance into page"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(comp.id);
                      setEditName(comp.name);
                    }}
                    className="p-1 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Rename component"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete component "${comp.name}"?`)) {
                        deleteComponentDefinition(comp.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete component"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
