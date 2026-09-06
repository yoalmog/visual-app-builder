'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { usePlatformStore } from '@/builder/state/platform-store';
import { DeviceSelector } from './DeviceSelector';
import { ZoomControls } from './ZoomControls';
import { CloudStatusIndicator } from './CloudStatusIndicator';
import { BranchSelector } from './platform/BranchSelector';
import { CollabPresenceBar } from './platform/CollabPresenceBar';
import { EnvironmentName } from '@/builder/schema/cloud';
import {
  Undo2,
  Redo2,
  Play,
  Loader2,
  AlertCircle,
  Layers,
  UploadCloud,
  User,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  FolderPlus,
  Server,
  ShieldAlert,
  Code2,
  SlidersHorizontal,
  Rocket,
} from 'lucide-react';

const DistributeHorizontalIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="6" height="14" x="4" y="5" rx="1" />
    <rect width="6" height="10" x="14" y="7" rx="1" />
    <path d="M1 2v20M23 2v20" />
  </svg>
);

const DistributeVerticalIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="6" x="5" y="4" rx="1" />
    <rect width="10" height="6" x="7" y="14" rx="1" />
    <path d="M2 1h20M2 23h20" />
  </svg>
);

export const TopToolbar: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const history = useBuilderStore((s) => s.history);
  const togglePreview = useBuilderStore((s) => s.togglePreview);
  const saveStatus = useBuilderStore((s) => s.saveStatus);
  const save = useBuilderStore((s) => s.save);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const alignSelectedNodes = useBuilderStore((s) => s.alignSelectedNodes);
  const distributeSelectedNodes = useBuilderStore((s) => s.distributeSelectedNodes);
  const groupSelectedNodes = useBuilderStore((s) => s.groupSelectedNodes);
  const setActiveEnvironment = useBuilderStore((s) => s.setActiveEnvironment);
  const setOrgSettingsOpen = usePlatformStore((s) => s.setOrgSettingsOpen);
  const setScaleDashboardOpen = usePlatformStore((s) => s.setScaleDashboardOpen);
  const setEnterpriseSecurityOpen = usePlatformStore((s) => s.setEnterpriseSecurityOpen);
  const setDeveloperPortalOpen = usePlatformStore((s) => s.setDeveloperPortalOpen);
  const setExperimentationOpen = usePlatformStore((s) => s.setExperimentationOpen);
  const setAdvancedDeploymentsOpen = usePlatformStore((s) => s.setAdvancedDeploymentsOpen);

  const activeEnv = project.environments?.activeEnvironment || 'development';

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const canAlign = selectedNodeIds.length >= 2;
  const canDistribute = selectedNodeIds.length >= 3;

  return (
    <header
      data-testid="builder-toolbar"
      className="h-13 bg-[#0C0E14] border-b border-[#1E2330] flex items-center justify-between px-4 select-none z-30 shrink-0"
    >
      {/* Left: Project Branding & Name + History */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            APEX<span className="text-indigo-400">STUDIO</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 hover:text-white px-2 py-1 rounded bg-[#131620] border border-[#202534] max-w-[160px] truncate">
            {project.name}
          </span>
          <BranchSelector />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'hover:bg-[#1A1F2C] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'hover:bg-[#1A1F2C] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Device Viewport, Zoom, and Alignment Tools */}
      <div className="flex items-center gap-3">
        <DeviceSelector />
        <div className="h-4 w-px bg-slate-800 hidden md:block" />
        <div className="hidden md:block">
          <ZoomControls />
        </div>

        <div className="h-4 w-px bg-slate-800 hidden lg:block" />

        {/* Alignment & Distribution Controls */}
        <div className="hidden lg:flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#131620] border border-[#1E2332]">
          <button
            data-testid="align-left"
            disabled={!canAlign}
            onClick={() => alignSelectedNodes('left')}
            className={`p-1 rounded ${
              canAlign
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid="align-center"
            disabled={!canAlign}
            onClick={() => alignSelectedNodes('center')}
            className={`p-1 rounded ${
              canAlign
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Align Horizontal Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid="align-right"
            disabled={!canAlign}
            onClick={() => alignSelectedNodes('right')}
            className={`p-1 rounded ${
              canAlign
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-slate-800 mx-0.5" />

          <button
            data-testid="align-top"
            disabled={!canAlign}
            onClick={() => alignSelectedNodes('top')}
            className={`p-1 rounded ${
              canAlign
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Align Top"
          >
            <AlignStartVertical className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid="align-middle"
            disabled={!canAlign}
            onClick={() => alignSelectedNodes('middle')}
            className={`p-1 rounded ${
              canAlign
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Align Vertical Middle"
          >
            <AlignCenterVertical className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid="align-bottom"
            disabled={!canAlign}
            onClick={() => alignSelectedNodes('bottom')}
            className={`p-1 rounded ${
              canAlign
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Align Bottom"
          >
            <AlignEndVertical className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-slate-800 mx-0.5" />

          <button
            data-testid="distribute-horizontal"
            disabled={!canDistribute}
            onClick={() => distributeSelectedNodes('horizontal')}
            className={`p-1 rounded ${
              canDistribute
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Distribute Horizontally"
          >
            <DistributeHorizontalIcon className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid="distribute-vertical"
            disabled={!canDistribute}
            onClick={() => distributeSelectedNodes('vertical')}
            className={`p-1 rounded ${
              canDistribute
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Distribute Vertically"
          >
            <DistributeVerticalIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-slate-800 mx-0.5" />

          <button
            data-testid="group-selection"
            disabled={selectedNodeIds.length === 0}
            onClick={groupSelectedNodes}
            className={`p-1 rounded ${
              selectedNodeIds.length > 0
                ? 'hover:bg-[#1E2436] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Group Elements"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Environment, Cloud Status, Collab, Save Status, Preview, Publish, Avatar */}
      <div className="flex items-center gap-2.5 text-xs">
        {/* Real-time Collaboration Presence */}
        <CollabPresenceBar />

        {/* Environment Selector */}
        <div className="flex items-center bg-[#141724] border border-[#222738] rounded-lg px-2 py-0.5">
          <span className="text-[10px] text-slate-500 mr-1.5 uppercase font-bold">Env:</span>
          <select
            data-testid="topbar-env-selector"
            value={activeEnv}
            onChange={(e) => setActiveEnvironment(e.target.value as EnvironmentName)}
            className="bg-transparent text-slate-200 text-xs font-semibold capitalize outline-none cursor-pointer"
          >
            <option value="development" className="bg-[#121622] text-white">
              Dev
            </option>
            <option value="preview" className="bg-[#121622] text-white">
              Preview
            </option>
            <option value="production" className="bg-[#121622] text-amber-400">
              Prod
            </option>
          </select>
        </div>

        {/* Cloud Status Indicator */}
        <CloudStatusIndicator />

        <div className="h-4 w-px bg-slate-800" />

        {/* Phase 9 Platform Hub */}
        <div className="hidden xl:flex items-center gap-1 bg-[#121520] border border-[#1F2433] rounded-lg p-0.5">
          <button
            data-testid="topbar-scale-btn"
            onClick={() => setScaleDashboardOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#1B2030] transition-colors"
            title="Scale & Infrastructure Dashboard"
          >
            <Server className="w-3 h-3 text-cyan-400" />
            <span>Scale</span>
          </button>
          <button
            data-testid="topbar-enterprise-btn"
            onClick={() => setEnterpriseSecurityOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#1B2030] transition-colors"
            title="Enterprise Security Center"
          >
            <ShieldAlert className="w-3 h-3 text-emerald-400" />
            <span>Enterprise</span>
          </button>
          <button
            data-testid="topbar-devportal-btn"
            onClick={() => setDeveloperPortalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#1B2030] transition-colors"
            title="Developer Portal"
          >
            <Code2 className="w-3 h-3 text-indigo-400" />
            <span>Dev Portal</span>
          </button>
          <button
            data-testid="topbar-experiments-btn"
            onClick={() => setExperimentationOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#1B2030] transition-colors"
            title="Flags & Experiments"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            <span>Flags</span>
          </button>
          <button
            data-testid="topbar-rollouts-btn"
            onClick={() => setAdvancedDeploymentsOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#1B2030] transition-colors"
            title="Advanced Rollouts"
          >
            <Rocket className="w-3 h-3 text-purple-400" />
            <span>Rollouts</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Save Status Indicator */}
        <div
          onClick={save}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 cursor-pointer px-2 py-1 rounded hover:bg-[#151924] transition-colors"
          title="Click to force save"
        >
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span className="text-[11px]">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[11px] text-slate-300">Saved</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-amber-400">Unsaved changes</span>
            </>
          )}
        </div>

        {/* Live Preview Toggle Button */}
        <button
          onClick={() => togglePreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181B26] hover:bg-[#222736] text-slate-200 border border-[#272D3E] transition-colors shadow-sm"
          title="Live preview application"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
          <span>Preview</span>
        </button>

        {/* Publish Placeholder */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer opacity-90 hover:opacity-100"
          title="Publish app"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Publish</span>
        </button>

        {/* User / Organization Profile & Settings */}
        <button
          data-testid="org-settings-button"
          onClick={() => setOrgSettingsOpen(true)}
          className="w-7 h-7 rounded-full bg-[#1A1F2D] hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Organization & Team Settings"
        >
          <User className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
