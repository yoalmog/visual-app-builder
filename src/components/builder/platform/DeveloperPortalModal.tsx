'use client';

import React, { useState, useEffect } from 'react';
import { usePlatformStore } from '../../../builder/state/platform-store';
import {
  defaultOAuthProvider,
  defaultApiGatewayProvider,
  defaultWebhookManager2,
  defaultOpenApiDocGenerator,
  defaultDeveloperCliHandler,
} from '../../../builder/platform/enterprise/DeveloperEcosystem';
import { DeveloperApp, APIProduct, WebhookEndpoint, WebhookDeliveryLog } from '../../../builder/schema/platform-v9';

export const DeveloperPortalModal: React.FC = () => {
  const { isDeveloperPortalOpen, setDeveloperPortalOpen } = usePlatformStore();
  const [activeTab, setActiveTab] = useState<'apps' | 'api' | 'webhooks' | 'docs' | 'cli'>('apps');

  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [products, setProducts] = useState<APIProduct[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>([]);
  const [openApiSpec, setOpenApiSpec] = useState<Record<string, any> | null>(null);

  // New App Form State
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppUris, setNewAppUris] = useState('https://myapp.com/oauth/callback');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // New Webhook Form State
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDesc, setNewWebhookDesc] = useState('');
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeveloperPortalOpen) return;

    defaultOAuthProvider.listApps('org_default').then(setApps);
    defaultApiGatewayProvider.listProducts('org_default').then(setProducts);
    defaultWebhookManager2.listEndpoints('org_default').then((eps) => {
      setWebhooks(eps);
      if (eps.length > 0) {
        defaultWebhookManager2.listDeliveryLogs(eps[0].id).then(setWebhookLogs);
      }
    });
    setOpenApiSpec(defaultOpenApiDocGenerator.generateSpec());
  }, [isDeveloperPortalOpen]);

  if (!isDeveloperPortalOpen) return null;

  const handleCreateApp = async () => {
    if (!newAppName.trim()) return;
    const uris = newAppUris.split(',').map((u) => u.trim());
    const res = await defaultOAuthProvider.createApp({
      organizationId: 'org_default',
      name: newAppName.trim(),
      description: newAppDesc.trim(),
      redirectUris: uris,
      scopes: ['projects:read', 'data:read'],
      createdBy: 'user_admin',
    });

    setApps([...apps, res.app]);
    setCreatedSecret(res.rawClientSecret);
    setNewAppName('');
    setNewAppDesc('');
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl.trim()) return;
    const res = await defaultWebhookManager2.registerEndpoint({
      organizationId: 'org_default',
      url: newWebhookUrl.trim(),
      description: newWebhookDesc.trim(),
      eventFilters: ['project.published', 'deployment.completed'],
    });

    setWebhooks([...webhooks, res.endpoint]);
    setCreatedWebhookSecret(res.rawSecret);
    setNewWebhookUrl('');
    setNewWebhookDesc('');
  };

  const handleReplayLog = async (logId: string) => {
    const replayed = await defaultWebhookManager2.replayDelivery(logId);
    setWebhookLogs([replayed, ...webhookLogs]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Developer Ecosystem & API Portal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Developer Portal & APIs</h2>
              <p className="text-xs text-slate-400">OAuth 2.0 applications, API Gateway products, Webhooks 2.0, OpenAPI specs, and CLI</p>
            </div>
          </div>
          <button
            onClick={() => setDeveloperPortalOpen(false)}
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
          {(['apps', 'api', 'webhooks', 'docs', 'cli'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors uppercase text-xs tracking-wider ${
                activeTab === tab
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'apps' ? 'OAuth Apps' : tab === 'api' ? 'API Gateway' : tab === 'webhooks' ? 'Webhooks 2.0' : tab === 'docs' ? 'OpenAPI 3.0' : 'Developer CLI'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* OAUTH APPS TAB */}
          {activeTab === 'apps' && (
            <div className="space-y-6">
              {createdSecret && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs space-y-2">
                  <div className="font-bold uppercase tracking-wide">Important: Client Secret Generated</div>
                  <p>Copy your Client Secret now. For security, it will not be displayed again:</p>
                  <div className="p-2 rounded bg-slate-950 font-mono text-white text-xs select-all">{createdSecret}</div>
                </div>
              )}

              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">Register New Developer Application</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">App Name</label>
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. My Integration Service"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Redirect URIs (comma-separated)</label>
                    <input
                      type="text"
                      value={newAppUris}
                      onChange={(e) => setNewAppUris(e.target.value)}
                      placeholder="https://app.com/callback"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateApp}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
                >
                  Create Application
                </button>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">Registered Developer Applications</h4>
              <div className="space-y-3">
                {apps.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{app.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">Client ID: {app.clientId}</div>
                      <div className="text-[11px] text-sky-400 mt-1">Scopes: {app.scopes.join(', ')}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API GATEWAY TAB */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h4 className="text-sm font-semibold text-slate-200">Active API Gateway Products</h4>
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">{p.name} ({p.version})</div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{p.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-300 pt-2 border-t border-slate-800">
                      <span>Rate Limit: <strong className="text-sky-400">{p.rateLimitPerMinute} req/min</strong></span>
                      <span>Monthly Quota: <strong className="text-emerald-400">{p.monthlyQuota.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WEBHOOKS 2.0 TAB */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              {createdWebhookSecret && (
                <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs space-y-2">
                  <div className="font-bold uppercase tracking-wide">Webhook HMAC Signing Secret</div>
                  <p>Use this secret to verify HMAC-SHA256 signatures in the X-Apex-Signature header:</p>
                  <div className="p-2 rounded bg-slate-950 font-mono text-white text-xs select-all">{createdWebhookSecret}</div>
                </div>
              )}

              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">Register Webhook Endpoint</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Payload URL</label>
                    <input
                      type="text"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://api.mycompany.com/webhooks"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={newWebhookDesc}
                      onChange={(e) => setNewWebhookDesc(e.target.value)}
                      placeholder="e.g. Sync deployments to Slack"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateWebhook}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
                >
                  Save Webhook Endpoint
                </button>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">Recent Webhook Deliveries & Replay</h4>
              <div className="space-y-2">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white font-mono">{log.eventType}</span>
                      <span className="ml-2 text-slate-400 font-mono">[{log.responseStatus || '200'}] {log.durationMs}ms</span>
                    </div>
                    <button
                      onClick={() => handleReplayLog(log.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold"
                    >
                      Replay
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPENAPI DOCS TAB */}
          {activeTab === 'docs' && openApiSpec && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-200">OpenAPI 3.0 Contract Specification</h4>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto max-h-96">
                {JSON.stringify(openApiSpec, null, 2)}
              </pre>
            </div>
          )}

          {/* CLI TAB */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-200">Developer CLI Reference</h4>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
                  $ npx apex login
                  <div className="text-slate-400 text-[11px] mt-1 font-sans">Authenticates developer CLI against the platform API.</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
                  $ npx apex deploy --env production
                  <div className="text-slate-400 text-[11px] mt-1 font-sans">Triggers the 7-stage automated deployment pipeline.</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
                  $ npx apex logs --follow
                  <div className="text-slate-400 text-[11px] mt-1 font-sans">Streams build and runtime health probe logs.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
