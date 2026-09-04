'use client';

import React from 'react';
import { useBuilderStore, ViewportMode } from '@/builder/state/builder-store';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export const DeviceSelector: React.FC = () => {
  const viewport = useBuilderStore((s) => s.viewport);
  const setViewport = useBuilderStore((s) => s.setViewport);

  const devices: { mode: ViewportMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: 'desktop', label: 'Desktop (1440px)', icon: Monitor },
    { mode: 'tablet', label: 'Tablet (768px)', icon: Tablet },
    { mode: 'mobile', label: 'Mobile (390px)', icon: Smartphone },
  ];

  return (
    <div data-testid="viewport-selector" className="flex items-center bg-[#151822] p-0.5 rounded-lg border border-[#242B3D]">
      {devices.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          onClick={() => setViewport(mode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            viewport === mode
              ? 'bg-[#22293D] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="capitalize">{mode}</span>
        </button>
      ))}
    </div>
  );
};
