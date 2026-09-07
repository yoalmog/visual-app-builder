'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultCommandRegistry } from '@/builder/commands/CommandRegistry';
import { defaultProjectLifecycleManager } from '@/builder/lifecycle/ProjectLifecycleManager';
import { CommandCategory, CommandContext } from '@/builder/commands/command-types';
import { ChevronRight, Globe, Layers, AlertCircle } from 'lucide-react';

interface MenuDef {
  key: CommandCategory;
  label: string;
  labelHe: string;
}

const MENUS: MenuDef[] = [
  { key: 'file', label: 'File', labelHe: 'קובץ' },
  { key: 'edit', label: 'Edit', labelHe: 'עריכה' },
  { key: 'project', label: 'Project', labelHe: 'פרויקט' },
  { key: 'view', label: 'View', labelHe: 'תצוגה' },
  { key: 'ai', label: 'AI', labelHe: 'בינה מלאכותית' },
  { key: 'run', label: 'Run', labelHe: 'הפעלה' },
  { key: 'build', label: 'Build', labelHe: 'בנייה' },
  { key: 'help', label: 'Help', labelHe: 'עזרה' },
];

export const AppMenuBar: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const saveStatus = useBuilderStore((s) => s.saveStatus);
  const history = useBuilderStore((s) => s.history);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const isPreview = useBuilderStore((s) => s.isPreview);
  const initializeProject = useBuilderStore((s) => s.initializeProject);

  const lifecycleState = useProjectLifecycleStore((s) => s.lifecycleState);
  const language = useProjectLifecycleStore((s) => s.language);
  const toggleLanguage = useProjectLifecycleStore((s) => s.toggleLanguage);
  const recentProjects = useProjectLifecycleStore((s) => s.recentProjects);

  const [activeMenu, setActiveMenu] = useState<CommandCategory | null>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const isRtl = language === 'he';

  const hasProject = lifecycleState !== 'NO_PROJECT' && Boolean(project?.id);
  const isDirty = saveStatus === 'unsaved';
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const hasSelection = Boolean(selectedNodeId) || selectedNodeIds.length > 0;

  const commandContext: CommandContext = {
    hasProject,
    isDirty,
    canUndo,
    canRedo,
    hasSelection,
    hasClipboard: true,
    isPreview,
    isGenerating: false,
    hasRecoveryFailure: false,
    canVerify: true,
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setHoveredSubmenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setHoveredSubmenu(null);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleMenuClick = (category: CommandCategory) => {
    setActiveMenu(activeMenu === category ? null : category);
    setHoveredSubmenu(null);
  };

  const handleMenuHover = (category: CommandCategory) => {
    if (activeMenu !== null) {
      setActiveMenu(category);
      setHoveredSubmenu(null);
    }
  };

  const handleExecuteCommand = async (commandId: string) => {
    setActiveMenu(null);
    setHoveredSubmenu(null);
    await defaultCommandRegistry.executeCommand(commandId);
  };

  const handleOpenRecentProject = (projectId: string) => {
    setActiveMenu(null);
    setHoveredSubmenu(null);
    const isProjectDirty = saveStatus === 'unsaved';
    if (isProjectDirty) {
      useProjectLifecycleStore.getState().openModal('unsaved_changes', 'open', projectId);
    } else {
      const res = defaultProjectLifecycleManager.openProject(projectId);
      if (res.success && res.project) {
        initializeProject(res.project.id);
        useProjectLifecycleStore.getState().setLifecycleState('OPEN');
        useProjectLifecycleStore.getState().refreshRecentProjects();
      }
    }
  };

  const commandsForActiveMenu = activeMenu ? defaultCommandRegistry.getCommandsByCategory(activeMenu) : [];

  return (
    <div
      ref={menuBarRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="h-8 bg-[#080A0F] border-b border-[#1A1F2C] flex items-center justify-between px-3 select-none text-xs z-40 shrink-0"
    >
      {/* Menu Categories */}
      <div className="flex items-center gap-1">
        {/* Brand Icon */}
        <div className="flex items-center gap-1.5 mr-2 rtl:mr-0 rtl:ml-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-3 h-3" />
          </div>
          <span className="font-extrabold text-[11px] tracking-tight text-white hidden md:inline">
            APEX
          </span>
        </div>

        {MENUS.map((m) => {
          const isOpen = activeMenu === m.key;
          return (
            <div key={m.key} className="relative">
              <button
                data-testid={`menu-${m.key}`}
                onClick={() => handleMenuClick(m.key)}
                onMouseEnter={() => handleMenuHover(m.key)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  isOpen
                    ? 'bg-[#1D2232] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-[#141824]'
                }`}
              >
                {isRtl ? m.labelHe : m.label}
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  className={`absolute top-full mt-0.5 min-w-[220px] bg-[#0E1119] border border-[#232A3C] rounded-lg shadow-2xl py-1.5 z-50 text-slate-200 ${
                    isRtl ? 'right-0 text-right' : 'left-0 text-left'
                  }`}
                >
                  {commandsForActiveMenu.map((cmd) => {
                    const enabled = cmd.isEnabled(commandContext);
                    const disabledReason = !enabled && cmd.getDisabledReason ? cmd.getDisabledReason(commandContext) : null;

                    // Special injection for "Open Recent" submenu under File menu
                    if (m.key === 'file' && cmd.id === 'file.open') {
                      return (
                        <React.Fragment key={cmd.id}>
                          <button
                            onClick={() => enabled && handleExecuteCommand(cmd.id)}
                            disabled={!enabled}
                            title={disabledReason || undefined}
                            className={`w-full px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                              enabled
                                ? 'hover:bg-[#1C2334] text-slate-200 hover:text-white cursor-pointer'
                                : 'text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <span>{isRtl ? cmd.labelHe : cmd.label}</span>
                            {cmd.shortcut && (
                              <kbd dir="ltr" className="text-[10px] font-mono text-slate-500 ml-4">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>

                          {/* Open Recent Submenu Trigger */}
                          <div
                            onMouseEnter={() => setHoveredSubmenu('recent')}
                            className="relative"
                          >
                            <button
                              className="w-full px-3 py-1.5 flex items-center justify-between text-xs hover:bg-[#1C2334] text-slate-200 hover:text-white cursor-pointer transition-colors"
                            >
                              <span>{isRtl ? 'פרויקטים אחרונים' : 'Open Recent'}</span>
                              <ChevronRight className={`w-3.5 h-3.5 text-slate-500 ${isRtl ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Recent Projects Submenu Popup */}
                            {hoveredSubmenu === 'recent' && (
                              <div
                                className={`absolute top-0 min-w-[210px] bg-[#0E1119] border border-[#232A3C] rounded-lg shadow-2xl py-1 z-50 ${
                                  isRtl ? 'right-full mr-1' : 'left-full ml-1'
                                }`}
                              >
                                {recentProjects.length === 0 ? (
                                  <div className="px-3 py-2 text-[11px] text-slate-500">
                                    {isRtl ? 'אין פרויקטים אחרונים' : 'No recent projects'}
                                  </div>
                                ) : (
                                  <>
                                    {recentProjects.map((rp) => (
                                      <button
                                        key={rp.id}
                                        onClick={() => rp.exists && handleOpenRecentProject(rp.id)}
                                        disabled={!rp.exists}
                                        className={`w-full px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                                          rp.exists
                                            ? 'hover:bg-[#1C2334] text-slate-200 hover:text-white cursor-pointer'
                                            : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                      >
                                        <span className="truncate max-w-[140px]">{rp.name}</span>
                                        <span className="text-[9px] font-mono text-slate-500">
                                          {rp.exists ? `v${rp.schemaVersion}` : (isRtl ? 'לא קיים' : 'missing')}
                                        </span>
                                      </button>
                                    ))}
                                    <div className="my-1 border-t border-[#1C2232]" />
                                    <button
                                      onClick={() => {
                                        defaultProjectLifecycleManager.clearRecentProjects();
                                        useProjectLifecycleStore.getState().refreshRecentProjects();
                                        setHoveredSubmenu(null);
                                      }}
                                      className="w-full px-3 py-1 text-[11px] text-slate-400 hover:text-red-400 hover:bg-[#1C2334] text-left rtl:text-right transition-colors"
                                    >
                                      {isRtl ? 'נקה רשימת אחרונים' : 'Clear Recent Projects'}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    }

                    return (
                      <button
                        key={cmd.id}
                        data-testid={`cmd-${cmd.id}`}
                        onClick={() => enabled && handleExecuteCommand(cmd.id)}
                        disabled={!enabled}
                        title={disabledReason || undefined}
                        className={`w-full px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                          enabled
                            ? 'hover:bg-[#1C2334] text-slate-200 hover:text-white cursor-pointer'
                            : 'text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{isRtl ? cmd.labelHe : cmd.label}</span>
                          {disabledReason && (
                            <span className="text-[10px] text-slate-600 font-normal">
                              ({disabledReason})
                            </span>
                          )}
                        </span>
                        {cmd.shortcut && (
                          <kbd dir="ltr" className="text-[10px] font-mono text-slate-500 ml-4">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Side: Language Toggle & Project Status Indicator */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          title={isRtl ? 'Switch to English' : 'עבור לעברית (RTL)'}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#131622] hover:bg-[#1C2132] border border-[#202636] text-[11px] font-semibold text-indigo-300 hover:text-white transition-colors"
        >
          <Globe className="w-3 h-3 text-indigo-400" />
          <span>{language === 'en' ? 'EN' : 'עב'}</span>
        </button>
      </div>
    </div>
  );
};
