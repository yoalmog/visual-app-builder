'use client';

import React, { useState, useEffect } from 'react';
import { usePlatformStore } from '../../../builder/state/platform-store';
import {
  defaultSSOProvider,
  defaultSCIMProvider,
  defaultOrganizationPolicyEngine,
  defaultSessionManager,
  defaultKeyManagementProvider,
  defaultComplianceManager,
} from '../../../builder/platform/enterprise/IdentityAndSecurity';
import {
  SSOConfiguration,
  SCIMUserRecord,
  OrganizationSecurityPolicy,
  UserSessionRecord,
  KMSKeyRecord,
  ComplianceControlRecord,
} from '../../../builder/schema/platform-v9';

export const EnterpriseSecurityModal: React.FC = () => {
  const { isEnterpriseSecurityOpen, setEnterpriseSecurityOpen } = usePlatformStore();
  const [activeTab, setActiveTab] = useState<'sso' | 'scim' | 'policies' | 'sessions' | 'network' | 'kms' | 'compliance'>('sso');

  const [ssoConfig, setSsoConfig] = useState<SSOConfiguration | null>(null);
  const [scimUsers, setScimUsers] = useState<SCIMUserRecord[]>([]);
  const [policy, setPolicy] = useState<OrganizationSecurityPolicy | null>(null);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [kmsKeys, setKmsKeys] = useState<KMSKeyRecord[]>([]);
  const [complianceControls, setComplianceControls] = useState<ComplianceControlRecord[]>([]);
  const [complianceScore, setComplianceScore] = useState<number>(0);
  const [newIpRange, setNewIpRange] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!isEnterpriseSecurityOpen) return;

    defaultSSOProvider.getConfig('org_default').then((cfg) => {
      setSsoConfig(
        cfg || {
          id: 'sso_org_default',
          organizationId: 'org_default',
          providerType: 'saml',
          issuer: 'https://sts.windows.net/azure-ad-tenant-id/',
          entryPointUrl: 'https://login.microsoftonline.com/tenant-id/saml2',
          domains: ['company.com', 'apexstudio.io'],
          enforceSSO: false,
          jitProvisioningEnabled: true,
          defaultRole: 'member',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    });

    defaultSCIMProvider.listUsers('org_default').then(setScimUsers);
    defaultOrganizationPolicyEngine.getPolicy('org_default').then(setPolicy);
    defaultSessionManager.listUserSessions('user_admin').then(setSessions);
    defaultKeyManagementProvider.listKeys('org_default').then((keys) => {
      if (keys.length === 0) {
        defaultKeyManagementProvider.createKey('org_default', 'Primary Storage Key').then((k) => setKmsKeys([k]));
      } else {
        setKmsKeys(keys);
      }
    });

    defaultComplianceManager.listControls().then(setComplianceControls);
    defaultComplianceManager.evaluateComplianceStatus().then((s) => setComplianceScore(s.scorePercentage));
  }, [isEnterpriseSecurityOpen]);

  if (!isEnterpriseSecurityOpen) return null;

  const handleSaveSso = async () => {
    if (!ssoConfig) return;
    await defaultSSOProvider.saveConfig(ssoConfig);
    setStatusMsg('SSO configuration updated successfully.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleTogglePolicy = async (field: keyof OrganizationSecurityPolicy, value: any) => {
    if (!policy) return;
    const updated = await defaultOrganizationPolicyEngine.updatePolicy('org_default', { [field]: value }, 'user_admin');
    setPolicy(updated);
  };

  const handleAddIpRange = async () => {
    if (!newIpRange.trim() || !policy) return;
    const updatedRanges = [...policy.allowedIpRanges, newIpRange.trim()];
    const updated = await defaultOrganizationPolicyEngine.updatePolicy('org_default', { allowedIpRanges: updatedRanges }, 'user_admin');
    setPolicy(updated);
    setNewIpRange('');
  };

  const handleRemoveIpRange = async (range: string) => {
    if (!policy) return;
    const updatedRanges = policy.allowedIpRanges.filter((r) => r !== range);
    const updated = await defaultOrganizationPolicyEngine.updatePolicy('org_default', { allowedIpRanges: updatedRanges }, 'user_admin');
    setPolicy(updated);
  };

  const handleRotateKey = async (keyId: string) => {
    await defaultKeyManagementProvider.rotateKey(keyId);
    const keys = await defaultKeyManagementProvider.listKeys('org_default');
    setKmsKeys(keys);
    setStatusMsg('KMS Key rotated to new cryptographic version.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleRevokeSession = async (sessionId: string) => {
    await defaultSessionManager.revokeSession(sessionId);
    setSessions(sessions.filter((s) => s.id !== sessionId));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enterprise Security & Identity Center"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Enterprise Security & Identity</h2>
              <p className="text-xs text-slate-400">SSO, SCIM, organization policies, network allowlists, KMS, and compliance</p>
            </div>
          </div>
          <button
            onClick={() => setEnterpriseSecurityOpen(false)}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 overflow-x-auto">
          {(['sso', 'scim', 'policies', 'sessions', 'network', 'kms', 'compliance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors uppercase text-xs tracking-wider whitespace-nowrap ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {statusMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              {statusMsg}
            </div>
          )}

          {/* SSO TAB */}
          {activeTab === 'sso' && ssoConfig && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="text-sm font-bold text-white">Enable Single Sign-On (SAML 2.0 / OIDC)</span>
                  <p className="text-xs text-slate-400 mt-0.5">Permit corporate login using external identity provider</p>
                </div>
                <input
                  type="checkbox"
                  checked={ssoConfig.enabled}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Provider Type</label>
                <select
                  value={ssoConfig.providerType}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, providerType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="saml">SAML 2.0 (Okta, Azure AD, PingIdentity)</option>
                  <option value="oidc">OpenID Connect (Google Workspace, Auth0)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">IdP Issuer URL / Entity ID</label>
                <input
                  type="text"
                  value={ssoConfig.issuer}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, issuer: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">SSO Entry Point URL</label>
                <input
                  type="text"
                  value={ssoConfig.entryPointUrl}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, entryPointUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="text-sm font-bold text-white">Enforce SSO For Domain Users</span>
                  <p className="text-xs text-slate-400 mt-0.5">Disables password login for users with registered corporate email domains</p>
                </div>
                <input
                  type="checkbox"
                  checked={ssoConfig.enforceSSO}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, enforceSSO: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleSaveSso}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Save SSO Configuration
              </button>
            </div>
          )}

          {/* POLICIES TAB */}
          {activeTab === 'policies' && policy && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="text-sm font-bold text-white">Require Multi-Factor Authentication (MFA)</span>
                  <p className="text-xs text-slate-400 mt-0.5">Enforces TOTP / FIDO2 security keys for all organization members</p>
                </div>
                <input
                  type="checkbox"
                  checked={policy.requireMFA}
                  onChange={(e) => handleTogglePolicy('requireMFA', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="text-sm font-bold text-white">Disable Password Login</span>
                  <p className="text-xs text-slate-400 mt-0.5">Mandates SSO or hardware keys; blocks standard password auth</p>
                </div>
                <input
                  type="checkbox"
                  checked={policy.disablePasswordLogin}
                  onChange={(e) => handleTogglePolicy('disablePasswordLogin', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="text-sm font-bold text-white">Restrict Custom Domain Configuration</span>
                  <p className="text-xs text-slate-400 mt-0.5">Restricts domain registration strictly to Owner and Admin roles</p>
                </div>
                <input
                  type="checkbox"
                  checked={policy.restrictCustomDomains}
                  onChange={(e) => handleTogglePolicy('restrictCustomDomains', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Max AI Monthly Budget (USD)</label>
                <input
                  type="number"
                  value={policy.maxAiBudgetPerMonth}
                  onChange={(e) => handleTogglePolicy('maxAiBudgetPerMonth', Number(e.target.value))}
                  className="w-48 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}

          {/* SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-200">Active User Sessions</h4>
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{sess.userAgent.slice(0, 40)}...</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">{sess.deviceType}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">IP: {sess.ipAddress} | Active: {new Date(sess.lastActiveAt).toLocaleTimeString()}</div>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="px-3 py-1.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NETWORK TAB */}
          {activeTab === 'network' && policy && (
            <div className="space-y-4 max-w-xl">
              <h4 className="text-sm font-semibold text-slate-200">Corporate IP Allowlist (CIDR Blocks)</h4>
              <p className="text-xs text-slate-400">Restricts platform access to designated office or VPN IP subnets.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIpRange}
                  onChange={(e) => setNewIpRange(e.target.value)}
                  placeholder="e.g. 192.168.1.0/24 or 10.0.0.0/16"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={handleAddIpRange}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  Add CIDR
                </button>
              </div>

              <div className="space-y-2 mt-4">
                {policy.allowedIpRanges.map((range) => (
                  <div key={range} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-bold">{range}</span>
                    <button
                      onClick={() => handleRemoveIpRange(range)}
                      className="text-rose-400 hover:text-rose-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {policy.allowedIpRanges.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No IP restrictions active. Accessible from all networks.</p>
                )}
              </div>
            </div>
          )}

          {/* KMS TAB */}
          {activeTab === 'kms' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-200">Key Management Service (KMS)</h4>
              <div className="space-y-3">
                {kmsKeys.map((key) => (
                  <div key={key.keyId} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white font-mono">{key.keyId}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{key.alias} | Algorithm: {key.algorithm}</div>
                      <div className="text-[11px] text-emerald-400 mt-1">Version: {key.version} | Status: {key.status.toUpperCase()}</div>
                    </div>
                    <button
                      onClick={() => handleRotateKey(key.keyId)}
                      className="px-3 py-1.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-semibold"
                    >
                      Rotate Key
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPLIANCE TAB */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Compliance Readiness Score</span>
                  <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{complianceScore}%</div>
                </div>
                <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  EVIDENCE PREPARED
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">Implemented Security Controls</h4>
              <div className="space-y-2">
                {complianceControls.map((ctrl) => (
                  <div key={ctrl.controlId} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white font-mono">{ctrl.controlId}: </span>
                      <span className="text-slate-200 font-medium">{ctrl.name}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">{ctrl.notes}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase text-[10px]">
                      {ctrl.status.replace('_', ' ')}
                    </span>
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
