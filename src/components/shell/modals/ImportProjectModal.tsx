'use client';

import React, { useState } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ImportProjectModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'import') return null;

  const isRtl = language === 'he';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content || '');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setError(null);
    const result = defaultProjectLifecycleManager.importProject(jsonText);
    if (result.success && result.project) {
      initializeProject(result.project.id);
      useProjectLifecycleStore.getState().setLifecycleState('OPEN');
      useProjectLifecycleStore.getState().refreshRecentProjects();
      closeModal();
    } else {
      setError(result.error || 'Failed to import project.');
    }
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
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'ייבוא פרויקט' : 'Import Project'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'טעינת פרויקט מקובץ JSON מאומת' : 'Load and validate schema from JSON payload'}
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
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRtl ? 'בחר קובץ JSON' : 'Choose .json File'}
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A2030] file:text-indigo-300 hover:file:bg-[#232B40] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isRtl ? 'או הדבק נתוני JSON ישירות:' : 'Or paste JSON schema directly:'}
            </label>
            <textarea
              dir="ltr"
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{ "id": "proj_123", "name": "App", "version": 9, ... }'
              className="w-full p-3 bg-[#0A0D14] border border-[#232938] rounded-lg font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#121622] border border-[#1E2436] text-[11px] text-slate-400">
            <p>
              {isRtl
                ? 'אבטחה: תוכן הפרויקט המיובא מטופל כנתונים בלבד ועובר אימות קפדני. שום קוד או סקריפט אינו מופעל.'
                : 'Security: Imported data is strictly treated as declarative data. No eval or execution is performed.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={closeModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'ביטול' : 'Cancel'}
          </button>
          <button
            disabled={!jsonText.trim()}
            onClick={handleImport}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              jsonText.trim()
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                : 'bg-[#1C202C] text-slate-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isRtl ? 'בצע ייבוא' : 'Import Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
