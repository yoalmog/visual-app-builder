'use client';

import React, { useState, useEffect } from 'react';
import { usePlatformStore } from '@/builder/state/platform-store';
import { defaultOrganizationProvider } from '@/builder/platform/organization/OrganizationProvider';
import { defaultApiKeyManager, defaultServiceAccountManager, defaultAuditLogger } from '@/builder/platform/security/EnterpriseSecurity';
import { defaultUsageProvider, defaultEntitlementProvider, defaultBillingProvider } from '@/builder/platform/usage/UsageAndBilling';
import { Membership, Invitation, Team, ApiKey, ServiceAccount, ImmutableAuditLogEntry, Subscription } from '@/builder/schema/platform';
import {
  X,
  Users,
  Key,
  Shield,
  CreditCard,
  Activity,
  FileText,
  UserPlus,
  Trash2,
  CheckCircle,
} from 'lucide-react';

export const OrganizationSettingsModal: React.FC = () => {
  const isOrgSettingsOpen = usePlatformStore((s) => s.isOrgSettingsOpen);
  const setOrgSettingsOpen = usePlatformStore((s) => s.setOrgSettingsOpen);
  const currentOrg = usePlatformStore((s) => s.currentOrg);

  const [activeTab, setActiveTab] = useState<'members' | 'teams' | 'keys' | 'service_accounts' | 'usage' | 'billing' | 'audit'>('members');

  // State
  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [rawSecretShown, setRawSecretShown] = useState<string | null>(null);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [newSaName, setNewSaName] = useState('');
  const [usageData, setUsageData] = useState<Record<string, number>>({});
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [auditLogs, setAuditLogs] = useState<ImmutableAuditLogEntry[]>([]);

  const orgId = currentOrg?.id || 'org_default';

  const loadData = async () => {
    try {
      const mems = await defaultOrganizationProvider.listMembers(orgId);
      setMembers(mems);
      const invs = await defaultOrganizationProvider.listInvitations(orgId);
      setInvitations(invs);
      const tms = await defaultOrganizationProvider.listTeams(orgId);
      setTeams(tms);
      const keys = await defaultApiKeyManager.listApiKeys(orgId);
      setApiKeys(keys);
      const sas = await defaultServiceAccountManager.listServiceAccounts(orgId);
      setServiceAccounts(sas);
      const usage = await defaultUsageProvider.getAllUsage(orgId);
      setUsageData(usage);
      const sub = await defaultBillingProvider.getSubscription(orgId);
      setSubscription(sub);
      const logs = await defaultAuditLogger.query({ organizationId: orgId });
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOrgSettingsOpen) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgSettingsOpen, orgId]);

  if (!isOrgSettingsOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await defaultOrganizationProvider.inviteMember(orgId, inviteEmail.trim(), 'member', 'user_admin');
      setInviteEmail('');
      await loadData();
    } catch (err: any) {
      alert(`Invite failed: ${err.message}`);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await defaultOrganizationProvider.createTeam(orgId, newTeamName.trim(), 'Engineering Team', 'user_admin');
      setNewTeamName('');
      await loadData();
    } catch (err: any) {
      alert(`Create team failed: ${err.message}`);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await defaultApiKeyManager.createApiKey({
        organizationId: orgId,
        name: newKeyName.trim(),
        scopes: ['projects:read', 'deployments:write'],
      });
      setNewKeyName('');
      setRawSecretShown(res.rawSecret);
      await loadData();
    } catch (err: any) {
      alert(`API Key generation failed: ${err.message}`);
    }
  };

  const handleCreateServiceAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaName.trim()) return;
    try {
      await defaultServiceAccountManager.createServiceAccount({
        organizationId: orgId,
        name: newSaName.trim(),
        description: 'Automated CI/CD account',
        scopes: ['build:trigger', 'deployments:write'],
      });
      setNewSaName('');
      await loadData();
    } catch (err: any) {
      alert(`Service Account creation failed: ${err.message}`);
    }
  };

  return (
    <div
      data-testid="org-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none"
    >
      <div className="w-[850px] h-[580px] bg-[#0E111A] border border-[#23293D] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#1E2436] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Organization Settings: {currentOrg?.name || 'Default Organization'}</span>
          </div>
          <button
            onClick={() => setOrgSettingsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2033]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Sidebar Tabs */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 bg-[#0A0D14] border-r border-[#1B2030] p-2 space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'members' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Members
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'teams' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Teams
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'keys' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <Key className="w-3.5 h-3.5" /> API Keys
            </button>
            <button
              onClick={() => setActiveTab('service_accounts')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'service_accounts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Service Accounts
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'usage' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Usage & Limits
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Billing
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left ${
                activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#141926]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Audit Log
            </button>
          </div>

          {/* Content Pane */}
          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {activeTab === 'members' && (
              <div className="space-y-4">
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 bg-[#141826] border border-[#242C42] rounded-lg px-3 py-2 text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite
                  </button>
                </form>

                <div className="space-y-2">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Active Members</div>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-[#131726] border border-[#22293E] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{m.userEmail}</div>
                        <div className="text-[10px] text-slate-400">Status: {m.status}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold uppercase text-[10px] rounded">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="space-y-4">
                <form onSubmit={handleCreateTeam} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Team Name (e.g. Design, Frontend)"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="flex-1 bg-[#141826] border border-[#242C42] rounded-lg px-3 py-2 text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newTeamName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                  >
                    Create Team
                  </button>
                </form>

                <div className="space-y-2">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-[#131726] border border-[#22293E] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.description || 'No description'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="space-y-4">
                <form onSubmit={handleCreateApiKey} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key Identifier (e.g. CI Production Pipeline)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 bg-[#141826] border border-[#242C42] rounded-lg px-3 py-2 text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newKeyName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                  >
                    Generate API Key
                  </button>
                </form>

                {rawSecretShown && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200">
                    <div className="font-bold text-xs mb-1">Make sure to copy your API key now:</div>
                    <code className="block bg-[#0A0D14] p-2 rounded text-[11px] font-mono select-all text-amber-300">
                      {rawSecretShown}
                    </code>
                    <div className="text-[10px] mt-1 text-slate-400">
                      You will not be able to see this key again!
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="p-3 bg-[#131726] border border-[#22293E] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{k.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{k.prefix}...</div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'service_accounts' && (
              <div className="space-y-4">
                <form onSubmit={handleCreateServiceAccount} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Service Account Name"
                    value={newSaName}
                    onChange={(e) => setNewSaName(e.target.value)}
                    className="flex-1 bg-[#141826] border border-[#242C42] rounded-lg px-3 py-2 text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newSaName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                  >
                    Create Service Account
                  </button>
                </form>

                <div className="space-y-2">
                  {serviceAccounts.map((sa) => (
                    <div
                      key={sa.id}
                      className="p-3 bg-[#131726] border border-[#22293E] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{sa.name}</div>
                        <div className="text-[10px] text-slate-400">{sa.scopes.join(', ')}</div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">{sa.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-3">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Monthly Consumption</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#131726] border border-[#22293E] rounded-xl">
                    <div className="text-slate-400">AI Tokens Consumed</div>
                    <div className="text-lg font-bold text-white">{usageData.ai_tokens || 0} / 500,000</div>
                  </div>
                  <div className="p-3 bg-[#131726] border border-[#22293E] rounded-xl">
                    <div className="text-slate-400">Build Minutes</div>
                    <div className="text-lg font-bold text-white">{usageData.build_minutes || 0} / 300 min</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-tr from-indigo-950/40 to-[#141826] border border-indigo-500/30 rounded-2xl">
                  <div className="text-indigo-400 font-bold uppercase text-[10px]">Current Subscription</div>
                  <div className="text-xl font-bold text-white capitalize">{subscription?.planTier || 'Pro'} Plan</div>
                  <div className="text-slate-400 mt-1">Status: {subscription?.status || 'Active'}</div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-2">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Immutable Audit Trail</div>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-[#121622] border border-[#1E2536] rounded-xl font-mono text-[10px]"
                  >
                    <div className="flex justify-between text-slate-300 font-semibold">
                      <span className="text-indigo-400">{log.action}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-400 mt-1">
                      Actor: {log.actorId} ({log.actorType}) • Target: {log.resourceType}:{log.resourceId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
