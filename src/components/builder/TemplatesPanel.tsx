'use client';

import React from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { STARTER_TEMPLATES, instantiateStarterTemplate } from '@/builder/templates/starter-templates';
import { LayoutTemplate, ArrowUpRight, Check } from 'lucide-react';

export const TemplatesPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const setProject = useBuilderStore((s) => s.setProject);

  const handleApplyTemplate = (templateId: string) => {
    if (confirm('Instantiate this template? Current project data will be merged.')) {
      const templateProject = instantiateStarterTemplate(templateId, project.id, project.name);
      setProject({
        ...project,
        collections: [...(project.collections || []), ...(templateProject.collections || [])],
        theme: templateProject.theme || project.theme,
      });
    }
  };

  return (
    <div data-testid="templates-panel" className="w-80 h-full bg-[#0D111A] border-r border-[#1B1E2B] flex flex-col select-none text-slate-200">
      <div className="p-3 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Starter Templates</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {STARTER_TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            className="p-3 bg-[#121622] hover:bg-[#161B2A] border border-[#1E2333] hover:border-indigo-500/40 rounded-lg transition-all flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">{tmpl.name}</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                {tmpl.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{tmpl.description}</p>
            <button
              onClick={() => handleApplyTemplate(tmpl.id)}
              className="mt-1 w-full flex items-center justify-center gap-1.5 text-xs bg-[#1E2333] hover:bg-indigo-600 text-slate-300 hover:text-white py-1.5 rounded transition-colors"
            >
              <span>Use Template</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
