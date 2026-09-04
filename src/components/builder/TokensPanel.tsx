'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { DesignToken, DesignTokenCategory } from '@/builder/schema/project';
import { findTokenReferences } from '@/builder/tokens/tokens-manager';
import {
  Palette,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Layers,
  Type,
  Maximize2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

const CATEGORY_ICONS: Record<DesignTokenCategory, React.ComponentType<{ className?: string }>> = {
  color: Palette,
  spacing: Maximize2,
  typography: Type,
  radius: Layers,
  shadow: Sparkles,
};

export const TokensPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const addToken = useBuilderStore((s) => s.addToken);
  const updateToken = useBuilderStore((s) => s.updateToken);
  const deleteToken = useBuilderStore((s) => s.deleteToken);

  const [selectedCategory, setSelectedCategory] = useState<DesignTokenCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New token state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<DesignTokenCategory>('color');
  const [newValue, setNewValue] = useState('#6366F1');

  // Editing token state
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState<any>('');

  // Delete conflict state
  const [deleteConflict, setDeleteConflict] = useState<{
    token: DesignToken;
    referencesCount: number;
  } | null>(null);
  const [replacementTokenId, setReplacementTokenId] = useState<string>('');

  const tokens = project.tokens || [];

  // Filter tokens
  const filteredTokens = tokens.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof t.value === 'string' && t.value.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const token: DesignToken = {
      id: `token_${newCategory}_${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      value: newCategory === 'typography' && typeof newValue === 'string'
        ? { fontSize: newValue, fontFamily: 'Inter, sans-serif' }
        : newValue,
    };

    addToken(token);
    setNewName('');
    setIsCreating(false);
  };

  const handleStartEdit = (token: DesignToken) => {
    setEditingTokenId(token.id);
    setEditName(token.name);
    setEditValue(typeof token.value === 'object' ? JSON.stringify(token.value) : token.value);
  };

  const handleSaveEdit = (tokenId: string) => {
    let parsedValue = editValue;
    try {
      if (typeof editValue === 'string' && editValue.startsWith('{')) {
        parsedValue = JSON.parse(editValue);
      }
    } catch {
      // keep string
    }

    updateToken(tokenId, {
      name: editName.trim(),
      value: parsedValue,
    });
    setEditingTokenId(null);
  };

  const handleDeleteClick = (token: DesignToken) => {
    let refCount = 0;
    for (const p of project.pages) {
      refCount += findTokenReferences(p.root, token.id).length;
    }

    if (refCount > 0) {
      setDeleteConflict({ token, referencesCount: refCount });
      const others = tokens.filter((t) => t.id !== token.id && t.category === token.category);
      if (others.length > 0) {
        setReplacementTokenId(others[0].id);
      }
    } else {
      deleteToken(token.id);
    }
  };

  const handleConfirmConflict = (action: 'replace' | 'remove') => {
    if (!deleteConflict) return;
    deleteToken(
      deleteConflict.token.id,
      action,
      action === 'replace' ? replacementTokenId : undefined
    );
    setDeleteConflict(null);
  };

  return (
    <div
      data-testid="builder-design-system"
      className="w-72 bg-[#0C0E15] border-r border-[#1B1E2B] flex flex-col h-full select-none"
    >
      <div data-testid="token-editor" className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-[#1B1E2B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-xs text-white">Design Tokens</span>
            <span className="text-[10px] text-slate-500 font-mono">({tokens.length})</span>
          </div>

          <button
            data-testid="create-token-btn"
            onClick={() => setIsCreating(!isCreating)}
            className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1 shadow-sm transition-colors"
            title="Create New Token"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">New</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['all', 'color', 'spacing', 'typography', 'radius', 'shadow'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#141724] text-slate-400 hover:text-slate-200 hover:bg-[#1A1F30]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-3 pt-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              data-testid="token-search"
              type="text"
              placeholder="Search design tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131622] border border-[#202538] rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Create Token Modal / Inline Form */}
        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="m-3 p-3 bg-[#131622] border border-indigo-500/50 rounded-lg space-y-2.5 animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300">Add Token</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-medium text-slate-400 block mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="e.g. brand-primary"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#0A0C12] border border-[#22273A] rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as DesignTokenCategory;
                    setNewCategory(cat);
                    if (cat === 'color') setNewValue('#6366F1');
                    if (cat === 'spacing') setNewValue('16px');
                    if (cat === 'radius') setNewValue('8px');
                    if (cat === 'shadow') setNewValue('0 4px 6px -1px rgba(0,0,0,0.1)');
                    if (cat === 'typography') setNewValue('16px');
                  }}
                  className="w-full bg-[#0A0C12] border border-[#22273A] rounded px-2 py-1 text-xs text-white outline-none"
                >
                  <option value="color">Color</option>
                  <option value="spacing">Spacing</option>
                  <option value="typography">Typography</option>
                  <option value="radius">Radius</option>
                  <option value="shadow">Shadow</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">Value</label>
                <input
                  type="text"
                  required
                  placeholder="Value"
                  value={typeof newValue === 'object' ? JSON.stringify(newValue) : newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-[#0A0C12] border border-[#22273A] rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
            >
              Save Token
            </button>
          </form>
        )}

        {/* Token List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No design tokens found.
            </div>
          ) : (
            filteredTokens.map((token) => {
              const Icon = CATEGORY_ICONS[token.category] || Palette;
              const isEditing = editingTokenId === token.id;

              return (
                <div
                  key={token.id}
                  data-testid={`token-item-${token.id}`}
                  className="group bg-[#11141E] hover:bg-[#151926] border border-[#1E2334] rounded-lg p-2 transition-all flex flex-col gap-1.5"
                >
                  {isEditing ? (
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-[#090B10] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none flex-1"
                        />
                        <button
                          onClick={() => handleSaveEdit(token.id)}
                          className="p-1 text-green-400 hover:text-green-300"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTokenId(null)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full bg-[#090B10] border border-[#22273A] rounded px-1.5 py-0.5 text-[11px] text-slate-300 font-mono outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {token.category === 'color' && typeof token.value === 'string' ? (
                          <div
                            className="w-4 h-4 rounded border border-white/20 shrink-0 shadow-sm"
                            style={{ backgroundColor: token.value }}
                          />
                        ) : (
                          <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-200 block truncate">
                            {token.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">
                            {typeof token.value === 'object'
                              ? JSON.stringify(token.value)
                              : String(token.value)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(token)}
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title="Edit Token"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          data-testid={`delete-token-${token.id}`}
                          onClick={() => handleDeleteClick(token)}
                          className="p-1 text-slate-400 hover:text-red-400 rounded"
                          title="Delete Token"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Delete Token Conflict Modal (AT3-072) */}
        {deleteConflict && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-[#121520] border border-[#262D42] rounded-xl max-w-sm w-full p-4 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>Referenced Token Warning</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Token <strong className="text-white font-mono">{deleteConflict.token.name}</strong> is
                actively referenced by <strong className="text-amber-300">{deleteConflict.referencesCount}</strong> component(s).
              </p>

              <div className="space-y-2 pt-1">
                {tokens.filter((t) => t.id !== deleteConflict.token.id && t.category === deleteConflict.token.category).length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-medium">Replace with another token:</label>
                    <div className="flex gap-2">
                      <select
                        value={replacementTokenId}
                        onChange={(e) => setReplacementTokenId(e.target.value)}
                        className="flex-1 bg-[#0A0C12] border border-[#242B3E] rounded px-2 py-1 text-xs text-white outline-none"
                      >
                        {tokens
                          .filter((t) => t.id !== deleteConflict.token.id && t.category === deleteConflict.token.category)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({String(t.value)})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleConfirmConflict('replace')}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                      >
                        Replace & Delete
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1F2536]">
                  <button
                    onClick={() => setDeleteConflict(null)}
                    className="px-3 py-1 rounded bg-[#181C28] hover:bg-[#202636] text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmConflict('remove')}
                    className="px-3 py-1 rounded bg-red-600/80 hover:bg-red-600 text-xs text-white font-medium"
                  >
                    Remove References & Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
