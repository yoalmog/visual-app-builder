'use client';

import React, { useState } from 'react';
import { ComponentNode, ComponentInteraction, ComponentAction } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';
import { MousePointerClick, Plus, Trash2, ArrowRight, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface InteractionsSectionProps {
  node: ComponentNode;
}

export const InteractionsSection: React.FC<InteractionsSectionProps> = ({ node }) => {
  const project = useBuilderStore((s) => s.project);
  const addNodeInteraction = useBuilderStore((s) => s.addNodeInteraction);
  const updateNodeInteraction = useBuilderStore((s) => s.updateNodeInteraction);
  const removeNodeInteraction = useBuilderStore((s) => s.removeNodeInteraction);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<'click' | 'double_click' | 'hover'>('click');
  const [actionType, setActionType] = useState<ComponentAction['type']>('navigate');
  const [targetPageId, setTargetPageId] = useState<string>(project.pages[0]?.id || '');
  const [url, setUrl] = useState<string>('https://');
  const [urlTarget, setUrlTarget] = useState<'_blank' | '_self'>('_blank');
  const [targetNodeId, setTargetNodeId] = useState<string>('');

  const interactions = node.interactions || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    let action: ComponentAction;
    switch (actionType) {
      case 'navigate':
        action = { type: 'navigate', targetPageId, pageId: targetPageId };
        break;
      case 'open_url':
        action = { type: 'open_url', url, target: urlTarget };
        break;
      case 'show_element':
        action = { type: 'show_element', targetNodeId: targetNodeId.trim() };
        break;
      case 'hide_element':
        action = { type: 'hide_element', targetNodeId: targetNodeId.trim() };
        break;
      case 'toggle_element':
        action = { type: 'toggle_element', targetNodeId: targetNodeId.trim() };
        break;
      case 'scroll_to':
        action = { type: 'scroll_to', targetNodeId: targetNodeId.trim() };
        break;
    }

    const newInteraction: ComponentInteraction = {
      id: `inter_${Date.now()}`,
      event: selectedEvent,
      actions: [action],
    };

    addNodeInteraction(node.id, newInteraction);
    setIsAdding(false);
  };

  return (
    <div data-testid="interaction-panel" className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
          <MousePointerClick className="w-3.5 h-3.5 text-indigo-400" />
          <span>Interactions ({interactions.length})</span>
        </div>

        <button
          data-testid="add-interaction-btn"
          onClick={() => setIsAdding(!isAdding)}
          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-3 bg-[#121522] border border-indigo-500/40 rounded-lg space-y-2.5 animate-in fade-in duration-100"
        >
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Trigger Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value as any)}
              className="w-full bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white outline-none"
            >
              <option value="click">On Click</option>
              <option value="double_click">On Double Click</option>
              <option value="hover">On Hover</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Action</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              className="w-full bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white outline-none"
            >
              <option value="navigate">Navigate to Page</option>
              <option value="open_url">Open URL</option>
              <option value="show_element">Show Element</option>
              <option value="hide_element">Hide Element</option>
              <option value="toggle_element">Toggle Element</option>
              <option value="scroll_to">Scroll to Element</option>
            </select>
          </div>

          {actionType === 'navigate' && (
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Destination Page</label>
              <select
                value={targetPageId}
                onChange={(e) => setTargetPageId(e.target.value)}
                className="w-full bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white outline-none"
              >
                {project.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'open_url' && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">URL</label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white outline-none font-mono"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="urlTarget"
                    checked={urlTarget === '_blank'}
                    onChange={() => setUrlTarget('_blank')}
                  />
                  <span>New Tab</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="urlTarget"
                    checked={urlTarget === '_self'}
                    onChange={() => setUrlTarget('_self')}
                  />
                  <span>Same Tab</span>
                </label>
              </div>
            </div>
          )}

          {['show_element', 'hide_element', 'toggle_element', 'scroll_to'].includes(actionType) && (
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target Element ID</label>
              <input
                type="text"
                required
                placeholder="e.g. text_123 or container_abc"
                value={targetNodeId}
                onChange={(e) => setTargetNodeId(e.target.value)}
                className="w-full bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white outline-none font-mono"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 py-1 bg-[#171B28] hover:bg-[#202538] text-slate-400 text-xs rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Existing interactions list */}
      <div className="space-y-1.5">
        {interactions.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">
            No interactions defined.
          </div>
        ) : (
          interactions.map((inter, idx) => (
            <div
              key={inter.id || idx}
              data-testid={`interaction-item-${idx}`}
              className="p-2.5 bg-[#111420] border border-[#1E2436] rounded-lg flex items-center justify-between group text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="capitalize font-semibold text-indigo-300">
                  {inter.event.replace('_', ' ')}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                <div className="min-w-0">
                  {inter.actions.map((act, aIdx) => (
                    <span key={aIdx} className="text-slate-300 truncate block">
                      {act.type === 'navigate' && `Navigate to "${project.pages.find((p) => p.id === (act.targetPageId || act.pageId))?.name || act.targetPageId || act.pageId}"`}
                      {act.type === 'open_url' && `Open ${act.url}`}
                      {act.type === 'show_element' && `Show #${act.targetNodeId}`}
                      {act.type === 'hide_element' && `Hide #${act.targetNodeId}`}
                      {act.type === 'toggle_element' && `Toggle #${act.targetNodeId}`}
                      {act.type === 'scroll_to' && `Scroll to #${act.targetNodeId}`}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => removeNodeInteraction(node.id, idx)}
                className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Interaction"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
