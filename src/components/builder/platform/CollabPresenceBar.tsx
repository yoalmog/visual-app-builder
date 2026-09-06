'use client';

import React from 'react';
import { usePlatformStore } from '@/builder/state/platform-store';
import { Users, Wifi, AlertTriangle } from 'lucide-react';

export const CollabPresenceBar: React.FC = () => {
  const collabStatus = usePlatformStore((s) => s.collabStatus);
  const collaborators = usePlatformStore((s) => s.collaborators);

  const getStatusBadge = () => {
    switch (collabStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        );
      case 'syncing':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            <Wifi className="w-2.5 h-2.5 animate-spin" />
            Syncing
          </span>
        );
      case 'conflict':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-2.5 h-2.5" />
            Conflict
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800/40 border border-slate-700/40 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Offline
          </span>
        );
    }
  };

  return (
    <div
      data-testid="collab-presence-bar"
      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#11141E] border border-[#1F2433]"
    >
      {getStatusBadge()}

      {/* Avatar Stack */}
      <div className="flex items-center -space-x-1.5">
        {collaborators.slice(0, 4).map((c) => (
          <div
            key={c.userId}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-[#0D0F16]"
            style={{ backgroundColor: c.color }}
            title={`${c.userName} (${c.isOnline ? 'Online' : 'Away'})`}
          >
            {c.userName.charAt(0).toUpperCase()}
          </div>
        ))}
        {collaborators.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center ring-1 ring-[#0D0F16]">
            +{collaborators.length - 4}
          </div>
        )}
        {collaborators.length === 0 && (
          <div className="flex items-center text-slate-500 text-[11px] gap-1 px-1">
            <Users className="w-3 h-3" />
            <span>Solo</span>
          </div>
        )}
      </div>
    </div>
  );
};
