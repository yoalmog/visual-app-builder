'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { EnvironmentName } from '@/builder/schema/cloud';
import { Layers, AlertTriangle, CheckCircle, Plus, Trash2, ShieldAlert } from 'lucide-react';

export const EnvironmentPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const setActiveEnvironment = useBuilderStore((s) => s.setActiveEnvironment);
  const updateEnvironmentConfig = useBuilderStore((s) => s.updateEnvironmentConfig);

  const envConfig = project.environments || {
    activeEnvironment: 'development',
    environments: {
      development: { name: 'Development', isProduction: false, apiVariables: {}, features: {} },
      preview: { name: 'Preview', isProduction: false, apiVariables: {}, features: {} },
      production: { name: 'Production', isProduction: true, apiVariables: {}, features: {} },
    },
  };

  const activeEnv = envConfig.activeEnvironment;
  const currentEnvDetails = envConfig.environments[activeEnv] || {
    name: activeEnv,
    isProduction: activeEnv === 'production',
    apiVariables: {},
    features: {},
  };

  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const handleSwitch = (env: EnvironmentName) => {
    setActiveEnvironment(env);
  };

  const handleAddVar = () => {
    if (!newVarKey.trim()) return;
    const currentVars = { ...(currentEnvDetails.apiVariables || {}) };
    currentVars[newVarKey.trim()] = newVarValue;

    const updatedEnvs = {
      ...envConfig.environments,
      [activeEnv]: {
        ...currentEnvDetails,
        apiVariables: currentVars,
      },
    };
    updateEnvironmentConfig({ environments: updatedEnvs });
    setNewVarKey('');
    setNewVarValue('');
  };

  const handleDeleteVar = (key: string) => {
    const currentVars = { ...(currentEnvDetails.apiVariables || {}) };
    delete currentVars[key];

    const updatedEnvs = {
      ...envConfig.environments,
      [activeEnv]: {
        ...currentEnvDetails,
        apiVariables: currentVars,
      },
    };
    updateEnvironmentConfig({ environments: updatedEnvs });
  };

  return (
    <div
      data-testid="panel-environments"
      className="w-80 h-full bg-[#0D1017] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Environments</h2>
            <p className="text-[11px] text-slate-400">Manage targets & environment variables</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Environment Selector Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Active Target</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#121622] rounded-xl border border-[#222738]">
            {(['development', 'preview', 'production'] as EnvironmentName[]).map((env) => {
              const isActive = activeEnv === env;
              const isProd = env === 'production';
              return (
                <button
                  key={env}
                  data-testid={`env-btn-${env}`}
                  onClick={() => handleSwitch(env)}
                  className={`py-2 px-1.5 rounded-lg text-xs font-semibold capitalize transition-all text-center ${
                    isActive
                      ? isProd
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#1A1F2E]'
                  }`}
                >
                  {env === 'development' ? 'Dev' : env === 'preview' ? 'Preview' : 'Prod'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Warning if Production is active */}
        {currentEnvDetails.isProduction && (
          <div
            data-testid="prod-warning-banner"
            className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5 text-amber-300"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold block text-amber-200">Production Mode Active</span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Mutations target real cloud databases. Schema changes require published snapshots.
              </p>
            </div>
          </div>
        )}

        {/* Environment Details Card */}
        <div className="bg-[#121622] p-3.5 rounded-xl border border-[#222738] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Environment:</span>
            <span className="font-semibold text-white capitalize">{currentEnvDetails.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Data Source:</span>
            <span className="font-mono text-slate-300">
              {project.cloudConfig?.provider === 'supabase' ? 'Supabase Cloud' : 'Mock Provider'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">State:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle className="w-3 h-3" />
              Connected
            </span>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Environment Variables ({activeEnv})
            </label>
          </div>

          {/* Add variable row */}
          <div className="space-y-2 bg-[#121622] p-3 rounded-xl border border-[#222738]">
            <span className="text-[11px] text-slate-400 font-medium block">Add Variable</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="KEY (e.g. API_URL)"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value.toUpperCase())}
                className="bg-[#0A0D14] border border-[#1A1F2E] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Value"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                className="bg-[#0A0D14] border border-[#1A1F2E] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleAddVar}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Variable</span>
            </button>
          </div>

          {/* List existing vars */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {Object.entries(currentEnvDetails.apiVariables || {}).length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 text-center">No variables configured for {activeEnv}.</p>
            ) : (
              Object.entries(currentEnvDetails.apiVariables || {}).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-[#121622] p-2 rounded-lg border border-[#222738] flex items-center justify-between font-mono text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="text-indigo-400 font-semibold">{k}</span>
                    <span className="text-slate-400 block truncate text-[11px]">{v}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteVar(k)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete variable"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
