'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Variable, VariableType } from '@/builder/schema/project';
import {
  Braces,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

const SUPPORTED_VARIABLE_TYPES: VariableType[] = ['text', 'number', 'boolean', 'object', 'array'];

export const VariablesPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const addVariable = useBuilderStore((s) => s.addVariable);
  const updateVariable = useBuilderStore((s) => s.updateVariable);
  const deleteVariable = useBuilderStore((s) => s.deleteVariable);

  const variables = project.variables || [];

  const [isCreating, setIsCreating] = useState(false);
  const [varName, setVarName] = useState('');
  const [varType, setVarType] = useState<VariableType>('text');
  const [varDefault, setVarDefault] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<VariableType>('text');
  const [editDefault, setEditDefault] = useState('');

  // Delete confirmation warning modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [referencesWarningCount, setReferencesWarningCount] = useState<number>(0);

  const parseDefaultValue = (type: VariableType, raw: string): any => {
    if (type === 'number') {
      const num = Number(raw);
      return isNaN(num) ? 0 : num;
    }
    if (type === 'boolean') {
      return raw === 'true';
    }
    if (type === 'object' || type === 'array') {
      try {
        return JSON.parse(raw);
      } catch {
        return type === 'array' ? [] : {};
      }
    }
    return raw;
  };

  const handleCreate = () => {
    setErrorMessage(null);
    const trimmed = varName.trim();
    if (!trimmed) {
      setErrorMessage('Variable name cannot be empty');
      return;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      setErrorMessage('Name must start with a letter or _ and contain alphanumeric characters');
      return;
    }

    const newVar: Variable = {
      id: `var_${Date.now()}`,
      name: trimmed,
      type: varType,
      defaultValue: parseDefaultValue(varType, varDefault),
      scope: 'app',
    };

    const success = addVariable(newVar);
    if (!success) {
      setErrorMessage(`A variable named "${trimmed}" already exists`);
      return;
    }

    setVarName('');
    setVarDefault('');
    setIsCreating(false);
  };

  const handleUpdate = (varId: string) => {
    setErrorMessage(null);
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMessage('Variable name cannot be empty');
      return;
    }

    const success = updateVariable(varId, {
      name: trimmed,
      type: editType,
      defaultValue: parseDefaultValue(editType, editDefault),
    });

    if (!success) {
      setErrorMessage(`A variable named "${trimmed}" already exists`);
      return;
    }

    setEditingId(null);
  };

  const handleDeleteClick = (varId: string) => {
    const res = deleteVariable(varId, false);
    if (!res.success && res.referencesCount && res.referencesCount > 0) {
      setConfirmDeleteId(varId);
      setReferencesWarningCount(res.referencesCount);
    }
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteVariable(confirmDeleteId, true);
      setConfirmDeleteId(null);
      setReferencesWarningCount(0);
    }
  };

  return (
    <div
      data-testid="builder-variables"
      className="w-80 bg-[#0D0F17] border-r border-[#1B1E2B] flex flex-col h-full text-slate-300 select-none text-xs"
    >
      {/* Header */}
      <div className="p-3 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Braces className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-white">Variables</span>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setErrorMessage(null);
          }}
          className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Variable</span>
        </button>
      </div>

      {/* Warning confirmation modal */}
      {confirmDeleteId && (
        <div className="m-3 p-3 bg-red-500/10 border border-red-500/40 rounded flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Referenced Variable</span>
          </div>
          <p className="text-[11px] text-slate-300">
            This variable is currently referenced in{' '}
            <strong className="text-white">{referencesWarningCount}</strong> binding(s) or logic
            rule(s). Deleting it may break application runtime.
          </p>
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-2.5 py-1 rounded bg-[#141724] text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
            >
              Delete Anyway
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Variable Form */}
      {isCreating && (
        <div
          data-testid="variable-editor"
          className="m-3 p-3 bg-[#141724] border border-violet-500/40 rounded flex flex-col gap-2"
        >
          <div className="font-semibold text-white text-xs">Create Variable</div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Name</label>
            <input
              type="text"
              placeholder="e.g. counter, currentUser"
              value={varName}
              onChange={(e) => setVarName(e.target.value)}
              className="bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white text-xs outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Type</label>
            <select
              value={varType}
              onChange={(e) => setVarType(e.target.value as VariableType)}
              className="bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white text-xs outline-none"
            >
              {SUPPORTED_VARIABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Default Value</label>
            <input
              type="text"
              placeholder={varType === 'boolean' ? 'true / false' : 'Default value...'}
              value={varDefault}
              onChange={(e) => setVarDefault(e.target.value)}
              className="bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white text-xs outline-none"
            />
          </div>

          {errorMessage && (
            <div className="text-[11px] text-red-400 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => {
                setIsCreating(false);
                setErrorMessage(null);
              }}
              className="px-2 py-1 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded font-medium"
            >
              Save Variable
            </button>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div data-testid="variable-list" className="p-3 flex-1 flex flex-col gap-1.5 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No variables configured. Click &quot;New Variable&quot; to create one.
          </div>
        ) : (
          variables.map((v) => (
            <div
              key={v.id}
              className="p-2.5 bg-[#141724]/40 border border-[#1B1E2B] rounded flex flex-col gap-1.5 hover:border-[#262B3D]"
            >
              {editingId === v.id ? (
                <div data-testid="variable-editor" className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-[#090B10] border border-[#262B3D] rounded px-2 py-0.5 text-white text-xs outline-none"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as VariableType)}
                      className="bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-0.5 text-white text-xs outline-none"
                    >
                      {SUPPORTED_VARIABLE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Default value..."
                    value={editDefault}
                    onChange={(e) => setEditDefault(e.target.value)}
                    className="bg-[#090B10] border border-[#262B3D] rounded px-2 py-0.5 text-white text-xs outline-none"
                  />
                  {errorMessage && (
                    <span className="text-[10px] text-red-400">{errorMessage}</span>
                  )}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(v.id)}
                      className="px-2.5 py-0.5 bg-violet-600 text-white rounded font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="truncate flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-white">{v.name}</span>
                      <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1 py-0.2 rounded font-mono">
                        {v.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      default: {JSON.stringify(v.defaultValue)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(v.id);
                        setEditName(v.name);
                        setEditType(v.type);
                        setEditDefault(
                          typeof v.defaultValue === 'object'
                            ? JSON.stringify(v.defaultValue)
                            : String(v.defaultValue ?? '')
                        );
                        setErrorMessage(null);
                      }}
                      className="p-1 hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(v.id)}
                      className="p-1 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
