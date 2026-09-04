'use client';

import dynamic from 'next/dynamic';

const BuilderShell = dynamic(
  () => import('@/components/builder/BuilderShell').then((mod) => mod.BuilderShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-[#07090E] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center animate-pulse shadow-lg">
            <span className="font-bold text-white text-sm">A</span>
          </div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider">
            LOADING APEX STUDIO...
          </span>
        </div>
      </div>
    ),
  }
);

export default function RootPage() {
  return <BuilderShell projectId="default-project" />;
}
