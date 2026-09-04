'use client';

import React from 'react';

interface DropIndicatorProps {
  isVisible: boolean;
  position?: 'inside' | 'top' | 'bottom';
}

export const DropIndicator: React.FC<DropIndicatorProps> = ({ isVisible, position = 'inside' }) => {
  if (!isVisible) return null;

  if (position === 'inside') {
    return (
      <div className="absolute inset-0 border-2 border-dashed border-indigo-400 bg-indigo-500/10 rounded-lg pointer-events-none z-30 flex items-center justify-center">
        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow tracking-wider uppercase">
          Drop Inside
        </span>
      </div>
    );
  }

  return (
    <div
      className={`absolute left-0 right-0 h-1 bg-indigo-500 rounded-full z-40 shadow-sm pointer-events-none ${
        position === 'top' ? '-top-1' : '-bottom-1'
      }`}
    />
  );
};
