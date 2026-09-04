'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { LocalizationConfig } from '@/builder/schema/project';
import { Globe, Plus, Languages, Check } from 'lucide-react';
import { LocalizationManager } from '@/builder/localization/localization';

export const LocalizationPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const setProject = useBuilderStore((s) => s.setProject);

  const locConfig: LocalizationConfig = project.localization || {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'ar', 'he'],
    translations: {
      en: {
        'common.save': 'Save',
        'common.cancel': 'Cancel',
      },
    },
  };

  const [selectedLocale, setSelectedLocale] = useState<string>(locConfig.defaultLocale || 'en');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const currentTranslations = locConfig.translations?.[selectedLocale] || {};

  const handleAddTranslation = () => {
    if (!newKey.trim()) return;
    const updated = {
      ...locConfig,
      translations: {
        ...locConfig.translations,
        [selectedLocale]: {
          ...(locConfig.translations?.[selectedLocale] || {}),
          [newKey.trim()]: newValue,
        },
      },
    };

    setProject({
      ...project,
      localization: updated,
    });
    setNewKey('');
    setNewValue('');
  };

  const locManager = new LocalizationManager(locConfig);
  const isRtl = locManager.isRTL(selectedLocale);

  return (
    <div data-testid="localization-panel" className="w-80 h-full bg-[#0D111A] border-r border-[#1B1E2B] flex flex-col select-none text-slate-200">
      <div className="p-3 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Localization</h2>
        </div>
        {isRtl && (
          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-mono">
            RTL Active
          </span>
        )}
      </div>

      {/* Locale selector */}
      <div className="p-3 border-b border-[#1B1E2B] flex flex-col gap-2">
        <label className="text-[11px] text-slate-400">Current Preview Locale</label>
        <div className="flex flex-wrap gap-1.5">
          {locConfig.locales.map((code) => (
            <button
              key={code}
              onClick={() => setSelectedLocale(code)}
              className={`px-2.5 py-1 rounded text-xs uppercase font-medium transition-colors ${
                selectedLocale === code
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#141824] hover:bg-[#1C2234] text-slate-400 border border-[#23293D]'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Add translation entry */}
      <div className="p-3 border-b border-[#1B1E2B] flex flex-col gap-2">
        <input
          type="text"
          placeholder="Translation Key (e.g. hero.title)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="bg-[#141824] border border-[#23293D] rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Translated string..."
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1 bg-[#141824] border border-[#23293D] rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={handleAddTranslation}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Translations list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Strings ({Object.keys(currentTranslations).length})
        </div>
        {Object.entries(currentTranslations).map(([key, val]) => (
          <div
            key={key}
            className="p-2 bg-[#121622] border border-[#1E2333] rounded flex flex-col gap-1 text-xs"
          >
            <div className="font-mono text-[10px] text-indigo-400">{key}</div>
            <div className="text-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
              {val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
