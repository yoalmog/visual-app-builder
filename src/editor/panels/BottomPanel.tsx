'use client';

import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import * as Icons from 'lucide-react';
import { ComponentNode } from '@/types/schema';
import { COMPONENT_REGISTRY } from '../registry';

export const BottomPanel: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const activeTab = useEditorStore((s) => s.activeBottomTab);
  const setActiveTab = useEditorStore((s) => s.setActiveBottomTab);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const toggleLock = useEditorStore((s) => s.toggleLock);
  const toggleHidden = useEditorStore((s) => s.toggleHidden);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const switchPage = useEditorStore((s) => s.switchPage);
  const addPage = useEditorStore((s) => s.addPage);
  const deletePage = useEditorStore((s) => s.deletePage);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const addRecord = useEditorStore((s) => s.addRecord);
  const addWorkflow = useEditorStore((s) => s.addWorkflow);
  const showToast = useEditorStore((s) => s.showToast);

  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const activePage = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    const slug = newPageSlug.trim() || `/${newPageName.toLowerCase().replace(/\s+/g, '-')}`;
    addPage(newPageName.trim(), slug);
    setNewPageName('');
    setNewPageSlug('');
    setIsAddingPage(false);
  };

  // AI Prompt handler that modifies project schema intelligently
  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      const promptLower = aiPrompt.toLowerCase();
      if (promptLower.includes('pricing') || promptLower.includes('price')) {
        // Add a pricing page
        addPage('Pricing', '/pricing');
        showToast('AI: Created new responsive Pricing page!');
      } else if (promptLower.includes('contact') || promptLower.includes('form')) {
        addPage('Contact Us', '/contact');
        showToast('AI: Created new Contact Form page!');
      } else if (promptLower.includes('dark') || promptLower.includes('theme')) {
        useEditorStore.setState((state) => ({
          project: {
            ...state.project,
            theme: {
              ...state.project.theme,
              backgroundColor: '#050608',
              surfaceColor: '#0E1017',
              primaryColor: '#6366F1',
            },
          },
        }));
        showToast('AI: Applied sleek dark neon theme to project!');
      } else {
        // Add a sample card or section to active page
        const newSecId = useEditorStore.getState().addNode('section', activePage.rootNodeId);
        useEditorStore.getState().addNode('heading', newSecId);
        useEditorStore.getState().addNode('text', newSecId);
        useEditorStore.getState().addNode('button', newSecId);
        showToast(`AI: Generated custom layout based on: "${aiPrompt.slice(0, 30)}..."`);
      }
      setIsAiGenerating(false);
      setAiPrompt('');
    }, 900);
  };

  // Recursive Layers Tree item
  const renderLayerNode = (nodeId: string, depth = 0) => {
    const node: ComponentNode | undefined = project.nodes[nodeId];
    if (!node) return null;

    const isSelected = selectedNodeId === nodeId;
    const def = COMPONENT_REGISTRY[node.type];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={nodeId} className="flex flex-col">
        <div
          onClick={(e) => {
            e.stopPropagation();
            selectNode(nodeId);
          }}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer transition-colors text-xs group ${
            isSelected
              ? 'bg-indigo-600/30 text-white border border-indigo-500/50'
              : 'text-slate-300 hover:bg-[#181B26] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <Icons.Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : (
              <Icons.Component className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="truncate font-medium">{node.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">({node.type})</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(node.id);
              }}
              className="p-1 hover:text-white text-slate-400"
              title="Lock"
            >
              {node.isLocked ? (
                <Icons.Lock className="w-3 h-3 text-amber-400" />
              ) : (
                <Icons.Unlock className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleHidden(node.id);
              }}
              className="p-1 hover:text-white text-slate-400"
              title="Visibility"
            >
              {node.isHidden ? (
                <Icons.EyeOff className="w-3 h-3 text-red-400" />
              ) : (
                <Icons.Eye className="w-3 h-3" />
              )}
            </button>
            {node.parentId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
                className="p-1 hover:text-red-400 text-slate-400"
                title="Delete"
              >
                <Icons.Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && (
          <div className="flex flex-col">
            {node.children.map((childId) => renderLayerNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'layers', label: 'Layers', icon: Icons.Layers },
    { id: 'pages', label: 'Pages', icon: Icons.FileText },
    { id: 'data', label: 'Database', icon: Icons.Database },
    { id: 'workflows', label: 'Workflows', icon: Icons.Workflow },
    { id: 'assets', label: 'Assets', icon: Icons.Image },
    { id: 'ai', label: 'AI Builder', icon: Icons.Sparkles },
  ] as const;

  return (
    <footer className="bg-[#0B0C12] border-t border-[#1E2230] flex flex-col select-none shrink-0 z-20">
      {/* Bottom Tabs Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[#1E2230] bg-[#0E1017]">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsExpanded(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1C2030] text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141722]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-[#181B26] rounded text-slate-400 hover:text-white transition-colors"
          title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
        >
          <Icons.ChevronUp
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expanded Content Drawer */}
      {isExpanded && activeTab && (
        <div className="h-56 overflow-y-auto p-4 bg-[#0B0C12] text-xs">
          {/* LAYERS TAB */}
          {activeTab === 'layers' && (
            <div className="max-w-2xl space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                DOM Component Tree — {activePage?.name}
              </div>
              {activePage?.rootNodeId ? (
                renderLayerNode(activePage.rootNodeId)
              ) : (
                <div className="text-slate-500">No root node found.</div>
              )}
            </div>
          )}

          {/* PAGES TAB */}
          {activeTab === 'pages' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Project Pages ({project.pages.length})
                </span>
                <button
                  onClick={() => setIsAddingPage(!isAddingPage)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors"
                >
                  <Icons.Plus className="w-3 h-3" />
                  <span>New Page</span>
                </button>
              </div>

              {isAddingPage && (
                <form
                  onSubmit={handleCreatePage}
                  className="flex items-center gap-2 p-2.5 bg-[#141722] border border-[#23293D] rounded-lg animate-in fade-in duration-150"
                >
                  <input
                    type="text"
                    placeholder="Page Name (e.g. Products)"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    className="flex-1 bg-[#10121A] border border-slate-700 rounded px-2 py-1 text-white placeholder:text-slate-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Slug (e.g. /products)"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                    className="flex-1 bg-[#10121A] border border-slate-700 rounded px-2 py-1 text-white placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingPage(false)}
                    className="px-2 py-1 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {project.pages.map((p) => {
                  const isActive = p.id === project.activePageId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => switchPage(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#151926] border-indigo-500/60 shadow-sm'
                          : 'bg-[#11131C] border-[#1E2230] hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.isHome && (
                            <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
                              HOME
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.slug}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePage(p.id);
                          }}
                          className="p-1 hover:text-white text-slate-500"
                          title="Duplicate Page"
                        >
                          <Icons.Copy className="w-3 h-3" />
                        </button>
                        {project.pages.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(p.id);
                            }}
                            className="p-1 hover:text-red-400 text-slate-500"
                            title="Delete Page"
                          >
                            <Icons.Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DATA TAB */}
          {activeTab === 'data' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Database Collections ({project.collections.length})
                </span>
                <button
                  onClick={() => {
                    addRecord('products', {
                      name: 'New Custom Item',
                      price: '$99.00',
                      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
                      stock: 10,
                    });
                    showToast('Added new record to products collection');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#181B26] hover:bg-[#222738] border border-[#282F44] text-slate-200 rounded-md font-medium transition-colors"
                >
                  <Icons.Plus className="w-3 h-3" />
                  <span>Add Product Record</span>
                </button>
              </div>

              <div className="space-y-2">
                {project.collections.map((col) => (
                  <div key={col.id} className="p-3 bg-[#11131C] border border-[#1E2230] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <Icons.Database className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{col.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({col.key})</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{col.records.length} records</span>
                    </div>

                    <div className="overflow-x-auto border border-[#1E2230] rounded-lg">
                      <table className="w-full text-left">
                        <thead className="bg-[#151824] text-slate-400 text-[10px] uppercase font-mono">
                          <tr>
                            {col.fields.map((f) => (
                              <th key={f.id} className="p-2 border-b border-[#1E2230]">
                                {f.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1D2A] text-slate-300">
                          {col.records.slice(0, 4).map((r, i) => (
                            <tr key={i} className="hover:bg-[#161924]">
                              {col.fields.map((f) => (
                                <td key={f.id} className="p-2 truncate max-w-xs">
                                  {String(r[f.key] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WORKFLOWS TAB */}
          {activeTab === 'workflows' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Visual Workflows & Logic
                </span>
                <button
                  onClick={() => addWorkflow('New Interaction Flow', 'click')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors"
                >
                  <Icons.Plus className="w-3 h-3" />
                  <span>Create Workflow</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.workflows.map((wf) => (
                  <div key={wf.id} className="p-3 bg-[#11131C] border border-[#1E2230] rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>{wf.name}</span>
                      <span className="text-[10px] text-indigo-400 font-mono uppercase bg-indigo-500/10 px-2 py-0.5 rounded">
                        On {wf.triggerEvent}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      {wf.nodes.map((node, i) => (
                        <React.Fragment key={node.id}>
                          <div className="px-2.5 py-1.5 bg-[#171A26] border border-[#24293C] rounded-md text-white font-medium">
                            {node.label}
                          </div>
                          {i < wf.nodes.length - 1 && <Icons.ArrowRight className="w-3.5 h-3.5 text-slate-500" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ASSETS TAB */}
          {activeTab === 'assets' && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Media Library
              </span>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
                  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80',
                  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
                  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80',
                  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
                ].map((url, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      showToast('Copied image URL to clipboard!');
                    }}
                    className="group relative h-24 rounded-lg overflow-hidden border border-[#23293D] hover:border-indigo-500 cursor-pointer transition-all"
                  >
                    <img src={url} alt={`Asset ${i}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-medium text-[11px]">
                      Copy URL
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="max-w-xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <Icons.Sparkles className="w-4 h-4" />
                <span>AI Application Generator</span>
              </div>
              <p className="text-slate-400 text-xs">
                Describe the pages, components, or styles you want to generate. AI will construct and mutate the
                project AST directly.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 'Add a Pricing page with 3 tiers' or 'Make theme dark neon'..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                  className="flex-1 bg-[#141722] border border-[#23293D] rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={isAiGenerating}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-md transition-all"
                >
                  {isAiGenerating ? (
                    <Icons.Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icons.Wand2 className="w-4 h-4" />
                  )}
                  <span>Generate</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </footer>
  );
};
