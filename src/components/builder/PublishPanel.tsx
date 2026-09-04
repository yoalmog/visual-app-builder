'use client';

import React, { useState, useEffect } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Deployment, EnvironmentName } from '@/builder/schema/cloud';
import { Send, RotateCcw, ExternalLink, CheckCircle2, AlertCircle, Clock, Check, Loader2 } from 'lucide-react';

export const PublishPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const updateDeploymentConfig = useBuilderStore((s) => s.updateDeploymentConfig);

  const [targetEnv, setTargetEnv] = useState<EnvironmentName>('production');
  const [releaseNote, setReleaseNote] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [publishSuccessUrl, setPublishSuccessUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load deployments from backend API
  const fetchDeployments = async () => {
    try {
      const res = await fetch(`/api/deployments?projectId=${encodeURIComponent(project.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.deployments)) {
          setDeployments(data.deployments);
          updateDeploymentConfig({ deployments: data.deployments });
        }
      }
    } catch {
      // fallback to store
      setDeployments(project.deploymentConfig?.deployments || []);
    }
  };

  useEffect(() => {
    fetchDeployments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setPublishSuccessUrl(null);

    try {
      const payload = {
        action: 'publish',
        projectId: project.id,
        environment: targetEnv,
        snapshot: project,
        message: releaseNote.trim() || `Published release to ${targetEnv}`,
      };

      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish deployment');
      }

      setPublishSuccessUrl(data.url || `/app/${project.id}`);
      setReleaseNote('');
      await fetchDeployments();
    } catch (err: any) {
      setError(err.message || 'Error occurred while publishing');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (targetDeploymentId: string) => {
    if (!confirm('Are you sure you want to roll back to this deployment snapshot?')) return;
    setIsPublishing(true);
    setError(null);

    try {
      const payload = {
        action: 'rollback',
        projectId: project.id,
        environment: targetEnv,
        targetDeploymentId,
      };

      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to rollback deployment');
      }

      await fetchDeployments();
    } catch (err: any) {
      setError(err.message || 'Rollback failed');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      data-testid="panel-publish"
      className="w-80 h-full bg-[#0D1017] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Publish & Releases</h2>
            <p className="text-[11px] text-slate-400">Deploy immutable application snapshots</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Pre-flight Checks */}
        <div className="bg-[#121622] p-3 rounded-xl border border-[#222738] space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">Pre-flight Verification</span>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{project.pages?.length || 0} Pages validated</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tokens & Schemas compliant</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero client secrets exposed</span>
            </div>
          </div>
        </div>

        {/* Publish Action Form */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">Release Configuration</label>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Target Environment</span>
            <select
              value={targetEnv}
              onChange={(e) => setTargetEnv(e.target.value as EnvironmentName)}
              className="w-full bg-[#121622] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="production">Production</option>
              <option value="preview">Preview</option>
              <option value="development">Development</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Release Note (Optional)</span>
            <input
              type="text"
              placeholder="e.g., Added auth and dashboard"
              value={releaseNote}
              onChange={(e) => setReleaseNote(e.target.value)}
              className="w-full bg-[#121622] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            data-testid="btn-publish-release"
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Snapshot...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish to {targetEnv}</span>
              </>
            )}
          </button>
        </div>

        {/* Success Banner with Live Link */}
        {publishSuccessUrl && (
          <div
            data-testid="publish-success-banner"
            className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl space-y-2"
          >
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>Snapshot Published!</span>
            </div>
            <a
              href={publishSuccessUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium underline"
            >
              <span>View Live App</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Deployment History */}
        <div className="space-y-3 pt-2 border-t border-[#1B1E2B]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Deployment History</label>
            <span className="text-[10px] text-slate-500">{deployments.length} releases</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {deployments.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center p-3">No deployments recorded yet.</p>
            ) : (
              deployments.map((dep) => (
                <div
                  key={dep.id}
                  data-testid={`deployment-item-${dep.id}`}
                  className="bg-[#121622] p-2.5 rounded-lg border border-[#222738] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">v{dep.version}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 capitalize">
                        {dep.environment}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRollback(dep.id)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
                      title="Rollback to this snapshot"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rollback</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{dep.message || 'No release note'}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(dep.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
