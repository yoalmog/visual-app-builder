'use client';

import React from 'react';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutGroup {
  category: string;
  categoryHe: string;
  items: { key: string; label: string; labelHe: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'File & Project',
    categoryHe: 'קובץ ופרויקט',
    items: [
      { key: 'Ctrl + N', label: 'New Project', labelHe: 'פרויקט חדש' },
      { key: 'Ctrl + O', label: 'Open Project', labelHe: 'פתח פרויקט' },
      { key: 'Ctrl + S', label: 'Save Project', labelHe: 'שמור פרויקט' },
      { key: 'Ctrl + Shift + S', label: 'Save As (Duplicate)', labelHe: 'שמור בשם (עותק)' },
      { key: 'Ctrl + W', label: 'Close Project', labelHe: 'סגור פרויקט' },
    ],
  },
  {
    category: 'Edit & Selection',
    categoryHe: 'עריכה ובחירה',
    items: [
      { key: 'Ctrl + Z', label: 'Undo', labelHe: 'בטל' },
      { key: 'Ctrl + Shift + Z', label: 'Redo', labelHe: 'בצע שוב' },
      { key: 'Ctrl + C', label: 'Copy Selected', labelHe: 'העתק בחירה' },
      { key: 'Ctrl + V', label: 'Paste Nodes', labelHe: 'הדבק רכיבים' },
      { key: 'Ctrl + D', label: 'Duplicate Node', labelHe: 'שכפל רכיב' },
      { key: 'Delete / Backspace', label: 'Delete Node', labelHe: 'מחק רכיב' },
      { key: 'Ctrl + A', label: 'Select All', labelHe: 'בחר הכל' },
      { key: 'Escape', label: 'Deselect', labelHe: 'בטל בחירה' },
    ],
  },
  {
    category: 'View & AI Assistant',
    categoryHe: 'תצוגה ועוזר AI',
    items: [
      { key: 'Ctrl + P', label: 'Toggle Preview Runtime', labelHe: 'הפעל/עצור תצוגה מקדימה' },
      { key: 'Ctrl + K', label: 'Toggle AI Assistant Panel', labelHe: 'פתח/סגור פאנל AI' },
      { key: 'Arrow Keys', label: 'Nudge 1px (Shift + Arrow: 10px)', labelHe: 'הזזת רכיב בפיקסל (Shift: 10px)' },
      { key: 'F1', label: 'Show Keyboard Shortcuts', labelHe: 'הצג קיצורי מקשים' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const activeModal = useProjectLifecycleStore((s) => s.activeModal);
  const closeModal = useProjectLifecycleStore((s) => s.closeModal);
  const language = useProjectLifecycleStore((s) => s.language);

  if (activeModal !== 'shortcuts') return null;

  const isRtl = language === 'he';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-[#0D1017] border border-[#232938] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isRtl ? 'קיצורי מקשים' : 'Keyboard Shortcuts'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'קיצורי דרך לייעול העבודה בסביבת הפיתוח' : 'Global IDE hotkeys and navigation shortcuts'}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1E2330] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {SHORTCUT_GROUPS.map((grp) => (
            <div key={grp.category}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                {isRtl ? grp.categoryHe : grp.category}
              </h3>
              <div className="space-y-1.5">
                {grp.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#141824] border border-[#202636] text-xs"
                  >
                    <span className="text-slate-300 font-medium">
                      {isRtl ? item.labelHe : item.label}
                    </span>
                    <kbd
                      dir="ltr"
                      className="px-2 py-0.5 rounded bg-[#1C2234] border border-[#2B354C] text-[11px] font-mono text-indigo-300 shadow-sm"
                    >
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090B10] border-t border-[#1E2330] flex items-center justify-end shrink-0">
          <button
            onClick={closeModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#1A1F2C] transition-colors"
          >
            {isRtl ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
