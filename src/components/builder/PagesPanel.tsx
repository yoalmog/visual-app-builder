'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import {
  FileText,
  Plus,
  CopyPlus,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
} from 'lucide-react';

export const PagesPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const setActivePage = useBuilderStore((s) => s.setActivePage);
  const addPage = useBuilderStore((s) => s.addPage);
  const duplicatePage = useBuilderStore((s) => s.duplicatePage);
  const removePage = useBuilderStore((s) => s.removePage);
  const renamePage = useBuilderStore((s) => s.renamePage);
  const updatePageSlug = useBuilderStore((s) => s.updatePageSlug);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  const handleStartEdit = (p: { id: string; name: string; slug: string }) => {
    setEditingPageId(p.id);
    setEditName(p.name);
    setEditSlug(p.slug);
  };

  const handleSaveEdit = (pageId: string) => {
    if (editName.trim()) renamePage(pageId, editName);
    if (editSlug.trim()) updatePageSlug(pageId, editSlug);
    setEditingPageId(null);
  };

  const handleCreatePage = () => {
    const pageCount = project.pages.length;
    const name = `Page ${pageCount + 1}`;
    addPage(name);
  };

  return (
    <aside data-testid="pages-panel" className="w-64 bg-[#0D0F17] border-r border-[#1E2330] flex flex-col select-none shrink-0 z-20 h-full">
      {/* Header */}
      <div className="p-3 border-b border-[#1E2330] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Pages ({project.pages.length})
          </span>
        </div>

        <button
          onClick={handleCreatePage}
          className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
          title="Create New Page"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {project.pages.map((p) => {
          const isActive = p.id === activePageId;
          const isEditing = editingPageId === p.id;

          if (isEditing) {
            return (
              <div
                key={p.id}
                className="p-2.5 rounded-lg bg-[#161926] border border-indigo-500/50 space-y-2 text-xs"
              >
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Page Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#0F111A] border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Slug</label>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full bg-[#0F111A] border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    onClick={() => setEditingPageId(null)}
                    className="px-2 py-1 rounded hover:bg-[#202538] text-slate-400 hover:text-white text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(p.id)}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1"
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
              key={p.id}
              onClick={() => setActivePage(p.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                isActive
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                  : 'bg-[#12141F] border-[#1C2030] text-slate-300 hover:bg-[#181B2A] hover:text-white'
              }`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]' : 'bg-slate-600'
                  }`}
                />
                <div className="truncate">
                  <span className="font-semibold text-xs block truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 block truncate">{p.slug}</span>
                </div>
              </div>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(p);
                  }}
                  className="p-1 hover:text-white text-slate-400"
                  title="Rename / Edit Slug"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicatePage(p.id);
                  }}
                  className="p-1 hover:text-white text-slate-400"
                  title="Duplicate Page"
                >
                  <CopyPlus className="w-3 h-3" />
                </button>
                {project.pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete page "${p.name}"?`)) {
                        removePage(p.id);
                      }
                    }}
                    className="p-1 hover:text-red-400 text-slate-400"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
