'use client';

import React, { useState } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, Settings, Check } from 'lucide-react';

export const ProjectSettingsModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const project = useBuilderStore((s) => s.project);
  const setProject = useBuilderStore((s) => s.setProject);

  const [name, setName] = useState(project?.name || '');
  const [primaryColor, setPrimaryColor] = useState(project?.theme?.primaryColor || '#4F46E5');
  const [backgroundColor, setBackgroundColor] = useState(project?.theme?.backgroundColor || '#FFFFFF');
  const [saved, setSaved] = useState(false);

  if (activeModal !== 'project_settings') return null;

  const isRtl = language === 'he';

  const handleSave = () => {
    if (!project) return;
    const updated = {
      ...project,
      name,
      theme: {
        ...project.theme,
        primaryColor,
        backgroundColor,
      },
    };
    setProject(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      closeModal();
    }, 400);
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
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'הגדרות פרויקט' : 'Project Settings'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'ניהול ערכת נושא והגדרות פרויקט פעיל' : 'Configure current project identity and theme tokens'}
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRtl ? 'שם הפרויקט' : 'Project Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isRtl ? 'צבע ראשי' : 'Primary Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#262D3D] bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isRtl ? 'צבע רקע' : 'Background Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#262D3D] bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#141824] border border-[#262D3D] rounded-lg text-xs text-white uppercase focus:outline-none"
                />
              </div>
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
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-colors"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? (isRtl ? 'נשמר' : 'Saved!') : (isRtl ? 'שמור שינויים' : 'Save Changes')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
