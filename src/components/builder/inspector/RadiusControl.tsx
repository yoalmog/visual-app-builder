'use client';

import React, { useState } from 'react';
import { Link2, Unlink } from 'lucide-react';

interface RadiusControlProps {
  styles: Record<string, any>;
  onChange: (updates: Record<string, string>) => void;
  isOverridden?: boolean;
  onResetOverride?: () => void;
}

export const RadiusControl: React.FC<RadiusControlProps> = ({
  styles,
  onChange,
  isOverridden = false,
  onResetOverride,
}) => {
  const [isLinked, setIsLinked] = useState(true);

  const baseVal = styles.borderRadius || '';
  const tlVal = styles.borderTopLeftRadius || baseVal || '';
  const trVal = styles.borderTopRightRadius || baseVal || '';
  const brVal = styles.borderBottomRightRadius || baseVal || '';
  const blVal = styles.borderBottomLeftRadius || baseVal || '';

  const formatUnit = (v: string) => {
    const clean = v.trim();
    return clean && !clean.endsWith('px') && !clean.endsWith('%') && !isNaN(Number(clean)) ? `${clean}px` : clean;
  };

  const handleLinkedChange = (v: string) => {
    const formatted = formatUnit(v);
    onChange({
      borderRadius: formatted,
      borderTopLeftRadius: formatted,
      borderTopRightRadius: formatted,
      borderBottomRightRadius: formatted,
      borderBottomLeftRadius: formatted,
    });
  };

  const handleCornerChange = (cornerKey: string, v: string) => {
    onChange({
      [cornerKey]: formatUnit(v),
    });
  };

  return (
    <div className="space-y-1.5" data-testid="radius-control">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-slate-400">Corner Radius</label>
          {isOverridden && (
            <span
              data-testid="override-indicator-borderRadius"
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
            title={isLinked ? 'Unlink corners' : 'Link corners'}
          >
            {isLinked ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isLinked ? (
        <input
          data-testid="input-borderRadius-linked"
          type="text"
          value={baseVal || tlVal}
          placeholder="e.g. 8px"
          onChange={(e) => handleLinkedChange(e.target.value)}
          className="w-full bg-[#141722] border border-[#23293D] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
        />
      ) : (
        <div className="grid grid-cols-4 gap-1">
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">TL</span>
            <input
              data-testid="input-borderTopLeftRadius"
              type="text"
              value={tlVal}
              placeholder="0"
              onChange={(e) => handleCornerChange('borderTopLeftRadius', e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">TR</span>
            <input
              data-testid="input-borderTopRightRadius"
              type="text"
              value={trVal}
              placeholder="0"
              onChange={(e) => handleCornerChange('borderTopRightRadius', e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">BR</span>
            <input
              data-testid="input-borderBottomRightRadius"
              type="text"
              value={brVal}
              placeholder="0"
              onChange={(e) => handleCornerChange('borderBottomRightRadius', e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center mb-0.5">BL</span>
            <input
              data-testid="input-borderBottomLeftRadius"
              type="text"
              value={blVal}
              placeholder="0"
              onChange={(e) => handleCornerChange('borderBottomLeftRadius', e.target.value)}
              className="w-full bg-[#141722] border border-[#23293D] rounded px-1 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
};
