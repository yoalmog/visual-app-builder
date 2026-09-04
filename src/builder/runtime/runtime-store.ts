import { create } from 'zustand';
import { AppProject, DataCollection, DataRecord, Variable } from '../schema/project';
import { AuthUser, AuthSession } from '../providers/auth-provider';

export interface FormFieldState {
  value: any;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  error?: string;
}

export interface FormValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  email?: boolean;
  url?: boolean;
  pattern?: string;
}

export interface ActionTraceEntry {
  timestamp: number;
  event: string;
  actionType: string;
  target?: string;
  status: 'PASS' | 'FAIL';
  message?: string;
}

export interface RuntimeNavigationState {
  activePageId: string;
  history: string[];
  queryParams: Record<string, string>;
  routeParams: Record<string, string>;
}

export interface RuntimeState {
  // Scoped runtime variables (name -> value)
  variables: Record<string, any>;

  // Scoped collection records (collectionId -> DataRecord[])
  collections: Record<string, DataRecord[]>;

  // Form field states (nodeId -> FormFieldState)
  forms: Record<string, FormFieldState>;

  // Navigation state
  navigation: RuntimeNavigationState;

  // Loading and error states
  loading: Record<string, boolean>;
  errors: Record<string, string>;

  // Runtime trace for debugger
  actionTrace: ActionTraceEntry[];

  // Component visibility overrides
  previewVisibleOverrides: Record<string, boolean>;

  // Initial snapshot to enable pure runtime resets
  initialProjectSnapshot: AppProject | null;

  // ── Phase 5: Cloud / Auth State ──────────────────────────────────────────

  // Authenticated user and session
  currentUser: AuthUser | null;
  session: AuthSession | null;

  // Cloud collection data (collectionId -> records[])
  cloudData: Record<string, { records: DataRecord[]; total: number; loading: boolean; error?: string }>;

  // API response state (connectorId -> response)
  apiResponses: Record<string, { data: any; status?: number; loading: boolean; error?: string; errorCode?: string }>;

  // Network trace (latest 200 entries, secrets redacted)
  networkTrace: NetworkTraceEntry[];

  // ── Phase 5 Actions ──────────────────────────────────────────────────────

  setCurrentUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  clearAuth: () => void;

  setCloudData: (collectionId: string, data: { records: DataRecord[]; total: number; loading: boolean; error?: string }) => void;
  setCloudLoading: (collectionId: string, loading: boolean) => void;
  setCloudError: (collectionId: string, error: string | null) => void;

  setApiResponse: (connectorId: string, data: { data: any; status?: number; loading: boolean; error?: string; errorCode?: string }) => void;
  setApiLoading: (connectorId: string, loading: boolean) => void;
  clearApiResponse: (connectorId: string) => void;

  recordNetworkTrace: (entry: Omit<NetworkTraceEntry, 'timestamp'>) => void;
  clearNetworkTrace: () => void;

  // Actions
  initRuntime: (project: AppProject, initialPageId?: string) => void;
  resetRuntime: () => void;

  setVariable: (name: string, value: any) => void;
  getVariable: (name: string) => any;

  setFormFieldValue: (nodeId: string, value: any) => void;
  setFormFieldTouched: (nodeId: string, touched: boolean) => void;
  validateFormField: (nodeId: string, rules?: FormValidationRules) => boolean;
  resetForm: (formNodeIds?: string[]) => void;

  createRecord: (collectionId: string, values: Record<string, any>) => { success: boolean; id?: string; error?: string };
  updateRecord: (collectionId: string, recordId: string, values: Record<string, any>) => { success: boolean; error?: string };
  deleteRecord: (collectionId: string, recordId: string) => { success: boolean; error?: string };
  getCollectionRecords: (collectionId: string) => DataRecord[];

  navigate: (pageId: string) => void;
  setQueryParams: (params: Record<string, string>) => void;
  setRouteParams: (params: Record<string, string>) => void;

  setLoading: (key: string, isLoading: boolean) => void;
  setError: (key: string, error: string | null) => void;

