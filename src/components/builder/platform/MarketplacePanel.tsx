'use client';

import React, { useState, useEffect } from 'react';
import { defaultMarketplaceProvider } from '@/builder/platform/marketplace/MarketplaceAndPlugins';
import { MarketplaceResource } from '@/builder/schema/platform';
import { Store, Download, Star, ShieldCheck, Check } from 'lucide-react';

export const MarketplacePanel: React.FC = () => {
  const [resources, setResources] = useState<MarketplaceResource[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'template' | 'plugin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedMap, setInstalledMap] = useState<Record<string, boolean>>({});

  const loadResources = async () => {
    try {
      const list = await defaultMarketplaceProvider.listResources({
        type: activeFilter === 'all' ? undefined : activeFilter,
        search: searchQuery || undefined,
      });
      setResources(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, searchQuery]);

  const handleInstall = async (resource: MarketplaceResource) => {
    if (resource.type === 'plugin' && resource.manifest) {
      try {
        await defaultMarketplaceProvider.installPlugin({
          organizationId: 'org_default',
          pluginResourceId: resource.id,
          grantedPermissions: resource.manifest.permissions,
          installedBy: 'user_admin',
        });
        setInstalledMap((prev) => ({ ...prev, [resource.id]: true }));
      } catch (err: any) {
        alert(`Install failed: ${err.message}`);
      }
    } else {
      setInstalledMap((prev) => ({ ...prev, [resource.id]: true }));
    }
  };

  return (
    <div
      data-testid="marketplace-panel"
      className="w-80 h-full bg-[#0C0E15] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none text-xs"
    >
      {/* Header */}
      <div className="p-3 border-b border-[#1A1F2E] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <Store className="w-4 h-4 text-indigo-400" />
          <span>Marketplace</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b border-[#1A1F2E] bg-[#0E111B] space-y-2">
        <input
          type="text"
          placeholder="Search templates & plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#141724] border border-[#21273C] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
        />

        <div className="flex gap-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              activeFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 bg-[#141826]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('template')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              activeFilter === 'template' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 bg-[#141826]'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveFilter('plugin')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              activeFilter === 'plugin' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 bg-[#141826]'
            }`}
          >
            Plugins
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {resources.map((r) => (
          <div
            key={r.id}
            data-testid={`marketplace-resource-${r.id}`}
            className="p-3 rounded-xl bg-[#121622] border border-[#22283A] space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-white text-xs">{r.name}</div>
                <div className="text-[10px] text-slate-400">by {r.authorName} • v{r.version}</div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded uppercase font-semibold">
                {r.type}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">{r.description}</p>

            <div className="flex items-center justify-between pt-1 border-t border-[#1C2133]">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5 text-amber-400">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  {r.metadata.rating}
                </span>
                <span className="flex items-center gap-0.5">
                  <Download className="w-2.5 h-2.5" />
                  {r.metadata.downloads}
                </span>
              </div>

              <button
                onClick={() => handleInstall(r)}
                disabled={installedMap[r.id]}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-emerald-600/30 text-white font-semibold text-[10px] flex items-center gap-1"
              >
                {installedMap[r.id] ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Installed</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Install</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
