'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { WorkflowDefinition, WorkflowNode } from '@/builder/schema/workflow';
import { GitFork, Plus, Play, Trash2, Clock, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { WorkflowEngine } from '@/builder/workflows/workflow-engine';

export const WorkflowPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const setProject = useBuilderStore((s) => s.setProject);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    project.workflows && project.workflows.length > 0 ? project.workflows[0].id : null
  );
  const [testOutput, setTestOutput] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const workflows: WorkflowDefinition[] = project.workflows || [];
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  const handleCreateWorkflow = () => {
    const newWf: WorkflowDefinition = {
      id: `wf_${Date.now()}`,
      name: `Workflow ${workflows.length + 1}`,
      description: 'Automated workflow pipeline',
      version: 1,
      triggerType: 'manual',
      nodes: [
        {
          id: `node_start_${Date.now()}`,
          type: 'trigger',
          name: 'Manual Trigger',
        },
      ],
    };

    const updated = {
      ...project,
      workflows: [...workflows, newWf],
    };
    setProject(updated);
    setSelectedWorkflowId(newWf.id);
  };

  const handleDeleteWorkflow = (wfId: string) => {
    const updated = {
      ...project,
      workflows: workflows.filter((w) => w.id !== wfId),
    };
    setProject(updated);
    if (selectedWorkflowId === wfId) {
      setSelectedWorkflowId(updated.workflows.length > 0 ? updated.workflows[0].id : null);
    }
  };

  const handleAddNode = (type: any, name: string) => {
    if (!selectedWorkflow) return;
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      name,
      config: {},
    };

    const updatedWf = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode],
    };

    setProject({
      ...project,
      workflows: workflows.map((w) => (w.id === selectedWorkflow.id ? updatedWf : w)),
    });
  };

  const handleTestExecute = async () => {
    if (!selectedWorkflow) return;
    setIsExecuting(true);
    setTestOutput(null);

    try {
      const engine = new WorkflowEngine([selectedWorkflow]);
      const result = await engine.executeWorkflow(selectedWorkflow.id, { testInput: 'demo' });
      setTestOutput(result);
    } catch (err: any) {
      setTestOutput({ status: 'failed', error: err?.message || 'Execution failed' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div data-testid="workflow-panel" className="w-80 h-full bg-[#0D111A] border-r border-[#1B1E2B] flex flex-col select-none text-slate-200">
      {/* Header */}
      <div className="p-3 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Workflows</h2>
        </div>
        <button
          onClick={handleCreateWorkflow}
          className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Workflows List */}
      <div className="p-2 border-b border-[#1B1E2B] flex flex-col gap-1 max-h-40 overflow-y-auto">
        {workflows.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">No workflows yet</div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => setSelectedWorkflowId(wf.id)}
              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs ${
                selectedWorkflowId === wf.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'hover:bg-[#141724] text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{wf.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkflow(wf.id);
                }}
                className="text-slate-500 hover:text-red-400 p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Selected Workflow Editor */}
      {selectedWorkflow ? (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Nodes ({selectedWorkflow.nodes.length})</span>
            <button
              onClick={handleTestExecute}
              disabled={isExecuting}
              className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isExecuting ? 'Running...' : 'Run Test'}</span>
            </button>
          </div>

          {/* Quick Node Add buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleAddNode('action', 'Action Step')}
              className="text-[10px] bg-[#141824] hover:bg-[#1C2234] border border-[#23293D] rounded py-1 px-2 text-left text-slate-300"
            >
              + Action
            </button>
            <button
              onClick={() => handleAddNode('condition', 'Condition Branch')}
              className="text-[10px] bg-[#141824] hover:bg-[#1C2234] border border-[#23293D] rounded py-1 px-2 text-left text-slate-300"
            >
              + Condition
            </button>
            <button
              onClick={() => handleAddNode('loop', 'Loop Items')}
              className="text-[10px] bg-[#141824] hover:bg-[#1C2234] border border-[#23293D] rounded py-1 px-2 text-left text-slate-300"
            >
              + Loop
            </button>
            <button
              onClick={() => handleAddNode('delay', 'Delay Timer')}
              className="text-[10px] bg-[#141824] hover:bg-[#1C2234] border border-[#23293D] rounded py-1 px-2 text-left text-slate-300"
            >
              + Delay
            </button>
          </div>

          {/* Node Pipeline Steps */}
          <div className="flex flex-col gap-2">
            {selectedWorkflow.nodes.map((node, idx) => (
              <div
                key={node.id}
                className="bg-[#121622] border border-[#1E2333] rounded p-2 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] flex items-center justify-center text-slate-400">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-slate-200">{node.name || node.type}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{node.type}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Test Execution Output */}
          {testOutput && (
            <div className="mt-auto border-t border-[#1B1E2B] pt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                {testOutput.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={testOutput.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                  Execution {testOutput.status}
                </span>
              </div>
              <pre className="text-[10px] font-mono bg-black/40 p-2 rounded text-slate-300 overflow-x-auto max-h-32">
                {JSON.stringify(testOutput, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Select a workflow to configure</div>
      )}
    </div>
  );
};
