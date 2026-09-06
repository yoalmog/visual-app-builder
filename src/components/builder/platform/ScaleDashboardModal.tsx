'use client';

import React, { useState, useEffect } from 'react';
import { usePlatformStore } from '../../../builder/state/platform-store';
import {
  defaultRegionProvider,
  defaultCacheProvider,
  defaultDatabaseScalingProvider,
  defaultWorkerProvider,
  defaultAutoscalingProvider,
  defaultHealthCheckProvider,
  defaultDisasterRecoveryProvider,
} from '../../../builder/platform/enterprise/InfrastructureProviders';
import { Region, RegionRoutingPolicyConfig, CacheStats, DatabaseTopology, AdvancedJob, AutoscalingConfig, PlatformHealthOverview } from '../../../builder/schema/platform-v9';

export const ScaleDashboardModal: React.FC = () => {
  const { isScaleDashboardOpen, setScaleDashboardOpen, activeRegion, setActiveRegion } = usePlatformStore();
  const [activeTab, setActiveTab] = useState<'regions' | 'cache' | 'database' | 'workers' | 'health' | 'dr'>('regions');

  const [regions, setRegions] = useState<Region[]>([]);
  const [routingPolicy, setRoutingPolicy] = useState<RegionRoutingPolicyConfig | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [dbTopology, setDbTopology] = useState<DatabaseTopology | null>(null);
  const [jobs, setJobs] = useState<AdvancedJob[]>([]);
  const [autoscaling, setAutoscaling] = useState<AutoscalingConfig | null>(null);
  const [healthOverview, setHealthOverview] = useState<PlatformHealthOverview | null>(null);
  const [tagToInvalidate, setTagToInvalidate] = useState('');
  const [invalidationMessage, setInvalidationMessage] = useState('');
  const [failoverStatus, setFailoverStatus] = useState<string>('idle');

  useEffect(() => {
    if (!isScaleDashboardOpen) return;

    defaultRegionProvider.listRegions().then(setRegions);
    defaultRegionProvider.getRoutingPolicy().then(setRoutingPolicy);
    defaultCacheProvider.getStats().then(setCacheStats);
    defaultDatabaseScalingProvider.getTopology().then(setDbTopology);
    defaultWorkerProvider.listJobs().then(setJobs);
    defaultAutoscalingProvider.getConfig().then(setAutoscaling);
    defaultHealthCheckProvider.getOverview().then(setHealthOverview);
    defaultDisasterRecoveryProvider.getPlan('org_default').then((p) => setFailoverStatus(p.failoverStatus));
  }, [isScaleDashboardOpen]);

  if (!isScaleDashboardOpen) return null;

  const handleInvalidateTag = async () => {
    if (!tagToInvalidate.trim()) return;
    const count = await defaultCacheProvider.invalidateByTag(tagToInvalidate.trim());
    setInvalidationMessage(`Evicted ${count} cache entries tagged with '${tagToInvalidate.trim()}'.`);
    const stats = await defaultCacheProvider.getStats();
    setCacheStats(stats);
    setTagToInvalidate('');
    setTimeout(() => setInvalidationMessage(''), 4000);
  };

  const handleTriggerFailover = async () => {
    const res = await defaultDisasterRecoveryProvider.initiateFailover('org_default');
    setFailoverStatus(res.status);
  };

  const handleTriggerFailback = async () => {
    const res = await defaultDisasterRecoveryProvider.initiateFailback('org_default');
    setFailoverStatus(res.status);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Platform Scale & Infrastructure Dashboard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Platform Scale & Infrastructure</h2>
              <p className="text-xs text-slate-400">Multi-region topology, distributed cache, read replicas, and worker orchestration</p>
            </div>
          </div>
          <button
            onClick={() => setScaleDashboardOpen(false)}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2">
          {(['regions', 'cache', 'database', 'workers', 'health', 'dr'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'dr' ? 'Disaster Recovery' : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* REGIONS TAB */}
          {activeTab === 'regions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Multi-Region Deployment Topology</h3>
                  <p className="text-xs text-slate-400">Traffic is routed across global edge locations with automated failover</p>
                </div>
                {routingPolicy && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Policy: {routingPolicy.policy.toUpperCase()} ({routingPolicy.dataResidency})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {regions.map((reg) => (
                  <div
                    key={reg.id}
                    onClick={() => setActiveRegion(reg.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      activeRegion === reg.id
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">{reg.id}</span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {reg.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">{reg.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{reg.location}</div>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                      <span>Edge Latency:</span>
                      <span className="font-mono text-emerald-300 font-bold">{reg.latencyMs}ms</span>
                    </div>
                    {reg.isPrimary && (
                      <div className="mt-2 text-center py-1 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                        PRIMARY REGION
                      </div>
                    )}
                    {reg.isFailover && (
                      <div className="mt-2 text-center py-1 rounded bg-amber-500/20 text-amber-300 text-[11px] font-semibold">
                        FAILOVER TARGET
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CACHE TAB */}
          {activeTab === 'cache' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Cache Hits</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{cacheStats?.hits || 0}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Cache Misses</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{cacheStats?.misses || 0}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Active Entries</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{cacheStats?.entryCount || 0}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Memory Allocation</span>
                  <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                    {cacheStats ? Math.round(cacheStats.sizeBytes / 1024) : 0} KB
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">Cache Invalidation by Tag</h4>
                <p className="text-xs text-slate-400">Instantly purge edge and distributed cache entries across all regions by tag.</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={tagToInvalidate}
                    onChange={(e) => setTagToInvalidate(e.target.value)}
                    placeholder="e.g. project_default, tokens, theme"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleInvalidateTag}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Purge Tag
                  </button>
                </div>
                {invalidationMessage && (
                  <p className="text-xs text-emerald-400 font-medium">{invalidationMessage}</p>
                )}
              </div>
            </div>
          )}

          {/* DATABASE TAB */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Primary Database (Writes & Strong Reads)</span>
                  <div className="text-sm font-mono text-indigo-400 font-bold mt-1">{dbTopology?.primaryHost}</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  Region: {dbTopology?.primaryRegionId}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">Read Replicas (Eventual Consistency & Scale)</h4>
              <div className="space-y-3">
                {dbTopology?.replicas.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{rep.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{rep.regionId}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{rep.host}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-400 font-medium">Lag: {rep.replicationLagMs}ms</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Weight: {rep.weight}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WORKERS TAB */}
          {activeTab === 'workers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Current Capacity</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{autoscaling?.currentCapacity || 2} nodes</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">CPU Utilization</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{autoscaling?.currentCpuUtilization || 0}%</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Queued Jobs</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {jobs.filter((j) => j.status === 'queued').length}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="text-xs text-slate-400 font-medium">Completed Jobs</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {jobs.filter((j) => j.status === 'completed').length}
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">Recent Background Jobs</h4>
              <div className="space-y-2">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white font-mono">{job.type}</span>
                      <span className="ml-2 text-slate-400 font-mono">[{job.queueName}]</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 uppercase text-[10px] font-semibold">{job.priority}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">System Status: {healthOverview?.status.toUpperCase()}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Liveness probe: active | Readiness probe: active</div>
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">Dependency Health Probes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {healthOverview?.probes.map((probe) => (
                  <div key={probe.service} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 capitalize">{probe.service}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">{probe.latencyMs}ms</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        {probe.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DR TAB */}
          {activeTab === 'dr' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Multi-Region Disaster Recovery Plan</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    failoverStatus === 'idle' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    Status: {failoverStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Automated failover routes traffic from Primary (us-east-1) to Secondary (eu-central-1) within target RTO of 15 minutes.
                </p>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={handleTriggerFailover}
                    disabled={failoverStatus === 'failed_over'}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Simulate DR Failover
                  </button>
                  <button
                    onClick={handleTriggerFailback}
                    disabled={failoverStatus === 'idle'}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Failback to Primary
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
