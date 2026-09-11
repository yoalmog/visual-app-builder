'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { usePlatformStore } from '@/builder/state/platform-store';
import { useProjectLifecycleStore } from '@/builder/lifecycle/useProjectLifecycleStore';
import { defaultCommandRegistry } from '@/builder/commands/CommandRegistry';
import { ComponentType } from '@/builder/schema/component';
import { createDefaultNode } from '@/builder/components/registry';
import {
  Search,
  Command,
  ArrowRight,
  PlusCircle,
  FileText,
  Zap,
  Users,
  Code2,
  Database,
  Layers,
  Shield,
  X,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSwarm?: () => void;
  onToggleCode?: () => void;
  onOpenDataWizard?: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  category: 'Commands' | 'Insert Component' | 'Pages' | 'Enterprise Tools';
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenSwarm,
  onToggleCode,
  onOpenDataWizard,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const setActivePage = useBuilderStore((s) => s.setActivePage);
  const addNode = useBuilderStore((s) => s.addNode);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const openModal = useProjectLifecycleStore((s) => s.openModal);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];

    // 1. Studio & Registry Commands
    const commands = defaultCommandRegistry.getAllCommands();
    for (const cmd of commands) {
      list.push({
        id: `cmd_${cmd.id}`,
        title: cmd.label,
        category: 'Commands',
        description: cmd.description,
        shortcut: cmd.shortcut,
        icon: <Command className="w-3.5 h-3.5 text-indigo-400" />,
        action: () => {
          defaultCommandRegistry.executeCommand(cmd.id);
        },
      });
    }

    // 2. Insert Components
    const insertableComponents: { type: ComponentType; label: string; desc: string }[] = [
      { type: 'button', label: 'Button', desc: 'Interactive action button with variants' },
      { type: 'card', label: 'Card Container', desc: 'Elevated surface with border & shadow' },
      { type: 'container', label: 'Flex Container', desc: 'Layout wrapper with flexbox/grid controls' },
      { type: 'heading', label: 'Heading Title', desc: 'H1–H6 typography element' },
      { type: 'text', label: 'Paragraph Text', desc: 'Body copy and inline text element' },
      { type: 'input', label: 'Text Input', desc: 'Single-line form input field' },
      { type: 'data_table', label: 'Data Table', desc: 'Tabular data display with sortable headers' },
      { type: 'image', label: 'Image Asset', desc: 'Responsive media asset' },
      { type: 'navbar', label: 'Navigation Bar', desc: 'Header bar with brand and nav links' },
      { type: 'badge', label: 'Status Badge', desc: 'Compact chip with intent colors' },
      { type: 'list', label: 'List Container', desc: 'Repeatable collection list items' },
    ];

    for (const comp of insertableComponents) {
      list.push({
        id: `insert_${comp.type}`,
        title: `Insert ${comp.label}`,
        category: 'Insert Component',
        description: comp.desc,
        icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />,
        action: () => {
          const activePage = project?.pages?.find((p) => p.id === activePageId) || project?.pages?.[0];
          const parentId = selectedNodeId || activePage?.root?.id;
          if (parentId) {
            const newNodeId = `node_${comp.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newNode = createDefaultNode(comp.type, newNodeId, comp.label);
            addNode(parentId, newNode);
          }
        },
      });
    }

    // 3. Pages Navigation
    if (project?.pages) {
      for (const page of project.pages) {
        list.push({
          id: `page_${page.id}`,
          title: `Jump to: ${page.name}`,
          category: 'Pages',
          description: page.slug === '/' ? 'Home Page' : `Path: ${page.slug}`,
          icon: <FileText className="w-3.5 h-3.5 text-cyan-400" />,
          action: () => {
            setActivePage(page.id);
          },
        });
      }
    }

    // 4. Enterprise Tools & Studios
    list.push({
      id: 'tool_swarm',
      title: 'Open Swarm Debate Studio',
      category: 'Enterprise Tools',
      description: 'Run multi-agent round-table consensus and performance profiler',
      icon: <Users className="w-3.5 h-3.5 text-purple-400" />,
      action: () => {
        if (onOpenSwarm) onOpenSwarm();
      },
    });

    list.push({
      id: 'tool_code',
      title: 'Toggle Live Code Inspector',
      category: 'Enterprise Tools',
      description: 'Real-time Next.js 14 App Router TSX generation & Tailwind viewer',
      icon: <Code2 className="w-3.5 h-3.5 text-indigo-400" />,
      action: () => {
        if (onToggleCode) onToggleCode();
      },
    });

    list.push({
      id: 'tool_data_api',
      title: 'Open Live Supabase & REST Wizard',
      category: 'Enterprise Tools',
      description: 'Introspect external API endpoints and build live typed collections',
      icon: <Database className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => {
        if (onOpenDataWizard) onOpenDataWizard();
      },
    });

    list.push({
      id: 'tool_export',
      title: 'Export Project (ZIP / Next.js TSX)',
      category: 'Enterprise Tools',
      description: 'Generate runnable Next.js 14 project zip package',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      action: () => {
        openModal('export');
      },
    });

    list.push({
      id: 'tool_scale',
      title: 'Scale & Chaos Engineering Dashboard',
      category: 'Enterprise Tools',
      description: 'Multi-region mesh, failover latency, and traffic governor',
      icon: <Layers className="w-3.5 h-3.5 text-blue-400" />,
      action: () => {
        usePlatformStore.getState().setScaleDashboardOpen(true);
      },
    });

    list.push({
      id: 'tool_security',
      title: 'Enterprise Security & Audit Vault',
      category: 'Enterprise Tools',
      description: 'Merkle ledger integrity, role permissions, and compliance guardrails',
      icon: <Shield className="w-3.5 h-3.5 text-rose-400" />,
      action: () => {
        usePlatformStore.getState().setEnterpriseSecurityOpen(true);
      },
    });

    return list;
  }, [project, activePageId, selectedNodeId, addNode, setActivePage, openModal, onOpenSwarm, onToggleCode, onOpenDataWizard]);

  // Filter items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        (item.description && item.description.toLowerCase().includes(lower)) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [items, query]);

  // Keyboard navigation within list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-24 p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#0B0E17] border border-[#202638] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-slate-100 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-[#1A2030] bg-[#0E121E] flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, component, or page..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 font-sans"
          />
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181E2E] text-slate-400 border border-[#222A3E]">
            ESC to close
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1A2030] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching commands or components found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'hover:bg-[#131724] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#151A28] border border-[#20273A]'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{item.title}</span>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#181E2E] text-slate-400'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? 'bg-white/20 border-white/30 text-white'
                            : 'bg-[#121624] border-[#222A3C] text-slate-400'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white animate-pulse" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-[#1A2030] bg-[#0A0D15] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="font-mono bg-[#141A28] px-1 rounded text-slate-300">↑</kbd>{' '}
              <kbd className="font-mono bg-[#141A28] px-1 rounded text-slate-300">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono bg-[#141A28] px-1 rounded text-slate-300">↵</kbd> to select
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {filtered.length} of {items.length} items
          </span>
        </div>
      </div>
    </div>
  );
};
