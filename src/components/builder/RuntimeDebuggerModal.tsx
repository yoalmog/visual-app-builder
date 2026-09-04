'use client';

import React, { useState } from 'react';
import { useRuntimeStore } from '@/builder/runtime/runtime-store';
import {
  Bug,
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  Braces,
  FileSpreadsheet,
  Layers,
  Terminal,
  AlertCircle,
  Activity,
  Shield,
  Globe,
  Database,
} from 'lucide-react';

interface RuntimeDebuggerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DebuggerTab =
  | 'trace'
  | 'network'
  | 'auth'
  | 'cloudDb'
  | 'api'
  | 'variables'
  | 'forms'
  | 'collections'
  | 'navigation';

export const RuntimeDebuggerModal: React.FC<RuntimeDebuggerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<DebuggerTab>('trace');

  const variables = useRuntimeStore((s) => s.variables);
  const collections = useRuntimeStore((s) => s.collections);
  const forms = useRuntimeStore((s) => s.forms);
  const navigation = useRuntimeStore((s) => s.navigation);
  const errors = useRuntimeStore((s) => s.errors);
  const actionTrace = useRuntimeStore((s) => s.actionTrace);
  const clearTrace = useRuntimeStore((s) => s.clearTrace);
  const resetRuntime = useRuntimeStore((s) => s.resetRuntime);

  // Phase 5 Runtime Store State
  const currentUser = useRuntimeStore((s) => s.currentUser);
  const session = useRuntimeStore((s) => s.session);
  const cloudData = useRuntimeStore((s) => s.cloudData);
  const apiResponses = useRuntimeStore((s) => s.apiResponses);
  const networkTrace = useRuntimeStore((s) => s.networkTrace);
  const clearNetworkTrace = useRuntimeStore((s) => s.clearNetworkTrace);

  if (!isOpen) return null;

  const errorKeys = Object.keys(errors);

  return (
    <div
      data-testid="runtime-debugger"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="w-full max-w-4xl bg-[#0D0F17] border border-[#262B3D] rounded-xl shadow-2xl flex flex-col h-[650px] overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 bg-[#12141F] border-b border-[#262B3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Runtime Debugger & Trace</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Development environment runtime inspector
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="btn-reset-runtime"
              onClick={() => resetRuntime()}
              className="px-2.5 py-1 bg-[#1A1D2D] hover:bg-[#23273D] text-slate-300 hover:text-white rounded text-xs flex items-center gap-1.5 transition-colors border border-[#262B3D]"
              title="Reset Runtime State"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reset Runtime</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1A1D2D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Errors Alert if any */}
        {errorKeys.length > 0 && (
          <div
            data-testid="runtime-error"
            className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 text-red-400 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="truncate">
              {errorKeys.map((k) => `${k}: ${errors[k]}`).join(' | ')}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1E2330] bg-[#0A0C13] px-3 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('trace')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'trace'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Actions ({actionTrace.length})</span>
          </button>
          <button
            data-testid="debugger-tab-network"
            onClick={() => setActiveTab('network')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'network'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Network ({networkTrace.length})</span>
          </button>
          <button
            data-testid="debugger-tab-auth"
            onClick={() => setActiveTab('auth')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'auth'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Auth ({currentUser ? 'Active' : 'None'})</span>
          </button>
          <button
            data-testid="debugger-tab-clouddb"
            onClick={() => setActiveTab('cloudDb')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cloudDb'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud DB</span>
          </button>
          <button
            data-testid="debugger-tab-api"
            onClick={() => setActiveTab('api')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>API Responses ({Object.keys(apiResponses).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'variables'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Braces className="w-3.5 h-3.5" />
            <span>Variables ({Object.keys(variables).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'forms'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Forms ({Object.keys(forms).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'collections'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Local DB ({Object.keys(collections).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('navigation')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'navigation'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Navigation</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
          {/* ACTION TRACE */}
          {activeTab === 'trace' && (
            <div data-testid="runtime-console" className="flex flex-col gap-2 h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2330]">
                <span className="text-slate-400">Execution History (latest first)</span>
                <button
                  onClick={clearTrace}
                  disabled={actionTrace.length === 0}
                  className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              {actionTrace.length === 0 ? (
                <div className="text-center py-16 text-slate-600 font-sans">
                  No actions executed yet. Trigger component events in preview to see execution trace.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {actionTrace.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border flex items-start justify-between gap-2 ${
                        entry.status === 'PASS'
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/5 border-red-500/20 text-red-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {entry.status === 'PASS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-white">
                            [{entry.event}] {entry.actionType}
                            {entry.target ? ` -> ${entry.target}` : ''}
                          </div>
                          {entry.message && (
                            <div className="text-[11px] text-slate-400">{entry.message}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NETWORK & API TRACE */}
          {activeTab === 'network' && (
            <div data-testid="network-trace-list" className="flex flex-col gap-2 h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2330]">
                <span className="text-slate-400">Network & External Requests (Redacted)</span>
                <button
                  onClick={clearNetworkTrace}
                  disabled={networkTrace.length === 0}
                  className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              {networkTrace.length === 0 ? (
                <div className="text-center py-16 text-slate-600 font-sans">
                  No network requests made yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {networkTrace.map((net, idx) => {
                    const status = net.status ?? (net.success ? 200 : 500);
                    const isOk = status >= 200 && status < 400;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border flex flex-col gap-1.5 ${
                          isOk
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isOk ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                              }`}
                            >
                              {status}
                            </span>
                            <span className="font-semibold text-white">{net.method || net.type}</span>
                            <span className="text-slate-300 font-mono truncate max-w-md">
                              {net.url || net.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {net.durationMs !== undefined && <span>{net.durationMs}ms</span>}
                            <span>{new Date(net.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {net.error && (
                          <div className="text-red-400 text-[11px]">Error: {net.error}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* AUTH STATE */}
          {activeTab === 'auth' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#141724]/40 border border-[#1E2330] rounded p-3 space-y-2">
                <span className="font-semibold text-white block">Current App User</span>
                {currentUser ? (
                  <div className="space-y-1 text-slate-300">
                    <div>
                      ID: <span className="text-white font-bold">{currentUser.id}</span>
                    </div>
                    <div>
                      Email: <span className="text-indigo-400 font-bold">{currentUser.email}</span>
                    </div>
                    <div>
                      Role: <span className="text-emerald-400 capitalize">{currentUser.role}</span>
                    </div>
                    <div>
                      Metadata:{' '}
                      <span className="text-slate-400">
                        {JSON.stringify(currentUser.metadata || {})}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No authenticated user session.</span>
                )}
              </div>

              {session && (
                <div className="bg-[#141724]/40 border border-[#1E2330] rounded p-3 space-y-2">
                  <span className="font-semibold text-white block">Active Session Token</span>
                  <div className="space-y-1 text-slate-300">
                    <div>
                      Token: <span className="text-slate-400 truncate max-w-sm block">{session.token}</span>
                    </div>
                    <div>
                      Expires At:{' '}
                      <span className="text-amber-400">
                        {session.expiresAt
                          ? new Date(session.expiresAt).toLocaleString()
                          : 'No Expiry'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CLOUD DB STATE */}
          {activeTab === 'cloudDb' && (
            <div className="flex flex-col gap-3">
              {Object.keys(cloudData).length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-sans">
                  No cloud collections loaded in runtime state.
                </div>
              ) : (
                Object.entries(cloudData).map(([tbl, recs]) => (
                  <div key={tbl} className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded">
                    <div className="font-semibold text-indigo-400 mb-1.5">
                      Cloud Table: {tbl} ({recs.records?.length || 0} records)
                    </div>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                      {(recs.records || []).map((r) => (
                        <div
                          key={r.id}
                          className="p-1.5 bg-[#090B10] rounded text-[11px] text-slate-300 flex items-center justify-between"
                        >
                          <span className="font-mono text-slate-500">{r.id}</span>
                          <span className="truncate ml-2">{JSON.stringify(r.values)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* API RESPONSES */}
          {activeTab === 'api' && (
            <div className="flex flex-col gap-3">
              {Object.keys(apiResponses).length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-sans">
                  No API responses cached in runtime.
                </div>
              ) : (
                Object.entries(apiResponses).map(([connId, resp]) => (
                  <div key={connId} className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>Connector: {connId}</span>
                      <span className={(resp.status ?? 200) < 400 ? 'text-emerald-400' : 'text-red-400'}>
                        HTTP {resp.status ?? 200}
                      </span>
                    </div>
                    <pre className="text-[10px] bg-[#090B10] p-2 rounded text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(resp.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VARIABLES */}
          {activeTab === 'variables' && (
            <div className="flex flex-col gap-2">
              {Object.keys(variables).length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-sans">
                  No runtime variables active
                </div>
              ) : (
                Object.entries(variables).map(([name, val]) => (
                  <div
                    key={name}
                    className="p-2.5 bg-[#141724]/40 border border-[#1E2330] rounded flex items-center justify-between"
                  >
                    <span className="font-semibold text-violet-400">{name}</span>
                    <span className="text-white bg-[#090B10] px-2 py-0.5 rounded border border-[#262B3D]">
                      {JSON.stringify(val)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* FORMS */}
          {activeTab === 'forms' && (
            <div className="flex flex-col gap-2">
              {Object.keys(forms).length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-sans">
                  No form elements registered in runtime yet
                </div>
              ) : (
                Object.entries(forms).map(([nodeId, state]) => (
                  <div
                    key={nodeId}
                    className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{nodeId}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            state.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {state.valid ? 'VALID' : 'INVALID'}
                        </span>
                        {state.dirty && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            DIRTY
                          </span>
                        )}
                        {state.touched && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                            TOUCHED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-300">
                      Value: <span className="text-emerald-400">{JSON.stringify(state.value)}</span>
                    </div>
                    {state.error && (
                      <div className="text-red-400 text-[11px]">Error: {state.error}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* LOCAL COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="flex flex-col gap-3">
              {Object.entries(collections).map(([colId, records]) => (
                <div key={colId} className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded">
                  <div className="font-semibold text-indigo-400 mb-1.5">
                    {colId} ({records.length} records)
                  </div>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                    {records.map((r) => (
                      <div
                        key={r.id}
                        className="p-1.5 bg-[#090B10] rounded text-[11px] text-slate-300 flex items-center justify-between"
                      >
                        <span className="font-mono text-slate-500">{r.id}</span>
                        <span className="truncate ml-2">{JSON.stringify(r.values)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NAVIGATION */}
          {activeTab === 'navigation' && (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded flex flex-col gap-1.5">
                <span className="text-slate-400">Active Page ID</span>
                <span className="text-white font-semibold">{navigation.activePageId || 'None'}</span>
              </div>
              <div className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded flex flex-col gap-1.5">
                <span className="text-slate-400">Navigation History</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {navigation.history.map((p, idx) => (
                    <span key={idx} className="bg-[#090B10] px-2 py-0.5 rounded border border-[#262B3D] text-slate-200">
                      {idx > 0 && '→ '}
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded flex flex-col gap-1.5">
                <span className="text-slate-400">Query Parameters</span>
                <span className="text-slate-200">{JSON.stringify(navigation.queryParams)}</span>
              </div>
              <div className="p-3 bg-[#141724]/40 border border-[#1E2330] rounded flex flex-col gap-1.5">
                <span className="text-slate-400">Route Parameters</span>
                <span className="text-slate-200">{JSON.stringify(navigation.routeParams)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
