'use client';

import React from 'react';
import { PropertyFieldDef } from '@/builder/components/definitions';
import { DesignToken } from '@/builder/schema/project';
import { RotateCcw, Palette } from 'lucide-react';

interface PropertyControlProps {
  field: PropertyFieldDef;
  value: any;
  onChange: (val: any) => void;
  isOverridden?: boolean;
  onResetOverride?: () => void;
  isMixed?: boolean;
  tokens?: DesignToken[];
  activeTokenId?: string;
  onApplyToken?: (tokenId: string) => void;
  onRemoveToken?: () => void;
}

const THEME_COLOR_SWATCHES = [
  { name: 'Primary', color: '#4F46E5' },
  { name: 'Secondary', color: '#06B6D4' },
  { name: 'Dark', color: '#0F172A' },
  { name: 'Muted', color: '#64748B' },
  { name: 'Light', color: '#F8FAFC' },
];

export const PropertyControl: React.FC<PropertyControlProps> = ({
  field,
  value,
  onChange,
  isOverridden = false,
  onResetOverride,
  isMixed = false,
  tokens = [],
  activeTokenId,
  onApplyToken,
  onRemoveToken,
}) => {
  const safeFieldKey = field.key.replace('.', '-');

  const matchingTokens = tokens.filter((t) => {
    if (field.type === 'color') return t.category === 'color';
    if (field.key.includes('padding') || field.key.includes('margin') || field.key.includes('gap')) {
      return t.category === 'spacing';
    }
    if (field.key.includes('Radius')) return t.category === 'radius';
    return false;
  });

  const activeToken = tokens.find((t) => t.id === activeTokenId);

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-medium text-slate-400">{field.label}</label>
        {isOverridden && (
          <span
            data-testid={`override-indicator-${safeFieldKey}`}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
            title="Overridden on this breakpoint"
          />
        )}
        {activeToken && (
          <span
            data-testid={`token-indicator-${safeFieldKey}`}
            className="px-1 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[9px] font-mono"
            title={`Referencing token: ${activeToken.name}`}
          >
            {activeToken.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Token vs Custom Switch */}
        {activeToken ? (
          <button
            data-testid={`switch-to-custom-${safeFieldKey}`}
            onClick={onRemoveToken}
            className="text-[9px] text-amber-400 hover:text-amber-300 px-1 rounded bg-amber-400/10"
            title="Switch from token to custom value"
          >
            Custom
          </button>
        ) : (
          matchingTokens.length > 0 && onApplyToken && (
            <select
              data-testid={`select-token-${safeFieldKey}`}
              value=""
              onChange={(e) => {
                if (e.target.value) onApplyToken(e.target.value);
              }}
              className="text-[9px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 rounded px-1 outline-none cursor-pointer"
            >
              <option value="">Token</option>
              {matchingTokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )
        )}

        {isOverridden && onResetOverride && (
          <button
            data-testid={`reset-override-${safeFieldKey}`}
            onClick={onResetOverride}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            title="Reset to inherited value"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );

  if (field.type === 'color') {
    const colorVal =
      !isMixed && typeof value === 'string' && value.startsWith('#') ? value : '#000000';

    return (
      <div className="space-y-1" data-testid={`prop-${safeFieldKey}`}>
        {renderHeader()}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorVal}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0 shrink-0"
          />
          <input
            data-testid={`input-${safeFieldKey}`}
            type="text"
            value={isMixed ? '' : value || ''}
            placeholder={isMixed ? 'Mixed' : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-[#141722] border border-[#23293D] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Theme swatches */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {THEME_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.name}
              onClick={() => onChange(swatch.color)}
              title={`${swatch.name}: ${swatch.color}`}
              style={{ backgroundColor: swatch.color }}
              className="w-3.5 h-3.5 rounded-full border border-slate-700/80 hover:scale-110 transition-transform"
            />
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-1" data-testid={`prop-${safeFieldKey}`}>
        {renderHeader()}
        <select
          data-testid={`input-${safeFieldKey}`}
          value={isMixed ? '' : value || field.options?.[0] || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#141722] border border-[#23293D] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
        >
          {isMixed && <option value="">Mixed</option>}
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'slider') {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const step = field.step ?? 1;
    const numericVal = typeof value === 'number' ? value : Number(value) || 0;

    return (
      <div className="space-y-1" data-testid={`prop-${safeFieldKey}`}>
        {renderHeader()}
        <div className="flex items-center gap-2">
          <input
            data-testid={`input-slider-${safeFieldKey}`}
            type="range"
            min={min}
            max={max}
            step={step}
            value={isMixed ? min : numericVal}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-indigo-500 h-1.5 bg-[#141722] rounded cursor-pointer"
          />
          <input
            data-testid={`input-${safeFieldKey}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={isMixed ? '' : numericVal}
            placeholder={isMixed ? 'Mixed' : undefined}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-14 bg-[#141722] border border-[#23293D] rounded px-1.5 py-1 text-xs text-center text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1" data-testid={`prop-${safeFieldKey}`}>
      {renderHeader()}
      <input
        data-testid={`input-${safeFieldKey}`}
        type={field.type === 'number' ? 'number' : 'text'}
        value={isMixed ? '' : value ?? ''}
        placeholder={isMixed ? 'Mixed' : field.placeholder}
        onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full bg-[#141722] border border-[#23293D] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  );
};
