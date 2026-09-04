'use client';

import React, { useState } from 'react';

interface ShadowControlProps {
  styles: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  isOverridden?: boolean;
  onResetOverride?: () => void;
}

const PRESET_VALUES: Record<string, string> = {
  none: 'none',
  subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  strong: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
};

export const ShadowControl: React.FC<ShadowControlProps> = ({
  styles,
  onChange,
  isOverridden = false,
  onResetOverride,
}) => {
  const currentPreset = styles.shadowPreset || 'none';
  const [customX, setCustomX] = useState(0);
  const [customY, setCustomY] = useState(4);
  const [customBlur, setCustomBlur] = useState(6);
  const [customSpread, setCustomSpread] = useState(-1);
  const [customColor, setCustomColor] = useState('rgba(0,0,0,0.1)');

  const handlePresetSelect = (preset: string) => {
    if (preset === 'custom') {
      const generated = `${customX}px ${customY}px ${customBlur}px ${customSpread}px ${customColor}`;
      onChange({ shadowPreset: 'custom', boxShadow: generated });
    } else {
      onChange({
        shadowPreset: preset,
        boxShadow: PRESET_VALUES[preset] || 'none',
      });
    }
  };

  const handleCustomChange = (x: number, y: number, blur: number, spread: number, color: string) => {
    const generated = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    onChange({ shadowPreset: 'custom', boxShadow: generated });
  };

  return (
    <div className="space-y-1.5" data-testid="shadow-control">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-slate-400">Box Shadow</label>
          {isOverridden && (
            <span
              data-testid="override-indicator-shadowPreset"
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
              title="Overridden on this breakpoint"
            />
          )}
        </div>

        {isOverridden && onResetOverride && (
          <button
            onClick={onResetOverride}
            className="text-[10px] text-indigo-400 hover:text-indigo-300"
            title="Reset to inherited"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1">
        {['none', 'subtle', 'medium', 'strong', 'custom'].map((preset) => (
          <button
            key={preset}
            data-testid={`shadow-preset-${preset}`}
            onClick={() => handlePresetSelect(preset)}
            className={`py-1 text-[10px] capitalize rounded transition-colors ${
              currentPreset === preset
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-[#141722] hover:bg-[#1A1F2E] text-slate-400 hover:text-white'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {currentPreset === 'custom' && (
        <div className="grid grid-cols-4 gap-1 pt-1.5 bg-[#0F111A] p-2 rounded border border-[#23293D]">
          <div>
            <span className="text-[9px] text-slate-500 block text-center">X</span>
            <input
              type="number"
              value={customX}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomX(val);
                handleCustomChange(val, customY, customBlur, customSpread, customColor);
              }}
              className="w-full bg-[#141722] border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center">Y</span>
            <input
              type="number"
              value={customY}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomY(val);
                handleCustomChange(customX, val, customBlur, customSpread, customColor);
              }}
              className="w-full bg-[#141722] border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center">Blur</span>
            <input
              type="number"
              value={customBlur}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomBlur(val);
                handleCustomChange(customX, customY, val, customSpread, customColor);
              }}
              className="w-full bg-[#141722] border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white"
            />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block text-center">Spread</span>
            <input
              type="number"
              value={customSpread}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomSpread(val);
                handleCustomChange(customX, customY, customBlur, val, customColor);
              }}
              className="w-full bg-[#141722] border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
