'use client';

import React, { useState } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { X, Download, Copy, Check, FileJson } from 'lucide-react';

export const ExportProjectModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const project = useBuilderStore((s) => s.project);

  const [copied, setCopied] = useState(false);

  if (activeModal !== 'export') return null;

  const isRtl = language === 'he';
  const exportedJson = project ? defaultProjectLifecycleManager.exportProject(project) : '';

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(exportedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project?.name || 'project').toLowerCase().replace(/\s+/g, '-')}-v9.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'ייצוא פרויקט' : 'Export Project'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'ייצוא מבנה הפרויקט בפורמט JSON תקני' : 'Export verified Schema v9 JSON representation'}
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
        <div className="p-6 flex-1 overflow-hidden flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isRtl ? 'תצוגה מקדימה של נתוני JSON:' : 'JSON Payload Preview:'}</span>
            <span className="font-mono text-[11px]">
              {(exportedJson.length / 1024).toFixed(1)} KB
            </span>
          </div>

          <pre
            dir="ltr"
            className="flex-1 p-3.5 bg-[#090B10] border border-[#1E2332] rounded-lg font-mono text-[11px] text-indigo-200 overflow-auto max-h-[300px] select-all"
          >
            {exportedJson}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-between shrink-0">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#141824] hover:bg-[#1E2436] border border-[#232A3C] flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isRtl ? 'הועתק!' : 'Copied!') : (isRtl ? 'העתק JSON' : 'Copy JSON')}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={closeModal}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1A1F2C] transition-colors"
            >
              {isRtl ? 'סגור' : 'Close'}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'הורד קובץ' : 'Download File'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
