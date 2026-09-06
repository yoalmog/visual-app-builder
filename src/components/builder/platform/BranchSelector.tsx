'use client';

import React, { useState } from 'react';
import { usePlatformStore } from '@/builder/state/platform-store';
import { GitBranch, Shield, Plus, Check } from 'lucide-react';

export const BranchSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const currentBranch = usePlatformStore((s) => s.currentBranch);
  const branches = usePlatformStore((s) => s.branches);
  const switchBranch = usePlatformStore((s) => s.switchBranch);

  const activeBranchObj = branches.find((b) => b.name === currentBranch);

  const handleSelectBranch = (name: string) => {
    switchBranch(name);
    setIsOpen(false);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const cleanName = newBranchName.trim().toLowerCase().replace(/[^a-z0-9_\-\/]/g, '-');
    switchBranch(cleanName);
    setNewBranchName('');
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left select-none">
      <button
        data-testid="branch-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#141724] hover:bg-[#1E2335] text-slate-200 border border-[#23293D] transition-colors"
        title="Active Git Branch"
      >
        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
        <span className="max-w-[100px] truncate">{currentBranch}</span>
        {activeBranchObj?.protected && (
          <span title="Protected Branch">
            <Shield className="w-2.5 h-2.5 text-amber-400" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="branch-dropdown-menu"
          className="absolute left-0 mt-1.5 w-56 rounded-xl bg-[#0E111A] border border-[#21273B] shadow-2xl z-50 overflow-hidden py-1"
        >
          <div className="px-3 py-1.5 border-b border-[#1A1F30] flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>SWITCH BRANCH</span>
            <button
              onClick={() => setIsCreating(true)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateBranch} className="p-2 border-b border-[#1A1F30]">
              <input
                type="text"
                autoFocus
                placeholder="branch-name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full text-xs px-2 py-1 rounded bg-[#161B28] border border-indigo-500 text-white outline-none"
              />
              <div className="flex justify-end gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          <div className="max-h-48 overflow-y-auto py-1">
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => handleSelectBranch(b.name)}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-[#181D2C] ${
                  b.name === currentBranch ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <GitBranch className="w-3 h-3 opacity-60" />
                  <span className="truncate">{b.name}</span>
                  {b.protected && <Shield className="w-2.5 h-2.5 text-amber-400" />}
                </div>
                {b.name === currentBranch && <Check className="w-3 h-3 text-indigo-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
