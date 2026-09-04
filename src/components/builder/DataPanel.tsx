'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { DataCollection, DataField, DataFieldType, DataRecord } from '@/builder/schema/project';
import { ApiConnector, HttpMethod, CollectionDataSourceMode, RlsPolicyType } from '@/builder/schema/cloud';
import { createDataProvider } from '@/builder/providers/data-provider';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  Search,
  AlertCircle,
  Table,
  PlusCircle,
  Cloud,
  Globe,
  Send,
  RefreshCw,
  Key,
  Shield,
  Loader2,
} from 'lucide-react';

const SUPPORTED_FIELD_TYPES: DataFieldType[] = [
  'text',
  'number',
  'boolean',
  'date',
  'email',
  'url',
  'image',
  'select',
  'JSON',
];

export const DataPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const addCollection = useBuilderStore((s) => s.addCollection);
  const updateCollection = useBuilderStore((s) => s.updateCollection);
  const deleteCollection = useBuilderStore((s) => s.deleteCollection);
  const duplicateCollection = useBuilderStore((s) => s.duplicateCollection);
  const addField = useBuilderStore((s) => s.addField);
  const updateField = useBuilderStore((s) => s.updateField);
  const deleteField = useBuilderStore((s) => s.deleteField);
  const addRecord = useBuilderStore((s) => s.addRecord);
  const updateRecord = useBuilderStore((s) => s.updateRecord);
  const deleteRecord = useBuilderStore((s) => s.deleteRecord);

  // Phase 5 Store Methods
  const addApiConnector = useBuilderStore((s) => s.addApiConnector);
  const updateApiConnector = useBuilderStore((s) => s.updateApiConnector);
  const deleteApiConnector = useBuilderStore((s) => s.deleteApiConnector);
  const updateCloudConfig = useBuilderStore((s) => s.updateCloudConfig);

  // Sub-tabs: 'collections' | 'cloud' | 'api'
  const [dataTab, setDataTab] = useState<'collections' | 'cloud' | 'api'>('collections');

  const collections = project.collections || [];
  const apiConnectors = project.apiConnectors || [];
  const cloudConfig = project.cloudConfig || {
    provider: 'mock',
    projectUrl: '',
    anonKey: '',
    status: 'disconnected',
  };

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    collections[0]?.id || ''
  );
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // New field state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<DataFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldDefault, setNewFieldDefault] = useState('');

  // Editing field state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<DataFieldType>('text');

  // Record modal / new record state
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordDraftValues, setRecordDraftValues] = useState<Record<string, any>>({});
  const [recordErrors, setRecordErrors] = useState<Record<string, string>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // API Connector state
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>(apiConnectors[0]?.id || '');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [isTestingCloud, setIsTestingCloud] = useState(false);

  const activeCollection = collections.find((c) => c.id === selectedCollectionId) || collections[0];
  const activeConnector = apiConnectors.find((c) => c.id === selectedConnectorId) || apiConnectors[0];

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    const newId = `col_${Date.now()}`;
    const newCol: DataCollection = {
      id: newId,
      name: newCollectionName.trim(),
      dataSource: 'local',
      rlsPolicy: 'public',
      fields: [
        { id: `f_${Date.now()}_1`, name: 'id', type: 'text', required: true },
        { id: `f_${Date.now()}_2`, name: 'title', type: 'text', required: true },
      ],
      records: [],
    };
    addCollection(newCol);
    setSelectedCollectionId(newId);
    setNewCollectionName('');
  };

  const handleRenameCollection = (colId: string) => {
    if (!editingCollectionName.trim()) return;
    updateCollection(colId, { name: editingCollectionName.trim() });
    setEditingCollectionId(null);
  };

  const handleAddField = () => {
    if (!activeCollection || !newFieldName.trim()) return;
    const field: DataField = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      defaultValue: newFieldDefault || undefined,
    };
    addField(activeCollection.id, field);
    setIsAddingField(false);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldDefault('');
  };

  const handleSaveEditedField = () => {
    if (!activeCollection || !editingFieldId || !editFieldName.trim()) return;
    updateField(activeCollection.id, editingFieldId, {
      name: editFieldName.trim(),
      type: editFieldType,
    });
    setEditingFieldId(null);
  };

  const handleValidateAndSaveRecord = () => {
    if (!activeCollection) return;
    const errors: Record<string, string> = {};

    activeCollection.fields.forEach((field) => {
      const val = recordDraftValues[field.name];
      if (field.required && (val === undefined || val === null || val === '')) {
        errors[field.name] = `${field.name} is required`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setRecordErrors(errors);
      return;
    }

    if (editingRecordId) {
      updateRecord(activeCollection.id, editingRecordId, recordDraftValues);
      setEditingRecordId(null);
    } else {
      const record: DataRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        values: { ...recordDraftValues },
      };
      addRecord(activeCollection.id, record);
      setIsAddingRecord(false);
    }

    setRecordDraftValues({});
    setRecordErrors({});
  };

  const handleCreateConnector = () => {
    const newId = `api_${Date.now()}`;
    const newConn: ApiConnector = {
      id: newId,
      name: 'New API Connector',
      baseUrl: 'https://api.example.com',
      method: 'GET',
      path: '/items',
      headers: { 'Content-Type': 'application/json' },
      queryParameters: {},
      retryCount: 1,
    };
    addApiConnector(newConn);
    setSelectedConnectorId(newId);
  };

  const handleTestApi = async () => {
    if (!activeConnector) return;
    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const res = await fetch('/api/connectors/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: activeConnector.id,
          method: activeConnector.method,
          path: activeConnector.path,
          headers: activeConnector.headers,
          queryParameters: activeConnector.queryParameters,
          body: activeConnector.body,
        }),
      });
      const data = await res.json();
      setApiTestResult({ status: res.status, ok: res.ok, data });
    } catch (err: any) {
      setApiTestResult({ status: 500, ok: false, error: err.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleTestCloudHealth = async () => {
    setIsTestingCloud(true);
    updateCloudConfig({ status: 'connecting' });
    try {
      const provider = createDataProvider(project);
      const isHealthy = provider.healthCheck ? await provider.healthCheck() : true;
      updateCloudConfig({
        status: isHealthy ? 'connected' : 'error',
        lastError: isHealthy ? undefined : 'Health check returned false',
      });
    } catch (err: any) {
      updateCloudConfig({
        status: 'error',
        lastError: err.message || 'Connection check failed',
      });
    } finally {
      setIsTestingCloud(false);
    }
  };

  const filteredRecords = (activeCollection?.records || []).filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(rec.values).some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div
      data-testid="builder-data"
      className="w-80 bg-[#0D0F17] border-r border-[#1B1E2B] flex flex-col h-full text-slate-300 select-none text-xs"
    >
      {/* Header with Sub-tabs */}
      <div className="p-3 border-b border-[#1B1E2B] space-y-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">Data & Integrations</span>
        </div>

        {/* Sub-tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-[#141724] p-0.5 rounded-lg border border-[#262B3D]">
          <button
            data-testid="data-subtab-collections"
            onClick={() => setDataTab('collections')}
            className={`py-1 rounded text-[11px] font-medium transition-colors ${
              dataTab === 'collections'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Collections
          </button>
          <button
            data-testid="data-subtab-cloud"
            onClick={() => setDataTab('cloud')}
            className={`py-1 rounded text-[11px] font-medium transition-colors ${
              dataTab === 'cloud'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cloud DB
          </button>
          <button
            data-testid="data-subtab-api"
            onClick={() => setDataTab('api')}
            className={`py-1 rounded text-[11px] font-medium transition-colors ${
              dataTab === 'api'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            APIs ({apiConnectors.length})
          </button>
        </div>
      </div>

      {/* 1. CLOUD BACKEND TAB */}
      {dataTab === 'cloud' && (
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="bg-[#121622] p-3 rounded-xl border border-[#222738] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Cloud Backend Config</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  cloudConfig.status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {cloudConfig.status || 'disconnected'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Backend Provider</span>
              <select
                value={cloudConfig.provider}
                onChange={(e) => updateCloudConfig({ provider: e.target.value as any })}
                className="w-full bg-[#090B10] border border-[#262B3D] rounded px-2.5 py-1 text-white text-xs"
              >
                <option value="mock">Mock Cloud Provider (Deterministic Local)</option>
                <option value="supabase">Supabase Cloud Database</option>
              </select>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Project Endpoint URL</span>
              <input
                type="text"
                placeholder="https://xyz.supabase.co"
                value={cloudConfig.projectUrl}
                onChange={(e) => updateCloudConfig({ projectUrl: e.target.value })}
                className="w-full bg-[#090B10] border border-[#262B3D] rounded px-2.5 py-1 text-white font-mono text-xs"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Anonymous Key</span>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={cloudConfig.anonKey}
                onChange={(e) => updateCloudConfig({ anonKey: e.target.value })}
                className="w-full bg-[#090B10] border border-[#262B3D] rounded px-2.5 py-1 text-white font-mono text-xs"
              />
            </div>

            <button
              onClick={handleTestCloudHealth}
              disabled={isTestingCloud}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingCloud ? 'animate-spin' : ''}`} />
              <span>{isTestingCloud ? 'Testing Connection...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. API CONNECTORS TAB */}
      {dataTab === 'api' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Connector List & Add */}
          <div className="p-3 border-b border-[#1B1E2B] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Configured APIs</span>
              <button
                onClick={handleCreateConnector}
                className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-1 text-[11px] px-2 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>New API</span>
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
              {apiConnectors.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-1 text-center">No connectors configured.</p>
              ) : (
                apiConnectors.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConnectorId(c.id)}
                    className={`p-2 rounded cursor-pointer flex items-center justify-between transition-colors ${
                      (activeConnector?.id === c.id)
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                        : 'hover:bg-[#141724] text-slate-400'
                    }`}
                  >
                    <div className="truncate flex-1 pr-1">
                      <span className="font-semibold text-white truncate block">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c.method} {c.path}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteApiConnector(c.id);
                      }}
                      className="p-1 hover:text-red-400 text-slate-500"
                      title="Delete connector"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Connector Settings */}
          {activeConnector ? (
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Connector Name</span>
                <input
                  type="text"
                  value={activeConnector.name}
                  onChange={(e) => updateApiConnector(activeConnector.id, { name: e.target.value })}
                  className="w-full bg-[#141724] border border-[#262B3D] rounded px-2 py-1 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Method</span>
                  <select
                    value={activeConnector.method}
                    onChange={(e) =>
                      updateApiConnector(activeConnector.id, { method: e.target.value as HttpMethod })
                    }
                    className="w-full bg-[#141724] border border-[#262B3D] rounded px-1.5 py-1 text-white font-mono"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400 block mb-1">Path</span>
                  <input
                    type="text"
                    value={activeConnector.path}
                    onChange={(e) => updateApiConnector(activeConnector.id, { path: e.target.value })}
                    className="w-full bg-[#141724] border border-[#262B3D] rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Base URL</span>
                <input
                  type="text"
                  value={activeConnector.baseUrl}
                  onChange={(e) => updateApiConnector(activeConnector.id, { baseUrl: e.target.value })}
                  className="w-full bg-[#141724] border border-[#262B3D] rounded px-2 py-1 text-white font-mono"
                />
              </div>

              <button
                data-testid="btn-test-api-connector"
                onClick={handleTestApi}
                disabled={isTestingApi}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isTestingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Test Request</span>
              </button>

              {/* API Test Result Preview */}
              {apiTestResult && (
                <div className="bg-[#0A0D14] p-2.5 rounded border border-[#1A1F2E] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>Status:</span>
                    <span className={apiTestResult.ok ? 'text-emerald-400' : 'text-red-400'}>
                      {apiTestResult.status}
                    </span>
                  </div>
                  <pre className="text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(apiTestResult.data || apiTestResult.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500 italic">Select or create an API connector.</div>
          )}
        </div>
      )}

      {/* 3. COLLECTIONS TAB (Phase 4 Intact + Phase 5 DataSource & RLS Extension) */}
      {dataTab === 'collections' && (
        <>
          {/* Collection List */}
          <div data-testid="data-collection-list" className="p-3 border-b border-[#1B1E2B] flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="New collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="flex-1 bg-[#141724] border border-[#262B3D] rounded px-2.5 py-1 text-white text-xs outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
                title="Create Collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    (activeCollection?.id === col.id)
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'hover:bg-[#141724] text-slate-400'
                  }`}
                >
                  {editingCollectionId === col.id ? (
                    <div className="flex items-center gap-1 flex-1 mr-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingCollectionName}
                        onChange={(e) => setEditingCollectionName(e.target.value)}
                        className="flex-1 bg-[#141724] border border-[#262B3D] rounded px-1.5 py-0.5 text-xs text-white outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameCollection(col.id)}
                        className="text-green-400 hover:text-green-300 p-0.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingCollectionId(null)}
                        className="text-slate-400 hover:text-slate-300 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium truncate flex-1">{col.name}</span>
                  )}

                  <div className="flex items-center gap-1 opacity-70 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingCollectionId(col.id);
                        setEditingCollectionName(col.name);
                      }}
                      className="p-1 hover:text-white"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => duplicateCollection(col.id)}
                      className="p-1 hover:text-white"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteCollection(col.id)}
                      className="p-1 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {activeCollection ? (
            <div data-testid="data-collection-editor" className="flex-1 flex flex-col overflow-y-auto">
              {/* Phase 5: Collection Backend Source & RLS Settings */}
              <div className="p-3 border-b border-[#1B1E2B] bg-[#121622]/60 space-y-2">
                <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider">
                  Storage & RLS Policy
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Data Source</span>
                    <select
                      value={activeCollection.dataSource || 'local'}
                      onChange={(e) =>
                        updateCollection(activeCollection.id, {
                          dataSource: e.target.value as CollectionDataSourceMode,
                        })
                      }
                      className="w-full bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-1 text-white text-[11px]"
                    >
                      <option value="local">Local Memory</option>
                      <option value="cloud">Cloud Database</option>
                      <option value="api">API Endpoint</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">RLS Policy</span>
                    <select
                      value={activeCollection.rlsPolicy || 'public'}
                      onChange={(e) =>
                        updateCollection(activeCollection.id, {
                          rlsPolicy: e.target.value as RlsPolicyType,
                        })
                      }
                      className="w-full bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-1 text-white text-[11px]"
                    >
                      <option value="public">Public Read</option>
                      <option value="authenticated">Authenticated</option>
                      <option value="user_owned">User Owned</option>
                      <option value="admin">Admin Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Fields Editor */}
              <div className="p-3 border-b border-[#1B1E2B] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Schema Fields</span>
                  <button
                    onClick={() => setIsAddingField(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                </div>

                {isAddingField && (
                  <div className="p-2.5 bg-[#141724] border border-[#262B3D] rounded flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Field name (e.g. price)"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white text-xs outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as DataFieldType)}
                        className="flex-1 bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white text-xs outline-none"
                      >
                        {SUPPORTED_FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="rounded border-[#262B3D]"
                        />
                        Req
                      </label>
                    </div>
                    <div className="flex justify-end gap-1 mt-1">
                      <button
                        onClick={() => setIsAddingField(false)}
                        className="px-2 py-0.5 text-slate-400 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddField}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {activeCollection.fields.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-1.5 bg-[#141724]/60 border border-[#1B1E2B] rounded text-slate-300"
                    >
                      {editingFieldId === f.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editFieldName}
                            onChange={(e) => setEditFieldName(e.target.value)}
                            className="bg-[#090B10] border border-[#262B3D] rounded px-1.5 py-0.5 text-xs text-white outline-none flex-1"
                          />
                          <select
                            value={editFieldType}
                            onChange={(e) => setEditFieldType(e.target.value as DataFieldType)}
                            className="bg-[#090B10] border border-[#262B3D] rounded px-1 py-0.5 text-xs text-white outline-none"
                          >
                            {SUPPORTED_FIELD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <button onClick={handleSaveEditedField} className="text-green-400 p-0.5">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => setEditingFieldId(null)} className="text-slate-400 p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-white">{f.name}</span>
                            <span className="text-[10px] text-slate-500 bg-[#090B10] px-1 rounded">
                              {f.type}
                            </span>
                            {f.required && (
                              <span className="text-[9px] text-amber-400 font-semibold uppercase">
                                Req
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingFieldId(f.id);
                                setEditFieldName(f.name);
                                setEditFieldType(f.type);
                              }}
                              className="p-1 hover:text-white text-slate-400"
                              title="Edit Field"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {f.name !== 'id' && (
                              <button
                                onClick={() => deleteField(activeCollection.id, f.id)}
                                className="p-1 hover:text-red-400 text-slate-400"
                                title="Delete Field"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Records Section */}
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-200">
                      Records ({activeCollection.records.length})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddingRecord(true);
                      setEditingRecordId(null);
                      setRecordDraftValues({});
                      setRecordErrors({});
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Record</span>
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#141724] border border-[#262B3D] rounded pl-7 pr-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* New/Edit Record Form */}
                {(isAddingRecord || editingRecordId) && (
                  <div className="p-2.5 bg-[#141724] border border-indigo-500/30 rounded flex flex-col gap-2 mb-2">
                    <div className="font-semibold text-white">
                      {editingRecordId ? 'Edit Record' : 'Create Record'}
                    </div>
                    {activeCollection.fields.map((f) => (
                      <div key={f.id} className="flex flex-col gap-0.5">
                        <label className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>{f.name}</span>
                          {f.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type={f.type === 'number' ? 'number' : 'text'}
                          value={recordDraftValues[f.name] ?? ''}
                          onChange={(e) => {
                            const v = f.type === 'number' ? Number(e.target.value) : e.target.value;
                            setRecordDraftValues((prev) => ({ ...prev, [f.name]: v }));
                          }}
                          className="bg-[#090B10] border border-[#262B3D] rounded px-2 py-1 text-white text-xs outline-none"
                        />
                        {recordErrors[f.name] && (
                          <span className="text-[10px] text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {recordErrors[f.name]}
                          </span>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end gap-1.5 mt-1">
                      <button
                        onClick={() => {
                          setIsAddingRecord(false);
                          setEditingRecordId(null);
                          setRecordDraftValues({});
                        }}
                        className="px-2 py-1 text-slate-400 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleValidateAndSaveRecord}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                      >
                        Save Record
                      </button>
                    </div>
                  </div>
                )}

                {/* Record list */}
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No records in collection
                    </div>
                  ) : (
                    filteredRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2 bg-[#141724]/40 border border-[#1B1E2B] rounded flex items-center justify-between hover:border-[#262B3D]"
                      >
                        <div className="truncate flex-1 pr-2">
                          <div className="font-mono text-[10px] text-slate-500 truncate">{rec.id}</div>
                          <div className="text-xs text-white truncate">
                            {Object.entries(rec.values)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingRecordId(rec.id);
                              setRecordDraftValues({ ...rec.values });
                              setRecordErrors({});
                              setIsAddingRecord(false);
                            }}
                            className="p-1 hover:text-white"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteRecord(activeCollection.id, rec.id)}
                            className="p-1 hover:text-red-400"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">
              No collections created. Enter a name above to create your first collection.
            </div>
          )}
        </>
      )}
    </div>
  );
};
