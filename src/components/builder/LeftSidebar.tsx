'use client';

import React, { useState } from 'react';
import { InsertPanel } from './InsertPanel';
import { PagesPanel } from './PagesPanel';
import { AssetsPanel } from './AssetsPanel';
import { ComponentsLibraryPanel } from './ComponentsLibraryPanel';
import { TokensPanel } from './TokensPanel';
import { DataPanel } from './DataPanel';
import { VariablesPanel } from './VariablesPanel';
import { AuthPanel } from './AuthPanel';
import { EnvironmentPanel } from './EnvironmentPanel';
import { PublishPanel } from './PublishPanel';
import { WorkflowPanel } from './WorkflowPanel';
import { RolesPanel } from './RolesPanel';
import { TemplatesPanel } from './TemplatesPanel';
import { LocalizationPanel } from './LocalizationPanel';
import { AIBuilderPanel } from './AIBuilderPanel';
import {
  Sparkles,
  Plus,
  FileText,
  Image as ImageIcon,
  Component as ComponentIcon,
  Palette,
  Database,
  Braces,
  Shield,
  Layers,
  Send,
  GitFork,
  ShieldCheck,
  LayoutTemplate,
  Globe,
} from 'lucide-react';

export type LeftSidebarTab =
  | 'ai'
  | 'insert'
  | 'pages'
  | 'assets'
  | 'library'
  | 'tokens'
  | 'data'
  | 'variables'
  | 'auth'
  | 'environments'
  | 'publish'
  | 'workflows'
  | 'roles'
  | 'templates'
  | 'localization';


export const LeftSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LeftSidebarTab>('insert');

  return (
    <div className="flex h-full shrink-0 z-20">
      {/* Activity Strip */}
      <div className="w-11 bg-[#090B10] border-r border-[#1B1E2B] flex flex-col items-center py-3 gap-2 select-none">
        {/* Phase 7 AI Assistant Activity Tab */}
        <button
          data-testid="tab-ai"
          onClick={() => setActiveTab('ai')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'ai'
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-indigo-400 hover:text-indigo-200 hover:bg-[#141724]'
          }`}
          title="AI Application Builder & Agent"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-[#1B1E2B] my-0.5" />

        <button
          data-testid="tab-insert"
          onClick={() => setActiveTab('insert')}

          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'insert'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Components (Insert)"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-pages"
          onClick={() => setActiveTab('pages')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'pages'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Pages"
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-assets"
          onClick={() => setActiveTab('assets')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'assets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Assets"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-library"
          onClick={() => setActiveTab('library')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'library'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Reusable Components"
        >
          <ComponentIcon className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-tokens"
          onClick={() => setActiveTab('tokens')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'tokens'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Design Tokens (Design System)"
        >
          <Palette className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-data"
          onClick={() => setActiveTab('data')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'data'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Data Collections & APIs"
        >
          <Database className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-variables"
          onClick={() => setActiveTab('variables')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'variables'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Variables & Logic State"
        >
          <Braces className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-[#1B1E2B] my-1" />

        {/* Phase 5 Activity Tabs */}
        <button
          data-testid="tab-auth"
          onClick={() => setActiveTab('auth')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'auth'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Authentication & Permissions"
        >
          <Shield className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-environments"
          onClick={() => setActiveTab('environments')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'environments'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Environments & Variables"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-publish"
          onClick={() => setActiveTab('publish')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'publish'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Publish & Releases"
        >
          <Send className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-[#1B1E2B] my-1" />

        {/* Phase 6 Activity Tabs */}
        <button
          data-testid="tab-workflows"
          onClick={() => setActiveTab('workflows')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'workflows'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Workflows & Automation"
        >
          <GitFork className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-roles"
          onClick={() => setActiveTab('roles')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Roles & RBAC"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-templates"
          onClick={() => setActiveTab('templates')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Starter Templates"
        >
          <LayoutTemplate className="w-4 h-4" />
        </button>

        <button
          data-testid="tab-localization"
          onClick={() => setActiveTab('localization')}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'localization'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141724]'
          }`}
          title="Localization & i18n"
        >
          <Globe className="w-4 h-4" />
        </button>
      </div>

      {/* Active Panel View */}
      <div className="h-full">
        {activeTab === 'ai' && <AIBuilderPanel />}
        {activeTab === 'insert' && <InsertPanel />}

        {activeTab === 'pages' && <PagesPanel />}
        {activeTab === 'assets' && <AssetsPanel />}
        {activeTab === 'library' && <ComponentsLibraryPanel />}
        {activeTab === 'tokens' && <TokensPanel />}
        {activeTab === 'data' && <DataPanel />}
        {activeTab === 'variables' && <VariablesPanel />}
        {activeTab === 'auth' && <AuthPanel />}
        {activeTab === 'environments' && <EnvironmentPanel />}
        {activeTab === 'publish' && <PublishPanel />}
        {activeTab === 'workflows' && <WorkflowPanel />}
        {activeTab === 'roles' && <RolesPanel />}
        {activeTab === 'templates' && <TemplatesPanel />}
        {activeTab === 'localization' && <LocalizationPanel />}
      </div>
    </div>
  );
};
