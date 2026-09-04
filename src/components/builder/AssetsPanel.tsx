'use client';

import React, { useState, useRef } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Asset } from '@/builder/schema/project';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  X,
  Check,
  Plus,
} from 'lucide-react';

export const AssetsPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const addAsset = useBuilderStore((s) => s.addAsset);
  const removeAsset = useBuilderStore((s) => s.removeAsset);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const updateNodeProps = useBuilderStore((s) => s.updateNodeProps);

  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = project.assets || [];
  const filtered = assets.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const src = loadEvent.target?.result as string;
        const newAsset: Asset = {
          id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: 'image',
          src,
          url: src,
          alt: file.name.split('.')[0] || 'Image',
        };
        addAsset(newAsset);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectAssetForSelectedNode = (asset: Asset) => {
    if (selectedNodeId) {
      updateNodeProps(selectedNodeId, {
        src: asset.src || asset.url,
        assetId: asset.id,
        alt: asset.alt || asset.name,
      });
    }
  };

  return (
    <aside data-testid="assets-panel" className="w-64 bg-[#0D0F17] border-r border-[#1E2330] flex flex-col select-none shrink-0 z-20 h-full">
      {/* Header */}
      <div className="p-3 border-b border-[#1E2330] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Assets ({assets.length})
            </span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
            title="Upload Image"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#151824] border border-[#23293D] rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Asset Grid / List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs gap-2">
            <ImageIcon className="w-8 h-8 text-slate-600" />
            <span>No assets found. Upload images to build your asset library.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleSelectAssetForSelectedNode(asset)}
                className="group relative bg-[#131622] border border-[#1E2335] hover:border-indigo-500 rounded-lg overflow-hidden cursor-pointer transition-all flex flex-col"
                title={`${asset.name}\nClick to apply to selected component`}
              >
                <div className="w-full h-20 bg-slate-900 overflow-hidden relative flex items-center justify-center">
                  <img
                    src={asset.src || asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAsset(asset.id);
                    }}
                    className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-1.5 bg-[#12151F]">
                  <span className="text-[10px] text-slate-300 truncate block font-medium">
                    {asset.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
