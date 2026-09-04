'use client';

import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import * as Icons from 'lucide-react';
import confetti from 'canvas-confetti';

export const PublishModal: React.FC = () => {
  const isOpen = useEditorStore((s) => s.isPublishModalOpen);
  const setIsOpen = useEditorStore((s) => s.setPublishModalOpen);
  const project = useEditorStore((s) => s.project);
  const showToast = useEditorStore((s) => s.showToast);

  const [isDeploying, setIsDeploying] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePublish = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      const url = `https://${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.apexstudio.app`;
      setPublishedUrl(url);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore if window not available
      }

      showToast('App published to Edge CDN!');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0F1118] border border-[#23293D] rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Icons.Rocket className="w-5 h-5 text-indigo-400" />
            <span>Publish Application</span>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setPublishedUrl(null);
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>

        {!publishedUrl ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Project Name</label>
              <input
                type="text"
                disabled
                value={project.name}
                className="w-full bg-[#161924] border border-[#23293D] rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Deployment Environment</label>
              <select className="w-full bg-[#161924] border border-[#23293D] rounded-lg px-3 py-2 text-white">
                <option>Production (Edge CDN Global)</option>
                <option>Staging (Preview Branch)</option>
              </select>
            </div>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-slate-300 space-y-1">
              <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <Icons.CheckCircle2 className="w-4 h-4" />
                <span>Zero-Config Deployment</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Your AST project will be compiled into optimized static assets and edge functions with automated SSL.
              </p>
            </div>

            <button
              onClick={handlePublish}
              disabled={isDeploying}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all text-sm"
            >
              {isDeploying ? (
                <>
                  <Icons.Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deploying to Global Edge...</span>
                </>
              ) : (
                <>
                  <Icons.UploadCloud className="w-4 h-4" />
                  <span>Publish Now</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Icons.CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Published Successfully!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your application is live and accessible across the global edge network.
              </p>
            </div>

            <div className="p-3 bg-[#151926] border border-[#23293D] rounded-xl flex items-center justify-between gap-2 text-xs">
              <span className="font-mono text-indigo-400 truncate">{publishedUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publishedUrl);
                  showToast('URL copied to clipboard!');
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium shrink-0"
              >
                Copy URL
              </button>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                setPublishedUrl(null);
              }}
              className="w-full py-2 bg-[#181B26] hover:bg-[#202534] text-slate-300 rounded-xl text-xs font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
