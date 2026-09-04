'use client';

import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import * as Icons from 'lucide-react';
import { ViewportMode, EditorMode } from '@/types/schema';

export const TopBar: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const activeMode = useEditorStore((s) => s.activeMode);
  const setActiveMode = useEditorStore((s) => s.setActiveMode);
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const isSaving = useEditorStore((s) => s.isSaving);
  const saveProject = useEditorStore((s) => s.saveProject);
  const setPublishModalOpen = useEditorStore((s) => s.setPublishModalOpen);
  const resetProject = useEditorStore((s) => s.resetProject);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return (
    <header className="h-14 bg-[#0A0B10] border-b border-[#1E2230] flex items-center justify-between px-4 select-none z-30 shrink-0">
      {/* Left: Brand Logo + Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Icons.Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden md:inline">
            APEX<span className="text-indigo-400">STUDIO</span>
          </span>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={project.name}
            onChange={(e) => {
              const name = e.target.value;
              useEditorStore.setState((s) => ({ project: { ...s.project, name } }));
            }}
            className="bg-transparent text-xs font-semibold text-slate-200 hover:text-white px-2 py-1 rounded hover:bg-[#161922] focus:bg-[#161922] border border-transparent focus:border-indigo-500 outline-none w-44 truncate"
          />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Icons.Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icons.Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Modes & Viewport Controls */}
      <div className="flex items-center gap-4">
        {/* Mode Switcher */}
        <div className="flex items-center bg-[#141620] p-0.5 rounded-lg border border-[#202536]">
          {(['design', 'data', 'logic', 'code'] as EditorMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                activeMode === mode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Viewports */}
        <div className="hidden lg:flex items-center bg-[#141620] p-0.5 rounded-lg border border-[#202536]">
          {(['desktop', 'tablet', 'mobile'] as ViewportMode[]).map((v) => {
            const Icon = v === 'desktop' ? Icons.Monitor : v === 'tablet' ? Icons.Tablet : Icons.Smartphone;
            return (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewport === v ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Switch to ${v} viewport`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div className="hidden xl:flex items-center gap-1 text-slate-400 text-xs">
          <button
            onClick={() => setZoom(zoom - 0.1)}
            className="p-1 hover:bg-slate-800 rounded text-slate-300"
            title="Zoom Out"
          >
            <Icons.Minus className="w-3 h-3" />
          </button>
          <span className="w-10 text-center font-mono text-[11px] text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(zoom + 0.1)}
            className="p-1 hover:bg-slate-800 rounded text-slate-300"
            title="Zoom In"
          >
            <Icons.Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Preview, Save, Publish, Template Switcher */}
      <div className="flex items-center gap-2">
        {/* Starter Template switch */}
        <select
          onChange={(e) => resetProject(e.target.value as any)}
          defaultValue="modern-store"
          className="bg-[#141620] border border-[#202536] text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
          title="Load starter template"
        >
          <option value="modern-store">Template: Streetwear Store</option>
          <option value="blank">Template: Blank App</option>
        </select>

        {/* Preview Mode Toggle */}
        <button
          onClick={() => togglePreview()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isPreviewMode
              ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-md'
              : 'bg-[#181B26] hover:bg-[#202534] text-slate-200 border border-[#262C40]'
          }`}
        >
          <Icons.Play className="w-3.5 h-3.5 fill-current" />
          <span>{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
        </button>

        {/* Save */}
        <button
          onClick={saveProject}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181B26] hover:bg-[#202534] text-slate-200 border border-[#262C40] transition-colors"
        >
          {isSaving ? (
            <Icons.Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          ) : (
            <Icons.Save className="w-3.5 h-3.5" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        {/* Publish */}
        <button
          onClick={() => setPublishModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
        >
          <Icons.UploadCloud className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
};
