'use client';

import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import * as Icons from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const toastMessage = useEditorStore((s) => s.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-14 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#141824] border border-indigo-500/40 text-white rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-medium">
      <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{toastMessage}</span>
    </div>
  );
};