  recordTrace: (entry: Omit<ActionTraceEntry, 'timestamp'>) => void;
  clearTrace: () => void;

  setVisibleOverride: (nodeId: string, visible: boolean) => void;
  toggleVisibleOverride: (nodeId: string) => void;
}

export interface NetworkTraceEntry {
  timestamp: number;
  type: 'API' | 'DATABASE' | 'AUTH' | 'STORAGE';
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  label: string;
  success: boolean;
  error?: string;
}

/** Redact secrets from network trace labels/URLs */
function redactSecrets(str: string): string {
  return str
    .replace(/Bearer\s+[\w.-]{8,}/gi, 'Bearer [REDACTED]')
    .replace(/apikey=[^&\s"']+/gi, 'apikey=[REDACTED]')
    .replace(/token=[^&\s"']+/gi, 'token=[REDACTED]')
    .replace(/password=[^&\s"']+/gi, 'password=[REDACTED]')
    .replace(/secret=[^&\s"']+/gi, 'secret=[REDACTED]');
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  variables: {},
  collections: {},
  forms: {},
  navigation: {
    activePageId: '',
    history: [],
    queryParams: {},
    routeParams: {},
  },
  loading: {},
  errors: {},
  actionTrace: [],
  previewVisibleOverrides: {},
  initialProjectSnapshot: null,

  // Phase 5 initial state
  currentUser: null,
  session: null,
  cloudData: {},
  apiResponses: {},
  networkTrace: [],

  initRuntime: (project: AppProject, initialPageId?: string) => {
    const vars: Record<string, any> = {};
    (project.variables || []).forEach((v) => {
      vars[v.name] = v.defaultValue;
    });

    const cols: Record<string, DataRecord[]> = {};
    (project.collections || []).forEach((c) => {
      cols[c.id] = JSON.parse(JSON.stringify(c.records || []));
    });

    const activePage = initialPageId || project.pages[0]?.id || '';

    set({
      variables: vars,
      collections: cols,
      forms: {},
      navigation: {
        activePageId: activePage,
        history: [activePage],
        queryParams: {},
        routeParams: {},
      },
      loading: {},
      errors: {},
      actionTrace: [],
      previewVisibleOverrides: {},
      initialProjectSnapshot: JSON.parse(JSON.stringify(project)),
    });
  },

  resetRuntime: () => {
    const { initialProjectSnapshot } = get();
    if (initialProjectSnapshot) {
      get().initRuntime(initialProjectSnapshot, initialProjectSnapshot.pages[0]?.id);
    } else {
      set({
        variables: {},
        forms: {},
        loading: {},
        errors: {},
        actionTrace: [],
        previewVisibleOverrides: {},
      });
    }
  },

  // ── Phase 5 Auth Actions ─────────────────────────────────────────────────

  setCurrentUser: (user: AuthUser | null) => set({ currentUser: user }),

  setSession: (session: AuthSession | null) => set({ session }),

  clearAuth: () => set({ currentUser: null, session: null }),

  // ── Phase 5 Cloud Data Actions ───────────────────────────────────────────

  setCloudData: (collectionId, data) =>
    set((s) => ({ cloudData: { ...s.cloudData, [collectionId]: data } })),

  setCloudLoading: (collectionId, loading) =>
    set((s) => ({
      cloudData: {
        ...s.cloudData,
        [collectionId]: { ...(s.cloudData[collectionId] || { records: [], total: 0, loading: false }), loading },
      },
    })),

  setCloudError: (collectionId, error) =>
    set((s) => ({
      cloudData: {
        ...s.cloudData,
        [collectionId]: {
          ...(s.cloudData[collectionId] || { records: [], total: 0, loading: false }),
          error: error || undefined,
          loading: false,
        },
      },
    })),

  // ── Phase 5 API Response Actions ─────────────────────────────────────────

  setApiResponse: (connectorId, data) =>
    set((s) => ({ apiResponses: { ...s.apiResponses, [connectorId]: data } })),

  setApiLoading: (connectorId, loading) =>
    set((s) => ({
      apiResponses: {
        ...s.apiResponses,
        [connectorId]: { ...(s.apiResponses[connectorId] || { data: null, loading: false }), loading },
      },
    })),

  clearApiResponse: (connectorId) =>
    set((s) => {
      const updated = { ...s.apiResponses };
      delete updated[connectorId];
      return { apiResponses: updated };
    }),

  // ── Phase 5 Network Trace ────────────────────────────────────────────────

  recordNetworkTrace: (entry) => {
    const sanitized: NetworkTraceEntry = {
      ...entry,
      timestamp: Date.now(),
      url: entry.url ? redactSecrets(entry.url) : undefined,
      label: redactSecrets(entry.label),
    };
    set((s) => ({ networkTrace: [sanitized, ...s.networkTrace].slice(0, 200) }));
  },

  clearNetworkTrace: () => set({ networkTrace: [] }),

  setVariable: (name: string, value: any) => {
    set((s) => ({
      variables: { ...s.variables, [name]: value },
    }));
  },

  getVariable: (name: string) => {
    return get().variables[name];
  },

  setFormFieldValue: (nodeId: string, value: any) => {
    set((s) => {
      const prev = s.forms[nodeId] || { value: '', touched: false, dirty: false, valid: true };
      return {
        forms: {
          ...s.forms,
          [nodeId]: {
            ...prev,
            value,
            dirty: true,
          },
        },
      };
    });
  },

  setFormFieldTouched: (nodeId: string, touched: boolean) => {
    set((s) => {
      const prev = s.forms[nodeId] || { value: '', touched: false, dirty: false, valid: true };
      return {
        forms: {
          ...s.forms,
          [nodeId]: {
            ...prev,
            touched,
          },
        },
      };
    });
  },

  validateFormField: (nodeId: string, rules?: FormValidationRules): boolean => {
    const fieldState = get().forms[nodeId] || { value: '', touched: false, dirty: false, valid: true };
    const val = fieldState.value;

    if (!rules) {
      set((s) => ({
        forms: {
          ...s.forms,
          [nodeId]: { ...fieldState, valid: true, error: undefined },
        },
      }));
      return true;
    }

    // Required check
    if (rules.required) {
      const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
      if (isEmpty) {
        set((s) => ({
          forms: {
            ...s.forms,
            [nodeId]: { ...fieldState, valid: false, error: 'This field is required' },
          },
        }));
        return false;
      }
    }

    // Email check
    if (rules.email && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(val))) {
        set((s) => ({
          forms: {
            ...s.forms,
            [nodeId]: { ...fieldState, valid: false, error: 'Invalid email address' },
          },
        }));
        return false;
      }
    }

    // Min Length
    if (rules.minLength !== undefined && typeof val === 'string' && val.length < rules.minLength) {
      set((s) => ({
        forms: {
          ...s.forms,
          [nodeId]: { ...fieldState, valid: false, error: `Minimum length is ${rules.minLength}` },
        },
      }));
      return false;
    }

    // Max Length
    if (rules.maxLength !== undefined && typeof val === 'string' && val.length > rules.maxLength) {
      set((s) => ({
        forms: {
          ...s.forms,
          [nodeId]: { ...fieldState, valid: false, error: `Maximum length is ${rules.maxLength}` },
        },
      }));
      return false;
    }

    // Passed validation
    set((s) => ({
      forms: {
        ...s.forms,
        [nodeId]: { ...fieldState, valid: true, error: undefined },
      },
    }));
    return true;
  },

  resetForm: (formNodeIds?: string[]) => {
    set((s) => {
      if (!formNodeIds || formNodeIds.length === 0) {
        return { forms: {} };
      }
      const updated = { ...s.forms };
      formNodeIds.forEach((id) => delete updated[id]);
      return { forms: updated };
    });
  },

  createRecord: (collectionId: string, values: Record<string, any>) => {
    const { collections, initialProjectSnapshot } = get();
    const collectionDef = (initialProjectSnapshot?.collections || []).find((c) => c.id === collectionId);
    if (!collectionDef && collections[collectionId] === undefined) {
      return { success: false, error: `Collection '${collectionId}' not found` };
    }
    
    // Validation against collection fields
    if (collectionDef) {
      for (const field of collectionDef.fields) {
        const val = values[field.name] !== undefined ? values[field.name] : values[field.id];
        if (field.required && (val === undefined || val === null || val === '')) {
          return { success: false, error: `Field '${field.name}' is required` };
        }
        if (field.type === 'number' && val !== undefined && val !== null && val !== '') {
          if (isNaN(Number(val))) {
            return { success: false, error: `Field '${field.name}' must be a valid number` };
          }
        }
        if (field.type === 'email' && val) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
            return { success: false, error: `Field '${field.name}' must be a valid email` };
          }
        }
      }
    }

    const newRecordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: DataRecord = {
      id: newRecordId,
      values: { ...values },
    };

    const currentRecords = collections[collectionId] || [];
    set({
      collections: {
        ...collections,
        [collectionId]: [...currentRecords, newRecord],
      },
    });

    return { success: true, id: newRecordId };
  },

  updateRecord: (collectionId: string, recordId: string, values: Record<string, any>) => {
    const { collections } = get();
    const currentRecords = collections[collectionId] || [];
    const index = currentRecords.findIndex((r) => r.id === recordId);
    if (index === -1) {
      return { success: false, error: `Record with id ${recordId} not found` };
    }

    const updated = [...currentRecords];
    updated[index] = {
      ...updated[index],
      values: { ...updated[index].values, ...values },
    };

    set({
      collections: {
        ...collections,
        [collectionId]: updated,
      },
    });

    return { success: true };
  },

  deleteRecord: (collectionId: string, recordId: string) => {
    const { collections } = get();
    const currentRecords = collections[collectionId] || [];
    set({
      collections: {
        ...collections,
        [collectionId]: currentRecords.filter((r) => r.id !== recordId),
      },
    });
    return { success: true };
  },

  getCollectionRecords: (collectionId: string) => {
    return get().collections[collectionId] || [];
  },

  navigate: (pageId: string) => {
    set((s) => ({
      navigation: {
        ...s.navigation,
        activePageId: pageId,
        history: [...s.navigation.history, pageId],
      },
    }));
  },

  setQueryParams: (params: Record<string, string>) => {
    set((s) => ({
      navigation: {
        ...s.navigation,
        queryParams: { ...s.navigation.queryParams, ...params },
      },
    }));
  },

  setRouteParams: (params: Record<string, string>) => {
    set((s) => ({
      navigation: {
        ...s.navigation,
        routeParams: { ...s.navigation.routeParams, ...params },
      },
    }));
  },

  setLoading: (key: string, isLoading: boolean) => {
    set((s) => ({
      loading: { ...s.loading, [key]: isLoading },
    }));
  },

  setError: (key: string, error: string | null) => {
    set((s) => {
      const updated = { ...s.errors };
      if (error) {
        updated[key] = error;
      } else {
        delete updated[key];
      }
      return { errors: updated };
    });
  },

  recordTrace: (entry: Omit<ActionTraceEntry, 'timestamp'>) => {
    const newEntry: ActionTraceEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    set((s) => ({
      actionTrace: [newEntry, ...s.actionTrace].slice(0, 100), // keep latest 100 entries
    }));
  },

  clearTrace: () => {
    set({ actionTrace: [] });
  },

  setVisibleOverride: (nodeId: string, visible: boolean) => {
    set((s) => ({
      previewVisibleOverrides: {
        ...s.previewVisibleOverrides,
        [nodeId]: visible,
      },
    }));
  },

  toggleVisibleOverride: (nodeId: string) => {
    set((s) => {
      const current = s.previewVisibleOverrides[nodeId];
      return {
        previewVisibleOverrides: {
          ...s.previewVisibleOverrides,
          [nodeId]: current !== undefined ? !current : false,
        },
      };
    });
  },
}));
