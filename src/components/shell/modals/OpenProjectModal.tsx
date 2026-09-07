'use client';

import React, { useState, useEffect } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, FolderOpen, Search, Clock, Trash2, AlertCircle, FileCode } from 'lucide-react';
import { RecentProjectMetadata } from '@/builder/lifecycle/project-lifecycle-types';

export const OpenProjectModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  const [recentProjects, setRecentProjects] = useState<RecentProjectMetadata[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal === 'open_project') {
      setRecentProjects(defaultProjectLifecycleManager.getRecentProjects());
    }
  }, [activeModal]);

  if (activeModal !== 'open_project') return null;

  const isRtl = language === 'he';

  const filtered = recentProjects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (projectId: string) => {
    setError(null);
    const result = defaultProjectLifecycleManager.openProject(projectId);
    if (result.success && result.project) {
      initializeProject(result.project.id);
      useProjectLifecycleStore.getState().setLifecycleState('OPEN');
      useProjectLifecycleStore.getState().refreshRecentProjects();
      closeModal();
    } else {
      setError(result.error || `Failed to open project ${projectId}`);
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    defaultProjectLifecycleManager.removeRecentProject(projectId);
    setRecentProjects(defaultProjectLifecycleManager.getRecentProjects());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'פתיחת פרויקט' : 'Open Project'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'בחר פרויקט מהרשימה או מהפרויקטים האחרונים' : 'Select a project from recent or stored workspaces'}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1E2330] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#1A1F2C] shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? 'חפש לפי שם פרויקט או מזהה...' : 'Search projects by name or ID...'}
              className="w-full pl-9 pr-3 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center gap-2 text-xs text-red-300 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Projects List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <FileCode className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <span>{isRtl ? 'לא נמצאו פרויקטים תואמים' : 'No stored projects found.'}</span>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => item.exists && handleOpen(item.id)}
                className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                  item.exists
                    ? 'bg-[#121622] hover:bg-[#181D2C] border-[#202636] hover:border-indigo-500/50 cursor-pointer'
                    : 'bg-[#10121A] border-[#1C202C] opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-[#181D2B] border border-[#242C3E] flex items-center justify-center text-indigo-400 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2030] text-slate-400 border border-[#262E44]">
                        v{item.schemaVersion}
                      </span>
                      {!item.exists && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/50 text-red-400 border border-red-800/50">
                          {isRtl ? 'לא זמין' : 'Unavailable'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.lastOpened).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{item.pageCount} {isRtl ? 'עמודים' : 'pages'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleRemoveRecent(e, item.id)}
                    title={isRtl ? 'הסר מרשימת האחרונים' : 'Remove from recents'}
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-[#1E2330] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              defaultProjectLifecycleManager.clearRecentProjects();
              setRecentProjects([]);
            }}
            className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
          >
            {isRtl ? 'נקה היסטוריה' : 'Clear Recent Projects'}
          </button>
          <button
            onClick={closeModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
