'use client';

import React, { useState } from 'react';
import { ComponentNode, ComponentBinding, LogicRule, ActionDefinition, Condition, ConditionOperator, ActionType } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';
import { evaluateExpression } from '@/builder/expressions/expression-evaluator';
import {
  Zap,
  Plus,
  Trash2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Eye,
  Sliders,
  Database,
  Braces,
} from 'lucide-react';

interface LogicInspectorSectionProps {
  node: ComponentNode;
}

const EVENT_OPTIONS: Array<{ value: LogicRule['event']; label: string }> = [
  { value: 'click', label: 'On Click' },
  { value: 'submit', label: 'On Submit' },
  { value: 'change', label: 'On Change' },
  { value: 'page_load', label: 'On Page Load' },
  { value: 'page_enter', label: 'On Page Enter' },
];

const CONDITION_OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'greater_equal', label: 'Greater or Equal (>=)' },
  { value: 'less_equal', label: 'Less or Equal (<=)' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'is_true', label: 'Is True' },
  { value: 'is_false', label: 'Is False' },
];

const ACTION_TYPES: Array<{ value: ActionType; label: string }> = [
  { value: 'set_variable', label: 'Set Variable' },
  { value: 'navigate', label: 'Navigate to Page' },
  { value: 'open_url', label: 'Open URL' },
  { value: 'show_element', label: 'Show Element' },
  { value: 'hide_element', label: 'Hide Element' },
  { value: 'toggle_element', label: 'Toggle Element' },
  { value: 'create_record', label: 'Create Record' },
  { value: 'update_record', label: 'Update Record' },
  { value: 'delete_record', label: 'Delete Record' },
  { value: 'submit_form', label: 'Submit Form' },
  { value: 'reset_form', label: 'Reset Form' },
  { value: 'delay', label: 'Delay (Wait)' },
];

