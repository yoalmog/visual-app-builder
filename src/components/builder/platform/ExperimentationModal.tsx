'use client';

import React, { useState, useEffect } from 'react';
import { usePlatformStore } from '../../../builder/state/platform-store';
import {
  defaultFeatureFlagProvider,
  defaultExperimentProvider,
} from '../../../builder/platform/enterprise/ExperimentationAndDeployments';
import { FeatureFlag, Experiment } from '../../../builder/schema/platform-v9';

export const ExperimentationModal: React.FC = () => {
  const { isExperimentationOpen, setExperimentationOpen } = usePlatformStore();
  const [activeTab, setActiveTab] = useState<'flags' | 'experiments'>('flags');

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  // New Flag Form
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagRollout, setNewFlagRollout] = useState(50);

  // New Experiment Form
  const [newExpKey, setNewExpKey] = useState('');
  const [newExpName, setNewExpName] = useState('');

  useEffect(() => {
    if (!isExperimentationOpen) return;

    defaultFeatureFlagProvider.listFlags('org_default').then((fs) => {
      if (fs.length === 0) {
        // Seed default flag
        defaultFeatureFlagProvider.createFlag({
          organizationId: 'org_default',
          key: 'new_checkout_flow',
          name: 'Modern One-Step Checkout',
          description: 'Enables new streamlined checkout dialog',
          enabled: true,
          percentageRollout: 50,
          environmentTargets: ['development', 'preview', 'staging', 'production'],
        }).then((f) => setFlags([f]));
      } else {
        setFlags(fs);
      }
    });

    defaultExperimentProvider.listExperiments('org_default').then((es) => {
      if (es.length === 0) {
        defaultExperimentProvider.createExperiment({
          organizationId: 'org_default',
          key: 'cta_button_color',
          name: 'Hero CTA Button Color',
          description: 'Comparing indigo vs emerald conversion rates',
          status: 'running',
          targetAudiencePercent: 100,
          primaryMetric: 'conversion_rate',
          variants: [
            { id: 'v_control', name: 'Control (Indigo)', key: 'indigo', weight: 50, variables: { color: '#4F46E5' } },
            { id: 'v_variant_b', name: 'Variant B (Emerald)', key: 'emerald', weight: 50, variables: { color: '#10B981' } },
          ],
        }).then((e) => setExperiments([e]));
      } else {
        setExperiments(es);
      }
    });
  }, [isExperimentationOpen]);

  if (!isExperimentationOpen) return null;

  const handleCreateFlag = async () => {
    if (!newFlagKey.trim() || !newFlagName.trim()) return;
    const flag = await defaultFeatureFlagProvider.createFlag({
      organizationId: 'org_default',
      key: newFlagKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: newFlagName.trim(),
      description: 'Custom feature flag',
      enabled: true,
      percentageRollout: newFlagRollout,
      environmentTargets: ['development', 'preview', 'staging', 'production'],
    });

    setFlags([...flags, flag]);
    setNewFlagKey('');
    setNewFlagName('');
  };

  const handleToggleFlag = async (flagId: string, currentEnabled: boolean) => {
    const flag = await defaultFeatureFlagProvider.getFlag(flagId);
    if (!flag) return;
    flag.enabled = !currentEnabled;
    flag.updatedAt = new Date().toISOString();
    setFlags(flags.map((f) => (f.id === flagId ? { ...f, enabled: flag.enabled } : f)));
  };

  const handleUpdateRollout = async (flagId: string, rollout: number) => {
    const flag = await defaultFeatureFlagProvider.getFlag(flagId);
    if (!flag) return;
    flag.percentageRollout = rollout;
    flag.updatedAt = new Date().toISOString();
    setFlags(flags.map((f) => (f.id === flagId ? { ...f, percentageRollout: rollout } : f)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Experimentation & Feature Flags"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Experimentation & Feature Flags</h2>
              <p className="text-xs text-slate-400">Targeted rollouts, deterministic percentage bucketing, and A/B split testing</p>
            </div>
          </div>
          <button
            onClick={() => setExperimentationOpen(false)}
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
          {(['flags', 'experiments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors uppercase text-xs tracking-wider ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'flags' ? 'Feature Flags' : 'A/B Experiments'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FLAGS TAB */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                <h4 className="text-sm font-semibold text-slate-200">Create New Feature Flag</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newFlagName}
                    onChange={(e) => setNewFlagName(e.target.value)}
                    placeholder="Flag Display Name"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    value={newFlagKey}
                    onChange={(e) => setNewFlagKey(e.target.value)}
                    placeholder="flag_key (e.g. enable_v2_grid)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">Rollout %: {newFlagRollout}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={newFlagRollout}
                    onChange={(e) => setNewFlagRollout(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <button
                    onClick={handleCreateFlag}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Save Flag
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {flags.map((flag) => (
                  <div key={flag.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{flag.name}</div>
                        <div className="text-xs text-purple-400 font-mono mt-0.5">{flag.key}</div>
                      </div>
                      <button
                        onClick={() => handleToggleFlag(flag.id, flag.enabled)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          flag.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {flag.enabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">Traffic Allocation:</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={flag.percentageRollout}
                        onChange={(e) => handleUpdateRollout(flag.id, Number(e.target.value))}
                        className="flex-1 accent-purple-500"
                      />
                      <span className="font-mono text-purple-300 font-bold w-12 text-right">{flag.percentageRollout}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPERIMENTS TAB */}
          {activeTab === 'experiments' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {experiments.map((exp) => (
                  <div key={exp.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{exp.name}</div>
                        <div className="text-xs text-purple-400 font-mono mt-0.5">{exp.key} | Metric: {exp.primaryMetric}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase">
                        {exp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {exp.variants.map((v) => (
                        <div key={v.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-200">{v.name}</span>
                            <div className="text-slate-400 text-[11px] font-mono mt-0.5">key: {v.key}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                            {v.weight}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
