'use client';

import React, { useState } from 'react';
import { Link2, Unlink } from 'lucide-react';

interface SpacingControlProps {
  label: string; // 'Padding' | 'Margin'
  propertyPrefix: 'padding' | 'margin';
  styles: Record<string, any>;
  onChange: (updates: Record<string, string>) => void;
  isOverridden?: boolean;
  onResetOverride?: () => void;
}

export const SpacingControl: React.FC<SpacingControlProps> = ({
  label,
  propertyPrefix,
  styles,
  onChange,
  isOverridden = false,
  onResetOverride,
}) => {
  const [isLinked, setIsLinked] = useState(true);

  const topKey = `${propertyPrefix}Top`;
  const rightKey = `${propertyPrefix}Right`;
  const bottomKey = `${propertyPrefix}Bottom`;
  const leftKey = `${propertyPrefix}Left`;

  const baseVal = styles[propertyPrefix] || '';
  const topVal = styles[topKey] || baseVal || '';
  const rightVal = styles[rightKey] || baseVal || '';
  const bottomVal = styles[bottomKey] || baseVal || '';
  const leftVal = styles[leftKey] || baseVal || '';

  const handleLinkedChange = (v: string) => {
    const clean = v.trim();
    const formatted = clean && !clean.endsWith('px') && !clean.endsWith('%') && !isNaN(Number(clean)) ? `${clean}px` : clean;
    onChange({
      [propertyPrefix]: formatted,
      [topKey]: formatted,
      [rightKey]: formatted,
      [bottomKey]: formatted,
      [leftKey]: formatted,
    });
  };

  const handleSideChange = (sideKey: string, v: string) => {
    const clean = v.trim();
    const formatted = clean && !clean.endsWith('px') && !clean.endsWith('%') && !isNaN(Number(clean)) ? `${clean}px` : clean;
    onChange({
      [sideKey]: formatted,
    });
  };

  return (
    <div className="space-y-1.5" data-testid={`spacing-control-${propertyPrefix}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-slate-400">{label}</label>
          {isOverridden && (
            <span
              data-testid={`override-indicator-${propertyPrefix}`}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
              title="Overridden on this breakpoint"
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {isOverridden && onResetOverride && (
            <button
              onClick={onResetOverride}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 mr-1"
              title="Reset to inherited"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setIsLinked(!isLinked)}
            className={`p-1 rounded transition-colors ${
              isLinked ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={isLinked ? 'Unlink sides' : 'Link sides'}
          >
            {isLinked ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isLinked ? (
        <input
          data-testid={`input-${propertyPrefix}-linked`}
          type="text"
          value={baseVal || topVal}
          placeholder="e.g. 16px"
          onChange={(e) => handleLinkedChange(e.target.value)}
          className="w-full bg-[#141722] border border-[#23293D] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
        />
      ) : (
        <div className="grid grid-cols-4 gap-1">
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">Top</span>
            <input
              data-testid={`input-${topKey}`}
              type="text"
              value={topVal}
              placeholder="0"
              onChange={(e) => handleSideChange(topKey, e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">Right</span>
            <input
              data-testid={`input-${rightKey}`}
              type="text"
              value={rightVal}
              placeholder="0"
              onChange={(e) => handleSideChange(rightKey, e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">Bottom</span>
            <input
              data-testid={`input-${bottomKey}`}
              type="text"
              value={bottomVal}
              placeholder="0"
              onChange={(e) => handleSideChange(bottomKey, e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">Left</span>
            <input
              data-testid={`input-${leftKey}`}
              type="text"
              value={leftVal}
              placeholder="0"
              onChange={(e) => handleSideChange(leftKey, e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
};
