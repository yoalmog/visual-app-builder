'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { createDataProvider } from '@/builder/providers/data-provider';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, Radio } from 'lucide-react';

export const CloudStatusIndicator: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const updateCloudConfig = useBuilderStore((s) => s.updateCloudConfig);

  const [isChecking, setIsChecking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const cloudConfig = project.cloudConfig || {
    provider: 'mock',
    projectUrl: '',
    anonKey: '',
    status: 'disconnected',
  };

  const status = cloudConfig.status || 'disconnected';

  const handleTestConnection = async () => {
    setIsChecking(true);
    updateCloudConfig({ status: 'connecting' });
    try {
      const provider = createDataProvider(project);
      const isHealthy = provider.healthCheck ? await provider.healthCheck() : true;
      updateCloudConfig({
        status: isHealthy ? 'connected' : 'error',
        lastError: isHealthy ? undefined : 'Connection check failed',
      });
    } catch (err: any) {
      updateCloudConfig({
        status: 'error',
        lastError: err.message || 'Unknown network error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-400';
      case 'connecting':
        return 'bg-amber-400 animate-pulse';
      case 'error':
        return 'bg-red-400';
      case 'disconnected':
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="relative">
      <button
        data-testid="cloud-status-indicator"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#141724] hover:bg-[#1A1F2E] border border-[#222738] text-xs text-slate-300 transition-colors"
        title="Cloud Backend Status"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <Cloud className="w-3.5 h-3.5 text-slate-400" />
        <span className="capitalize text-[11px] font-medium hidden sm:inline">{status}</span>
      </button>

      {isOpen && (
        <div
          data-testid="cloud-status-popover"
          className="absolute top-full right-0 mt-2 w-72 bg-[#0E1018] border border-[#222738] rounded-xl shadow-2xl p-3.5 z-50 text-slate-200 text-xs space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#1A1F2E] pb-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span>Cloud Status</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                status === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : status === 'error'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {status}
            </span>
          </div>

          <div className="space-y-1 text-slate-400 text-[11px]">
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className="text-white font-medium capitalize">{cloudConfig.provider}</span>
            </div>
            <div className="flex justify-between">
              <span>Target:</span>
              <span className="text-slate-300 font-mono truncate max-w-[140px]">
                {cloudConfig.projectUrl || 'In-Memory (Mock)'}
              </span>
            </div>
            {cloudConfig.lastError && (
              <div className="text-red-400 text-[10px] pt-1">
                {cloudConfig.lastError}
              </div>
            )}
          </div>

          <button
            data-testid="btn-test-cloud-connection"
            onClick={handleTestConnection}
            disabled={isChecking}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
