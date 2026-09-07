'use client';

import React, { useState } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, Sparkles, FolderPlus, AlertCircle } from 'lucide-react';

export const NewProjectModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  const [name, setName] = useState('My Next App');
  const [description, setDescription] = useState('A modern high-performance application built with Apex Studio.');
  const [template, setTemplate] = useState('blank');
  const [locale, setLocale] = useState('en');
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'new_project') return null;

  const isRtl = language === 'he';

  const handleCreate = () => {
    setError(null);
    const result = defaultProjectLifecycleManager.createNewProject({
      name,
      description,
      templateId: template,
      language: locale,
    });

    if (result.success && result.project) {
      initializeProject(result.project.id);
      useProjectLifecycleStore.getState().setLifecycleState('OPEN');
      useProjectLifecycleStore.getState().refreshRecentProjects();
      closeModal();
    } else {
      setError(result.error || 'Failed to create new project.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'יצירת פרויקט חדש' : 'Create New Project'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'הגדר פרויקט חדש עם סכימת V9' : 'Initialize a fresh Schema v9 application'}
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRtl ? 'שם הפרויקט' : 'Project Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Dashboard"
              className="w-full px-3 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRtl ? 'תיאור' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isRtl ? 'תבנית התחלתית' : 'Starting Template'}
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="blank">Blank Canvas</option>
                <option value="saas">SaaS Dashboard</option>
                <option value="landing">Landing Page</option>
                <option value="ecommerce">E-Commerce Store</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isRtl ? 'שפה ברירת מחדל' : 'Default Language'}
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="en">English (LTR)</option>
                <option value="he">Hebrew (עברית - RTL)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-end gap-2">
          <button
            onClick={closeModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRtl ? 'צור פרויקט' : 'Create Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
