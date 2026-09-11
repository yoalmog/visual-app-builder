'use client';

import React, { useState, useMemo } from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { useBuilderStore } from '@/builder/state/builder-store';
import { generateProjectCodebase } from '@/builder/codegen/react-code-generator';
import { createZipArchive } from '@/builder/codegen/zip-bundler';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileJson,
  Archive,
  Terminal,
  FolderTree,
  ExternalLink,
} from 'lucide-react';

export const ExportProjectModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);
  const project = useBuilderStore((s) => s.project);

  const [activeTab, setActiveTab] = useState<'code' | 'zip' | 'json'>('code');
  const [copied, setCopied] = useState(false);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  const isRtl = language === 'he';

  // Generate complete Next.js 14 codebase
  const codebase = useMemo(() => {
    if (!project) return null;
    return generateProjectCodebase(project);
  }, [project]);

  const exportedJson = useMemo(() => {
    return project ? defaultProjectLifecycleManager.exportProject(project) : '';
  }, [project]);

  if (activeModal !== 'export') return null;

  const currentFile = codebase?.files[selectedFileIdx] || codebase?.files[0];

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;

    let textToCopy = '';
    if (activeTab === 'code' && currentFile) {
      textToCopy = currentFile.content;
    } else if (activeTab === 'json') {
      textToCopy = exportedJson;
    } else {
      textToCopy = `npm install\nnpm run dev`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (typeof window === 'undefined' || !project) return;

    if (activeTab === 'json') {
      const blob = new Blob([exportedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project.name || 'project').toLowerCase().replace(/\s+/g, '-')}-v9.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Download ZIP archive with all files
    if (codebase && codebase.files.length > 0) {
      const zipBlob = createZipArchive(codebase.files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${codebase.projectName}-nextjs14.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-slate-100 flex flex-col h-[85vh] max-h-[750px]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  {isRtl ? 'ייצוא וקוד מקור' : 'Export & Production Code Hub'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Next.js 14 App Router
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isRtl
                  ? 'הפקת קוד מקור מלא React/Tailwind או הורדת חבילת פרויקט מוכנה להפעלה'
                  : 'Generate production-ready TSX codebase, runnable ZIP bundle, or verified Schema v9'}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1E2330] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-[#090B10] border-b border-[#1A1F2C] flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-300 bg-[#121622]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{isRtl ? 'קוד מקור (TSX)' : 'Next.js 14 (TSX)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'zip'
                ? 'border-indigo-500 text-indigo-300 bg-[#121622]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isRtl ? 'הורדת פרויקט (ZIP)' : 'Runnable Bundle (ZIP)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-indigo-500 text-indigo-300 bg-[#121622]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>{isRtl ? 'סכמה JSON (v9)' : 'Schema JSON (v9)'}</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#07090E]">
          {activeTab === 'code' && codebase && (
            <div className="flex-1 flex overflow-hidden">
              {/* File Tree Explorer */}
              <div className="w-56 bg-[#0B0D14] border-r border-[#1B2030] p-3 flex flex-col shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Files ({codebase.files.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {codebase.files.map((file, idx) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFileIdx(idx)}
                      className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg text-xs font-mono truncate flex items-center gap-2 transition-colors ${
                        selectedFileIdx === idx
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824]'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Viewer */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0C12]">
                <div className="px-4 py-2 border-b border-[#1A1F2C] bg-[#0E1119] flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-300 text-[11px]">
                    {currentFile?.path}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {currentFile?.content.split('\n').length} lines
                  </span>
                </div>
                <pre
                  dir="ltr"
                  className="flex-1 p-4 font-mono text-[12px] text-slate-200 overflow-auto select-all leading-relaxed"
                >
                  {currentFile?.content}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'zip' && codebase && (
            <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
                <Archive className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  Download Full Next.js 14 Codebase
                </h3>
                <p className="text-xs text-slate-400">
                  Includes all pages, components, Tailwind configurations, and dependencies ready for immediate local launch.
                </p>
              </div>

              <div className="w-full bg-[#111420] border border-[#1E2536] rounded-xl p-4 text-left font-mono text-xs text-slate-300 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold border-b border-[#1E2536] pb-2">
                  <Terminal className="w-4 h-4" />
                  <span>Run Locally in 2 Steps:</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p className="text-slate-400"># 1. Extract zip and install dependencies</p>
                  <p className="bg-[#0A0C14] p-2 rounded border border-[#1A2030] text-emerald-400">
                    npm install
                  </p>
                  <p className="text-slate-400 pt-1"># 2. Start Next.js development server</p>
                  <p className="bg-[#0A0C14] p-2 rounded border border-[#1A2030] text-emerald-400">
                    npm run dev
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>Download {codebase.projectName}-nextjs14.zip</span>
              </button>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="flex-1 p-4 overflow-hidden flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Schema v9 JSON representation:</span>
                <span className="font-mono text-[11px]">
                  {(exportedJson.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <pre
                dir="ltr"
                className="flex-1 p-3.5 bg-[#090B10] border border-[#1E2332] rounded-lg font-mono text-[11px] text-indigo-200 overflow-auto select-all"
              >
                {exportedJson}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-between shrink-0">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#141824] hover:bg-[#1E2436] border border-[#232A3C] flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>
              {copied
                ? isRtl
                  ? 'הועתק!'
                  : 'Copied!'
                : activeTab === 'code'
                ? isRtl
                  ? 'העתק קוד קובץ'
                  : 'Copy File Code'
                : activeTab === 'json'
                ? isRtl
                  ? 'העתק JSON'
                  : 'Copy JSON'
                : 'Copy Commands'}
            </span>
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
              <span>
                {activeTab === 'zip'
                  ? 'Download ZIP'
                  : activeTab === 'code'
                  ? 'Download Project ZIP'
                  : 'Download JSON'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