export const LogicInspectorSection: React.FC<LogicInspectorSectionProps> = ({ node }) => {
  const project = useBuilderStore((s) => s.project);
  const setNodeBinding = useBuilderStore((s) => s.setNodeBinding);
  const removeNodeBinding = useBuilderStore((s) => s.removeNodeBinding);
  const addNodeLogicRule = useBuilderStore((s) => s.addNodeLogicRule);
  const updateNodeLogicRule = useBuilderStore((s) => s.updateNodeLogicRule);
  const removeNodeLogicRule = useBuilderStore((s) => s.removeNodeLogicRule);
  const setNodeConditionalVisibility = useBuilderStore((s) => s.setNodeConditionalVisibility);

  const variables = project.variables || [];
  const collections = project.collections || [];
  const pages = project.pages || [];

  // Bindable properties based on node type
  const getBindableProps = () => {
    const list: Array<{ path: string; label: string }> = [];
    if (['text', 'heading', 'paragraph', 'button', 'link'].includes(node.type)) {
      list.push({ path: 'props.text', label: 'Text Content' });
    }
    if (node.type === 'button') {
      list.push({ path: 'props.disabled', label: 'Disabled' });
    }
    if (['input', 'textarea'].includes(node.type)) {
      list.push({ path: 'props.value', label: 'Value' });
      list.push({ path: 'props.placeholder', label: 'Placeholder' });
    }
    if (node.type === 'image') {
      list.push({ path: 'props.src', label: 'Image URL (src)' });
      list.push({ path: 'props.alt', label: 'Alt Text' });
    }
    if (node.type === 'link') {
      list.push({ path: 'props.href', label: 'Link URL (href)' });
    }
    return list;
  };

  const bindableProps = getBindableProps();
  const bindings = node.bindings || {};

  // Testing eval context
  const sampleEvalCtx = {
    ...variables.reduce((acc, v) => ({ ...acc, [v.name]: v.defaultValue }), {}),
  };

  return (
    <div data-testid="builder-logic" className="flex flex-col gap-4 p-3 text-xs text-slate-300">
      {/* 1. DYNAMIC DATA BINDINGS */}
      <div data-testid="binding-editor" className="flex flex-col gap-2 bg-[#12141F] p-3 rounded-lg border border-[#1E2330]">
        <div className="flex items-center gap-2 font-semibold text-white">
          <Zap className="w-4 h-4 text-violet-400" />
          <span>Data Bindings</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Bind component properties to variables, calculations, or collection fields.
        </p>

        {bindableProps.length === 0 ? (
          <div className="text-slate-500 py-2 text-center text-[11px]">
            No dynamic bindable properties for this component type.
          </div>
        ) : (
          bindableProps.map(({ path, label }) => {
            const currentBinding = bindings[path];
            const isBound = Boolean(currentBinding && currentBinding.expression);
            const evalResult = isBound ? evaluateExpression(currentBinding.expression, sampleEvalCtx) : null;

            return (
              <div key={path} className="flex flex-col gap-1.5 p-2 bg-[#090B10] rounded border border-[#1E2330]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{label}</span>
                  <div className="flex items-center gap-1 bg-[#141724] p-0.5 rounded border border-[#262B3D]">
                    <button
                      onClick={() => {
                        if (isBound) removeNodeBinding(node.id, path);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        !isBound ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Static
                    </button>
                    <button
                      onClick={() => {
                        if (!isBound) {
                          setNodeBinding(node.id, path, {
                            property: path,
                            type: 'expression',
                            expression: '{{}}',
                          });
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        isBound ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Dynamic
                    </button>
                  </div>
                </div>

                {isBound && (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="{{expression}}"
                        value={currentBinding.expression}
                        onChange={(e) =>
                          setNodeBinding(node.id, path, {
                            property: path,
                            type: 'expression',
                            expression: e.target.value,
                          })
                        }
                        className={`flex-1 bg-[#141724] border ${
                          evalResult && !evalResult.success ? 'border-red-500' : 'border-[#262B3D]'
                        } rounded px-2 py-1 text-white font-mono text-xs outline-none focus:border-violet-500`}
                      />
                      <button
                        onClick={() => removeNodeBinding(node.id, path)}
                        className="p-1 hover:text-red-400 text-slate-400"
                        title="Remove Binding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {evalResult && !evalResult.success && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {evalResult.error || 'Invalid expression'}
                      </span>
                    )}

                    {evalResult && evalResult.success && (
                      <span className="text-[10px] text-emerald-400 font-mono truncate">
                        Preview: {JSON.stringify(evalResult.value)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 2. CONDITIONAL VISIBILITY */}
      <div className="flex flex-col gap-2 bg-[#12141F] p-3 rounded-lg border border-[#1E2330]">
        <div className="flex items-center justify-between font-semibold text-white">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Conditional Visibility</span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(node.conditionalVisibility?.expression)}
            onChange={(e) => {
              if (e.target.checked) {
                setNodeConditionalVisibility(node.id, { expression: '{{true}}' });
              } else {
                setNodeConditionalVisibility(node.id, undefined);
              }
            }}
            className="rounded border-[#262B3D]"
          />
        </div>

        {node.conditionalVisibility?.expression && (
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[11px] text-slate-400">
              Visible when expression evaluates to true:
            </label>
            <input
              type="text"
              placeholder="{{isLoggedIn}} or {{cart.length > 0}}"
              value={node.conditionalVisibility.expression}
              onChange={(e) =>
                setNodeConditionalVisibility(node.id, { expression: e.target.value })
              }
              className="w-full bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white font-mono text-xs outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* 3. LOGIC RULES & ACTIONS */}
      <div data-testid="logic-editor" className="flex flex-col gap-3 bg-[#12141F] p-3 rounded-lg border border-[#1E2330]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Logic Rules ({node.logicRules?.length || 0})</span>
          </div>
          <button
            onClick={() => {
              const newRule: LogicRule = {
                id: `rule_${Date.now()}`,
                event: 'click',
                conditionGroup: {
                  type: 'all',
                  conditions: [],
                },
                actions: [],
              };
              addNodeLogicRule(node.id, newRule);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>

        {(node.logicRules || []).map((rule, ruleIdx) => (
          <div
            key={rule.id || ruleIdx}
            className="p-3 bg-[#090B10] rounded-lg border border-[#1E2330] flex flex-col gap-3"
          >
            {/* Rule Header: Event Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">When:</span>
                <select
                  value={rule.event}
                  onChange={(e) =>
                    updateNodeLogicRule(node.id, ruleIdx, {
                      ...rule,
                      event: e.target.value as any,
                    })
                  }
                  className="bg-[#141724] border border-[#262B3D] rounded px-2 py-1 text-white font-medium outline-none"
                >
                  {EVENT_OPTIONS.map((ev) => (
                    <option key={ev.value} value={ev.value}>
                      {ev.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => removeNodeLogicRule(node.id, ruleIdx)}
                className="p-1 hover:text-red-400 text-slate-400"
                title="Delete Rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Conditions Editor */}
            <div data-testid="condition-editor" className="flex flex-col gap-2 p-2 bg-[#141724]/40 rounded border border-[#1E2330]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">If</span>
                  <select
                    value={rule.conditionGroup?.type || 'all'}
                    onChange={(e) =>
                      updateNodeLogicRule(node.id, ruleIdx, {
                        ...rule,
                        conditionGroup: {
                          type: e.target.value as 'all' | 'any',
                          conditions: rule.conditionGroup?.conditions || [],
                        },
                      })
                    }
                    className="bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-0.5 text-[11px] text-white outline-none"
                  >
                    <option value="all">ALL conditions match (AND)</option>
                    <option value="any">ANY condition matches (OR)</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    const newCond: Condition = {
                      id: `cond_${Date.now()}`,
                      left: '',
                      operator: 'equals',
                      right: '',
                    };
                    const updated = [...(rule.conditionGroup?.conditions || []), newCond];
                    updateNodeLogicRule(node.id, ruleIdx, {
                      ...rule,
                      conditionGroup: {
                        type: rule.conditionGroup?.type || 'all',
                        conditions: updated,
                      },
                    });
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Condition</span>
                </button>
              </div>

              {(rule.conditionGroup?.conditions || []).map((cond, condIdx) => (
                <div key={cond.id || condIdx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="field or {{val}}"
                    value={cond.left}
                    onChange={(e) => {
                      const copy = [...(rule.conditionGroup?.conditions || [])];
                      copy[condIdx] = { ...copy[condIdx], left: e.target.value };
                      updateNodeLogicRule(node.id, ruleIdx, {
                        ...rule,
                        conditionGroup: {
                          type: rule.conditionGroup?.type || 'all',
                          conditions: copy,
                        },
                      });
                    }}
                    className="w-1/3 bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                  />
                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const copy = [...(rule.conditionGroup?.conditions || [])];
                      copy[condIdx] = { ...copy[condIdx], operator: e.target.value as ConditionOperator };
                      updateNodeLogicRule(node.id, ruleIdx, {
                        ...rule,
                        conditionGroup: {
                          type: rule.conditionGroup?.type || 'all',
                          conditions: copy,
                        },
                      });
                    }}
                    className="flex-1 bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  {!['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(cond.operator) && (
                    <input
                      type="text"
                      placeholder="target value"
                      value={cond.right ?? ''}
                      onChange={(e) => {
                        const copy = [...(rule.conditionGroup?.conditions || [])];
                        copy[condIdx] = { ...copy[condIdx], right: e.target.value };
                        updateNodeLogicRule(node.id, ruleIdx, {
                          ...rule,
                          conditionGroup: {
                            type: rule.conditionGroup?.type || 'all',
                            conditions: copy,
                          },
                        });
                      }}
                      className="w-1/3 bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                    />
                  )}
                  <button
                    onClick={() => {
                      const copy = (rule.conditionGroup?.conditions || []).filter((_, i) => i !== condIdx);
                      updateNodeLogicRule(node.id, ruleIdx, {
                        ...rule,
                        conditionGroup: {
                          type: rule.conditionGroup?.type || 'all',
                          conditions: copy,
                        },
                      });
                    }}
                    className="p-1 hover:text-red-400 text-slate-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions Editor */}
            <div data-testid="action-editor" className="flex flex-col gap-2 p-2 bg-[#141724]/40 rounded border border-[#1E2330]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Then Actions ({rule.actions.length})
                </span>
                <button
                  onClick={() => {
                    const newAct: ActionDefinition = {
                      id: `act_${Date.now()}`,
                      type: 'set_variable',
                      variableName: variables[0]?.name || '',
                      valueExpression: '',
                    };
                    updateNodeLogicRule(node.id, ruleIdx, {
                      ...rule,
                      actions: [...rule.actions, newAct],
                    });
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Action</span>
                </button>
              </div>

              {rule.actions.map((act, actIdx) => (
                <div
                  key={act.id || actIdx}
                  className="p-2 bg-[#090B10] rounded border border-[#1E2330] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-500">{actIdx + 1}.</span>
                      <select
                        value={act.type}
                        onChange={(e) => {
                          const copy = [...rule.actions];
                          copy[actIdx] = { ...copy[actIdx], type: e.target.value as ActionType };
                          updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                        }}
                        className="bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      >
                        {ACTION_TYPES.map((at) => (
                          <option key={at.value} value={at.value}>
                            {at.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      {actIdx > 0 && (
                        <button
                          onClick={() => {
                            const copy = [...rule.actions];
                            const temp = copy[actIdx - 1];
                            copy[actIdx - 1] = copy[actIdx];
                            copy[actIdx] = temp;
                            updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                          }}
                          className="p-0.5 hover:text-white text-slate-500"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {actIdx < rule.actions.length - 1 && (
                        <button
                          onClick={() => {
                            const copy = [...rule.actions];
                            const temp = copy[actIdx + 1];
                            copy[actIdx + 1] = copy[actIdx];
                            copy[actIdx] = temp;
                            updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                          }}
                          className="p-0.5 hover:text-white text-slate-500"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const copy = rule.actions.filter((_, i) => i !== actIdx);
                          updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                        }}
                        className="p-0.5 hover:text-red-400 text-slate-500"
                        title="Delete Action"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Action Specific Fields */}
                  {act.type === 'set_variable' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <select
                        value={act.variableName || ''}
                        onChange={(e) => {
                          const copy = [...rule.actions];
                          copy[actIdx] = { ...copy[actIdx], variableName: e.target.value };
                          updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                        }}
                        className="flex-1 bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      >
                        <option value="">Select variable...</option>
                        {variables.map((v) => (
                          <option key={v.id} value={v.name}>
                            {v.name} ({v.type})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Value expression"
                        value={act.valueExpression || ''}
                        onChange={(e) => {
                          const copy = [...rule.actions];
                          copy[actIdx] = { ...copy[actIdx], valueExpression: e.target.value };
                          updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                        }}
                        className="flex-1 bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      />
                    </div>
                  )}

                  {act.type === 'navigate' && (
                    <select
                      value={act.targetPageId || ''}
                      onChange={(e) => {
                        const copy = [...rule.actions];
                        copy[actIdx] = { ...copy[actIdx], targetPageId: e.target.value };
                        updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                      }}
                      className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none mt-1"
                    >
                      <option value="">Select target page...</option>
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.slug})
                        </option>
                      ))}
                    </select>
                  )}

                  {act.type === 'open_url' && (
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={act.url || ''}
                      onChange={(e) => {
                        const copy = [...rule.actions];
                        copy[actIdx] = { ...copy[actIdx], url: e.target.value };
                        updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                      }}
                      className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none mt-1"
                    />
                  )}

                  {['show_element', 'hide_element', 'toggle_element'].includes(act.type) && (
                    <input
                      type="text"
                      placeholder="Target Element ID"
                      value={act.targetNodeId || ''}
                      onChange={(e) => {
                        const copy = [...rule.actions];
                        copy[actIdx] = { ...copy[actIdx], targetNodeId: e.target.value };
                        updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                      }}
                      className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none mt-1"
                    />
                  )}

                  {['create_record', 'update_record', 'delete_record'].includes(act.type) && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <select
                        value={act.collectionId || ''}
                        onChange={(e) => {
                          const copy = [...rule.actions];
                          copy[actIdx] = { ...copy[actIdx], collectionId: e.target.value };
                          updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                        }}
                        className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      >
                        <option value="">Select collection...</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {act.type !== 'create_record' && (
                        <input
                          type="text"
                          placeholder="Record ID"
                          value={act.recordId || ''}
                          onChange={(e) => {
                            const copy = [...rule.actions];
                            copy[actIdx] = { ...copy[actIdx], recordId: e.target.value };
                            updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                          }}
                          className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                        />
                      )}
                    </div>
                  )}

                  {act.type === 'delay' && (
                    <input
                      type="number"
                      placeholder="Delay ms (e.g. 500)"
                      value={act.delayMs ?? 100}
                      onChange={(e) => {
                        const copy = [...rule.actions];
                        copy[actIdx] = { ...copy[actIdx], delayMs: Number(e.target.value) };
                        updateNodeLogicRule(node.id, ruleIdx, { ...rule, actions: copy });
                      }}
                      className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-[11px] outline-none mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
