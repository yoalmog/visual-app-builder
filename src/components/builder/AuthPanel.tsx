'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { useRuntimeStore } from '@/builder/runtime/runtime-store';
import { Shield, KeyRound, Lock, UserCheck, Users, ExternalLink, LogOut, CheckCircle2 } from 'lucide-react';

export const AuthPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const updateAuthConfig = useBuilderStore((s) => s.updateAuthConfig);
  const setPageAuthProtection = useBuilderStore((s) => s.setPageAuthProtection);

  const currentUser = useRuntimeStore((s) => s.currentUser);
  const clearAuth = useRuntimeStore((s) => s.clearAuth);

  const authConfig = project.authConfig || {
    provider: 'mock',
    enabled: false,
    allowUserRegistration: true,
    persistSession: true,
  };

  const handleToggleAuth = (enabled: boolean) => {
    updateAuthConfig({ enabled });
  };

  const handleProviderChange = (provider: 'mock' | 'supabase') => {
    updateAuthConfig({ provider });
  };

  const handlePageSelect = (
    field: 'loginPageId' | 'signupPageId' | 'defaultRedirectPageId',
    pageId: string
  ) => {
    updateAuthConfig({ [field]: pageId || undefined });
  };

  return (
    <div
      data-testid="panel-auth"
      className="w-80 h-full bg-[#0D1017] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Authentication</h2>
            <p className="text-[11px] text-slate-400">Manage user access & auth flows</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Enable / Disable Auth */}
        <div className="bg-[#121622] p-3.5 rounded-xl border border-[#222738] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">Authentication System</span>
            <span className="text-[11px] text-slate-400">
              {authConfig.enabled ? 'Active on protected pages' : 'Disabled across application'}
            </span>
          </div>
          <button
            data-testid="toggle-auth-enabled"
            onClick={() => handleToggleAuth(!authConfig.enabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              authConfig.enabled ? 'bg-indigo-600' : 'bg-[#222738]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                authConfig.enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Current Active Session Info (in runtime) */}
        <div className="bg-[#121622] p-3 rounded-xl border border-[#222738]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Session</span>
            </div>
            {currentUser && (
              <button
                onClick={() => clearAuth()}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors"
                title="Log out current preview session"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
          {currentUser ? (
            <div className="text-xs space-y-1 bg-[#0A0D14] p-2.5 rounded-lg border border-[#1A1F2E]">
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white font-mono">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="text-indigo-400 font-medium capitalize">{currentUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-medium">Authenticated</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No active session (Guest / Anonymous)</p>
          )}
        </div>

        {/* Provider Settings */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">Auth Provider</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleProviderChange('mock')}
              className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
                authConfig.provider === 'mock'
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                  : 'bg-[#121622] border-[#222738] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold mb-0.5">Mock (Dev)</div>
              <div className="text-[10px] text-slate-400">Fast deterministic testing</div>
            </button>

            <button
              onClick={() => handleProviderChange('supabase')}
              className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
                authConfig.provider === 'supabase'
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                  : 'bg-[#121622] border-[#222738] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold mb-0.5">Supabase Auth</div>
              <div className="text-[10px] text-slate-400">Production OAuth & JWT</div>
            </button>
          </div>
        </div>

        {/* Page Flow Routing */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">Auth Navigation Routes</label>

          <div className="space-y-2">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Login Page</span>
              <select
                value={authConfig.loginPageId || ''}
                onChange={(e) => handlePageSelect('loginPageId', e.target.value)}
                className="w-full bg-[#121622] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select login page...</option>
                {project.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Signup Page</span>
              <select
                value={authConfig.signupPageId || ''}
                onChange={(e) => handlePageSelect('signupPageId', e.target.value)}
                className="w-full bg-[#121622] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select signup page...</option>
                {project.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Redirect After Login</span>
              <select
                value={authConfig.defaultRedirectPageId || ''}
                onChange={(e) => handlePageSelect('defaultRedirectPageId', e.target.value)}
                className="w-full bg-[#121622] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Default (Home /)</option>
                {project.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Protection by Page */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">Page Access Protections</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {project.pages.map((page) => {
              const isProtected =
                typeof page.authProtection === 'string'
                  ? page.authProtection === 'authenticated'
                  : Boolean(page.authProtection?.requireAuth);
              return (
                <div
                  key={page.id}
                  className="bg-[#121622] p-2.5 rounded-lg border border-[#222738] flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <span className="text-xs text-white font-medium block truncate">{page.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate block">{page.slug}</span>
                  </div>
                  <button
                    onClick={() =>
                      setPageAuthProtection(page.id, {
                        requireAuth: !isProtected,
                        redirectTo: authConfig.loginPageId,
                      })
                    }
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                      isProtected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-[#1A1F2E] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{isProtected ? 'Protected' : 'Public'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Policies & Registration */}
        <div className="space-y-2 pt-2 border-t border-[#1B1E2B]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={authConfig.allowUserRegistration}
              onChange={(e) => updateAuthConfig({ allowUserRegistration: e.target.checked })}
              className="rounded bg-[#121622] border-[#222738] text-indigo-600 focus:ring-0"
            />
            <span className="text-xs text-slate-300">Allow new user registration</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={authConfig.persistSession}
              onChange={(e) => updateAuthConfig({ persistSession: e.target.checked })}
              className="rounded bg-[#121622] border-[#222738] text-indigo-600 focus:ring-0"
            />
            <span className="text-xs text-slate-300">Persist session in local storage</span>
          </label>
        </div>
      </div>
    </div>
  );
};
