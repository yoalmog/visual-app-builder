'use client';

import React, { useState, useEffect } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { defaultDeploymentPipeline, defaultDomainProvider } from '@/builder/platform/deployments/DeploymentPipeline';
import { defaultVersionControlProvider } from '@/builder/platform/version-control/VersionControlProvider';
import { Release, CustomDomain } from '@/builder/schema/platform';
import {
  UploadCloud,
  RotateCcw,
  Globe,
  CheckCircle,
  AlertCircle,
  Clock,
  Terminal,
  ExternalLink,
  Shield,
} from 'lucide-react';

export const DeploymentsPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const [selectedEnv, setSelectedEnv] = useState<'development' | 'preview' | 'production'>('production');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newHostname, setNewHostname] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const rels = await defaultVersionControlProvider.listReleases(project.id, selectedEnv);
      setReleases(rels);
      const doms = await defaultDomainProvider.listDomains(project.id);
      setDomains(doms);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEnv, project.id]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployLogs(['Starting deployment pipeline...']);

    try {
      const branchName = project.branch || 'main';
      const branch = await defaultVersionControlProvider.getBranch(project.id, branchName);
      const commitId = branch?.headCommitId || 'commit_default';

      const res = await defaultDeploymentPipeline.executePipeline({
        projectId: project.id,
        organizationId: project.organizationId || 'org_default',
        environment: selectedEnv,
        branchName,
        commitId,
        projectSnapshot: project,
        actorId: 'user_admin',
      });

      setDeployLogs(res.buildJob.logs);

      if (res.previewDeployment) {
        setPreviewUrl(res.previewDeployment.url);
      }

      await loadData();
    } catch (err: any) {
      setDeployLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async (targetReleaseId: string) => {
    const confirm = window.confirm('Are you sure you want to rollback this environment to the selected release?');
    if (!confirm) return;

    try {
      await defaultDeploymentPipeline.rollback({
        projectId: project.id,
        environment: selectedEnv,
        targetReleaseId,
        actorId: 'user_admin',
        reason: 'User manual rollback from Deployments Panel',
      });
      await loadData();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname.trim()) return;

    try {
      await defaultDomainProvider.addDomain(project.id, selectedEnv, newHostname.trim());
      setNewHostname('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to add domain: ${err.message}`);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      await defaultDomainProvider.verifyDomain(domainId);
      await loadData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  return (
    <div
      data-testid="deployments-panel"
      className="w-84 h-full bg-[#0C0E15] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none text-xs"
    >
      {/* Header */}
      <div className="p-3 border-b border-[#1A1F2E] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <UploadCloud className="w-4 h-4 text-indigo-400" />
          <span>Deployments</span>
        </div>

        {/* Environment Selector */}
        <select
          data-testid="env-select"
          value={selectedEnv}
          onChange={(e) => setSelectedEnv(e.target.value as any)}
          className="bg-[#141724] border border-[#222738] rounded px-2 py-1 text-slate-300 font-semibold outline-none"
        >
          <option value="production">Production</option>
          <option value="preview">Preview</option>
          <option value="development">Dev</option>
        </select>
      </div>

      {/* Action Bar */}
      <div className="p-3 border-b border-[#1A1F2E] bg-[#0E111B] flex flex-col gap-2">
        <button
          data-testid="deploy-button"
          onClick={handleDeploy}
          disabled={isDeploying}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{isDeploying ? 'Deploying Pipeline...' : `Deploy to ${selectedEnv}`}</span>
        </button>

        {previewUrl && selectedEnv === 'preview' && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20"
          >
            <span>Open Preview Deployment</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Live Pipeline Logs */}
      {deployLogs.length > 0 && (
        <div className="p-2.5 border-b border-[#1A1F2E] bg-[#090B10] max-h-36 overflow-y-auto font-mono text-[10px] text-slate-400">
          <div className="flex items-center gap-1 text-slate-300 font-bold mb-1">
            <Terminal className="w-3 h-3 text-indigo-400" />
            <span>Build & Health Probe Logs</span>
          </div>
          {deployLogs.map((log, idx) => (
            <div key={idx} className="leading-tight py-0.5">
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Releases & Rollbacks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
            Release History
          </div>
          <div className="space-y-2">
            {releases.map((r) => (
              <div
                key={r.id}
                data-testid={`release-item-${r.id}`}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  r.isCurrent ? 'bg-[#151929] border-emerald-500/40' : 'bg-[#121622] border-[#202638]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{r.versionTag}</span>
                    {r.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full font-semibold">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Branch: {r.branch} • Commit: {r.commitId.slice(-6)}
                  </div>
                </div>

                {!r.isCurrent && (
                  <button
                    onClick={() => handleRollback(r.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#1C2234] hover:bg-[#27304A] text-amber-400 text-[10px] font-semibold"
                    title="Rollback environment to this release"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Rollback</span>
                  </button>
                )}
              </div>
            ))}
            {releases.length === 0 && (
              <div className="text-slate-500 text-center py-4">No releases published for this environment</div>
            )}
          </div>
        </div>

        {/* Custom Domains */}
        <div className="pt-2 border-t border-[#1A1F2E]">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide flex items-center justify-between">
            <span>Custom Domains</span>
            <Globe className="w-3 h-3 text-indigo-400" />
          </div>

          <form onSubmit={handleAddDomain} className="flex gap-1 mb-2">
            <input
              type="text"
              placeholder="app.example.com"
              value={newHostname}
              onChange={(e) => setNewHostname(e.target.value)}
              className="flex-1 bg-[#141724] border border-[#21273C] rounded px-2 py-1 text-xs text-white outline-none"
            />
            <button
              type="submit"
              disabled={!newHostname.trim()}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-[11px]"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5">
            {domains.map((d) => (
              <div
                key={d.id}
                className="p-2 rounded-lg bg-[#121622] border border-[#202638] flex items-center justify-between text-[11px]"
              >
                <div>
                  <div className="font-semibold text-white">{d.hostname}</div>
                  <div className="text-[10px] text-slate-400">
                    Status: <span className="text-emerald-400">{d.status}</span>
                  </div>
                </div>
                {d.status !== 'active' && (
                  <button
                    onClick={() => handleVerifyDomain(d.id)}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px]"
                  >
                    Verify DNS
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
